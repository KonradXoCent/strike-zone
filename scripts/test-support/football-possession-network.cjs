'use strict';
const assert=require('node:assert/strict');
module.exports=async function verifyPossession(host,guest){
 assert.equal(await guest.evaluate(()=>G.ps.filter(p=>p.mgKeeper).length),2,'keeper roles reach the other client');
 await host.evaluate(()=>{const remote=G.ps.find(p=>p.rh);G.__footballAlive=G.ps.map(p=>({alive:p.alive,hp:p.hp}));G.ps.forEach(p=>{if(p!==remote&&p!==G.me)p.alive=false;});keys={};mouse.d=mouse.r=0;G.me.x=400;G.me.y=200;Object.assign(remote,{x:620,y:416,cd:0,inp:{},lastIn:performance.now()});G.mg.ball={...SzFootball.ball(),x:638,y:416};upd(.02);netSnap();});
 await guest.waitForFunction(()=>G.mg.ball.owner===G.ps.indexOf(G.me));await guest.evaluate(()=>{keys.d=1;});await host.waitForFunction(()=>G.ps.find(p=>p.rh).x>630);await guest.evaluate(()=>{keys={};});await host.waitForFunction(()=>!G.ps.find(p=>p.rh).inp.d);
 assert.equal(await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);return G.mg.ball.owner===G.ps.indexOf(p)&&Math.abs(Math.hypot(G.mg.ball.x-p.x,G.mg.ball.y-p.y)-26)<.1;}),true);
 await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);G.me.x=p.x+44;G.me.y=p.y;mouse.x=(p.x-cam.x)*VIEW_ZOOM;mouse.y=(p.y-cam.y)*VIEW_ZOOM;G.mg.ball.tackleAfter=0;upd(.02);netSnap();});
 await guest.waitForFunction(()=>G.mg.ball.owner===G.ps.findIndex(p=>p.rid===NET.hostCid));
 await guest.evaluate(()=>netSend({t:'in',k:{},f:true,an:.12345,mg:{x:1000,y:416,shot:true,owner:G.ps.indexOf(G.me),keeper:true}}));await host.waitForFunction(()=>G.ps.find(p=>p.rh).inp.an===.12345);
 assert.equal(await host.evaluate(()=>G.mg.ball.owner===G.ps.indexOf(G.me)&&!G.ps.find(p=>p.rh).mgKeeper),true,'client cannot claim possession or a keeper role');
 const shots=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);G.me.x=350;G.me.y=200;Object.assign(p,{cd:0,inp:{},lastIn:performance.now()});G.mg.ball={...SzFootball.ball(),x:p.x+18,y:p.y};upd(.02);netSnap();return G.mg.stats.shots||0;});
 await guest.waitForFunction(()=>G.mg.ball.owner===G.ps.indexOf(G.me));await guest.evaluate(()=>{SzMiniGames.view.draw();mouse.x=(1000-cam.x)*VIEW_ZOOM;mouse.y=(416-cam.y)*VIEW_ZOOM;mouse.d=0;mouse.r=1;});
 await host.waitForFunction(n=>G.mg.stats.shots===n+1&&G.mg.ball.last===G.ps.findIndex(p=>p.rh)&&Math.hypot(G.mg.ball.vx,G.mg.ball.vy)>330,shots);await guest.evaluate(()=>{mouse.r=0;});
 await host.evaluate(()=>{G.ps.forEach((p,i)=>Object.assign(p,G.__footballAlive[i]));delete G.__footballAlive;netSnap();});
 console.log('PASS shared football possession, dribbling, opposing tackle, rejected owner/keeper forgery and actual RMB shot');
};
