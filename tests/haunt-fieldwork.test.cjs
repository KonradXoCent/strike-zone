'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),H=require('../game/haunt/engine.js'),C=require('../game/haunt/catalog.js'),{setup}=require('../scripts/test-support/wallet-db.cjs');
const create=(v={})=>H.create({seed:15,players:[{id:'p'}],bots:false,...v}),at=(p,q)=>Object.assign(p,{x:q.x,y:q.y});
const step=(w,seconds)=>{for(let n=0;n<Math.ceil(seconds*10);n++)H.update(w,.1);};
const migration=fs.readFileSync(path.join(__dirname,'../database/haunt-fieldwork.sql'),'utf8');
function curse(kind,options={}){const w=create(options);w.curse.kind=kind;at(w.players[0],w.curse);w.hunt.next=1e9;return w;}
function place(w,kind){const p=w.players[0];at(p,w.map.spawn);assert(H.gear(w,p,kind));at(p,w.map.rooms[0]);p.angle=0;H.equip(p,kind);w.time+=2;assert(H.use(w,p));return w.devices.find(d=>d.kind===kind);}
async function fixture(fieldwork=true){const f=await setup({progression:true,fieldwork});for(const id of f.ids){await f.db.query('insert into saves values($1,$2,now())',[id,JSON.stringify({cur:'QA',profiles:{QA:{wallet:3000,skins:[]}}})]);await f.db.query("insert into zh_library(user_id,game_id) values($1,'zone-haunt')",[id]);}f.haunt=async(id,action,args={})=>(await f.as(id,'select zone_haunt($1,$2::jsonb) value',[action,JSON.stringify({protocol:H.PROTOCOL,equipmentCurrency:'RP',...args})])).rows[0].value;return f;}

