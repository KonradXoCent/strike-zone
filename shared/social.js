/* Shared persistent chat client: one controller in Electron main, or in a web preview. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzSocial=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const errors={CHAT_AUTH:'Zaloguj się, aby korzystać z wiadomości.',CHAT_ACCESS:'Nie masz już dostępu do tej rozmowy.',CHAT_FRIEND:'Wybierz znajomego.',CHAT_TITLE:'Nazwa grupy musi mieć od 1 do 48 znaków.',CHAT_BODY:'Wiadomość musi mieć od 1 do 2000 znaków.',CHAT_LIMIT:'Zbyt wiele operacji. Spróbuj za chwilę.',CHAT_OWNER:'Tylko właściciel grupy może to zrobić.',CHAT_NONCE:'Wiadomość została już wysłana z inną treścią.'};
 class Controller {
  constructor(client,{pollMs=8000}={}){this.client=client;this.pollMs=pollMs;this.listeners=new Set();this.uid=null;this.epoch=0;this.threads=[];this.unread=0;this.phase='signed-out';this.error=null;this.loading=false;}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn(this.snapshot());}
  snapshot(){return {uid:this.uid,phase:this.phase,threads:this.threads,unread:this.unread,error:this.error};}
  async rpc(action,args={}){const result=await this.client.rpc('sz_chat',{action,args});if(result.error){const key=Object.keys(errors).find(k=>result.error.message?.includes(k));throw new Error(key?errors[key]:'Brak połączenia z wiadomościami. Spróbuj ponownie.');}return result.data;}
  setAccount(account){const uid=account?.authenticated&&UUID.test(account.user?.id)?account.user.id:null;if(uid===this.uid)return;this.dispose();if(!uid){this.emit();return;}this.uid=uid;this.phase='connecting';const epoch=this.epoch;
   const changed=()=>{if(epoch===this.epoch)this.refresh();};
   this.channel=this.client.channel('sz-chat-'+uid+'-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'INSERT',schema:'public',table:'sz_chat_messages'},changed).on('postgres_changes',{event:'*',schema:'public',table:'sz_chat_members',filter:'user_id=eq.'+uid},changed).subscribe(status=>{if(epoch!==this.epoch)return;if(status==='SUBSCRIBED')this.refresh();});
   this.timer=setInterval(changed,this.pollMs);this.timer.unref?.();this.refresh();this.emit();
  }
  async refresh(){if(!this.uid||this.loading){this.again=true;return;}const epoch=this.epoch;this.loading=true;try{const data=await this.rpc('list');if(epoch!==this.epoch)return;this.threads=Array.isArray(data)?data:[];this.unread=this.threads.reduce((n,t)=>n+Number(t.unread||0),0);this.phase='ready';this.error=null;}catch(e){if(epoch===this.epoch){this.phase='offline';this.error=e.message;}}finally{if(epoch===this.epoch){this.loading=false;this.emit();if(this.again){this.again=false;queueMicrotask(()=>this.refresh());}}}}
  async command(action,args={}){
   if(!this.uid)throw new Error(errors.CHAT_AUTH);const epoch=this.epoch;
   if(!['direct','group','history','send','read','rename','add','remove','leave','refresh'].includes(action))throw new Error('Invalid chat action');
   if(JSON.stringify(args).length>12000)throw new Error('Invalid chat input');
   if(action==='refresh'){await this.refresh();return this.snapshot();}
   const data=await this.rpc(action,args);if(epoch!==this.epoch)throw new Error(errors.CHAT_AUTH);
   if(action!=='history')await this.refresh();return data;
  }
  dispose(){this.epoch++;clearInterval(this.timer);this.timer=null;const ch=this.channel;this.channel=null;if(ch)Promise.resolve(this.client.removeChannel(ch)).catch(()=>{});this.uid=null;this.threads=[];this.unread=0;this.loading=false;this.again=false;this.phase='signed-out';this.error=null;}
 }
 return {Controller,UUID};
});
