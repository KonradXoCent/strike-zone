const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createWorkshopDB,USERS:U,skinProject,mapProject}=require('../scripts/test-support/workshop-db.cjs');
test('Community Forge: threshold, payment, ownership and immutable rewards',async t=>{
 const{db,asUser}=await createWorkshopDB();t.after(()=>db.close());await db.query('insert into public.sz_workshop_admins values($1,now())',[U.admin]);
 for(const uid of[U.author,U.other])await db.query('insert into public.saves(user_id,json) values($1,$2)',[uid,{cur:'Test',ts:1,profiles:{Test:{wallet:10000}}}]);
 const rpc=(uid,name,args)=>asUser(uid,tx=>tx.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args));
 const publish=async p=>{const id=(await asUser(U.author,tx=>tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',[p.kind==='sz-map'?'map':'skin',p.id,p]))).rows[0].id;await rpc(U.admin,'sz_workshop_review',[id,'approved','']);return id;};
 const balance=async()=> (await db.query("select (json->'profiles'->'Test'->>'wallet')::numeric as wallet from public.saves where user_id=$1",[U.other])).rows[0].wallet;
 let purchase,reward,lastRelease;
 await t.test('pending skins and approved maps cannot unlock purchases',async()=>{
  await publish(mapProject());await asUser(U.author,tx=>tx.query("insert into public.sz_workshop_submissions(kind,project_id,payload) values('skin',$1,$2)",[skinProject().id,skinProject()]));
  await assert.rejects(rpc(U.other,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',1]),/FORGE_NEEDS_FIVE/);assert.equal(Number(await balance()),10000);
 });
 await t.test('four distinct designs and a revised design still cannot unlock',async()=>{
  for(let i=0;i<4;i++)lastRelease=await publish(skinProject(crypto.randomUUID()));
  const p=(await db.query('select payload from public.sz_workshop_releases where id=$1',[lastRelease])).rows[0].payload;p.name='New version';await publish(p);
  assert.equal((await db.query("select count(*)::int as n from public.sz_workshop_items where kind='skin' and active")).rows[0].n,4);
  await assert.rejects(rpc(U.other,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',1]),/FORGE_NEEDS_FIVE/);
 });
 await t.test('the fifth approved design unlocks one paid case, retry charges once',async()=>{
  lastRelease=await publish(skinProject(crypto.randomUUID()));const id=crypto.randomUUID();purchase=(await rpc(U.other,'sz_workshop_case_buy',[id,'Test',1])).rows[0].value;
  assert.equal(purchase.balance,7500);const replay=(await rpc(U.other,'sz_workshop_case_buy',[id,'Test',1])).rows[0].value;assert.equal(replay.case.id,id);assert.equal(Number(await balance()),7500);
  await assert.rejects(rpc(U.author,'sz_workshop_case_buy',[id,'Test',1]),/FORGE_INVALID_REQUEST/);
 });
 await t.test('stale saves and insufficient funds do not grant cases',async()=>{
  await assert.rejects(rpc(U.other,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',1]),/FORGE_STALE_SAVE/);
  await db.query("update public.saves set json=jsonb_set(json,'{profiles,Test,wallet}','2499') where user_id=$1",[U.author]);
  await assert.rejects(rpc(U.author,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',1]),/FORGE_FUNDS/);
 });
 await t.test('only the owner can open; the same case returns the same single instance',async()=>{
  await assert.rejects(rpc(U.author,'sz_workshop_case_open',[purchase.case.id]),/FORGE_CASE_NOT_OWNED/);
  reward=(await rpc(U.other,'sz_workshop_case_open',[purchase.case.id])).rows[0].value;const replay=(await rpc(U.other,'sz_workshop_case_open',[purchase.case.id])).rows[0].value;
  assert.equal(replay.id,reward.id);assert.equal(reward.user_id,U.other);assert.equal(typeof reward.stattrak,'boolean');assert.equal(reward.payload.kind,'sz-skin');
  assert.equal((await db.query('select count(*)::int as n from public.sz_workshop_owned_skins')).rows[0].n,1);
  assert.equal((await asUser(U.author,tx=>tx.query('select * from public.sz_workshop_owned_skins'))).rows.length,0);
  assert.equal((await asUser(U.author,tx=>tx.query('select * from public.sz_workshop_cases'))).rows.length,0);
 });
 await t.test('clients cannot mint ownership or forge a case or replace its reward',async()=>{
  await assert.rejects(asUser(U.other,tx=>tx.query('insert into public.sz_workshop_cases(id,user_id,profile) values($1,$2,$3)',[crypto.randomUUID(),U.other,'Test'])),/permission denied/);
  await assert.rejects(asUser(U.other,tx=>tx.query('update public.sz_workshop_owned_skins set stattrak=true where id=$1',[reward.id])),/permission denied/);
  await assert.rejects(rpc(null,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',1]),/permission denied/);
  const proof=(await rpc(U.author,'sz_workshop_skin_proof',[reward.id])).rows[0].value;assert.equal(proof.release_id,reward.release_id);
 });
 await t.test('withdrawal relocks a pool below five and disables displayed ownership proof',async()=>{
  await rpc(U.admin,'sz_workshop_withdraw',[reward.item_id]);
  await assert.rejects(rpc(U.other,'sz_workshop_case_buy',[crypto.randomUUID(),'Test',purchase.saved_ts]),/FORGE_NEEDS_FIVE/);
  assert.equal((await rpc(U.author,'sz_workshop_skin_proof',[reward.id])).rows[0].value,null);
  assert.equal((await asUser(U.other,tx=>tx.query('select count(*)::int as n from public.sz_workshop_owned_skins'))).rows[0].n,1);
 });
});
