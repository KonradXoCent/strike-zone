/* The same authenticated friend-request protocol is used by both clients. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzFriendships=api;})(globalThis,function(){'use strict';
 const errors={FRIEND_NOT_FOUND:'Nie znaleziono gracza o tym nicku.',FRIEND_NAME_AMBIGUOUS:'Ten nick ma kilka kont. Poproś gracza o ustawienie unikalnego nicku.',FRIEND_SELF:'Nie możesz zaprosić siebie.',FRIEND_ALREADY:'Ten gracz jest już Twoim znajomym.',FRIEND_PENDING:'Zaproszenie już oczekuje na odpowiedź.',FRIEND_REVERSE:'Masz już zaproszenie od tego gracza. Zaakceptuj je poniżej.',FRIEND_LIMIT:'Zbyt wiele zaproszeń. Spróbuj ponownie później.',FRIEND_NOT_PENDING:'To zaproszenie nie jest już dostępne.',FRIEND_FORBIDDEN:'Nie możesz zmienić tego zaproszenia.',FRIEND_LOGIN:'Zaloguj się, aby zarządzać znajomymi.'};
 function message(error){return Object.entries(errors).find(([code])=>String(error?.message||error).includes(code))?.[1]||'Nie udało się zaktualizować znajomych. Spróbuj ponownie.';}
 async function call(client,action,args={}){if(!['list','request','accept','decline','cancel','remove'].includes(action))throw Error('FRIEND_FORBIDDEN');const result=await client.rpc('sz_friends',{action,args});if(result.error)throw result.error;return result.data||{};}
 return{call,message,errors};
});
