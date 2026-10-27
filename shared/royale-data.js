(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.SzRoyaleData=data;})(globalThis,function(){'use strict';
 const modes={solo:1,duo:2,trio:3,squad:4},SEASON=1,TIERS=20,STEP=500,PREMIUM=2500;
 const items=[
  {id:'o:1000',n:'Drift Runner',c:'#52dfd0',r:1,type:'o',gear:'visor',accent:'#f4e5ba'},
  {id:'c:1000',n:'Tidal Wing',c:'#52dfd0',r:1,type:'c',accent:'#173a54'},
  {id:'o:1001',n:'Storm Scout',c:'#8973e9',r:2,type:'o',gear:'hood',accent:'#72eff0'},
  {id:'c:1001',n:'Afterglow',c:'#f39178',r:2,type:'c',accent:'#ffdc91'},
  {id:'o:1002',n:'Solar Warden',c:'#f5c461',r:3,type:'o',gear:'crown',accent:'#183f4b'},
  {id:'c:1002',n:'Eclipse',c:'#d7bdff',r:3,type:'c',accent:'#33274a'},
  {id:'o:1003',n:'Nightfall',c:'#384b69',r:3,type:'o',gear:'visor',accent:'#ff9e87'},
  {id:'c:1003',n:'Solar Sail',c:'#f5c461',r:3,type:'c',accent:'#3b5f65'}
 ];
 const item=id=>items.find(x=>x.id===id)||null;
 function state(p){const a=p.royale&&typeof p.royale==='object'&&!Array.isArray(p.royale)?p.royale:{};p.royale=a;a.items=Array.isArray(a.items)?a.items.filter(id=>!!item(id)):[];a.eq=a.eq&&typeof a.eq==='object'&&!Array.isArray(a.eq)?a.eq:{};a.mode=Object.hasOwn(modes,a.mode)?a.mode:'solo';a.fill=a.fill!==false;
  if(!a.pass||a.pass.season!==SEASON)a.pass={season:SEASON,xp:0,premium:false,claimed:[]};const b=a.pass;b.xp=Math.max(0,Math.min(TIERS*STEP,Math.floor(Number(b.xp)||0)));b.premium=b.premium===true;b.claimed=Array.isArray(b.claimed)?[...new Set(b.claimed.filter(x=>/^(free|premium):(20|1[0-9]|[1-9])$/.test(x)))]:[];return a;}
 function owned(p,id){return !!item(id)?state(p).items.includes(id):Array.isArray(p.br?.items)&&p.br.items.includes(id);}
 function equipped(p,type){const a=state(p),id=Object.hasOwn(a.eq,type)?a.eq[type]:p.br?.eq?.[type];return id&&owned(p,id)?id:null;}
 function equip(p,type,id,valid){if(!['o','c'].includes(type)||id!==null&&(!valid(id,type)||!owned(p,id)))return false;state(p).eq[type]=id;return true;}
 function plan(count,partyCount,mode,fill){if(!Object.hasOwn(modes,mode)||!Number.isInteger(count)||count<1||!Number.isInteger(partyCount)||partyCount<1||partyCount>modes[mode]||count<partyCount)throw Error('ROYALE_PARTY_SIZE');const size=modes[mode],allies=fill?size:partyCount;return Array.from({length:count},(_,i)=>({team:i<allies?'R0':'R'+(1+Math.floor((i-allies)/size)),reserved:i<partyCount&&i>0}));}
 function reward(tier,track){if(!Number.isInteger(tier)||tier<1||tier>TIERS||!['free','premium'].includes(track))return null;const cosmetics=track==='free'?{5:'c:1000',10:'o:1000',15:'c:1001',20:'o:1001'}:{1:'o:1003',5:'c:1002',10:'o:1002',15:'c:1003'};return cosmetics[tier]?{item:cosmetics[tier]}:{coins:track==='free'?50:100};}
 function claim(p,tier,track){const a=state(p),r=reward(tier,track),key=track+':'+tier;if(!r||a.pass.xp<tier*STEP||track==='premium'&&!a.pass.premium||a.pass.claimed.includes(key))return null;if(r.item)a.items.push(r.item);else p.wallet=Math.max(0,Number(p.wallet)||0)+r.coins;a.pass.claimed.push(key);return r;}
 function premium(p){const a=state(p);if(a.pass.premium||!(p.wallet>=PREMIUM))return false;p.wallet-=PREMIUM;a.pass.premium=true;return true;}
 function award(p,{kills=0,seconds=0,won=false}={}){const b=state(p).pass,n=Math.max(0,Math.min(1600,Math.floor(Math.max(0,seconds)/30)*20+Math.min(40,Math.max(0,kills))*35+(won?300:75))),before=b.xp;b.xp=Math.min(TIERS*STEP,b.xp+n);return b.xp-before;}
 const legacyGears=['helmet','cap','bandana','hood','samurai','visor','astronaut','phoenix','crown'];
 function style(id,legacy){const d=item(id)||legacy,idx=Number(String(id||'').split(':')[1]);return{colour:d?.c||'#3b8291',accent:d?.accent||(['#8fdcff','#bedb87','#ffc28c','#9c88d5','#ffe0bc','#b4ffff','#6abbd8','#ffe29c','#fff2bc'][idx]||'#b7f2e2'),gear:d?.gear||legacyGears[idx]||'helmet',id:id||'default'};}
 return{modes,SEASON,TIERS,STEP,PREMIUM,items,item,state,owned,equipped,equip,plan,reward,claim,premium,award,style};
});
