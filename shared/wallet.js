/* One account wallet; game save retries carry cumulative per-session changes. */
(function(root){'use strict';
 let state=null,client=null,user=null,session=null,total=0,applied=0,sequence=0,appliedSequence=0,muted=0,poll=null,painting=false;
 const installed=new WeakSet(),game=()=>root.SZ_ROYALE?'zone-royale':'strike-zone',amount=n=>Math.max(0,Math.floor(Number(n)||0));
 function balance(){return state?Math.max(0,state.balance+total-applied):0;}
 function change(value){if(muted||!state)return;const next=amount(value),before=balance();if(next!==before){total+=next-before;sequence++;}}
 function attachProfile(p,royale){if(!state||!p)return;for(const obj of[p,royale||p.royale]){if(!obj||installed.has(obj))continue;installed.add(obj);let fallback=amount(obj.wallet);Object.defineProperty(obj,'wallet',{enumerable:true,configurable:true,get(){return state?balance():fallback;},set(v){if(state&&!muted)change(v);else fallback=amount(v);}});}}
 function attach(){if(!state||typeof DB==='undefined')return;for(const p of Object.values(DB.profiles||{}))attachProfile(p);}
 function suspend(fn){muted++;try{return fn();}finally{muted--;attach();}}
 function accept(wallet,ack){if(!wallet||wallet.schema!==1||wallet.currency!=='ZC'||!Number.isSafeInteger(wallet.balance)||wallet.balance<0)return false;if(ack?.session===session&&Number.isSafeInteger(ack.total)&&ack.sequence>=appliedSequence){applied=ack.total;appliedSequence=ack.sequence;}if(!state||wallet.revision>=state.revision)state={...wallet};attach();if(typeof DB!=='undefined')DB.zoneWallet={...state};return true;}
 async function refresh(){if(!client||!state)return;const uid=user,{data,error}=await client.rpc('zone_wallet',{action:'state',args:{}});if(!error&&uid===user){accept(data);if(typeof hdr==='function')hdr();}}
 async function open(c,uid){if(client===c&&user===uid&&session)return;stop();client=c;user=uid;const {data,error}=await c.rpc('zone_wallet',{action:'open',args:{game_id:game()}});if(error){if(error.code==='PGRST202'){stop();return;}throw error;}if(!data||data.schema!==1){stop();return;}if(user!==uid)return;session=data.session;accept(data);poll=setInterval(()=>refresh().catch(()=>{}),15000);}
 function stop(){clearInterval(poll);state=null;client=null;user=null;session=null;total=0;applied=0;sequence=0;appliedSequence=0;}
 function capture(doc){attach();return state?{...doc,walletCommit:{session,sequence:++sequence,total}}:doc;}
 function reject(){total=applied;sequence++;}
 function paint(){if(!state||painting||typeof document==='undefined')return;painting=true;try{const box=document.getElementById('menu');if(!box)return;for(const span of box.querySelectorAll('[data-money-value]')){const value=Number(span.dataset.moneyValue),exact=value.toLocaleString(root.szLocale?.language==='en'?'en-US':'pl-PL')+' ZC';span.title=exact;span.setAttribute('aria-label',exact);}const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);let n;const edits=[];while(n=walker.nextNode()){if(!n.parentElement?.closest('script,style,textarea,input,[contenteditable],[data-user-content],#nk,#nn,#sz-chat-panel')&&/\$/.test(n.nodeValue))edits.push(n);}for(const n of edits){const value=n.nodeValue.replace(/\$\s*(-?\d[\d.,]*(?:[KMBT])?)|(-?\d[\d.,]*(?:[KMBT])?)\s*\$/g,(_,a,b)=>(a||b)+' ZC');if(value!==n.nodeValue)n.nodeValue=value;}}finally{painting=false;}}
 const previousHeader=hdr;hdr=function(...args){const value=previousHeader(...args);paint();return value;};
 if(typeof economyCommit==='function'){const commit=economyCommit;economyCommit=function(...args){const before={total,sequence};const result=commit(...args);if(!result){total=before.total;sequence=before.sequence;}return result;};}
 if(typeof document!=='undefined')new MutationObserver(()=>paint()).observe(document.documentElement,{childList:true,subtree:true});
 root.SzWallet={get active(){return!!state;},balance,change,attach,attachProfile,suspend,accept,open,stop,refresh,capture,reject,get state(){return state;}};
})(globalThis);
