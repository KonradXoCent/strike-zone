const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('../scripts/test-support/friend-db.cjs');
test('friend requests require recipient consent and atomically maintain both lists',async t=>{
 const f=await fixture(),[a,b,c]=f.ids;t.after(()=>f.db.close());
 await t.test('anonymous and direct writes cannot bypass approval',async()=>{
  await assert.rejects(f.rpc(null,'list'),/permission denied/);
  await assert.rejects(f.as(a,'insert into friends values($1,$2,$3)',[a,b,'Play']),/permission denied/);
  await assert.rejects(f.rpc(a,'request',{nickname:'KonradQA'}),/FRIEND_SELF/);
  await assert.rejects(f.rpc(a,'request',{nickname:'%'}),/FRIEND_NOT_FOUND/);
 });
 await t.test('offline recipient can retrieve a persisted exact-nickname request',async()=>{
  assert.equal((await f.rpc(a,'request',{nickname:'pLaY'})).status,'pending');
  assert.equal((await f.db.query('select * from friends')).rows.length,0);
  const incoming=(await f.rpc(b,'list')).incoming;assert.equal(incoming.length,1);assert.equal(incoming[0].name,'KonradQA');
  assert.equal((await f.rpc(a,'list')).outgoing[0].id,incoming[0].id);assert.equal((await f.rpc(c,'list')).incoming.length,0);
  await assert.rejects(f.rpc(a,'request',{nickname:'Play'}),/FRIEND_PENDING/);await assert.rejects(f.rpc(b,'request',{nickname:'KonradQA'}),/FRIEND_REVERSE/);
  await assert.rejects(f.rpc(a,'accept',{id:incoming[0].id}),/FRIEND_FORBIDDEN/);await assert.rejects(f.rpc(c,'accept',{id:incoming[0].id}),/FRIEND_FORBIDDEN/);
  assert.equal((await f.as(c,'select * from sz_friend_requests')).rows.length,0);
 });
 await t.test('acceptance grants mutual friendship once and removal clears both',async()=>{
  const {id}=(await f.rpc(b,'list')).incoming[0];await f.rpc(b,'accept',{id});await f.rpc(b,'accept',{id});
  const rows=(await f.db.query('select * from friends')).rows;assert.equal(rows.length,2);assert(rows.some(r=>r.user_id===a&&r.friend_id===b));assert(rows.some(r=>r.user_id===b&&r.friend_id===a));
  assert.equal((await f.rpc(a,'list')).outgoing.length,0);await assert.rejects(f.rpc(a,'request',{nickname:'Play'}),/FRIEND_ALREADY/);
  await f.rpc(b,'remove',{id:a});assert.equal((await f.db.query('select * from friends')).rows.length,0);
 });
 await t.test('decline and cancel never grant inventory/chat friendship access',async()=>{
  await f.rpc(a,'request',{nickname:'Gamma'});let {id}=(await f.rpc(c,'list')).incoming[0];await f.rpc(c,'decline',{id});await assert.rejects(f.rpc(c,'accept',{id}),/FRIEND_NOT_PENDING/);
  await f.rpc(b,'request',{nickname:'Gamma'});({id}=(await f.rpc(c,'list')).incoming[0]);await assert.rejects(f.rpc(c,'cancel',{id}),/FRIEND_FORBIDDEN/);await f.rpc(b,'cancel',{id});assert.equal((await f.rpc(c,'list')).incoming.length,0);
  assert.equal((await f.db.query('select * from friends')).rows.length,0);
 });
 await t.test('ambiguous nicknames are rejected; legacy one-way rows remain readable',async()=>{
  await f.db.query('update leaderboard set name=$1 where user_id=$2',['Play',c]);await assert.rejects(f.rpc(a,'request',{nickname:'Play'}),/FRIEND_NAME_AMBIGUOUS/);
  await f.db.query('update leaderboard set name=$1 where user_id=$2',['Gamma',c]);
  await f.db.query('insert into friends values($1,$2,$3)',[a,c,'Gamma']);assert.equal((await f.as(a,'select * from friends')).rows.length,1);assert.equal((await f.as(c,'select * from friends')).rows.length,0);
  await f.db.exec("update sz_friend_requests set created_at=now()-interval '2 minutes'");await f.rpc(a,'request',{nickname:'Gamma'});const {id}=(await f.rpc(c,'list')).incoming[0];await f.rpc(c,'accept',{id});assert.equal((await f.db.query('select * from friends')).rows.length,2);
 });
 await t.test('pending limits cannot be bypassed by forged target IDs or actions',async()=>{
  await assert.rejects(f.rpc(a,'request',{nickname:'Missing',user_id:b}),/FRIEND_NOT_FOUND/);
  await assert.rejects(f.rpc(a,'write',{id:b}),/FRIEND_FORBIDDEN/);
  await f.db.exec("update sz_friend_requests set created_at=now()-interval '2 minutes'");await f.rpc(a,'remove',{id:c});
  await f.db.query("insert into sz_friends_private.events(sender_id) select $1 from generate_series(1,24)",[a]);
  await assert.rejects(f.rpc(a,'request',{nickname:'Gamma'}),/FRIEND_LIMIT/);
 });
});
test('deployed migration matches the reviewed canonical friend SQL',()=>{const name=fs.readdirSync(path.resolve(__dirname,'../supabase/migrations')).find(n=>n.endsWith('_friend_requests.sql'));assert.equal(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',name),'utf8'),fs.readFileSync(path.resolve(__dirname,'../database/friends.sql'),'utf8'));});
