/* Shared football rules: a free ball, deliberate passes and fixed goalkeeper roles. */
(function(root){'use strict';
 const A=SzMiniGames,D=SzMiniData,F=D.FOOTBALL;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),index=p=>G.ps.indexOf(p),players=()=>G.ps.filter(p=>p.alive),human=p=>!!(p.human||p.rh);
 function ball(){return{x:D.WIDTH/2,y:D.HEIGHT/2,vx:0,vy:0,last:-1,previous:-1,releaseUntil:0,kickUntil:0,passFrom:-1};}
 function assignRoles(){for(const team of['CT','T']){const peers=G.ps.filter(p=>(p.mgHomeTeam||p.team)===team);peers.forEach((p,i)=>{p.mgKeeper=i===peers.length-1;p.mgPitchRole=i;});}}
 function spawnPoint(p){const own=(p.mgHomeTeam||p.team)==='CT',formation=[[360,320],[260,180],[360,512],[260,652]],point=p.mgKeeper?[F.keeperX,D.HEIGHT/2]:formation[(p.mgPitchRole||0)%4];return{x:own?point[0]:D.WIDTH-point[0],y:point[1]};}
 function ownGoalRisk(p,x,y){const b=G.mg.ball,a=Math.atan2(y-b.y,x-b.x),sample={x:b.x,y:b.y,vx:Math.cos(a)*F.kickSpeed,vy:Math.sin(a)*F.kickSpeed};for(let i=0;i<66;i++){const goal=D.stepBall(sample,1/30);if(goal)return goal!==p.team;}return false;}
 function kick(p,x,y,shot=false){const m=G.mg,b=m.ball;if(G.client||G.paused||G.over||m.phase!=='live'||!p.alive||p.cd>0||distance(p,b)>F.kickRange||(b.kickUntil||0)>G.el)return false;
  if(!human(p)&&ownGoalRisk(p,x,y)){const direction=p.team==='CT'?1:-1;x=D.clamp(b.x+direction*300,55,D.WIDTH-55);y=D.clamp(b.y+(b.y>D.HEIGHT/2?110:-110),110,D.HEIGHT-110);shot=false;}
  const receiver=!shot?players().filter(q=>q!==p&&q.team===p.team&&distance(q,{x,y})<44&&distance(p,q)<350).sort((a,c)=>distance(a,{x,y})-distance(c,{x,y}))[0]:null;
  const origin=human(p)?p:b,a=Math.atan2(y-origin.y,x-origin.x),speed=F.kickSpeed;p.a=a;
  b.previous=b.last=index(p);b.releaseUntil=G.el+.18;b.kickUntil=G.el+F.ballCooldown;b.passFrom=shot?-1:index(p);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;p.cd=F.kickCooldown;
  m.stats.kicks=(m.stats.kicks||0)+1;if(shot)m.stats.shots=(m.stats.shots||0)+1;else{m.stats.passes++;if(receiver){p.mgBrain.lastPassTo=index(receiver);p.mgBrain.lastPassAt=G.el;if(!human(p)&&human(receiver))m.stats.humanPasses=(m.stats.humanPasses||0)+1;}}
  snd('step',p.x,p.y);return true;
 }
 function contact(p){const m=G.mg,b=m.ball,last=G.ps[b.last],from=G.ps[b.passFrom],speed=Math.hypot(b.vx,b.vy);let nx=b.x-p.x,ny=b.y-p.y,n=Math.hypot(nx,ny);
  if(n<.01){nx=speed?-b.vx/speed:Math.cos(p.a);ny=speed?-b.vy/speed:Math.sin(p.a);}else{nx/=n;ny/=n;}
  m.stats.contacts=(m.stats.contacts||0)+1;
  if(from&&from!==p&&from.team===p.team){m.stats.completedPasses=(m.stats.completedPasses||0)+1;if(human(p))m.stats.completedHumanPasses=(m.stats.completedHumanPasses||0)+1;}
  if(last&&last!==p&&last.team!==p.team){m.stats.interceptions=(m.stats.interceptions||0)+1;if(p.mgKeeper&&speed>160)m.stats.saves=(m.stats.saves||0)+1;}
  b.passFrom=-1;b.previous=b.last=index(p);b.releaseUntil=G.el+.07;
  b.x=D.clamp(p.x+nx*26,60,D.WIDTH-60);b.y=D.clamp(p.y+ny*26,76,D.HEIGHT-76);
  const pvx=p.mgVx||0,pvy=p.mgVy||0,closing=(b.vx-pvx)*nx+(b.vy-pvy)*ny;
  if(closing<0){b.vx-=1.45*closing*nx;b.vy-=1.45*closing*ny;}
  const push=Math.max(85,(pvx*nx+pvy*ny)*.7),away=b.vx*nx+b.vy*ny;if(away<push){b.vx+=(push-away)*nx;b.vy+=(push-away)*ny;}
 }
 function step(dt){const b=G.mg.ball,n=Math.max(1,Math.ceil(dt*120));for(let i=0;i<n;i++){const before={x:b.x,y:b.y},scored=D.stepBall(b,dt/n);let near=Infinity,touched=null;
   for(const p of players()){if(index(p)===b.previous&&G.el<(b.releaseUntil||0))continue;const fraction=D.segmentCircle(before,b,p,24);if(fraction!==null&&fraction<near){near=fraction;touched=p;}}
   if(touched)contact(touched);else if(scored)return scored;
  }return null;
 }
 function predict(dt){D.stepBall(G.mg.ball,dt);}
 function passTarget(p,pressured=false){const direction=p.team==='CT'?1:-1,b=G.mg.ball,enemies=players().filter(q=>q.team!==p.team),brain=p.mgBrain;
  return players().filter(q=>q!==p&&q.team===p.team&&!q.mgKeeper&&distance(p,q)>65&&distance(p,q)<340).map(q=>{
   const progress=(q.x-p.x)*direction,open=Math.min(...enemies.map(e=>distance(e,q)),300),blocked=enemies.some(e=>distance(e,p)>40&&D.segmentCircle(b,q,e,27)!==null),repeat=brain.lastPassTo===index(q)&&G.el-(brain.lastPassAt||0)<3;
   return{q,progress,open,blocked,score:progress*.3+open*.45-distance(p,q)*.09+(human(q)?70:0)-(repeat?35:0)};
  }).filter(q=>!q.blocked&&q.open>40&&q.score>15&&(q.progress>35||pressured||human(q.q)&&q.progress>-120)&&!(q.progress<0&&(p.team==='CT'?b.x<300:b.x>D.WIDTH-300)&&ownGoalRisk(p,q.q.x,q.q.y))).sort((a,c)=>c.score-a.score)[0]?.q;
 }
 function bot(p,dt){const b=G.mg.ball,own=p.team==='CT',direction=own?1:-1,brain=p.mgBrain;if(brain.fire===Infinity)return;
  const peers=players().filter(q=>q.team===p.team&&!q.mgKeeper),enemies=players().filter(q=>q.team!==p.team),nearest=enemies.slice().sort((a,c)=>distance(p,a)-distance(p,c))[0],pressure=nearest&&distance(p,nearest)<100;
  if(p.mgKeeper){
   brain.keeperSense=(brain.keeperSense||0)-dt;if(brain.keeperSense<=0){brain.keeperSense=.12+Math.random()*.08;const goalX=own?F.keeperX:D.WIDTH-F.keeperX,toward=own?b.vx<0:b.vx>0,eta=toward?(goalX-b.x)/b.vx:0,aim=eta>0&&eta<1.2?b.y+b.vy*eta:b.y;brain.keeperY=D.clamp(aim,D.HEIGHT/2-68,D.HEIGHT/2+68);}
   A.go(p,{x:own?F.keeperX:D.WIDTH-F.keeperX,y:brain.keeperY??D.HEIGHT/2},dt);p.a=Math.atan2(b.y-p.y,b.x-p.x);
   const incoming=(b.x-p.x)*b.vx+(b.y-p.y)*b.vy<0&&Math.hypot(b.vx,b.vy)>160;
   if(distance(p,b)<F.kickRange&&!incoming&&G.el>=(brain.playAt||0)){const receiver=passTarget(p,true);A.action(p,receiver?.x??p.x+direction*230,receiver?.y??D.HEIGHT/2+(p.y>D.HEIGHT/2?-130:130));brain.playAt=G.el+.35;}return;
  }
  const goal={x:own?D.WIDTH-30:30,y:D.HEIGHT/2},goalDistance=distance(p,goal);
  if(distance(p,b)<F.kickRange&&G.el>=(brain.playAt||0)){
   const receiver=passTarget(p,pressure),keeper=enemies.find(q=>q.mgKeeper),lane=enemies.some(q=>!q.mgKeeper&&distance(p,q)<110&&D.segmentCircle(b,goal,q,24)!==null);
   if(goalDistance<315&&!lane){const side=keeper&&keeper.y<D.HEIGHT/2?1:-1;A.action(p,goal.x,goal.y+side*(58+Math.random()*12),true);}
   else if(receiver)A.action(p,receiver.x,receiver.y);
   else A.action(p,D.clamp(b.x+direction*150,55,D.WIDTH-55),D.clamp(b.y+(D.HEIGHT/2-b.y)*.2,150,D.HEIGHT-150));
   brain.playAt=G.el+.35;
  }
  const last=G.ps[b.last],supported=last&&last!==p&&last.team===p.team&&distance(last,b)<60&&Math.hypot(b.vx,b.vy)<260,chasers=peers.slice().sort((a,c)=>distance(a,b)-distance(c,b)).slice(0,2);let target;
  if(supported)target={x:D.clamp(last.x+direction*(p.mgPitchRole%2?125:180),220,D.WIDTH-220),y:p.mgPitchRole%2?D.HEIGHT-205:205};
  else if(chasers.includes(p)){const future={x:D.clamp(b.x+b.vx*.1,92,D.WIDTH-92),y:D.clamp(b.y+b.vy*.1,100,D.HEIGHT-100)},wrongSide=(p.x-future.x)*direction>-26;if(wrongSide){if(!brain.ballSide)brain.ballSide=p.y>future.y?1:-1;target={x:future.x-direction*42,y:D.clamp(future.y+brain.ballSide*66,100,D.HEIGHT-100)};}else{brain.ballSide=0;target={x:future.x-direction*25,y:future.y};}if(distance(p,b)>150&&pressure)A.dash(p);}
  else target={x:D.clamp(b.x-direction*130,215,D.WIDTH-215),y:p.mgPitchRole%2?D.HEIGHT-205:205};
  A.go(p,target,dt);p.a=Math.atan2(b.y-p.y,b.x-p.x);
 }
 root.SzFootball={ball,assignRoles,spawnPoint,kick,step,predict,passTarget,bot,ownGoalRisk};
})(globalThis);
