'use strict';
const {_electron}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createWorkshopDB,USERS:U,mapProject}=require('./test-support/workshop-db.cjs');
const {attachWorkshopAPI,installWorkshopClient}=require('./test-support/workshop-browser.cjs');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-map-engagement-'));
let complete=false;process.on('beforeExit',()=>{if(!complete&&!process.exitCode)process.exitCode=1;});
(async()=>{const {db,asUser}=await createWorkshopDB();let app;const errors=[];
 try{
  await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);
  const maps=[];for(const mode of ['tdm','ctf','classic']){const payload={...mapProject(randomUUID()),name:'Arena '+mode,mode};const id=(await asUser(U.admin,tx=>tx.query("insert into public.sz_workshop_submissions(kind,project_id,payload) values('map',$1,$2) returning id",[payload.id,payload]))).rows[0].id;const item=(await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','') as item",[id]))).rows[0].item;maps.push({release:id,item,mode});}
  const source=fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'').replace('\nsbInit();','\n/* Isolated Postgres fixture. */');
  fs.writeFileSync(tmp+'/index.html',source);fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>{for(let i=0;i<2;i++)new BrowserWindow({width:1366,height:860,show:true,webPreferences:{partition:'workshop-map-'+i,backgroundThrottling:false}}).loadURL('about:blank');});`);
  app=await _electron.launch({executablePath:require('electron'),args:[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']});let pages=app.windows();while(pages.length<2){await new Promise(r=>setTimeout(r,30));pages=app.windows();}const [owner,player]=pages;
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>{w.setBounds({x:0,y:0,width:1366,height:860});w.show();}));
  for(const [i,page] of pages.entries()){page.on('pageerror',e=>errors.push(e.message));await attachWorkshopAPI(page,asUser,i?U.author:U.admin);await page.goto('file://'+tmp+'/index.html');await page.waitForFunction(()=>!!window.SzWorkshopMaps);await page.setViewportSize({width:1366,height:860});await installWorkshopClient(page,i?U.author:U.admin,i?'Gracz':'ZeroX');}
  await owner.evaluate(()=>creatorTab('maps'));await owner.waitForFunction(()=>document.querySelector('[data-workshop-limit]')?.textContent.includes('bez limitu'));
  await owner.selectOption('#creator-test-mode','ctf');assert.equal(await owner.evaluate(()=>creatorParseMap(creatorState().map).mode),'ctf');await owner.evaluate(()=>creatorSaveMap());assert.equal(await owner.locator('#creator-test-mode').inputValue(),'ctf');
  await owner.evaluate(()=>communityTab('moderation'));await owner.locator('[data-workshop-policy]').waitFor();await owner.locator('[name=min_plays]').fill('1');await owner.locator('[name=min_likes]').fill('1');await owner.getByRole('button',{name:'Zapisz zasady awansu'}).click();await owner.waitForFunction(()=>document.querySelector('#cw-notice')?.textContent==='Zapisano zasady awansu map.');
  assert.equal((await asUser(null,tx=>tx.query('select min_plays,min_likes from public.sz_workshop_map_policy'))).rows[0].min_plays,1);
  console.log('PASS owner unlimited notice, persisted author mode and saved promotion controls');
  await player.evaluate(()=>communityTab('catalog'));await player.evaluate(()=>communityRefresh());
  const botReport=[];
  for(const map of maps){
   await player.evaluate(id=>communityPlay(id),map.release);await player.waitForFunction(()=>G?.workshopRun?.started&&!G.creatorTest&&!G.client);
   assert.equal(await player.evaluate(()=>sel.mode),map.mode);
   const session=await player.evaluate(()=>G.workshopRun.id);
   // Backdate only the isolated database clock fixture. The client still has to
   // accumulate a minute through actual game updates and bot navigation.
   await db.query("update sz_workshop_private.map_sessions set created_at=now()-interval '65 seconds' where id=$1",[session]);
   const report=await player.evaluate(mode=>{
    if(G.intro)skipIntro();G.paused=false;G.ph='live';G.t=1000;G.cheat=null;const before=G.ps.filter(p=>!p.human&&!p.rh).map(p=>[p.i,p.x,p.y]),shoot=fire;fire=()=>{};
    try{for(let i=0;i<1900;i++)upd(1/30);}finally{fire=shoot;G.paused=true;}
    const moved=before.filter(([id,x,y])=>{const p=G.ps.find(p=>p.i===id);return p&&Math.hypot(p.x-x,p.y-y)>20;}).length;
    const seconds=G.workshopRun.seconds,players=G.ps.length,slot=sel.map,routes=SITES[slot].map(r=>{const a=SPW[slot][0];return findPath(a[0]+a[2]/2,a[1]+a[3]/2,r[0]+r[2]/2,r[1]+r[3]/2).length;});draw();return{mode,moved,players,seconds,routes};
   },map.mode);
   assert.ok(report.moved>=2,JSON.stringify(report));assert.ok(report.players>1);assert.ok(report.seconds>=60);assert.ok(report.routes.every(n=>n>1));botReport.push(report);
   await player.waitForFunction(()=>G?.workshopRun?.done);const counters=(await db.query('select plays,bot_plays,bot_likes from public.sz_workshop_map_stats where item_id=$1',[map.item])).rows[0];assert.equal(counters.plays,1);assert.equal(counters.bot_plays,report.players-1);assert.ok(counters.bot_likes>=0&&counters.bot_likes<=counters.bot_plays);assert.deepEqual(await player.evaluate(()=>G.workshopRun.botReview),{plays:counters.bot_plays,likes:counters.bot_likes});
   await player.evaluate(()=>quit());await player.evaluate(()=>communityTab('catalog'));await player.evaluate(()=>communityRefresh());
   const card=player.locator('[data-cw-card="'+map.release+'"]');await card.locator('[data-workshop-like]').click();await card.locator('[data-workshop-like][aria-pressed=true]:enabled').waitFor();
   await player.waitForFunction(id=>COMMUNITY.rows.find(r=>r.id===id)?.featured,map.item);
   const pools=await player.evaluate(async({item,mode})=>{sel.map=0;await communityRefresh();const row=COMMUNITY.rows.find(r=>r.id===item),slot=COMMUNITY.mapSlots.get(row.release_id);return{expected:mapSet(mode).includes(slot),others:['tdm','ctf','classic'].filter(m=>m!==mode).map(m=>mapSet(m).includes(slot))};},map);
   assert.equal(pools.expected,true);assert.deepEqual(pools.others,[false,false]);
  }
  console.log('PASS published maps have moving bots and reachable objectives in TDM, CTF and bomb mode',JSON.stringify(botReport));
  console.log('PASS active gameplay reaches the server counter and likes promote each map only into its authored mode');
  await player.evaluate(()=>szLocale.set('en'));await player.locator('[data-workshop-mode]').selectOption('ctf');assert.equal(await player.locator('.cw-card').count(),1);assert.match(await player.locator('.wm-featured').innerText(),/^In the main pool · v/);assert.equal(await player.locator('.wm-like').innerText(),'Liked');
  await player.locator('.wm-like').click();await player.locator('.wm-like[aria-pressed=false]:enabled').waitFor();const botLikes=(await db.query("select bot_likes from public.sz_workshop_map_stats where item_id=$1",[maps.find(m=>m.mode==='ctf').item])).rows[0].bot_likes;assert.equal(await player.locator('.wm-featured').count(),botLikes>=1?1:0);
  await player.evaluate(()=>szLocale.set('pl'));assert.equal(await player.locator('.wm-like').innerText(),'Polub mapę');await player.locator('[data-workshop-mode]').selectOption('all');
  await player.evaluate(()=>szLocale.set('en'));await player.waitForTimeout(80);const polish=await player.evaluate(()=>{const w=document.createTreeWalker($('main'),NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode())if(/[ąćęłńóśźż]/i.test(n.data)&&!n.parentElement.closest('[data-user-content]'))out.push(n.data);return out;});assert.deepEqual(polish,[]);
  if(process.env.SZ_MAPS_SCREENSHOTS){fs.mkdirSync(process.env.SZ_MAPS_SCREENSHOTS,{recursive:true});await player.screenshot({path:process.env.SZ_MAPS_SCREENSHOTS+'/catalog-en.png'});await owner.screenshot({path:process.env.SZ_MAPS_SCREENSHOTS+'/promotion-pl.png'});}
  await player.evaluate(()=>{SBU=null;communityReset();});await player.evaluate(()=>communityTab('catalog'));await player.evaluate(()=>communityRefresh());assert.equal(await player.locator('.wm-like:enabled').count(),0);
  assert.deepEqual(errors,[]);complete=true;console.log('PASS one-account like toggles, automatic removal, filters, PL/EN and signed-out controls');
 }finally{await app?.close();await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
