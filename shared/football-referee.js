/* The referee is scenery owned by the host, never a player or a collider. */
(function(root){'use strict';
 const A=SzMiniGames,D=SzMiniData,active=()=>A.active()&&G.mg?.kind==='football';
 let game=null,serial=-1,runner=null;
 function safe(x,y){
  for(let i=0;i<100;i++){
   const radius=i?Math.sqrt(i)*13:0,angle=i*2.399963;
   const p={x:D.clamp(x+Math.cos(angle)*radius,130,D.WIDTH-130),y:D.clamp(y+Math.sin(angle)*radius,110,D.HEIGHT-110)};
   if(!SzPropData.wallCollision(GR,p.x,p.y,12))return p;
  }
  return null;
 }
 function ensure(){
  if(!active())return null;
  const m=G.mg;
  if(G.client)return m.referee||null;
  if(!m.referee||m.referee.serial!==m.serial){
   const p=safe(D.WIDTH/2,D.HEIGHT/2+130)||{x:160,y:160};
   m.referee={...p,a:-Math.PI/2,walk:0,side:1,serial:m.serial,signal:false,card:false};
  }
  if(game!==G||serial!==m.serial){
   game=G;serial=m.serial;
   runner={...m.referee,team:'REF',alive:true,mgKeeper:false,mgSlow:0,mgDash:0,mgBrain:{stuck:0},pth:null,npt:0};
  }
  return m.referee;
 }
 function step(dt){
  const r=ensure();if(!r||G.client||G.paused||G.over||dt<=0)return;
  const m=G.mg,b=m.ball;
  if(b.y>D.HEIGHT/2+160)r.side=-1;else if(b.y<D.HEIGHT/2-160)r.side=1;
  const spot=m.restart?.spot||b;
  const target=safe(spot.x+(b.vx>50?-85:b.vx<-50?85:0),spot.y+r.side*125);
  Object.assign(runner,{x:r.x,y:r.y,mgDash:target&&Math.hypot(target.x-r.x,target.y-r.y)>280?.1:0});
  if(target&&Math.hypot(target.x-r.x,target.y-r.y)>18)A.go(runner,target,Math.min(.05,dt));
  const moved=Math.hypot(runner.x-r.x,runner.y-r.y);
  r.x=runner.x;r.y=runner.y;r.walk+=moved*.22;
  r.a=Math.atan2(spot.y-r.y,spot.x-r.x);
  r.signal=!!m.restart;r.card=!!m.restart&&m.restart.yellow>=0;
 }
 function draw(){
  const r=ensure();if(!r)return;
  cx.save();cx.translate(r.x,r.y);cx.rotate(r.a);
  cx.fillStyle='#0005';cx.beginPath();cx.ellipse(2,4,11,15,0,0,7);cx.fill();
  // Black shorts/boots and a yellow shirt match the game's top-down bodies.
  const stride=Math.sin(r.walk)*2.8;
  cx.strokeStyle='#161c22';cx.lineWidth=5;cx.lineCap='round';
  cx.beginPath();cx.moveTo(-5,-5);cx.lineTo(-10+stride,-7);cx.moveTo(-5,5);cx.lineTo(-10-stride,7);cx.stroke();
  cx.fillStyle='#f4d23f';cx.strokeStyle='#665921';cx.lineWidth=1.4;
  cx.beginPath();cx.ellipse(-1,0,7.8,12,0,0,7);cx.fill();cx.stroke();
  cx.strokeStyle='#f4d23f';cx.lineWidth=5;
  cx.beginPath();cx.moveTo(0,-10);cx.lineTo(8,-13-stride*.5);cx.moveTo(0,10);cx.lineTo(r.signal?12:7,r.signal?19:13+stride*.5);cx.stroke();
  cx.fillStyle='#d7ad87';
  for(const p of [[9,-13-stride*.5],[r.signal?13:8,r.signal?20:13+stride*.5]]){cx.beginPath();cx.arc(p[0],p[1],2.8,0,7);cx.fill();}
  cx.fillStyle='#222a2f';cx.fillRect(-5,-10,2,20);cx.fillRect(5,-6,2,12);
  cx.fillStyle='#d7ad87';cx.beginPath();cx.arc(2,0,6.2,0,7);cx.fill();
  cx.fillStyle='#30291f';cx.beginPath();cx.arc(1,0,5.6,Math.PI*.45,Math.PI*1.55);cx.fill();
  cx.fillStyle='#182128';cx.fillRect(8,-1.5,3,3);
  if(r.card){cx.fillStyle='#ffe94b';cx.strokeStyle='#171e25';cx.lineWidth=1.4;cx.fillRect(11,19,7,10);cx.strokeRect(11,19,7,10);}
  cx.restore();cx.save();cx.textAlign='center';cx.font='bold 9px system-ui';cx.fillStyle='#ffe66b';cx.shadowColor='#102118';cx.shadowBlur=3;cx.fillText(szLocale.t('Sędzia'),r.x,r.y+29);cx.restore();
 }
 const previous=upd;upd=function(dt){const g=G,at=G?.el||0;const result=previous(dt);if(G===g&&active())step(Math.max(0,(G.el||0)-at));return result;};
 root.SzFootballReferee={active,ensure,step,draw};
})(globalThis);
