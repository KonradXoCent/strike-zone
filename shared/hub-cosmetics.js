(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.ZoneCosmetics=value;})(globalThis,()=>{
 'use strict';
 const catalog=[
  {id:'halloween',kind:'bundle',price:500,pl:'Po zmroku',en:'After dark',color:'#f4ad66',dark:'#181729'},
  {id:'aurora',kind:'bundle',price:650,pl:'Polarna zorza',en:'Northern lights',color:'#7eeac5',dark:'#10252e'},
  {id:'mirage',kind:'bundle',price:550,pl:'Złoty Mirage',en:'Golden Mirage',color:'#efc685',dark:'#302621'},
  {id:'nebula',kind:'bundle',price:700,pl:'Mgławica',en:'Nebula',color:'#b4a2ff',dark:'#1b1835'},
  {id:'deep-ocean',kind:'bundle',price:600,pl:'Błękitna głębia',en:'Ocean depths',color:'#6ed7ee',dark:'#102735'},
  {id:'sakura',kind:'bundle',price:550,pl:'Ogród sakury',en:'Sakura garden',color:'#f3abcb',dark:'#302333'},
  {id:'frame-halloween',kind:'frame',price:300,pl:'Dyniowy strażnik',en:'Pumpkin guardian',color:'#ffac54'},
  {id:'frame-ember',kind:'frame',price:250,pl:'Żar',en:'Ember',color:'#fc7f63'},
  {id:'frame-aurora',kind:'frame',price:300,pl:'Lodowy kryształ',en:'Ice crystal',color:'#80eadf'},
  {id:'frame-royal',kind:'frame',price:350,pl:'Królewski laur',en:'Royal laurel',color:'#edca72'},
  {id:'frame-neon',kind:'frame',price:300,pl:'Neonowy obwód',en:'Neon circuit',color:'#ba9bff'},
  {id:'frame-vines',kind:'frame',price:250,pl:'Leśna straż',en:'Forest guard',color:'#9dd58a'}
 ];
 const free=['violet','ocean','ember','forest'],themes=catalog.filter(x=>x.kind==='bundle').map(x=>x.id),frames=catalog.filter(x=>x.kind==='frame').map(x=>x.id);
 return Object.freeze({catalog,free,themes,frames,themeIds:[...free,...themes],item:id=>catalog.find(x=>x.id===id)});
});
