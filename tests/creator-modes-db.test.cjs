const{test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fixtures=require('./fixtures/creator-mode-maps.json'),{createWorkshopDB,USERS:U}=require('../scripts/test-support/workshop-db.cjs');
test('mode-specific maps retain validation, review authorization and correct main pools',async t=>{const{db,asUser}=await createWorkshopDB();t.after(()=>db.close());await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);
 for(const[mode,p]of Object.entries(fixtures))await t.test(mode+' validates, publishes, pins and starts in its own mode',async()=>{
  assert.equal((await db.query('select sz_workshop_private.project_valid($1,$2,true) as ok',['map',p])).rows[0].ok,true);
  const release=(await asUser(U.author,tx=>tx.query("insert into public.sz_workshop_submissions(kind,project_id,payload) values('map',$1,$2) returning id",[p.id,p]))).rows[0].id;
  await assert.rejects(asUser(U.other,tx=>tx.query("select public.sz_workshop_review($1,'approved','')",[release])),/WORKSHOP_ADMIN_REQUIRED/);
  const item=(await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','') as id",[release]))).rows[0].id;
  await asUser(U.admin,tx=>tx.query("select public.sz_workshop_map('pool',$1)",[{item,release,rule:'manual',expected_latest:release}]));const row=(await asUser(null,tx=>tx.query('select * from public.sz_workshop_catalog where id=$1',[item]))).rows[0];assert.equal(row.mode,mode);assert.equal(row.featured,true);
  const session=(await asUser(U.author,tx=>tx.query("select public.sz_workshop_map('start',$1) as data",[{release,session:randomUUID(),mode}]))).rows[0].data;assert.ok(session.session);
 });
 await t.test('malformed goals, props, missing props, wrong spawn halves and unknown modes are rejected',async()=>{const cases=[];let m=structuredClone(fixtures.football);m.sites[0][1]+=16;cases.push(m);m=structuredClone(fixtures.football);m.spawns.reverse();cases.push(m);m=structuredClone(fixtures.prophunt);m.props[0].form='http://invalid';cases.push(m);m=structuredClone(fixtures.prophunt);m.props=[];cases.push(m);m=structuredClone(fixtures.zombie);m.mode='made_up';cases.push(m);m=structuredClone(fixtures.prophunt);m.props[0].x=100000;cases.push(m);for(const p of cases)assert.equal((await db.query('select sz_workshop_private.project_valid($1,$2,true) as ok',['map',p])).rows[0].ok,false);});
});

test('the deployed creator-mode migration is the tested canonical SQL',()=>{const fs=require('node:fs');assert.equal(fs.readFileSync('database/creator-modes.sql','utf8'),fs.readFileSync('supabase/migrations/20261025004758_workshop_mode_specific_creator.sql','utf8'));});
