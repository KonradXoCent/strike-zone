'use strict';
class PasswordRecovery{
 constructor(client,{now=Date.now}={}){this.client=client;this.now=now;this.next=0;this.busy=false;}
 async send(value){
  const email=String(value||'').trim();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('RECOVERY_EMAIL');
  if(this.busy||this.now()<this.next)throw Error('RECOVERY_RATE');this.busy=true;
  try{
   // Keep the project's existing recovery template and configured Site URL.
   // The same browser page already used by the Strike Zone account handles
   // the email link; a desktop-only redirect would break that working flow.
   const {error}=await this.client.auth.resetPasswordForEmail(email);if(error){if(error.status===429||/rate|too many/i.test(error.message))throw Error('RECOVERY_RATE');throw Error('RECOVERY_NETWORK');}
   this.next=this.now()+60000;return{sent:true};
  }finally{this.busy=false;}
 }
}
module.exports={PasswordRecovery};
