/* Replays record positions at 10 Hz, never simulate a second goal. Clips travel
   once per goal; ordinary authoritative snapshots contain only a small ID. */
(function(root){'use strict';
 const A=SzMiniGames,D=SzMiniData,R=SzArcadeRules,t=s=>szLocale.t(s),esc=s=>workshopEscape(String(s));
 const overlay=document.createElement('section');overlay.id='sz-goal-replay';overlay.hidden=true;overlay.dataset.noTranslate='';$('game').append(overlay);
 let owner=null,serial=-1,history=new R.History(),cache=new Map(),sent=new Map(),playback=null,signature='',requestAt=0;
 function reset(){owner=G;serial=G?.mg?.serial??-1;history.reset();cache.clear();sent.clear();playback=null;signature='';requestAt=0;overlay.hidden=true;}
 function football(){return A.active()&&G.mg?.kind==='football';}
 function ensure(){if(owner!==G||serial!==(G?.mg?.serial??-1))reset();return football();}
 function remember(clip){cache.set(clip.id,clip);while(cache.size>2)cache.delete(cache.keys().next().value);}
 function record(){if(ensure()&&!G.client&&G.mg.phase==='live')history.record(G.el,G.mg.ball,G.ps);}
 function goal(team,credit){if(!ensure()||G.client)return;const m=G.mg;history.record(G.el,m.ball,G.ps,true);
  const clip={id:m.serial+':'+(G.sc.CT+G.sc.T)+':'+Math.round(G.el*1000),serial:m.serial,team,credit:{...credit},score:{...G.sc},roster:G.ps.map(p=>({name:String(nm(p)).slice(0,40),team:p.team,keeper:!!p.mgKeeper,agent:root.SzAgents?.forPlayer(p)?.id||null})),frames:history.copy()},available=R.validClip(clip);
  m.goalReplay={id:clip.id,available,team,scorer:credit.scorer,assist:credit.assist,ownGoal:credit.ownGoal,score:clip.score};
  if(available){remember(clip);if(L?.host&&NET.session)netSend({t:'mg_replay',clip});}
  history.reset();
 }
 function context(){if(!ensure())return null;const m=G.mg,meta=m.goalReplay;if(!meta||!['goal','result'].includes(m.phase)){if(playback)playback.complete=true;return null;}if(!meta.available)return null;
  if(!playback||playback.id!==meta.id){playback={id:meta.id,elapsed:Math.max(0,Number(m.phaseElapsed)||0),last:performance.now(),skipped:false,complete:false};signature='';}
  return{m,meta,clip:cache.get(meta.id),p:playback};
 }
 function duration(clip){return Math.min(3.9,(clip.frames.at(-1)[0]-clip.frames[0][0])/900);}
 function active(){const c=context();return !!(c?.clip&&!G.paused&&!c.p.skipped&&!c.p.complete&&c.p.elapsed>=.25&&c.p.elapsed<.25+duration(c.clip));}
 function skip(){const c=context();if(!c)return;c.p.skipped=true;overlay.hidden=true;mouse.d=mouse.r=0;keys[' ']=0;}
 function render(){const c=context();if(!c){overlay.hidden=true;return false;}const {m,meta,clip,p}=c,now=performance.now();if(!G.paused)p.elapsed+=Math.max(0,(now-p.last)/1000);p.last=now;
  if(G.client&&!G.over&&Math.abs(p.elapsed-m.phaseElapsed)>.35)p.elapsed=m.phaseElapsed;
  if(!clip&&G.client&&now-requestAt>800){requestAt=now;netSend({t:'mg_replay_get',id:meta.id,serial:m.serial});}
  const visible=active();overlay.hidden=!visible;if(!visible)return false;
  const progress=Math.max(0,Math.min(1,(p.elapsed-.25)/duration(clip))),frame=R.sample(clip,progress),zoom=Math.min(VW/D.WIDTH,640/D.HEIGHT)*1.1,vw=VW/zoom,vh=640/zoom;
  const sx=D.clamp(frame[1]/10-vw/2,Math.min(0,(D.WIDTH-vw)/2),Math.max(0,D.WIDTH-vw)),sy=D.clamp(frame[2]/10-vh/2,Math.min(0,(D.HEIGHT-vh)/2),Math.max(0,D.HEIGHT-vh));
  cx.fillStyle='#081a20';cx.fillRect(0,0,VW,640);cx.save();cx.scale(zoom,zoom);cx.translate(-sx,-sy);cx.drawImage(A.view.terrain('football'),0,0);
  for(let i=0;i<clip.roster.length;i++){const at=3+i*4;if(!frame[at+3])continue;const info=clip.roster[i],ghost={x:frame[at]/10,y:frame[at+1]/10,a:frame[at+2]/1000,alive:true,human:false,team:info.team,visualAgent:info.agent,cur:'knife',g:{}};drawBody(ghost);if(info.keeper||i===clip.credit.scorer){cx.beginPath();cx.arc(ghost.x,ghost.y,info.keeper?20:23,0,7);cx.strokeStyle=i===clip.credit.scorer?'#ffe0a0':'#e8d6a0';cx.lineWidth=i===clip.credit.scorer?2.2:1;cx.stroke();}cx.font='10px system-ui';cx.textAlign='center';cx.fillStyle=info.team==='CT'?'#a8d6fa':'#f5cf91';SzHideSeek.literal(cx,info.name,ghost.x,ghost.y+29);}
  cx.strokeStyle='#f1d99877';cx.lineWidth=2;cx.beginPath();const trail=clip.frames.filter(f=>f[0]<=frame[0]&&f[0]>frame[0]-450);trail.forEach((f,i)=>i?cx.lineTo(f[1]/10,f[2]/10):cx.moveTo(f[1]/10,f[2]/10));cx.lineTo(frame[1]/10,frame[2]/10);cx.stroke();A.view.drawBall(frame[1]/10,frame[2]/10);cx.restore();
  const key=clip.id+'|'+szLocale.language;if(signature!==key){signature=key;const scorer=clip.roster[clip.credit.scorer]?.name,assist=clip.roster[clip.credit.assist]?.name;overlay.innerHTML='<header><span class="ar-replay-label"><i></i>'+esc(t('Powtórka gola'))+'</span><span class="ar-replay-score"><b>'+clip.score.CT+'</b> : <b>'+clip.score.T+'</b></span><span>'+esc(t('Piłka nożna'))+'</span></header><footer><div><small>'+esc(t(clip.credit.ownGoal?'Gol samobójczy':scorer?'Strzelec gola':'Gol dla drużyny'))+'</small><strong data-user-content>'+esc(scorer||t(clip.team==='CT'?'Drużyna niebieska':'Drużyna pomarańczowa'))+'</strong>'+(assist?'<span>'+esc(t('Asysta'))+' · <b data-user-content>'+esc(assist)+'</b></span>':'')+'</div><button type="button" data-skip-goal-replay>'+esc(t('Pomiń'))+' <kbd>'+esc(t('Spacja'))+'</kbd></button></footer><div class="ar-replay-progress"><i></i></div>';overlay.querySelector('button').onclick=skip;}
  overlay.querySelector('.ar-replay-progress i').style.width=progress*100+'%';return true;
 }
 const receive=netRecv;netRecv=function(p){if(p?.v===2&&G&&p.c!==NET.cid&&p.sid===NET.session&&ensure()){
  if(p.t==='mg_replay'&&G.client&&acceptHost(p)&&(!p.to||p.to===NET.cid)){if(R.validClip(p.clip)&&p.clip.serial===G.mg.serial)remember(p.clip);return;}
  if(p.t==='mg_replay_get'&&!G.client&&NET.host&&roomPeer(p.c)){const clip=cache.get(p.id),now=performance.now();if(clip&&clip.id===G.mg.goalReplay?.id&&p.serial===G.mg.serial&&now-(sent.get(p.c)||-Infinity)>1000){sent.set(p.c,now);netSend({t:'mg_replay',to:p.c,clip});}return;}
 }return receive(p);};
 const draw=root.draw;root.draw=function(...args){if(render()){A.view.sync();return;}return draw(...args);};
 const quitBefore=quit;quit=function(...args){reset();return quitBefore(...args);};
 addEventListener('keydown',event=>{if((event.code==='Space'||event.key===' ')&&active()&&!event.target.closest?.('input,textarea,dialog')){event.preventDefault();event.stopImmediatePropagation();skip();}},true);
 root.SzFootballReplay={record,goal,reset,active,skip,render,clip:()=>cache.get(G?.mg?.goalReplay?.id)||null};
})(globalThis);
