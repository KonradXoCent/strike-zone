'use strict';
const assert=require('node:assert/strict');
module.exports=async function verifyFootball(page){
 const result=await page.evaluate(()=>{
  mgBoot('football');const keeperPositions=G.ps.filter(p=>p.mgKeeper).map(p=>({team:p.team,x:p.x,y:p.y}));
  const me=G.me,mate=G.ps.find(p=>p!==me&&p.team===me.team&&!p.mgKeeper),enemy=G.ps.find(p=>p.team!==me.team&&!p.mgKeeper);
  G.ps.forEach((p,i)=>{p.x=150+i*90;p.y=110;p.a=0;});Object.assign(me,{x:400,y:416,a:0});Object.assign(mate,{x:620,y:416,a:0});Object.assign(enemy,{x:900,y:650,a:Math.PI});
  G.mg.ball={...SzFootball.ball(),x:440,y:416,vx:150};upd(.05);const x=G.mg.ball.x;me.x=300;me.a=Math.PI;mgTicks(.15);
  const free=G.mg.ball.x>x+10&&!('owner'in G.mg.ball)&&Math.hypot(G.mg.ball.x-me.x,G.mg.ball.y-me.y)>100;
  me.x=400;me.cd=0;G.mg.ball={...SzFootball.ball(),x:425,y:416};const pass=SzMiniGames.action(me,mate.x,mate.y),passSpeed=Math.hypot(G.mg.ball.vx,G.mg.ball.vy);mgTicks(1.7);
  const received=G.mg.ball.last===G.ps.indexOf(mate)&&G.mg.stats.completedPasses===1&&!('owner'in G.mg.ball);const after=G.mg.ball.x;mate.y=300;mgTicks(.2);const keepsRolling=Math.abs(G.mg.ball.x-after)>5;
  Object.assign(enemy,{x:750,y:416});G.mg.ball={...SzFootball.ball(),x:700,y:416,vx:300,last:G.ps.indexOf(me)};mgTicks(.5);const intercepted=G.mg.ball.last===G.ps.indexOf(enemy)&&G.mg.stats.interceptions===1;
  me.cd=0;G.mg.ball={...SzFootball.ball(),x:425,y:416};const shot=SzMiniGames.action(me,1000,416,true),shotSpeed=Math.hypot(G.mg.ball.vx,G.mg.ball.vy);
  mgBoot('football');const keeper=G.ps.find(p=>p.team==='CT'&&p.mgKeeper),opponent=G.ps.find(p=>p.team==='T'&&!p.mgKeeper);G.ps.forEach((p,i)=>{if(p!==keeper){p.x=300+i*50;p.y=110;}});
  G.mg.ball={...SzFootball.ball(),x:300,y:416,vx:-560,last:G.ps.indexOf(opponent)};mgTicks(1);const saved=G.mg.ball.last===G.ps.indexOf(keeper)&&G.mg.stats.saves===1&&G.mg.ball.vx>0&&G.sc.T===0;
  G.mg.ball={...SzFootball.ball(),x:1216,y:416,vx:560};upd(.05);const reset=G.mg.phase==='goal'&&G.ps.filter(p=>p.mgKeeper).every(p=>p.y===416&&p.x===(p.team==='CT'?112:1168));
  const botPass=remote=>{
   mgBoot('football');const target=remote?G.ps.find(p=>p!==G.me&&p.team==='CT'&&!p.mgKeeper):G.me,bot=G.ps.find(p=>p!==G.me&&p!==target&&p.team==='CT'&&!p.mgKeeper),other=G.ps.find(p=>p!==G.me&&p!==target&&p!==bot&&p.team==='CT'&&!p.mgKeeper);
   for(const p of G.ps){p.rh=false;p.human=p===G.me;p.x=p.team==='CT'?150:1050;p.y=110;p.mgBrain.fire=Infinity;}
   if(remote)target.rh=true;
   Object.assign(target,{x:440,y:550,inp:{},lastIn:performance.now()});Object.assign(bot,{x:500,y:416,cd:0});bot.mgBrain.fire=0;Object.assign(other,{x:650,y:270});G.mg.ball={...SzFootball.ball(),x:525,y:416};upd(.02);
   return G.mg.stats.humanPasses===1&&G.mg.ball.passFrom===G.ps.indexOf(bot)&&G.mg.ball.vx<0&&G.mg.ball.vy>0;
  };
  const localHumanPass=botPass(false),remoteHumanPass=botPass(true);quit();return{keeperPositions,free,pass,passSpeed,received,keepsRolling,intercepted,shot,shotSpeed,saved,reset,localHumanPass,remoteHumanPass};
 });
 assert.deepEqual(result.keeperPositions,[{team:'CT',x:112,y:416},{team:'T',x:1168,y:416}]);
 for(const key of['free','pass','received','keepsRolling','intercepted','shot','saved','reset','localHumanPass','remoteHumanPass'])assert.equal(result[key],true,key+': '+JSON.stringify(result));
 assert.ok(result.passSpeed>=220&&result.passSpeed<=420);assert.equal(result.shotSpeed,560);
 console.log('PASS football: centred keepers, free rolling ball after contact and reception, interceptions, stronger shots, goalkeeper deflections, and bot passes to open local and remote humans including a backpass');
};
