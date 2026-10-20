/* Shared football rules: the host owns possession, catches, passes and tackles. */
(function(root){'use strict';
 const A=SzMiniGames,D=SzMiniData,F=D.FOOTBALL;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),index=p=>G.ps.indexOf(p),players=()=>G.ps.filter(p=>p.alive);
 function ball(){return{x:D.WIDTH/2,y:D.HEIGHT/2,vx:0,vy:0,last:-1,owner:-1,previous:-1,releaseUntil:0,tackleAfter:0,passFrom:-1};}
 function holder(){const i=G.mg.ball.owner;return Number.isInteger(i)&&i>=0&&G.ps[i]?.alive?G.ps[i]:null;}
 function assignRoles(){for(const team of['CT','T']){const peers=G.ps.filter(p=>(p.mgHomeTeam||p.team)===team);peers.forEach((p,i)=>{p.mgKeeper=i===peers.length-1;p.mgPitchRole=i;});}}
 function spawnPoint(p){const own=(p.mgHomeTeam||p.team)==='CT',formation=[[360,320],[260,180],[360,512],[260,652]],point=p.mgKeeper?[F.keeperX,D.HEIGHT/2]:formation[(p.mgPitchRole||0)%4];return{x:own?point[0]:D.WIDTH-point[0],y:point[1]};}
 function carry(b,p){b.x=D.clamp(p.x+Math.cos(p.a)*F.carryOffset,60,D.WIDTH-60);b.y=D.clamp(p.y+Math.sin(p.a)*F.carryOffset,76,D.HEIGHT-76);b.vx=b.vy=0;}
 function acquire(p,steal=false){const m=G.mg,b=m.ball,from=G.ps[b.passFrom],last=G.ps[b.last],speed=Math.hypot(b.vx,b.vy);
  if(steal)m.stats.tackles=(m.stats.tackles||0)+1;
  else{m.stats.controls=(m.stats.controls||0)+1;if(from&&from!==p&&from.team===p.team)m.stats.completedPasses=(m.stats.completedPasses||0)+1;if(p.mgKeeper&&last&&last.team!==p.team&&speed>160)m.stats.saves=(m.stats.saves||0)+1;}
  b.owner=b.last=index(p);b.passFrom=-1;b.tackleAfter=G.el+(steal?.85:.55);p.mgBrain.playAt=G.el+.25+Math.random()*.25;carry(b,p);
 }
 function kick(p,x,y,shot=false){const m=G.mg,b=m.ball,owner=holder();if(G.client||G.paused||G.over||m.phase!=='live'||!p.alive||p.cd>0||owner&&owner!==p||!owner&&distance(p,b)>34)return false;
  let receiver=null;if(!shot)receiver=players().filter(q=>q!==p&&q.team===p.team&&distance(q,{x,y})<44&&distance(p,q)<350).sort((a,c)=>distance(a,{x,y})-distance(c,{x,y}))[0];
  if(receiver){x=receiver.x+D.clamp((receiver.mgVx||0)*.25,-32,32);y=receiver.y+D.clamp((receiver.mgVy||0)*.25,-32,32);}
  p.a=Math.atan2(y-p.y,x-p.x);const range=distance(p,{x,y}),speed=shot?F.shotSpeed:D.clamp(100+range*F.drag,F.passMin,F.passMax);carry(b,p);
  b.owner=-1;b.previous=b.last=index(p);b.releaseUntil=G.el+.24;b.passFrom=shot?-1:index(p);b.vx=Math.cos(p.a)*speed;b.vy=Math.sin(p.a)*speed;p.cd=shot?.6:.45;
  m.stats.kicks=(m.stats.kicks||0)+1;if(shot)m.stats.shots=(m.stats.shots||0)+1;else m.stats.passes++;
  snd('step',p.x,p.y);return true;
 }
 function step(dt){const m=G.mg,b=m.ball,owner=holder();
  if(owner){carry(b,owner);if(G.el>=(b.tackleAfter||0)){const opponent=players().filter(p=>p.team!==owner.team&&distance(p,b)<=30&&distance(p,owner)<=48).sort((a,c)=>distance(a,b)-distance(c,b))[0];if(opponent)acquire(opponent,true);}return null;}
  b.owner=-1;const before={x:b.x,y:b.y},scored=D.stepBall(b,dt);let near=Infinity,receiver=null;
  for(const p of players()){if(index(p)===b.previous&&G.el<(b.releaseUntil||0))continue;const fraction=D.segmentCircle(before,b,p,26);if(fraction!==null&&fraction<near){near=fraction;receiver=p;}}
  if(receiver){acquire(receiver);return null;}return scored;
 }
 function predict(dt){const owner=holder();if(owner)carry(G.mg.ball,owner);else D.stepBall(G.mg.ball,dt);}
 function passTarget(p,pressured){const direction=p.team==='CT'?1:-1,b=G.mg.ball,enemies=players().filter(q=>q.team!==p.team);
  return players().filter(q=>q!==p&&q.team===p.team&&!q.mgKeeper&&distance(p,q)>75&&distance(p,q)<310).map(q=>{const progress=(q.x-p.x)*direction,open=Math.min(...enemies.map(e=>distance(e,q)),300),blocked=enemies.some(e=>distance(e,p)>40&&D.segmentCircle(b,q,e,27)!==null);return{q,progress,open,score:progress*.55+open*.45-distance(p,q)*.12-(blocked?500:0)};}).filter(q=>q.score>0&&(pressured||q.progress>55)&&q.open>35).sort((a,c)=>c.score-a.score)[0]?.q;
 }
 function bot(p,dt){const b=G.mg.ball,owner=holder(),own=p.team==='CT',direction=own?1:-1,brain=p.mgBrain,peers=players().filter(q=>q.team===p.team&&!q.mgKeeper),enemies=players().filter(q=>q.team!==p.team),nearest=enemies.slice().sort((a,c)=>distance(p,a)-distance(p,c))[0],pressure=nearest&&distance(p,nearest)<85;
  if(p.mgKeeper){
   if(owner===p){A.go(p,{x:own?F.keeperX:D.WIDTH-F.keeperX,y:D.HEIGHT/2},dt);if(G.el>=(brain.playAt||0)){const receiver=passTarget(p,true);A.action(p,receiver?.x??p.x+direction*230,receiver?.y??D.HEIGHT/2+(p.y>D.HEIGHT/2?-130:130));}return;}
   brain.keeperSense=(brain.keeperSense||0)-dt;if(brain.keeperSense<=0){brain.keeperSense=.18+Math.random()*.12;const goalX=own?F.keeperX:D.WIDTH-F.keeperX,toward=own?b.vx<0:b.vx>0,eta=toward?(goalX-b.x)/b.vx:0,aim=eta>0&&eta<1.2?b.y+b.vy*eta:b.y;brain.keeperY=D.clamp(aim,D.HEIGHT/2-68,D.HEIGHT/2+68);}
   A.go(p,{x:own?F.keeperX:D.WIDTH-F.keeperX,y:brain.keeperY??D.HEIGHT/2},dt);p.a=Math.atan2(b.y-p.y,b.x-p.x);return;
  }
  if(owner===p){const goal={x:own?D.WIDTH-30:30,y:D.HEIGHT/2},goalDistance=distance(p,goal);if(G.el>=(brain.playAt||0)){const receiver=passTarget(p,pressure),keeper=enemies.find(q=>q.mgKeeper),lane=enemies.some(q=>!q.mgKeeper&&distance(p,q)<100&&D.segmentCircle(b,goal,q,24)!==null);
    if(goalDistance<290&&!lane){const side=keeper&&keeper.y<D.HEIGHT/2?1:-1;A.action(p,goal.x,goal.y+side*(58+Math.random()*12),true);return;}
    if(receiver&&(pressure||(receiver.x-p.x)*direction>70)){A.action(p,receiver.x,receiver.y);return;}
   }
   const dodge=nearest&&distance(p,nearest)<100?(p.y>=nearest.y?1:-1)*65:0,target={x:D.clamp(p.x+direction*150,155,D.WIDTH-155),y:D.clamp(p.y+(D.HEIGHT/2-p.y)*.4+dodge,155,D.HEIGHT-155)};p.a=Math.atan2(target.y-p.y,target.x-p.x);A.go(p,target,dt);return;
  }
  const chasers=peers.slice().sort((a,c)=>distance(a,b)-distance(c,b)).slice(0,2),chase=chasers.includes(p);let target;
  if(owner?.team===p.team){target={x:D.clamp(owner.x+direction*(p.mgPitchRole%2?125:180),220,D.WIDTH-220),y:p.mgPitchRole%2?D.HEIGHT-205:205};}
  else if(chase){target={x:b.x,y:b.y};if(owner&&distance(p,owner)<68&&distance(p,b)>30){const side=p.mgPitchRole%2?1:-1;target={x:owner.x+Math.cos(owner.a)*38-Math.sin(owner.a)*side*42,y:owner.y+Math.sin(owner.a)*38+Math.cos(owner.a)*side*42};}if(owner&&distance(p,owner)<130)A.dash(p);}
  else target={x:D.clamp(b.x-direction*145,215,D.WIDTH-215),y:p.mgPitchRole%2?D.HEIGHT-205:205};
  A.go(p,target,dt);p.a=Math.atan2(b.y-p.y,b.x-p.x);
 }
 root.SzFootball={ball,holder,assignRoles,spawnPoint,carry,kick,step,predict,bot};
})(globalThis);
