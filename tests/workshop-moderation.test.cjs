const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createWorkshopDB,USERS:U,mapProject,skinProject}=require('../scripts/test-support/workshop-db.cjs');
test('the generated moderation migration matches its tested canonical SQL',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 assert.equal(fs.readFileSync(root+'/supabase/migrations/20261018214128_workshop_moderation_versions_and_bot_reviews.sql','utf8'),fs.readFileSync(root+'/database/workshop-moderation.sql','utf8'));
});
test('Workshop owner controls, pinned versions, bot reviews and future case drops',async t=>{
 const{db,asUser}=await createWorkshopDB();t.after(()=>db.close());await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);
 const rpc=(uid,action,args={},claims)=>asUser(uid,async tx=>(await tx.query('select public.sz_workshop_map($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value,claims);
 const submit=p=>asUser(U.author,async tx=>(await tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',[p.kind==='sz-map'?'map':'skin',p.id,p])).rows[0].id);
 const approve=id=>asUser(U.admin,async tx=>(await tx.query("select public.sz_workshop_review($1,'approved','') as item",[id])).rows[0].item);
 const publish=async p=>{const release=await submit(p);return{item:await approve(release),release,payload:p};};
 const catalog=()=>asUser(null,async tx=>(await tx.query('select * from public.sz_workshop_catalog')).rows);
 const policy=(enabled=true)=>rpc(U.admin,'settings',{enabled,min_plays:50,min_likes:10,slots_per_mode:1});
 let map,revision,other;const skins=[];
 await t.test('manual addition bypasses community thresholds and automatic-promotion setting',async()=>{
  map=await publish({...mapProject(randomUUID()),mode:'ctf'});await policy(false);
  const args={item:map.item,release:map.release,rule:'manual',expected_latest:map.release};
  await assert.rejects(rpc(null,'pool',args),/WORKSHOP_LOGIN_REQUIRED/);
  await assert.rejects(rpc(U.other,'pool',args,{app_metadata:{admin:true},user_metadata:{owner:true}}),/WORKSHOP_ADMIN_REQUIRED/);
  await rpc(U.admin,'pool',args);const row=(await catalog()).find(r=>r.id===map.item);
  assert.equal(row.featured,true);assert.equal(row.pool_rule,'manual');assert.equal(row.release_id,map.release);assert.equal(row.mode,'ctf');assert.equal(Number(row.plays),0);assert.equal(row.likes,0);
 });
 await t.test('excluding a map persists through reranking while the Workshop release remains playable',async()=>{
  await rpc(U.admin,'pool',{item:map.item,rule:'excluded'});await db.query('update public.sz_workshop_map_stats set plays=100,likes=100 where item_id=$1',[map.item]);await policy();
  let row=(await catalog()).find(r=>r.id===map.item);assert.equal(row.featured,false);assert.equal(row.pool_rule,'excluded');assert.equal(row.release_id,map.release);
  assert.ok((await rpc(U.other,'start',{release:map.release,session:randomUUID(),mode:'ctf'})).session);
  await rpc(U.admin,'pool',{item:map.item,rule:'auto'});row=(await catalog()).find(r=>r.id===map.item);assert.equal(row.featured,true);
 });
 await t.test('approval preserves the live old version until the owner explicitly replaces it',async()=>{
  const payload={...map.payload,name:'Arena version 2',theme:'forest'};revision=await submit(payload);await approve(revision);
  let row=(await catalog()).find(r=>r.id===map.item);assert.equal(row.version,1);assert.equal(row.release_id,map.release);assert.equal(row.latest_version,2);assert.equal(row.latest_release_id,revision);assert.equal(row.pool_rule,'manual');assert.equal(row.featured,true);assert.equal(Number(row.plays),100);
  other=await publish({...mapProject(randomUUID()),mode:'tdm'});
  await assert.rejects(rpc(U.admin,'pool',{item:map.item,rule:'manual',release:other.release}),/WORKSHOP_MAP_NOT_FOUND/);
  await assert.rejects(rpc(U.admin,'pool',{item:map.item,rule:'manual',release:revision,expected_latest:map.release}),/WORKSHOP_VERSION_CHANGED/);
  await rpc(U.admin,'pool',{item:map.item,rule:'manual',release:revision,expected_latest:revision});
  row=(await catalog()).find(r=>r.id===map.item);assert.equal(row.release_id,revision);assert.equal(row.version,2);assert.equal(row.mode,'ctf');assert.equal(row.title,payload.name);
  const old=(await asUser(null,tx=>tx.query('select payload from public.sz_workshop_releases where id=$1',[map.release]))).rows[0].payload;assert.deepEqual(old,map.payload);
  await assert.rejects(rpc(U.author,'start',{release:map.release,session:randomUUID(),mode:'ctf'}),/WORKSHOP_MAP_NOT_FOUND/);
 });
 await t.test('approve-and-add atomically publishes a new version or a new map directly into its authored mode',async()=>{
  const id=await submit({...map.payload,name:'Arena version 3'}),args={submission:id,note:''};
  await assert.rejects(rpc(U.other,'approve_pool',args),/WORKSHOP_ADMIN_REQUIRED/);assert.equal((await asUser(U.author,tx=>tx.query('select status from public.sz_workshop_submissions where id=$1',[id]))).rows[0].status,'pending');
  await rpc(U.admin,'approve_pool',args);await rpc(U.admin,'approve_pool',args);let row=(await catalog()).find(r=>r.id===map.item);assert.equal(row.version,3);assert.equal(row.release_id,id);assert.equal(row.featured,true);assert.equal(row.latest_version,3);
  await assert.rejects(rpc(U.admin,'approve_pool',{submission:revision,note:''}),/WORKSHOP_VERSION_CHANGED/);assert.equal((await catalog()).find(r=>r.id===map.item).release_id,id);
  const fresh=await submit({...mapProject(randomUUID()),mode:'classic'});await rpc(U.admin,'approve_pool',{submission:fresh,note:''});row=(await catalog()).find(r=>r.release_id===fresh);assert.equal(row.mode,'classic');assert.equal(row.featured,true);assert.equal(Number(row.plays),0);assert.equal(row.likes,0);
 });
 await t.test('completed matches produce bounded random bot votes once; early, repeated and foreign finishes cannot farm counters',async()=>{
  const id=randomUUID();await rpc(U.author,'start',{session:id,release:other.release,mode:'tdm',bots:9});
  assert.equal((await rpc(U.author,'finish',{session:id,seconds:99999})).counted,false);
  await assert.rejects(rpc(U.other,'finish',{session:id}),/WORKSHOP_PLAY_ID/);
  await assert.rejects(rpc(U.author,'start',{session:id,release:other.release,mode:'tdm',bots:10}),/WORKSHOP_PLAY_ID/);
  await assert.rejects(rpc(U.other,'start',{session:randomUUID(),release:other.release,mode:'tdm',bots:999}),/WORKSHOP_MAP_INPUT/);
  await db.query("update sz_workshop_private.map_sessions set created_at=now()-interval '61 seconds' where id=$1",[id]);await db.query('select setseed(0.6)');
  const result=await rpc(U.author,'finish',{session:id});assert.equal(result.counted,true);assert.equal(result.bot_plays,9);assert.ok(result.bot_likes>=0&&result.bot_likes<9);assert.deepEqual(await rpc(U.author,'finish',{session:id}),result);
  let row=(await catalog()).find(r=>r.id===other.item);assert.equal(Number(row.plays),10);assert.equal(Number(row.player_plays),1);assert.equal(Number(row.bot_plays),9);assert.equal(row.player_likes,0);assert.equal(row.likes,result.bot_likes);
  await rpc(U.other,'like',{item:other.item,liked:true});row=(await catalog()).find(r=>r.id===other.item);assert.equal(row.player_likes,1);assert.equal(row.likes,result.bot_likes+1);
  const retry=randomUUID();await rpc(U.author,'start',{session:retry,release:other.release,mode:'tdm',bots:9});await db.query("update sz_workshop_private.map_sessions set created_at=now()-interval '61 seconds' where id=$1",[retry]);assert.equal((await rpc(U.author,'finish',{session:retry})).counted,false);assert.equal(Number((await catalog()).find(r=>r.id===other.item).bot_plays),9);
 });
 await t.test('case removal gates new purchases and future drops while preserving existing ownership and proofs',async()=>{
  for(let i=0;i<5;i++)skins.push(await publish(skinProject(randomUUID())));
  await db.query('insert into public.saves(user_id,json) values($1,$2)',[U.author,{cur:'QA',profiles:{QA:{name:'QA',wallet:20000}},ts:1}]);
  const call=(name,args)=>asUser(U.author,async tx=>(await tx.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as value',args)).rows[0].value);
  const a=await call('sz_workshop_case_buy',[randomUUID(),'QA',1]),b=await call('sz_workshop_case_buy',[randomUUID(),'QA',a.saved_ts]),c=await call('sz_workshop_case_buy',[randomUUID(),'QA',b.saved_ts]);
  const reward=await call('sz_workshop_case_open',[a.case.id]);await assert.rejects(rpc(U.other,'case_pool',{item:reward.item_id,enabled:false}),/WORKSHOP_ADMIN_REQUIRED/);
  await rpc(U.admin,'case_pool',{item:reward.item_id,enabled:false});assert.equal((await catalog()).find(r=>r.id===reward.item_id).case_enabled,false);
  assert.deepEqual(await call('sz_workshop_case_open',[a.case.id]),reward);assert.equal((await call('sz_workshop_skin_proof',[reward.id])).id,reward.id);
  await assert.rejects(call('sz_workshop_case_buy',[randomUUID(),'QA',c.saved_ts]),/FORGE_NEEDS_FIVE/);
  assert.notEqual((await call('sz_workshop_case_open',[b.case.id])).item_id,reward.item_id);
  for(const skin of skins)await rpc(U.admin,'case_pool',{item:skin.item,enabled:false});await assert.rejects(call('sz_workshop_case_open',[c.case.id]),/FORGE_EMPTY/);
  assert.equal((await asUser(U.author,tx=>tx.query('select opened_at from public.sz_workshop_cases where id=$1',[c.case.id]))).rows[0].opened_at,null);
  for(const skin of skins)await rpc(U.admin,'case_pool',{item:skin.item,enabled:true});assert.ok((await call('sz_workshop_case_buy',[randomUUID(),'QA',c.saved_ts])).case.id);
 });
 await t.test('clients cannot write pool/case/bot counters or call the bypassed legacy implementation',async()=>{
  await assert.rejects(asUser(U.author,tx=>tx.query('update public.sz_workshop_map_stats set bot_likes=999,pool_rule=\'manual\'')),/permission denied/);
  await assert.rejects(asUser(U.author,tx=>tx.query('update public.sz_workshop_items set case_enabled=false')),/permission denied/);
  await assert.rejects(asUser(U.admin,tx=>tx.query("select sz_workshop_private.map_action_base('state','{}')")),/permission denied/);
  const state=await rpc(null,'state');assert.ok(state.policy);assert.equal(state.moderation_version,1);await assert.rejects(rpc(U.admin,'pool',{item:other.item,rule:'manual',release:other.release},{is_anonymous:true}),/WORKSHOP_LOGIN_REQUIRED/);
 });
});
