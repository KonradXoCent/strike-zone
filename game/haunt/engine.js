(function(root,factory){const value=typeof module==='object'&&module.exports?factory(require('./catalog.js'),require('./maps.js'),require('./investigators.js')):factory(root.HauntCatalog,root.HauntMaps,root.HauntInvestigators);if(typeof module==='object'&&module.exports)module.exports=value;else root.ZoneHaunt=value;})(globalThis,(C,M,I)=>{
 'use strict';
 const {TOOLS,ITEMS,EVIDENCE,GHOSTS,QUESTIONS,REPLIES,PROTOCOL}=C,{TILE}=M,MAPS=M.SPECS,WIDTH=52,HEIGHT=40;
 const DIFFICULTIES={calm:{setup:90,cooldown:100,hunt:25,drain:.065,speed:.86},normal:{setup:60,cooldown:70,hunt:38,drain:.20,speed:1},nightmare:{setup:35,cooldown:43,hunt:55,drain:.48,speed:1.20}};
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),cell=n=>Math.floor(n/TILE),centre=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE}),map=M.build;
 function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 function roomAt(m,p){return m.rooms.find(r=>p.x>=r.left&&p.x<r.left+r.w&&p.y>=r.top&&p.y<r.top+r.h)?.id??-1;}
 function indoors(w,p){return !!w.map.inside[cell(p.y)]?.[cell(p.x)];}
 function nearVan(w,p){return floorOf(w,p)===0&&!indoors(w,p)&&distance(p,w.map.spawn)<150;}
 function doorAt(w,x,y){return w.map.doors.find(d=>d.cellX===x&&d.cellY===y);}
 function blocked(w,x,y,{ghost=false,paths=false}={}){const gx=cell(x),gy=cell(y);if(gx<0||gy<0||gx>=w.map.cols||gy>=w.map.rows)return true;if(gy>=w.map.groundRows&&!w.map.inside[gy][gx])return true;const v=w.map.cells[gy][gx];if(v===1)return true;if(v===2){const d=doorAt(w,gx,gy),closed=w.doors[d.id]===false||w.hunt.active&&d.exit;if(closed&&!ghost&&!paths)return true;}return !ghost&&w.map.furniture.some(f=>Math.abs(x-f.x)<f.w/2+9&&Math.abs(y-f.y)<f.h/2+9);}
 function move(w,p,dx,dy){if(p.hidden||!p.alive)return;const r=11,pass=(x,y)=>![[r,r],[-r,r],[r,-r],[-r,-r]].some(([a,b])=>blocked(w,x+a,y+b));const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/9));for(let i=0;i<steps;i++){if(pass(p.x+dx/steps,p.y))p.x+=dx/steps;if(pass(p.x,p.y+dy/steps))p.y+=dy/steps;}}
 function line(w,a,b){if(!sameFloor(w,a,b))return false;const d=distance(a,b),steps=Math.max(1,Math.ceil(d/12));for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps,gx=cell(x),gy=cell(y);if(!w.map.cells[gy]||w.map.cells[gy][gx]===1)return false;if(w.map.cells[gy][gx]===2){const door=doorAt(w,gx,gy);if(w.doors[door.id]===false||w.hunt.active&&door.exit)return false;}}return true;}
 function floorOf(w,p){return p.y>=w.map.groundHeight?-1:0;}
 function sameFloor(w,a,b){return floorOf(w,a)===floorOf(w,b);}
 function atRack(w,p){return floorOf(w,p)===0&&distance(p,w.map.spawn)<65;}
 function standable(w,p,{paths=false}={}){return ![[11,11],[-11,11],[11,-11],[-11,-11]].some(([x,y])=>blocked(w,p.x+x,p.y+y,{paths}));}
 function gridPath(w,from,to){
  const m=w.map,size=m.cols*m.rows,layer=floorOf(w,from),sx=cell(from.x),sy=cell(from.y),ex=cell(to.x),ey=cell(to.y);if(sx<0||sy<0||ex<0||ey<0||sx>=m.cols||ex>=m.cols||sy>=m.rows||ey>=m.rows)return[];
  if(!m._nav){m._nav=new Uint8Array(size);for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++)if(standable(w,centre(x,y),{paths:true}))m._nav[y*m.cols+x]=1;}
  const start=sy*m.cols+sx,end=ey*m.cols+ex,queue=new Int32Array(size),parent=new Int32Array(size).fill(-1);let head=0,tail=1;queue[0]=start;parent[start]=start;
  while(head<tail){const n=queue[head++];if(n===end)break;const x=n%m.cols,y=Math.floor(n/m.cols);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,at=yy*m.cols+xx;if(xx<0||yy<0||xx>=m.cols||yy>=m.rows||parent[at]!==-1||!m._nav[at]||(yy>=m.groundRows?-1:0)!==layer||w.hunt.active&&doorAt(w,xx,yy)?.exit)continue;parent[at]=n;queue[tail++]=at;}}
  if(parent[end]===-1)return[];const result=[];for(let at=end;at!==start;at=parent[at])result.push(centre(at%m.cols,Math.floor(at/m.cols)));return result.reverse();
 }
 function path(w,from,to){
  if(sameFloor(w,from,to))return gridPath(w,from,to);
  const stairs=w.map.stairs.find(s=>s.floor===floorOf(w,from)&&s.toFloor===floorOf(w,to));if(!stairs)return[];
  const first=gridPath(w,from,stairs),second=gridPath(w,stairs.to,to);
  if(!first.length&&distance(from,stairs)>48||!second.length&&distance(stairs.to,to)>48)return[];
  return [...first.filter(p=>distance(p,stairs)>5),{x:stairs.x,y:stairs.y,stair:stairs.id},...second];
 }
 function useStairs(w,p,id){const stair=w.map.stairs.find(s=>s.id===id);if(!stair||!sameFloor(w,p,stair)||distance(p,stair)>62||p.hidden||p.alive===false)return false;Object.assign(p,stair.to);if(p.brain){p.brain.route=[];p.brain.target=null;p.brain.next=0;}if(!p.brain&&p.path){p.path=[];p.routeAt=0;}event(w,'stairs',p.id||null,{x:p.x,y:p.y,floor:stair.toFloor});return true;}
 function event(w,type,player=null,data={}){const voice=['voice','curse-answer','ghost-event'].includes(type)&&w.secret?C.voiceProfile(w.ghost.model,w.secret.type):undefined;w.events.push({id:++w.sequence,type,player,at:w.time,...(voice?{voice}:{}),...data});if(w.events.length>30)w.events.shift();}
 function vacant(w,r,offset=0){const cache=w.map._spots||(w.map._spots=new Map());if(cache.has(r.id)){const a=cache.get(r.id);return a[Math.abs(offset)%a.length]||{x:r.x,y:r.y};}const spots=[];for(let y=cell(r.top)+1;y<cell(r.top)+r.rows-1;y++)for(let x=cell(r.left)+1;x<cell(r.left)+r.cols-1;x++){const p=centre(x,y);if(standable(w,p,{paths:true})&&!w.map.closets.some(c=>distance(p,c)<65)&&!w.map.stairs?.some(c=>distance(p,c)<65))spots.push(p);}cache.set(r.id,spots);return spots[Math.abs(offset)%spots.length]||{x:r.x,y:r.y};}
 function create({seed=1024,mapId='willow',difficulty='normal',players=[],bots=true,botCount=3,stock=null,challenges=[],hostId=players[0]?.id||'local'}={}){seed=Math.abs(Math.floor(Number(seed)||1))%2147483647;const m=map(mapId),rng=random(seed),people=players.slice(0,4).map((p,i)=>({id:String(p.id),name:String(p.name||'Investigator').slice(0,24),bot:false,x:m.spawn.x+(i%2)*30-15,y:m.spawn.y+Math.floor(i/2)*25,angle:-Math.PI/2,alive:true,hidden:null,sanity:100,stamina:100,inventory:[],tool:null,flashlight:false,guess:null,probe:0,scan:0,record:0,lastUse:-10,lastAct:0,watching:null}));
  if(!people.length)people.push({id:hostId,name:'Investigator',bot:false,x:m.spawn.x,y:m.spawn.y,angle:-Math.PI/2,alive:true,hidden:null,sanity:100,stamina:100,inventory:[],tool:null,flashlight:false,guess:null,probe:0,scan:0,record:0,lastUse:-10,lastAct:0,watching:null});
  const botNames=['Mira','Alex','Noah'];const desired=people.length+(bots?clamp(Math.floor(Number(botCount)||0),0,3):0);if(bots)while(people.length<Math.min(4,desired)){const i=people.length;people.push({...people[0],id:'bot-'+i,name:botNames[(i-1)%3],bot:true,x:m.spawn.x+i*18-25,y:m.spawn.y+18,inventory:[],brain:{room:(i-1)%m.rooms.length,next:0,route:[],target:null,cycle:0,resupply:0,lastHunt:false}});}
  const room=Math.floor(seed/23)%m.rooms.length,w={schema:PROTOCOL,id:'contract-'+seed,seed,mapId:m.id,map:m,difficulty:Object.hasOwn(DIFFICULTIES,difficulty)?difficulty:'normal',hostId,challenges:C.challenges(challenges),time:0,phase:'investigating',players:people,doors:Object.fromEntries(m.doors.map(d=>[d.id,true])),power:true,lights:true,roomLights:Object.fromEntries(m.rooms.map(r=>[r.id,true])),secret:{type:GHOSTS[seed%GHOSTS.length].id,room},ghost:{...vacant({map:m,doors:Object.fromEntries(m.doors.map(d=>[d.id,true])),hunt:{active:false}},m.rooms[room],seed),angle:0,model:C.MODELS[Math.floor(random(Math.imul(seed,0x45d9f3b))()*C.MODELS.length)],visible:0,path:[],target:null,routeAt:0},hunt:{active:false,until:0,next:DIFFICULTIES[difficulty]?.setup||50,count:0},found:[],devices:[],traces:[],photos:[],sinks:m.sinks.map(s=>({...s,on:false,dirty:false})),focusRoom:null,focusRevision:0,stock:Object.fromEntries(TOOLS.map(t=>[t,stock?clamp(Math.floor(Number(stock[t])||0),0,32):1])),crossStock:Array.from({length:stock?clamp(Math.floor(Number(stock.crucifix)||0),0,32):1},()=>2),sequence:0,deviceSeq:0,events:[],result:null,rng,activity:0,activityHistory:[],nextSample:0,nextActivity:5,botRoom:null,objectives:{hunt:false,photo:false,evidence:false},deadAt:null};
  rng();rng();rng();const bias={lament:.85,morrow:.9,veil:1.45,watcher:1.15,echo:.92,hollow:1.35,mourner:1.3,deceiver:1.22}[w.secret.type]||1;w.secret.patience=bias*(.85+rng()*.5);w.secret.proof={};for(const e of EVIDENCE)w.secret.proof[e.id]={first:(35+rng()*65)*w.secret.patience*(difficulty==='nightmare'?1.35:difficulty==='calm'?.72:1),period:18+rng()*22,duration:7+rng()*5};w.nextActivity=8+rng()*13;
  const extra=EVIDENCE.filter(e=>!GHOSTS[seed%GHOSTS.length].evidence.includes(e.id));w.secret.falseEvidence=extra[Math.floor(seed/7)%extra.length].id;const boneRoom=m.rooms[Math.floor(seed/41)%m.rooms.length];w.bone={id:'bone',...vacant(w,boneRoom,seed+19),room:boneRoom.id,collected:false};
  const curseRng=random(seed^0x51c0ff),curseRoom=m.rooms[Math.floor(curseRng()*m.rooms.length)];
  w.curse={kind:C.CURSES[Math.floor(curseRng()*C.CURSES.length)].id,...vacant(w,curseRoom,seed+53),room:curseRoom.id,uses:0,spent:0,broken:false,activeBy:null,lastUse:-10,lastQuestion:-10,revealUntil:0,revealRoom:null,lastCard:null};
  w.secret.deck=C.CARDS.map(c=>c.id);for(let i=w.secret.deck.length-1;i>0;i--){const j=Math.floor(curseRng()*(i+1));[w.secret.deck[i],w.secret.deck[j]]=[w.secret.deck[j],w.secret.deck[i]];}
  w.secret.changedAt=0;w.secret.previousRooms=[];w.nextRoam=enabled(w,'roaming')?65+curseRng()*35:300+curseRng()*180;
  if(enabled(w,'hard_evidence'))for(const proof of Object.values(w.secret.proof)){proof.first*=1.65;proof.period*=1.35;proof.duration=Math.max(6.2,proof.duration*.65);}
  if(enabled(w,'no_power'))w.power=w.lights=false;
  if(enabled(w,'frequent_hunts'))w.hunt.next*=.65;if(w.secret.type==='demon')w.hunt.next*=.7;
  return w;
 }
 const enabled=(w,id)=>Array.isArray(w.challenges)&&w.challenges.includes(id);
 const typeOf=w=>GHOSTS.find(g=>g.id===w.secret.type),has=(w,id)=>typeOf(w).evidence.includes(id)||typeOf(w).id==='deceiver'&&w.secret.falseEvidence===id;
 function evidence(w,id,player){if(w.players.find(p=>p.id===player)?.bot||w.found.includes(id))return;w.found.push(id);w.objectives.evidence=w.found.length>=3;event(w,'evidence',player,{evidence:id});}
 function owns(p,id){return p.inventory.includes(id);}
 function roomLit(w,room){return w.power!==false&&w.lights!==false&&room>=0&&w.roomLights[room]!==false;}
 function equip(p,id){if(!owns(p,id))return false;p.tool=id;return true;}
 function gear(w,p,id,returning=false){if(!p.alive||p.hidden||!nearVan(w,p)||!TOOLS.includes(id)||w.phase==='complete'||!returning&&id==='flashlight'&&enabled(w,'no_flashlight'))return false;if(returning){if(!owns(p,id))return false;p.inventory.splice(p.inventory.indexOf(id),1);w.stock[id]++;if(id==='crucifix'){w.crossStock.push(p.crossCharges??2);delete p.crossCharges;}if(p.tool===id)p.tool=p.inventory[0]||null;if(id==='flashlight')p.flashlight=false;}else{if(p.inventory.length>=4||owns(p,id)||w.stock[id]<1)return false;w.stock[id]--;p.inventory.push(id);if(id==='crucifix')p.crossCharges=w.crossStock.pop()??2;p.tool=p.tool||id;if(id==='flashlight')p.flashlight=true;}event(w,'gear',p.id,{tool:id,returning});return true;}
 function removeItem(p,id){const i=p.inventory.indexOf(id);if(i<0)return false;p.inventory.splice(i,1);if(p.tool===id)p.tool=p.inventory[0]||null;if(id==='flashlight')p.flashlight=false;return true;}
 function signal(w,id){if(!w.secret||!has(w,id)||w.hunt.active)return false;const e=w.secret.proof[id];return w.time>=e.first&&(w.time-e.first)%e.period<e.duration;}
 function remLevel(w,p){const dist=distance(p,w.ghost);return dist<230&&line(w,p,w.ghost)?(signal(w,'emf')?5:w.hunt.active?4:dist<90?Math.min(4,2+Math.floor(w.activity/3)):w.activity>1?2:1):1;}
 function readings(w,p){
  const room=roomAt(w.map,p),hot=room===w.secret.room,d=distance(p,w.ghost),warming=clamp((w.time-(w.secret.changedAt||0))/(85*w.secret.patience*(enabled(w,'hard_evidence')?1.25:1)),0,1),ambient=room<0?12:17+Math.sin(room*2.7)*2-(w.power?0:4);
  const freezing=hot&&signal(w,'freezing'),temperature=hot?ambient*(1-warming)+4.2*warming+(freezing?-9:0)+Math.sin(w.time*.17+room)*.6:ambient+Math.sin(w.time*.13+room)*.6-(w.secret.previousRooms||[]).filter(x=>x.room===room&&w.time-x.at<80).reduce((n,x)=>Math.max(n,5*(1-(w.time-x.at)/80)),0);
  const emf=hot&&signal(w,'emf')?5:w.activity>1&&(hot||d<380)?2+Math.min(2,Math.floor(w.activity)%3):1;
  const visible=d=>distance(p,d)<200&&line(w,p,d);
  return{room,hot,temperature,emf,rem:remLevel(w,p),uv:has(w,'uv')&&w.traces.some(t=>t.expires>w.time&&visible(t)),orb:hot&&signal(w,'orb'),writing:w.devices.some(d=>d.kind==='book'&&d.written&&visible(d)),dots:w.devices.some(d=>d.kind==='dots'&&d.positive&&visible(d)),salt:w.devices.some(d=>d.kind==='salt'&&d.disturbed&&visible(d)),resonance:hot&&signal(w,'resonance')};
 }
 function interaction(w,p){if(p.hidden)return{kind:'closet',object:w.map.closets.find(c=>c.id===p.hidden)};const choices=[];for(const c of w.map.closets)if(w.players.filter(q=>q!==p&&q.hidden===c.id&&q.alive).length<4)choices.push({kind:'closet',object:c,radius:70});for(const d of w.map.doors)choices.push({kind:'door',object:d,radius:65});for(const s of w.map.stairs)if(s.floor===floorOf(w,p))choices.push({kind:'stairs',object:s,radius:58});for(const sink of w.sinks)choices.push({kind:'sink',object:sink,radius:75});for(const s of w.map.switches)choices.push({kind:'light',object:s,radius:57});choices.push({kind:'breaker',object:w.map.breaker,radius:62});if(w.curse)choices.push({kind:'curse',object:w.curse,radius:66});if(!w.bone.collected)choices.push({kind:'bone',object:w.bone,radius:42});for(const d of w.devices)if(d.kind!=='salt'&&(!('charges'in d)||d.charges>0))choices.push({kind:'pickup',object:d,radius:42});const priority=c=>distance(p,c.object)-(c.kind==='door'&&w.doors[c.object.id]===false?180:c.kind==='stairs'?120:c.kind==='closet'&&distance(p,c.object)<60?100:0);return choices.filter(c=>sameFloor(w,p,c.object)&&distance(p,c.object)<c.radius).sort((a,b)=>priority(a)-priority(b))[0]||null;}
 function interact(w,p){if(!p.alive)return false;const hit=interaction(w,p);if(!hit)return false;const o=hit.object;if(hit.kind==='closet'){if(p.hidden){p.hidden=null;const candidates=[{x:o.x+55,y:o.y+24},{x:o.x,y:o.y+60},{x:o.x-52,y:o.y}];Object.assign(p,candidates.find(q=>!blocked(w,q.x,q.y))||{x:o.x+40,y:o.y+36});}else{p.hidden=o.id;p.x=o.x;p.y=o.y;}event(w,'closet',p.id,{open:!p.hidden});}
  if(hit.kind==='stairs')return useStairs(w,p,o.id);if(hit.kind==='sink'){o.on=!o.on;event(w,'water',p.id,{x:o.x,y:o.y,on:o.on});return true;}
  if(hit.kind==='curse'){event(w,'curse-open',p.id,{kind:w.curse.kind});return true;}
  if(hit.kind==='breaker'&&enabled(w,'no_power')){event(w,'challenge-blocked',p.id,{challenge:'no_power'});return false;}
  if(hit.kind==='breaker'){w.power=!w.power;w.lights=w.power;event(w,'breaker',p.id,{power:w.power});}
  if(hit.kind==='light'&&enabled(w,'no_power'))return false;
  if(hit.kind==='light'){w.roomLights[o.room]=!w.roomLights[o.room];event(w,'light',p.id,{room:o.room,on:w.roomLights[o.room]});}
  if(hit.kind==='door'){if(o.exit&&w.hunt.active){event(w,'locked',p.id);return false;}w.doors[o.id]=!w.doors[o.id];event(w,'door',p.id,{open:w.doors[o.id],material:w.map.style==='metal'?'metal':'wood'});}
  if(hit.kind==='bone')return collectBone(w,p);
  if(hit.kind==='pickup')return pickup(w,p,o);return true;
 }
 function collectBone(w,p){if(!p.alive||p.hidden||w.bone.collected||distance(p,w.bone)>48||!line(w,p,w.bone))return false;w.bone.collected=true;w.bone.assignedBot=null;event(w,'bone',p.id);return true;}
 function pickup(w,p,d){if(!p.alive||p.hidden||p.inventory.length>=4||owns(p,d.kind)||!w.devices.includes(d)||distance(p,d)>45||!line(w,p,d))return false;p.inventory.push(d.kind);p.tool=d.kind;if(d.kind==='crucifix')p.crossCharges=d.charges;w.devices.splice(w.devices.indexOf(d),1);event(w,'pickup',p.id,{tool:d.kind});return true;}
 function place(w,p){const kind=p.tool;if(!['book','dots','camera','salt','crucifix','motion','rempod','toycar'].includes(kind)||!owns(p,kind))return false;const q={x:p.x+26*Math.cos(p.angle),y:p.y+26*Math.sin(p.angle)};if(blocked(w,q.x,q.y)||!line(w,p,q))Object.assign(q,{x:p.x,y:p.y});if(blocked(w,q.x,q.y)||w.devices.length>=48)return false;removeItem(p,kind);const room=roomAt(w.map,q),r=w.map.rooms[room],angle=kind==='camera'&&r&&distance(q,r)>60?Math.atan2(r.y-q.y,r.x-q.x):p.angle;w.devices.push({id:'device-'+(++w.deviceSeq),kind,room,...q,angle,at:w.time,owner:p.id,...(kind==='crucifix'?{charges:p.crossCharges??2}:{})});event(w,'place',p.id,{tool:kind});return true;}
 function photo(w,p){const within=o=>distance(p,o)<470&&line(w,p,o)&&Math.abs(Math.atan2(Math.sin(Math.atan2(o.y-p.y,o.x-p.x)-p.angle),Math.cos(Math.atan2(o.y-p.y,o.x-p.x)-p.angle)))<.65;const targets=[];if(!nearVan(w,p)&&(w.hunt.active||w.ghost.visible>w.time)&&within(w.ghost))targets.push({id:'ghost',kind:'ghost',...w.ghost});if(!w.bone.collected&&within(w.bone))targets.push({id:'bone',kind:'bone',...w.bone});for(const t of w.traces)if(t.revealedUntil>w.time&&t.expires>w.time&&within(t))targets.push({id:t.id,kind:'uv',...t});
  for(const sink of w.sinks)if(sink.dirty&&within(sink))targets.push({...sink,id:sink.id,kind:'water'});for(const d of w.devices)if(d.kind==='salt'&&d.disturbed&&within(d))targets.push({...d,id:d.id,kind:'salt'});
  const target=targets.sort((a,b)=>distance(p,a)-distance(p,b)).find(o=>!w.photos.some(p=>p.target===o.id)&&w.photos.filter(p=>p.kind===o.kind).length<(['uv','salt','water'].includes(o.kind)?2:1));event(w,'photo',p.id);if(!target)return false;const money=C.PHOTO_VALUES[target.kind],record={id:'photo-'+w.photos.length,target:target.id,kind:target.kind,player:p.id,x:target.x,y:target.y,at:w.time,money};w.photos.push(record);if(target.kind==='ghost')w.objectives.photo=true;event(w,'photo-bonus',p.id,{photo:record.id,kind:target.kind,money});return true;
 }
 function use(w,p,question){if(!p.alive||p.hidden||!p.tool||!owns(p,p.tool)||w.time-p.lastUse<.8)return false;p.lastUse=w.time;const r=readings(w,p);if(['book','dots','camera','salt','crucifix','motion','rempod','toycar'].includes(p.tool))return place(w,p);
  if(p.tool==='spirit'){if(!QUESTIONS.some(q=>q.id===question)||w.time-(p.lastQuestion??-20)<8)return false;p.lastQuestion=w.time;event(w,'radio',p.id,{question});if(r.hot&&!roomLit(w,r.room)&&signal(w,'voice')&&w.rng()<(w.difficulty==='nightmare'?.32:w.difficulty==='calm'?.75:.5)){evidence(w,'voice',p.id);event(w,'voice',p.id,{question,reply:question});}return true;}
  if(p.tool==='photo')return photo(w,p);if(p.tool==='flashlight'){if(enabled(w,'no_flashlight'))return false;p.flashlight=!p.flashlight;event(w,'tool',p.id);return true;}if(p.tool==='recorder'){p.recordingUntil=w.time+10;event(w,'recording',p.id);return true;}event(w,'tool',p.id);return true;
 }
 function input(w,id,v,dt){const p=w.players.find(p=>p.id===id);if(!p||p.bot||!p.alive||w.phase==='complete')return;const mx=clamp(Number(v?.x)||0,-1,1),my=clamp(Number(v?.y)||0,-1,1),n=Math.hypot(mx,my)||1,sprint=v?.sprint===true&&p.stamina>1,speed=sprint?175:112;p.stamina=clamp(p.stamina+(sprint&&(mx||my)?-22:13)*dt,0,100);move(w,p,mx/n*speed*dt,my/n*speed*dt);if(Number.isFinite(v?.angle))p.angle=v.angle;if(TOOLS.includes(v?.tool)&&owns(p,v.tool))p.tool=v.tool;p.watchingSensors=nearVan(w,p)&&v?.watchingSensors===true;if(typeof v?.flashlight==='boolean'&&owns(p,'flashlight'))p.flashlight=v.flashlight;if(enabled(w,'no_flashlight'))p.flashlight=false;p.watching=nearVan(w,p)&&w.devices.some(d=>d.id===v?.watching&&d.kind==='camera')?v.watching:null;
  if(v?.action&&Number.isSafeInteger(v.action.seq)&&v.action.seq>p.lastAct){p.lastAct=v.action.seq;const a=v.action;if(a.kind==='curse')useCurse(w,p,a.value);if(a.kind==='curse-stop')stopCurse(w,p);if(a.kind==='bot-order')orderBot(w,p,a.value);if(a.kind==='interact')interact(w,p);if(a.kind==='use')use(w,p);if(a.kind==='ask')use(w,p,a.value);if(a.kind==='gear')gear(w,p,a.value);if(a.kind==='return')gear(w,p,a.value,true);if(a.kind==='guess'&&GHOSTS.some(g=>g.id===a.value))p.guess=a.value;if(a.kind==='extract'&&p.id===w.hostId&&nearVan(w,p))finish(w,p.guess);}
 }
 function follow(w,p,target,speed,dt){
  const b=p.brain;if(!b.target||distance(b.target,target)>30||w.time>b.next){b.route=path(w,p,target);b.target={x:target.x,y:target.y};b.next=w.time+1.8;}
  while(b.route.length&&!b.route[0].stair&&distance(p,b.route[0])<10)b.route.shift();
  const point=b.route[0]||target;if(point.stair&&distance(p,point)<30){useStairs(w,p,point.stair);return;}
  const dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy);if(d<2)return;
  const door=doorAt(w,cell(point.x),cell(point.y));if(door&&!(door.exit&&w.hunt.active)&&w.doors[door.id]===false){w.doors[door.id]=true;event(w,'door',p.id,{material:floorOf(w,door)===-1?'metal':w.map.style==='metal'?'metal':'wood'});}
  const before={x:p.x,y:p.y};p.angle=Math.atan2(dy,dx);move(w,p,dx/d*Math.min(speed*dt,d),dy/d*Math.min(speed*dt,d));
  b.stuck=distance(before,p)<.05?(b.stuck||0)+dt:0;
  if(b.stuck>1.2){b.next=0;for(const turn of [.7,-.7,1.4,-1.4,Math.PI]){const a=p.angle+turn,q={x:p.x+Math.cos(a)*17,y:p.y+Math.sin(a)*17};if(sameFloor(w,p,q)&&standable(w,q)&&line(w,p,q)){move(w,p,Math.cos(a)*Math.min(17,speed*dt),Math.sin(a)*Math.min(17,speed*dt));break;}}}
 }

 function tip(w,p,key,data={}){const b=p.brain;if(w.time-(b.lastTip??-50)<14&&!['delivered','cold','warm','placed','power-restored'].includes(key))return;b.lastTip=w.time;event(w,'bot-tip',p.id,{name:p.name,key,...data});}
 function orderBot(w,requester,v){if(v?.kind==='focus-room')return assist.mark(w,requester);if(v?.kind==='clear-focus')return assist.clear(w,requester);if(!v||!['bring','temperature','power','camera','crucifix','regroup'].includes(v.kind))return false;const bots=w.players.filter(p=>p.bot&&p.alive&&!p.hidden);const p=(v.bot&&v.bot!=='auto'?bots.find(p=>p.id===v.bot):bots.sort((a,b)=>(owns(b,v.tool||({temperature:'thermo',camera:'camera',crucifix:'crucifix'})[v.kind])?1:0)-(owns(a,v.tool||({temperature:'thermo',camera:'camera',crucifix:'crucifix'})[v.kind])?1:0)||(a.brain.order?1:0)-(b.brain.order?1:0)||distance(a,requester)-distance(b,requester))[0]);if(!p)return false;const tool=v.kind==='bring'&&TOOLS.includes(v.tool)?v.tool:v.kind==='temperature'?'thermo':v.kind==='camera'?'camera':v.kind==='crucifix'?'crucifix':null;if(v.kind==='bring'&&!tool||v.kind==='power'&&enabled(w,'no_power')||tool==='flashlight'&&enabled(w,'no_flashlight'))return false;const room=roomAt(w.map,requester);p.brain.order={kind:v.kind,tool,requester:requester.id,room:room>=0?room:null,point:{x:requester.x,y:requester.y},at:w.time,scan:0};p.brain.route=[];p.brain.survey=null;if(w.bone.assignedBot===p.id)w.bone.assignedBot=null;p.brain.boneTask=null;p.assignment=v.kind;tip(w,p,'ordered');return true;}
 function executeOrder(w,p,dt){const b=p.brain,o=b.order,requester=w.players.find(q=>q.id===o.requester);const done=()=>{b.order=null;p.assignment=null;b.route=[];b.loaded=false;};if(!requester||!requester.alive||w.time-o.at>180){done();return false;}
  if(o.tool&&!owns(p,o.tool)){follow(w,p,w.map.spawn,112,dt);if(atRack(w,p)){if(!w.stock[o.tool]){tip(w,p,'stock',{tool:o.tool});done();return true;}if(p.inventory.length===4){const take=p.inventory.find(t=>t!=='flashlight');gear(w,p,take,true);}gear(w,p,o.tool);}return true;}
  if(o.kind==='bring'){follow(w,p,requester,112,dt);if(distance(p,requester)<70){if(requester.inventory.length>=4){tip(w,p,'full');return true;}if(!owns(requester,o.tool)){if(o.tool==='crucifix')requester.crossCharges=p.crossCharges??2;removeItem(p,o.tool);requester.inventory.push(o.tool);requester.tool=requester.tool||o.tool;if(o.tool==='flashlight')requester.flashlight=true;}tip(w,p,'delivered',{tool:o.tool});done();}return true;}
  if(o.kind==='power'){follow(w,p,w.map.breaker,112,dt);if(distance(p,w.map.breaker)<60){if(!w.power){w.power=w.lights=true;event(w,'breaker',p.id,{power:true});}tip(w,p,'power-restored');done();}return true;}
  if(o.kind==='regroup'){follow(w,p,requester,112,dt);if(distance(p,requester)<80&&w.time-o.at>15)done();return true;}
  const r=o.room===null?null:w.map.rooms[o.room],target=r?vacant(w,r,Number(p.id.slice(-1))*7):o.point;follow(w,p,target,112,dt);equip(p,o.tool);if(distance(p,target)>65)return true;
  if(o.kind==='temperature'){o.scan+=dt;if(o.scan>5){const temp=readings(w,p).temperature;tip(w,p,temp<10?'cold':'warm',{room:roomAt(w.map,p),temperature:temp});done();}return true;}
  use(w,p);tip(w,p,'placed',{tool:o.tool,room:roomAt(w.map,p)});done();return true;
 }
 function scoutReport(w,p,key,data={}){
  if(w.time<(w.nextBotReport||25)||w.time<(p.brain.nextReport||0))return;
  tip(w,p,key,data);w.nextBotReport=w.time+22;p.brain.nextReport=w.time+45;
 }
 function survey(w,p,dt,index){
  const b=p.brain;
  if(w.time<3+index*2||w.time<(b.resumeAt||0)){p.assignment='preparing';return;}
  if(p.sanity<25)b.resting=true;
  if(b.resting){
   p.assignment='rest';if(!atRack(w,p)){follow(w,p,w.map.spawn,108,dt);return;}
   for(const id of [...p.inventory])gear(w,p,id,true);
   b.survey=null;if(p.sanity<60)return;b.resting=false;b.resumeAt=w.time+5;return;
  }
  const s=b.survey||(b.survey={phase:'load',visits:{},reviewed:0,round:0,lead:null,placed:false,pause:0});
  if(s.phase==='load'||s.phase==='return'||s.phase==='supply'){
   p.assignment=s.phase==='load'?'preparing':'return';
   if(!atRack(w,p)){follow(w,p,w.map.spawn,108,dt);return;}
   if(s.phase==='return'){
    for(const id of [...p.inventory])gear(w,p,id,true);
    s.phase='load';s.pause=w.time+10+index*2;s.round++;return;
   }
   if(w.time<s.pause)return;
   const choices=[['thermo','emf','uv','recorder'],['emf','thermo','uv','recorder'],['uv','recorder','thermo','emf']][(index-1+s.round)%3];
   s.tool=choices.find(id=>owns(p,id))||choices.find(id=>w.stock[id]>0&&!w.players.some(q=>q.bot&&q!==p&&owns(q,id)))||choices.find(id=>w.stock[id]>0);
   if(!s.tool){s.pause=w.time+15;return;}
   for(const id of [...p.inventory])if(id!==s.tool&&id!=='flashlight')gear(w,p,id,true);
   if(!owns(p,s.tool))gear(w,p,s.tool);
   if(!enabled(w,'no_flashlight')&&!owns(p,'flashlight')&&w.stock.flashlight>1)gear(w,p,'flashlight');
   const placement=['book','camera','dots'][(index-1)%3];
   if(s.phase==='supply'&&s.lead&&w.stock[placement]>0&&!w.devices.some(d=>d.kind===placement)){
    gear(w,p,placement);s.placing=placement;s.room=s.lead.room;s.target=vacant(w,w.map.rooms[s.room],index*11+3);s.phase='place';
   }else{s.phase='choose';}
   b.route=[];return;
  }
  if(s.phase==='choose'){
   const candidates=w.map.rooms.map(r=>({r,score:(s.visits[r.id]||0)*1800+distance(p,r)+w.players.filter(q=>q.bot&&q!==p&&q.brain?.survey?.room===r.id).length*950+((r.id*17+index*31)%47)})).sort((a,b)=>a.score-b.score);
   s.room=candidates[0].r.id;s.target=vacant(w,candidates[0].r,index*17+s.round*7);s.phase='travel';s.travelAt=w.time;s.scan=0;s.used=false;b.route=[];
  }
  if(s.phase==='travel'||s.phase==='place'){
   p.assignment=s.phase==='place'?'supply':'search';
   if(distance(p,s.target)>35){
    follow(w,p,s.target,105,dt);
    if(w.time-(s.travelAt||w.time)>75){s.visits[s.room]=(s.visits[s.room]||0)+1;s.phase='choose';b.route=[];}
    return;
   }
   if(s.phase==='place'){
    equip(p,s.placing);if(use(w,p))scoutReport(w,p,'placed',{tool:s.placing,room:s.room});s.placed=true;s.placing=null;s.phase='choose';return;
   }
   s.phase='scan';s.scan=0;s.duration=12+((s.room*7+index*3)%9);s.best=0;s.scanPoint=vacant(w,w.map.rooms[s.room],index*13+s.reviewed*7+5);
  }
  if(s.phase!=='scan')return;
  p.assignment='scan';equip(p,s.tool);s.scan+=dt;if(s.scan>3&&distance(p,s.scanPoint)>28)follow(w,p,s.scanPoint,65,dt);
  if(s.tool==='recorder'&&s.scan>4&&!s.used){use(w,p);s.used=true;}
  const r=readings(w,p);let strength=0,key='quiet',data={room:s.room};
  if(s.tool==='thermo'){data.temperature=r.temperature;key=r.temperature<10?'cold':'warm';strength=r.temperature<10?2:r.temperature<13?1:0;}
  if(s.tool==='emf'&&r.emf>1){key='emf';data.value=r.emf;strength=r.emf===5?3:r.emf>=3?2:1;}
  if(s.tool==='uv'&&r.uv&&s.scan>6){key='uv';strength=3;for(const t of w.traces)if(t.expires>w.time&&distance(p,t)<200&&line(w,p,t))t.revealedUntil=w.time+9;}
  if(s.tool==='recorder'&&r.resonance&&p.recordingUntil>w.time&&s.scan>7){key='resonance';strength=2;}
  if(strength>s.best){s.best=strength;s.report={key,data};}
  if(s.scan<s.duration)return;
  s.visits[s.room]=(s.visits[s.room]||0)+1;s.reviewed++;
  if(s.best>=2&&(!s.lead||s.best>s.lead.strength))s.lead={room:s.room,strength:s.best,at:w.time};
  const report=s.report||{key,data};scoutReport(w,p,report.key,report.data);s.report=null;
  // Reports require human confirmation. Placement follows measured leads only,
  // after multiple room checks; no route or task reads the secret room.
  const placement=['book','camera','dots'][(index-1)%3];
  if(!s.placed&&s.lead&&s.reviewed>=2&&w.time>120&&w.stock[placement]>0&&!w.devices.some(d=>d.kind===placement)){s.phase='supply';s.travelAt=w.time;}
  else s.phase=s.reviewed%Math.max(3,w.map.rooms.length)===0?'return':'choose';
 }
  function bot(w,p,dt){if(!p.alive)return;const b=p.brain,index=Number(p.id.split('-')[1])||1;
  if(w.hunt.active){b.lastHunt=true;if(p.hidden||atRack(w,p))return;if(w.time-(w.hunt.started||0)<.5+index*.35)return;let c=b.hide&&w.map.closets.find(x=>x.id===b.hide&&w.players.filter(q=>q!==p&&q.alive&&q.hidden===x.id).length<4);if(!c){c=w.map.closets.filter(c=>w.players.filter(q=>q!==p&&q.alive&&(q.hidden===c.id||q.brain?.hide===c.id)).length<4).map(c=>({c,path:path(w,p,c)})).filter(x=>x.path.length||distance(p,x.c)<70).sort((a,b)=>a.path.length-b.path.length)[0]?.c;b.hide=c?.id;b.route=[];}if(c){follow(w,p,{x:c.x+35,y:c.y+30},160,dt);if(distance(p,c)<66){p.hidden=c.id;p.x=c.x;p.y=c.y;event(w,'closet',p.id,{open:false});}}else follow(w,p,w.map.spawn,150,dt);return;}
  if(p.hidden){interact(w,p);b.hide=null;b.route=[];}b.hide=null;if(b.lastHunt){b.lastHunt=false;b.survey=null;b.route=[];b.resumeAt=w.time+4;}
  const humans=w.players.filter(q=>!q.bot&&q.alive);if(!humans.length){b.order=null;follow(w,p,w.map.spawn,112,dt);return;}
  if(b.order&&executeOrder(w,p,dt))return;
  if(assist.tick(w,p,dt,index))return;survey(w,p,dt,index);
 }
  function startHunt(w,{cursed=false}={}){if(w.phase==='complete'||w.hunt.active)return false;let protection=w.devices.find(d=>d.kind==='crucifix'&&d.charges>0&&distance(d,w.ghost)<200);let holder=null;if(!protection){holder=w.players.find(p=>p.alive&&!p.hidden&&owns(p,'crucifix')&&(p.crossCharges??2)>0&&distance(p,w.ghost)<170);if(holder)protection=holder;}
  if(protection&&!cursed){if(holder){holder.crossCharges=(holder.crossCharges??2)-1;if(!holder.crossCharges)removeItem(holder,'crucifix');}else protection.charges--;w.hunt.next=w.time+28;event(w,'crucifix',holder?.id||protection.owner,{x:protection.x,y:protection.y});return false;}
  const d=DIFFICULTIES[w.difficulty];w.hunt={active:true,started:w.time,until:w.time+d.hunt+(cursed?12:0),graceUntil:w.time+(cursed?6:0),cursed,next:w.time+d.hunt+(cursed?12:0)+d.cooldown*(enabled(w,'frequent_hunts')?.5:1)*(w.secret.type==='demon'?.6:1),count:w.hunt.count+1};w.ghost.visible=w.hunt.until;w.ghost.target=null;w.ghost.path=[];w.ghost.routeAt=0;event(w,'hunt-start');return true;
 }
 function manifest(w){const r=w.map.rooms[w.secret.room],nearDoors=w.map.doors.filter(d=>!d.exit&&distance(d,w.ghost)<500&&!w.players.some(p=>p.alive&&distance(p,d)<65));w.activity=3+w.rng()*5;
  const sink=w.sinks.find(s=>distance(s,w.ghost)<500&&line(w,s,w.ghost));const car=w.devices.find(d=>d.kind==='toycar'&&distance(d,w.ghost)<420&&line(w,d,w.ghost)),n=w.rng(),kind=typeOf(w).id==='demon'&&n>.8?'laugh':sink&&n>.68&&n<.82?'water':car&&n>.82?'toycar':n<.22?'whisper':n<.40?'knock':n<.56?'footsteps':n<.72?'door':n<.9?'light':'manifest';
  if(kind==='water'){sink.on=true;sink.dirty=true;sink.dirtyAt=w.time;event(w,'water',null,{x:sink.x,y:sink.y,on:true,dirty:true});}
  else if(kind==='toycar'){pushCar(w,car);}
  else if(kind==='manifest'){w.ghost.visible=w.time+1.7;event(w,'manifest',null,{x:w.ghost.x,y:w.ghost.y});}
  else if(kind==='door'&&nearDoors.length){const d=nearDoors[Math.floor(w.rng()*nearDoors.length)];w.doors[d.id]=!w.doors[d.id];event(w,'door',null,{open:w.doors[d.id],x:d.x,y:d.y,entity:true,material:['metal','asylum'].includes(w.map.style)?'metal':'wood'});}
  else if(kind==='light'&&w.power&&!enabled(w,'no_power')){const adjacent=w.map.rooms.filter(q=>distance(q,r)<650),q=adjacent[Math.floor(w.rng()*adjacent.length)]||r;w.roomLights[q.id]=!w.roomLights[q.id];event(w,'light',null,{room:q.id,on:w.roomLights[q.id],x:q.x,y:q.y,entity:true});}
  else event(w,'ghost-event',null,{kind:kind==='light'?'scrape':kind,x:w.ghost.x,y:w.ghost.y,variant:Math.floor(w.rng()*4)});
  if(has(w,'uv')&&w.time>=w.secret.proof.uv.first&&w.rng()<.55){const d=nearDoors[0]||r;w.traces.push({id:'trace-'+w.sequence,x:d.x+(r.x-d.x)*.18,y:d.y+(r.y-d.y)*.18,room:r.id,at:w.time,expires:w.time+(w.difficulty==='nightmare'?55:110),revealedUntil:0});if(w.traces.length>12)w.traces.shift();}
  if(w.power&&w.rng()<(typeOf(w).id==='demon'?.38:typeOf(w).id==='wisp'?.3:w.difficulty==='nightmare'?.15:.08)){w.power=false;w.lights=false;event(w,'power-cut',null,{x:w.map.breaker.x,y:w.map.breaker.y});}
 }
  function ghost(w,dt){const g=w.ghost;if(w.hunt.active){if(w.time>=w.hunt.until){w.hunt.active=false;w.objectives.hunt=true;event(w,'hunt-end');for(const p of w.players)if(p.bot&&p.brain){p.brain.route=[];p.brain.target=null;}return;}
   const candidates=w.players.filter(p=>w.time>=(w.hunt.graceUntil||0)&&p.alive&&!p.hidden&&indoors(w,p)&&line(w,g,p)),target=candidates.sort((a,b)=>distance(a,g)-distance(b,g))[0];if(target){g.target={x:target.x,y:target.y};g.seen=target.id;g.lastSeenAt=w.time;}else if(g.seen&&w.time-(g.lastSeenAt||0)<4&&w.players.some(p=>p.id===g.seen&&p.alive&&!p.hidden)){const p=w.players.find(p=>p.id===g.seen);g.target={x:p.x,y:p.y};}else if(!g.target||distance(g,g.target)<25){const r=w.map.rooms[Math.floor(w.rng()*w.map.rooms.length)];g.target=vacant(w,r,Math.floor(w.time));g.seen=null;}
   if(w.time>=g.routeAt){g.path=path(w,g,g.target);g.routeAt=w.time+.6;}if(g.path[0]?.stair&&distance(g,g.path[0])<30){useStairs(w,g,g.path[0].stair);return;}while(g.path.length&&!g.path[0].stair&&distance(g,g.path[0])<13)g.path.shift();const point=g.path[0]||g.target,dx=point.x-g.x,dy=point.y-g.y,n=Math.hypot(dx,dy)||1,speed=typeOf(w).speed*DIFFICULTIES[w.difficulty].speed*(target&&typeOf(w).id==='watcher'?1.35:target?1.05:1);g.angle=Math.atan2(dy,dx);const nx=g.x+dx/n*Math.min(n,speed*dt),ny=g.y+dy/n*Math.min(n,speed*dt);if(!blocked(w,nx,ny,{ghost:true})){g.x=nx;g.y=ny;}
   for(const p of w.players)if(w.time>=(w.hunt.graceUntil||0)&&p.alive&&!p.hidden&&indoors(w,p)&&distance(p,g)<26&&line(w,g,p)){p.alive=false;event(w,'death',p.id);}
  }else{if(w.time>=w.nextRoam){roam(w);w.nextRoam=w.time+(enabled(w,'roaming')?65:300)+w.rng()*(enabled(w,'roaming')?40:180);}const r=w.map.rooms[w.secret.room],point=vacant(w,r,Math.floor(w.time/8));
   if(roomAt(w.map,g)!==r.id){if(w.time>=g.routeAt){g.path=path(w,g,point);g.routeAt=w.time+2;}if(g.path[0]?.stair&&distance(g,g.path[0])<30){useStairs(w,g,g.path[0].stair);return;}while(g.path.length&&!g.path[0].stair&&distance(g,g.path[0])<12)g.path.shift();const next=g.path[0]||point,dx=next.x-g.x,dy=next.y-g.y,n=Math.hypot(dx,dy)||1;g.x+=dx/n*Math.min(n,55*dt);g.y+=dy/n*Math.min(n,55*dt);}else{g.x+=(point.x-g.x)*Math.min(1,dt*.5);g.y+=(point.y-g.y)*Math.min(1,dt*.5);}if(w.time>=w.nextActivity){manifest(w);w.nextActivity=w.time+(typeOf(w).id==='veil'&&!roomLit(w,r.id)?12:17)+w.rng()*17;}w.activity=Math.max(0,w.activity-dt);const living=w.players.filter(p=>p.alive),sanity=living.reduce((n,p)=>n+p.sanity,0)/(living.length||1),d=DIFFICULTIES[w.difficulty];if(w.time>=w.hunt.next&&w.time>d.setup*(enabled(w,'frequent_hunts')?.65:1)*(w.secret.type==='demon'?.7:1)){if(sanity<(w.secret.type==='demon'?90:w.difficulty==='nightmare'?85:w.difficulty==='calm'?45:65)||w.time>d.setup*(enabled(w,'frequent_hunts')?.65:1)*(w.secret.type==='demon'?.7:1)+(w.secret.type==='demon'?25:w.difficulty==='nightmare'?25:w.difficulty==='calm'?150:80)*(enabled(w,'frequent_hunts')?.5:1))startHunt(w);else w.hunt.next=w.time+12;}}
 }
 function roam(w){
  const old=w.map.rooms[w.secret.room],choices=w.map.rooms.filter(r=>r.id!==old.id&&distance(r,old)<1100),room=(choices.length?choices:w.map.rooms.filter(r=>r.id!==old.id))[Math.floor(w.rng()*(choices.length||w.map.rooms.length-1))];
  if(!room)return false;
  w.secret.previousRooms=(w.secret.previousRooms||[]).filter(r=>w.time-r.at<80);w.secret.previousRooms.push({room:old.id,at:w.time});
  w.secret.room=room.id;w.secret.changedAt=w.time;w.ghost.path=[];w.ghost.routeAt=0;w.activity=Math.max(w.activity,3);
  // Moving rooms is observable through measurements, never a free HUD announcement.
  return true;
 }
 function canUseCurse(w,p){return w.phase==='investigating'&&p?.alive&&!p.bot&&!p.hidden&&w.curse&&!w.curse.broken&&distance(p,w.curse)<90&&line(w,p,w.curse)&&!w.hunt.active;}
 function stopCurse(w,p){if(w.curse?.activeBy!==p?.id)return false;w.curse.activeBy=null;event(w,'curse-goodbye',p.id);return true;}
 function curseHunt(w,p){w.curse.broken=w.curse.kind!=='tarot';w.curse.activeBy=null;event(w,w.curse.kind==='tarot'?'curse-hunt':'curse-break',p?.id||null,{kind:w.curse.kind,x:w.curse.x,y:w.curse.y});startHunt(w,{cursed:true});}
 function useCurse(w,p,question){
  if(question==='goodbye')return stopCurse(w,p);
  if(!canUseCurse(w,p)||w.time-w.curse.lastUse<1.5)return false;
  const c=w.curse;
  if(c.kind==='mirror'){
   if(c.uses>=2)return false;c.lastUse=w.time;c.uses++;p.sanity=clamp(p.sanity-18,0,100);c.revealRoom=w.secret.room;c.revealUntil=w.time+7;
   event(w,'curse-reveal',p.id,{kind:'mirror',room:c.revealRoom});if(c.uses===2)curseHunt(w,p);return true;
  }
  if(c.kind==='ouija'){
   if(c.activeBy&&c.activeBy!==p.id)return false;
   if(question==='begin'){c.lastUse=w.time;c.activeBy=p.id;event(w,'curse-begin',p.id,{kind:c.kind});return true;}
   if(!['where','age','intent','name'].includes(question)||w.time-c.lastQuestion<3)return false;
   c.lastUse=w.time;c.activeBy=p.id;c.lastQuestion=w.time;c.uses=Math.min(10,c.uses+1);p.sanity=clamp(p.sanity-4,0,100);
   const answer=question==='where'?{room:w.secret.room}:question==='age'?{age:({child:9,woodsman:73,widow:41,elder:81,nurse:36,shade:106})[w.ghost.model]}:{};
   event(w,'curse-answer',p.id,{kind:c.kind,question,...answer});return true;
  }
  if(c.kind==='tarot'){
   if(c.uses>=10)return false;c.lastUse=w.time;const card=w.secret.deck[c.uses++];c.lastCard=card;
   if(card==='tower')w.power=w.lights=false;
   if(card==='sun')p.sanity=clamp(p.sanity+20,0,100);
   if(card==='moon')p.sanity=clamp(p.sanity-20,0,100);
   if(card==='devil'){w.ghost.visible=w.time+3;w.activity=8;event(w,'manifest',null,{x:w.ghost.x,y:w.ghost.y});}
   if(card==='wheel')roam(w);
   if(card==='hermit')w.hunt.next=Math.max(w.hunt.next,w.time+30);
   if(card==='star')for(const q of w.players)if(q.alive)q.sanity=clamp(q.sanity+10,0,100);
   if(card==='magician'&&!enabled(w,'no_power')){w.power=w.lights=true;for(const r of w.map.rooms)w.roomLights[r.id]=true;}
   if(card==='hanged'){w.activity=9;event(w,'ghost-event',null,{kind:'whisper',variant:2,x:c.x,y:c.y});}
   event(w,'tarot',p.id,{card,x:c.x,y:c.y});if(card==='death')curseHunt(w,p);return true;
  }
  return false;
 }
 function updateCurse(w,dt){
  const c=w.curse;if(!c?.activeBy)return;const p=w.players.find(q=>q.id===c.activeBy);
  if(!p?.alive||p.hidden||distance(p,c)>95||!line(w,p,c)||w.hunt.active){c.activeBy=null;return;}
  c.spent=Math.min(20,c.spent+dt);p.sanity=clamp(p.sanity-dt*1.1,0,100);
  if(c.spent>=20)curseHunt(w,p);
 }
 function updateSensor(w,d){
  if(!['motion','rempod'].includes(d.kind))return;
  const dist=distance(d,w.ghost),sight=line(w,d,w.ghost);
  if(d.kind==='motion'){
   const inside=dist<70&&sight;
   if(inside&&!d.occupied&&w.time>=(d.nextTrip||0)){
    d.activeUntil=w.time+3;d.lastTrip=w.time;d.trips=(d.trips||0)+1;d.nextTrip=w.time+3;
    event(w,'motion-alarm',d.owner,{device:d.id,x:d.x,y:d.y});
   }
   d.occupied=inside;return;
  }
  // REM-POD can register ordinary activity for every entity. Level five is
  // possible only during a genuine EMF evidence window, exactly like the reader.
  const level=remLevel(w,d);
  d.level=level;
  if(level>1&&w.time>=(d.nextPulse||0)){
   d.nextPulse=w.time+Math.max(.45,2.6/level);event(w,'rem-pulse',d.owner,{device:d.id,level,x:d.x,y:d.y});
  }
 }
 function pushCar(w,d){
  const sign=w.rng()<.5?-1:1,angle=d.angle||0,length=75+w.rng()*75;let moved=0;
  for(let step=0;step<length;step+=5){const x=d.x+Math.cos(angle)*sign*5,y=d.y+Math.sin(angle)*sign*5;if(blocked(w,x,y)||!line(w,d,{x,y}))break;d.x=x;d.y=y;moved+=5;}
  if(!moved)return false;d.room=roomAt(w.map,d);d.pushedUntil=w.time+1;d.pushes=(d.pushes||0)+1;w.activity=Math.max(w.activity,5);
  event(w,'toycar-event',null,{device:d.id,x:d.x,y:d.y,direction:sign});return true;
 }
 // Panoramic room cameras keep a north-up frame. Corridor cameras retain a
 // directional wide lens; both use actual walls/doors rather than hidden truth.
 function cameraPose(w,device){
  const room=w.map.rooms[device.room],angle=Number.isFinite(device.angle)?device.angle:0;
  return room?{room,angle,arc:Math.PI*2,range:Math.hypot(room.w,room.h)+TILE,focus:{x:room.x,y:room.y}}:
   {room:null,angle,arc:2.8,range:700,focus:{x:device.x+Math.cos(angle)*230,y:device.y+Math.sin(angle)*230}};
 }
 function cameraVisible(w,device,point){
  const pose=cameraPose(w,device),d=distance(device,point);
  if(d>pose.range||!line(w,device,point))return false;
  if(pose.room){const r=pose.room;return point.x>=r.left-TILE&&point.x<=r.left+r.w+TILE&&point.y>=r.top-TILE&&point.y<=r.top+r.h+TILE;}
  const angle=Math.atan2(point.y-device.y,point.x-device.x);
  return d<45||Math.abs(Math.atan2(Math.sin(angle-pose.angle),Math.cos(angle-pose.angle)))<=pose.arc/2;
 }
 function cameraFeed(w,device){
  const pose=cameraPose(w,device);
  const orb=w.secret?device.room===w.secret.room&&signal(w,'orb')&&cameraVisible(w,device,pose.focus):device.orb;
  const dots=w.secret?w.devices.some(d=>d.kind==='dots'&&d.positive&&cameraVisible(w,device,d)):device.dots;
  return{orb:!!orb,dots:!!dots};
 }


  function update(w,dt,inputs={}){if(w.phase==='complete')return;dt=clamp(Number(dt)||0,0,.1);w.time+=dt;if(enabled(w,'no_power'))w.power=w.lights=false;updateCurse(w,dt);
  for(const sink of w.sinks)if(sink.on&&w.time>=(sink.nextSound||0)){sink.nextSound=w.time+5;event(w,'water-drip',null,{x:sink.x,y:sink.y});}
  for(const d of w.devices){
   updateSensor(w,d);
   if(d.kind==='dots'&&(d.positiveUntil||0)<w.time)d.positive=false;
   if(w.time>=(d.nextCheck||0)){d.nextCheck=w.time+5+w.rng()*6;const close=distance(d,w.ghost)<260&&line(w,d,w.ghost);if(close&&w.rng()<.55){if(d.kind==='book'&&signal(w,'writing'))d.written=true;if(d.kind==='dots'&&signal(w,'dots')){d.positive=true;d.positiveUntil=w.time+4;}if(d.kind==='salt'&&signal(w,'salt')&&distance(d,w.ghost)<135)d.disturbed=true;}}
   if(d.kind==='camera')Object.assign(d,cameraFeed(w,d));
  }
  for(const p of w.players){if(p.bot)bot(w,p,dt);else input(w,p.id,inputs[p.id]||{},dt);if(!p.alive)continue;if(enabled(w,'no_flashlight'))p.flashlight=false;const r=readings(w,p);p.sanity=clamp(p.sanity+(!indoors(w,p)?.45:-DIFFICULTIES[w.difficulty].drain*(w.secret.type==='demon'?1.65:1)*(roomLit(w,r.room)?.45:p.flashlight?1:1.8))*dt,0,100);if(p.hidden||p.bot)continue;
   if(r.hot&&p.tool==='thermo')p.probe+=dt;else p.probe=0;if(p.probe>(enabled(w,'hard_evidence')?5:3)&&r.temperature<0)evidence(w,'freezing',p.id);
   if(r.hot&&r.emf===5&&p.tool==='emf')p.scan+=dt;else p.scan=0;if(p.scan>(enabled(w,'hard_evidence')?5:3))evidence(w,'emf',p.id);
   if(p.tool==='uv'&&owns(p,'uv'))for(const t of w.traces)if(t.expires>w.time&&distance(p,t)<320&&line(w,p,t)){t.revealedUntil=w.time+9;evidence(w,'uv',p.id);}
   if(p.tool==='camera'&&r.orb){p.orbScan=(p.orbScan||0)+dt;if(p.orbScan>2)evidence(w,'orb',p.id);}else p.orbScan=0;if(p.watching&&nearVan(w,p)){const cam=w.devices.find(d=>d.id===p.watching&&d.kind==='camera');if(cam&&cameraFeed(w,cam).orb)evidence(w,'orb',p.id);if(cam&&cameraFeed(w,cam).dots)evidence(w,'dots',p.id);}
   if(p.tool==='rempod'&&owns(p,'rempod')&&r.rem===5||w.devices.some(d=>d.kind==='rempod'&&d.level===5&&(distance(p,d)<220&&line(w,p,d)||p.watchingSensors&&nearVan(w,p))))p.remScan=(p.remScan||0)+dt;else p.remScan=0;if(p.remScan>(enabled(w,'hard_evidence')?5:3))evidence(w,'emf',p.id);
   if(r.writing)evidence(w,'writing',p.id);if(r.dots)evidence(w,'dots',p.id);if(r.salt)evidence(w,'salt',p.id);
   if(p.tool==='recorder'&&r.resonance&&p.recordingUntil>w.time){p.record+=dt;if(p.record>2){evidence(w,'resonance',p.id);event(w,'recorded',p.id);p.recordingUntil=0;}}else p.record=0;
  }
  ghost(w,dt);if(w.time>=w.nextSample){w.nextSample=w.time+1;w.activityHistory.push(w.hunt.active?10:Math.round(clamp(w.activity*1.35,0,9)));if(w.activityHistory.length>60)w.activityHistory.shift();}const living=w.players.filter(p=>p.alive);if(!living.length)finish(w,null);else if(!living.some(p=>!p.bot)){if(w.deadAt===null)w.deadAt=w.time;if(w.time-w.deadAt>5&&living.every(p=>nearVan(w,p)))finish(w,null);}else w.deadAt=null;if(w.time>1500)finish(w,null);
 }
 function bonusMoney(w){return Math.min(260,w.photos.reduce((n,p)=>n+(C.PHOTO_VALUES[p.kind]||0),0)+(w.bone.collected?25:0));}
 function finish(w,guess){if(w.phase==='complete')return w.result;const correct=guess===w.secret.type,survivors=w.players.filter(p=>p.alive).map(p=>p.id),count=Math.min(3,w.found.length),bonus=bonusMoney(w),wipe=survivors.length===0,paid=C.reward({correct,evidence:count,hunt:w.objectives.hunt,photo:w.objectives.photo,bonus,wipe,difficulty:w.difficulty,size:w.map.size,challenges:w.challenges,seconds:w.time});w.phase='complete';w.hunt.active=false;w.result={correct,guess:guess||null,type:w.secret.type,evidence:typeOf(w).evidence,falseEvidence:typeOf(w).id==='deceiver'?w.secret.falseEvidence:null,survivors,...paid,challenges:[...w.challenges],challengeComplete:correct&&!wipe&&w.time>=30,bonus,wipe,seconds:Math.floor(w.time),found:[...w.found],photos:w.photos.map(p=>({...p}))};event(w,'complete');return w.result;}
  function snapshot(w){return{schema:PROTOCOL,id:w.id,mapId:w.mapId,difficulty:w.difficulty,hostId:w.hostId,focusRoom:w.focusRoom?{...w.focusRoom}:null,sinks:w.sinks.map(s=>({...s})),challenges:[...w.challenges],curse:w.curse?{...w.curse}:null,time:w.time,phase:w.phase,players:w.players.map(({brain,probe,scan,record,...p})=>{const r=readings(w,p);return{...p,sensor:{room:r.room,temperature:p.tool==='thermo'?r.temperature:null,emf:p.tool==='emf'?r.emf:null,rem:p.tool==='rempod'?r.rem:null,uv:p.tool==='uv'&&r.uv,orb:p.tool==='camera'&&r.orb,recording:Math.max(0,(p.recordingUntil||0)-w.time)}};}),doors:{...w.doors},power:w.power,lights:w.lights,roomLights:{...w.roomLights},ghost:{x:w.ghost.x,y:w.ghost.y,angle:w.ghost.angle,model:w.ghost.model,visible:w.ghost.visible},hunt:{...w.hunt},found:[...w.found],devices:w.devices.map(d=>({...d})),traces:w.traces.map(t=>({...t})),photos:w.photos.map(p=>({...p})),bone:{...w.bone},stock:{...w.stock},crossStock:[...w.crossStock],activity:w.hunt.active?10:Math.round(clamp(w.activity*1.35,0,9)),activityHistory:[...w.activityHistory],events:w.events.map(e=>({...e})),sequence:w.sequence,result:w.result?structuredClone(w.result):null,objectives:{...w.objectives}};}
 function validSnapshot(s,roster=[]){const spec=MAPS.find(m=>m.id===s?.mapId),point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=(spec?.cols||0)*TILE&&p.y<=(spec?.rows||0)*TILE;return s?.schema===PROTOCOL&&Array.isArray(s.sinks)&&s.sinks.length<=16&&s.sinks.every(x=>/^sink-[0-9]+$/.test(x.id)&&point(x)&&typeof x.on==='boolean'&&typeof x.dirty==='boolean')&&(!s.focusRoom||Number.isInteger(s.focusRoom.id)&&s.focusRoom.id>=0&&s.focusRoom.id<(spec?.rooms.length||0))&&Array.isArray(s.challenges)&&s.challenges.length<=C.CHALLENGES.length&&new Set(s.challenges).size===s.challenges.length&&s.challenges.every(id=>C.CHALLENGES.some(c=>c.id===id))&&s.curse&&C.CURSES.some(c=>c.id===s.curse.kind)&&point(s.curse)&&Number.isInteger(s.curse.uses)&&s.curse.uses>=0&&s.curse.uses<=10&&Number.isFinite(s.curse.spent)&&s.curse.spent>=0&&s.curse.spent<=21&&C.MODELS.includes(s.ghost?.model)&&typeof s.id==='string'&&s.id.length<80&&!!spec&&['investigating','complete'].includes(s.phase)&&Number.isFinite(s.time)&&s.time>=0&&s.time<=1600&&Array.isArray(s.players)&&s.players.length<=4&&new Set(s.players.map(p=>p.id)).size===s.players.length&&s.players.every(p=>typeof p.id==='string'&&p.id.length<70&&(p.bot===true||roster.includes(p.id))&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=spec.cols*TILE&&p.y>=0&&p.y<=spec.rows*TILE&&Array.isArray(p.inventory)&&p.inventory.length<=4&&new Set(p.inventory).size===p.inventory.length&&p.inventory.every(t=>TOOLS.includes(t))&&(p.tool===null||p.inventory.includes(p.tool)))&&Array.isArray(s.found)&&s.found.length<=4&&s.found.every(id=>EVIDENCE.some(e=>e.id===id))&&Array.isArray(s.devices)&&s.devices.length<=48&&s.devices.every(d=>/^device-[0-9]{1,7}$/.test(d.id)&&TOOLS.includes(d.kind)&&point(d)&&Number.isInteger(d.room)&&d.room>=-1&&d.room<spec.rooms.length)&&Array.isArray(s.traces)&&s.traces.length<=12&&s.traces.every(t=>/^trace-[0-9]{1,7}$/.test(t.id)&&point(t)&&Number.isFinite(t.expires)&&Number.isFinite(t.revealedUntil))&&Array.isArray(s.photos)&&s.photos.length<=8&&s.photos.every(p=>/^photo-[0-7]$/.test(p.id)&&['ghost','bone','uv','water','salt'].includes(p.kind)&&point(p))&&Array.isArray(s.events)&&s.events.length<=30&&s.ghost&&Number.isFinite(s.ghost.x)&&Number.isFinite(s.ghost.y)&&s.hunt&&typeof s.hunt.active==='boolean'&&s.doors&&typeof s.doors==='object'&&point(s.bone)&&Array.isArray(s.crossStock)&&s.crossStock.length<=32&&s.crossStock.every(n=>n===1||n===2)&&s.stock&&TOOLS.every(t=>Number.isInteger(s.stock[t])&&s.stock[t]>=0&&s.stock[t]<=32)&&s.roomLights&&typeof s.power==='boolean'&&(!s.result||GHOSTS.some(g=>g.id===s.result.type)&&Array.isArray(s.result.evidence)&&s.result.evidence.every(id=>EVIDENCE.some(e=>e.id===id))&&Array.isArray(s.result.found)&&Number.isFinite(s.result.seconds)&&Number.isFinite(s.result.xp)&&Number.isFinite(s.result.money));}
 function candidates(found){return GHOSTS.filter(g=>g.id==='deceiver'?found.length<=4&&found.filter(id=>!g.evidence.includes(id)).length<=1:found.every(id=>g.evidence.includes(id)));}
 const assist=I.create({C,distance,roomAt,line,sameFloor,floorOf,atRack,nearVan,follow,gear,equip,owns,use,pickup,collectBone,readings,vacant,event,tip});
 return{collectBone,pickup,floorOf,sameFloor,atRack,standable,useStairs,follow,voiceProfile:C.voiceProfile,PHOTO_VALUES:C.PHOTO_VALUES,CHALLENGES:C.CHALLENGES,CURSES:C.CURSES,CARDS:C.CARDS,MODELS:C.MODELS,challengePercent:C.challengePercent,enabled,remLevel,useCurse,stopCurse,updateSensor,pushCar,roam,PRICES:C.PRICES,STARTER:C.STARTER,supplies:C.supplies,level:C.level,reward:C.reward,signal,PROTOCOL,TILE,WIDTH,HEIGHT,TOOLS,ITEMS,EVIDENCE,GHOSTS,QUESTIONS,REPLIES,MAPS,DIFFICULTIES,clamp,distance,cell,centre,random,map,roomAt,blocked,move,line,path,create,readings,interact,interaction,use,gear,owns,equip,nearVan,indoors,roomLit,input,update,startHunt,finish,snapshot,validSnapshot,candidates,cameraPose,cameraVisible,cameraFeed,bonusMoney,manifest};
});
