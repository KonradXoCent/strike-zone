/* Public friend profiles provide uploaded avatars even while a friend is offline.
   Presence is trusted only after subscription and a synchronized roster. */
(function(){'use strict';
 const t=value=>szLocale.t(value),html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let owner=null,profiles=new Map(),request=0,pendingRoster={incoming:[],outgoing:[]},seenRequests=new Set();
 function account(){const uid=SBU?.id||null;if(uid!==owner){owner=uid;profiles=new Map();pendingRoster={incoming:[],outgoing:[]};seenRequests=new Set();request++;}return uid;}
 function invitations(){return Object.entries(pendingRoster).map(([kind,list])=>list.length?`<section class="sz-pending-friends"><h4>${html(t(kind==='incoming'?'Otrzymane zaproszenia':'Wysłane zaproszenia'))} <small>${list.length}</small></h4>${list.map(row=>`<article><span data-user-content>${html(row.name)}</span>${(kind==='incoming'?[['accept','Akceptuj'],['decline','Odrzuć']]:[['cancel','Anuluj']]).map(([action,label])=>`<button type="button" data-friend-action="request-${action}" data-request-id="${html(row.id)}">${html(t(label))}</button>`).join('')}</article>`).join('')}</section>`:'').join('');}
 function info(friend){
  account();const known=!!SBU&&FR.uid===SBU.id&&FR.status==='SUBSCRIBED'&&FR.synced;
  const peers=known&&Array.isArray(FR.on[friend.friend_id])?FR.on[friend.friend_id]:[];
  const peer=peers.find(p=>p.match===true)||peers.find(p=>p.app==='game')||peers[0],saved=profiles.get(friend.friend_id)||{};
  // An online session may advertise a newer image than the saved public profile.
  const image=friendAvatarImage(peer?.avimg)||peers.map(p=>friendAvatarImage(p.avimg)).find(Boolean)||friendAvatarImage(saved.avimg);
  const name=String(peer?.n||saved.name||friend.name||'').slice(0,64);
  return {id:friend.friend_id,name,image,peer,status:!known?'unknown':peer?'online':'offline',label:!known?'Sprawdzanie połączenia…':peer?.match===true?'W Meczu':peer?'Online':'Offline'};
 }
 function avatar(f){return `<span class="sz-friend-avatar" data-status="${f.status}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21"/></svg>${f.image?`<img src="${f.image}" alt="" decoding="async">`:''}<span class="sz-friend-dot"></span></span>`;}
 function identity(f){return `${avatar(f)}<span class="sz-friend-copy"><b data-user-content>${html(f.name)}</b><small class="${f.status==='online'?'on':''}">${html(t(f.label))}</small></span>`;}
 function button(action,label,f,disabled=false,title=''){return `<button type="button" data-friend-action="${action}" data-friend-id="${html(f.id)}"${action==='trade'?' data-no-translate':''}${disabled?' disabled':''}${title?` title="${html(t(title))}"`:''}>${html(action==='trade'?label:t(label))}</button>`;}
 function actions(f,full=false){const reason=f.status==='unknown'?'Poczekaj na sprawdzenie połączenia.':'Znajomy musi być online, aby otrzymać zaproszenie do wymiany.';return `<div class="${full?'':'fm '}sz-friend-actions">${full&&f.status==='online'&&L?button('invite','Zaproś',f):''}${full&&f.peer?.l?button('join','Dołącz',f):''}${button('delete',szLocale.language==='en'?'Delete':'Usuń',f)}${button('trade','Trade',f,f.status!=='online',f.status!=='online'?reason:'Wyślij zaproszenie do wymiany')}</div>`;}
 const hint=value=>`<div class="sz-friends-hint">${html(t(value))}</div>`;
 friBar=function(){
  const e=$('frl');if(!e)return;account();
  if(!SBU){e.innerHTML=hint('Zaloguj się, aby zobaczyć znajomych');return;}
  e.innerHTML=(pendingRoster.incoming.length?`<button type="button" class="sz-friend-request-alert" data-friend-action="open-requests">${html(t('Otrzymane zaproszenia'))} <b>${pendingRoster.incoming.length}</b></button>`:'')+((FR.uid===SBU.id?FR.list:[]).map(friend=>{const f=info(friend),open=FRO===f.id;return `<div class="fr sz-friend${open?' open':''}" role="button" tabindex="0" aria-expanded="${open}" data-friend-action="toggle" data-friend-id="${html(f.id)}">${identity(f)}</div>${actions(f)}`;}).join('')||hint('Brak znajomych — dodaj ich w zakładce Znajomi.'));
 };
 friRender=function(){
  friBar();const m=$('main');if(!m||T!=='friends')return;
  if(!sb||!SBU){m.innerHTML=`<div class="box"><h3>${html(t('Znajomi'))}</h3>${hint('Zaloguj się, aby zobaczyć znajomych')}</div>`;return;}
  const input=$('fn'),draft=input?.value||'',focused=document.activeElement===input,caret=input?.selectionStart;
  m.innerHTML=`<div class="box"><h3>${html(t('Znajomi'))}</h3>${TRQ?`<div class="box"><b data-user-content>${html(TRQ.from)}</b> ${html(t('chce się wymienić'))} <button class="pri" data-friend-action="accept">${html(t('Akceptuj'))}</button></div>`:''}${FRI?`<div class="box"><b data-user-content>${html(FRI.from)}</b> ${html(t('zaprasza do lobby'))} <button class="pri" data-friend-action="join-invitation">${html(t('Dołącz'))}</button></div>`:''}<input id="fn" placeholder="${html(t('Zaproś gracza po nicku'))}" maxlength="14"> <button class="pri" data-friend-action="add">${html(t('Wyślij zaproszenie'))}</button> <small>${html(t(FR.msg))}</small>${invitations()}<div class="sz-friends-list">${(FR.uid===SBU.id?FR.list:[]).map(friend=>{const f=info(friend);return `<article>${identity(f)}${actions(f,true)}</article>`;}).join('')||hint('Brak znajomych — dodaj ich w zakładce Znajomi.')}</div></div>`;
  $('fn').value=draft;if(focused){$('fn').focus();$('fn').setSelectionRange(caret,caret);}
 };
 const load=friLoad;
 friLoad=async function(){
  const uid=account();if(!uid||!sb)return;const epoch=++request;
  await load();if(uid!==SBU?.id||epoch!==request)return;
  const ids=FR.list.map(f=>f.friend_id),next=new Map([...profiles].filter(([id])=>ids.includes(id)));
  for(let offset=0;offset<ids.length;offset+=100){
   try{const result=await sb.from('leaderboard').select('user_id,name,avimg').in('user_id',ids.slice(offset,offset+100));
    if(uid!==SBU?.id||epoch!==request)return;
    if(!result.error)for(const row of result.data||[])if(ids.includes(row.user_id))next.set(row.user_id,{name:row.name,avimg:friendAvatarImage(row.avimg)});
   }catch{/* Keep the last verified avatar if the public profile request fails. */}
  }
  profiles=next;
  try{const data=await SzFriendships.call(sb,'list');if(uid!==SBU?.id||epoch!==request)return;pendingRoster={incoming:data.incoming||[],outgoing:data.outgoing||[]};
   const fresh=pendingRoster.incoming.filter(row=>!seenRequests.has(row.id));for(const row of fresh)seenRequests.add(row.id);if(fresh.length)toast(t('Masz nowe zaproszenie do znajomych.'));
  }catch{if(uid===SBU?.id&&epoch===request)FR.msg='Nie udało się wczytać zaproszeń. Spróbuj ponownie.';}
  friRefreshUI();
 };
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-friend-action]');if(!b||b.disabled||!b.closest('#frl,#main'))return;
  const action=b.dataset.friendAction,id=b.dataset.friendId,friend=FR.list.find(f=>f.friend_id===id);
  if(action==='open-requests'){tab('friends');return;}if(action.startsWith('request-')){b.disabled=true;friendCommand(action.slice(8),{id:b.dataset.requestId});return;}if(action==='add'){friAdd();return;}if(action==='accept'){trAccept();return;}if(action==='join-invitation'){if(FRI)friJoin(FRI.code);return;}
  if(!friend||FR.uid!==SBU?.id)return;event.stopPropagation();
  if(action==='toggle'){friClick(id);return;}if(action==='delete'){friDel(id);return;}
  const f=info(friend);
  if(action==='trade')trStart(id,f.name);
  else if(f.status==='online'&&action==='invite')friInvite(id);
  else if(f.status==='online'&&action==='join'&&/^[a-z0-9]{4,6}$/i.test(f.peer?.l))friJoin(f.peer.l);
 });
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('#frl [data-friend-action=toggle]')){event.preventDefault();event.target.click();}});
 document.addEventListener('error',event=>{if(event.target.matches?.('.sz-friend-avatar>img'))event.target.remove();},true);
 document.addEventListener('sz-language',()=>friRefreshUI());
 async function friendCommand(action,args){const uid=account();if(!uid||!sb)return;try{await SzFriendships.call(sb,action,args);if(uid!==SBU?.id)return;FR.msg=action==='request'?'Zaproszenie wysłane. Czekamy na akceptację.':action==='accept'?'Zaproszenie zaakceptowane. Jesteście znajomymi.':'Lista znajomych została zaktualizowana.';}catch(error){if(uid!==SBU?.id)return;FR.msg=SzFriendships.message(error);}await friLoad();}
 friAdd=()=>{const nickname=$('fn')?.value.trim();if(nickname)return friendCommand('request',{nickname});};
 friDel=id=>friendCommand('remove',{id});
 let polling=false;setInterval(async()=>{if(!sb||!SBU||polling)return;polling=true;try{await friLoad();}finally{polling=false;}},8000);
 document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='fn'){event.preventDefault();friAdd();}});
 friRefreshUI();
})();
