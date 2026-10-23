/* Keep the game's moving reticle, using relative movement while the OS cursor is locked. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzGameInput=api;api.mount(root);}})(globalThis,function(){
 'use strict';
 function move(point,dx,dy,width,height,rect){const finite=n=>Number.isFinite(n)?n:0;return{x:Math.max(0,Math.min(width,finite(point.x)+finite(dx)*width/Math.max(1,rect.width))),y:Math.max(0,Math.min(height,finite(point.y)+finite(dy)*height/Math.max(1,rect.height)))};}
 function mount(root){
  const t=s=>root.szLocale?.t(s)||s,canvas=$('cv'),game=$('game');let pending=false,failed=false,wasLocked=false,expectedExit=false,requestId=0,timeout,gestureTimer,gesture='',escapeUntil=0,rect=canvas.getBoundingClientRect();
  const enabled=()=>ST_().pointerLock!==0,locked=()=>document.pointerLockElement===canvas;
  const visible=id=>{const e=$(id);return !!e&&!e.hidden&&e.style.display!==''&&e.style.display!=='none';};
  function playable(){return !!G&&!G.spectator&&!game.hidden&&!G.paused&&!G.intro&&!G.over&&!visible('buy')&&!visible('ov')&&!visible('pm')&&!root.document.querySelector('dialog[open]')&&!document.querySelector('#br-map:not([hidden])');}
  function clear(){keys={};mouse.d=mouse.r=0;if(G?.client)netSend({t:'in',k:{w:false,a:false,s:false,d:false,e:false},an:G.me.a||0,nd:G.me.nd||null,f:false});}
  function release(){requestId++;pending=false;clearTimeout(timeout);if(locked()&&!expectedExit){expectedExit=true;document.exitPointerLock?.();}clear();}
  const hint=document.createElement('button');hint.id='sz-mouse-capture';hint.type='button';hint.hidden=true;hint.dataset.noTranslate='';game.append(hint);
  function sync(){const active=playable();game.classList.toggle('sz-compact-hud',!!G&&['prophunt','minigames','football'].includes(sel.mode));if((locked()||pending)&&(!active||!enabled()))release();canvas.classList.toggle('sz-game-aim',active);const hidden=!active||!enabled()||locked();if(hint.hidden!==hidden)hint.hidden=hidden;const text=failed?t('Mysz nie została przechwycona. Kliknij, aby spróbować ponownie.'):t('Kliknij, aby przechwycić mysz');if(hint.dataset.text!==text){hint.dataset.text=text;hint.replaceChildren(document.createTextNode(text),Object.assign(document.createElement('small'),{textContent:t('Escape — menu i zwolnienie myszy')}));}}
  function reject(id){if(id!==requestId)return;pending=false;failed=true;clearTimeout(timeout);sync();}
  function request(){if(!playable()||!enabled()||locked()||pending)return;clear();rect=canvas.getBoundingClientRect();pending=true;failed=false;const id=++requestId;try{if(!canvas.requestPointerLock){reject(id);return;}const result=canvas.requestPointerLock();if(result&&typeof result.catch==='function')result.catch(()=>reject(id));timeout=setTimeout(()=>{if(!locked())reject(id);},2000);}catch{reject(id);}sync();}
  hint.onclick=request;
  document.addEventListener('pointerlockchange',()=>{const now=locked(),lost=wasLocked&&!now,intentional=expectedExit;wasLocked=now;expectedExit=false;pending=false;clearTimeout(timeout);
   if(now){failed=false;rect=canvas.getBoundingClientRect();if(!playable()||!enabled())release();}
   else if(lost){clear();if(!intentional&&playable()){escapeUntil=performance.now()+300;togglePause();}}sync();
  });
  document.addEventListener('pointerlockerror',()=>reject(requestId));
  canvas.addEventListener('mousedown',e=>{if(!playable()){clear();e.stopImmediatePropagation();return;}if(enabled()&&!locked()&&!failed){if(e.button===0)request();e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('mousemove',e=>{if(!locked())return;const next=move(mouse,e.movementX,e.movementY,VW,640,rect);mouse.x=next.x;mouse.y=next.y;});
  // Target handlers keep working in forms; gameplay's window handlers never see typing.
  document.addEventListener('keydown',e=>{if(!G)return;const form=e.target.closest?.('input,textarea,select,[contenteditable="true"],dialog');if(form||(e.key!=='Escape'&&!playable()&&e.key.toLowerCase()!=='b')){clear();e.stopPropagation();}});
  function markGesture(kind){gesture=kind;clearTimeout(gestureTimer);gestureTimer=setTimeout(()=>gesture='',0);}
  addEventListener('keydown',e=>{markGesture('key');if(e.key==='Escape'&&(locked()||performance.now()<escapeUntil)){e.preventDefault();e.stopImmediatePropagation();escapeUntil=performance.now()+300;if(locked()&&playable())togglePause();release();sync();}},true);
  addEventListener('keyup',e=>{if(e.key==='Escape')escapeUntil=0;},true);
  addEventListener('click',()=>markGesture('click'),true);
  function wrap(name,fn){const old=root[name];if(typeof old==='function')root[name]=function(...args){return fn(old,this,args);};}
  for(const name of['togglePause','skipIntro','showBuy','brToggleMap'])wrap(name,(old,self,args)=>{const before=playable(),result=old.apply(self,args);sync();if(!before&&playable()&&gesture&&(name!=='togglePause'||gesture==='click'))request();return result;});
  for(const name of['begin0','beginClient'])wrap(name,(old,self,args)=>{failed=false;const result=old.apply(self,args);sync();return result;});
  wrap('quit',(old,self,args)=>{release();const result=old.apply(self,args);sync();return result;});
  wrap('fit',(old,self,args)=>{const width=VW,result=old.apply(self,args);mouse.x=Math.max(0,Math.min(VW,mouse.x*VW/Math.max(1,width)));mouse.y=Math.max(0,Math.min(640,mouse.y));rect=canvas.getBoundingClientRect();return result;});
  function blur(){release();if(playable())togglePause();sync();}addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur();});
  const observer=new MutationObserver(sync),observed=new WeakSet();function watch(e){if(!e||observed.has(e))return;observed.add(e);observer.observe(e,{subtree:true,attributes:true,attributeFilter:['hidden','style','open']});}
  watch(game);watch($('pm'));watch($('br-map'));document.querySelectorAll('dialog').forEach(watch);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1){if(n.matches('dialog'))watch(n);n.querySelectorAll('dialog').forEach(watch);}sync();}).observe(document.body,{childList:true});
  const oldSettings=setTab;function settings(target){if(target.querySelector('[data-pointer-settings]'))return;const panel=document.createElement('section');panel.className='box';panel.dataset.pointerSettings='';panel.dataset.noTranslate='';panel.innerHTML='<h3>'+t('Sterowanie myszą')+'</h3><label><input type="checkbox" data-pointer-lock '+(enabled()?'checked':'')+'> '+t('Przechwytuj mysz podczas gry')+'</label><p>'+t('Kursor pozostaje w oknie gry. Escape otwiera menu i zwalnia mysz; zakupy i rozmowy również ją zwalniają.')+'</p>';panel.querySelector('input').onchange=e=>root.SzGameInput.setEnabled(e.target.checked);target.append(panel);}
  setTab=function(mm){const result=oldSettings(mm);settings(mm?.nodeType?mm:$('main'));return result;};
  document.addEventListener('sz-language',()=>{for(const panel of document.querySelectorAll('[data-pointer-settings]')){const target=panel.parentElement;panel.remove();settings(target);}hint.dataset.text='';sync();});
  Object.assign(root.SzGameInput,{enabled,locked,playable,request,release,sync,setEnabled(value){ST_().pointerLock=value?1:0;failed=false;save();sync();for(const el of document.querySelectorAll('[data-pointer-lock]'))el.checked=!!value;}});sync();
 }
 return{move,mount};
});
