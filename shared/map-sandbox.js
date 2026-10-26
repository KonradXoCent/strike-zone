/* Owner-only local map inspection. Its movement controls never run in a match. */
(function(root){'use strict';
 const t=(pl,en)=>szLocale.language==='en'?en:pl,allowed=()=>root.SzCoreMaps?.testing(),solo=()=>allowed()&&G.coreSandbox===true;
 const FLY_SPEED=320;let state=null;const bar=document.createElement('div');bar.className='core-test-tools';bar.hidden=true;bar.dataset.noTranslate='';$('game').append(bar);
 function noclip(p=G?.me){return !!(allowed()&&state?.game===G&&state.on&&p===G.me);}
 function safePoint(p){if(!hitW(p.x,p.y))return{x:p.x,y:p.y};for(let radius=12;radius<=240;radius+=12)for(let i=0;i<24;i++){const a=i*Math.PI/12,x=p.x+Math.cos(a)*radius,y=p.y+Math.sin(a)*radius;if(x>R&&y>R&&x<WW-R&&y<WH-R&&!hitW(x,y))return{x,y};}return state.safe;}
 function toggle(){if(!allowed()||G.paused||G.intro||G.over)return false;const p=G.me;if(state?.game!==G)state={game:G,on:false,safe:{x:p.x,y:p.y},inv:p.inv||0};if(state.on){const q=safePoint(p);p.x=q.x;p.y=q.y;p.inv=solo()?999:state.inv;state.on=false;}else{state.safe=safePoint(p);state.inv=p.inv||0;state.on=true;p.ap=0;p.inv=999;}mount();return state.on;}
 function mount(){bar.hidden=!allowed();if(bar.hidden)return;if(state?.game!==G)state={game:G,on:false,safe:{x:G.me.x,y:G.me.y},inv:G.me.inv||0};
  bar.innerHTML='<b>'+t('TEST MAPY','MAP TEST')+' · '+t(solo()?'bez botów':'z botami',solo()?'no bots':'with bots')+'</b><button type="button" data-test-noclip class="'+(state.on?'active':'')+'">N · '+t('Noclip: ','Noclip: ')+t(state.on?'WŁ.':'WYŁ.',state.on?'ON':'OFF')+'</button>'+(solo()?'<select data-test-weapon aria-label="'+t('Broń do testu','Test weapon')+'">'+['knife',...GUNS].filter(k=>W[k]).map(k=>'<option value="'+k+'" '+(G.me.cur===k?'selected':'')+'>'+esc(W[k].n)+'</option>').join('')+'</select>':'')+'<button type="button" data-test-back>'+t('Wróć do edytora','Back to editor')+'</button><small>'+t('WASD — ruch · N — noclip · E — drzwi','WASD — move · N — noclip · E — doors')+'</small>';
  bar.querySelector('[data-test-noclip]').onclick=toggle;bar.querySelector('[data-test-back]').onclick=()=>quit();const weapons=bar.querySelector('[data-test-weapon]');if(weapons)weapons.onchange=()=>{const p=G.me,k=weapons.value;if(!solo()||!W[k])return;p.cur=k;if(k!=='knife'){if(W[k].slot===1)p.sec=k;else p.pri=k;p.ammo[k]=999;}p.cd=p.rl=0;p.nd=null;};
 }
 function startSolo(){if(!allowed())return false;const g=G,p=g.me;if(g.intro)skipIntro();g.coreSandbox=true;g.ps=[p];g.paused=false;g.intro=null;g.ph='live';g.t=3600;g.over=false;g.voting=1;g.bo=0;g.nobuy=1;g.msg=g.msg2='';g.pl=null;g.bomb=null;
  Object.assign(p,{human:true,alive:true,hp:100,mh:100,armor:100,inv:999,ap:0,burn:0,nd:null,cur:'m4',pri:'m4',sec:'deagle',ammo:{m4:999,deagle:999},cd:0,rl:0,g:{frag:5,smoke:5,flash:5,molo:5}});if(g.mg){g.mg.phase='live';g.mg.time=3600;}if(g.obj)g.obj.phase='live';if(hitW(p.x,p.y))unstick(p);$('buy').style.display='none';$('ov').style.display='none';mount();root.SzGameInput?.sync();return true;}
 const move=mv;mv=function(p,dx,dy){if(!noclip(p))return move(p,dx,dy);p.x=Math.max(R,Math.min(WW-R,p.x+dx));p.y=Math.max(R,Math.min(WH-R,p.y+dy));};
 function aim(){const p=G.me;p.a=Math.atan2(mouse.y/VIEW_ZOOM+cam.y-p.y,mouse.x/VIEW_ZOOM+cam.x-p.x);}
 function soloStep(dt){const g=G,p=g.me;dt=Math.max(0,Math.min(.05,Number(dt)||0));if(!dt||g.paused)return;g.el=(g.el||0)+dt;g.t=3600;p.hp=100;p.inv=999;p.cd=Math.max(0,p.cd-dt);if(p.rl>0){p.rl=Math.max(0,p.rl-dt);if(!p.rl&&W[p.cur]?.mag)p.ammo[p.cur]=999;}
  const dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0),n=Math.hypot(dx,dy)||1,speed=noclip()?FLY_SPEED:195*wsp(p.cur);mv(p,dx/n*speed*dt,dy/n*speed*dt);aim();if(mouse.d&&!p.nd)CORE_MAP_WEAPON_FIRE(p);
  g.tr=g.tr.filter(a=>(a.t-=dt)>0);g.feed=g.feed.filter(a=>(a.t-=dt)>0);for(const q of g.gl){q.t-=dt;const x=q.x+q.vx*dt,y=q.y+q.vy*dt;if(wallAt(x,q.y))q.vx*=-.6;else q.x=x;if(wallAt(q.x,y))q.vy*=-.6;else q.y=y;const friction=Math.exp(-2.5*dt);q.vx*=friction;q.vy*=friction;if(q.t<=0)boom(q);}g.gl=g.gl.filter(q=>!q.dead);g.sm=g.sm.filter(s=>(s.t-=dt)>0);g.fi=g.fi.filter(f=>(f.t-=dt)>0);root.SzBreakables?.tick(dt);root.SzDoors?.tick(dt);
 }
 const update=upd;upd=function(dt){if(!allowed()){bar.hidden=true;state=null;return update(dt);}if(state?.game!==G)mount();if(solo())return soloStep(dt);
  if(!noclip())return update(dt);const g=G,p=g.me,previous=keys,at={x:p.x,y:p.y};try{keys={...keys,w:0,a:0,s:0,d:0};p.inv=999;update(dt);}finally{keys=previous;}if(G===g&&!g.paused){p.x=at.x;p.y=at.y;const dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0),n=Math.hypot(dx,dy)||1;mv(p,dx/n*FLY_SPEED*dt,dy/n*FLY_SPEED*dt);p.inv=999;aim();}};
 const fireBefore=fire;fire=function(p,...args){if(solo()&&p===G.me)return CORE_MAP_WEAPON_FIRE(p);return fireBefore(p,...args);};
 const fog=drawFog;drawFog=function(...args){if(noclip())return;return fog(...args);};
 const exit=quit;quit=function(...args){bar.hidden=true;state=null;return exit(...args);};
 addEventListener('keydown',ev=>{if(ev.code!=='KeyN'||ev.repeat||!allowed()||ev.target.closest?.('input,textarea,select,dialog,[contenteditable="true"]'))return;ev.preventDefault();ev.stopImmediatePropagation();toggle();},true);
 document.addEventListener('sz-language',()=>{if(allowed())mount();});
 root.SzMapSandbox={mount,startSolo,toggle,noclip,active:allowed,solo};
})(globalThis);
