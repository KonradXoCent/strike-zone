/* Original Frontier island. Shared deterministic geometry for hosts and guests. */
(function(root,factory){const d=factory();if(typeof module==='object'&&module.exports)module.exports=d;else root.ZRIsland=d;})(globalThis,function(){'use strict';
 const width=4096,height=3072,cs=32,revision=2;
 const pois=[{name:'Tidal Harbor',pl:'Port Przypływu',x:704,y:640,theme:'harbor',floor:'#9aab9e',wall:'#648a9a'}, {name:'Golden Acres',pl:'Złote Pola',x:2048,y:576,theme:'farm',floor:'#b7a65d',wall:'#bd7553'}, {name:'Sunridge',pl:'Słoneczne Wzgórze',x:3328,y:704,theme:'desert',floor:'#b7a278',wall:'#c8b18b'}, {name:'Pine Retreat',pl:'Leśna Przystań',x:736,y:2240,theme:'forest',floor:'#60765c',wall:'#8b7154'}, {name:'Dawn City',pl:'Miasto Świtu',x:2048,y:1600,theme:'city',floor:'#828d91',wall:'#99acae'}, {name:'Frostwatch',pl:'Mroźna Strażnica',x:3296,y:2304,theme:'snow',floor:'#bfd7d4',wall:'#b4c6d3'}];
 pois.push(
  {name:'Westbank Depot',pl:'Zachodnia Zajezdnia',x:352,y:1440,theme:'industrial',floor:'#7f8a7d',wall:'#8c9a8c',compact:true},
  {name:'Canal Village',pl:'Osada nad Kanałem',x:1344,y:1536,theme:'village',floor:'#9d997b',wall:'#ab8b65',compact:true},
  {name:'Rivergate Outpost',pl:'Posterunek Rzeczny',x:1376,y:896,theme:'river',floor:'#91a697',wall:'#7faaa4',compact:true},
  {name:'Harbor Exchange',pl:'Giełda Portowa',x:768,y:1280,theme:'market',floor:'#a6a182',wall:'#b09873',compact:true},
  {name:'Copperworks',pl:'Zakład Miedziowy',x:2816,y:1376,theme:'power',floor:'#8d9385',wall:'#a89268',compact:true},
  {name:'Redstone Quarry',pl:'Kamieniołom Czerwonej Skały',x:3744,y:1504,theme:'quarry',floor:'#b8a078',wall:'#af8963',compact:true},
  {name:'Whisper Camp',pl:'Obozowisko Szeptów',x:1376,y:2496,theme:'camp',floor:'#788660',wall:'#8c7958',compact:true},
  {name:'Southwatch Observatory',pl:'Południowe Obserwatorium',x:2560,y:2688,theme:'observatory',floor:'#a6b4ae',wall:'#8faab5',compact:true}
 );
 const vans=pois.filter(p=>!p.compact).map((p,i)=>({id:i,x:p.x+64,y:p.y+80}));
 function build(){const cols=width/cs,rows=height/cs,d=new Uint8Array(cols*rows),walls=[],houses=[],trees=[],covers=[];
  const rect=(r,v=1)=>{walls.push(r);for(let y=Math.floor(r[1]/cs);y<Math.ceil((r[1]+r[3])/cs);y++)for(let x=Math.floor(r[0]/cs);x<Math.ceil((r[0]+r[2])/cs);x++)if(x>=0&&y>=0&&x<cols&&y<rows)d[y*cols+x]=v;return r;};
  [[0,0,width,32],[0,height-32,width,32],[0,0,32,height],[width-32,0,32,height]].forEach(r=>rect(r));
  for(const p of pois)for(const[dx,dy]of(p.compact?[[-128,-96]]:[[-256,-224],[160,-224],[-256,160]])){const x=p.x+dx,y=p.y+dy,w=p.compact?256:288,h=p.compact?192:224;houses.push({x,y,w,h,theme:p.theme,floor:p.floor,wall:p.wall});for(const r of[[x,y,w,32],[x,y,32,h],[x+w-32,y,32,h],[x,y+h-32,80,32],[x+w-80,y+h-32,80,32],[x+128,y+64,32,64]]){r.royaleTint=p.wall;rect(r);}rect([x+64,y+64,32,32],2);}
  for(const p of pois.filter(p=>p.compact))for(const [dx,dy]of[[-176,-112],[144,-80],[-176,80],[144,112]]){const r=[p.x+dx,p.y+dy,32,32];r.royaleCrate={theme:p.theme,color:p.wall};rect(r,2);covers.push(r);}
  for(const v of vans)rect([v.x-40,v.y-24,80,48]).royaleVan=true;
  let seed=4147;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<170;i++){const x=96+Math.floor(rand()*(cols-6))*cs,y=96+Math.floor(rand()*(rows-6))*cs;if(pois.some(p=>Math.hypot(x-p.x,y-p.y)<(p.compact?245:540))||Math.abs(y-1536)<150||Math.abs(x-2048)<160)continue;const ix=x/cs,iy=y/cs;if(d[iy*cols+ix])continue;trees.push({x:x+16,y:y+16,snow:x>2800&&y>1800,r:20+rand()*13});rect([x,y,32,32],2).royaleTree=trees.at(-1);}
  return{cs,cols,rows,d,nd:null,walls,houses,trees,covers,crates:[],windows:[],links:[],labels:[],source:'zr_frontier',mode:'br',royaleIsland:true};
 }
 function drawBase(q){q.fillStyle='#285c6b';q.fillRect(0,0,width,height);q.fillStyle='#b7b58a';q.beginPath();q.roundRect(64,64,width-128,height-128,220);q.fill();q.fillStyle='#5b8d62';q.beginPath();q.roundRect(128,128,width-256,height-256,210);q.fill();
  q.fillStyle='#b6a16b';q.beginPath();q.ellipse(3296,704,620,610,.2,0,7);q.fill();q.fillStyle='#c5dddd';q.beginPath();q.ellipse(3328,2336,650,610,-.2,0,7);q.fill();q.fillStyle='#447650';q.beginPath();q.ellipse(768,2176,640,640,0,0,7);q.fill();q.fillStyle='#a49e54';q.fillRect(1568,128,960,704);
  q.strokeStyle='#5d8489';q.lineWidth=128;q.beginPath();q.moveTo(1280,64);q.bezierCurveTo(1152,1024,2816,1184,2656,height-64);q.stroke();q.strokeStyle='#b9b19a';q.lineWidth=112;q.lineJoin='round';q.beginPath();q.moveTo(704,640);q.lineTo(2048,576);q.lineTo(3328,704);q.lineTo(3296,2304);q.lineTo(2048,1600);q.lineTo(736,2240);q.lineTo(704,640);q.moveTo(2048,576);q.lineTo(2048,1600);q.stroke();q.strokeStyle='#656b63';q.lineWidth=76;q.stroke();q.strokeStyle='#e3d8af';q.lineWidth=3;q.setLineDash([28,30]);q.stroke();q.setLineDash([]);
  for(const p of pois){const small=!!p.compact;q.fillStyle=p.floor;q.beginPath();q.roundRect(p.x-(small?224:384),p.y-(small?176:352),small?448:800,small?352:720,small?18:35);q.fill();if(small){q.strokeStyle='#cfba8c';q.lineWidth=31;q.beginPath();q.moveTo(p.x,p.y+140);q.lineTo(p.x,p.y+225);q.stroke();q.fillStyle='#233c3044';for(let n=0;n<8;n++)q.fillRect(p.x-208+(n%4)*120,p.y-152+Math.floor(n/4)*260,20,14);if(p.theme==='power'){q.fillStyle='#59766d';for(let n=0;n<3;n++){q.fillRect(p.x+105,p.y-145+n*50,70,30);q.fillStyle='#e1bb65';q.fillRect(p.x+110,p.y-140+n*50,5,20);q.fillStyle='#59766d';}}if(p.theme==='quarry'){q.fillStyle='#8f7456';for(let n=0;n<3;n++){q.beginPath();q.ellipse(p.x-170+n*140,p.y+135,45,27,.3,0,7);q.fill();}}if(p.theme==='camp'){q.fillStyle='#354b32';for(let n=0;n<3;n++){q.beginPath();q.moveTo(p.x-190+n*160,p.y+115);q.lineTo(p.x-165+n*160,p.y+70);q.lineTo(p.x-140+n*160,p.y+115);q.fill();}}if(p.theme==='observatory'){q.fillStyle='#637e86';q.beginPath();q.arc(p.x+130,p.y-110,45,0,7);q.fill();q.strokeStyle='#afc9c5';q.lineWidth=6;q.beginPath();q.moveTo(p.x+95,p.y-145);q.lineTo(p.x+165,p.y-75);q.stroke();}}if(p.theme==='farm'){q.strokeStyle='#d7c67b';q.lineWidth=8;for(let x=p.x-350;x<p.x+380;x+=40){q.beginPath();q.moveTo(x,p.y-300);q.lineTo(x,p.y+300);q.stroke();}}if(p.theme==='harbor'){q.fillStyle='#607979';for(let i=0;i<4;i++)q.fillRect(p.x-520,p.y-224+i*130,200,62);}}
 }
 return{width,height,cs,revision,pois,vans,build,drawBase};
});
