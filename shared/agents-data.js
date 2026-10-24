(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzAgentData=api;})(globalThis,function(){'use strict';
 const CASE='agents',PRICE=5000,KEY_PRICE=1500,weights=[45,28,16,8,3];
 const rows=[
 ['ct_vanguard','CT','Vanguard',0,'#35546e','#243440','#26394b','#8ac9ee','helmet'],
 ['ct_ranger','CT','Forest Ranger',1,'#596b55','#334335','#35483d','#a4cfb8','helmet'],
 ['ct_arctic','CT','Arctic Sentinel',2,'#c6d1d3','#637989','#b8c8cf','#78bdd8','hood'],
 ['ct_breach','CT','Breach Unit',3,'#303940','#1b242c','#283139','#c8ad6c','mask'],
 ['ct_spectre','CT','Night Spectre',4,'#435467','#242f43','#293444','#94c9e2','visor'],
 ['t_nomad','T','Desert Nomad',0,'#b59b72','#665641','#b6a079','#e0c697','scarf'],
 ['t_rogue','T','Rogue Viper',1,'#687452','#3d4a3c','#344433','#c2ad7e','beret'],
 ['t_crimson','T','Crimson Jackal',2,'#8e4448','#43343a','#8c373e','#d3aa83','bandana'],
 ['t_urban','T','Urban Phantom',3,'#62636c','#30323c','#44444e','#bdb3a4','hood'],
 ['t_warlord','T','Sand Warlord',4,'#8f8062','#424739','#b5a178','#dfb566','scarf']];
 const items=rows.map(([key,team,name,r,uniform,vest,head,accent,gear])=>({id:'agent:'+key,team,name,r,uniform,vest,head,accent,gear}));
 const item=id=>items.find(d=>d.id===id)||null;
 function state(p){p.agents=p.agents&&typeof p.agents==='object'&&!Array.isArray(p.agents)?p.agents:{};const a=p.agents;a.items=Array.isArray(a.items)?a.items.filter(id=>!!item(id)):[];a.eq=a.eq&&typeof a.eq==='object'&&!Array.isArray(a.eq)?a.eq:{};for(const team of['CT','T'])if(item(a.eq[team])?.team!==team||!a.items.includes(a.eq[team]))delete a.eq[team];return a;}
 function equipped(p,team){const a=state(p);return item(a.eq[team]);}
 function equip(p,id,team){if(!['CT','T'].includes(team)||id&&(item(id)?.team!==team||!state(p).items.includes(id)))return false;const a=state(p);if(id)a.eq[team]=id;else delete a.eq[team];return true;}
 function roll(random=Math.random){let n=random()*100;if(!Number.isFinite(n)||n<0||n>=100)throw Error('Invalid random draw');let r=0;while(r<4&&n>=weights[r])n-=weights[r++];const pool=items.filter(d=>d.r===r),pick=random();if(!Number.isFinite(pick)||pick<0||pick>=1)throw Error('Invalid random draw');return pool[Math.floor(pick*pool.length)].id;}
 function open(p,token,random=Math.random){if(typeof token!=='string'||token.length<8||token.length>100)throw Error('Invalid opening');if(p.caseOpening?.token===token){if(p.caseOpening.caseId!==CASE)throw Error('Invalid opening');return p.caseOpening;}if(!(p.cs?.[CASE]>0&&p.ks?.[CASE]>0))throw Error('Missing case or key');const id=roll(random),a=state(p);p.cs[CASE]--;p.ks[CASE]--;a.items.push(id);p.ac=p.ac||{};p.ac.cases=(p.ac.cases||0)+1;return p.caseOpening={caseId:CASE,item:id,token,at:Date.now(),seen:false};}
 function cosmetics(value){const out={};for(const team of['CT','T'])if(item(value?.[team])?.team===team)out[team]=value[team];return out;}
 return{CASE,PRICE,KEY_PRICE,weights,items,item,state,equipped,equip,roll,open,cosmetics};
});
