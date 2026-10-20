'use strict';
const assert=require('node:assert/strict');
module.exports=async function verifyFootball(page){
 const result=await page.evaluate(()=>{
  mgBoot('football');const keeperPositions=G.ps.filter(p=>p.mgKeeper).map(p=>({team:p.team,x:p.x,y:p.y}));
  const me=G.me,mate=G.ps.find(p=>p!==me&&p.team===me.team&&!p.mgKeeper),enemy=G.ps.find(p=>p.team!==me.team&&!p.mgKeeper);
  G.ps.forEach((p,i)=>{p.x=150+i*90;p.y=110;p.a=0;});Object.assign(me,{x:400,y:416,a:0});Object.assign(mate,{x:620,y:416,a:0});Object.assign(enemy,{x:900,y:650,a:Math.PI});
  mouse.x=(800-cam.x)*VIEW_ZOOM;mouse.y=(416-cam.y)*VIEW_ZOOM;G.mg.ball={...SzFootball.ball(),x:420,y:416};upd(.02);
  const pickup=G.mg.ball.owner===G.ps.indexOf(me);keys.d=1;const start=me.x;mgTicks(.25);keys={};const dribble=G.mg.ball.owner===G.ps.indexOf(me)&&me.x>start+30&&Math.abs(Math.hypot(G.mg.ball.x-me.x,G.mg.ball.y-me.y)-26)<.01;
  const pass=SzMiniGames.action(me,mate.x,mate.y);const passSpeed=Math.hypot(G.mg.ball.vx,G.mg.ball.vy);mgTicks(2);const received=G.mg.ball.owner===G.ps.indexOf(mate)&&G.mg.stats.completedPasses===1;
  Object.assign(me,{x:mate.x+44,y:mate.y});mgTicks(.7);const allyCannotTake=G.mg.ball.owner===G.ps.indexOf(mate);
  me.y-=100;Object.assign(enemy,{x:mate.x+44,y:mate.y});mgTicks(.05);const stolen=G.mg.ball.owner===G.ps.indexOf(enemy)&&G.mg.stats.tackles===1,immunity=G.mg.ball.tackleAfter>G.el,blockedKick=!SzMiniGames.action(mate,enemy.x+100,enemy.y,true);
  mgBoot('football');const keeper=G.ps.find(p=>p.team==='CT'&&p.mgKeeper),opponent=G.ps.find(p=>p.team==='T'&&!p.mgKeeper);G.ps.forEach((p,i)=>{if(p!==keeper){p.x=300+i*50;p.y=110;}});
  G.mg.ball={...SzFootball.ball(),x:300,y:416,vx:-480,last:G.ps.indexOf(opponent)};mgTicks(1);const saved=G.mg.ball.owner===G.ps.indexOf(keeper)&&G.mg.stats.saves===1&&G.sc.T===0;
  G.mg.ball={...SzFootball.ball(),x:1216,y:416,vx:480};upd(.05);const reset=G.mg.phase==='goal'&&G.mg.ball.owner===-1&&G.ps.filter(p=>p.mgKeeper).every(p=>p.y===416&&p.x===(p.team==='CT'?112:1168));
  quit();return{keeperPositions,pickup,dribble,pass,passSpeed,received,allyCannotTake,stolen,immunity,blockedKick,saved,reset};
 });
 assert.deepEqual(result.keeperPositions,[{team:'CT',x:112,y:416},{team:'T',x:1168,y:416}]);
 for(const key of['pickup','dribble','pass','received','allyCannotTake','stolen','immunity','blockedKick','saved','reset'])assert.equal(result[key],true,key+': '+JSON.stringify(result));
 assert.ok(result.passSpeed>=220&&result.passSpeed<=420);
 console.log('PASS football: centred keepers at kickoff and after a goal, possession, movement with the ball, shorter passes, ally reception, opposing tackle, anti-rebound lock and goalkeeper catch');
};
