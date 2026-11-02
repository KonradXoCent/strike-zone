'use strict';
// Evaluated in the actual renderer; only arranges the shot, then runs the real match engine.
function keeperScene({mode='classic',team=1,speed=1050}={}){
 const m=mode==='ultimate'?ZoneUltimate.model:ZoneFootballMatch.model,E=ZoneUltimateEngine;
 m.phase='live';m.phaseTime=0;m.restart=null;m.offside=null;m.inputs=[{},{}];
 for(const p of m.players){p.x=E.FIELD.cx;p.y=250+p.slot*25;p.cooldown=99;p.charge=0;p.shootHeld=false;}
 const k=m.players[team*m.size],dir=E.direction(m,team);k.x=E.ownGoal(m,team)+dir*25;k.y=E.FIELD.cy;k.cooldown=0;
 m.ball={...m.ball,owner:null,x:k.x+dir*200,y:E.FIELD.cy,vx:-dir*speed,vy:0,release:0,lastTeam:1-team,lastPlayer:(1-team)*m.size+2,kick:{kind:'shot',at:m.elapsed,team:1-team,launchSpeed:speed}};
 const before=m.eventSerial;
 for(let i=0;i<80&&!m.events.some(e=>e.id>before&&['parry','save'].includes(e.kind));i++)E.step(m,.01);
 ZoneFootballAudio.tick(m);
 if(mode==='classic')ZoneFootballMatch.draw();
 return{owner:m.ball.owner,lastTeam:m.ball.lastTeam,keeper:k.id,event:m.events.at(-1),saveKind:k.saveKind,stats:m.stats[team],score:m.score};
}
module.exports={keeperScene};
