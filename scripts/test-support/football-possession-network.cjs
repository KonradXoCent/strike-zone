'use strict';
const assert=require('node:assert/strict');
module.exports=async function verifyFreeBall(host,guest){
 assert.equal(await guest.evaluate(()=>G.ps.filter(p=>p.mgKeeper).length),2,'keeper roles reach the other client');
 await host.evaluate(()=>{const remote=G.ps.find(p=>p.rh);G.__footballAlive=G.ps.map(p=>({alive:p.alive,hp:p.hp}));G.ps.forEach(p=>{if(p!==remote&&p!==G.me)p.alive=false;});keys={};mouse.d=mouse.r=0;G.me.x=400;G.me.y=200;Object.assign(remote,{x:620,y:416,cd:0,inp:{},lastIn:performance.now()});G.mg.ball={...SzFootball.ball(),x:660,y:416,vx:160};netSnap();});
 await guest.waitForFunction(()=>G.mg.ball.x>665&&!('owner'in G.mg.ball));await guest.evaluate(()=>{keys.a=1;});await host.waitForFunction(()=>G.ps.find(p=>p.rh).x<610);await guest.evaluate(()=>{keys={};});await host.waitForFunction(()=>!G.ps.find(p=>p.rh).inp.a);await host.waitForFunction(()=>G.mg.ball.x>690);
 assert.equal(await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);return !('owner'in G.mg.ball)&&G.mg.ball.x>680&&G.mg.ball.x-p.x>65&&G.mg.ball.vx>0;}),true,'ball keeps rolling independently of the guest');
 const before=await host.evaluate(()=>G.mg.stats.kicks||0);
 await guest.evaluate(()=>netSend({t:'in',k:{},f:true,an:.12345,mg:{x:1000,y:416,shot:true,owner:G.ps.indexOf(G.me),keeper:true}}));await host.waitForFunction(()=>G.ps.find(p=>p.rh).inp.an===.12345);
 assert.equal(await host.evaluate(n=>!('owner'in G.mg.ball)&&!G.ps.find(p=>p.rh).mgKeeper&&(G.mg.stats.kicks||0)===n,before),true,'a distant guest cannot claim the ball or a keeper role');
 const kicks=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);G.me.x=350;G.me.y=200;Object.assign(p,{x:620,y:416,cd:0,inp:{},lastIn:performance.now()});G.mg.ball={...SzFootball.ball(),x:645,y:416};netSnap();return G.mg.stats.kicks||0;});
 await guest.waitForFunction(()=>Math.abs(G.mg.ball.x-645)<3&&Math.abs(G.me.x-620)<3);await guest.evaluate(()=>{SzMiniGames.view.draw();mouse.x=(1000-cam.x)*VIEW_ZOOM;mouse.y=(416-cam.y)*VIEW_ZOOM;mouse.d=1;mouse.r=0;});
 await host.waitForFunction(n=>G.mg.stats.kicks===n+1&&G.mg.ball.last===G.ps.findIndex(p=>p.rh)&&Math.hypot(G.mg.ball.vx,G.mg.ball.vy)>650,kicks);await guest.evaluate(()=>{mouse.d=0;});await host.waitForFunction(()=>!G.ps.find(p=>p.rh).inp.f);
 await host.evaluate(()=>{const p=G.ps.find(p=>p.rh),bot=G.ps.find(q=>q!==p&&q.team===p.team&&!q.mgKeeper);Object.assign(p,{x:620,y:500,cd:2,inp:{},lastIn:performance.now()});Object.assign(bot,{alive:true,human:false,rh:false,x:820,y:416,cd:0});bot.mgBrain.fire=0;bot.mgBrain.playAt=0;G.mg.ball={...SzFootball.ball(),x:800,y:416};SzFootball.bot(bot,.02);netSnap();});
 await host.waitForFunction(()=>G.mg.stats.humanPasses>=1&&G.mg.stats.completedHumanPasses>=1);await guest.waitForFunction(()=>G.mg.stats.completedHumanPasses>=1&&!('owner'in G.mg.ball));
 await host.evaluate(()=>{G.ps.forEach((p,i)=>Object.assign(p,G.__footballAlive[i]));delete G.__footballAlive;netSnap();});
 console.log('PASS synchronized free ball, guest movement without possession, rejected ball/keeper forgery, actual original LMB kick and bot pass received by the guest');
};
