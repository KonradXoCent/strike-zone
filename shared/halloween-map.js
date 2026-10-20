/* Original seasonal arena. Its slot is reserved before local/Workshop maps;
   availability changes, geometry and IDs never change during a running match. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./halloween-data.js'):root.SzHalloweenData);if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzHalloweenMap=api;api.install({MAPN,GRS,MAPS,WINS,FLRS,SITES,SPW,LB,SCL,FL,WC,FLG,WCG,BGC,MAP_BRIEFINGS});}})(globalThis,function(event){
 'use strict';
 const WIDTH=1280,HEIGHT=832,CELL=16;
 const spec={name:'zm_hallows_end',material:'ancient',floor:'#54505e',wall:'#95938e',dark:'#191a29',accent:'#efa45a',landmark:'temple',
  label:'HALLOWEEN / ZOMBIE',description:'Nawiedzony cmentarz z ruinami kaplicy, kryptami i bocznymi alejkami. Mapa wydarzenia dostępna do 30 listopada 2026.',
  tips:['Kaplica ma trzy wejścia. Pilnuj boków i trzymaj się drużyny.','Krypty i nagrobki zapewniają osłony, ale każdą część cmentarza można obejść.','Za aktywną grę w Zombie Mode otrzymujesz cukierki wydarzenia.'],
  walls:[[480,144,320,16],[480,160,16,80],[480,320,16,80],[784,160,16,80],[784,320,16,80],[480,384,112,16],[688,384,112,16],
   [128,160,224,16],[128,176,16,144],[336,176,16,144],[128,304,80,16],[288,304,64,16],
   [928,160,224,16],[928,176,16,144],[1136,176,16,144],[928,304,64,16],[1072,304,80,16],
   [128,560,80,16],[288,560,64,16],[128,576,16,144],[336,576,16,144],[128,704,224,16],
   [928,560,64,16],[1072,560,80,16],[928,576,16,144],[1136,576,16,144],[928,704,224,16]],
  covers:[[608,192,64,32],[528,304,48,32],[704,304,48,32],[352,432,32,48],[416,512,32,48],[896,432,32,48],[832,512,32,48],[544,560,32,48],[704,560,32,48],[544,672,32,48],[704,672,32,48],[624,688,32,48]]};
 let id=null;
 function build(){const cols=WIDTH/CELL,rows=HEIGHT/CELL,d=new Uint8Array(cols*rows),rect=(r,value)=>{for(let y=r[1]/CELL;y<(r[1]+r[3])/CELL;y++)for(let x=r[0]/CELL;x<(r[0]+r[2])/CELL;x++)d[y*cols+x]=value;};
  for(const r of[[0,0,WIDTH,32],[0,HEIGHT-32,WIDTH,32],[0,0,32,HEIGHT],[WIDTH-32,0,32,HEIGHT],...spec.walls])rect(r,1);for(const r of spec.covers)rect(r,2);
  return{cs:CELL,cols,rows,d,crates:[],covers:spec.covers.map((r,i)=>({name:'grave-'+i,material:'stone',polygon:[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]})),windows:[],links:[],labels:[],mode:'zombie',source:spec.name};
 }
 function install(w){if(id!==null)return id;id=w.MAPN.length;w.MAPN[id]=spec.name;w.GRS[id]=build();w.MAPS[id]=[];w.WINS[id]=[];w.FLRS[id]=[];w.SITES[id]=[];w.SPW[id]=[[96,368,128,128],[1056,368,128,128]];w.LB[id]=[];w.SCL[id]=WIDTH/1000;w.FL[id]=w.FLG[id]=spec.floor;w.WC[id]=w.WCG[id]=spec.wall;w.BGC[id]=[spec.floor,spec.dark,spec.accent];w.MAP_BRIEFINGS[id]={...spec};return id;}
 function render(q){q.save();
  // Paint only when the static map is baked; none of these decorations adds
  // per-frame particles, collision cells or navigation work.
  for(const[x,y,w,h]of spec.covers){q.fillStyle='#47424f';q.fillRect(x,y,w,h);q.fillStyle='#96949d';q.beginPath();q.roundRect(x+3,y+3,w-6,h-6,[8,8,2,2]);q.fill();q.fillStyle='#c2b6a6';q.fillRect(x+5,y+4,w-10,2);q.strokeStyle='#514954';q.lineWidth=2;q.beginPath();q.moveTo(x+w/2,y+11);q.lineTo(x+w/2,y+h-10);q.moveTo(x+w/2-6,y+17);q.lineTo(x+w/2+6,y+17);q.stroke();}
  for(const[x,y]of[[160,208],[320,208],[960,208],[1120,208],[160,656],[320,656],[960,656],[1120,656],[512,176],[768,176]]){const glow=q.createRadialGradient(x,y,2,x,y,29);glow.addColorStop(0,'#e79a4038');glow.addColorStop(1,'#e79a4000');q.fillStyle=glow;q.fillRect(x-29,y-29,58,58);q.fillStyle='#c26b2c';q.beginPath();q.ellipse(x,y,13,10,0,0,Math.PI*2);q.fill();q.strokeStyle='#edaf5d';q.lineWidth=1;q.beginPath();q.ellipse(x,y,7,10,0,0,Math.PI*2);q.stroke();q.fillStyle='#74804b';q.fillRect(x-2,y-14,4,5);q.fillStyle='#ffe1a0';for(const dx of[-5,5]){q.beginPath();q.moveTo(x+dx-2,y-2);q.lineTo(x+dx+2,y-2);q.lineTo(x+dx,y-5);q.fill();}q.fillRect(x-5,y+4,10,2);}
  for(const[x,y,sx,sy]of[[496,160,1,1],[784,160,-1,1],[144,176,1,1],[1136,176,-1,1],[144,704,1,-1],[1136,704,-1,-1]]){q.save();q.translate(x,y);q.scale(sx,sy);q.strokeStyle='#ddd1de55';q.lineWidth=.7;for(const end of[[44,0],[37,18],[22,36],[0,44]]){q.beginPath();q.moveTo(0,0);q.lineTo(...end);q.stroke();}for(const r of[12,24,36]){q.beginPath();q.moveTo(r,0);q.lineTo(r*.84,r*.4);q.lineTo(r*.5,r*.82);q.lineTo(0,r);q.stroke();}q.restore();}
  q.restore();
 }
 return{WIDTH,HEIGHT,CELL,spec,build,install,render,available:(now=Date.now())=>event.active(now),get id(){return id;}};
});
