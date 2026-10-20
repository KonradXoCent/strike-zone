/* Cosmetic hooks use the same frozen state replicated by the host. */
(function(){'use strict';
 const oldSmoke=NADE_NAMES.smoke;
 Object.defineProperty(NADE_NAMES,'smoke',{enumerable:true,configurable:true,get:()=>MODE()==='zombie'?szLocale.t('Granat zamrażający'):oldSmoke});
 const bodyBefore=drawBody;drawBody=function(p){bodyBefore(p);if(!SzZombieRules.frozen(p,MODE()))return;cx.save();cx.translate(p.x,p.y);cx.fillStyle='#8bdfff55';cx.strokeStyle='#b9f1ff';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(0,0,R+4,R+6,0,0,Math.PI*2);cx.fill();cx.stroke();cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;cx.moveTo(Math.cos(a)*6,Math.sin(a)*6);cx.lineTo(Math.cos(a)*(R+8),Math.sin(a)*(R+8));}cx.stroke();cx.restore();};
 const grenadeBefore=drawGrenadeSprite;drawGrenadeSprite=function(q,k,x,y,s){grenadeBefore(q,k,x,y,s);if(k!=='smoke'||MODE()!=='zombie')return;q.save();q.translate(x,y);q.scale(s||1,s||1);q.strokeStyle='#b5f0ff';q.fillStyle='#68d9ed';q.lineWidth=1.5;q.fillRect(-3,-3,6,6);q.beginPath();q.moveTo(-6,0);q.lineTo(6,0);q.moveTo(0,-6);q.lineTo(0,6);q.stroke();q.restore();};
 const buyBefore=showBuy;showBuy=function(){const r=buyBefore();if(MODE()!=='zombie'||!G||G.me.team!=='CT')return r;const button=$('buy').querySelector('button[onclick*="giveG(G.me,\'smoke\')"]');if(button){const title=button.querySelector('b');if(title)title.textContent=szLocale.t('Granat zamrażający');const description=button.querySelector('small');if(description)description.textContent='$'+GP.smoke+' · '+szLocale.t('Zamraża zombie na 3 s w promieniu 150.');}return r;};
})();
