const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createWorkshopDB,USERS:U,OWNER_CODE,mapProject,skinProject}=require('../scripts/test-support/workshop-db.cjs');
test('Workshop database: authors, moderation, publication and owner enrollment',async t=>{
 const {db,asUser}=await createWorkshopDB();t.after(()=>db.close());let mapId,skinId,itemId;
 const submit=(uid,p)=>asUser(uid,tx=>tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning *',[p.kind==='sz-map'?'map':'skin',p.id,p]));
 const review=(uid,id,decision,note='')=>asUser(uid,tx=>tx.query('select public.sz_workshop_review($1,$2,$3) as item',[id,decision,note]));
 await t.test('anon has no submit, review or enrollment permissions',async()=>{
  await assert.rejects(submit(null,skinProject()),/permission denied/);await assert.rejects(review(null,crypto.randomUUID(),'approved'),/permission denied/);
  assert.equal((await asUser(null,tx=>tx.query('select * from public.sz_workshop_catalog'))).rows.length,0);
 });
 await t.test('owner code cannot be omitted or forged, and can be claimed only once',async()=>{
  for(const code of [null,'','0'.repeat(64)])await assert.rejects(asUser(U.other,tx=>tx.query('select public.sz_workshop_claim_owner($1)',[code])),/WORKSHOP_INVALID_OWNER_CODE/);
  await asUser(U.admin,tx=>tx.query('select public.sz_workshop_claim_owner($1)',[OWNER_CODE]));
  assert.equal((await asUser(U.admin,tx=>tx.query('select * from public.sz_workshop_admins'))).rows.length,1);
  await assert.rejects(asUser(U.other,tx=>tx.query('select public.sz_workshop_claim_owner($1)',[OWNER_CODE])),/WORKSHOP_INVALID_OWNER_CODE/);
  await assert.rejects(asUser(U.other,tx=>tx.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.other])),/permission denied/);
 });
 await t.test('submissions remain private and immutable to their author',async()=>{
  mapId=(await submit(U.author,mapProject())).rows[0].id;skinId=(await submit(U.author,skinProject())).rows[0].id;
  const own=(await asUser(U.author,tx=>tx.query('select * from public.sz_workshop_submissions'))).rows;assert.equal(own.length,2);assert.ok(own.every(r=>r.status==='pending'&&r.author_id===U.author&&r.author_name==='Autor'));
  assert.equal((await asUser(U.other,tx=>tx.query('select * from public.sz_workshop_submissions'))).rows.length,0);
  await assert.rejects(asUser(U.author,tx=>tx.query("update public.sz_workshop_submissions set status='approved' where id=$1",[mapId])),/permission denied/);
  await assert.rejects(asUser(U.author,tx=>tx.query("insert into public.sz_workshop_submissions(kind,project_id,payload,author_id) values('skin',$1,$2,$3)",[skinProject().id,skinProject(),U.other])),/permission denied/);
  await assert.rejects(review(U.author,mapId,'approved'),/WORKSHOP_ADMIN_REQUIRED/);
  await assert.rejects(asUser(U.other,tx=>tx.query('select public.sz_workshop_review($1,$2,$3)',[mapId,'approved','']),{app_metadata:{admin:true}}),/WORKSHOP_ADMIN_REQUIRED/);
 });
 await t.test('invalid or incomplete projects and disconnected maps are rejected on the server',async()=>{
  const invalid=[{...skinProject(),colors:null},{...skinProject(),colors:undefined},{...skinProject(),name:undefined},{...skinProject(),strokes:[{size:2,color:'#ffffff',points:[[Infinity,0]]}]},{...mapProject(),width:undefined},{...mapProject(),walls:[[752,32,32,960]]}];
  for(const p of invalid)await assert.rejects(submit(U.other,p),/WORKSHOP_INVALID_PROJECT/);
 });
 await t.test('moderation publishes only approved content and returns rejection notes',async()=>{
  assert.equal((await asUser(U.admin,tx=>tx.query('select * from public.sz_workshop_submissions'))).rows.length,2);
  itemId=(await review(U.admin,mapId,'approved')).rows[0].item;
  await assert.rejects(review(U.admin,skinId,'rejected'),/WORKSHOP_REVIEW_NOTE_REQUIRED/);
  await review(U.admin,skinId,'rejected','Dodaj więcej kontrastu.');
  const catalog=(await asUser(null,tx=>tx.query('select * from public.sz_workshop_catalog'))).rows;assert.equal(catalog.length,1);assert.equal(catalog[0].release_id,mapId);
  const own=(await asUser(U.author,tx=>tx.query('select * from public.sz_workshop_submissions where id=$1',[skinId]))).rows[0];assert.equal(own.status,'rejected');assert.equal(own.review_note,'Dodaj więcej kontrastu.');
  await assert.rejects(asUser(U.author,tx=>tx.query('update public.sz_workshop_submissions set payload=$1 where id=$2',[mapProject(),mapId])),/permission denied/);
  await assert.rejects(asUser(U.other,tx=>tx.query('select owner_id from public.sz_workshop_items')),/permission denied/);
 });
 await t.test('retries are idempotent and revisions keep the old approved release playable',async()=>{
  await review(U.admin,mapId,'approved');await assert.rejects(review(U.admin,mapId,'rejected','zmiana decyzji'),/WORKSHOP_ALREADY_REVIEWED/);
  const p=mapProject();p.name='Arena druga wersja';const id=(await submit(U.author,p)).rows[0].id;
  assert.equal((await review(U.admin,id,'approved')).rows[0].item,itemId);
  const versions=(await asUser(U.other,tx=>tx.query('select * from public.sz_workshop_releases where item_id=$1 order by version',[itemId]))).rows;assert.equal(versions.length,2);assert.equal(versions[0].id,mapId);assert.equal(versions[1].version,2);
 });
 await t.test('per-user pending limits block submission flooding',async()=>{
  for(let i=0;i<5;i++)await submit(U.other,skinProject(crypto.randomUUID()));
  await assert.rejects(submit(U.other,skinProject(crypto.randomUUID())),/WORKSHOP_SUBMISSION_LIMIT/);
 });
 await t.test('only moderators can withdraw published content',async()=>{
  await assert.rejects(asUser(U.other,tx=>tx.query('select public.sz_workshop_withdraw($1)',[itemId])),/WORKSHOP_ADMIN_REQUIRED/);
  await asUser(U.admin,tx=>tx.query('select public.sz_workshop_withdraw($1)',[itemId]));
  assert.equal((await asUser(null,tx=>tx.query('select * from public.sz_workshop_catalog'))).rows.length,0);
  assert.equal((await asUser(U.other,tx=>tx.query('select * from public.sz_workshop_releases'))).rows.length,0);
 });
});
