/* Royale owns its progression from the first engine instruction, before account loading. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZRProgress=api;})(globalThis,function(){'use strict';
 const ranks=[
  {points:0,pl:'Brąz',en:'Bronze',colour:'#d7986f'},
  {points:250,pl:'Srebro',en:'Silver',colour:'#bdcfdb'},
  {points:700,pl:'Złoto',en:'Gold',colour:'#f3cb63'},
  {points:1400,pl:'Platyna',en:'Platinum',colour:'#65dfca'},
  {points:2400,pl:'Diament',en:'Diamond',colour:'#74c5ff'},
  {points:3600,pl:'Mistrz Burzy',en:'Storm Master',colour:'#b397ff'},
  {points:5000,pl:'Legenda Wyspy',en:'Island Legend',colour:'#ff9bb8'}
 ];
 const achievements=[
  ['zr-first','Pierwsza eliminacja','First elimination','Wyeliminuj pierwszego przeciwnika na wyspie.','Eliminate your first opponent on the island.','kills',1],
  ['zr-hunter','Łowca wyspy','Island hunter','Zdobądź 100 eliminacji w Battle Royale.','Get 100 Battle Royale eliminations.','kills',100],
  ['zr-victory','Ostatni ocalali','Last survivors','Wygraj pierwszy mecz Battle Royale.','Win your first Battle Royale match.','wins',1],
  ['zr-champion','Korona wyspy','Island crown','Wygraj 10 meczów Battle Royale.','Win 10 Battle Royale matches.','wins',10],
  ['zr-explorer','Stały bywalec','Island regular','Ukończ 25 meczów na wyspie.','Complete 25 island matches.','matches',25],
  ['zr-top10','W ścisłej czołówce','Among the best','Ukończ 10 meczów w pierwszej dziesiątce drużyn.','Finish in the top ten teams in 10 matches.','top10',10],
  ['zr-survivor','Weteran burzy','Storm veteran','Przetrwaj łącznie godzinę w meczach.','Survive for a total of one hour in matches.','seconds',3600],
  ['zr-card','Na ratunek','Rescue run','Zbierz 5 kart odrodzenia sojuszników.','Collect 5 teammate reboot cards.','cards',5],
  ['zr-reboot','Druga szansa','Second chance','Wskrześ sojusznika przy vanie odrodzenia.','Reboot a teammate at a reboot van.','reboots',1],
  ['zr-rescuer','Niezawodny sojusznik','Reliable teammate','Wskrześ 10 sojuszników przy vanach.','Reboot 10 teammates at reboot vans.','reboots',10],
  ['zr-ranked','Pierwszy ranking','First ranked drop','Ukończ pierwszy mecz rankingowy Zone Royale.','Complete your first ranked Zone Royale match.','rankedMatches',1],
  ['zr-gold','Złoty zrzut','Golden drop','Zdobądź rangę Złoto w Zone Royale.','Reach Gold rank in Zone Royale.','points',700]
 ];
 const number=v=>Math.max(0,Math.floor(Number(v)||0)),clone=v=>JSON.parse(JSON.stringify(v));
 const statKeys=['kills','deaths','matches','wins','top10','seconds','cards','reboots','rankedMatches','rankedWins','points'];
 function stats(p){const r=p.royale||(p.royale={});if(!r.progress||typeof r.progress!=='object'||Array.isArray(r.progress))r.progress={};const s=r.progress;for(const k of statKeys)s[k]=number(s[k]);s.bd=Array.isArray(s.bd)?s.bd.filter(x=>achievements.some(a=>a[0]===x)):[];s.ac=s.ac&&typeof s.ac==='object'?s.ac:{};s.pinnedBadges=Array.isArray(s.pinnedBadges)?s.pinnedBadges.filter(x=>s.bd.includes(x)).slice(0,3):[];return s;}
 function badgeIds(s){return achievements.filter(a=>number(s[a[5]])>=a[6]).map(a=>a[0]);}
 function rank(p,language='en'){const s=stats(p);let i=0;for(let n=1;n<ranks.length;n++)if(s.points>=ranks[n].points)i=n;return{...ranks[i],index:i,threshold:ranks[i].points,name:ranks[i][language==='pl'?'pl':'en'],next:ranks[i+1]?.points??null,points:s.points,matches:s.rankedMatches};}
 function rankName(p,language='en'){const r=rank(p,language);return r.matches?r.name+' · '+r.points+' RP':language==='pl'?'Niesklasyfikowany':'Unranked';}
 function rankImage(p){const r=rank(p),c=r.matches?r.colour:'#8196aa',n=r.matches?r.index+1:0;const svg='<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><path fill="#102c3a" stroke="'+c+'" stroke-width="2" d="m80 4 38 15-6 33L80 75 48 52l-6-33Z"/><path fill="'+c+'" d="m62 29 8 7 10-18 10 18 8-7-4 24H66Z"/><path fill="none" stroke="'+c+'" stroke-width="3" d="m15 34 25 5-8 11m113-16-25 5 8 11"/><text x="80" y="65" text-anchor="middle" fill="'+c+'" font-size="10" font-family="sans-serif">'+(n?'BR '+n:'?')+'</text></svg>';return 'data:image/svg+xml;base64,'+(typeof btoa==='function'?btoa(svg):Buffer.from(svg).toString('base64'));}
 function delta({place=36,kills=0,seconds=0}={}){return Math.max(-20,(place===1?100:place<=3?60:place<=10?25:0)+Math.min(15,number(kills))*10+Math.min(20,Math.floor(number(seconds)/60))-20);}
 const proxies=new WeakMap(),isolated=new Set(['skins','eq','eq2','agents','hw26','bp','dl','mk','stk']);
 function profile(raw){if(proxies.has(raw))return proxies.get(raw);const p=new Proxy(raw,{get(o,k){const r=rootData(o),s=stats(o);if(k==='wallet')return r.wallet;if(k==='cs')return r.cases;if(k==='ks')return r.keys;if(k==='sr')return s.points;if(k==='cw')return s.rankedMatches;if(statKeys.includes(k)||['bd','ac','pinnedBadges'].includes(k))return s[k];if(isolated.has(k)){r.isolated=r.isolated||{};return r.isolated[k]||(r.isolated[k]=k==='skins'?[]:{});}if(k==='br')return{items:r.items.filter(id=>/^[oc]:/.test(id)),eq:r.eq};return o[k];},set(o,k,v){const r=rootData(o),s=stats(o);if(k==='wallet'){r.wallet=v;return true;}if(k==='cs'){r.cases=v;return true;}if(k==='ks'){r.keys=v;return true;}if(k==='sr'){s.points=v;return true;}if(k==='cw'){s.rankedMatches=v;return true;}if(statKeys.includes(k)||['bd','ac','pinnedBadges'].includes(k)){s[k]=v;return true;}if(isolated.has(k)){r.isolated=r.isolated||{};r.isolated[k]=v;return true;}if(k==='br'){r.items=[...r.items.filter(id=>!(/^[oc]:[0-8]$/.test(id))),...(v?.items||[]).filter(id=>/^[oc]:[0-8]$/.test(id))];r.eq={...r.eq,...v?.eq};return true;}o[k]=v;return true;}});proxies.set(raw,p);return p;}
 function rootData(p){return globalThis.SzRoyaleData?globalThis.SzRoyaleData.state(p):(p.royale||(p.royale={}));}
 function apply(p,value){const s=stats(p),pins=s.pinnedBadges;for(const k of statKeys)s[k]=number(value?.[k]);s.lastMatch=value?.lastMatch||null;s.lastDelta=Number(value?.lastDelta)||0;s.bd=badgeIds(s);s.pinnedBadges=pins.filter(id=>s.bd.includes(id));return s;}
 function rows(language){return achievements.map(a=>[a[0],'◆',a[language==='en'?2:1],a[language==='en'?4:3],p=>number(stats(p)[a[5]])>=a[6]]);}
 return{ranks,achievements,statKeys,stats,rank,rankName,rankImage,delta,profile,apply,rows,badgeIds,clone};
});
