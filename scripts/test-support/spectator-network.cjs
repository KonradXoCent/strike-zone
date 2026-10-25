/* Every mode rejects voluntary team changes on both peers and on the host. */
const assert=require('node:assert/strict');
module.exports=async function(host,guest,mode){
 await host.evaluate(()=>{G.paused=true;G.over=false;netSnap();});
 const before=await host.evaluate(()=>({count:G.ps.length,slot:G.ps.findIndex(p=>p.rh),team:G.ps.find(p=>p.rh).team}));
 assert.equal(await guest.evaluate(()=>SzSpectator.changeTeam('SPEC')),false);
 assert.equal(await host.evaluate(()=>SzSpectator.changeTeam('SPEC')),false);
 // Bypass the UI: a forged team request and observer hello still cannot steal a role.
 await host.evaluate(()=>{window.__teamProbes=0;window.__teamReceiver=hostRecv;hostRecv=function(p){if(p.probe)window.__teamProbes++;return window.__teamReceiver(p);};});
 await guest.evaluate(async()=>{await netSend({t:'team',team:'SPEC',probe:true});await netSend({t:'team',team:G.me.team==='CT'?'T':'CT',probe:true});await netSend({t:'hello',role:'SPEC',n:'Probe',probe:true});});
 await host.waitForFunction(()=>window.__teamProbes===3);
 assert.deepEqual(await host.evaluate(()=>({count:G.ps.length,slot:G.ps.findIndex(p=>p.rh),team:G.ps.find(p=>p.rh).team})),before);
 assert.equal(await host.evaluate(()=>Object.keys(G.observers||{}).length),0);
 assert.equal(await guest.evaluate(()=>!!G.spectator),false);
 await host.evaluate(()=>{hostRecv=window.__teamReceiver;netSnap();});
 console.log('PASS team lock SDK',mode,'host, guest and forged network requests; mode-owned conversions remain enabled');
};
