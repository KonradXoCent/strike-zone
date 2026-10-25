const assert=require('node:assert/strict');
module.exports=async function(host,guest,mode){
 await host.evaluate(()=>{G.paused=true;G.over=false;G.obj.phase='live';G.ph='live';G.t=300;for(const p of G.ps){if(!p.human&&!p.rh){p.alive=false;p.rsp=1e9;}else{p.hp=p.mh=100;p.inv=1000;}}netSnap();});
 await guest.waitForFunction(()=>!!G.obj&&G.obj.kind===sel.mode);
 assert.equal(await guest.evaluate(()=>sel.map),await host.evaluate(()=>sel.map));assert.equal(await guest.evaluate(()=>G.obj.kind),mode);
 const before=await host.evaluate(()=>JSON.stringify(G.obj));await guest.evaluate(()=>LC.send({type:'broadcast',event:'g',payload:{v:2,t:'snap',c:NET.cid,sid:NET.session,seq:999999,objective:{kind:sel.mode,result:'T',wave:999,bags:[],zones:[]},sc:{CT:999,T:999}}}));
 await host.evaluate(()=>netSnap());assert.equal(await host.evaluate(()=>JSON.stringify(G.obj)),before);
 if(mode==='domination'){
  await host.evaluate(()=>{const z=G.obj.zones[0],p=G.ps.find(p=>p.rh);Object.assign(p,{x:z.x,y:z.y});Object.assign(G.me,{x:160,y:512});for(let i=0;i<190;i++)SzObjectiveModes.postCombat(.05);netSnap();});await guest.waitForFunction(()=>G.obj.zones[0].owner==='T'&&G.me.objCaptures===1&&G.sc.T>0);
  await host.evaluate(()=>{const z=G.obj.zones[0];Object.assign(G.me,{x:z.x,y:z.y});SzObjectiveModes.postCombat(.05);netSnap();});await guest.waitForFunction(()=>G.obj.zones[0].contested);console.log('PASS shared Domination capture, personal stats and contested zone');
 }else if(mode==='heist'){
  await host.evaluate(()=>{const b=G.obj.bags[0],p=G.ps.find(p=>p.rh);Object.assign(p,{x:b.x,y:b.y});G.me.x=160;G.me.y=160;for(let i=0;i<22;i++)SzObjectiveModes.postCombat(.05);netSnap();});await guest.waitForFunction(()=>G.obj.bags[0].carrier===G.ps.indexOf(G.me));
  await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);p.x=1376;p.y=512;for(let i=0;i<62;i++)SzObjectiveModes.postCombat(.05);netSnap();});await guest.waitForFunction(()=>G.sc.T===1&&G.me.objDeliveries===1&&G.obj.bags[0].delivered);console.log('PASS shared Heist guest pickup, extraction and personal delivery credit');
 }else{
  assert.equal(await guest.evaluate(()=>G.me.team),'CT');assert.equal(await host.evaluate(()=>G.ps.filter(p=>p.team==='T'&&p.rh).length),0);
  await host.evaluate(()=>{G.obj.phase='prep';G.ph='buy';G.t=16;G.nobuy=0;const p=G.ps.find(p=>p.rh);p.money=16000;netSnap();});await guest.waitForFunction(()=>G.ph==='buy'&&G.me.money===16000);await guest.evaluate(()=>buy(G.me,'awp'));await host.waitForFunction(()=>G.ps.some(p=>p.rh&&p.pri==='awp'));
  await host.evaluate(()=>{G.paused=false;G.t=.01;upd(.02);G.paused=true;for(let i=0;i<10;i++)SzObjectiveModes.postCombat(.05);netSnap();});await guest.waitForFunction(()=>G.obj.phase==='live'&&G.obj.wave===1&&G.ps.some(p=>p.team==='T'&&p.alive));assert.equal(await guest.evaluate(()=>G.obj.remaining),await host.evaluate(()=>G.obj.remaining));console.log('PASS shared Wave Survival CT-only guest, prep buy, wave spawn and authoritative queue');
 }
 // Match result arrives once and retries do not duplicate wallet/match rewards.
 const wallet=await guest.evaluate(()=>P().wallet),matches=await guest.evaluate(()=>P().matches);await host.evaluate(mode=>{SzObjectiveModes.finish(mode==='survival'?'CT':'T');netSnap();},mode);await guest.waitForFunction(()=>G.over&&G.objRewarded&&!!document.querySelector('.om-result'));assert.ok(await guest.evaluate(()=>P().wallet)>=wallet+350);const rewardedWallet=await guest.evaluate(()=>P().wallet);assert.equal(await guest.evaluate(()=>P().matches),matches+1);await host.evaluate(()=>{netSnap();netSnap();});await guest.waitForTimeout(120);assert.equal(await guest.evaluate(()=>P().wallet),rewardedWallet);
 await host.evaluate(()=>{G.over=false;G.obj.result=null;G.obj.phase='live';G.ph='live';netSnap();});await guest.evaluate(()=>{G.over=false;$('ov').style.display='none';});
 console.log('PASS objective SDK',mode,'same map/objectives, rejected forged snapshot and single result reward');
};
