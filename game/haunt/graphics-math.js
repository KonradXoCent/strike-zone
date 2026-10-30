/* Pure camera/input mapping; no changes to the authoritative investigation simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HauntGraphicsMath=api;})(globalThis,function(){'use strict';
 const scale=.025,eye=1.62,ceiling=3.05;
 function move(side,forward,yaw){return{x:Math.cos(yaw)*forward-Math.sin(yaw)*side,y:Math.sin(yaw)*forward+Math.cos(yaw)*side};}
 function point(map,p,height=0){const floor=p.y>=map.groundHeight?-1:0;return{x:p.x*scale,y:(floor<0?-4:0)+height,z:(p.y-(floor<0?map.groundHeight:0))*scale,floor};}
 function pose(map,p,pitch=0){const a=point(map,p,eye),yaw=Number.isFinite(p.angle)?p.angle:-Math.PI/2;return{...a,target:{x:a.x+Math.cos(yaw)*Math.cos(pitch),y:a.y+Math.sin(pitch),z:a.z+Math.sin(yaw)*Math.cos(pitch)}};}
 return{scale,eye,ceiling,move,point,pose};
});
