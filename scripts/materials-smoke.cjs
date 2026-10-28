'use strict';
const {_electron}=require('playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-materials-'));
const output=process.env.SZ_MATERIALS_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
let completed=false;process.on('beforeExit',()=>{if(!completed&&!process.exitCode){console.error('Material checks did not complete');process.exitCode=1;}});
const source=fs.readFileSync(path.join(repo,'game-source/index.html'),'utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'').replace('\nsbInit();','\n// Isolated renderer fixture.\n');
fs.writeFileSync(temp+'/index.html',source);fs.writeFileSync(temp+'/package.json',JSON.stringify({main:'main.cjs'}));
fs.writeFileSync(temp+'/main.cjs',`const {app,BrowserWindow,session}=require('electron');app.setPath('userData',${JSON.stringify(temp+'/profile')});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest({urls:['https://*/*','wss://*/*']},(_d,cb)=>cb({cancel:true}));new BrowserWindow({width:1440,height:900,show:true,webPreferences:{backgroundThrottling:false}}).loadURL('about:blank');});`);
(async()=>{const app=await _electron.launch({executablePath:require('electron'),args:[temp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu']});const errors=[];
 try{const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;});await page.goto('file://'+temp+'/index.html');await page.waitForFunction(()=>window.SzMapMaterials?.enabled);
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds({x:0,y:0,width:1440,height:900});w.show();w.focus();});await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>{cloudPush=()=>{};$('splash').style.display='none';P().bd=ACH.map(a=>a[0]);});
  const maps=await page.evaluate(()=>{
   const result=[];for(let map=0;map<14;map++){if([6,7,8].includes(map))continue;
    sel.map=map;sel.mode=mapSet('br').includes(map)?'br':mapSet('zombie').includes(map)?'zombie':'tdm';sel.team='CT';sel.comp=false;begin0();if(G.intro)skipIntro();G.paused=true;
    const grid=GR,before=JSON.stringify({d:grid?Array.from(grid.d):null,nd:grid?Array.from(grid.nd||[]):null,walls,wins,sites:SITES[map],spawns:SPW[map],covers:grid?.covers,links:grid?.links});
    SzMapMaterials.setEnabled(true,false);const start=performance.now();draw();cx.getImageData(0,0,1,1);const bake=performance.now()-start,a=SzMapMaterials.stats();for(let n=0;n<30;n++)draw();const b=SzMapMaterials.stats();
    if(a.bakes!==b.bakes||a.tileBuilds!==b.tileBuilds||a.spriteBuilds!==b.spriteBuilds)throw Error('Cache rebuilt during warm rendering on map '+map);
    const after=JSON.stringify({d:grid?Array.from(grid.d):null,nd:grid?Array.from(grid.nd||[]):null,walls,wins,sites:SITES[map],spawns:SPW[map],covers:grid?.covers,links:grid?.links});
    const windowPixels=(grid?.windows||[]).map(w=>{const[x,y,width,height]=w.rect;const p=SCV.getContext('2d').getImageData(Math.floor(x+width/2),Math.floor(y+height/2),1,1).data;return Array.from(p);});
    result.push({map,name:MAPN[map],profile:SzMapMaterials.profile(map,MAP_BRIEFINGS[map]).id,bakeWithFirstFrameMs:+bake.toFixed(2),geometryUnchanged:before===after,cache:[SCV.width,SCV.height],tileCount:b.tileCount,tileBytes:b.tileBytes,windows:windowPixels.length,alpha:windowPixels.every(p=>p[3]===255)});quit();
   }return result;
  });
  for(const m of maps){assert.equal(m.geometryUnchanged,true,m.name);assert.ok(m.tileCount<=64,m.name);assert.ok(m.tileBytes<=4*1024*1024,m.name);assert.equal(m.alpha,true,m.name);}
  console.log('PASS all 14 maps: stable hot cache, bounded tiles, original collision/navigation/sites/spawns/covers/windows and links');
  const workshop=await page.evaluate(()=>{const result=[];for(const theme of['desert','industrial','forest']){const map=creatorBlankMap();map.theme=theme;const checked=creatorValidatePlay(map);CREATOR_TEST={owner:creatorOwner(),previous:{...sel},map:checked.map};creatorMountMap(checked.map,checked.grid);sel.map=CREATOR_BASE_MAP_COUNT;sel.mode='tdm';sel.team='CT';begin0();if(G.intro)skipIntro();G.paused=true;draw();result.push({theme,profile:SzMapMaterials.profile(sel.map,MAP_BRIEFINGS[sel.map]).id,bots:G.ps.filter(p=>!p.human).length,covers:GR.covers.length,cache:!!SCV});quit();}return result;});
  assert.deepEqual(workshop.map(r=>r.profile),['desert','industrial','forest']);for(const w of workshop){assert.equal(w.cache,true);assert.ok(w.bots>0);assert.ok(w.covers>0);}console.log('PASS workshop maps: all three authored themes, bot matches and cover materials');
  const benchmark=[];
  for(const map of[2,1,5,6]){
   const row=await page.evaluate(map=>{
    sel.map=map;sel.mode=map===9?'zombie':'tdm';sel.team='CT';sel.comp=false;begin0();if(G.intro)skipIntro();G.paused=true;setGameZoom(.78);
    if(SITES[map]?.[0]){const[x,y,w,h]=SITES[map][0];if(!hitW(x+w/2,y+h/2)){G.me.x=x+w/2;G.me.y=y+h/2;}}
    const buffers={};for(const key of['simple','textured']){SzMapMaterials.setEnabled(key==='textured',false);draw();cx.getImageData(0,0,1,1);buffers[key]=SCV;}
    const times={simple:[],textured:[]};
    for(let repeat=0;repeat<9;repeat++)for(const key of repeat%2?['textured','simple']:['simple','textured']){
     SzMapMaterials.setEnabled(key==='textured',false);SCV=buffers[key];SCG=G;SCK=sel.map+'|'+WW+'|'+WH;for(let n=0;n<3;n++)draw();cx.getImageData(0,0,1,1);
     const before=SzMapMaterials.stats(),start=performance.now();for(let n=0;n<12;n++)draw();cx.getImageData(0,0,1,1);times[key].push((performance.now()-start)/12);const after=SzMapMaterials.stats();if(after.bakes!==before.bakes||after.tileBuilds!==before.tileBuilds||after.spriteBuilds!==before.spriteBuilds)throw Error('Work added to hot rendering');
    }
    const median=a=>a.sort((a,b)=>a-b)[a.length>>1],simple=median(times.simple),textured=median(times.textured);return{map,name:MAPN[map],players:G.ps.length,simpleMs:+simple.toFixed(3),texturedMs:+textured.toFixed(3),differenceMs:+(textured-simple).toFixed(3),sameStaticResolution:buffers.simple.width===buffers.textured.width&&buffers.simple.height===buffers.textured.height};
   },map);benchmark.push(row);assert.equal(row.sameStaticResolution,true);assert.ok(Number.isFinite(row.simpleMs)&&Number.isFinite(row.texturedMs));
   if(output&&[1,2,5].includes(map))for(const detail of['simple','textured']){await page.evaluate(detail=>{SzMapMaterials.setEnabled(detail==='textured',false);draw();},detail);await page.locator('#cv').screenshot({path:path.join(output,'map-'+map+'-'+detail+'.png')});}
   await page.evaluate(()=>quit());
  }
  console.log('PASS render comparison (headless software renderer; timings are not hardware FPS): '+JSON.stringify(benchmark));
  await page.evaluate(()=>{tab('set');});await page.locator('[data-map-materials]').waitFor();await page.selectOption('[data-map-materials]','0');assert.equal(await page.evaluate(()=>SzMapMaterials.enabled()),false);
  await page.evaluate(()=>szLocale.set('en'));assert.deepEqual(await page.locator('[data-map-materials] option').allTextContents(),['Textures and shading','Simple appearance']);await page.reload();await page.waitForFunction(()=>!!window.SzMapMaterials?.enabled);assert.equal(await page.evaluate(()=>SzMapMaterials.enabled()),false);
  await page.evaluate(()=>{cloudPush=()=>{};SzMapMaterials.setEnabled(true);tab('set');});assert.equal(await page.locator('[data-map-materials]').inputValue(),'1');console.log('PASS appearance setting: PL/EN, simple fallback, persistence and re-enabling');
  assert.deepEqual(errors,[]);if(output)fs.writeFileSync(path.join(output,'materials-report.json'),JSON.stringify({method:'Headless Electron with GPU disabled; median of 9 alternating batches of 12 real draw() calls, including a raster flush. These are render costs, not real hardware FPS.',maps,workshop,benchmark,errors},null,2));completed=true;
 }finally{await app.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
