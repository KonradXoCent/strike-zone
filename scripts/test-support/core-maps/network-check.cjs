const assert=require('assert/strict'),fs=require('fs'),{load}=require('./load.cjs');
const h=load(),g=load(),host=h.w,guest=g.w,H=s=>host.eval(s),Q=s=>guest.eval(s),fixture=fs.readFileSync(__dirname+'/fixture.js','utf8');let toHost=[],toGuest=[];
const tick=()=>new Promise(r=>setTimeout(r,10));
async function run(){
 await tick();H(fixture);Q(fixture);Q('__setCoreQAUser(false)');await host.SzCoreMaps.authorize();await host.SzCoreMaps.refresh();await guest.SzCoreMaps.authorize();await guest.SzCoreMaps.refresh();
 const key='core-2-mirage',original=host.SzCoreMaps.snapshot(key);host.SzCoreMaps.load(key);host.SzCoreMaps.paint([300,300,600,300],'erase');host.SzCoreMaps.paint([500,400,12.5,100],'wood');host.SzCoreMaps.paint([700,400,12.5,100],'vent');const m=host.SzCoreMaps.draft(),d=Buffer.from(m.cells,'base64'),od=Buffer.from(original.cells,'base64');let cell=-1;for(let y=10;y<m.rows-10&&cell<0;y++)for(let x=10;x<m.cols-10&&cell<0;x++)if([0,1,-1,m.cols,-m.cols].every(n=>d[y*m.cols+x+n]===0&&od[y*m.cols+x+n]===0))cell=y*m.cols+x;assert(cell>=0);d[cell]=1;m.cells=d.toString('base64');host.__coreFixture.rows=[{map_key:key,revision:1,payload:m}];await host.SzCoreMaps.refresh();
 assert.equal(H('GRS[2].d['+cell+']'),1);assert.equal(Q('GRS[2].d['+cell+']'),0);
 H("sel.mode='tdm';sel.map=2;sel.team='CT';begin0();if(G.intro)skipIntro();G.bo=0;$('buy').style.display='none';G.paused=false;G.ph='live';G.t=99;draw();");
 const hid=H('NET.cid'),gid=Q('NET.cid'),sid='ab2c2000-1111-4000-8000-987654321000',peers={host:[{cid:hid,host:1,n:'HostQA',team:'CT'}],guest:[{cid:gid,host:0,n:'GuestQA',team:'CT'}]};
 host.__route=p=>{const data=JSON.parse(JSON.stringify(p));toGuest.push(data);guest.netRecv(data);};guest.__route=p=>{const data=JSON.parse(JSON.stringify(p));toHost.push(data);host.netRecv(data);};
 H(`L={host:true,code:'QATEST',team:'CT'};LP=${JSON.stringify(peers)};NET.host=1;NET.seq=0;NET.session=${JSON.stringify(sid)};LC={send(o){__route(o.payload);return Promise.resolve('ok');},track(){return Promise.resolve('ok')}};`);
 Q(`L={host:false,code:'QATEST',team:'CT'};LP=${JSON.stringify(peers)};NET.host=0;NET.session=${JSON.stringify(sid)};NET.hostCid=${JSON.stringify(hid)};NET.seenSeq=-1;loadScreen=cb=>cb();LC={send(o){__route(o.payload);return Promise.resolve('ok');},track(){return Promise.resolve('ok')}};`);
 H('netStartMessage()');await tick();H('netSnap()');await tick();
 assert(Q('!!G?.client'));assert.equal(Q('GR.d['+cell+']'),1);assert.equal(Q('G.ps.length'),H('G.ps.length'));assert.equal(Q('G.me.rid'),gid);
 const start=toGuest.find(p=>p.t==='start');assert(start?.coreMap.payload);assert.equal(start.coreMap.revision,1);
 assert(toGuest.filter(p=>p.t==='snap').every(p=>p.coreMap&&p.coreMap.payload===undefined));
 assert.equal(Q('SzBreakables.status().items.length'),2);assert(Q('wallAt(506,450)'));assert(Q('hitW(506,450)'));
 const firstSnapshot=toGuest.filter(p=>p.t==='snap').at(-1);assert.deepEqual(firstSnapshot.breakables.hp,[90,45]);assert.equal(firstSnapshot.world.wallExtras.some(r=>r[0]===500&&r[1]===400&&r[2]===12.5),false,'barriers are not duplicated as untyped wall extras');
 console.log('PASS guest receives the host map before collision and navigation are built; snapshots only include a small revision reference');
 Q("G.guestPresentationPending=false;G.guestPresentation=false;G.localPaused=false;G.paused=false;G.intro=false;G.bo=0;keys={d:1};");
 for(let i=0;i<10;i++){Q('clientTick(1/30)');H('upd(1/30)');if(i%3===0)H('netSnap()');}
 assert(toHost.some(p=>p.t==='in'&&p.k.d));assert(H(`G.ps.some(p=>p.rid===${JSON.stringify(gid)}&&p.inp?.d)`));
 console.log('PASS remote player occupies a host slot and player input is synchronized on the edited map');
 host.__coreFixture.rows=[{map_key:key,revision:2,payload:original}];await host.SzCoreMaps.refresh();H('netStartMessage()');assert.equal(toGuest.filter(p=>p.t==='start').at(-1).coreMap.revision,1);assert.equal(Q('GR.d['+cell+']'),1);
 console.log('PASS another guest joining a running match receives its frozen revision even after a newer map is published');
 const forged={...start,c:'forged-peer',coreMap:{...start.coreMap,payload:original}};guest.netRecv(forged);assert.equal(Q('GR.d['+cell+']'),1);assert.deepEqual(h.errors,[]);assert.deepEqual(g.errors,[]);
 console.log('PASS a non-host peer cannot replace the client map; no live Supabase writes');
 for(const E of [H,Q])E("globalThis.__breakSounds=[];const beforeBreakSound=snd;snd=function(t,...args){if(t==='breakWood'||t==='breakVent')__breakSounds.push(t);return beforeBreakSound(t,...args);};");
 H("G.ph='live';G.paused=false;G.me.x=450;G.me.y=450;G.me.a=0;G.me.cur='ak';G.me.ammo.ak=100;G.me.rl=0;for(const p of G.ps)if(p!==G.me){p.x=100;p.y=100;p.inv=999;}for(let n=0;n<6&&SzBreakables.status().items[0].hp>0;n++){G.me.cd=0;fire(G.me);}netSnap();");
 assert.equal(H('SzBreakables.status().items[0].hp'),0);assert.equal(Q('SzBreakables.status().items[0].hp'),0);assert(!Q('wallAt(506,450)'));assert(!Q('hitW(506,450)'));assert.deepEqual(JSON.parse(Q('JSON.stringify(__breakSounds)')),['breakWood']);assert.deepEqual(JSON.parse(H('JSON.stringify(__breakSounds)')),['breakWood']);
 const brokenSnap=toGuest.filter(p=>p.t==='snap').at(-1);guest.netRecv(brokenSnap);H('netSnap()');assert.equal(Q('__breakSounds.length'),1,'repeated snapshots do not replay sound');
 Q("netSend({t:'breakable_hit',id:SzBreakables.status().items[1].id,damage:99999})");assert.equal(H('SzBreakables.status().items[1].hp'),45);guest.netRecv({...brokenSnap,c:'forged-peer',seq:brokenSnap.seq+999,breakables:{round:1,hp:[0,0]}});assert.equal(Q('SzBreakables.status().items[1].hp'),45);
 H('newRound();netSnap();');assert.equal(H('SzBreakables.status().items[0].hp'),90);assert.equal(Q('SzBreakables.status().items[0].hp'),90);assert(Q('wallAt(506,450)'));assert.equal(Q('__breakSounds.length'),1,'round reset does not play breaking sound');
 console.log('PASS host-authoritative barrier HP, opened collision and navigation synchronize; sound plays once; forged damage is ignored; next-round reset is silent');
 Q('quit();__breakSounds=[];');assert(Q('!L&&!LC'),'an explicit guest exit leaves the lobby');
 H("G.ph='live';G.paused=false;G.me.x=450;G.me.y=450;G.me.a=0;G.me.cur='ak';G.me.ammo.ak=100;G.me.rl=0;for(const p of G.ps)if(p!==G.me){p.x=100;p.y=100;p.inv=999;}for(let n=0;n<6&&SzBreakables.status().items[0].hp>0;n++){G.me.cd=0;fire(G.me);}");
 Q(`L={host:false,code:'QATEST',team:'CT'};LP=${JSON.stringify(peers)};NET.host=0;NET.session=${JSON.stringify(sid)};NET.hostCid=${JSON.stringify(hid)};NET.seenSeq=-1;loadScreen=cb=>cb();LC={send(o){__route(o.payload);return Promise.resolve('ok');},track(){return Promise.resolve('ok')}};`);
 H('netStartMessage();netSnap();');assert.equal(Q('SzBreakables.status().items[0].hp'),0);assert.equal(Q('__breakSounds.length'),0,'late join is silent for barriers already broken');assert.deepEqual(h.errors,[]);assert.deepEqual(g.errors,[]);
 console.log('PASS a late join receives the current broken state without replaying historical destruction sounds');
 Q('globalThis.__retainedLobby=LC');const beforeSession=Q('NET.session');
 H("sel.map=13;sel.mode='tdm';begin0();if(G.intro)skipIntro();G.paused=false;G.ph='live';netSnap();");await tick();
 assert.notEqual(Q('NET.session'),beforeSession);assert.equal(Q('NET.session'),H('NET.session'));assert.equal(Q('sel.map'),13);assert(Q('G.client&&!G.netWaiting&&L&&!L.host&&LC===__retainedLobby&&!!roomHost()'),'automatic map changes retain the guest room and consume snapshots');assert.equal(Q('G.me.rid'),gid);
 const staleStart=toGuest.filter(p=>p.t==='start').at(-1);H('quit()');await tick();assert(Q('!G&&!L&&!LC'),'the host can end a match after the automatic map change');guest.netRecv(staleStart);assert(Q('!G&&!L'),'late start packets cannot revive a departed match');assert.deepEqual(h.errors,[]);assert.deepEqual(g.errors,[]);
 console.log('PASS automatic map/session changes preserve the lobby, new snapshots and remote slot; host end and explicit exits leave cleanly and reject late starts');
 H("sel.mode='br'");assert.equal(H('sel.mode'),'classic');assert(!H("MODES.some(m=>m[0]==='br')"));
 assert.deepEqual(h.errors,[]);assert.deepEqual(g.errors,[]);
 console.log('PASS Strike rejects legacy BR selection; plane, parachute and shared BR input are verified in the dedicated Royale SDK smoke test');


}
run().then(()=>{h.dom.window.close();g.dom.window.close();process.exit(0)}).catch(e=>{console.error(e.stack);console.error('Host errors:',h.errors,'Guest errors:',g.errors);h.dom.window.close();g.dom.window.close();process.exit(1)});
