/* Mode-specific community maps, unique account likes and server-verified play
   sessions. The renderer never grants owner rights or writes popularity totals. */
(function(){'use strict';
 const defaults={enabled:true,min_plays:50,min_likes:10,slots_per_mode:1};
 const state={owner:null,epoch:0,liked:new Set(),policy:{...defaults},busy:new Set(),mode:'all',sort:'popular',runs:new Set(),moderationVersion:0};
 const t=s=>szLocale.t(s),esc=workshopEscape,number=n=>Math.max(0,Number(n)||0).toLocaleString(szLocale.language==='en'?'en-US':'pl-PL');
 const modeName=mode=>t(({tdm:'Team Deathmatch',classic:'Rozbrajanie bomby',ctf:'Capture the Flag',football:'Piłka nożna',zombie:'Zombie',prophunt:'Prop Hunt'})[mode]||'Team Deathmatch');
 function noun(value,type){const n=Number(value)||0;if(szLocale.language==='en')return type==='plays'?(n===1?'play':'plays'):(n===1?'like':'likes');const form=n===1?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2;return(type==='plays'?['zagranie','zagrania','zagrań']:['polubienie','polubienia','polubień'])[form];}
 const heart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
 function account(){const uid=SBU?.id||null;if(state.owner!==uid){state.owner=uid;state.epoch++;state.liked.clear();state.busy.clear();state.runs.clear();syncing=null;sequence++;}return uid;}
 function rpc(action,args={}){return sb.rpc('sz_workshop_map',{action,args}).then(r=>{if(r.error)throw r.error;return r.data;});}
 function validPolicy(p){return p&&typeof p.enabled==='boolean'&&['min_plays','min_likes','slots_per_mode'].every(k=>Number.isSafeInteger(p[k])&&p[k]>0);}
 let syncing=null,sequence=0;
 async function sync(){
  account();if(syncing)return syncing;const epoch=state.epoch,ticket=++sequence;
  const task=(async()=>{try{const data=await rpc('state');if(epoch!==state.epoch||ticket!==sequence)return;
   if(validPolicy(data?.policy))state.policy=data.policy;state.moderationVersion=Number(data?.moderation_version)||0;
   state.liked=new Set((data?.liked||[]).filter(id=>COMMUNITY_UUID.test(id)));
   for(const row of COMMUNITY.rows.filter(r=>r.kind==='map'&&r.featured)){
    try{const release=await communityRelease(row.release_id);if(epoch!==state.epoch||ticket!==sequence)return;communityRegisterMap(release);}catch{/* A failed download leaves the built-in map pool available. */}
   }
  }catch{/* Catalog counts remain readable during a temporary RPC failure. */}
  if(epoch===state.epoch&&ticket===sequence&&T==='creator'){
   if(document.querySelector('.cw-page'))communityRender();else limitHints();
  }})();syncing=task;try{await task;}finally{if(syncing===task)syncing=null;}
 }
 function filtersHTML(){return `<select id="cw-mode-filter" aria-label="${esc(t('Tryb mapy'))}" data-workshop-mode>${[['all','Wszystkie tryby'],['tdm','Team Deathmatch'],['classic','Rozbrajanie bomby'],['ctf','Capture the Flag'],['football','Piłka nożna'],['zombie','Zombie'],['prophunt','Prop Hunt']].map(([v,n])=>`<option value="${v}" ${state.mode===v?'selected':''}>${esc(t(n))}</option>`).join('')}</select><select data-workshop-sort aria-label="${esc(t('Sortowanie map'))}">${[['popular','Popularne'],['plays','Najwięcej zagrań'],['likes','Najwięcej polubień'],['newest','Najnowsze']].map(([v,n])=>`<option value="${v}" ${state.sort===v?'selected':''}>${esc(t(n))}</option>`).join('')}</select>`;}
 function filter(rows,active){if(active!=='catalog')return rows;const out=rows.filter(r=>r.kind!=='map'||state.mode==='all'||(r.mode||'tdm')===state.mode);
  const score=r=>state.sort==='plays'?Number(r.plays)||0:state.sort==='likes'?r.likes||0:state.sort==='newest'?Date.parse(r.updated_at)||0:(r.likes||0)*state.policy.min_plays+(Number(r.plays)||0)*state.policy.min_likes;
  return out.slice().sort((a,b)=>score(b)-score(a)||String(a.id).localeCompare(String(b.id)));
 }
 function card(row){account();const liked=state.liked.has(row.id),p=state.policy;
  const counts=(plays,likes)=>`${number(plays)} ${noun(plays,'plays')} · ${number(likes)} ${noun(likes,'likes')}`;
  return `<div class="wm-map-data" data-no-translate><span class="wm-map-mode">${esc(modeName(row.mode))}</span><div class="wm-map-counts"><span><b>${number(row.plays)}</b><span>${noun(row.plays,'plays')}</span></span><span>${heart}<b>${number(row.likes)}</b><span>${noun(row.likes,'likes')}</span></span></div><small class="wm-review-counts">${esc(t('Gracze:'))} ${counts(row.player_plays??row.plays,row.player_likes??row.likes)}<br>${esc(t('Boty:'))} ${counts(row.bot_plays,row.bot_likes)}</small>${row.featured?`<span class="wm-featured">${esc(t('W głównej puli'))} · v${row.version}</span>`:row.pool_rule==='excluded'?`<span class="wm-excluded">${esc(t('Wyłączona z głównej puli'))}</span>`:p.enabled?`<small>${esc(t('Próg awansu:'))} <span>${number(p.min_plays)} ${noun(p.min_plays,'plays')} · ${number(p.min_likes)} ${noun(p.min_likes,'likes')}</span></small>`:''}<button type="button" class="wm-like ${liked?'liked':''}" data-workshop-like="${row.id}" aria-pressed="${liked}" ${!SBU||state.busy.has(row.id)?'disabled':''} title="${esc(t(SBU?'Jedno polubienie na konto. Możesz je cofnąć.':'Zaloguj się, aby polubić mapę.'))}">${heart}${esc(t(liked?'Lubisz to':'Polub mapę'))}</button></div>`;
 }
 function settingsHTML(){const p=state.policy;return `<section class="cr-card wm-policy"><h3>${esc(t('Awans map do głównej puli'))}</h3><p>${esc(t('Najpopularniejsze zatwierdzone mapy awansują do puli swojego trybu po osiągnięciu obu progów.'))}</p><form data-workshop-policy><label class="wm-check"><input name="enabled" type="checkbox" ${p.enabled?'checked':''}>${esc(t('Automatyczny awans'))}</label><div class="wm-policy-fields"><label>${esc(t('Minimum zagrań'))}<input name="min_plays" type="number" min="1" max="1000000" step="1" value="${p.min_plays}" required></label><label>${esc(t('Minimum polubień'))}<input name="min_likes" type="number" min="1" max="1000000" step="1" value="${p.min_likes}" required></label><label>${esc(t('Map w puli na tryb'))}<input name="slots_per_mode" type="number" min="1" max="5" step="1" value="${p.slots_per_mode}" required></label><button class="cr-primary" type="submit">${esc(t('Zapisz zasady awansu'))}</button></div></form><p>${esc(t('Ranking łączy polubienia i zagrania względem ustawionych progów. Wycofana mapa wypada z puli.'))}</p></section>`;}
 function limitHints(){for(const e of document.querySelectorAll('[data-workshop-limit]'))e.textContent=t(COMMUNITY.admin?'Konto właściciela: bez limitu zgłoszeń map i skinów.':'Limit zgłoszeń: 10 oczekujących i 10 wysłanych w ciągu 24 godzin.');}
 const refresh=communityRefresh;communityRefresh=async function(){const ok=await refresh();if(ok)await sync();return ok;};
 const render=communityRender;communityRender=function(){render();if(COMMUNITY.admin&&COMMUNITY.tab==='moderation'&&document.querySelector('.cw-page'))document.querySelector('.cw-toolbar')?.insertAdjacentHTML('afterend',settingsHTML());if(COMMUNITY.tab==='catalog')document.querySelector('.cw-page')?.insertAdjacentHTML('beforeend',`<p class="cw-note">${esc(t('Boty wypełniają wolne miejsca. Zagranie nalicza się po minucie aktywnej gry, najwyżej raz na gracza i mapę co 5 minut. W lobby liczy się mecz hosta.'))}</p>`);};
 const submitHTML=communitySubmitHTML;communitySubmitHTML=function(kind){return submitHTML(kind)+`<p class="cw-note" data-workshop-limit>${esc(t(COMMUNITY.admin?'Konto właściciela: bez limitu zgłoszeń map i skinów.':'Limit zgłoszeń: 10 oczekujących i 10 wysłanych w ciągu 24 godzin.'))}</p>`;};
 async function like(id){account();if(!SBU||state.busy.has(id)||!COMMUNITY.rows.some(r=>r.id===id&&r.kind==='map'))return;const epoch=state.epoch,want=!state.liked.has(id);state.busy.add(id);communityRender();
  try{await rpc('like',{item:id,liked:want});if(epoch!==state.epoch)return;if(want)state.liked.add(id);else state.liked.delete(id);syncing=null;sequence++;await communityRefresh();}
  catch{communityNotice(t('Nie udało się zapisać polubienia. Spróbuj ponownie.'),true);}
  finally{if(epoch===state.epoch){state.busy.delete(id);if(T==='creator'&&document.querySelector('.cw-page'))communityRender();}}
 }
 document.addEventListener('click',e=>{const button=e.target.closest('[data-workshop-like]');if(button&&!button.disabled)like(button.dataset.workshopLike);});
 document.addEventListener('change',e=>{if(e.target.matches('[data-workshop-mode]'))state.mode=e.target.value;else if(e.target.matches('[data-workshop-sort]'))state.sort=e.target.value;else return;COMMUNITY.page=0;communityRender();});
 document.addEventListener('submit',async e=>{if(!e.target.matches('[data-workshop-policy]'))return;e.preventDefault();if(!COMMUNITY.admin)return;const form=e.target,button=form.querySelector('button');button.disabled=true;
  const epoch=state.epoch,args={enabled:form.elements.enabled.checked};for(const k of ['min_plays','min_likes','slots_per_mode'])args[k]=Number(form.elements[k].value);
  try{await rpc('settings',args);if(epoch!==state.epoch)return;syncing=null;sequence++;await communityRefresh();communityNotice(t('Zapisano zasady awansu map.'));}
  catch{communityNotice(t('Nie udało się zapisać zasad awansu. Sprawdź wartości i połączenie.'),true);button.disabled=false;}
 });
 function makeRun(g){account();const ref=g?.communityMapRef;if(!g||!SBU||g.client||g.creatorTest||CREATOR_TEST||!ref)return;
  const bots=Math.min(10,g.ps.filter(p=>!p.human&&!p.rh&&!p.rid).length);
  const run={id:crypto.randomUUID(),uid:SBU.id,epoch:state.epoch,release:ref.release,mode:sel.mode,bots,seconds:0,started:false,busy:false,done:false,retryAt:0};g.workshopRun=run;state.runs.add(run);progress(run);
 }
 async function progress(run){account();if(run.done||run.busy||run.uid!==state.owner||run.epoch!==state.epoch||Date.now()<run.retryAt)return;run.busy=true;
  try{
   if(!run.started){const r=await rpc('start',{session:run.id,release:run.release,mode:run.mode,bots:run.bots});if(run.epoch!==state.epoch)return;run.started=true;if(r?.counted)run.done=true;}
   if(!run.done&&run.seconds>=60){const r=await rpc('finish',{session:run.id});if(run.epoch!==state.epoch)return;if(r?.retry_after)run.retryAt=Date.now()+Math.max(1,r.retry_after)*1000+150;else{run.done=true;run.botReview={plays:r?.bot_plays||0,likes:r?.bot_likes||0};if(r?.counted)communityRefresh();}}
  }catch{run.retryAt=Date.now()+10000;}finally{run.busy=false;if(run.done)state.runs.delete(run);}
 }
 const begin=begin0;begin0=function(){begin();if(G)makeRun(G);};
 const update=upd;upd=function(dt){const g=G,run=g?.workshopRun;if(run&&!g.paused&&!g.over&&!g.intro)run.seconds+=Math.max(0,Math.min(Number(dt)||0,.25));return update(dt);};
 const end=endG;endG=function(...args){if(G?.workshopRun)progress(G.workshopRun);COMMUNITY.explicitSelection=null;return end(...args);};
 const leave=quit;quit=function(){const run=G?.workshopRun;if(run){if(run.seconds>=60)progress(run);else{run.done=true;state.runs.delete(run);}}COMMUNITY.explicitSelection=null;return leave();};
 setInterval(()=>{account();for(const run of state.runs)progress(run);},1000);
 document.addEventListener('sz-language',()=>{if(T==='creator'&&document.querySelector('.cw-page'))communityRender();else limitHints();});
 window.SzWorkshopMaps={card,filter,filtersHTML,moderationReady:()=>state.moderationVersion>=1};
})();
