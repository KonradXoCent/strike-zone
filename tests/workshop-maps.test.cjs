const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createWorkshopDB,USERS:U,mapProject,skinProject}=require('../scripts/test-support/workshop-db.cjs');
test('Workshop map engagement, owner limits and mode-specific promotion',async t=>{
 const {db,asUser}=await createWorkshopDB();t.after(()=>db.close());
 await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);
 const submit=(uid,p,claims)=>asUser(uid,async tx=>(await tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',[p.kind==='sz-map'?'map':'skin',p.id,p])).rows[0].id,claims);
 const rpc=(uid,action,args={},claims)=>asUser(uid,async tx=>(await tx.query('select public.sz_workshop_map($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value,claims);
 const publish=async(mode)=>{const payload={...mapProject(randomUUID()),...(mode?{mode}:{})},release=await submit(U.admin,payload),item=(await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','') as item",[release]))).rows[0].item;return{item,release,payload};};
 const catalog=()=>asUser(null,async tx=>(await tx.query('select * from public.sz_workshop_catalog')).rows);
 const play=async(uid,map)=>{const session=randomUUID();await rpc(uid,'start',{release:map.release,session,mode:map.payload.mode||'tdm'});await db.query("update sz_workshop_private.map_sessions set created_at=now()-interval '61 seconds' where id=$1",[session]);return{session,result:await rpc(uid,'finish',{session})};};
 let tdm,ctf,second;
 await t.test('only the server-assigned owner bypasses both submission quotas for maps and skins',async()=>{
  for(let i=0;i<11;i++){await submit(U.admin,mapProject(randomUUID()));await submit(U.admin,skinProject(randomUUID()));}
  assert.equal((await db.query("select count(*)::int as n from public.sz_workshop_submissions where author_id=$1 and status='pending'",[U.admin])).rows[0].n,22);
  for(let i=0;i<10;i++)await submit(U.other,skinProject(randomUUID()));
  await assert.rejects(submit(U.other,skinProject(randomUUID()),{user_metadata:{owner:true},app_metadata:{admin:true}}),/WORKSHOP_SUBMISSION_LIMIT/);
  await assert.rejects(submit(U.admin,{...mapProject(randomUUID()),mode:'br'}),/WORKSHOP_INVALID_PROJECT/);
  await assert.rejects(submit(U.admin,{...mapProject(randomUUID()),walls:[[752,32,32,960]]}),/WORKSHOP_INVALID_PROJECT/);
 });
 await t.test('publication initializes metrics and legacy maps retain a defined TDM mode',async()=>{
  tdm=await publish();ctf=await publish('ctf');second=await publish('tdm');
  const rows=await catalog();assert.equal(rows.find(r=>r.id===tdm.item).mode,'tdm');assert.equal(rows.find(r=>r.id===ctf.item).mode,'ctf');
  assert.ok(rows.every(r=>Number(r.plays)===0&&r.likes===0&&!r.featured));
  const state=await rpc(null,'state');assert.deepEqual(state.liked,[]);assert.equal(state.policy.min_plays,50);assert.equal(state.policy.min_likes,10);
 });
 await t.test('likes are one per account, idempotent and private, and may be removed',async()=>{
  await assert.rejects(rpc(null,'like',{item:tdm.item,liked:true}),/WORKSHOP_LOGIN_REQUIRED/);
  await assert.rejects(rpc(U.author,'like',{item:tdm.item,liked:true},{is_anonymous:true}),/WORKSHOP_LOGIN_REQUIRED/);
  await Promise.all([rpc(U.author,'like',{item:tdm.item,liked:true}),rpc(U.author,'like',{item:tdm.item,liked:true})]);
  assert.equal((await catalog()).find(r=>r.id===tdm.item).likes,1);assert.deepEqual((await rpc(U.author,'state')).liked,[tdm.item]);
  assert.deepEqual((await rpc(U.admin,'state')).liked,[]);
  assert.equal((await asUser(U.admin,tx=>tx.query('select * from public.sz_workshop_map_likes'))).rows.length,0);
  await assert.rejects(asUser(U.author,tx=>tx.query('update public.sz_workshop_map_stats set likes=999')),/permission denied/);
  await assert.rejects(asUser(U.author,tx=>tx.query('insert into public.sz_workshop_map_likes(item_id,user_id) values($1,$2)',[tdm.item,U.admin])),/permission denied/);
  await rpc(U.author,'like',{item:tdm.item,liked:false});await rpc(U.author,'like',{item:tdm.item,liked:false});
  assert.equal((await catalog()).find(r=>r.id===tdm.item).likes,0);
 });
 await t.test('server time, ownership, unique sessions and replay throttling guard play counts',async()=>{
  const session=randomUUID();await rpc(U.author,'start',{session,release:tdm.release,mode:'tdm'});
  assert.equal((await rpc(U.author,'finish',{session,seconds:999999})).counted,false);
  await assert.rejects(rpc(U.admin,'finish',{session}),/WORKSHOP_PLAY_ID/);
  await assert.rejects(rpc(U.author,'start',{session,release:ctf.release,mode:'ctf'}),/WORKSHOP_PLAY_ID/);
  await assert.rejects(rpc(U.author,'start',{session:randomUUID(),release:ctf.release,mode:'tdm'}),/WORKSHOP_MAP_NOT_FOUND/);
  await assert.rejects(asUser(U.author,tx=>tx.query('select * from sz_workshop_private.map_sessions')),/permission denied/);
  await db.query("update sz_workshop_private.map_sessions set created_at=now()-interval '61 seconds' where id=$1",[session]);
  assert.equal((await rpc(U.author,'finish',{session})).counted,true);assert.equal((await rpc(U.author,'finish',{session})).counted,true);
  assert.equal((await rpc(U.author,'start',{session,release:tdm.release,mode:'tdm'})).counted,true);
  assert.equal((await play(U.author,tdm)).result.counted,false);assert.equal((await catalog()).find(r=>r.id===tdm.item).plays,1);
 });
 await t.test('only an owner can tune promotion, which respects both thresholds and map mode',async()=>{
  const settings={enabled:true,min_plays:1,min_likes:2,slots_per_mode:1};
  await assert.rejects(rpc(U.author,'settings',settings,{user_metadata:{owner:true}}),/WORKSHOP_ADMIN_REQUIRED/);
  await assert.rejects(rpc(U.admin,'settings',{...settings,min_plays:0}),/WORKSHOP_MAP_INPUT/);
  await rpc(U.admin,'settings',settings);await rpc(U.author,'like',{item:tdm.item,liked:true});
  assert.equal((await catalog()).find(r=>r.id===tdm.item).featured,false);
  await rpc(U.admin,'like',{item:tdm.item,liked:true});assert.equal((await catalog()).find(r=>r.id===tdm.item).featured,true);
  await play(U.admin,ctf);await rpc(U.author,'like',{item:ctf.item,liked:true});await rpc(U.admin,'like',{item:ctf.item,liked:true});
  assert.equal((await catalog()).find(r=>r.id===ctf.item).featured,true);
  await play(U.admin,second);for(const user of Object.values(U))await rpc(user,'like',{item:second.item,liked:true});
  const rows=await catalog();assert.equal(rows.find(r=>r.id===second.item).featured,true);assert.equal(rows.find(r=>r.id===tdm.item).featured,false);assert.equal(rows.find(r=>r.id===ctf.item).featured,true);
 });
 await t.test('revisions preserve metrics in one mode; changing mode starts a fresh ranking',async()=>{
  const same={...second.payload,name:'Nowa wersja'},release=await submit(U.admin,same);
  await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','')",[release]));
  let row=(await catalog()).find(r=>r.id===second.item);assert.equal(row.featured,true);assert.equal(row.likes,3);assert.equal(row.release_id,second.release);assert.equal(row.latest_release_id,release);await rpc(U.admin,'pool',{item:second.item,rule:'manual',release});
  const changed={...same,mode:'classic'},newRelease=await submit(U.admin,changed);
  await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','')",[newRelease]));
  await rpc(U.admin,'pool',{item:second.item,rule:'auto'});row=(await catalog()).find(r=>r.id===second.item);assert.equal(row.mode,'classic');assert.equal(row.plays,0);assert.equal(row.likes,0);assert.equal(row.featured,false);
  assert.equal((await rpc(U.author,'state')).liked.includes(second.item),false);
  assert.equal((await catalog()).find(r=>r.id===tdm.item).featured,true);
 });
 await t.test('withdrawn projects disappear from the pool and cannot receive likes or plays',async()=>{
  await asUser(U.admin,tx=>tx.query('select public.sz_workshop_withdraw($1)',[tdm.item]));
  assert.equal((await catalog()).some(r=>r.id===tdm.item),false);
  await assert.rejects(rpc(U.author,'like',{item:tdm.item,liked:true}),/WORKSHOP_MAP_NOT_FOUND/);
  await assert.rejects(rpc(U.author,'start',{session:randomUUID(),release:tdm.release,mode:'tdm'}),/WORKSHOP_MAP_NOT_FOUND/);
  assert.equal((await db.query('select featured from public.sz_workshop_map_stats where item_id=$1',[tdm.item])).rows[0].featured,false);
 });
});
