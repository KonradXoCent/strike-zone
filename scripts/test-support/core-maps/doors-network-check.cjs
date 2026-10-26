'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{load}=require('./load.cjs');
const a=load(),b=load(),h=a.w,g=b.w,H=s=>h.eval(s),Q=s=>g.eval(s),fixture=fs.readFileSync(__dirname+'/fixture.js','utf8'),copy=v=>JSON.parse(JSON.stringify(v));let sent=[];
const tick=()=>new Promise(r=>setTimeout(r,5));
async function run(){
 await tick();H(fixture);Q(fixture);Q('__setCoreQAUser(false)');await h.SzCoreMaps.authorize();await g.SzCoreMaps.authorize();await h.SzCoreMaps.refresh();await g.SzCoreMaps.refresh();
 const key='core-2-mirage';h.SzCoreMaps.load(key);h.SzCoreMaps.paint([300,300,650,300],'erase');h.SzCoreMaps.paint([500,350,12.5,100],'door-wood');h.SzCoreMaps.paint([700,350,12.5,100],'door-metal');h.SzCoreMaps.paint([820,350,12.5,100],'wood');
 const document=h.SzCoreMaps.draft();h.__coreFixture.rows=[{map_key:key,revision:1,payload:document}];await h.SzCoreMaps.refresh();
 H("sel.mode='tdm';sel.map=2;sel.team='CT';begin0();if(G.intro)skipIntro();G.bo=0;G.ph='live';G.t=900;G.paused=false;");
 const hid=H('NET.cid'),gid=Q('NET.cid'),sid='33000000-1111-4111-8111-111111111111',peers={host:[{cid:hid,host:1,team:'CT',n:'Host'}],guest:[{cid:gid,host:0,team:'CT',n:'Guest'}]};
 h.__route=p=>{const m=copy(p);sent.push(m);g.netRecv(m);};g.__route=p=>h.netRecv(copy(p));
 const route=()=>{H('L={host:true,code:"DOORS",team:"CT"};LP='+JSON.stringify(peers)+';NET.host=1;NET.session="'+sid+'";NET.seq=0;LC={send(o){__route(o.payload);return Promise.resolve("ok")},track(){return Promise.resolve("ok")}};');Q('L={host:false,code:"DOORS",team:"CT"};LP='+JSON.stringify(peers)+';NET.host=0;NET.session="'+sid+'";NET.hostCid="'+hid+'";NET.seenSeq=-1;loadScreen=cb=>cb();LC={send(o){__route(o.payload);return Promise.resolve("ok")},track(){return Promise.resolve("ok")}};');};
 route();H('netStartMessage();netSnap()');await tick();assert(Q('G.client&&!G.netWaiting'));assert.equal(g.SzDoors.status().items.length,2);
 for(const E of[H,Q])E("globalThis.__doorSounds=[];const priorDoorSound=snd;snd=function(type,...args){if(/^door/.test(type))__doorSounds.push(type);return priorDoorSound(type,...args);};");
 H("G.ps.forEach(p=>{p.alive=false;});G.me.alive=true;G.me.x=450;G.me.y=520;const remote=G.ps.find(p=>p.rh);Object.assign(remote,{alive:true,hp:100,x:450,y:400,ap:0});netSnap();");Q("G.guestPresentation=false;G.guestPresentationPending=false;G.localPaused=false;G.paused=false;");
 assert(Q('wallAt(506,400)&&hitW(506,400)&&wallAt(826,400)'));
 assert(g.SzDoors.use(Q('G.me')));await tick();assert(h.SzDoors.status().items[0].open);assert(g.SzDoors.status().items[0].open);assert(!Q('wallAt(506,400)'));assert(Q('wallAt(826,400)'),'opening a door preserves the live wooden barrier');
 assert.equal(Q('__doorSounds.length'),1);assert.equal(H('__doorSounds.length'),1);H('netSnap();netSnap()');assert.equal(Q('__doorSounds.length'),1);
 const snapshot=sent.filter(m=>m.t==='snap').at(-1);assert(snapshot.doors.open[0]===1);assert.equal(snapshot.world.wallExtras.some(r=>r[0]===500&&r[1]===350),false,'managed doors are not duplicated as network wall extras');
 assert.equal(Q('GR.nd[Math.floor(400/GR.cs)*GR.cols+Math.floor(506/GR.cs)]'),0);assert.equal(Q('GR.nd[Math.floor(400/GR.cs)*GR.cols+Math.floor(826/GR.cs)]'),1);
 console.log('PASS host-validated guest E/open request, collision/LOS/nav replication, composited barrier navigation, one sound per transition and small snapshots');
 const metal=h.SzDoors.status().items[1].id;
 Q('netSend({t:"door_use",id:"'+metal+'",open:true})');assert.equal(h.SzDoors.status().items[1].open,false,'distant real guests cannot operate doors');h.hostRecv({t:'door_use',c:'forged',sid,id:metal,open:true});assert.equal(h.SzDoors.status().items[1].open,false);
 g.netRecv({...snapshot,c:gid,seq:snapshot.seq+1000,doors:{round:1,seq:1000,open:[0,1]}});assert(g.SzDoors.status().items[0].open);assert(!g.SzDoors.status().items[1].open);assert.equal(g.SzMapSandbox.toggle(),false);
 H('newRound();netSnap()');assert(h.SzDoors.status().items.every(b=>!b.open));assert(g.SzDoors.status().items.every(b=>!b.open));assert.equal(Q('__doorSounds.length'),1,'round resets are silent');
 console.log('PASS rejected remote-distance requests, forged snapshots and noclip attempts; doors reset closed and silently at the next round');
 H("G.ph='live';G.paused=false;G.el+=1;for(const p of G.ps){p.alive=false;}G.me.alive=true;G.me.x=450;G.me.y=520;const bot=G.ps.find(p=>p!==G.me&&!p.rh);Object.assign(bot,{alive:true,x:450,y:400,ap:0,human:false,rh:false,pth:null});navStep(bot,560,400,1/30);netSnap();");assert(h.SzDoors.status().items[0].open,'a bot opens a closed door on a clear approach');
 H('draw()');const bakes=h.SzMapDepth.stats().bakes;H('for(let i=0;i<10;i++){SzDoors.tick(.03);draw();}');assert.equal(h.SzMapDepth.stats().bakes,bakes,'door animation does not rebuild the static 2.5D map');
 Q('quit();__doorSounds=[]');H("for(const p of G.ps)if(!p.human)Object.assign(p,{alive:true,hp:100,x:450,y:500});");route();H('netStartMessage();netSnap()');await tick();assert(g.SzDoors.status().items[0].open);assert.equal(Q('__doorSounds.length'),0,'a late join restores open doors silently');assert(!Q('wallAt(506,400)'));
 // Distinct synthesized wood/metal spectra, spatial output and mute.
 H("globalThis.__doorAudio=[];const node=()=>({connect(){},gain:{value:0,setValueAtTime(v){__doorAudio.push(['gain',v])},exponentialRampToValueAtTime(){}},frequency:{value:0,setValueAtTime(v){__doorAudio.push(['frequency',v])},exponentialRampToValueAtTime(){}},Q:{value:0},pan:{set value(v){__doorAudio.push(['pan',v])}},start(){},stop(){}});AC={state:'running',currentTime:1,destination:{},createGain:node,createStereoPanner:node,createBufferSource:node,createBiquadFilter:node,createOscillator:node};NB={};MUTE=false;ST_().sfx=1;");
 const wood=H('snd("doorWoodOpen",490,400);JSON.stringify(__doorAudio)');H('__doorAudio=[]');const steel=H('snd("doorMetalOpen",490,400);JSON.stringify(__doorAudio)');assert.notEqual(wood,steel);H('__doorAudio=[];MUTE=true;snd("doorWoodClose",490,400);');assert.equal(H('__doorAudio.length'),0);
 assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);console.log('PASS bot opening, cached animated rendering, silent late join and distinct spatial wood/metal audio with mute');
}
run().then(()=>{a.dom.window.close();b.dom.window.close();process.exit(0)}).catch(e=>{console.error(e.stack);console.error(a.errors,b.errors);a.dom.window.close();b.dom.window.close();process.exit(1)});
