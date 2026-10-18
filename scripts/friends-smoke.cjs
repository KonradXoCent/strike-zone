'use strict';
// Two isolated game windows use the real SDK and a local Phoenix transport.
// No real player accounts, invitations or inventories are touched.
const {_electron}=require('playwright-core'),{createClient}=require('@supabase/supabase-js');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{pathToFileURL}=require('node:url');
const {startFixture}=require('./test-support/supabase-fixture.cjs'),{startPresenceFixture}=require('./test-support/presence-fixture.cjs');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-game-friends-'));
const ids=Array.from({length:4},()=>randomUUID()),[a,b,offline,noPhoto]=ids;
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM5kAAAAASUVORK5CYII=';
let complete=false;process.on('beforeExit',()=>{if(!complete&&!process.exitCode)process.exitCode=1;});
(async()=>{
 const broker=await startPresenceFixture(),fixtures=[];let app,extra;
 try{
  fixtures.push(await startFixture({userId:a,friends:[{friend_id:b,name:'Play'},{friend_id:offline,name:'OfflineQA'},{friend_id:noPhoto,name:'<b>NoPhoto</b>'}],profiles:[{user_id:b,name:'Play',avimg:png},{user_id:offline,name:'OfflineQA',avimg:png},{user_id:noPhoto,name:'<b>NoPhoto</b>',avimg:'data:image/svg+xml;base64,PHN2Zz4='}]}));
  fixtures.push(await startFixture({userId:b,friends:[{friend_id:a,name:'SenderQA'}],profiles:[{user_id:a,name:'SenderQA',avimg:png}]}));
  const source=fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,`<script src="${pathToFileURL(repo+'/vendor/supabase.js')}"></script>`).replace('\nsbInit();','\n/* Isolated test accounts are initialized below. */');
  fs.writeFileSync(tmp+'/index.html',source);fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));
  fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>{for(let i=0;i<2;i++){new BrowserWindow({width:1366,height:768,show:true,webPreferences:{partition:'friends-'+i,backgroundThrottling:false}}).loadFile(${JSON.stringify(tmp+'/index.html')},{query:{client:String(i)}});}});`);
  app=await _electron.launch({executablePath:require('electron'),args:[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']});
  let pages=app.windows();while(pages.length<2){await new Promise(resolve=>setTimeout(resolve,30));pages=app.windows();}
  pages.sort((x,y)=>new URL(x.url()).searchParams.get('client')-new URL(y.url()).searchParams.get('client'));
  const [sender,recipient]=pages,errors=[];
  await app.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows()){window.setBounds({x:0,y:0,width:1366,height:768});window.show();}});
  for(let i=0;i<2;i++){
   const page=pages[i],f=fixtures[i];page.on('pageerror',error=>errors.push(error.message));
   await page.setViewportSize({width:1366,height:768});
   await page.waitForFunction(()=>typeof friTradeReady==='function'&&window.supabase);
   await page.evaluate(async({base,email,password,endpoint,i})=>{
    cloudPush=()=>{};sb=window.supabase.createClient(base,'fixture-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});sb.realtime.endPoint=endpoint;
    const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;SBU=data.user;P().name=i?'Play':'SenderQA';P().avimg=null;
    await friInit();tab('play');
   },{base:f.base,email:f.email,password:f.password,endpoint:broker.endpoint,i});
  }
  const row=id=>sender.locator('#frl .sz-friend[data-friend-id="'+id+'"]');
  await sender.waitForFunction(id=>FR.synced&&FR.status==='SUBSCRIBED'&&FR.on[id]?.length,b);
  await row(offline).locator('img').waitFor();assert.equal(await row(offline).locator('small').innerText(),'Offline');
  assert.equal(await row(noPhoto).locator('img').count(),0);assert.equal(await row(noPhoto).locator('b').innerText(),'<b>NoPhoto</b>');assert.equal(await row(noPhoto).locator('b b').count(),0);
  await row(offline).click();const offlineActions=row(offline).locator('xpath=following-sibling::*[1]');
  assert.equal(await offlineActions.getByRole('button',{name:'Trade',exact:true}).isDisabled(),true);assert.equal(await offlineActions.getByRole('button',{name:'Usuń',exact:true}).isVisible(),true);
  await sender.evaluate(id=>trStart(id,'OfflineQA'),offline);assert.equal(await sender.evaluate(()=>TR),null);
  console.log('PASS saved images offline, safe avatar fallback, literal nicknames and disabled offline Trade');

  const liveImage=await recipient.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d');q.fillStyle='#238e8e';q.fillRect(0,0,64,64);q.fillStyle='#e8ffff';q.font='bold 30px system-ui';q.textAlign='center';q.fillText('P',32,43);return c.toDataURL('image/png');});
  await recipient.evaluate(image=>FR.ch.track({n:'Play',app:'game',match:true,mode:'ctf',avimg:image,at:Date.now()}),liveImage);
  await sender.waitForFunction(id=>document.querySelector('#frl [data-friend-id="'+id+'"] small')?.textContent==='W Meczu',b);
  assert.equal(await row(b).locator('img').getAttribute('src'),liveImage);
  await row(b).click();assert.equal(await row(b).locator('xpath=following-sibling::*[1]').getByRole('button',{name:'Trade',exact:true}).isEnabled(),true);
  await sender.evaluate(()=>szLocale.set('en'));assert.equal(await row(b).locator('small').innerText(),'In Match');
  assert.equal(await row(b).locator('b').innerText(),'Play');assert.equal(await row(b).locator('xpath=following-sibling::*[1]').getByRole('button',{name:'Delete',exact:true}).isVisible(),true);
  await sender.evaluate(()=>tab('friends'));assert.equal(await sender.locator('.sz-friends-list article img').count(),2);
  assert.equal(await sender.locator('.sz-friends-list article').first().locator('small').innerText(),'In Match');
  await sender.locator('#fn').fill('Draft');await recipient.evaluate(()=>FR.ch.track({n:'Play',app:'game',match:false,at:Date.now()}));
  await sender.waitForFunction(id=>document.querySelector('#frl [data-friend-id="'+id+'"] small')?.textContent==='Online',b);
  assert.equal(await sender.locator('#fn').inputValue(),'Draft');
  console.log('PASS live avatar, match/menu statuses, PL/EN labels, protected nicknames and preserved input');

  await sender.evaluate(()=>{FR.status='RECONNECTING';FR.synced=false;friRefreshUI();});
  assert.equal(await row(b).locator('small').innerText(),'Checking connection…');await sender.evaluate(id=>trOpen(id,'Play',true),b);assert.equal(await sender.evaluate(()=>TR),null);
  await recipient.evaluate(()=>FR.ch.track({n:'Play',app:'game',match:false,at:Date.now()}));
  await sender.evaluate(()=>{FR.status='SUBSCRIBED';});await sender.waitForFunction(()=>FR.synced);await sender.evaluate(()=>friRefreshUI());
  await sender.evaluate(()=>{P().skins=['knife:8:st'];P().stk={'knife:8:st':17};});await recipient.evaluate(()=>{P().skins=['ak:0'];});
  if(await row(b).getAttribute('aria-expanded')!=='true')await row(b).click();await row(b).locator('xpath=following-sibling::*[1]').getByRole('button',{name:'Trade',exact:true}).click();
  await recipient.waitForFunction(id=>TRQ?.fid===id,a);await recipient.evaluate(()=>tab('friends'));await recipient.locator('[data-friend-action=accept]').click();
  await sender.waitForFunction(()=>TR?.ch?.state==='joined');await recipient.waitForFunction(()=>TR?.ch?.state==='joined');
  await sender.locator('.trade-picks button').first().click();await recipient.locator('.trade-picks button').first().click();
  await sender.waitForFunction(()=>TR?.their==='ak:0');await recipient.waitForFunction(()=>TR?.their==='knife:8:st');
  await sender.locator('.trade-dialog button.pri').click();await recipient.locator('.trade-dialog button.pri').click();
  await sender.waitForFunction(()=>!TR&&P().skins.includes('ak:0')&&!P().skins.includes('knife:8:st'));
  await recipient.waitForFunction(()=>!TR&&P().skins.includes('knife:8:st')&&!P().skins.includes('ak:0'));
  assert.equal(await recipient.evaluate(()=>P().tradeHistory[0].receive),'knife:8:st');
  console.log('PASS real SDK invitation delivery, acceptance and completed StatTrak knife trade between two clients');

  await sender.evaluate(id=>trStart(id,'Play'),b);await recipient.waitForFunction(id=>TRQ?.fid===id,a);await recipient.evaluate(()=>trAccept());
  await sender.waitForFunction(()=>TR?.ch?.state==='joined');await recipient.waitForFunction(()=>TR?.ch?.state==='joined');
  await sender.evaluate(()=>trPick('ak:0'));await recipient.evaluate(()=>trPick('knife:8:st'));
  await sender.waitForFunction(()=>TR?.their==='knife:8:st');await recipient.evaluate(()=>FR.ch.untrack());
  await sender.waitForFunction(id=>!FR.on[id]?.length,b);await sender.evaluate(()=>trConfirm());await recipient.waitForFunction(()=>!TR);
  assert.equal(await sender.evaluate(()=>!TR&&P().skins.includes('ak:0')),true);assert.equal(await recipient.evaluate(()=>P().skins.includes('knife:8:st')),true);
  await recipient.evaluate(()=>friTrack());await sender.waitForFunction(id=>FR.on[id]?.length,b);
  console.log('PASS a disconnected partner cannot confirm or commit a trade; inventories stay unchanged');

  // Hold only the async invitation subscription callback, then disconnect its target.
  await recipient.evaluate(()=>{TRQ=null;});await sender.evaluate(id=>{
   const channel=sb.channel.bind(sb);window.__restoreChannel=()=>{sb.channel=channel;};
   sb.channel=function(name,options){const ch=channel(name,options);if(name==='inv-'+id){const subscribe=ch.subscribe.bind(ch);ch.subscribe=callback=>subscribe(status=>{if(status==='SUBSCRIBED')window.__heldTradeJoin=()=>callback(status);else callback(status);});}return ch;};trStart(id,'Play');
  },b);
  await sender.waitForFunction(()=>!!window.__heldTradeJoin);await recipient.evaluate(()=>FR.ch.untrack());
  await sender.waitForFunction(id=>document.querySelector('#frl [data-friend-id="'+id+'"] small')?.textContent==='Offline',b);
  await sender.evaluate(()=>{window.__heldTradeJoin();window.__restoreChannel();});
  await sender.waitForFunction(()=>!TR);assert.equal(await recipient.evaluate(()=>TRQ),null);
  assert.equal(await row(b).locator('img').count(),1);
  console.log('PASS disconnect between click and subscription blocks invitation delivery and keeps saved avatar');

  await recipient.evaluate(()=>FR.ch.track({n:'Play',app:'game',match:true,mode:'ctf',avimg:P().avimg,at:Date.now()}));
  extra=createClient(fixtures[1].base,'fixture-key',{auth:{persistSession:false,autoRefreshToken:false}});extra.realtime.endPoint=broker.endpoint;
  const launcher=extra.channel('sz-online',{config:{presence:{key:b}}});await new Promise((resolve,reject)=>launcher.subscribe(async status=>{if(status==='SUBSCRIBED'){const r=await launcher.track({n:'Play',app:'launcher',match:false,at:Date.now()});r==='ok'?resolve():reject(Error(r));}}));
  await sender.waitForFunction(id=>FR.on[id]?.length===2,b);await sender.evaluate(()=>szLocale.set('pl'));
  assert.equal(await row(b).locator('small').innerText(),'W Meczu');
  if(process.env.SZ_FRIENDS_SCREENSHOTS){const out=process.env.SZ_FRIENDS_SCREENSHOTS;fs.mkdirSync(out,{recursive:true});await sender.evaluate(()=>tab('play'));if(await row(b).getAttribute('aria-expanded')!=='true')await row(b).click();await sender.screenshot({path:out+'/friends-pl.png'});await sender.locator('#frl').screenshot({path:out+'/friends-panel.png'});}
  await recipient.evaluate(()=>friDispose());await sender.waitForFunction(id=>FR.on[id]?.length===1,b);assert.equal(await row(b).locator('small').innerText(),'Online');
  await extra.removeAllChannels();await sender.waitForFunction(id=>!FR.on[id]?.length,b);assert.equal(await row(b).locator('small').innerText(),'Offline');
  await sender.evaluate(()=>{SBU=null;friDispose();friRender();});assert.equal(await sender.locator('#frl .sz-friend').count(),0);
  assert.deepEqual(errors,[]);complete=true;console.log('PASS match status takes precedence across sessions; logout clears friend data; no renderer errors');
 }finally{await extra?.removeAllChannels();await app?.close();for(const f of fixtures)await f.close();await broker.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
