'use strict';
const assert=require('node:assert/strict');
module.exports=async function(host,guest){
 const saved=await guest.evaluate(()=>({skins:[...P().skins],loadout:structuredClone(P().teamLoadout||{})}));
 await host.evaluate(()=>{G.paused=true;G.ph='buy';G.nobuy=false;G.t=30;const p=G.ps.find(p=>p.rh);p.alive=true;p.money=16000;p.pri=null;p.sec='glock';p.cur='glock';p.g={};p.armor=0;p.kit=0;p.bl=[];netSnap();});
 await guest.waitForFunction(()=>G.ph==='buy'&&G.paused&&G.me.money===16000);
 await guest.evaluate(()=>{G.bo=1;BT='rifle';showBuy();});
 for(const k of['ak','armor','frag']){
  await guest.evaluate(k=>document.querySelector('[data-buy-key="'+k+'"]').click(),k);
  await host.waitForFunction(k=>G.ps.find(p=>p.rh).bl?.some(b=>b.k===k),k);
  await guest.waitForFunction(k=>!!document.querySelector('[data-refund-item="'+k+'"]'),k);
  const below=await guest.evaluate(k=>{const item=document.querySelector('[data-buy-item="'+k+'"]');return item.querySelector('.sz-buy-refund').getBoundingClientRect().top>=item.querySelector('.sz-buy-purchase').getBoundingClientRect().bottom-1;},k);assert.equal(below,true);
  await guest.evaluate(k=>document.querySelector('[data-refund-item="'+k+'"]').click(),k);
  await host.waitForFunction(()=>G.ps.find(p=>p.rh).money===16000);await guest.waitForFunction(()=>G.me.money===16000);
 }
 await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);p.team='CT';p.sec='usp';p.cur='usp';netSnap();});await guest.waitForFunction(()=>G.me.team==='CT');
 await guest.waitForFunction(()=>!!document.querySelector('[data-buy-key=kit]'));await guest.evaluate(()=>document.querySelector('[data-buy-key=kit]').click());await host.waitForFunction(()=>!!G.ps.find(p=>p.rh).kit);await guest.waitForFunction(()=>!!document.querySelector('[data-refund-item=kit]'));await guest.evaluate(()=>document.querySelector('[data-refund-item=kit]').click());await host.waitForFunction(()=>!G.ps.find(p=>p.rh).kit&&G.ps.find(p=>p.rh).money===16000);
 await guest.evaluate(()=>{const p=P();for(const id of['knife:0:st','knife:1'])if(!p.skins.includes(id))p.skins.push(id);p.teamLoadout={CT:{knife:'knife:0:st'},T:{knife:'knife:1'}};});
 await guest.waitForFunction(()=>G.me.money===16000);await host.evaluate(()=>netSnap());await host.waitForFunction(()=>G.ps.find(p=>p.rh).netCos?.knife==='knife:0:st');
 await host.evaluate(()=>{G.ps.find(p=>p.rh).team='T';netSnap();});await guest.waitForFunction(()=>G.me.team==='T');await host.waitForFunction(()=>G.ps.find(p=>p.rh).netCos?.knife==='knife:1');
 await guest.waitForFunction(()=>!!document.querySelector('[data-buy-key=ak]'));await guest.evaluate(()=>document.querySelector('[data-buy-key=ak]').click());await host.waitForFunction(()=>G.ps.find(p=>p.rh).pri==='ak');
 await host.evaluate(()=>{G.ph='live';netSnap();});await guest.waitForFunction(()=>G.ph==='live');await guest.evaluate(()=>netSend({t:'refund',i:0}));assert.equal(await host.evaluate(()=>G.ps.find(p=>p.rh).money),await host.evaluate(()=>16000-W.ak.cost));assert.equal(await host.evaluate(()=>G.ps.find(p=>p.rh).pri),'ak');
 await guest.evaluate(()=>{G.bo=0;showBuy();});await host.evaluate(()=>{G.ps.find(p=>p.rh).team='T';G.ph='buy';G.t=30;netSnap();});
 await guest.evaluate(saved=>{P().skins=saved.skins;P().teamLoadout=saved.loadout;},saved);
 console.log('PASS actual SDK host/guest buy cards, weapon/armor/grenade/kit refunds, authoritative ledger, expired refund rejection and team-specific cosmetic replication');
};
