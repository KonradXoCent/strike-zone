/* Small synthesized game sounds: no downloads or per-frame audio allocations. */
(function(root){'use strict';
 const custom=new Set(['kick','goal','whistle','snowthrow','snowhit','laser','taunt','caseTick','caseWin','card','steal','upgradeStart','contractStart','workshopTick','upgradeWin','upgradeFail','contractWin']),times=new Map();
 const previous=snd;snd=function(type,x,y,k){if(type==='shot'&&sel.mode==='laser')type='laser';if(SzSettings.get().muteUnfocused&&!document.hasFocus())return;if(!custom.has(type))return previous(type,x,y,k);if(!AC||MUTE||AC.state!=='running')return;const now=AC.currentTime,dt=type==='caseTick'?.045:type==='laser'?.035:.06;if(now-(times.get(type)||-10)<dt)return;times.set(type,now);let gain=(Number(ST_().sfx)||0)*.2;
  if(G&&Number.isFinite(x)&&Number.isFinite(y))gain*=Math.max(0,1-Math.hypot(x-(G.me?.x||0),y-(G.me?.y||0))/1000);if(gain<.001)return;
  const tone=(a,b,dur,delay=0,wave='sine',level=1)=>{const o=AC.createOscillator(),g=AC.createGain(),at=now+delay;o.type=wave;o.frequency.setValueAtTime(a,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,b),at+dur);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain*level,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(AC.destination);o.start(at);o.stop(at+dur+.01);};
  if(type==='upgradeStart'){tone(140,700,.5,0,'triangle',.55);tone(220,1100,.36,.08,'sine',.25);}
  else if(type==='contractStart'){tone(110,55,.18,0,'triangle',.8);[262,330,392].forEach((f,i)=>tone(f,f,.28,.07+i*.04,'triangle',.3));}
  else if(type==='workshopTick'){const pitch=500+clampProgress(k)*900;tone(pitch,pitch*.72,.045,0,'triangle',.22);}
  else if(type==='upgradeWin'){[523,659,784,1047,1319].forEach((f,i)=>tone(f,f*1.005,.38,i*.085,'triangle',.62));tone(1047,2093,.65,.23,'sine',.18);}
  else if(type==='upgradeFail'){tone(330,90,.42,0,'sawtooth',.25);tone(180,55,.5,.1,'triangle',.6);tone(95,70,.18,.38,'triangle',.5);}
  else if(type==='contractWin'){[392,523,659,784,1047].forEach((f,i)=>tone(f,f,.5,i*.075,'sine',.6));tone(180,360,.45,0,'triangle',.2);}
  else if(type==='kick'){tone(180,42,.1,0,'triangle',1.4);tone(1100,300,.025,0,'triangle',.25);}else if(type==='goal'){[523,659,784,1047].forEach((f,i)=>tone(f,f,.45,i*.13,'triangle',.8));tone(180,240,.7,.05,'sawtooth',.15);}else if(type==='whistle'||type==='card'){tone(2100,1950,.22,0,'sine',.45);tone(2200,2000,.25,.29,'sine',.45);}else if(type==='laser'){tone(1500,130,.16,0,'sawtooth',.5);tone(3100,700,.08,0,'sine',.25);}else if(type==='snowthrow'){tone(700,240,.1,0,'triangle',.35);}else if(type==='snowhit'){tone(370,80,.08,0,'triangle',.65);}else if(type==='taunt'){[520,780,520,1040].forEach((f,i)=>tone(f,f*.8,.14,i*.12,'square',.35));}else if(type==='caseTick')tone(1200,800,.025,0,'triangle',.25);else if(type==='caseWin')[392,494,587,784].forEach((f,i)=>tone(f,f,.45,i*.1,'triangle',.6));else tone(400,160,.09,0,'triangle',.5);
 };
 const begin=SzMiniGames.beginGame;SzMiniGames.beginGame=function(...args){const r=begin(...args);if(r)snd('whistle');return r;};
 const action=SzMiniGames.action;SzMiniGames.action=function(...args){const p=args[0],kind=G?.mg?.kind,r=action(...args);if(r&&kind!=='football')snd(kind==='snow'?'snowthrow':'throw',p.x,p.y);return r;};
 const lastGoals={CT:0,T:0};let gameRef;
 function events(){if(G!==gameRef){gameRef=G;lastGoals.CT=G?.sc?.CT||0;lastGoals.T=G?.sc?.T||0;}if(G?.mg?.kind==='football'){for(const team of['CT','T']){if(G.sc[team]>lastGoals[team])snd('goal');lastGoals[team]=G.sc[team];}}}
 const update=upd;upd=function(dt){const r=update(dt);events();return r;};const apply=applySnap;applySnap=function(s){const r=apply(s);events();return r;};
 let rollTimer=null;const present=showCasePresentation;showCasePresentation=function(...args){if(SzSettings.get().reducedMotion)args[1]=true;const r=present(...args);if(CASE_PRESENTATION?.spinning){clearInterval(rollTimer);rollTimer=setInterval(()=>{if(!CASE_PRESENTATION?.spinning){clearInterval(rollTimer);return;}snd('caseTick');},110);}return r;};const reveal=caseShowResult;caseShowResult=function(){const spinning=CASE_PRESENTATION?.spinning,r=reveal();if(spinning){clearInterval(rollTimer);snd('caseWin');}return r;};

 function clampProgress(value){return Math.max(0,Math.min(1,Number(value)||0));}
 const animate=workshopAnimate;
 workshopAnimate=function(transaction){
  const result=animate(transaction),state=workshopState(),owner=DB.cur,started=performance.now();
  if(!state.busy||!['upgrade','contract'].includes(transaction.kind))return result;
  const current=()=>WORKSHOP_UI===state&&DB.cur===owner;
  initAudio();const start=()=>{if(current()&&state.busy)snd(transaction.kind==='contract'?'contractStart':'upgradeStart');};
  if(AC?.state==='suspended')AC.resume().then(start).catch(()=>{});else start();
  const tick=setInterval(()=>{if(!current()||!state.busy){clearInterval(tick);return;}if(T==='inv'&&INV===(transaction.kind==='contract'?'contracts':'upgrader'))snd('workshopTick',undefined,undefined,(performance.now()-started)/WORKSHOP_DURATION);},140);
  setTimeout(()=>{clearInterval(tick);if(!current()||state.busy)return;if(T==='inv'&&INV===(transaction.kind==='contract'?'contracts':'upgrader'))snd(transaction.success?(transaction.kind==='contract'?'contractWin':'upgradeWin'):'upgradeFail');},WORKSHOP_DURATION+20);
  return result;
 };

 root.SzAudioPlus={events};
})(globalThis);
