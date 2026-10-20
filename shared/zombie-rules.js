/* Host-authoritative Zombie Mode rules, shared with client prediction and pure checks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzZombieRules=api;})(globalThis,function(){'use strict';
 const FREEZE_RADIUS=150,FREEZE_SECONDS=3;
 function allowed(mode,target,source,sourceTeam){return mode!=='zombie'||target?.team!=='CT'||(sourceTeam||source?.team)!=='CT';}
 function frozen(player,mode){return mode==='zombie'&&player?.team==='T'&&player.alive&&(player.zFreeze||0)>0;}
 function freeze(players,point,visible=()=>true){let count=0;for(const p of players)if(p.alive&&p.team==='T'&&!(p.inv>0)&&Math.hypot(p.x-point.x,p.y-point.y)<=FREEZE_RADIUS&&visible(point,p)){p.zFreeze=Math.max(p.zFreeze||0,FREEZE_SECONDS);p.burn=0;p.bby=null;p.bteam=null;p.bk=0;count++;}return count;}
 return{FREEZE_RADIUS,FREEZE_SECONDS,allowed,frozen,freeze};
});
