/* Short, cautious knife runs. The authoritative AI supplies its existing senses. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzBotTravel=api;})(globalThis,function(){
 'use strict';
 const modes=new Set(['classic','tdm','ctf']);
 function step(p,dt,c){
  if(p.human||p.rh)return;
  const s=p.knifeTravel||(p.knifeTravel={safe:0,until:0,next:0,weapon:null,hp:p.hp,danger:-100});
  const hurt=p.hp<s.hp;s.hp=p.hp;
  if(hurt||c.see||c.noise)s.danger=c.time;
  const weapon=s.weapon&&[p.pri,p.sec].includes(s.weapon)?s.weapon:p.pri||p.sec;
  const valid=p.alive&&modes.has(c.mode)&&c.phase==='live'&&weapon&&weapon!=='knife';
  const safe=valid&&!p.hold&&!p.nd&&!p.throwQueued&&!(p.rl>0)&&!(p.fl>.1)&&!(p.burn>0)&&!p.sc&&!c.see&&c.enemyDistance>520&&c.goalDistance>340&&!c.objective&&!c.corner&&!c.teamAlert&&c.time-s.danger>3&&c.ready;
  if(s.weapon){
   if(!safe||c.time>=s.until||p.cur!=='knife'){
    if(p.cur==='knife'&&weapon)p.cur=weapon;
    s.weapon=null;s.safe=0;s.next=c.time+4+(p.i%4)*.4;
   }
   return;
  }
  if(!safe||c.time<s.next||p.cur==='knife'){s.safe=0;return;}
  s.safe+=dt;
  if(s.safe<1.1+(p.i%3)*.15)return;
  s.weapon=p.cur;s.until=c.time+1.4+(p.i%4)*.2;s.safe=0;p.cur='knife';
 }
 function update(p,dt,senses){
  const game=senses.game;if(!game)return;
  const weapon=p.knifeTravel?.weapon||p.cur,w=senses.weapons[weapon],a=p.a||0;
  const corner=[[-.4,85],[.4,85],[0,120]].some(([da,d])=>senses.blocked(p.x+Math.cos(a+da)*d,p.y+Math.sin(a+da)*d));
  const noise=game.tr.some(q=>!q.r&&q.t<.15&&Math.min(Math.hypot(q.x-p.x,q.y-p.y),Math.hypot(q.x2-p.x,q.y2-p.y))<230);
  const alert=game.seen?.[p.team];
  step(p,dt,{time:game.el||0,mode:senses.mode,phase:game.ph,see:senses.see,enemyDistance:senses.distance,
   goalDistance:Math.hypot(senses.gx-p.x,senses.gy-p.y),corner,noise,teamAlert:!!alert&&(game.el-alert.t)<3,
   objective:!!game.bomb||!!p.pl||!!p.df||senses.goal===1&&Math.hypot(senses.gx-p.x,senses.gy-p.y)<420,
   ready:!!w&&(!w.mag||(p.ammo[weapon]||0)>=w.mag*.5)});
 }
 return{step,update};
});
