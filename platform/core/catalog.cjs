'use strict';
const reserved=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const builtins=[
 {id:'strike-zone',title:'Strike Zone 2D',executable:'StrikeZone.exe',seed:'zonehub-seed.json',manifestName:'zonehub-game-manifest.json',releasePrefix:'v'},
 {id:'zone-royale',title:'Zone Royale',executable:'ZoneRoyale.exe',seed:'zonehub-royale-seed.json',manifestName:'zonehub-royale-manifest.json',releasePrefix:'royale-v'}
];
function resolveRecord(row){
 if(!row||reserved.test(row.id)||typeof row.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(row.id)||typeof row.title!=='string'||!row.title.trim()||row.title.length>120)return null;
 const base=builtins.find(s=>s.id===row.id),cfg=row.package_config;
 if(cfg==null)return base?{...base,title:row.title}:null;
 if(!cfg||typeof cfg!=='object'||Array.isArray(cfg)||cfg.protocol!==1||reserved.test(cfg.executable)||typeof cfg.executable!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,60}\.exe$/.test(cfg.executable)||typeof cfg.manifestName!=='string'||!/^[a-z0-9][a-z0-9._-]{0,90}\.json$/.test(cfg.manifestName)||typeof cfg.releasePrefix!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(cfg.releasePrefix)||cfg.releasePrefix.startsWith('zonehub-'))return null;
 return{id:row.id,title:row.title,executable:cfg.executable,manifestName:cfg.manifestName,releasePrefix:cfg.releasePrefix,...(base?{seed:base.seed}:{})};
}
module.exports=builtins;module.exports.resolveRecord=resolveRecord;
