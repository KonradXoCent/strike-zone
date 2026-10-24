/* Inventory navigation and special-item presentation; rewards still commit once before animation. */
(function(root){'use strict';
 const t=s=>szLocale.t(s),e=s=>workshopEscape(String(s));
 const labels={pl:{rare:'Rzadki przedmiot specjalny',hint:'Losowy model noża i skin',empty:'Nie masz skrzynek z pasującym kluczem.'},en:{rare:'Rare special item',hint:'Random knife model and finish',empty:'You have no cases with a matching key.'}};
 const text=k=>labels[szLocale.language==='en'?'en':document.documentElement.lang==='en'?'en':'pl'][k];
 const special=()=>'<div class="sz-special-symbol" aria-hidden="true"><span>★</span><b>?</b></div>';
 const tabs=workshopTabs;workshopTabs=()=>tabs().replace('</div>','<button class="'+(INV==='cases'?'active':'')+'" onclick="invSet(\'cases\')">'+e(t('Skrzynki'))+'</button></div>');
 function cases(){const p=P(),ids=CI.filter(id=>CS[id]&&!SzHalloweenData.cases[id]&&p.cs?.[id]>0&&p.ks?.[id]>0);return workshopTabs()+'<section class="box sz-owned-cases" data-no-translate><h2>'+e(t('Skrzynki'))+'</h2><div class="grid">'+ids.map(id=>{const i=CI.indexOf(id);return '<article class="card" data-owned-case="'+id+'"><img src="'+caseImg(id,300,180)+'" alt=""><b>'+e(CS[id].n)+'</b><small>'+e(t('Skrzynki'))+': '+p.cs[id]+' · '+e(t('Klucze'))+': '+p.ks[id]+'</small><button class="pri" onclick="openC2('+i+')">'+e(t('Otwórz skrzynkę'))+'</button><button onclick="caseInfo('+i+')">'+e(t('Zawartość'))+'</button></article>';}).join('')+'</div>'+(!ids.length?'<p>'+e(text('empty'))+'</p>':'')+'</section>';}
 const inv=invTabs;invTabs=function(...args){if(INV==='cases'){$('main').innerHTML=cases();return;}return inv(...args);};
 function arrange(){if(T!=='inv')return;const m=$('main');m.querySelector('.sz-agent-case')?.remove();m.querySelector('.music-case')?.remove();m.querySelector('#preview-session-banner')?.remove();
  // Remove only case collections, retaining glove and weapon inventory cards.
  for(const b of m.querySelectorAll('button[onclick^="openC2("],button[onclick^="openBR("]'))if(INV!=='cases')b.closest('.box')?.remove();
  if(INV!=='w')return;const bar=m.querySelector('.w-tabs'),load=m.querySelector('#sz-loadout'),gloves=m.querySelector('.cosmetic-section'),toolbar=m.querySelector('#hub-inventory-toolbar'),empty=m.querySelector('#hub-inventory-empty'),skins=m.querySelector('#inventory-skins'),forge=m.querySelector('#forge-area');
  let last=bar;for(const node of[load,gloves,toolbar,empty,skins,forge])if(node&&last){if(last.nextElementSibling!==node)last.after(node);last=node;}
 }
 const tabBefore=tab;tab=function(...args){const r=tabBefore(...args);arrange();return r;};
 const forgeBefore=forgeMount;forgeMount=function(...args){const r=forgeBefore(...args);arrange();return r;};
 // Pick a model first, then a finish. All supported models participate without
 // models with more finishes receiving a larger share of special drops.
 const roll=rollC;rollC=function(id){const result=roll(id);if(!result?.startsWith('knife:')||SzHalloweenData.cases[id])return result;const models=[...new Set(K.map(k=>k.model||'classic'))],model=models[Math.random()*models.length|0],pool=K.map((k,i)=>({k,i})).filter(o=>(o.k.model||'classic')===model);return 'knife:'+pool[Math.random()*pool.length|0].i;};
 const card=caseStripCard;caseStripCard=function(id){if(!id?.startsWith('knife:'))return card(id);return '<div class="case-strip-card sz-rare-card" style="--item-color:#ffd157">'+special()+'<small>'+e(text('rare'))+'</small><b>'+e(text('hint'))+'</b></div>';};
 const info=caseInfo;caseInfo=function(i){const r=info(i),c=CS[CI[i]];if(!c||c.br||c.agent)return r;const cards=[...$('pm').querySelectorAll('.mc')].filter(n=>Object.values(KNIFE_MODELS).some(name=>n.querySelector('b')?.textContent.startsWith(name+' | ')));if(cards.length){const first=cards.shift();first.classList.add('sz-rare-card');first.innerHTML=special()+'<b>'+e(text('rare'))+'</b><small>'+e(text('hint'))+'</small>';for(const n of cards)n.remove();}return r;};
 const eventContents=SzHalloween.contents;SzHalloween.contents=function(id){const r=eventContents(id),pool=SzHalloweenData.cases[id]?.pool||[],indices=pool.map(([id],i)=>SzHalloweenData.item(id)?.kind==='knife'?i:-1).filter(i=>i>=0),nodes=[...$('pm').querySelectorAll('.hw-content-grid>article')];if(indices.length){const first=nodes[indices[0]],chance=indices.reduce((sum,i)=>sum+pool[i][1],0);first.classList.add('sz-rare-card');first.innerHTML=special()+'<b>'+e(text('rare'))+'</b><small>'+e(text('hint'))+'</small><span>'+chance+'%</span>';for(const i of indices.slice(1))nodes[i]?.remove();}return r;};
 const result=caseShowResult;caseShowResult=function(){const spinning=CASE_PRESENTATION?.spinning,knife=CASE_PRESENTATION?.item?.startsWith('knife:');result();if(spinning&&knife){const art=caseOverlay.querySelector('.case-result-art');if(art){art.classList.add('sz-knife-reveal');const cover=document.createElement('div');cover.className='sz-knife-cover';cover.innerHTML=special();art.append(cover);}}};
 document.addEventListener('sz-language',()=>{if(T==='inv'&&INV==='cases')tab('inv');});
 root.SzInventoryCases={arrange};arrange();
})(globalThis);
