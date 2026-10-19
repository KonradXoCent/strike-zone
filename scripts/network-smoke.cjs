/* Two real Electron clients and the shipped Supabase SDK. SZ_LIVE_REALTIME=1
   uses the actual public Realtime endpoint; account/database writes stay isolated. */
const {_electron}=require('playwright-core'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {startPresenceFixture}=require('./test-support/presence-fixture.cjs');
const repo=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sz-network-')),live=process.env.SZ_LIVE_REALTIME==='1';
let finished=false;process.on('beforeExit',()=>{if(!finished&&!process.exitCode)process.exitCode=1;});
(async()=>{
 const broker=live?null:await startPresenceFixture();
 // Keep the production translation API used by the server browser, while
 // omitting account/chat integrations which are outside this transport fixture.
 const locale=['locale-data.js','locale.js'].map(file=>'<script>'+fs.readFileSync(repo+'/shared/'+file,'utf8').replace(/<\/script/gi,'<\\/script')+'</script>').join('\n')+'<script>window.szLocale=SzI18n.create("pl").mount();</script>';
 let html=fs.readFileSync(repo+'/game-source/index.html','utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^\"]+"><\/script>/,'<script src="supabase.js"></script>').replace('\nsbInit();','\n// Authentication is isolated in this transport test.').replace(/<!-- SZ SHARED UI START -->[\s\S]*?<!-- SZ SHARED UI END -->/,()=>locale);
 fs.copyFileSync(repo+'/node_modules/@supabase/supabase-js/dist/umd/supabase.js',tmp+'/supabase.js');fs.writeFileSync(tmp+'/index.html',html);fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));fs.writeFileSync(tmp+'/main.cjs',`const{app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(tmp+'/profile')});app.whenReady().then(()=>{for(let i=0;i<2;i++){const w=new BrowserWindow({width:1200,height:800,webPreferences:{partition:'network-'+i,backgroundThrottling:false}});w.loadFile(${JSON.stringify(tmp+'/index.html')});}});`);
 const args=[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu'];if(live&&process.env.HTTPS_PROXY)args.push('--proxy-server='+process.env.HTTPS_PROXY,'--ignore-certificate-errors');
 const app=await _electron.launch({executablePath:require('electron'),args}),errors=[],servers=new Map(),results=[];
 try{let pages=app.windows();while(pages.length<2){await new Promise(r=>setTimeout(r,30));pages=app.windows();}const[host,guest]=pages;
  for(let i=0;i<2;i++){const p=pages[i];p.on('pageerror',e=>{errors.push(e.message);console.log('CLIENT ERROR',i,e.message);});await p.waitForFunction(()=>typeof roomHost==='function'&&window.supabase?.createClient&&window.szLocale?.mapNameHTML);
   await p.exposeFunction('__serverDB',({op,data,id})=>{if(op==='upsert'){assert.equal(data.owner,`10000000-0000-4000-8000-00000000000${i+1}`);servers.set(data.id,data);return {data:[data],error:null};}if(op==='delete'){if(servers.get(id)?.owner===`10000000-0000-4000-8000-00000000000${i+1}`)servers.delete(id);return{data:[],error:null};}return{data:[...servers.values()],error:null};});
   await p.evaluate(({i,url})=>{szLocale.set(i?'en':'pl');cloudPush=()=>{};lbPush=()=>{};SBU={id:`10000000-0000-4000-8000-00000000000${i+1}`,email:'qa@example.test'};P().name=i?'GuestQA':'HostQA';P().wallet=100000;sb=supabase.createClient(url||SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:30}}});
    sb.from=table=>{let op='select',data,id;const q={select(){return this;},gt(){return this;},eq(k,v){if(k==='id')id=v;return this;},upsert(v){op='upsert';data=v;return this;},delete(){op='delete';return this;},then(a,b){return(table==='servers'?window.__serverDB({op,data,id}):Promise.resolve({data:[],error:null})).then(a,b);}};return q;};
    const render=draw;let rendered=0;draw=function(){const now=performance.now();if(now-rendered<100)return;rendered=now;render();};start=function(){sel.team=L.team;begin0();if(G.intro)skipIntro();};SV.init=1;SV.db=1;SV.bots=[];
   },{i,url:broker?.endpoint?.replace(/^ws/,'http')||null});
   if(broker)await p.evaluate(endpoint=>{sb.realtime.endPoint=endpoint;},broker.endpoint);
  }
  const modes=(process.env.SZ_NETWORK_MODES?.split(',')||['tdm','classic','ctf','dm','gungame','retake','br','zombie','coop','snipers','deagle','pistols','shotguns','knife']);
  for(const entry of ['code','server']){
   for(const mode of modes){console.log('RUN',entry,mode);
    await host.evaluate(mode=>{sel.mode=mode;sel.map=mode==='br'?6:mode==='zombie'?9:2;sel.team='CT';sel.comp=false;},mode);await guest.evaluate(()=>{sel.team='T';});
    if(entry==='code'){await host.evaluate(()=>mkLobby());const code=await host.evaluate(()=>L?.code);assert.ok(code);await guest.evaluate(c=>mkLobby(c),code);}
    else{await host.evaluate(()=>{T='srv';srvRender();$('sm').value=sel.mode;$('sp').value=String(sel.map);$('sn').value='QA isolated server';});await host.evaluate(()=>mkServer());await host.waitForFunction(()=>!!SV.own);await host.evaluate(()=>pubSrv());
     
     // Joining one's own listing must retain the host role and code.
     await host.evaluate(async()=>{SV.ps=(await sb.from('servers').select('*')).data;T='srv';srvRender();return joinSrv(SV.list.findIndex(s=>!s.bot));});assert.equal(await host.evaluate(()=>L.host),true);await host.evaluate(()=>lobStart());await guest.evaluate(async()=>{T='srv';SV.ps=(await sb.from('servers').select('*')).data;srvRender();});assert.equal(await guest.evaluate(()=>SV.list.filter(s=>!s.bot).length),1);await guest.evaluate(()=>joinSrv(SV.list.findIndex(s=>!s.bot)));
    }
    await host.waitForFunction(()=>lobPeers().length===2,{timeout:15000});await guest.waitForFunction(()=>!!roomHost(),{timeout:15000});await guest.evaluate(()=>lobTeam('T'));await host.waitForFunction(()=>lobPeers().some(p=>!p.host&&p.team==='T'));await host.evaluate(()=>{if(!G)lobStart();});try{await guest.waitForFunction(()=>G?.client&&!G.netWaiting&&G.me.rid===NET.cid,null,{timeout:45000});}catch(e){for(const [j,p]of pages.entries())console.log('STATE',j,await p.evaluate(()=>({mode:sel.mode,lobby:L,host:roomHost(),net:{...NET,iv1:!!NET.iv1,iv2:!!NET.iv2},game:G?{client:G.client,waiting:G.netWaiting,phase:G.ph,count:G.ps.length,remote:G.ps.filter(p=>p.rh).length,me:G.me.rid}:null,looping,age:performance.now()-last})));console.log('ERRORS',errors);throw e;}
    const hs=await host.evaluate(()=>({sid:NET.session,mode:sel.mode,remote:G.ps.filter(p=>p.rh).length,count:G.ps.length})),gs=await guest.evaluate(()=>({sid:NET.session,mode:sel.mode,count:G.ps.length}));assert.equal(hs.sid,gs.sid);assert.equal(hs.mode,mode);assert.equal(gs.mode,mode);assert.equal(hs.remote,1);assert.equal(hs.count,gs.count);
    if(mode==='classic'){await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);G.paused=true;p.bomb=true;p.pl=1.3;netSnap();});await guest.waitForFunction(()=>G.me.bomb&&Math.abs(G.me.pl-1.3)<.1);assert.equal(await guest.evaluate(()=>{draw();return true;}),true);console.log('PASS remote bomb carrier renders planting progress');}
    if(mode==='tdm'){
     await host.evaluate(()=>{G.ph='live';G.t=500;G.ps.forEach(p=>{if(!p.human&&!p.rh)p.alive=false;});});const team=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);return {team:p.team,money:p.money,alive:p.alive};});console.log('purchase before',team);const weapon=team.team==='T'?'ak':'m4';await host.waitForFunction(k=>G.ps.some(p=>p.rh&&p.money>=W[k].cost),weapon);await guest.evaluate(k=>buy(G.me,k),weapon);await host.waitForFunction(k=>G.ps.some(p=>p.rh&&p.pri===k),weapon);
     const before=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);for(let y=100;y<WH-100;y+=20)for(let x=100;x<WW-250;x+=20)if(Array.from({length:12},(_,i)=>!hitW(x+i*10,y)).every(Boolean)){p.x=x;p.y=y;p.inv=10;netSnap();return x;}throw new Error('No movement fixture');});await guest.evaluate(()=>{keys.d=1;});try{await host.waitForFunction(x=>G.ps.find(p=>p.rh).x>x+8,before,{timeout:10000});}catch(e){console.log('movement debug',await host.evaluate(()=>({phase:G.ph,paused:G.paused,p:G.ps.filter(p=>p.rh).map(p=>({x:p.x,y:p.y,alive:p.alive,inp:p.inp,lastIn:p.lastIn})),sid:NET.session})),await guest.evaluate(()=>({phase:G.ph,paused:G.paused,keys,waiting:G.netWaiting,lastSnap:performance.now()-NET.lastSnap,alive:G.me.alive})));throw e;}await guest.evaluate(()=>{keys.d=0;});
     await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);p.hp=30;p.armor=0;p.inv=0;dmg(p,1000,G.me,'AK-47');netSnap();});await guest.waitForFunction(()=>!G.me.alive);assert.equal(await guest.evaluate(()=>G.sc.CT),await host.evaluate(()=>G.sc.CT));
    }
    results.push({entry,mode,sameSession:true,players:hs.count});console.log('PASS actual SDK',live?'LIVE':'local',entry,mode);await host.evaluate(()=>quit());await guest.waitForFunction(()=>!G);await guest.evaluate(()=>lobLeave());await host.evaluate(()=>lobLeave());
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(process.env.SZ_NETWORK_REPORT||repo+'/network-report.json',JSON.stringify({transport:live?'Supabase production Realtime':'local Phoenix fixture',database:'isolated server-list fixture; production accounts and saves untouched',results,errors},null,2));finished=true;
 }finally{await app.close();await broker?.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
