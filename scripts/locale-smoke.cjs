'use strict';
const{_electron}=require('playwright-core'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const{createWorkshopDB,USERS:U,mapProject,skinProject}=require('./test-support/workshop-db.cjs');
const{attachWorkshopAPI,installWorkshopClient}=require('./test-support/workshop-browser.cjs');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-locale-'));let completed=false;
process.on('beforeExit',()=>{if(!completed&&!process.exitCode)process.exitCode=1;});
fs.writeFileSync(tmp+'/index.html',fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'').replace('\nsbInit();','\n// Isolated language audit.'));
fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow,session}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest({urls:['https://*/*','wss://*/*']},(_d,cb)=>cb({cancel:true}));new BrowserWindow({width:1440,height:900,webPreferences:{backgroundThrottling:false}}).loadURL('about:blank');});`);
(async()=>{const{db,asUser}=await createWorkshopDB();let app;const snapshots=[],errors=[];try{
 await db.query('insert into public.sz_workshop_admins(user_id) values($1)',[U.admin]);for(const p of[{...mapProject(),mode:'ctf'},...Array.from({length:5},(_,i)=>({...skinProject('language-skin-'+i),name:'User finish '+i}))]){const id=(await asUser(U.author,tx=>tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',[p.kind==='sz-map'?'map':'skin',p.id,p]))).rows[0].id;await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','')",[id]));}
 await db.query('insert into public.saves(user_id,json) values($1,$2)',[U.admin,{cur:'QA',profiles:{QA:{name:'QA',wallet:10000}},ts:1}]);const purchased=(await asUser(U.admin,tx=>tx.query('select public.sz_workshop_case_buy($1,$2,1) as value',[require('node:crypto').randomUUID(),'QA']))).rows[0].value;await asUser(U.admin,tx=>tx.query('select public.sz_workshop_case_open($1)',[purchased.case.id]));await db.query('update public.sz_workshop_owned_skins set stattrak=true');
 const pending=(await asUser(U.author,tx=>tx.query('insert into public.sz_workshop_submissions(kind,project_id,payload) values($1,$2,$3) returning id',['map','pending-language-map',{...mapProject('pending-language-map'),name:'Untouched user title'}]))).rows[0].id;
 app=await _electron.launch({executablePath:require('electron'),args:[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']});const page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await attachWorkshopAPI(page,asUser,U.admin);await page.addInitScript(()=>{requestAnimationFrame=()=>0;});await page.goto('file://'+tmp+'/index.html');await page.waitForFunction(()=>!!window.SzWorkshopModeration);await page.setViewportSize({width:1440,height:900});await installWorkshopClient(page,U.admin,'ZeroX').catch(async error=>{console.error('Workshop audit startup:',await page.evaluate(()=>({ready:COMMUNITY.ready,error:COMMUNITY.error,message:COMMUNITY.message,admin:COMMUNITY.admin,rows:COMMUNITY.rows.length})),errors);throw error;});
 await page.evaluate(()=>{P().skins=['ak:0','ak:0','awp:0','knife:0:st'];});
 async function snap(language,name,fn,arg){await page.evaluate(fn,arg);await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,30)));const text=await page.evaluate(()=>{const root=document.createElement('div');for(const id of['main','buy','ov','pm']){const e=$(id);if(e&&(id==='main'?!$('menu').hidden:e.style.display!=='none'&&e.style.display!==''))root.append(e.cloneNode(true));}for(const e of root.querySelectorAll('script,style,[data-user-content]'))e.remove();const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),list=[];let n;while(n=walker.nextNode()){const s=n.data.trim();if(s&&!/^\d+[\d .,:/%$·xK-]*$/.test(s))list.push(s);}return[...new Set(list)];});snapshots.push({language,name,text});}
 for(const language of['en','pl']){
  await page.evaluate(language=>SzSettings.save({language}),language);
  for(const tabName of['play','shop','market','bp','srv','rank','friends','prof','set','ow','features'])await snap(language,tabName,n=>{pmClose();tab(n);},tabName);
  for(const kind of['w','br','mu','contracts','upgrader'])await snap(language,'inventory:'+kind,k=>invSet(k),kind);
  for(const kind of['knives','gloves','weapons'])await snap(language,'arsenal:'+kind,k=>visualTab(k),kind);
  for(const kind of['maps','skins'])await snap(language,'editor:'+kind,k=>creatorTab(k),kind);
  for(const kind of['catalog','mine','moderation'])await snap(language,'workshop:'+kind,k=>communityTab(k),kind);
  await snap(language,'review',id=>communityDetails(id,'moderation'),pending);await page.evaluate(()=>pmClose());
  await snap(language,'modes',()=>playFlow());await page.evaluate(()=>pmClose());
  await page.evaluate(()=>{sel.map=2;sel.mode='tdm';sel.team='CT';begin0();if(G.intro)skipIntro();G.paused=true;});
  await snap(language,'pause',()=>{G.paused=false;togglePause();});await snap(language,'pause-settings',()=>pauseSettings());
  await page.evaluate(()=>{G.paused=false;G.ph='buy';G.bo=1;$('ov').style.display='none';});
  for(const category of['pistol','smg','rifle','sniper','gear','nade','refund'])await snap(language,'shop:'+category,k=>{BT=k;showBuy();},category);
  await page.evaluate(()=>quit());
 }
 const plWords=/[ąćęłńóśźż]|\b(?:granaty|nowy|kilof|wycofaj|jednolity|pasy|moro|piksele|baza|akcent|detale|projekt|lokalne|arsenale|dzisiaj|ocen|okien|egzemplarzy|skrzynie|najnowsze|edytor|masz|zestawy|mapy|mapa|skiny|gracze|boty|zatwierdzone|zatwierdzona|autor|wersja|przedmioty|odrzucone|ekwipunek|anuluj|zapisz|usuń|szukaj|brak|tryb|graj|polub|skrzynki|oczekuje|nazwa|dostępne|wymagana|kupno|cena|pancerz|wybierz|testuj|podgląd)\b/iu;
 const enPhrases=/\b(?:Save settings|Main menu|Sign in|Loading map|Leave match|Open case|Search skins|Battle pass|Close window|Buy menu|Your team|Game mode|Log out|Capture the mouse)\b/i;
 const findings=snapshots.flatMap(s=>s.text.filter(text=>s.language==='en'?plWords.test(text):enPhrases.test(text)).map(text=>({language:s.language,screen:s.name,text})));
 fs.writeFileSync(process.env.SZ_LOCALE_REPORT||'/tmp/sz-locale-report.json',JSON.stringify({snapshots,findings,errors},null,2));
 if(process.env.SZ_LOCALE_DISCOVERY){console.log(JSON.stringify(findings,null,2));console.log('Captured '+snapshots.length+' screens');}else{assert.deepEqual(findings,[],'Mixed interface translations');assert.deepEqual(errors,[]);console.log('PASS '+snapshots.length+' PL/EN screen audits: menu, inventory, Workshop, moderation, editor, arsenal, mode choice, pause and every shop category');}
 completed=true;
 }finally{await app?.close();await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