test('each map has one reachable seeded possession, varied independent ghost appearances and no exposed deck or ghost identity',()=>{
 const kinds=new Set(),models=new Set();
 for(const m of H.MAPS)for(let seed=14;seed<50;seed++){
  const w=create({mapId:m.id,seed}),same=create({mapId:m.id,seed});kinds.add(w.curse.kind);models.add(w.ghost.model);
  assert.deepEqual(w.curse,same.curse);assert.equal(H.blocked(w,w.curse.x,w.curse.y),false);assert(H.path(w,w.map.spawn,w.curse).length);assert.equal(w.secret.deck.length,10);assert.equal(new Set(w.secret.deck).size,10);
  const s=H.snapshot(w);assert(H.validSnapshot(s,['p']));assert(!('secret'in s));assert(!JSON.stringify(s).includes('falseEvidence'));assert(!('deck'in s.curse));assert.equal(s.curse.revealRoom,null);
 }
 assert.equal(kinds.size,3);assert.equal(models.size,7);
 const s=H.snapshot(create());s.challenges=['no_sanity','no_sanity'];assert.equal(H.validSnapshot(s,['p']),false);
});
test('bots collect finite EMF, thermometer and UV tools at the start, walk through public rooms and leave proof confirmation to humans',()=>{
 const w=create({bots:true,botCount:3,difficulty:'calm'});w.hunt.next=1e9;step(w,12);
 assert.deepEqual(new Set(w.players.filter(p=>p.bot).map(p=>p.tool)),new Set(['thermo','emf','uv']));
 assert.equal(w.stock.flashlight,1);assert(w.players.filter(p=>p.bot).every(p=>p.inventory.length>0));
 const rooms=new Set();for(let i=0;i<900;i++){H.update(w,.1);for(const p of w.players.filter(p=>p.bot)){const r=H.roomAt(w.map,p);if(r>=0)rooms.add(r);}}
 assert(rooms.size>=3);assert.deepEqual(w.found,[]);assert(w.events.some(e=>e.type==='bot-tip'));
 for(const id of H.TOOLS)assert.equal(w.stock[id]+w.players.filter(p=>p.inventory.includes(id)).length+w.devices.filter(d=>d.kind===id).length,1,id);
});
test('four investigators can share one safe closet and leave independently while the others remain hidden',()=>{
 const w=create({players:['p','q','r','s'].map(id=>({id}))}),c=w.map.closets[0];
 w.devices.push({id:'device-1',kind:'book',x:c.x+40,y:c.y,room:c.room,angle:0});
 for(const p of w.players){at(p,{x:c.x+35,y:c.y});assert.equal(H.interaction(w,p).kind,'closet');assert(H.interact(w,p));assert.equal(p.hidden,c.id);}
 H.startHunt(w,{cursed:true});at(w.ghost,c);step(w,10);assert(w.players.every(p=>p.alive&&p.hidden===c.id));
 assert(H.interact(w,w.players[0]));assert.equal(w.players[0].hidden,null);assert(w.players.slice(1).every(p=>p.hidden===c.id));
 const bots=create({bots:true});for(const p of bots.players)at(p,{x:bots.map.closets[0].x+35,y:bots.map.closets[0].y});H.interact(bots,bots.players[0]);H.startHunt(bots,{cursed:true});at(bots.ghost,bots.map.rooms.at(-1));step(bots,4);assert(bots.players.every(p=>p.hidden===bots.map.closets[0].id));
});
test('a mirror shares two uses across players and the second use starts a cursed hunt despite a charged crucifix',()=>{
 const w=curse('mirror',{players:[{id:'p'},{id:'q'}]}),[p,q]=w.players;at(q,w.curse);
 assert(H.useCurse(w,p,'look'));assert.equal(w.curse.uses,1);assert.equal(w.curse.revealRoom,w.secret.room);assert.equal(w.hunt.active,false);
 w.devices.push({id:'device-1',kind:'crucifix',...w.ghost,room:w.secret.room,charges:2});w.time+=2;
 H.input(w,q.id,{action:{seq:1,kind:'curse',value:'look'}},0);assert.equal(w.curse.uses,2);assert(w.curse.broken);assert(w.hunt.active&&w.hunt.cursed);assert.equal(w.devices[0].charges,2);
 at(w.ghost,q);H.update(w,.1);assert(q.alive);assert(w.hunt.graceUntil>w.time);assert.equal(H.useCurse(w,p,'look'),false);
 const uses=w.curse.uses;H.input(w,q.id,{action:{seq:1,kind:'curse',value:'look'}},0);assert.equal(w.curse.uses,uses);
});
test('Ouija communication has real questions, a single speaker and a cumulative timer that pauses on goodbye and hunts after prolonged use',()=>{
 const w=curse('ouija',{players:[{id:'p'},{id:'q'}]}),[p,q]=w.players;at(q,w.curse);
 assert(H.useCurse(w,p,'begin'));step(w,2);assert.equal(H.useCurse(w,q,'begin'),false);assert(H.useCurse(w,p,'where'));assert(w.events.some(e=>e.type==='curse-answer'&&e.room===w.secret.room));step(w,7);
 assert(H.stopCurse(w,p));const used=w.curse.spent;step(w,5);assert.equal(w.curse.spent,used);assert(!w.hunt.active);
 assert(H.useCurse(w,q,'begin'));step(w,12);assert(w.hunt.active&&w.hunt.cursed);assert(w.curse.broken);assert.equal(w.curse.activeBy,null);assert.equal(w.curse.spent,20);
});
test('tarot draws consume a finite shared shuffled deck and apply hunt, power, composure, manifestation and relocation effects',()=>{
 const w=curse('tarot'),p=w.players[0];w.secret.deck=C.CARDS.map(c=>c.id);p.sanity=50;
 for(const id of w.secret.deck){w.time+=2;const oldRoom=w.secret.room;assert(H.useCurse(w,p,'draw'));assert.equal(w.curse.lastCard,id);
  if(id==='death'){assert(w.hunt.active&&w.hunt.cursed);assert.equal(w.curse.broken,false);w.hunt.active=false;}
  if(id==='tower')assert.equal(w.power,false);if(id==='sun')assert.equal(p.sanity,70);if(id==='moon')assert.equal(p.sanity,50);if(id==='devil')assert(w.ghost.visible>w.time);if(id==='wheel')assert.notEqual(w.secret.room,oldRoom);if(id==='star')assert.equal(p.sanity,60);if(id==='magician')assert(w.power&&w.lights);
  assert.equal(H.useCurse(w,p,'draw'),false);
 }
 w.time+=2;assert.equal(w.curse.uses,10);assert.equal(H.useCurse(w,p,'draw'),false);
});
test('motion sensors trigger on real ghost entry, return to green, preserve trips and respect occluding walls',()=>{
 const w=create(),d=place(w,'motion'),far={x:d.x+200,y:d.y};at(w.ghost,far);H.updateSensor(w,d);assert(!d.activeUntil);at(w.ghost,d);H.updateSensor(w,d);assert.equal(d.trips,1);assert(d.activeUntil>w.time);assert(w.events.some(e=>e.type==='motion-alarm'));
 H.updateSensor(w,d);assert.equal(d.trips,1);at(w.ghost,far);w.time+=4;H.updateSensor(w,d);assert(d.activeUntil<w.time);at(w.ghost,d);H.updateSensor(w,d);assert.equal(d.trips,2);
 const block=w.map.doors.find(x=>!x.exit),p={x:block.x-48,y:block.y};if(H.line(w,p,{x:block.x+48,y:block.y})){const s={id:'device-2',kind:'motion',...p};w.doors[block.id]=false;at(w.ghost,{x:block.x+12,y:block.y});H.updateSensor(w,s);assert(!s.trips);}
 assert.equal(H.snapshot(w).devices[0].trips,2);
});
test('REM-POD has colored levels and pulsed events, registers genuine EMF 5 and cannot invent EMF evidence for another entity',()=>{
 const w=create(),d=place(w,'rempod'),p=w.players[0];w.time=180;w.hunt.next=1e9;w.nextActivity=1e9;w.secret.proof.emf={first:0,period:10000,duration:10000};at(w.ghost,d);w.activity=8;H.updateSensor(w,d);assert.equal(d.level,5);assert(w.events.some(e=>e.type==='rem-pulse'&&e.level===5));
 at(p,w.map.spawn);H.update(w,.1);assert.deepEqual(w.found,[]);for(let i=0;i<35;i++)H.update(w,.1,{p:{watchingSensors:true}});assert(w.found.includes('emf'));
 const other=create({seed:16}),rem=place(other,'rempod');other.time=180;other.activity=9;at(other.ghost,rem);H.updateSensor(other,rem);assert(rem.level<=4);assert(!other.found.includes('emf'));
 at(other.ghost,{x:rem.x+700,y:rem.y});H.updateSensor(other,rem);assert.equal(rem.level,1);
});
test('a ghost pushes a toy car in either direction without passing through furniture or walls and raises an audible event',()=>{
 const w=create({mapId:'pinewood'}),car=place(w,'toycar');w.rng=()=>.9;const first=car.x;assert(H.pushCar(w,car));assert(car.x>first);w.rng=()=>0;const second=car.x;assert(H.pushCar(w,car));assert(car.x<second);assert.equal(H.blocked(w,car.x,car.y),false);assert.equal(car.pushes,2);assert(w.events.some(e=>e.type==='toycar-event'));assert.equal(H.snapshot(w).devices[0].pushes,2);
});
test('challenge modifiers enforce darkness, delay proof, move rooms without teleportation and reduce hunt preparation and cooldown',()=>{
 const w=create({challenges:['no_flashlight','no_power']}),p=w.players[0];assert.equal(w.power,false);assert.equal(H.gear(w,p,'flashlight'),false);p.inventory=['flashlight'];p.tool='flashlight';p.flashlight=true;H.input(w,p.id,{flashlight:true},0);assert.equal(p.flashlight,false);assert.equal(H.use(w,p),false);at(p,w.map.breaker);assert.equal(H.interact(w,p),false);assert.equal(w.power,false);
 const easy=create(),hard=create({challenges:['hard_evidence']});assert(hard.secret.proof.emf.first>easy.secret.proof.emf.first);assert(hard.secret.proof.emf.duration<easy.secret.proof.emf.duration);
 const moving=create({challenges:['roaming']});moving.nextRoam=0;const room=moving.secret.room,before={...moving.ghost};H.update(moving,.1);assert.notEqual(moving.secret.room,room);assert(H.distance(before,moving.ghost)<10);assert(!moving.events.some(e=>e.type==='room-changed'));
 const fast=create({challenges:['frequent_hunts']});assert(fast.hunt.next<easy.hunt.next);H.startHunt(fast);H.startHunt(easy);assert(fast.hunt.next-fast.hunt.until<easy.hunt.next-easy.hunt.until);
 const noPower=curse('tarot',{challenges:['no_power']});noPower.secret.deck[0]='magician';H.useCurse(noPower,noPower.players[0],'draw');assert.equal(noPower.power,false);
});
test('only correct completed surviving contracts earn challenge bonuses and all advertised percentages match exact integer research rewards',()=>{
 const ids=C.CHALLENGES.map(c=>c.id),w=create({challenges:ids});w.time=90;w.found=[...H.GHOSTS[0].evidence];const r=H.finish(w,w.secret.type);assert.equal(r.challengePercent,170);assert.equal(r.challengeBonus,Math.round(r.baseMoney*1.7));assert.equal(r.money,r.baseMoney+r.challengeBonus);
 for(const opts of[{correct:false,seconds:90},{correct:true,seconds:29},{correct:true,seconds:90,wipe:true}])assert.equal(C.reward({...opts,challenges:ids}).challengeBonus,0);
});
test('SQL freezes shared challenges, validates host edits and recomputes once-only RP bonuses instead of trusting client reward amounts',async()=>{
 const f=await fixture(),[a,b,c]=f.ids;try{
  let room=await f.haunt(a,'create');assert.equal(room.protocol,H.PROTOCOL);assert.deepEqual(room.supplies,H.STARTER);assert.equal(Object.keys(room.supplies).length,15);
  await f.db.query("insert into friends(user_id,friend_id,name) values($1,$2,'B'),($2,$1,'A')",[a,b]);await f.haunt(a,'invite',{room:room.id,id:b});const invitation=(await f.haunt(b,'invitations'))[0];const accepted=await f.haunt(b,'accept_invite',{protocol:3,id:invitation.id});assert.equal(accepted.protocol,H.PROTOCOL);await f.haunt(b,'ready',{room:room.id,ready:true});
  const config={room:room.id,mapId:room.mapId,difficulty:'normal',botCount:0,challenges:C.CHALLENGES.map(c=>c.id).reverse()};
  await assert.rejects(f.haunt(b,'configure',config),/HAUNT_HOST/);await assert.rejects(f.haunt(a,'configure',{...config,challenges:['no_power','no_power']}),/HAUNT_INPUT/);await assert.rejects(f.haunt(a,'configure',{...config,challenges:['free_money']}),/HAUNT_INPUT/);
  room=await f.haunt(a,'configure',config);assert.deepEqual(room.challenges,C.CHALLENGES.map(c=>c.id));assert.equal(room.members.find(p=>p.id===b).ready,false);
  await f.haunt(b,'ready',{room:room.id,ready:true});room=await f.haunt(a,'start',{room:room.id});await assert.rejects(f.haunt(a,'configure',config),/HAUNT_HOST/);
  const w=H.create({seed:room.seed,mapId:room.mapId,difficulty:room.difficulty,challenges:room.challenges,players:room.roster,bots:false,stock:room.supplies,hostId:a});w.id=room.id;w.time=90;w.found=[...H.GHOSTS.find(g=>g.id===w.secret.type).evidence];const result=H.finish(w,w.secret.type),s=H.snapshot(w);s.result.money=999999;s.result.challengeBonus=999999;
  await assert.rejects(f.haunt(a,'sync',{room:room.id,snapshot:{...s,challenges:['no_power']}}),/HAUNT_INPUT/);await assert.rejects(f.haunt(c,'sync',{room:room.id,snapshot:s}),/HAUNT_ROOM/);await assert.rejects(f.haunt(a,'sync',{room:room.id,snapshot:{...s,power:true}}),/HAUNT_INPUT/);const lit=structuredClone(s);lit.players[0].flashlight=true;await assert.rejects(f.haunt(a,'sync',{room:room.id,snapshot:lit}),/HAUNT_INPUT/);
  await f.haunt(a,'sync',{room:room.id,snapshot:s});await f.db.query("update haunt_private.rooms set started_at=now()-interval '1 minute' where id=$1",[room.id]);room=await f.haunt(a,'finish',{room:room.id,guess:result.guess});assert.equal(room.snapshot.result.money,result.money);assert.equal(room.snapshot.result.challengeBonus,result.challengeBonus);
  for(const id of[a,b]){const home=await f.haunt(id,'home');assert.equal(home.gear.funds.balance,1000+result.money);const paid=(await f.db.query('select money,challenge_bonus from haunt_private.results where room_id=$1 and user_id=$2',[room.id,id])).rows[0];assert.equal(paid.challenge_bonus,result.challengeBonus);assert.equal(paid.money,result.money);assert.equal((await f.as(id,"select zone_wallet('state') value")).rows[0].value.balance,3000);}
  await f.haunt(a,'finish',{room:room.id,guess:result.guess});assert.equal((await f.haunt(a,'home')).gear.funds.balance,1000+result.money);const next=await f.haunt(a,'return_lobby',{room:room.id});assert.deepEqual(next.challenges,room.challenges);assert.notEqual(next.id,room.id);assert.equal(next.protocol,H.PROTOCOL);
  await assert.rejects(f.haunt(c,'join',{protocol:3,code:next.code}),/HAUNT_VERSION/);
 }finally{await f.db.close();}
});
test('the additive migration preserves running v3 stock, owned equipment and RP, is replayable and exposes no private challenge helpers',async()=>{
 const f=await fixture(false),[a]=f.ids;try{
  let room=await f.haunt(a,'create',{protocol:3});room=await f.haunt(a,'start',{protocol:3,room:room.id});const supply=room.supplies;await f.db.exec(migration);await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/haunt-expeditions.sql'),'utf8'));await f.db.exec(migration);await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/haunt-expeditions.sql'),'utf8'));
  assert.deepEqual((await f.haunt(a,'sync',{protocol:3,room:room.id})).supplies,supply);const home=await f.haunt(a,'home');assert.equal(home.gear.funds.balance,1000);assert.equal(Object.keys(home.gear.starter).length,15);
  await assert.rejects(f.as(a,"select haunt_private.challenge_percent('[\"no_power\"]')"),/permission denied/);await assert.rejects(f.as(a,"select haunt_private.valid_challenges('[]')"),/permission denied/);await assert.rejects(f.as(null,"select zone_haunt('home','{\"protocol\":4}')"),/permission denied|HAUNT_LOGIN/);
 }finally{await f.db.close();}
});
