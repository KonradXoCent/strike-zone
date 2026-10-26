'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{load}=require('./load.cjs');
const page=load(),w=page.w,Q=s=>w.eval(s),fixture=fs.readFileSync(__dirname+'/fixture.js','utf8'),json=s=>JSON.parse(Q('JSON.stringify('+s+')'));
const tick=()=>new Promise(r=>setTimeout(r,5));
async function run(){
 await tick();Q(fixture);await w.SzCoreMaps.authorize();await w.SzCoreMaps.refresh();const key='core-2-mirage';w.SzCoreMaps.load(key);
 const original=w.SzCoreMaps.draft();w.SzCoreMaps.paint([300,300,650,300],'erase');w.SzCoreMaps.paint([500,350,12.5,100],'door-wood');w.SzCoreMaps.paint([700,350,12.5,100],'door-metal');
 const draft=w.SzCoreMaps.draft();assert.equal(draft.doors.length,2);assert.equal(w.SzCoreMaps.parse(JSON.parse(JSON.stringify(draft))).doors.length,2);assert.equal(w.SzCoreMaps.check(draft).map.doors.length,2);
 for(const bad of[{...draft,doors:[{...draft.doors[0],rect:[1,2,100,100]}]},{...draft,doors:[{...draft.doors[0],material:'paper'}]},{...draft,doors:[draft.doors[0],draft.doors[0]]}])assert.throws(()=>w.SzCoreMaps.parse(bad));
 assert(w.document.querySelector('[data-tool="door-wood"]'));assert(w.document.querySelector('[data-action="test-solo"]'));
 console.log('PASS door tools, version-compatible map parsing, export roundtrip and bounded material/geometry/ID validation');
 Q('SzAgentData.state(P())');const before=json('P()');w.SzCoreMaps.beginTest(true);assert(Q('G.ps.length===1&&G.ps[0]===G.me&&G.creatorTest&&G.coreSandbox'));assert(w.document.querySelector('[data-test-noclip]'));
 Q("G.me.x=450;G.me.y=400;keys={d:1};for(let i=0;i<90;i++)upd(1/60);keys={};");assert(Q('G.me.x<500'),'closed wood door blocks the normal test player');assert(Q("hitW(506,400)&&!los({x:450,y:400},{x:550,y:400})"));
 assert(Q('SzPropData.wallCollision(GR,506,400,12)&&SzPropData.collides(GR,[],506,400,12)'), 'prop and arcade movement also honor closed doors');
 const ball=Q('(()=>{const mg=G.mg;G.mg={kind:"football"};try{const ball={x:470,y:400,vx:500,vy:0};SzMiniData.stepBall(ball,.1);return ball.vx<0&&ball.x<500;}finally{G.mg=mg;}})()');assert(ball,'football cannot cross a closed door');
 const door=json('SzDoors.status().items[0]');Q('G.me.x=455;G.me.y=400;G.me.a=0');assert(w.SzDoors.toggle(door.id,Q('G.me'),true));assert(!Q('hitW(506,400)'));assert(Q('GR.nd[Math.floor(400/GR.cs)*GR.cols+Math.floor(506/GR.cs)]===0'));
 Q('G.el+=1;G.me.x=506;G.me.y=400');assert.equal(w.SzDoors.toggle(door.id,Q('G.me'),false),false,'cannot close through a player');Q('G.me.x=455;G.me.y=400');assert(w.SzDoors.toggle(door.id,Q('G.me'),false));
 w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyN',key:'n',bubbles:true}));assert(w.SzMapSandbox.noclip());Q('keys={d:1};for(let i=0;i<21;i++)upd(1/60);keys={};');assert(Q('G.me.x>550'),'noclip crosses the closed door faster than walk speed');
 Q('G.me.x=506;G.me.y=400');w.SzMapSandbox.toggle();assert(!w.SzMapSandbox.noclip());assert(!Q('hitW(G.me.x,G.me.y)'),'switching noclip off inside geometry finds a safe position');
 Q('for(let i=0;i<600;i++)upd(1/60)');assert(Q("G.ps.length===1&&!G.over&&G.ph==='live'"),'solo test never creates opponents or ends itself');Q('draw();quit()');
 assert(w.document.getElementById('core-map-canvas'));assert.deepEqual(w.SzCoreMaps.draft(),draft);assert.deepEqual(json('P()'),before,'sandbox cannot award cash, XP, badges, stats or equipment');assert.equal(w.SzMapSandbox.noclip(),false);
 console.log('PASS solo inspection, real collision/LOS/navigation, blocked closing, N toggle, faster wall crossing, safe exit from solid geometry and zero profile progression');
 w.SzCoreMaps.beginTest();Q("if(G.intro)skipIntro();G.paused=false;G.ph='live';G.bo=0;$('buy').style.display='none';G.ps.forEach(p=>p.alive=false);G.me.alive=true;G.me.x=450;G.me.y=400;");
 assert(Q('G.ps.length>1&&!G.coreSandbox'));assert(w.SzMapSandbox.toggle());assert(w.SzMapSandbox.noclip());w.SzMapSandbox.toggle();
 // Actual gun emission: force spread and RNG only for the deterministic samples.
 Q("globalThis.__doorTarget=G.ps.find(p=>p!==G.me);globalThis.__doorRandom=Math.random;globalThis.__doorSpread=W.m4.spr;W.m4.spr=0;Object.assign(__doorTarget,{alive:true,team:'T',hp:10000,armor:0,inv:0,x:560,y:400});Object.assign(G.me,{team:'CT',cur:'m4',ammo:{m4:999},a:0,cd:0,rl:0,inv:0});Math.random=()=>0;");
 const wood=Q("const woodBefore=__doorTarget.hp;fire(G.me);woodBefore-__doorTarget.hp");assert(wood>0&&wood<20,'wood penetration heavily reduces even a forced headshot: '+wood);
 Q('G.me.cd=0;Math.random=()=>.99;');const blocked=Q('const blockedBefore=__doorTarget.hp;fire(G.me);blockedBefore-__doorTarget.hp');assert.equal(blocked,0,'most bullets stop instead of every bullet passing');
 Q('G.me.x=650;G.me.cd=0;__doorTarget.x=760;Math.random=()=>0;');const metal=Q('const metalBefore=__doorTarget.hp;fire(G.me);metalBefore-__doorTarget.hp');assert(metal>0&&metal<wood,'metal reduces damage more than wood');
 Q('Math.random=__doorRandom;W.m4.spr=__doorSpread;');const samples=Q("(()=>{const out={wood:0,metal:0};for(const [material,x]of[['wood',450],['metal',650]]){G.me.x=x;for(let i=0;i<600;i++){const shot=SzDoors.newShot(G.me,W.m4,0);if(SzDoors.scan(shot,70))out[material]++;}}return out;})()");assert(samples.wood>150&&samples.wood<350,JSON.stringify(samples));assert(samples.metal>40&&samples.metal<180&&samples.metal<samples.wood,JSON.stringify(samples));
 // A solid wall behind the door remains solid, irrespective of penetration RNG.
 Q("const cell=Math.floor(400/GR.cs)*GR.cols+Math.floor(737/GR.cs);globalThis.__doorWallCell=cell;globalThis.__doorWallOld=GR.d[cell];GR.d[cell]=1;G.me.x=650;G.me.cd=0;W.m4.spr=0;Math.random=()=>0;");const wall=Q('const wallBefore=__doorTarget.hp;fire(G.me);wallBefore-__doorTarget.hp');assert.equal(wall,0);Q('GR.d[__doorWallCell]=__doorWallOld;Math.random=__doorRandom;W.m4.spr=__doorSpread;');
 assert.equal(json('SzDoors.status().items').some(b=>'hp'in b),false,'doors never acquire destructible HP');
 Q("G.me.x=455;G.me.y=400;G.el+=1;SzDoors.toggle(SzDoors.status().items[0].id,G.me,true);newRound();");assert(json('SzDoors.status().items').every(b=>!b.open),'all doors reset closed in the next round');
 console.log('PASS real emitted shots, probabilistic wood/metal penetration, stronger metal damage loss, ordinary wall blocking, indestructibility and round reset',JSON.stringify({wood,metal,samples}));
 Q("quit();sel.mode='tdm';sel.map=2;sel.team='CT';begin0();if(G.intro)skipIntro();G.paused=false;");assert.equal(w.SzMapSandbox.toggle(),false);w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyN',key:'n',bubbles:true}));assert(!w.SzMapSandbox.noclip());Q('quit()');Q('__setCoreQAUser(false)');await w.SzCoreMaps.authorize();assert.equal(w.SzMapSandbox.toggle(),false);
 assert.deepEqual(page.errors,[]);console.log('PASS normal matches and non-owner accounts cannot activate the sandbox or noclip');
}
run().then(()=>{page.dom.window.close();process.exit(0)}).catch(e=>{console.error(e.stack);console.error(page.errors);page.dom.window.close();process.exit(1)});
