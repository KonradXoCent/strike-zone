'use strict';
const assert=require('node:assert/strict');
module.exports=async function halloweenModeNetwork(host,guest,mode){
 for(const kind of(mode==='zombie'?['zombie']:['grenade','bomb','snow','football'])){
  const setup=await host.evaluate(kind=>{G.over=false;G.paused=false;G.cheat=null;keys={};mouse.d=mouse.r=0;if(kind==='zombie'){G.t=.01;G.ph='buy';upd(.02);for(const p of G.ps.filter(p=>p.human||p.rh)){p.team='CT';p.inv=10000;p.hp=p.mh=100000;}G.ps.find(p=>!p.human&&!p.rh).team='T';G.t=1000;}
   else{SzMiniGames.beginGame(kind);G.mg.time=.01;upd(.02);G.mg.time=1000;if(kind==='bomb')G.mg.bomb.fuse=10000;}
   const remote=G.ps.find(p=>p.rh&&p.rid);for(const p of G.ps){if(!p.human){p.rh=true;p.inp={};p.lastIn=performance.now();}p.inv=10000;}if(kind==='football'){G.mg.ball=SzFootball.ball();G.me.x=160;G.me.y=416;remote.x=1120;remote.y=416;}
   netSnap();return{kind,serial:G.mg?.serial,map:sel.map};},kind);
  await guest.waitForFunction(s=>G.ph==='live'&&!G.paused&&sel.map===s.map&&(s.kind==='zombie'||G.mg?.serial===s.serial),setup);
  if(kind==='zombie'){
   const frozen=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh&&p.rid);p.team='T';p.inv=0;p.zFreeze=0;boom({type:'smoke',by:G.me,team:'CT',x:p.x,y:p.y});netSnap();return{x:p.x,y:p.y};});
   await guest.waitForFunction(()=>G.me.team==='T'&&G.me.zFreeze>2);await guest.evaluate(()=>{G.me.x=G.me.tx;G.me.y=G.me.ty;keys.d=1;});await new Promise(r=>setTimeout(r,160));
   const held=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh&&p.rid);return{x:p.x,y:p.y,frozen:p.zFreeze>0};});assert.ok(held.frozen&&Math.hypot(held.x-frozen.x,held.y-frozen.y)<1,JSON.stringify({held,frozen}));
   assert.equal(await guest.evaluate(()=>SzZombieRules.frozen(G.me,sel.mode)),true);await guest.evaluate(()=>{keys.d=0;});await host.evaluate(()=>{const p=G.ps.find(p=>p.rh&&p.rid);p.team='CT';p.inv=10000;p.zFreeze=0;netSnap();});await guest.waitForFunction(()=>G.me.team==='CT'&&!G.me.zFreeze);
   console.log('PASS replicated Zombie freeze prevents remote input and client prediction movement');
  }
  const before=await Promise.all([host.evaluate(()=>({matches:SzHalloweenData.state(P()).stats.matches,candies:SzHalloween.balance()})),guest.evaluate(()=>({matches:SzHalloweenData.state(P()).stats.matches,candies:SzHalloween.balance()}))]);
  // Fast-forward a minute through the shipped update hooks. Suppress only
  // synthetic input packets during this synchronous loop to avoid flooding
  // the real Realtime service; real movement/actions use the unmodified SDK.
  const client=await guest.evaluate(()=>{const send=netSend;netSend=()=>{};keys={};mouse.d=mouse.r=0;try{for(let i=0;i<1221;i++)clientTick(.05);SzHalloween.flush();return{seconds:SzHalloween.run().seconds,candies:SzHalloween.balance()};}finally{netSend=send;}});
  const server=await host.evaluate(()=>{for(let i=0;i<1221;i++)upd(.05);SzHalloween.flush();return{seconds:SzHalloween.run().seconds,candies:SzHalloween.balance()};});
  assert.ok(server.seconds>=60&&client.seconds>=60,JSON.stringify({kind,server,client}));assert.ok(server.candies-before[0].candies>=6);assert.ok(client.candies-before[1].candies>=6);
  await host.evaluate(kind=>{if(kind==='zombie'){G.sc.CT=3;G.sc.T=0;G.rn=3;G.t=.001;upd(.02);}else SzMiniGames.finish('CT');netSnap();},kind);
  await guest.waitForFunction(n=>SzHalloweenData.state(P()).stats.matches===n,before[1].matches+1);
  const after=await Promise.all([host.evaluate(()=>({matches:SzHalloweenData.state(P()).stats.matches,candies:SzHalloween.balance()})),guest.evaluate(()=>({matches:SzHalloweenData.state(P()).stats.matches,candies:SzHalloween.balance()}))]);assert.equal(after[0].matches,before[0].matches+1);assert.equal(after[0].candies-server.candies,45);assert.ok([30,45].includes(after[1].candies-client.candies));
  await host.evaluate(()=>{netSnap();netSnap();});assert.equal(await guest.evaluate(()=>SzHalloween.balance()),after[1].candies);
  console.log('PASS two SDK clients:',kind,'active minute, shared result, candy rewards for host/guest and duplicate-result protection');
 }
 if(mode==='zombie'){
  assert.equal(await host.evaluate(()=>sel.map===SzHalloweenMap.id&&GR.source==='zm_hallows_end'),true);assert.equal(await guest.evaluate(()=>sel.map===SzHalloweenMap.id&&GR.source==='zm_hallows_end'),true);
  const blocked=await guest.evaluate(()=>{const now=Date.now,game=G,session=NET.session;Date.now=()=>SzHalloweenData.END;try{SzHalloween.mount();const activeKept=G===game&&sel.map===SzHalloweenMap.id;netRecv({v:2,t:'start',c:roomHost().cid,to:NET.cid,sid:'expired-halloween-match',mode:'zombie',map:SzHalloweenMap.id});return activeKept&&G===game&&NET.session===session&&!mapSet('zombie').includes(SzHalloweenMap.id);}finally{Date.now=now;}});assert.equal(blocked,true);
  console.log('PASS identical Halloween cemetery on both clients; expiry blocks a new match and preserves the running match');
 }
};
