/* Halloween content is separate from all regular drop, bot-market and upgrade pools. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzHalloweenData=api;})(globalThis,function(){
 'use strict';
 const ID='halloween-2026',START=Date.parse('2026-10-19T22:00:00Z'),END=Date.parse('2026-11-30T23:00:00Z'),KEY='halloween2026',STAT_CHANCE=.1;
 const items=[
  ['glock:202600','weapon','Glock-18','Pumpkin Patch',0,'#e98532','pumpkin','#ffcf72'],
  ['usp:202601','weapon','USP-S','Phantom Fog',0,'#c4d7d1','ghost','#8c72d7'],
  ['mp9:202602','weapon','MP9','Candy Venom',1,'#8fc84d','toxic','#a970dd'],
  ['p250:202603','weapon','P250','Witch Brew',1,'#8756bd','toxic','#b7e875'],
  ['ak:202604','weapon','AK-47','Jack-o-Lantern',2,'#d66b24','pumpkin','#fdd284'],
  ['m4:202605','weapon','M4A1-S','Moonlit Web',2,'#7b65b4','web','#e0d2ed'],
  ['awp:202606','weapon','AWP','Grave Watch',3,'#d3c7a7','bones','#799b89'],
  ['deagle:202607','weapon','Desert Eagle','Blood Moon',3,'#973343','blood','#e5a276'],
  ['ak:202620','weapon','AK-47','Hexfire',2,'#9857c2','toxic','#e99839'],
  ['m4:202621','weapon','M4A1-S','Haunted Rose',2,'#b14e60','web','#d7b9cd'],
  ['awp:202622','weapon','AWP','Necromancer',3,'#a9c95f','bones','#e8dfb6'],
  ['deagle:202623','weapon','Desert Eagle','Midnight Pact',3,'#7664b2','ghost','#bfd9d2'],
  ['knife:202630','knife','Karambit','Reaper Hook',4,'#be6c31','web','#ead8ba','karambit'],
  ['knife:202631','knife','Butterfly Knife','Vampire Waltz',4,'#a53455','blood','#e2b7c5','butterfly'],
  ['knife:202632','knife','M9 Bayonet','Gravekeeper',4,'#d5c9ab','bones','#7dbfa6','m9'],
  ['knife:202633','knife','Kukri Knife','Pumpkin Reaper',4,'#e18a36','pumpkin','#f3d38e','kukri'],
  ['v:202640','glove','Gloves','Skeleton Grip',4,'#24323b','bones','#e0d7b6'],
  ['v:202641','glove','Gloves','Spider Silk',4,'#60335b','web','#e1a872'],
  ['m:202650','music','MVP Music','Pumpkin Parade',1,'#e18a36','pumpkin','#f3d38e'],
  ['m:202651','music','MVP Music','Witching Hour',1,'#8a64c3','toxic','#a5d66c'],
  ['m:202652','music','MVP Music','Graveyard Bells',2,'#7fa69d','ghost','#e7ddbc'],
  ['m:202653','music','MVP Music','Vampire Rave',2,'#b14660','blood','#d3acc6'],
  ['m:202654','music','MVP Music','Haunted Circuit',3,'#80b465','web','#c7dcd0']
 ].map(([id,kind,label,n,r,c,style,accent,model])=>Object.freeze({id,kind,label,n,r,c,style,accent,model,event:ID}));
 const byId=new Map(items.map(i=>[i.id,i]));
 const musicDefs=[
  {bpm:112,w:'triangle',m:[0,3,7,6,10,7,3,-1],b:[0,-5,0,-3],root:-5},
  {bpm:96,w:'square',m:[0,7,3,6,12,6,3,-1],b:[0,-7,-3,-5],root:-7},
  {bpm:84,w:'sine',m:[0,12,7,3,6,3,-1,7],b:[0,-5,-3,-7],root:-9},
  {bpm:138,w:'sawtooth',m:[0,3,7,12,10,7,6,3],b:[0,-12,-5,-7],root:-5},
  {bpm:128,w:'triangle',m:[0,6,7,10,7,3,6,-1],b:[0,-7,-3,-5],root:-2}
 ];
 const cases={
  hw_pumpkin:{id:'hw_pumpkin',n:'Dyniowa skrytka',price:60,color:'#e79240',art:'pumpkin',pool:[['glock:202600',35],['usp:202601',25],['mp9:202602',14],['p250:202603',10],['ak:202604',7],['m4:202605',5],['awp:202606',2.5],['deagle:202607',1.5]]},
  hw_reaper:{id:'hw_reaper',n:'Skarbiec Żniwiarza',price:240,color:'#b98be2',art:'coffin',pool:[['ak:202620',44],['m4:202621',30],['awp:202622',15],['deagle:202623',5],['knife:202630',1],['knife:202631',1],['knife:202632',1],['knife:202633',1],['v:202640',1],['v:202641',1]]},
  hw_music:{id:'hw_music',n:'Upiorna pozytywka',price:35,color:'#a4c97f',art:'music',pool:[['m:202650',30],['m:202651',25],['m:202652',20],['m:202653',15],['m:202654',10]]}
 };
 const daily=[
  {id:'time',field:'seconds',goal:600,reward:30,label:'Graj aktywnie przez 10 minut'},
  {id:'matches',field:'matches',goal:2,reward:25,label:'Ukończ 2 mecze'},
  {id:'win',field:'wins',goal:1,reward:20,label:'Wygraj 1 mecz'},
  {id:'kills',field:'kills',goal:15,reward:20,label:'Zdobądź 15 eliminacji'}
 ],milestones=[
  {id:'season-time',field:'seconds',goal:3600,reward:100,label:'Spędź 60 minut w meczach'},
  {id:'season-matches',field:'matches',goal:10,reward:100,label:'Ukończ 10 meczów'},
  {id:'season-wins',field:'wins',goal:10,reward:150,label:'Wygraj 10 meczów'}
 ];
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'});
 const active=(now=Date.now())=>Number.isFinite(now)&&now>=START&&now<END,day=now=>formatter.format(new Date(now)),base=id=>typeof id==='string'?id.replace(/:st$/,''):'';
 function item(id){const def=byId.get(base(id));return def&&(!id.endsWith(':st')||def.kind==='weapon'||def.kind==='knife')?def:null;}
 function weapon(id){const def=item(id);return def&&(def.kind==='weapon'||def.kind==='knife')?def:null;}
 const glove=id=>item(id)?.kind==='glove'?item(id):null;
 function music(id){const def=item(id);if(def?.kind!=='music')return null;return{...def,...musicDefs[+def.id.split(':')[1]-202650]};}
 function skin(id){const def=weapon(id);if(!def)return null;const st=id.endsWith(':st');return{...def,w:def.id.split(':')[0],st,name:(st?'StatTrak™ ':'')+def.label+' | '+def.n};}
 function state(profile,now=Date.now()){
  let e=profile[KEY];if(!e||e.version!==1)e=profile[KEY]={version:1,candies:0,earned:0,spent:0,stats:{seconds:0,matches:0,wins:0,kills:0},day:day(now),daily:{seconds:0,matches:0,wins:0,kills:0},claimed:[],milestones:[],results:[],history:[],inventory:[],loadout:{}};
  for(const k of['candies','earned','spent'])if(!Number.isFinite(e[k])||e[k]<0)e[k]=0;
  for(const k of['stats','daily']){e[k]=e[k]&&typeof e[k]==='object'?e[k]:{};for(const field of['seconds','matches','wins','kills'])if(!Number.isFinite(e[k][field])||e[k][field]<0)e[k][field]=0;}
  for(const k of['claimed','milestones','results','history','inventory'])if(!Array.isArray(e[k]))e[k]=[];
  if(!e.loadout||typeof e.loadout!=='object'||Array.isArray(e.loadout))e.loadout={};
  if(active(now)&&e.day!==day(now)){e.day=day(now);e.daily={seconds:0,matches:0,wins:0,kills:0};e.claimed=[];}
  return e;
 }
 const owned=profile=>(Array.isArray(profile?.[KEY]?.inventory)?profile[KEY].inventory:[]).filter(id=>!!item(id)),owns=(profile,id)=>!!item(id)&&owned(profile).includes(id);
 const credit=(e,n)=>{e.candies+=n;e.earned+=n;return n;};
 function play(profile,seconds,now=Date.now()){
  if(!active(now)||!Number.isFinite(seconds)||seconds<=0)return 0;const e=state(profile,now),before=Math.floor(e.stats.seconds/60);e.stats.seconds+=seconds;e.daily.seconds+=seconds;return credit(e,(Math.floor(e.stats.seconds/60)-before)*2);
 }
 function elimination(profile,count,now=Date.now()){if(!active(now)||!Number.isFinite(count)||count<=0)return;const e=state(profile,now),n=Math.min(100,Math.floor(count));e.stats.kills+=n;e.daily.kills+=n;}
 function finish(profile,key,won,seconds,now=Date.now()){
  if(!active(now)||typeof key!=='string'||!key||!Number.isFinite(seconds)||seconds<60)return 0;const e=state(profile,now);if(e.results.includes(key))return 0;e.results=[key,...e.results].slice(0,128);e.stats.matches++;e.daily.matches++;if(won){e.stats.wins++;e.daily.wins++;}return credit(e,won?18:12);
 }
 function claim(profile,id,now=Date.now()){
  if(!active(now))throw Error('HW_ENDED');const e=state(profile,now),isDaily=daily.some(q=>q.id===id),q=(isDaily?daily:milestones).find(q=>q.id===id);if(!q)throw Error('HW_QUEST');const done=isDaily?e.claimed:e.milestones,progress=isDaily?e.daily:e.stats;if(done.includes(id))return 0;if(progress[q.field]<q.goal)throw Error('HW_PROGRESS');done.push(id);return credit(e,q.reward);
 }
 function roll(caseId,random=Math.random){
  const c=cases[caseId];if(!c)throw Error('HW_CASE');const value=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('HW_RANDOM');return n;};let ticket=value()*100,id=c.pool.at(-1)[0];for(const [candidate,weight]of c.pool){ticket-=weight;if(ticket<0){id=candidate;break;}}return weapon(id)&&value()<STAT_CHANCE?id+':st':id;
 }
 function open(profile,caseId,token,random=Math.random,now=Date.now()){
  if(!active(now))throw Error('HW_ENDED');const c=cases[caseId];if(!c)throw Error('HW_CASE');const e=state(profile,now),seen=e.history.find(r=>r.token===token);if(seen){if(seen.caseId!==caseId)throw Error('HW_REQUEST');return seen;}if(typeof token!=='string'||token.length<8||token.length>100)throw Error('HW_REQUEST');if(e.candies<c.price)throw Error('HW_FUNDS');const id=roll(caseId,random),def=item(id);if(!def)throw Error('HW_ITEM');
  e.candies-=c.price;e.spent+=c.price;e.inventory.push(id);
  if(id.endsWith(':st')){profile.stk=profile.stk||{};profile.stk[id]=profile.stk[id]||0;}
  const result={caseId,item:id,token,at:now,seen:false,event:ID};e.history=[result,...e.history].slice(0,40);profile.caseOpening={...result};return result;
 }
 return{ID,START,END,KEY,STAT_CHANCE,items,cases,daily,milestones,active,day,item,weapon,glove,music,skin,isEvent:id=>!!item(id),owned,owns,state,play,elimination,finish,claim,roll,open};
});
