'use strict';
const assert=require('node:assert/strict');
module.exports=async function halloweenTrades(sender,recipient,a,b){
 const backups=await Promise.all([sender.evaluate(()=>JSON.stringify(P())),recipient.evaluate(()=>JSON.stringify(P()))]);
 try{
  for(const id of['knife:202631:st','v:202640','m:202650']){
   await sender.evaluate(id=>{const p=P();p.skins=[];p.br={items:[],eq:{}};p.eq={};p.eq2={};p.stk={};p[SzHalloweenData.KEY]=null;addItem(id);const load=SzHalloweenData.state(p).loadout;if(id[0]==='m')load.m=id;else if(id[0]==='v')load.glove_CT=id;else{load.knife_CT=id;p.stk[id]=23;}},id);
   await recipient.evaluate(()=>{P().skins=['ak:0'];P().br={items:[],eq:{}};P().eq={};P().eq2={};P().stk={};P()[SzHalloweenData.KEY]=null;});
   await sender.evaluate(id=>trStart(id,'Play'),b);await recipient.waitForFunction(id=>TRQ?.fid===id,a);await recipient.evaluate(()=>trAccept());
   await sender.waitForFunction(()=>TR?.ch?.state==='joined');await recipient.waitForFunction(()=>TR?.ch?.state==='joined');
   await sender.evaluate(id=>trPick(id),id);await recipient.evaluate(()=>trPick('ak:0'));
   await sender.waitForFunction(()=>TR?.their==='ak:0');await recipient.waitForFunction(id=>TR?.their===id,id);
   await sender.evaluate(()=>trConfirm());await recipient.evaluate(()=>trConfirm());
   await sender.waitForFunction(id=>!TR&&hasItem('ak:0')&&!hasItem(id),id);await recipient.waitForFunction(id=>!TR&&hasItem(id)&&!hasItem('ak:0'),id);
   assert.equal(await sender.evaluate(()=>Object.keys(SzHalloweenData.state(P()).loadout).length===0),true,'outgoing equipment is cleared');
   assert.equal(await recipient.evaluate(id=>tradeItemValid(id)&&P().tradeHistory[0].receive===id,id),true);
  }
  assert.equal(await recipient.evaluate(()=>tradeItemValid('m:202699')),false);
  console.log('PASS real SDK Halloween StatTrak knife, glove and MVP music trades, receiver ownership and outgoing equipment cleanup');
 }finally{
  for(const [page,json]of[[sender,backups[0]],[recipient,backups[1]]])await page.evaluate(json=>{const p=P();for(const k of Object.keys(p))delete p[k];Object.assign(p,JSON.parse(json));save();},json);
 }
};
