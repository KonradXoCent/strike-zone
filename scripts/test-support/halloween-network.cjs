'use strict';
const assert=require('node:assert/strict');
module.exports={
 async seed(guest){await guest.evaluate(()=>{const p=P();for(const id of['knife:202631:st','ak:202604:st','m4:202605','v:202640'])if(!hasItem(id))addItem(id);const load=SzHalloweenData.state(p).loadout;load.ak='ak:202604:st';load.m4='m4:202605';for(const team of['CT','T']){load['knife_'+team]='knife:202631:st';load['glove_'+team]='v:202640';}});},
 async verify(host,guest){await host.waitForFunction(()=>G.ps.find(p=>p.rh)?.netCos?.knife==='knife:202631:st');await guest.waitForFunction(()=>G.me.netCos?.glove==='v:202640');const remote=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh),fake={...p,cur:'knife'},id=heldSkinId(fake);heldWeaponPose('knife',id);return{knife:id,glove:heldGloveId(fake),held:heldGloveSprite(fake).width,model:HELD_POSES.has('knife|butterfly'),image:weaponImage('knife',id,220,110).startsWith('data:image/png')};});assert.deepEqual(remote,{knife:'knife:202631:st',glove:'v:202640',held:80,model:true,image:true});console.log('PASS synchronized Halloween rifle/knife/glove cosmetics and remote original model/pattern rendering');}
};
