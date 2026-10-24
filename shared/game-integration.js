/* UI integration is shared by standalone HTML and desktop. Public builds keep
   authentication in the launcher; previews retain their separate test sign-in. */
(function(){'use strict';
 SzSettings.mount();
 // Static map labels are baked in the selected language; rebuild once on a change.
 document.addEventListener('sz-language',()=>{SCV=null;SCG=null;SCK='';});
 const api=window.strikeZoneDesktop;let control,unsubscribe,uid=null,friends=[],view;
 function protect(){const set=szLocale.protected;set.clear();try{set.add(P().name);for(const p of G?.ps||[])for(const s of [p.rname,p.name])if(s)set.add(s);for(const f of FR?.list||[])if(f.name)set.add(f.name);for(const f of F||[])if(f.n)set.add(f.n);for(const g of GLV||[]){set.add(g[0]);set.add(g[0]+' gloves');}for(const r of COMMUNITY?.rows||[])for(const s of [r.title,r.author_name])if(s)set.add(s);for(const r of COMMUNITY?.cache?.values()||[])if(r.payload?.name)set.add(r.payload.name);}catch{}}
 const options=setTab;setTab=function(mm){options(mm);const target=mm?.nodeType?mm:$('main'),box=document.createElement('section');box.className='sz-language-box';SzSettings.choices(box);target.prepend(box);};
 const receive=s=>{if(s.uid!==uid){uid=s.uid;control?.setAccount({authenticated:!!uid,user:{id:uid}});}handler?.(s);};let handler=null;
 if(api){view=SzChatView.mount({command:(a,v)=>api.chat(a,v),subscribe:fn=>{handler=fn;api.onChat(receive);api.getChat().then(receive);},getFriends:()=>friends,locale:szLocale,ack:()=>api.chatFocused(),notify:()=>document.visibilityState==='visible'});api.onFriends(s=>{friends=s.list||[];});api.getFriends().then(s=>{friends=s.list||[];}).catch(()=>{});}
 else{let listeners=new Set();view=SzChatView.mount({command:(a,v)=>control?control.command(a,v):Promise.reject(new Error('Zaloguj się, aby korzystać z wiadomości.')),subscribe:fn=>listeners.add(fn),getFriends:()=>friends,locale:szLocale});
  setInterval(()=>{if(!sb)return;if(!control){control=new SzSocial.Controller(sb);control.subscribe(s=>{for(const f of listeners)f(s);});}const next=typeof SBU?.id==='string'?SBU.id:null;control.setAccount({authenticated:!!next,user:{id:next}});friends=(FR?.list||[]).map(f=>({id:f.friend_id||f.id,name:f.name}));},1000);
 }
 window.szMessages=view;
 setInterval(protect,1000);protect();
})();
