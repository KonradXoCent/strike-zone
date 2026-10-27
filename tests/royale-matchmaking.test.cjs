'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{fixture}=require('../scripts/test-support/friend-db.cjs');
test('authenticated Royale allocation preserves parties, fill, capacity and host authority',async()=>{const f=await fixture(),[a,b,c]=f.ids;try{
 await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/zone-royale-matchmaking.sql'),'utf8'));
 const call=async(id,action,args={})=>(await f.as(id,'select public.zone_royale_queue($1,$2::jsonb) value',[action,JSON.stringify({cid:'cid-'+id,...args})])).rows[0].value;
 const join=(id,args={})=>call(id,'join',{mode:'duo',party:randomUUID(),expected:1,fill:true,map:6,...args});
 await assert.rejects(call(null,'status'),/permission denied/);await assert.rejects(f.as(a,'select * from zone_royale_private.members'),/permission denied/);
 const ticket=randomUUID(),one=await join(a,{party:ticket}),two=await join(b),three=await join(c,{fill:false});assert.equal(one.room,two.room);assert.equal(two.room,three.room);assert.equal(three.roster[0].team,three.roster[1].team);assert.notEqual(three.roster[0].team,three.roster[2].team);
 assert.equal((await join(a,{party:ticket})).roster.length,3);await assert.rejects(join(a,{expected:3}),/ROYALE_PARTY_SIZE/);await assert.rejects(call(b,'launch'),/ZR_QUEUE_NOT_READY/);
 await call(a,'leave');assert.equal((await call(b,'status')).host,'cid-'+b);await call(b,'leave');await call(c,'leave');
 const group=randomUUID();await join(a,{mode:'trio',party:group,expected:2});await join(b,{mode:'trio',party:group,expected:2});const trio=await join(c,{mode:'trio'});assert.equal(new Set(trio.roster.map(x=>x.team)).size,1);
 await f.db.exec("update zone_royale_private.matches set closes_at=now()-interval '1 second'");await assert.rejects(call(b,'launch'),/ZR_QUEUE_NOT_READY/);assert.equal((await call(a,'launch')).phase,'running');for(const id of[a,b,c])await call(id,'leave');
 const users=Array.from({length:40},(_,i)=>'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));for(const id of users)await f.db.query('insert into auth.users values($1)',[id]);
 const games=await Promise.all(users.map(id=>join(id,{mode:'squad',fill:false})));assert.equal(new Set(games.map(x=>x.room)).size,2);const counts=(await f.db.query('select count(*)::integer n from zone_royale_private.members group by match_id order by n')).rows.map(x=>x.n);assert.deepEqual(counts,[4,36]);assert.equal(new Set(games.flatMap(x=>x.roster.map(y=>y.cid))).size,40);
 }finally{await f.db.close();}});
