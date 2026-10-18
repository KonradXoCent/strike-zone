'use strict';
const{_electron}=require('playwright-core'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const{createWorkshopDB,USERS:U,mapProject,skinProject}=require('./test-support/workshop-db.cjs');
const{attachWorkshopAPI,installWorkshopClient}=require('./test-support/workshop-browser.cjs');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-moderation-'));let completed=false;
process.on('beforeExit',()=>{if(!completed&&!process.exitCode)process.exitCode=1;});
(async()=>{const{db,asUser}=await createWorkshopDB();let app;const errors=[];
 try{
  await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);
  const submit=async p=>(await asUser(U.author,tx=>tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',[p.kind==='sz-map'?'map':'skin',p.id,p]))).rows[0].id;
  const approve=async id=>(await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','') as item",[id]))).rows[0].item;
  const payload={...mapProject(randomUUID()),name:'Arena One',mode:'ctf'},first=await submit(payload),item=await approve(first);
  for(let i=0;i<5;i++)await approve(await submit({...skinProject(randomUUID()),name:'Finish '+i}));
  await asUser(U.admin,tx=>tx.query("select public.sz_workshop_map('settings',$1)",[{enabled:false,min_plays:50,min_likes:10,slots_per_mode:1}]));
  await db.query('insert into public.saves(user_id,json) values($1,$2)',[U.author,{cur:'QA',profiles:{QA:{name:'QA',wallet:10000}},ts:1}]);
  const purchased=(await asUser(U.author,tx=>tx.query('select public.sz_workshop_case_buy($1,$2,1) as value',[randomUUID(),'QA']))).rows[0].value;
  const reward=(await asUser(U.author,tx=>tx.query('select public.sz_workshop_case_open($1) as value',[purchased.case.id]))).rows[0].value;
  // Deterministic StatTrak fixture; actual grants and ownership use the public RPCs.
  await db.query('update public.sz_workshop_owned_skins set stattrak=true where id=$1',[reward.id]);
  fs.writeFileSync(tmp+'/index.html',fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'').replace('\nsbInit();','\n// Isolated moderation fixture.'));
  fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow,session}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest({urls:['https://*/*','wss://*/*']},(_d,cb)=>cb({cancel:true}));for(let i=0;i<2;i++)new BrowserWindow({width:1366,height:860,webPreferences:{partition:'moderation-'+i,backgroundThrottling:false}}).loadURL('about:blank');});`);
  app=await _electron.launch({executablePath:require('electron'),args:[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']});let pages=app.windows();while(pages.length<2){await new Promise(r=>setTimeout(r,30));pages=app.windows();}const[owner,player]=pages;
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>{w.setBounds({x:0,y:0,width:1366,height:860});w.show();}));
  for(const[i,p]of pages.entries()){p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await attachWorkshopAPI(p,asUser,i?U.author:U.admin);if(!i)await p.addInitScript(()=>{requestAnimationFrame=()=>0;});await p.goto('file://'+tmp+'/index.html');await p.waitForFunction(()=>!!window.SzWorkshopModeration,null,{polling:20});await p.setViewportSize({width:1366,height:860});await p.addStyleTag({content:'*{scroll-behavior:auto!important;animation:none!important;transition:none!important}'});await installWorkshopClient(p,i?U.author:U.admin,i?'Gracz':'ZeroX');}
  const settled=async p=>p.waitForFunction(()=>!COMMUNITY.busy&&!COMMUNITY_REFRESH,null,{polling:20});
  const refresh=async p=>{await p.evaluate(()=>communityRefresh());await settled(p);};
  const row=(p,id)=>p.locator('[data-wm-published="'+id+'"]');
  const catalog=async()=> (await asUser(null,tx=>tx.query('select * from public.sz_workshop_catalog where id=$1',[item]))).rows[0];
  const pool=async(release,mode)=>player.evaluate(({release,mode})=>{const slot=COMMUNITY.mapSlots.get(release);return{included:slot!==undefined&&mapSet(mode).includes(slot),other:['tdm','ctf','classic'].filter(m=>m!==mode).some(m=>mapSet(m).includes(slot))};},{release,mode});
  await owner.evaluate(()=>communityTab('moderation'));await row(owner,item).locator('[data-wm-rule=manual]').click();await settled(owner);
  const added=await catalog();assert.equal(added.featured,true);assert.equal(added.plays,0);assert.equal(added.likes,0);assert.equal(added.mode,'ctf');await refresh(player);assert.deepEqual(await pool(first,'ctf'),{included:true,other:false});
  console.log('PASS owner adds a zero-play map directly to its mode while automatic promotion is disabled');
  await player.evaluate(id=>communityPlay(id),first);await player.waitForFunction(()=>!!G?.communityMapRef,null,{polling:20});const slot=await player.evaluate(()=>sel.map),grid=await player.evaluate(()=>Array.from(GR.d));
  await row(owner,item).locator('[data-wm-rule=excluded]').click();await settled(owner);await refresh(player);assert.deepEqual(await player.evaluate(()=>Array.from(GR.d)),grid,'Running match geometry changed');
  await player.evaluate(()=>quit());assert.equal((await pool(first,'ctf')).included,false);await player.evaluate(()=>communityTab('catalog'));await player.evaluate(id=>communityPlay(id),first);await player.waitForFunction(()=>!!G?.communityMapRef,null,{polling:20});assert.equal(await player.evaluate(()=>sel.map),slot);await player.evaluate(()=>quit());
  await row(owner,item).locator('[data-wm-rule=manual]').click();await settled(owner);
  console.log('PASS pool removal preserves Workshop play and leaves running matches intact; old selection cannot reinsert an excluded map');
  const second=await submit({...payload,name:'Arena Two',theme:'forest'});await refresh(owner);await owner.evaluate(id=>communityDetails(id,'moderation'),second);await owner.locator('#pm [onclick*="communityReview"][onclick*="approved"]').click();await settled(owner);
  assert.equal((await catalog()).release_id,first);assert.equal((await catalog()).latest_release_id,second);
  await row(owner,item).locator('[data-wm-preview]').click();await owner.locator('#pm h2').waitFor();assert.equal(await owner.locator('#pm h2').innerText(),'Arena Two');await owner.locator('#pm [data-wm-rule=manual]').click();await settled(owner);assert.equal((await catalog()).release_id,second);
  const third=await submit({...payload,name:'Arena Three'});await refresh(owner);await owner.evaluate(id=>communityDetails(id,'moderation'),third);await owner.locator('[data-workshop-approve-pool]').click();await settled(owner);assert.equal((await catalog()).release_id,third);assert.equal((await catalog()).version,3);
  const fresh=await submit({...mapProject(randomUUID()),mode:'classic',name:'Immediate bomb map'});await refresh(owner);await owner.evaluate(id=>communityDetails(id,'moderation'),fresh);await owner.locator('[data-workshop-approve-pool]').click();await settled(owner);await refresh(player);assert.deepEqual(await pool(fresh,'classic'),{included:true,other:false});assert.deepEqual(await pool(third,'ctf'),{included:true,other:false});assert.equal((await pool(first,'ctf')).included,false);
  console.log('PASS ordinary approval keeps the pinned release; preview/replace and approve-and-add publish the chosen version atomically');
  await player.evaluate(()=>invSet('w'));await player.locator('[data-forge-equip="'+reward.id+'"]').click();await settled(player);await player.evaluate(id=>{P().communityStat={[id]:7};},reward.id);
  await row(owner,reward.item_id).locator('[data-wm-action=case_pool]').click();await settled(owner);await refresh(player);
  assert.equal(await player.evaluate(()=>forgePool().length),4);assert.equal(await player.locator('[data-forge-buy]').isDisabled(),true);assert.equal(await player.locator('[data-forge-equip="'+reward.id+'"]').isEnabled(),true);
  assert.deepEqual(await player.evaluate(id=>({owned:communityOwnRef('knife')?.owned,count:P().communityStat[id],stat:FORGE.owned.find(o=>o.id===id)?.stattrak}),reward.id),{owned:reward.id,count:7,stat:true});
  const proof=await player.evaluate(async id=>(await sb.rpc('sz_workshop_skin_proof',{instance_id:id})).data.id,reward.id);assert.equal(proof,reward.id);
  await row(owner,reward.item_id).locator('[data-wm-action=case_pool]').click();await settled(owner);await refresh(player);assert.equal(await player.evaluate(()=>forgePool().length),5);assert.equal(await player.locator('[data-forge-buy]').isEnabled(),true);
  await player.evaluate(()=>communityTab('catalog'));assert.equal(await player.locator('[data-wm-action],[data-workshop-approve-pool]').count(),0);
  console.log('PASS case withdrawal/restoration updates the 5-design gate while owned skins, equipment, StatTrak and ownership proofs remain valid');
  for(const language of['en','pl']){await owner.evaluate(l=>szLocale.set(l),language);await owner.evaluate(()=>communityTab('moderation'));assert.equal(await row(owner,item).locator('[data-wm-rule=excluded]').innerText(),language==='en'?'Remove from the main pool':'Wyłącz z głównej puli');for(const[w,h]of[[800,600],[480,600]]){await owner.setViewportSize({width:w,height:h});assert.equal(await owner.evaluate(()=>document.querySelector('[data-workshop-library]').scrollWidth>document.querySelector('[data-workshop-library]').clientWidth+1),false);}}
  console.log('PASS moderator PL/EN controls, small screens and player visibility');
  await owner.evaluate(()=>{const rpc=sb.rpc.bind(sb);sb.rpc=async(name,args)=>{const response=await rpc(name,args);if(name==='sz_workshop_map'&&args.action==='state'&&response.data)delete response.data.moderation_version;return response;};szLocale.set('en');});await refresh(owner);
  assert.equal(await owner.locator('[data-wm-action]').count(),0);assert.match(await owner.locator('[data-workshop-library]').innerText(),/waiting for the update to be deployed/);assert.equal(await owner.evaluate(()=>COMMUNITY.error),false);
  assert.deepEqual(errors,[]);completed=true;console.log('PASS older backend keeps catalog/login working and clearly marks the new owner controls as awaiting deployment');
 }catch(error){if(app){await app.windows()[0]?.screenshot({path:'/tmp/sz-moderation-failure.png'});console.error('Moderation UI state:',await app.windows()[0]?.evaluate(()=>({busy:COMMUNITY.busy,error:COMMUNITY.error,message:COMMUNITY.message,scroll:{height:$('main').scrollHeight,client:$('main').clientHeight,top:$('main').scrollTop},viewport:[innerWidth,innerHeight]})));}throw error;}finally{await app?.close();await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
