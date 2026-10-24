'use strict';const assert=require('node:assert/strict');
module.exports=async function verifyReplayNetwork(host,guest){
 const scored=await host.evaluate(()=>{const p=G.ps.find(p=>p.rid&&p.rh),team=p.team;G.mg.phase='live';G.ph='live';G.mg.time=0;G.paused=false;G.over=false;G.sc={CT:0,T:0};G.mg.goalReplay=null;SzFootballReplay.reset();for(const [i,q]of G.ps.entries()){q.x=600+i*40;q.y=110;q.mgBrain.fire=Infinity;q.mgBrain.sense=Infinity;q.mgBrain.goal=null;q.inp={};q.lastIn=performance.now();}p.x=team==='CT'?950:330;p.y=416;G.mg.ball={...SzFootball.ball(),x:p.x+(team==='CT'?25:-25),y:416};for(let i=0;i<30;i++)upd(.05);p.cd=0;const prior=p.mgStats.goals;SzFootball.kick(p,team==='CT'?1280:0,416,true);for(let i=0;i<100&&G.mg.phase==='live';i++)upd(.02);netSnap();return{team,prior,id:G.mg.goalReplay.id,scorer:G.ps.indexOf(p),goals:p.mgStats.goals,frames:SzFootballReplay.clip()?.frames.length,bytes:JSON.stringify(SzFootballReplay.clip()).length,snapshotHasFrames:JSON.stringify(SzMiniGames.snapshot()).includes('"frames"')};});
 assert.equal(scored.goals,scored.prior+1);assert(scored.frames>4);assert(scored.bytes<16000);assert.equal(scored.snapshotHasFrames,false);
 await guest.waitForFunction(q=>G.mg.phase==='goal'&&G.sc[q.team]===1&&G.me.mgStats.goals===q.prior+1,scored);
 await guest.waitForFunction(id=>SzFootballReplay.clip()?.id===id,scored.id);
 const unchanged=await host.evaluate(()=>JSON.stringify({sc:G.sc,stats:G.ps.map(p=>p.mgStats)}));
 await guest.evaluate(()=>netSend({t:'mg_replay',clip:{id:'forged',serial:G.mg.serial,score:{CT:999,T:999},frames:[]}}));
 assert.equal(await host.evaluate(()=>JSON.stringify({sc:G.sc,stats:G.ps.map(p=>p.mgStats)})),unchanged);
 await guest.evaluate(()=>{SzFootballReplay.reset();SzFootballReplay.render();});
 await guest.waitForFunction(id=>SzFootballReplay.clip()?.id===id,scored.id);
 assert.equal(await guest.evaluate(()=>G.me.mgStats.goals),scored.prior+1);
 await guest.evaluate(()=>{SzFootballReplay.skip();keys.tab=1;draw();SzArcadeUI.update(true);});
 assert.equal(await guest.locator('#sz-arcade-board [data-arcade-player="'+scored.scorer+'"] [data-arcade-stat=goals]').innerText(),String(scored.prior+1));await guest.evaluate(()=>{keys.tab=0;SzArcadeUI.update(true);});
 assert.equal(await host.evaluate(()=>JSON.stringify({sc:G.sc,stats:G.ps.map(p=>p.mgStats)})),unchanged);
 console.log('PASS actual SDK football goals credit the remote scorer, replay clips arrive/recover once, snapshots contain no frames, forged clips cannot change scores, and the remote table shows the goal');
};
