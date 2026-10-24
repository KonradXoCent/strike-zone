'use strict';
const {_electron}=require('playwright-core'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-modes-hud-')),output=repo+'/test-output/modes-hud';fs.mkdirSync(output,{recursive:true});
const html=fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'').replace('\nsbInit();','\n');
fs.writeFileSync(tmp+'/index.html',html);fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>new BrowserWindow({width:1440,height:900,webPreferences:{backgroundThrottling:false}}).loadURL('about:blank'));`);
let complete=false;process.on('beforeExit',()=>{if(!complete&&!process.exitCode)process.exitCode=1;});
(async()=>{const app=await _electron.launch({executablePath:require('electron'),args:[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']}),errors=[];try{
 const page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;});await page.goto('file://'+tmp+'/index.html');await page.waitForFunction(()=>!!window.SzMatchHud,null,{polling:50});
 const size=async(width,height)=>{await app.evaluate(({BrowserWindow},b)=>{const w=BrowserWindow.getAllWindows()[0];w.setMinimumSize(340,360);w.setBounds({x:0,y:0,...b});w.show();w.focus();},{width,height});await page.setViewportSize({width,height});await page.waitForTimeout(100);};
 for(const lang of['pl','en'])for(const variant of['football','hider','hunter']){
  await page.evaluate(({lang,variant})=>{if(G)quit();cloudPush=()=>{};$('splash').style.display='none';$('menu').hidden=false;P().bd=ACH.map(a=>a[0]);szLocale.set(lang);sel.mode=variant==='football'?'football':'prophunt';sel.map=mapSet(sel.mode)[0];sel.team=variant==='hider'?'T':'CT';sel.comp=false;begin0();if(G.intro)skipIntro();G.paused=false;G.ph='live';G.t=110;G.msg='';$('toast').style.display='none';if(G.mg){G.mg.phase='live';G.mg.time=180;G.sc={CT:7,T:4};G.me.mgDashCd=3.2;}else{G.me.hp=74;G.me.hnsCooldown=4;G.me.propLocked=true;}draw();SzMatchHud.update(true);},{lang,variant});
  assert.equal(await page.locator('.mh-cash').count(),0);assert.equal(await page.locator('.mh-held').count(),0);
  assert.equal(await page.locator('.mh-mode-top').count(),1);assert.equal(await page.locator('.mh-mode-bottom').count(),1);
  if(variant==='football'){assert.match(await page.locator('.mh-football-top').innerText(),/7/);assert.match(await page.locator('.mh-football-top').innerText(),/4/);assert.match(await page.locator('.mh-mode-abilities').innerText(),lang==='en'?/LMB/:/LPM/);}
  else {assert.match(await page.locator('.mh-mode-health').innerText(),/74/);assert.equal(await page.locator('.mh-ability').count(),variant==='hider'?3:2);}
  for(const [width,height]of[[1440,900],[900,600],[400,760]]){await size(width,height);await page.evaluate(()=>{fit();draw();SzMatchHud.update(true);});
   for(const scale of[.7,1,1.3]){await page.evaluate(scale=>{ST_().hud=scale;SzMatchHud.update(true);},scale);for(const selector of['.mh-mode-top','.mh-mode-bottom']){const r=await page.locator(selector).boundingBox();assert(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({lang,variant,width,height,scale,selector,r}));}if(scale===1)await page.screenshot({path:output+'/'+variant+'-'+lang+'-'+width+'.png'});}
  }await page.evaluate(()=>{ST_().hud=1;});
 }
 await page.evaluate(()=>{if(G)quit();const cover=SzLoading.create('loading-art-preview');document.body.append(cover);});await size(1440,900);await page.screenshot({path:output+'/game-loading-pl.png'});
 assert.deepEqual(errors,[]);complete=true;console.log('PASS football and both Prop Hunt roles: live values, useful abilities, no cash/weapons, PL/EN, three sizes and three HUD scales');
}finally{await app.close();fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
