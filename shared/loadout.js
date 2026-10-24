/* Team loadouts use the existing account save, owned items and cosmetic network protocol. */
(function(root){'use strict';
 const t=s=>szLocale.t(s),e=s=>workshopEscape(String(s??''));
 let side='CT',owner='',selected=null,previewSide=null;
 const oldEqOf=eqOf,oldGlove=heldGloveId,oldHeld=heldSkinId,oldRef=communityOwnRef,oldPaint=root.szPaintFor;
 const normalizeSide=team=>['CT','T'].includes(team)?team:['CT','T'].includes(sel.team)?sel.team:'CT';
 const currentSide=()=>normalizeSide(previewSide||G?.me?.brSide||G?.me?.team);
 const playerSide=p=>normalizeSide(p?.brSide||p?.team);
 function account(){const next=(SBU?.id||'local')+'|'+DB.cur;if(next!==owner){owner=next;side='CT';selected=null;}}
 function choice(team,k){const load=P().teamLoadout?.[normalizeSide(team)];return load&&Object.hasOwn(load,k)?{id:load[k]}:null;}
 function owned(id,k){
  if(!id)return false;
  if(id.startsWith('ugc:')){const o=FORGE.owned.find(o=>'ugc:'+o.id===id);return FORGE.owner===communityAccount()&&!!o&&o.payload.weapon===k&&forgeOwnedActive(o);}
  if(k==='glove')return isGl(id)&&hasItem(id);
  return workshopValid(id)&&sk(id).w===k&&hasItem(id);
 }
 function ref(id,k){const o=FORGE.owned.find(o=>'ugc:'+o.id===id);if(!o||!owned(id,k))return null;const r=COMMUNITY.cache.get(o.release_id);return r?.payload.weapon===k?{item:o.item_id,release:o.release_id,version:o.version,owned:o.id}:null;}
 function effective(team,k){
  team=normalizeSide(team);const q=choice(team,k);if(q)return owned(q.id,k)?q.id:null;
  if(k==='glove')return oldGlove({human:true,team,brSide:team});
  const r=oldRef(k);if(r)return 'ugc:'+r.owned;
  return oldEqOf({human:true,team,brSide:team},k)||null;
 }
 function visual(team,k){const id=effective(team,k);return id?.startsWith('ugc:')?(ref(id,k)?'ugc:'+ref(id,k).release:null):id;}
 eqOf=function(p,k){const q=p?.human&&choice(playerSide(p),k);return q?(owned(q.id,k)&&!q.id.startsWith('ugc:')?q.id:null):oldEqOf(p,k)||null;};
 heldSkinId=function(p){if(p?.human&&choice(playerSide(p),p.cur))return p.visualSkin||visual(playerSide(p),p.cur);return oldHeld(p);};
 heldGloveId=function(p){if(p?.human&&choice(playerSide(p),'glove'))return effective(playerSide(p),'glove');return oldGlove(p);};
 communityOwnRef=function(k){const q=choice(currentSide(),k);return q?ref(q.id,k):oldRef(k);};
 root.szPaintFor=k=>choice(currentSide(),k)?visual(currentSide(),k):oldPaint?.(k);
 const oldEquipped=workshopEquipped;workshopEquipped=id=>oldEquipped(id)||['CT','T'].some(team=>Object.values(P().teamLoadout?.[team]||{}).includes(id));
 function metadata(team,k){const id=effective(team,k);if(id?.startsWith('ugc:')){const o=FORGE.owned.find(o=>'ugc:'+o.id===id);return{id,name:o.payload.name,color:RCol[4],image:forgeSkinArt(o.payload),st:o.stattrak};}
  if(k==='glove')return{id,name:id?bit(id).n:t('Domyślne rękawiczki'),color:id?RCol[itR(id)]:'#76838c',image:id?glovePreview(id,240,132):glovePreview('v:0',240,132)};
  const s=id&&sk(id);return{id,name:s?.n||t('Domyślny wygląd'),color:s?RCol[s.r]:'#76838c',image:weaponImage(k,id,240,92,true),st:s?.st};
 }
 function slot(k){const m=metadata(side,k);return `<button type="button" class="sz-loadout-slot ${selected===k?'selected':''}" data-loadout-slot="${k}" style="--item-color:${m.color}" onclick="SzLoadout.select('${k}')"><span>${e(k==='glove'?t('Rękawiczki'):k==='knife'?t('Nóż'):W[k].n)}</span><img src="${m.image}" alt=""><small>${m.st?'<em>StatTrak™</em> ':''}<span data-user-content>${e(m.name)}</span></small></button>`;}
 function groups(team){const keys=GUNS.filter(k=>!W[k].t||W[k].t===team);return [['Pistolety',keys.filter(k=>W[k].slot===1)],['Broń średnia',keys.filter(k=>W[k].slot!==1&&(W[k].c==='smg'||W[k].pel>1||['m249','negev'].includes(k)))],['Karabiny',keys.filter(k=>W[k].slot!==1&&W[k].c!=='smg'&&!(W[k].pel>1)&&!['m249','negev'].includes(k))]];}
 function html(){account();return `<section class="sz-loadout" id="sz-loadout" data-team="${side}" data-no-translate><header><div><small>STRIKE ZONE / ${e(t('WYPOSAŻENIE DRUŻYNY'))}</small><h2>${e(t('Gotowy na następną rundę.'))}</h2></div><div class="sz-team-switch" role="group" aria-label="${e(t('Drużyna wyposażenia'))}">${['CT','T'].map(team=>`<button type="button" data-loadout-team="${team}" aria-pressed="${side===team}" onclick="SzLoadout.team('${team}')">${team}<span>${e(t(team==='CT'?'Antyterroryści':'Terroryści'))}</span></button>`).join('')}</div></header><div class="sz-loadout-body"><aside class="sz-loadout-agent"><canvas width="330" height="420" aria-hidden="true"></canvas><strong>${e(P().name)}</strong><span>${side} · ${e(t('Podgląd wyposażenia'))}</span></aside><div class="sz-loadout-equipment"><h3>${e(t('Wyposażenie'))}</h3>${slot('knife')}${slot('glove')}<p>${e(t('Wybierz miejsce, a następnie skin z ekwipunku.'))}</p></div>${groups(side).map(([name,keys])=>`<div class="sz-loadout-column"><h3>${e(t(name))}</h3><div>${keys.map(slot).join('')}</div></div>`).join('')}</div><footer><span>${e(t('Skiny zapisują się osobno dla CT i T.'))}</span>${selected?`<button type="button" onclick="SzLoadout.reset()">${e(t('Przywróć domyślny wygląd'))}</button><button type="button" onclick="SzLoadout.select(null)">${e(t('Pokaż cały ekwipunek'))}</button>`:''}</footer></section>`;}
 ldHTML=html;
 function portrait(canvas,team,k){if(!canvas)return;const q=canvas.getContext('2d'),w=canvas.width,h=canvas.height,id=visual(team,k);q.clearRect(0,0,w,h);const a=team==='CT'?'#64adf8':'#edb45f',g=q.createRadialGradient(w/2,h*.45,0,w/2,h*.45,w*.6);g.addColorStop(0,a+'40');g.addColorStop(1,a+'00');q.fillStyle=g;q.fillRect(0,0,w,h);q.strokeStyle=a+'40';q.lineWidth=1;for(let i=1;i<6;i++){q.beginPath();q.ellipse(w/2,h*.9,w*.09*i,h*.018*i,0,0,7);q.stroke();}previewSide=team;try{drawChar(q,w*.42,h*.91,Math.min(h*.82,w*1.02),{team,wp:k,skin:id,col:id?sk0(id):null});}finally{previewSide=null;}}
 function refresh(){if(T!=='inv'||INV!=='w')return;const panel=$('sz-loadout');if(!panel)return;const tabs=$('main').querySelector('.w-tabs');tabs?.after(panel);portrait(panel.querySelector('canvas'),side,selected&&W[selected]?selected:side==='CT'?'m4':'ak');
  for(const card of document.querySelectorAll('[data-inventory-id]')){const id=card.dataset.inventoryId,k=sk(id).w,button=card.querySelector('button[onclick^="eq("]');if(button){button.textContent=t(effective(side,k)===id?'Wyposażono':'Wyposaż')+' · '+side;button.disabled=!!W[k].t&&W[k].t!==side;}
   let badges=card.querySelector('.sz-loadout-badges');if(!badges){badges=document.createElement('div');badges.className='sz-loadout-badges';badges.dataset.noTranslate='';card.append(badges);}badges.innerHTML=['CT','T'].filter(team=>!W[k].t||W[k].t===team).map(team=>`<button type="button" class="${effective(team,k)===id?'active':''}" data-loadout-side="${team}" onclick="SzLoadout.equip('${k}',this.dataset.id,'${team}')" data-id="${e(id)}" aria-label="${e(t('Wyposaż'))} ${team}">${team}</button>`).join('');
  }
  for(const card of document.querySelectorAll('#forge-owned .forge-skin')){const button=card.querySelector('[data-forge-equip]'),o=FORGE.owned.find(o=>o.id===button?.dataset.forgeEquip);if(!o)continue;button.disabled=!owned('ugc:'+o.id,o.payload.weapon)||!!W[o.payload.weapon].t&&W[o.payload.weapon].t!==side;button.textContent=t(!forgeOwnedActive(o)?'Wycofany z gry':effective(side,o.payload.weapon)==='ugc:'+o.id?'Wyposażono':'Wyposaż')+' · '+side;}
 }
 function render(){if(T==='inv'&&INV==='w'){const panel=$('sz-loadout');if(panel)panel.outerHTML=html();refresh();}}
 function select(k){account();selected=k;root.SzGameHub.loadoutWeapon(k==='glove'?null:k);render();if(k==='glove'){document.querySelector('.cosmetic-section')?.scrollIntoView({behavior:'smooth',block:'start'});}else $('hub-inventory-toolbar')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function team(team){account();if(!['CT','T'].includes(team))return;side=team;if(selected&&W[selected]?.t&&W[selected].t!==side)selected=null;root.SzGameHub.loadoutWeapon(selected==='glove'?null:selected);render();}
 function equip(k,id,team=side,toggle=true){account();if(!['CT','T'].includes(team)||!['glove','knife',...GUNS].includes(k)||W[k]?.t&&W[k].t!==team||id&&!owned(id,k))return false;
  try{if(root.szCloudEconomyLocked?.())throw Error(t('Poczekaj na zapis konta.'));presentationCommit(p=>{p.teamLoadout=p.teamLoadout||{};p.teamLoadout[team]=p.teamLoadout[team]||{};p.teamLoadout[team][k]=toggle&&effective(team,k)===id?null:id||null;});VISUAL_HELD.clear();HELD_POSES.clear();save();render();return true;}catch(error){toast(error.message);return false;}
 }
 eq=id=>{if(workshopValid(id)&&hasItem(id))equip(sk(id).w,id);};
 eqGlove=(id,team)=>equip('glove',id,team);
 const priorVisual=visualEquip;visualEquip=function(k,id){if(!id||owned(id,k))return equip(k,id,sceneCfg().team||side,false);return priorVisual(k,id);};
 const priorSetLd=setLd;setLd=function(k,id){const m=k.match(/^(knife|glove)_(CT|T)$/);return m?equip(m[1],id,m[2],false):priorSetLd(k,id);};
 const priorForge=forgeEquip;forgeEquip=async function(id){const o=FORGE.owned.find(o=>o.id===id);if(T==='inv'&&INV==='w'&&o)return equip(o.payload.weapon,'ugc:'+id);return priorForge(id);};
 const priorTab=tab;tab=function(...args){const r=priorTab(...args);refresh();return r;};
 const priorInv=invTabs;invTabs=function(...args){const r=priorInv(...args);refresh();return r;};
 let lastCosmetic='';
 const previousApply=applySnap;applySnap=function(snapshot){const result=previousApply(snapshot);if(G?.client&&snapshot.sid===NET.session){const cos=netCosmetics(),key=NET.session+'|'+JSON.stringify(cos);if(key!==lastCosmetic){lastCosmetic=key;netSend({t:'loadout',cos});}}return result;};
 const previousHost=hostRecv;hostRecv=function(message){if(message?.t!=='loadout')return previousHost(message);if(!G||G.client||message.c===NET.cid||message.sid!==NET.session||!roomPeer(message.c))return;const player=G.ps.find(p=>p.rh&&p.rid===message.c);if(!player)return;const cos={};for(const k of [...GUNS,'knife']){const id=message.cos?.[k];if(workshopValid(id)&&sk(id).w===k)cos[k]=id;}const glove=message.cos?.glove;if(isGl(glove)&&tradeItemValid(glove))cos.glove=glove;player.netCos=cos;player.bs={...cos};communityRemoteCos(player,{ugc:message.cos?.ugc});};
 document.addEventListener('sz-language',render);
 root.SzLoadout={effective,visual,owned,groups,portrait,refresh,equip,select,team,side:()=>side,art:(team,k)=>metadata(team,k).image,clearSelection(){selected=null;render();},reset:()=>selected&&equip(selected,null),render};
})(globalThis);
