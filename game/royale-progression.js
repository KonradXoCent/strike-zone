/* Server-recorded results and BR-only rank presentation. */
(function(root){'use strict';
 const D=ZRProgress,t=(pl,en)=>szLocale.language==='en'?en:pl,e=x=>workshopEscape(String(x??''));let synced=false;
 const notice=document.createElement('section');notice.className='zr-ranking-note';notice.dataset.noTranslate='';
 async function call(action,args={}){if(!sb||!SBU)throw Error('HUB_LOGIN');const {data,error}=await sb.rpc('zone_royale_progress',{action,args});if(error||!data?.state)throw Error(error?.message||'ZR_RESULT_NETWORK');return data;}
 async function refresh(){const uid=SBU?.id;if(!uid)return false;try{const data=await call('profile');if(uid!==SBU?.id)return false;D.apply(P(),data.state);synced=true;hdr();if(T==='prof')tab('prof');return true;}catch{return false;}}
 function render(){if(G)return;const card=document.querySelector('.royale-play-card');if(!card||SzRoyaleMatchmaking.active())return;const p=P(),s=D.stats(p),r=D.rank(p,szLocale.language),ranked=SzRoyaleExpansion.config().ranked;notice.innerHTML='<img src="'+D.rankImage(p)+'" alt=""><div><b>'+e(D.rankName(p,szLocale.language))+'</b><small>'+e(ranked?t('Punkty za miejsce, eliminacje i przetrwanie.','Points for placement, eliminations and survival.'):t('Graj swobodnie — ten mecz nie zmienia rangi.','Play freely — this match does not change your rank.'))+'</small>'+(ranked?'<small>'+t('Wejście −20 RP · zwycięstwo +100 · eliminacja +10','Entry −20 RP · victory +100 · elimination +10')+'</small>':'')+(r.next&&s.rankedMatches?'<progress max="'+(r.next-r.points)+'" value="'+(s.points-r.points)+'"></progress>':'')+'</div>';card.querySelector('.royale-format')?.after(notice);}
 const ready=root.szGameAccountReady;root.szGameAccountReady=function(){ready?.();refresh();};
 const renderBefore=SzRoyale.render;SzRoyale.render=function(){const r=renderBefore();render();return r;};
 const round=brRound;brRound=function(){const r=round();G.zrRankBefore=D.stats(P()).points;return r;};
 const check=chk;chk=function(){const p=P(),s=D.stats(p);const before=s.bd.length;for(const id of D.badgeIds(s))if(!s.bd.includes(id)){s.bd.push(id);toast(t('Osiągnięcie Royale: ','Royale achievement: ')+ACH.find(a=>a[0]===id)?.[2]);}if(s.bd.length!==before)save();};
 // Strike's quests/pass/ranking are never advanced by the BR engine.
 qp=bpXP=()=>{};lbPush=()=>{};lbLoad=()=>{tab('prof');};
 function summary(g){return(SzRoyaleMatchmaking.active()?.latest?.roster||[]).map(member=>{const p=g.ps.find(a=>a.rid===member.cid||a.human&&member.cid===NET.cid);if(!p)throw Error('ZR_RESULT_ROSTER');return{cid:member.cid,place:g.royalePlaces?.[p.team]||1,kills:Math.max(0,p.k|0),deaths:Math.max(0,p.d|0),seconds:Math.floor(p.zrSurvived||0),cards:p.zrCollected||0,reboots:p.zrReboots||0};});}
 async function settle(g){const queue=SzRoyaleMatchmaking.active(),uid=SBU?.id;if(!queue?.latest||!uid)return;const match=queue.latest.id;
  for(let attempt=0;attempt<4;attempt++){try{const data=g.client?await call('profile'):await call('finish',{match,players:summary(g)});if(uid!==SBU?.id)return;if(data.state.lastMatch!==match){await new Promise(r=>setTimeout(r,650));continue;}D.apply(P(),data.state);save();hdr();if(G===g){const out=$('zr-rank-result');if(out){const delta=Number(data.state.lastDelta)||0;out.textContent=queue.config.ranked?(delta>0?'+':'')+delta+' RP · '+D.rankName(P(),szLocale.language):t('Mecz nierankingowy · ranga bez zmian','Unranked match · rank unchanged');out.classList.add('saved');}}return;}catch{await new Promise(r=>setTimeout(r,650));}}
  if(G===g){const out=$('zr-rank-result');if(out)out.textContent=t('Nie udało się potwierdzić wyniku. Spróbuj ponownie.','Could not confirm the result. Try again.');}
 }
 const end=endG;endG=function(...args){const g=G,result=end(...args);if(!g||!g.over||g.zrSettled)return result;g.zrSettled=true;const out=document.createElement('p');out.id='zr-rank-result';out.dataset.noTranslate='';out.textContent=t('Zapisywanie wyniku Zone Royale…','Recording your Zone Royale result…');$('ov').append(out);g.zrResultPromise=settle(g);return result;};
 const back=SzRoyale.returnLobby;SzRoyale.returnLobby=async function(){if(G?.zrResultPromise)await G.zrResultPromise;return back();};
 document.addEventListener('sz-language',()=>{ACH.splice(0,ACH.length,...D.rows(szLocale.language));if(T==='prof')tab('prof');render();});
 root.ZRRanking={refresh,render,settle,synced:()=>synced};render();if(root.szDesktopCloudReady?.())refresh();
})(globalThis);
