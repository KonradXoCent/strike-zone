/* Possession, deliberate passes, tackles and host-owned restart/sin-bin rules. */
(function(root){'use strict';
 const A=SzMiniGames,F=SzFootball,D=SzMiniData,active=()=>A.active()&&G?.mg?.kind==='football',dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),ix=p=>G.ps.indexOf(p),t=s=>szLocale.t(s);
 D.FOOTBALL.keeperX=72;D.specs.football.control='LPM / Spacja — strzał · PPM / P — podaj · E — odbiór · Lewy Shift — sprint';
 const originalBall=F.ball;F.ball=function(){return{...originalBall(),owner:-1,acquireAt:0};};
 const ui=document.createElement('div');ui.className='sz-football-rules';ui.hidden=true;$('game').append(ui);
 function intent(p,shot=false){if(p.rh)return p.footballIntent||'shoot';if(p.human)return keys.e?'tackle':mouse.r||keys.p?'pass':'shoot';return shot?'shoot':'pass';}
 function protectedKeeper(p){const owner=G.ps[G.mg.ball.owner];return !!owner?.alive&&!!owner.mgKeeper&&owner!==p;}
 const KEEPER_SPACE=140,RESTART_SPACE=180;
 function space(){
  const m=G.mg,r=m.restart,b=m.ball,keeper=G.ps[b.owner];
  if(r)return{x:r.spot.x,y:r.spot.y,team:r.team,radius:RESTART_SPACE,kind:'restart',keeperExempt:true};
  if(keeper?.alive&&keeper.mgKeeper)return{x:keeper.x,y:keeper.y,team:keeper.team,radius:KEEPER_SPACE,kind:'keeper'};
  return b.clearance&&G.el<b.clearance.until?b.clearance:null;
 }
 function restricted(p,z){return !!z&&p.alive&&['CT','T'].includes(p.team)&&p.team!==z.team&&!(z.keeperExempt&&p.mgKeeper);}
 function outside(p,z,point=p){
  const base=Math.atan2(point.y-z.y,point.x-z.x),radius=z.radius+1;
  for(let ring=0;ring<4;ring++)for(let i=0;i<48;i++){
   const a=base+(i?Math.ceil(i/2)*(i%2?1:-1)*Math.PI/24:0),d=radius+ring*24;
   const q=D.limit('football',p.team,z.x+Math.cos(a)*d,z.y+Math.sin(a)*d,D.RADIUS,p.mgKeeper);
   if(dist(q,z)<z.radius||SzPropData.wallCollision(GR,q.x,q.y,D.RADIUS))continue;
   if(G.ps.some(o=>o!==p&&o.alive&&dist(o,q)<25))continue;
   return q;
  }
  return{x:p.x,y:p.y};
 }
 function constrainMove(p,q){
  const z=space();if(!restricted(p,z))return q;
  if(dist(q,z)<z.radius)return{x:p.x,y:p.y};
  if(dist(p,z)>=z.radius&&D.segmentCircle(p,q,z,z.radius)!==null)return{x:p.x,y:p.y};
  return q;
 }
 function enforceSpace(){const z=space();if(!z)return;for(const p of G.ps)if(restricted(p,z)&&dist(p,z)<z.radius){const q=outside(p,z);p.x=q.x;p.y=q.y;p.pth=null;p.npt=0;}}
 function canContact(p){const z=space();return !restricted(p,z)||(dist(p,z)>=z.radius&&dist(G.mg.ball,z)>=z.radius+26);}
 function drawSpace(){const z=space();if(!z)return;cx.save();cx.strokeStyle=z.kind==='keeper'?'#8ee0bd66':'#f5d58077';cx.lineWidth=1.5;cx.setLineDash([7,7]);cx.beginPath();cx.arc(z.x,z.y,z.radius,0,Math.PI*2);cx.stroke();cx.restore();}
 function release(b){b.owner=-1;b.acquireAt=G.el+.3;}
 function take(p){if(!active()||G.client||!p?.alive||protectedKeeper(p)||!canContact(p))return false;const b=G.mg.ball,from=G.ps[b.passFrom];if(from&&from!==p&&from.team===p.team){from.mgStats.passes++;G.mg.stats.completedPasses=(G.mg.stats.completedPasses||0)+1;if(p.human||p.rh)G.mg.stats.completedHumanPasses=(G.mg.stats.completedHumanPasses||0)+1;}b.passFrom=-1;b.owner=ix(p);b.last=b.previous=ix(p);b.vx=b.vy=0;SzArcadeRules.touch(b,ix(p),p.team,G.el);if(p.mgKeeper)enforceSpace();snd('steal',p.x,p.y);return true;}
 // Trap a deliberate team pass at its first swept contact, before reflection.
 function receivePass(p){if(!active()||G.client)return false;const b=G.mg.ball,from=G.ps[b.passFrom];if(b.owner>=0||!from||from===p||from.team!==p.team)return false;if(!take(p))return false;G.mg.stats.contacts=(G.mg.stats.contacts||0)+1;return true;}
 function penaltyArea(team,p){return Math.abs(p.y-D.HEIGHT/2)<=180&&(team==='CT'?p.x>=48&&p.x<=248:p.x>=D.WIDTH-248&&p.x<=D.WIDTH-48);}
 function restart(team,victim,offender,severe){const m=G.mg,penalty=penaltyArea(offender.team,victim),spot=penalty?{x:team==='CT'?D.WIDTH-220:220,y:D.HEIGHT/2}:{x:D.clamp(victim.x,180,D.WIDTH-180),y:D.clamp(victim.y,150,D.HEIGHT-150)};
  const recent=G.el-(offender.lastFoul??-100)>45;offender.fouls=(offender.fouls||0)+1;offender.lastFoul=G.el;m.stats.fouls=(m.stats.fouls||0)+1;const yellow=severe||!recent;
  if(yellow){offender.yellowCards=(offender.yellowCards||0)+1;offender.mgSinBin=G.el+60;offender.alive=false;offender.hp=0;offender.x=D.WIDTH/2;offender.y=45;offender.cd=1;}
  m.ball={...F.ball(),...spot};const kicker=victim.alive?victim:G.ps.find(p=>p.alive&&p.team===team&&!p.mgKeeper);if(!kicker)return;const direction=team==='CT'?1:-1;kicker.x=spot.x-direction*32;kicker.y=spot.y;
  for(const p of G.ps)if(p!==kicker&&p.alive&&dist(p,spot)<110){const q=D.limit('football',p.team,p.x-direction*115,p.y+(p.y>spot.y?100:-100));if(!SzPropData.wallCollision(GR,q.x,q.y,12)){p.x=q.x;p.y=q.y;}}
  m.restart={team,kicker:ix(kicker),type:penalty?'penalty':'free',at:G.el+2.5,auto:G.el+5.5,spot,yellow:yellow?ix(offender):-1,offender:ix(offender)};enforceSpace();snd(yellow?'card':'whistle');
 }
 function tackle(p){if(!active()||G.client||G.paused||G.over||G.mg.phase!=='live'||!p?.alive||(p.tackleAt||0)>G.el||G.mg.restart)return false;
  const b=G.mg.ball,owner=G.ps[b.owner];if(owner===p||protectedKeeper(p)||!canContact(p))return false;p.tackleAt=G.el+2.2;
  // A failed challenge can hit a nearby opponent even when nobody owns the ball.
  const q=owner?.alive&&owner.team!==p.team&&dist(p,owner)<=44?owner:G.ps.filter(q=>q.alive&&q.team!==p.team&&dist(p,q)<=36&&Math.cos(Math.atan2(q.y-p.y,q.x-p.x)-p.a)>.15).sort((a,c)=>dist(p,a)-dist(p,c))[0];
  const ballDistance=dist(p,b),playerDistance=q?dist(p,q):Infinity,behind=q&&((p.x-q.x)*Math.cos(q.a)+(p.y-q.y)*Math.sin(q.a))/(playerDistance||1)<-.35;
  const ballFirst=(!owner||owner===q)&&ballDistance<=48&&(!behind||ballDistance<playerDistance-4);
  const bodyHit=playerDistance<=27,reckless=behind&&p.mgDash>0&&playerDistance<=32&&ballDistance>playerDistance+8;
  if(q&&!ballFirst&&(bodyHit||reckless)){restart(q.team,q,p,!!reckless);return false;}
  if(ballFirst&&take(p)){p.cd=.25;p.mgSlow=.25;G.mg.stats.tackles=(G.mg.stats.tackles||0)+1;return true;}return false;
 }
 const kick=F.kick;F.kick=function(p,x,y,shot=false,forceShot=false){if(!active())return kick(p,x,y,shot);const action=forceShot?'shoot':intent(p,shot);if(action==='tackle'){if(p.human||p.rh){if(p.footballTackleHeld)return false;p.footballTackleHeld=true;}return tackle(p);}const m=G.mg,b=m.ball,r=m.restart;
  if(r&&(r.kicker!==ix(p)||G.el<r.at))return false;if(b.owner>=0&&b.owner!==ix(p))return false;
  const pass=action==='pass';let receiver;
  if(pass){const angle=Math.atan2(y-p.y,x-p.x);receiver=G.ps.filter(q=>q!==p&&q.alive&&q.team===p.team&&dist(p,q)>45&&dist(p,q)<460).map(q=>({p:q,dot:Math.cos(Math.atan2(q.y-p.y,q.x-p.x)-angle),d:dist(p,q)})).filter(q=>q.dot>.55).sort((a,b)=>(b.dot-a.dot)*400+a.d-b.d)[0]?.p;if(receiver){x=receiver.x+(receiver.mgVx||0)*.12;y=receiver.y+(receiver.mgVy||0)*.12;}}
  const owned=b.owner===ix(p);if(owned){b.x=p.x+Math.cos(p.a)*26;b.y=p.y+Math.sin(p.a)*26;}
  const clearance=r?{...r.spot,team:p.team,radius:RESTART_SPACE,kind:'restart',keeperExempt:true,until:G.el+.4}:owned&&p.mgKeeper?{x:p.x,y:p.y,team:p.team,radius:KEEPER_SPACE,kind:'keeper',until:G.el+.45}:null;
  const result=kick(p,x,y,!pass);if(result){release(b);b.clearance=clearance;const speed=pass?440:640,n=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/n*speed;b.vy=b.vy/n*speed;p.cd=pass?.4:.55;m.restart=null;snd('kick',p.x,p.y);}return result;
 };
 const step=F.step;F.step=function(dt){if(!active())return step(dt);enforceSpace();const m=G.mg,b=m.ball,r=m.restart;
  if(r){b.x=r.spot.x;b.y=r.spot.y;b.vx=b.vy=0;const kicker=G.ps[r.kicker];if(G.el>=r.auto&&kicker?.alive)F.kick(kicker,kicker.team==='CT'?D.WIDTH-30:30,D.HEIGHT/2,true,true);return null;}
  const owner=G.ps[b.owner];if(owner?.alive){const target={x:owner.x+Math.cos(owner.a)*26,y:owner.y+Math.sin(owner.a)*26};if(!SzPropData.wallCollision(GR,target.x,target.y,8)){b.x=D.clamp(target.x,60,D.WIDTH-60);b.y=D.clamp(target.y,76,D.HEIGHT-76);}else release(b);b.vx=b.vy=0;return null;}if(b.owner>=0)release(b);
  const goal=step(dt);if(goal)return goal;if(b.owner>=0)return null;
  if(G.el>=(b.acquireAt||0)&&Math.hypot(b.vx,b.vy)<290){const near=G.ps.filter(p=>p.alive&&canContact(p)&&dist(p,b)<35&&((b.previous!==ix(p))||G.el>=(b.releaseUntil||0))).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(near)take(near);}return null;
 };
 const predict=F.predict;F.predict=function(dt){if(active()){const b=G.mg.ball,p=G.ps[b.owner];if(p?.alive){b.x=p.x+Math.cos(p.a)*26;b.y=p.y+Math.sin(p.a)*26;return;}if(G.mg.restart)return;}return predict(dt);};
 const bot=F.bot;F.bot=function(p,dt){if(!active())return bot(p,dt);if(p.mgBrain.fire===Infinity)return;const b=G.mg.ball,owner=G.ps[b.owner],brain=p.mgBrain;if(G.mg.restart){const r=G.mg.restart;if(ix(p)===r.kicker&&G.el>=r.at)F.kick(p,p.team==='CT'?D.WIDTH-20:20,D.HEIGHT/2+(Math.random()-.5)*90,true);return;}
  if(owner===p&&!p.mgKeeper){const direction=p.team==='CT'?1:-1,enemy=G.ps.filter(q=>q.alive&&q.team!==p.team).sort((a,c)=>dist(a,p)-dist(c,p))[0],goal={x:direction>0?D.WIDTH-35:35,y:D.HEIGHT/2};A.go(p,{x:p.x+direction*160,y:p.y+(D.HEIGHT/2-p.y)*.22},dt);p.a=Math.atan2(goal.y-p.y,goal.x-p.x);
   if((brain.playAt||0)<=G.el){const receiver=F.passTarget(p,enemy&&dist(enemy,p)<100);if(dist(p,goal)<255){const keeper=G.ps.find(q=>q.alive&&q.team!==p.team&&q.mgKeeper);F.kick(p,goal.x,goal.y+(keeper&&keeper.y<goal.y?72:-72),true);}else if(receiver&&(dist(enemy||goal,p)<100||Math.random()<.35))F.kick(p,receiver.x,receiver.y,false);brain.playAt=G.el+.65;}return;}
  if(owner?.alive&&owner.team!==p.team&&!p.mgKeeper){A.go(p,{x:owner.x,y:owner.y},dt);p.a=Math.atan2(b.y-p.y,b.x-p.x);if((brain.tackleCheck||0)<G.el&&dist(p,owner)<42){brain.tackleCheck=G.el+1.8;const behind=(p.x-owner.x)*Math.cos(owner.a)+(p.y-owner.y)*Math.sin(owner.a)<-6;if(!behind||dist(p,owner)<=27&&Math.random()<.004)tackle(p);}return;}
  const r=bot(p,dt);if(owner?.team!==p.team&&owner?.alive&&dist(p,owner)<40&&(brain.tackleCheck||0)<G.el){brain.tackleCheck=G.el+2.5;const behind=(p.x-owner.x)*Math.cos(owner.a)+(p.y-owner.y)*Math.sin(owner.a)<-6;if(!behind||dist(p,owner)<=27&&Math.random()<.004)tackle(p);}return r;
 };
 const tick= A.tick;A.tick=function(dt){return tick(dt);}; // The shipped updater below also covers the controller's lexical tick.
 let serial=-1,reference=null;function state(){const m=G.mg;if(G!==reference||serial!==m.serial){reference=G;serial=m.serial;}
  for(const p of G.ps){const held=p.rh?performance.now()-p.lastIn<2000&&p.inp?.f&&p.footballIntent==='tackle':p.human&&keys.e;if(!held)p.footballTackleHeld=false;if(p.mgSinBin&&p.mgSinBin<=G.el){p.mgSinBin=0;A.resetPlayer(p,G.ps);snd('whistle');}}
 }
 function progression(){if(!active()||G.spectator||G.creatorTest)return;const st=G.me.mgStats||{},v=G.footballProfileStats;if(v&&v.serial===G.mg.serial){const goals=Math.max(0,(st.goals||0)-v.goals),saves=Math.max(0,(st.saves||0)-v.saves);if(goals)acc('footballGoals',goals);if(saves)acc('footballSaves',saves);if(goals||saves)save();}G.footballProfileStats={serial:G.mg.serial,goals:st.goals||0,saves:st.saves||0};}
 const updBefore=upd;upd=function(dt){if(!active()){ui.hidden=true;return updBefore(dt);}state();if(!G.footballProfileStats)progression();const button=mouse.d;if(!G.client&&!G.paused)mouse.d=button||mouse.r||keys[' ']||keys.p||keys.e;try{return updBefore(dt);}finally{mouse.d=button;progression();notice();}};
 function notice(){ui.hidden=!active()||!!G.paused||!!G.over;if(ui.hidden)return;const top=document.querySelector('.mh-mode-top');if(top)ui.style.top=Math.max(78,top.getBoundingClientRect().bottom-$('game').getBoundingClientRect().top+6)+'px';const m=G.mg,rows=G.ps.filter(p=>(p.mgSinBin||0)>G.el).map(p=>'🟨 '+nm(p)+' · '+Math.ceil(p.mgSinBin-G.el)+'s');if(m.restart)rows.unshift(t('Faul')+' · '+nm(G.ps[m.restart.offender])+' · '+t(m.restart.type==='penalty'?'Rzut karny':'Rzut wolny')+' · '+m.restart.team);ui.textContent=rows.join('   |   ');ui.hidden=!rows.length;}
 const send=netSend;netSend=function(message){if(active()&&message.t==='in'){const locked=G.paused||G.mg.phase!=='live'||!G.me.alive;message={...message,k:{...message.k,e:!locked&&!!keys.shiftLeft},f:!locked&&!!(message.f||keys[' ']||keys.p||keys.e||mouse.r),mg:{...message.mg,action:intent(G.me)}};}if(active()&&message.t==='snap')message={...message,p:message.p.map((p,i)=>({...p,football:{bin:G.ps[i].mgSinBin||0,cards:G.ps[i].yellowCards||0}}))};return send(message);};
 const receive=hostRecv;hostRecv=function(message){const r=receive(message);if(active()&&!G.client&&message?.sid===NET.session&&roomPeer(message.c)&&message.t==='in'){const p=G.ps.find(p=>p.rid===message.c);if(p)p.footballIntent=['shoot','pass','tackle'].includes(message.mg?.action)?message.mg.action:'shoot';}return r;};
 const apply=applySnap;applySnap=function(s){const r=apply(s);if(active()){for(const row of s.p||[]){const p=G.ps[row.i];if(p){p.mgSinBin=Number(row.football?.bin)||0;p.yellowCards=Number(row.football?.cards)||0;}}progression();notice();}return r;};
 addEventListener('keydown',ev=>{if(active()&&!G.paused&&!ev.target.closest?.('input,textarea,dialog')){if(ev.code==='ShiftLeft')keys.shiftLeft=1;if(['Space','KeyP','KeyE','ShiftLeft'].includes(ev.code))ev.preventDefault();}});
 addEventListener('keyup',ev=>{if(ev.code==='ShiftLeft')keys.shiftLeft=0;});
 root.SzFootballRules={active,tackle,take,receive:receivePass,restart,notice,space,constrainMove,enforceSpace,canContact,drawSpace};
})(globalThis);
