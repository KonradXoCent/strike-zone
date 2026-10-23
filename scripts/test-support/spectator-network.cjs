/* Run on the shipped Supabase SDK/Phoenix transport. No production accounts
   or databases are used; both clients consume the same authoritative match. */
const assert=require('node:assert/strict');
module.exports=async function(host,guest,mode){
 await host.evaluate(()=>{G.paused=true;G.over=false;G.voting=1;netSnap();});await guest.evaluate(()=>{G.over=false;$('ov').style.display='none';});
 const before=await host.evaluate(()=>({count:G.ps.length,slot:G.ps.findIndex(p=>p.rh)}));assert.ok(before.slot>=0);
 await guest.evaluate(()=>SzSpectator.changeTeam('SPEC'));
 await host.waitForFunction(()=>Object.keys(G.observers||{}).length===1&&!G.ps.some(p=>p.rh));await guest.waitForFunction(()=>G.spectator&&G.observerConfirmed&&!G.netWaiting&&!G.ps.includes(G.me));
 assert.equal(await host.evaluate(()=>G.ps.length),before.count);assert.equal(await guest.evaluate(()=>G.ps.length),before.count);assert.equal(await host.evaluate(slot=>!G.ps[slot].human&&!G.ps[slot].rh,before.slot),true);
 await host.evaluate(()=>{window.__observerCommands=0;window.__observerBefore=JSON.stringify(G.ps.map(p=>[p.x,p.y,p.hp,p.armor,p.money,p.cur,p.pri,p.sec,p.ammo,p.g,p.inp]));window.__observerReceiver=hostRecv;hostRecv=function(p){if(p.probe)window.__observerCommands++;return window.__observerReceiver(p);};});
 const profile=await guest.evaluate(()=>JSON.stringify(P()));
 await guest.evaluate(async()=>{for(const p of[{t:'in',k:{w:true,d:true,e:true},f:true,an:0},{t:'buy',k:'ak'},{t:'gear',n:1},{t:'nade_buy',k:'frag'},{t:'nade',k:'frag',x:100,y:100},{t:'pick'},{t:'drop'},{t:'wall'},{t:'mine'},{t:'mg_vote',kind:'football',serial:G.mg?.serial},{t:'mg_action',x:100,y:100},{t:'class',n:'tank'},{t:'sw',s:1},{t:'rl'}])await netSend({...p,probe:true});});
 await host.waitForFunction(()=>window.__observerCommands===14);assert.equal(await host.evaluate(()=>JSON.stringify(G.ps.map(p=>[p.x,p.y,p.hp,p.armor,p.money,p.cur,p.pri,p.sec,p.ammo,p.g,p.inp]))===window.__observerBefore),true,mode+' observer commands never affect actors');assert.equal(await guest.evaluate(()=>JSON.stringify(P())),profile);
 await host.evaluate(()=>{hostRecv=window.__observerReceiver;delete window.__observerReceiver;});
 const slot=await host.evaluate(()=>{const ffa=['dm','br'].includes(MODE()),slots=G.ps.filter(p=>!p.human&&!p.rh&&!p.out&&['CT','T'].includes(ffa?p.homeTeam:p.team)),p=slots.find(p=>p.alive)||slots[0];p.alive=true;p.hp=39;p.armor=11;netSnap();return{index:G.ps.indexOf(p),role:ffa?p.homeTeam:p.team};});
 await guest.evaluate(role=>SzSpectator.changeTeam(role),slot.role);await host.waitForFunction(index=>!!G.ps[index].rh,slot.index);await guest.waitForFunction(()=>!G.spectator&&G.me.human&&G.me.rid===NET.cid);assert.equal(await guest.evaluate(()=>G.me.hp),39);assert.equal(await guest.evaluate(()=>G.me.armor),11);assert.equal(await guest.evaluate(()=>SzSpectator.xray()),false);assert.equal(await host.evaluate(()=>G.ps.length),before.count);
 await host.evaluate(()=>SzSpectator.changeTeam('SPEC'));await guest.waitForFunction(()=>G.observers.some(p=>p.cid===NET.hostCid));assert.equal(await host.evaluate(()=>G.spectator&&!G.ps.includes(G.me)&&!G.ps.some(p=>p.human)),true);
 await guest.evaluate(()=>SzSpectator.changeTeam('SPEC'));await guest.waitForFunction(()=>G.spectator&&G.observerConfirmed);assert.equal(await host.evaluate(()=>G.ps.every(p=>!p.human&&!p.rh)),true);assert.equal(await guest.evaluate(()=>SzSpectator.list().length),await host.evaluate(()=>SzSpectator.list().length));
 // A freshly created client joining as SPEC must acknowledge registration even
 // though its cid will never appear in an actor slot (the normal hello loop).
 await guest.evaluate(()=>quit());await host.waitForFunction(()=>Object.keys(G.observers||{}).length===0);await guest.evaluate(()=>netSend({t:'join'}));await guest.waitForFunction(()=>G?.client&&G.spectator&&G.observerConfirmed&&!G.netWaiting,null,{timeout:15000});assert.equal(await guest.evaluate(()=>NET.joinTimer),null);assert.equal(await guest.evaluate(()=>G.ps.some(p=>p.human)),false);await guest.evaluate(()=>{clientTick(.05);draw();});
 console.log('PASS spectator SDK',mode,'same world, no slot, ignored combat/votes, role transfer without healing, host observer and fresh SPEC join');
};
