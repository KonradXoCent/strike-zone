'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{setup}=require('../scripts/test-support/wallet-db.cjs'),H=require('../game/haunt/engine.js');
const migration=fs.readFileSync(path.join(__dirname,'../database/haunt-operations.sql'),'utf8');
const create=(o={})=>H.create({seed:17,difficulty:'calm',players:[{id:'p'}],bots:true,...o});
const advance=(w,seconds,observe=()=>{})=>{w.hunt.next=1e9;for(let i=0;i<seconds*10;i++){H.update(w,.1);observe(w);}};
async function fixture(operations=true){
 const f=await setup({progression:true,operations});
 for(const id of f.ids){await f.db.query('insert into saves values($1,$2,now())',[id,JSON.stringify({cur:'QA',profiles:{QA:{wallet:0,skins:[]}}})]);await f.db.query("insert into zh_library(user_id,game_id) values($1,'zone-haunt')",[id]);}
 f.haunt=async(id,action,args={})=>(await f.as(id,'select zone_haunt($1,$2::jsonb) value',[action,JSON.stringify({protocol:3,equipmentCurrency:'RP',...args})])).rows[0].value;
 return f;
}
async function complete(f,uid,room,wipe){
 await f.db.query("update haunt_private.rooms set started_at=now()-interval '1 minute' where id=$1",[room.id]);
 const w=H.create({seed:room.seed,mapId:room.mapId,players:room.roster,botCount:room.botCount,stock:room.supplies,hostId:uid});w.id=room.id;w.time=90;if(room.protocol<5)w.secret.type=H.GHOSTS.filter(g=>g.id!=='demon')[room.seed%14].id;
 if(wipe)for(const p of w.players)p.alive=false;
 H.finish(w,null);await f.haunt(uid,'sync',{room:room.id,snapshot:{...H.snapshot(w),schema:room.protocol}});await f.haunt(uid,'finish',{room:room.id,guess:null});
}
test('every practice investigation starts with exactly one of all fifteen tools and four empty carried slots',()=>{
 const w=create({bots:false});assert.equal(H.TOOLS.length,15);assert.deepEqual(w.stock,H.STARTER);assert.deepEqual(H.supplies(),H.STARTER);assert.deepEqual(w.players[0].inventory,[]);
 const withExtras=H.supplies({camera:2});assert.equal(withExtras.camera,3);assert.equal(withExtras.crucifix,1);assert.deepEqual(w.crossStock,[2]);
});
test('bot scouts carry finite equipment, check different rooms slowly and never confirm evidence for an idle human',()=>{
 const w=create(),rooms=new Set(),seenTools=new Set(),messages=new Map();
 advance(w,240,()=>{
  for(const p of w.players.filter(p=>p.bot)){if(H.roomAt(w.map,p)>=0)rooms.add(H.roomAt(w.map,p));if(p.tool)seenTools.add(p.tool);assert(p.inventory.length<=4);}
  for(const e of w.events)if(e.type==='bot-tip')messages.set(e.id,e.at);
  for(const id of H.TOOLS)assert.equal(w.stock[id]+w.players.filter(p=>p.inventory.includes(id)).length+w.devices.filter(d=>d.kind===id).length,1,id);
 });
 assert(rooms.size>=3);assert(seenTools.has('thermo'));assert(seenTools.has('emf'));assert(seenTools.has('uv'));assert(messages.size>0);assert(Math.min(...messages.values())>=25);assert(messages.size<=10);assert.deepEqual(w.found,[]);
});
test('initial scouting routes depend on public rooms rather than the hidden ghost room',()=>{
 const a=create(),b=create();a.secret.room=0;b.secret.room=b.map.rooms.length-1;a.nextActivity=b.nextActivity=1e9;
 advance(a,90);advance(b,90);
 const positions=w=>w.players.filter(p=>p.bot).map(p=>({x:p.x,y:p.y,room:p.brain.survey?.room,tool:p.tool}));
 assert.deepEqual(positions(a),positions(b));assert(a.players.some(p=>p.bot&&p.brain.survey?.reviewed>0));
});
test('a request retrieves the only tool already held by a scouting bot, without teleporting or duplicating it',()=>{
 const w=create(),human=w.players[0];advance(w,65);
 const holder=w.players.find(p=>p.bot&&p.inventory.length&&H.distance(p,human)>120);assert(holder);const tool=holder.tool;assert.equal(w.stock[tool],0);
 H.input(w,human.id,{action:{seq:1,kind:'bot-order',value:{kind:'bring',tool,bot:'auto'}}},0);
 assert(holder.brain.order);assert.equal(human.inventory.includes(tool),false);
 for(let i=0;i<1000&&!human.inventory.includes(tool);i++)H.update(w,.1);
 assert(human.inventory.includes(tool));assert.equal(holder.inventory.includes(tool),false);assert.equal(w.stock[tool],0);
});
test('room camera coverage is panoramic while actual walls and closed doors still block its signal',()=>{
 const w=create({bots:false}),r=w.map.rooms[0],cam={id:'device-1',kind:'camera',room:r.id,x:r.x,y:r.y,angle:Math.PI};
 const point={x:r.x+60,y:r.y};assert(H.cameraVisible(w,cam,point));cam.angle=0;assert(H.cameraVisible(w,cam,point));assert.equal(H.cameraPose(w,cam).arc,Math.PI*2);
 let tested=false;
 for(const door of w.map.doors){
  for(const [dx,dy]of[[48,0],[0,48]]){
   const a={x:door.x-dx,y:door.y-dy},b={x:door.x+dx,y:door.y+dy};
   if(H.blocked(w,a.x,a.y)||H.blocked(w,b.x,b.y)||!H.line(w,a,b))continue;
   const d={...cam,...a,room:-1,angle:Math.atan2(b.y-a.y,b.x-a.x)};
   assert(H.cameraVisible(w,d,b));w.doors[door.id]=false;assert.equal(H.cameraVisible(w,d,b),false);w.doors[door.id]=true;tested=true;break;
  }if(tested)break;
 }assert(tested);
});
test('one free team kit survives repeated wipes; only purchased deployed extras are lost, reserves and both currencies stay exact',async()=>{
 const f=await fixture(),[a,b,c]=f.ids;
 try{
  for(const id of f.ids)await f.haunt(id,'home');await f.db.query('update haunt_private.research_accounts set balance=0');
  let room=await f.haunt(a,'create');for(const id of[b,c]){await f.haunt(id,'join',{code:room.code});await f.haunt(id,'ready',{room:room.id,ready:true});}
  assert.deepEqual((await f.haunt(a,'sync',{room:room.id})).supplies,H.STARTER);
  room=await f.haunt(a,'start',{room:room.id});assert.deepEqual(room.supplies,H.STARTER);await complete(f,a,room,true);
  let home=await f.haunt(a,'home');assert.deepEqual(home.gear.owned,{});assert.equal(home.gear.funds.balance,0);
  room=await f.haunt(a,'return_lobby',{room:room.id});assert.deepEqual(room.supplies,H.STARTER);
  await f.db.query('update haunt_private.research_accounts set balance=1000 where user_id=$1',[a]);
  await f.haunt(a,'gear_buy',{request:randomUUID(),tool:'camera',quantity:2});await f.haunt(a,'gear_select',{selected:{camera:1}});
  for(const id of[b,c])await f.haunt(id,'ready',{room:room.id,ready:true});
  room=await f.haunt(a,'start',{room:room.id});assert.equal(room.supplies.camera,2);assert.equal((await f.haunt(a,'home')).gear.owned.camera,1);
  await complete(f,a,room,true);await f.haunt(a,'finish',{room:room.id,guess:null});home=await f.haunt(a,'home');assert.equal(home.gear.owned.camera,1);assert.equal(home.gear.funds.balance,600);
  room=await f.haunt(a,'return_lobby',{room:room.id});assert.deepEqual(room.supplies,H.STARTER);
  await f.haunt(a,'gear_select',{selected:{camera:1}});for(const id of[b,c])await f.haunt(id,'ready',{room:room.id,ready:true});
  room=await f.haunt(a,'start',{room:room.id});await complete(f,a,room,false);home=await f.haunt(a,'home');assert.equal(home.gear.owned.camera,1);assert.equal(home.gear.funds.balance,600);
  assert.equal((await f.as(a,"select zone_wallet('state') value")).rows[0].value.balance,0);
 }finally{await f.db.close();}
});
test('the kit migration keeps existing purchased gear and running contracts and cannot add repeated inventory or point grants',async()=>{
 const f=await fixture(false),[a,b]=f.ids;
 try{
  await f.haunt(a,'gear_buy',{request:randomUUID(),tool:'camera',quantity:1});const original=await f.haunt(a,'home');
  let room=await f.haunt(a,'create');room=await f.haunt(a,'start',{room:room.id});const supplies=room.supplies;
  await f.db.exec(migration);await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/haunt-fieldwork.sql'),'utf8'));assert.deepEqual((await f.haunt(a,'sync',{room:room.id})).supplies,supplies);
  await complete(f,a,room,false);let home=await f.haunt(a,'home');assert.deepEqual(home.gear.owned,original.gear.owned);assert.equal(home.gear.funds.balance,800);assert.deepEqual(home.gear.starter,H.STARTER);
  await f.db.exec(migration);await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/haunt-fieldwork.sql'),'utf8'));home=await f.haunt(a,'home');assert.deepEqual(home.gear.owned,original.gear.owned);assert.equal(home.gear.funds.balance,800);
  const fresh=await f.haunt(b,'home');assert.deepEqual(fresh.gear.owned,{});assert.deepEqual(fresh.gear.starter,H.STARTER);assert.equal(fresh.gear.funds.balance,1000);
  await assert.rejects(f.as(b,'select haunt_private.basic_gear()'),/permission denied/);
 }finally{await f.db.close();}
});
