/* Prop Hunt variant: shared round rules, anonymous visual observations, and
   host-owned form changes, geometry, ammunition and hit decisions. */
(function(root){'use strict';
 const D=SzPropData,H=SzHideSeek,CACHE=new Map(),WORLDS=new Map(),RANGE=500,DAMAGE=25,PENALTY=5;
 const active=()=>!!G&&sel.mode==='prophunt',seeker=p=>p.team===G.hns.seekerTeam,t=s=>szLocale.t(s),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function ensure(g=G){if(g.propWorld?.map===sel.map)return g.propWorld;const grid=GRS[sel.map];let world=WORLDS.get(sel.map);if(!world||world.grid!==grid){const objects=D.layout(grid);world={map:sel.map,grid,objects,nav:D.navGrid(grid,objects)};WORLDS.set(sel.map,world);}g.propWorld=world;return world;}
 const radius=p=>seeker(p)?12:D.radius(p.propForm);
 function occupied(p,x,y,placed=G.ps){const w=ensure();return D.collides(w.grid,w.objects,x,y,radius(p))||placed.some(q=>q!==p&&q.alive&&distance({x,y},q)<radius(p)+radius(q)+1);}
 function place(p,placed){const area=SPW[sel.map][seeker(p)?0:1],cx=area[0]+area[2]/2,cy=area[1]+area[3]/2;for(let i=0;i<500;i++){const r=i<150?65:180,a=i*2.399963,x=cx+Math.cos(a)*Math.sqrt((i%150)/150)*r,y=cy+Math.sin(a)*Math.sqrt((i%150)/150)*r;if(!occupied(p,x,y,placed)){p.x=x;p.y=y;return;}}const grid=ensure().nav;for(let i=0;i<grid.d.length;i++)if(!grid.d[i]){const x=(i%grid.cols+.5)*grid.cs,y=(Math.floor(i/grid.cols)+.5)*grid.cs;if(!occupied(p,x,y,placed)){p.x=x;p.y=y;return;}}throw Error('Prop Hunt spawn has no clearance');}
 function initRound(g,first){const w=ensure(g),pool=D.pools[w.grid.source];g.hns.phEffects=[];g.hns.phCleared={};const placed=[];
  for(const p of g.ps){p.propForm=seeker(p)?null:pool[(p.i+(p.team==='T'?2:0)+g.hns.round)%pool.length];p.propAngle=0;p.propLocked=false;p.propMorph=0;p.propRDown=p.propFDown=false;p.phHitUntil=0;p.phDamagedAt=-100;p.phShots=first?0:p.phShots||0;p.phHits=first?0:p.phHits||0;p.phWrong=first?0:p.phWrong||0;p.phBrain={sense:0,inspect:2+Math.random()*3,history:[],checked:new Map(),reaction:.5};p.pri=null;p.sec=seeker(p)?(p.team==='CT'?'usp':'glock'):null;p.cur=p.sec||'knife';p.ammo=p.sec?{[p.sec]:12}:{};p.hp=p.mh=100;p.rl=0;place(p,placed);placed.push(p);p.hnsLock={x:p.x,y:p.y};if(!seeker(p))p.hnsBrain.goal=hidingSpot(p);}
 }
 function effect(kind,p){G.hns.phEffects.push({kind,x:p.x,y:p.y,left:.45});G.hns.phEffects=G.hns.phEffects.slice(-16);}
 function canSee(a,b,skip){if(G.ph==='buy'&&seeker(a)||distance(a,b)>H.SIGHT||!los(a,b))return false;const angle=Math.atan2(b.y-a.y,b.x-a.x),max=distance(a,b)-D.radius(b.form||b.propForm)-2;return !ensure().objects.some(o=>o!==skip&&o!==b&&D.ray(a,angle,o,max)!==null);}
 function canRender(viewer,target,skip){return !seeker(G.me)||canSee(viewer,target,skip);}
 function nearest(p,aim){const w=ensure(),list=w.objects.filter(o=>distance(p,o)<112&&canSee(p,o,o));if(!list.length)return null;return list.sort((a,b)=>(aim&&distance(aim,a)<42?distance(aim,a):distance(p,a)+50)-(aim&&distance(aim,b)<42?distance(aim,b):distance(p,b)+50))[0];}
 function transform(p,object){if(!active()||G.client||G.paused||!p.alive||seeker(p)||G.ph==='end'||p.propMorph>0)return false;const w=ensure();if(!w.objects.includes(object)||distance(p,object)>112||!canSee(p,object,object))return false;const old=p.propForm;p.propForm=object.form;if(occupied(p,p.x,p.y)){p.propForm=old;if(p.human)toast(t('Za mało miejsca na ten przedmiot.'));return false;}p.propAngle=object.a;p.propMorph=3;p.propLocked=true;effect('morph',p);return true;}
 function reload(p){if(!seeker(p)||p.rl>0||(p.ammo[p.cur]||0)>=12)return;p.rl=1.4;}
 function input(p,k){const r=!!k.r,f=!!k.lock;if(r&&!p.propRDown){if(seeker(p))reload(p);else transform(p,p.rh?ensure().objects.find(o=>o.id===k.source):nearest(p,{x:mouse.x/VIEW_ZOOM+cam.x,y:mouse.y/VIEW_ZOOM+cam.y}));}if(f&&!p.propFDown&&!seeker(p)){p.propLocked=!p.propLocked;p.propAngle=p.a;}p.propRDown=r;p.propFDown=f;}
 function move(p,dx,dy){if(!p.alive)return;const before={x:p.x,y:p.y};for(const axis of['x','y']){const step=axis==='x'?dx:dy,x=p.x+(axis==='x'?step:0),y=p.y+(axis==='y'?step:0),w=ensure();if(D.collides(w.grid,w.objects,x,y,radius(p)))continue;const blocks=G.ps.some(q=>q!==p&&q.alive&&distance({x,y},q)<radius(p)+radius(q)&&distance({x,y},q)<distance(p,q)-.01);if(!blocks)p[axis]+=step;}
  const moved=distance(before,p);p.wk=(p.wk||0)+moved;if(moved>.1)p.phMovedAt=G.el;if(p.wk>48){p.wk=0;snd('step',p.x,p.y);}
 }
 function speed(p){return seeker(p)?185:p.hnsSprint>0?228:158;}
 function moveTo(p,goal,dt){if(!goal||distance(p,goal)<10)return;const w=ensure(),base=GR;let q;try{GR=w.nav;q=navStep(p,goal.x,goal.y,dt);}finally{GR=base;}const dx=q[0]-p.x,dy=q[1]-p.y,d=Math.hypot(dx,dy);if(d<.1)return;const before={x:p.x,y:p.y};p.a=Math.atan2(dy,dx);move(p,dx/d*speed(p)*dt,dy/d*speed(p)*dt);const b=p.hnsBrain;if(distance(before,p)<speed(p)*dt*.1)b.stuck+=dt;else b.stuck=0;if(b.stuck>1.2){p.pth=null;p.npt=0;b.stuck=0;b.goal=null;p.phBrain.target=null;b.patrol++;}}
 function hidingSpot(p,threat){const w=ensure(),spots=[];for(const o of w.objects)for(let i=0;i<8;i++){const a=i*Math.PI/4,d=D.radius(o.form)+Math.max(D.radius(p.propForm),D.radius(o.form))+8,q={x:o.x+Math.cos(a)*d,y:o.y+Math.sin(a)*d,source:o};if(occupied(p,q.x,q.y,[]))continue;const cell=Math.floor(q.y/w.nav.cs)*w.nav.cols+Math.floor(q.x/w.nav.cs);if(w.nav.d[cell])continue;const shelter=threat?distance(q,threat)-(los(q,threat)?200:0):Math.random()*240;spots.push({...q,score:shelter-distance(p,q)*.18});}return spots.sort((a,b)=>b.score-a.score)[0]||GR.hidePoints[(p.i*7)%GR.hidePoints.length];}
 function observe(p){const w=ensure(),observations=[];for(const o of w.objects)if(canSee(p,o,o))observations.push({form:o.form,x:o.x,y:o.y,a:o.a});for(const q of G.ps)if(q.alive&&!seeker(q)&&canSee(p,q))observations.push({form:q.propForm,x:q.x,y:q.y,a:q.propAngle});return observations;}
 const observationKey=o=>o.form+':'+Math.round(o.x/24)+':'+Math.round(o.y/24);
 function botHunter(p,dt){if(G.ph==='buy')return;const b=p.phBrain,h=p.hnsBrain;b.sense-=dt;b.inspect-=dt;
  if(b.sense<=0){b.sense=.22+Math.random()*.12;const seen=observe(p),old=b.history;const moving=seen.filter(o=>{const before=old.filter(q=>q.form===o.form).sort((a,c)=>distance(a,o)-distance(c,o))[0];return before&&distance(before,o)>2&&distance(before,o)<65;});b.history=seen.map(o=>({...o}));
   const confirmed=b.confirmed&&b.confirmed.until>G.el?seen.filter(o=>distance(o,b.confirmed)<85).sort((a,c)=>distance(a,b.confirmed)-distance(c,b.confirmed))[0]:null;
   let candidate=moving[0]||confirmed;
   if(!candidate&&b.inspect<=0&&p.hp>20){const list=seen.filter(o=>distance(p,o)<380&&(b.checked.get(observationKey(o))||0)<G.el);candidate=list[Math.random()*list.length|0];b.inspect=3.5+Math.random()*3;if(candidate)b.checked.set(observationKey(candidate),G.el+65);}
   if(candidate){const same=b.target&&distance(candidate,b.target)<70;b.target={...candidate,until:G.el+3.5};if(!same)b.reaction=.38+Math.random()*.5;h.goal={x:candidate.x,y:candidate.y};H.memory(h,candidate,G.el);}
   else if(b.target&&b.target.until<G.el)b.target=null;
   if(!b.target){H.memory(h,null,G.el);if(h.memory)h.goal={x:h.memory.x,y:h.memory.y};else if(!h.goal||distance(p,h.goal)<45){h.patrol=(h.patrol+1+Math.floor(Math.random()*3))%GR.hidePoints.length;h.goal=GR.hidePoints[h.patrol];}}
  }
  if(b.target){b.reaction-=dt;p.a=Math.atan2(b.target.y-p.y,b.target.x-p.x);if(distance(p,b.target)>290)moveTo(p,b.target,dt);if(b.target&&b.reaction<=0&&distance(p,b.target)<RANGE&&canSee(p,b.target)){p.a=Math.atan2(b.target.y-p.y,b.target.x-p.x)+(Math.random()-.5)*.035;shoot(p);}}
  else moveTo(p,h.goal,dt);
 }
 function botHider(p,dt){const b=p.phBrain,h=p.hnsBrain;b.sense-=dt;if(b.sense<=0){b.sense=.3+Math.random()*.15;const threats=G.ph==='live'?G.ps.filter(q=>q.alive&&seeker(q)&&canSee(p,q)).sort((a,c)=>distance(p,a)-distance(p,c)):[],q=threats[0];const looking=q&&Math.abs(Math.atan2(Math.sin(Math.atan2(p.y-q.y,p.x-q.x)-q.a),Math.cos(Math.atan2(p.y-q.y,p.x-q.x)-q.a)))<.7;
   if(q&&(distance(p,q)<125&&looking||G.el-p.phDamagedAt<2)){h.goal=hidingSpot(p,q);H.sprint(p);b.flee=G.el+2.5;}
   else if(!h.goal)h.goal=hidingSpot(p);
  }
  if(h.goal&&distance(p,h.goal)>12)moveTo(p,h.goal,dt);
  else if(!b.flee||b.flee<G.el){const o=nearest(p);if(o&&o.form!==p.propForm)transform(p,o);p.propLocked=true;if(o)p.propAngle=o.a;}
 }
 function bot(p,dt){return seeker(p)?botHunter(p,dt):botHider(p,dt);}
 function shoot(p){if(!active()||G.client||G.paused||G.ph!=='live'||!p.alive||!seeker(p)||p.cd>0||p.rl>0)return false;if((p.ammo[p.cur]||0)<=0){reload(p);return false;}p.cd=.32;p.ammo[p.cur]--;p.phShots++;snd('shot',p.x,p.y,p.cur);
  let end=RANGE;for(let d=2;d<=RANGE;d+=3)if(wallAt(p.x+Math.cos(p.a)*d,p.y+Math.sin(p.a)*d)){end=d;break;}let target=null,hit=end;
  for(const o of ensure().objects){const d=D.ray(p,p.a,o,end);if(d!==null&&d<hit){hit=d;target={object:o};}}
  for(const q of G.ps)if(q.alive&&!seeker(q)){const d=D.ray(p,p.a,{form:q.propForm,x:q.x,y:q.y,a:q.propAngle},end);if(d!==null&&d<hit){hit=d;target={player:q};}}
  G.tr.push({x:p.x,y:p.y,x2:p.x+Math.cos(p.a)*hit,y2:p.y+Math.sin(p.a)*hit,c:target?.player?'#a8eed7':'#f4cb89',t:.12});
  if(target?.player){const victim=target.player;victim.hp=Math.max(0,victim.hp-DAMAGE);victim.phDamagedAt=G.el;p.phHits++;p.phHitUntil=G.el+.22;p.phBrain.confirmed={x:victim.x,y:victim.y,until:G.el+4};effect('hit',victim);snd('hit',victim.x,victim.y);if(!victim.hp)H.eliminate(p,victim);}
  else if(target?.object){p.phWrong++;p.hp=Math.max(0,p.hp-PENALTY);p.phPenaltyUntil=G.el+.35;effect('wrong',target.object);if(p.phBrain){p.phBrain.target=null;p.phBrain.confirmed=null;p.hnsBrain.goal=null;p.phBrain.checked.set(observationKey(target.object),G.el+65);}if(!p.hp){p.alive=false;G.hns.events.unshift({by:nm(p),who:'',action:'trafił za dużo dekoracji',left:4});}}
  if(!G.ps.some(q=>q.alive&&seeker(q)))H.finishRound(G.hns.seekerTeam==='CT'?'T':'CT');return true;
 }
 function tickPlayer(p,dt){p.cur=seeker(p)?p.sec:'knife';p.propMorph=Math.max(0,(p.propMorph||0)-dt);if(p.rl>0){p.rl=Math.max(0,p.rl-dt);if(!p.rl&&seeker(p))p.ammo[p.cur]=12;}else if(seeker(p)&&(p.ammo[p.cur]||0)<=0)reload(p);}
 function afterPlayer(p){if(!seeker(p)&&!p.propLocked)p.propAngle=p.a;}
 function tickWorld(dt){G.tr=G.tr.filter(q=>(q.t-=dt)>0);G.hns.phEffects=(G.hns.phEffects||[]).filter(q=>(q.left-=dt)>0);}
 function serialize(p){return{form:p.propForm||null,angle:p.propAngle||0,locked:!!p.propLocked,morph:p.propMorph||0,shots:p.phShots||0,hits:p.phHits||0,wrong:p.phWrong||0,hit:p.phHitUntil||0,penalty:p.phPenaltyUntil||0};}
 function restore(p,o={}){p.propForm=D.models[o.form]?o.form:null;p.propAngle=Number(o.angle)||0;p.propLocked=!!o.locked;p.propMorph=Number(o.morph)||0;p.phShots=Number(o.shots)||0;p.phHits=Number(o.hits)||0;p.phWrong=Number(o.wrong)||0;p.phHitUntil=Number(o.hit)||0;p.phPenaltyUntil=Number(o.penalty)||0;}
 function sprite(form){if(CACHE.has(form))return CACHE.get(form);const m=D.models[form];if(!m)return null;const c=document.createElement('canvas');c.width=c.height=96;const q=c.getContext('2d');q.translate(48,48);q.scale(2,2);q.lineJoin='round';q.lineWidth=1.1;
  const box=(x,y,w,h,fill,r=2)=>{q.fillStyle=fill;q.beginPath();q.roundRect(x,y,w,h,r);q.fill();q.strokeStyle='#17232c';q.stroke();},circle=(x,y,r,fill)=>{q.fillStyle=fill;q.beginPath();q.arc(x,y,r,0,7);q.fill();q.strokeStyle='#17232c';q.stroke();};
  q.save();q.shadowColor='#0007';q.shadowBlur=4;q.shadowOffsetY=2;if(m.shape==='box')box(-m.w/2,-m.h/2,m.w,m.h,'#353d39');else circle(0,0,Math.min(m.w,m.h)/2,'#353d39');q.restore();
  if(form==='crate'){box(-15,-15,30,30,'#9f7546');for(let y=-10;y<15;y+=7){q.fillStyle='#c39961';q.fillRect(-13,y,26,4);}q.strokeStyle='#5f432c';q.lineWidth=3;for(const a of[-1,1]){q.beginPath();q.moveTo(-12,-12*a);q.lineTo(12,12*a);q.stroke();}for(const x of[-12,12])for(const y of[-12,12])circle(x,y,.8,'#d1c5a7');}
  else if(form==='barrel'){circle(0,0,16,'#557d86');circle(0,0,13.5,'#6a9296');q.strokeStyle='#35555b';q.lineWidth=2;for(const y of[-7,7]){q.beginPath();q.moveTo(-13,y);q.lineTo(13,y);q.stroke();}circle(6,-6,3,'#1c3b43');q.strokeStyle='#b3c5bb';q.beginPath();q.arc(0,0,12,-2.8,-.5);q.stroke();}
  else if(form==='tire'){circle(0,0,15,'#30363b');circle(0,0,8,'#101c24');q.strokeStyle='#596269';for(let a=0;a<7;a+=.5){q.beginPath();q.moveTo(Math.cos(a)*11,Math.sin(a)*11);q.lineTo(Math.cos(a+.14)*14,Math.sin(a+.14)*14);q.stroke();}}
  else if(form==='toolcase'){box(-16,-11,32,22,'#b75b47');box(-5,-14,10,4,'#4b5358',1);q.fillStyle='#dc9275';q.fillRect(-14,-9,28,5);for(const x of[-9,7])box(x,-2,3,6,'#aab0a7',.5);q.strokeStyle='#6a3732';q.beginPath();q.moveTo(-15,1);q.lineTo(15,1);q.stroke();}
  else if(form==='pallet'){box(-18,-12,36,24,'#6f5136');for(const x of[-14,-6,2,10])box(x,-11,6,22,'#b28e59',.5);for(const y of[-8,8])for(const x of[-11,-3,5,13])circle(x,y,.6,'#332d29');}
  else if(form==='pot'){circle(0,0,14,'#ae7051');circle(0,0,10,'#4d4730');for(let i=0;i<8;i++){const a=i*.8;circle(Math.cos(a)*6,Math.sin(a)*6,5.5,i%2?'#54794a':'#7b9c5a');}circle(-1,-1,4,'#a5b875');}
  else if(form==='rock'){q.fillStyle='#9a9e92';q.strokeStyle='#3a4847';q.beginPath();q.moveTo(-18,-3);q.lineTo(-9,-13);q.lineTo(8,-11);q.lineTo(18,0);q.lineTo(12,11);q.lineTo(-6,13);q.closePath();q.fill();q.stroke();q.fillStyle='#bcc1ae';q.beginPath();q.moveTo(-9,-11);q.lineTo(6,-8);q.lineTo(10,2);q.lineTo(-7,5);q.closePath();q.fill();q.strokeStyle='#747f72';q.beginPath();q.moveTo(-7,5);q.lineTo(-4,11);q.moveTo(10,2);q.lineTo(16,1);q.stroke();}
  else if(form==='bush'){for(let i=0;i<10;i++){const a=i*.7;circle(Math.cos(a)*10,Math.sin(a)*10,7.2,i%2?'#426647':'#638451');}circle(-2,-3,9,'#81a464');q.fillStyle='#a5bc7b';for(const[x,y]of[[-9,-8],[3,-5],[7,9],[-7,6]])q.fillRect(x,y,2,1.5);}
  else if(form==='chair'){for(const x of[-11,9])for(const y of[-12,10])box(x,y,3,4,'#4d4541',.5);box(-14,-15,28,7,'#7a4b4e');box(-11,-7,22,20,'#ba7770',4);q.strokeStyle='#e1a48c';q.beginPath();q.moveTo(-7,-3);q.lineTo(7,-3);q.lineTo(7,9);q.stroke();}
  else if(form==='suitcase'){box(-14,-11,28,22,'#607988',3);box(-5,-14,10,3,'#37494f',1);q.strokeStyle='#aec1c0';q.beginPath();q.moveTo(-7,-9);q.lineTo(-7,9);q.moveTo(7,-9);q.lineTo(7,9);q.stroke();box(9,2,3,5,'#d2b978',.5);}
  else if(form==='bin'){box(-12,-14,24,28,'#557673',3);box(-13,-15,26,6,'#8ba6a0',2);q.fillStyle='#2f4549';q.fillRect(-6,-12,12,2);q.strokeStyle='#acc1ad';for(const x of[-6,0,6]){q.beginPath();q.moveTo(x,-4);q.lineTo(x,10);q.stroke();}}
  CACHE.set(form,c);return c;
 }
 function drawObject(o){const image=sprite(o.form);if(!image)return;cx.save();cx.translate(o.x,o.y);cx.rotate(o.a||0);cx.drawImage(image,-24,-24,48,48);cx.restore();}
 function drawWorld(viewer){const world=ensure();for(const o of world.objects)if(canRender(viewer,o,o))drawObject(o);if(G.me.alive&&!seeker(G.me)){const source=nearest(G.me,{x:mouse.x/VIEW_ZOOM+cam.x,y:mouse.y/VIEW_ZOOM+cam.y});if(source&&canSee(viewer,source,source)){cx.strokeStyle='#a6e8d480';cx.lineWidth=1.2;cx.setLineDash([3,4]);cx.beginPath();cx.arc(source.x,source.y,D.radius(source.form)+5,0,7);cx.stroke();cx.setLineDash([]);}}
  for(const q of G.tr){if(seeker(G.me)&&(Math.min(distance(viewer,{x:q.x,y:q.y}),distance(viewer,{x:q.x2,y:q.y2}))>H.SIGHT||!los(viewer,{x:q.x,y:q.y})&&!los(viewer,{x:q.x2,y:q.y2})))continue;cx.strokeStyle=q.c;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(q.x,q.y);cx.lineTo(q.x2,q.y2);cx.stroke();}
  for(const q of G.hns.phEffects||[])if(canRender(viewer,q)){cx.strokeStyle=q.kind==='morph'?'#8df4d2':q.kind==='hit'?'#ebc083':'#d77d6f';cx.globalAlpha=Math.max(0,q.left/.45);cx.lineWidth=2;cx.beginPath();cx.arc(q.x,q.y,13+(1-q.left/.45)*20,0,7);cx.stroke();cx.globalAlpha=1;}
 }
 function drawActor(p){if(seeker(p))return false;drawObject({form:p.propForm,x:p.x,y:p.y,a:p.propAngle});if(p.team===G.me.team){cx.fillStyle='#a6e9d6';cx.textAlign='center';cx.font='11px system-ui';H.literal(cx,p===G.me?t('Ty'):nm(p),p.x,p.y-radius(p)-8);}return true;}
 function fitText(value,x,y,width){let size=12;cx.font=size+'px system-ui';while(size>9&&cx.measureText(value).width>width)cx.font=(--size)+'px system-ui';cx.fillText(value,x,y);}
 function drawHUD(x,w){const p=G.me;H.panel(x,477,w,73);cx.textAlign='left';cx.fillStyle=G.el<(p.phPenaltyUntil||0)?'#ff9186':'#e3e9dd';cx.font='bold 13px system-ui';cx.fillText(t('Zdrowie:')+' '+Math.ceil(p.hp)+' HP',x+14,499);cx.textAlign='right';cx.fillStyle='#a6c1c3';cx.font='11px system-ui';cx.fillText(t('TAB — tabela wyników'),x+w-14,499);cx.textAlign='left';cx.fillStyle='#c7d6d2';
  if(seeker(p)){fitText(t('LPM — strzał · R — przeładuj')+' · '+(p.rl>0?t('Przeładowanie…'):(p.ammo[p.cur]||0)+' / 12'),x+14,520,w-28);fitText(t('Trafienia:')+' '+(p.phHits||0)+' / '+(p.phShots||0)+' · '+t('Zwykły przedmiot: −5 HP'),x+14,538,w-28);}
  else{const source=nearest(p,{x:mouse.x/VIEW_ZOOM+cam.x,y:mouse.y/VIEW_ZOOM+cam.y}),form=D.models[p.propForm];fitText(t('Przebranie:')+' '+t(form?.name||'Przedmiot')+' · F — '+t(p.propLocked?'Obrót zablokowany':'Obrót swobodny'),x+14,520,w-28);fitText('R — '+(p.propMorph>0?t('Przemiana za')+' '+Math.ceil(p.propMorph)+'s':source?t('Zamień w')+' '+t(D.models[source.form].name):t('Podejdź do przedmiotu'))+' · '+t('E — zryw')+' '+(p.hnsCooldown>0?Math.ceil(p.hnsCooldown)+'s':t('Gotowy')),x+14,538,w-28);}
  if(seeker(p)&&G.el<(p.phHitUntil||0)){cx.strokeStyle='#baf4da';cx.lineWidth=2;for(const[a,b]of[[1,1],[-1,1],[1,-1],[-1,-1]]){cx.beginPath();cx.moveTo(mouse.x+a*7,mouse.y+b*7);cx.lineTo(mouse.x+a*13,mouse.y+b*13);cx.stroke();}}
 }
 function clientTick(dt){G.tr=G.tr.filter(q=>(q.t-=dt)>0);for(const p of G.ps){p.propMorph=Math.max(0,(p.propMorph||0)-dt);afterPlayer(p);}}
 const originalMove=mv;mv=function(p,dx,dy){return active()&&G.propWorld?move(p,dx,dy):originalMove(p,dx,dy);};
 MODES.push(['prophunt','Prop Hunt']);MI.push('◇');MD.push('Become scenery, blend in and survive the hunters');SLOTS.prophunt=10;
 root.SzPropHunt={active,ensure,initRound,input,tickPlayer,afterPlayer,tickWorld,bot,shoot,speed,canSee,canRender,drawWorld,drawActor,drawHUD,clientTick,serialize,restore,transform,nearest,observe,move,occupied,sprite,constants:{RANGE,DAMAGE,PENALTY}};
})(globalThis);
