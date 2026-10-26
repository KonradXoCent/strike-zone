/* Cached 2.5D map rendering. All architecture stays inside the existing
   collision footprint. Geometry, LOS, simulation, networking and aim are original.
   Static detail is baked by buildStatic into SCV; no second full-map canvas. */
(function(root){
 'use strict';
 const cache=new Map(),sprites=new Map();
 const supported=()=>!!GR?.d||Array.isArray(MAPS[sel.map]);
 const palette=()=>{const p=SzMapMaterials.profile(sel.map,MAP_BRIEFINGS[sel.map]||{});return{...p,cap:p.wallColor,dark:shade(p.dark,12),trim:shade(p.wallColor,30),face:shade(p.wallColor,-25),side:shade(p.wallColor,-55)};};
 const stats={bakes:0,lastBakeMs:0,edgeRuns:0,faces:0,textureBuilds:0,actorDraws:0};
 const text=(pl,en)=>root.szLocale?.language==='en'?en:pl;
 const enabled=()=>ST_().mapDepth25!==0;
 const isMirage=()=>sel.map===2;
 const active=()=>enabled()&&supported();
 const old={build:buildStatic,wall:drawWall,grid:drawGridMap,cover:drawMapCover,body:drawBody,weapon:drawW,grenade:drawGrenadeSprite,world:drawMatchWorld,tab,set:setTab,draw,quit};
 let worldPass=false,baking=false,signature='';
 function shade(c,n){return root.SzMapMaterials.shade(c,n);}
 function line(q,points,color,width=1){q.beginPath();points.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.strokeStyle=color;q.lineWidth=width;q.stroke();}
 function polygon(q,points,color){q.beginPath();points.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();q.fillStyle=color;q.fill();}
 function texture(kind){const pal=palette(),key=kind==='cap'?kind+'|'+pal.cap+'|'+pal.wall:kind;if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),rand=SzMapMaterials.random(SzMapMaterials.hash('map-depth-'+key));
  if(kind==='cap'){
   q.fillStyle=pal.cap;q.fillRect(0,0,128,128);
   if(pal.wall==='metal'){
    for(let x=0;x<128;x+=32){q.fillStyle=shade(pal.cap,x%64?5:-5);q.fillRect(x,0,31,128);q.fillStyle=shade(pal.cap,-40);q.fillRect(x,0,1,128);q.fillStyle=shade(pal.cap,35);q.fillRect(x+1,0,1,128);for(const y of[8,62,119]){q.fillStyle=shade(pal.cap,-50);q.fillRect(x+6,y,3,3);q.fillRect(x+23,y,3,3);}}
   }else if(pal.wall==='wood'){
    for(let x=0;x<128;x+=16){q.fillStyle=shade(pal.cap,(rand()-.5)*22);q.fillRect(x,0,15,128);q.fillStyle=shade(pal.cap,-35);q.fillRect(x,0,1,128);}
   }else if(pal.wall==='concrete'){
    q.fillStyle=shade(pal.cap,-18);q.fillRect(0,0,1,128);q.fillRect(0,0,128,1);q.fillRect(64,0,1,128);q.fillRect(0,64,128,1);
   }else{
    const bh=pal.wall==='brick'?16:32,bw=pal.wall==='brick'?32:64;
    for(let y=0,row=0;y<128;y+=bh,row++)for(let x=-(row%2?bw/2:0);x<128;x+=bw){q.fillStyle=shade(pal.cap,(rand()-.5)*17);q.fillRect(x+1,y+1,bw-2,bh-2);q.fillStyle=shade(pal.cap,35)+'6b';q.fillRect(x+2,y+1,bw-4,1);q.fillStyle=shade(pal.cap,-45)+'35';q.fillRect(x+2,y+bh-2,bw-3,1);if(pal.moss&&rand()<.4){q.fillStyle='#3a573a55';q.fillRect(x+2,y+bh-4,5+rand()*18,3);}}
   }
  }else{
   const base=kind==='wood'?'#aa804a':kind==='metal'?'#8c9e99':'#bda77c';q.fillStyle=base;q.fillRect(0,0,128,128);
   for(let x=0;x<128;x+=16){q.fillStyle=shade(base,(rand()-.5)*18);q.fillRect(x,0,15,128);q.fillStyle=shade(base,-22);q.fillRect(x,0,1,128);}
  }
  for(let i=0;i<650;i++){q.fillStyle=rand()<.5?'#0000000b':'#ffffff16';q.fillRect(rand()*128|0,rand()*128|0,1+rand()*2,1);}
  const result=q.createPattern(c,'repeat');if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,result);stats.textureBuilds++;return result;
 }
 function gridPaths(g){
  const {cols:W,rows:H,cs:s,d}=g,solid=new Path2D(),walk=new Path2D(),band=new Path2D();
  const dist=new Uint8Array(d.length);dist.fill(255);const queue=new Int32Array(d.length);let tail=0;
  for(let i=0;i<d.length;i++)if(d[i]!==1){dist[i]=0;queue[tail++]=i;}
  for(let head=0;head<tail;head++){const i=queue[head],n=dist[i]+1;if(n>5)continue;const x=i%W,y=i/W|0;for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&dist[j]>n){dist[j]=n;queue[tail++]=j;}}
  for(let y=0;y<H;y++)for(const [path,accept]of[[solid,x=>d[y*W+x]===1],[walk,x=>d[y*W+x]===0||d[y*W+x]===3],[band,x=>d[y*W+x]===1&&dist[y*W+x]<=5]]){let begin=-1;for(let x=0;x<=W;x++){if(x<W&&accept(x)){if(begin<0)begin=x;}else if(begin>=0){path.rect(begin*s,y*s,(x-begin)*s,s);begin=-1;}}}
  return{solid,walk,band};
 }
 function facade(q,x,y,length,vertical){
  const depth=vertical?13:24,pal=palette();
  const grad=vertical?q.createLinearGradient(x-depth,0,x,0):q.createLinearGradient(0,y-depth,0,y);
  grad.addColorStop(0,vertical?pal.face:shade(pal.cap,4));grad.addColorStop(.2,vertical?pal.side:shade(pal.cap,-18));grad.addColorStop(.9,vertical?shade(pal.side,-12):shade(pal.face,-15));grad.addColorStop(1,shade(pal.side,-20));
  q.fillStyle=grad;if(vertical)q.fillRect(x-depth,y,depth,length);else q.fillRect(x,y-depth,length,depth);
  if(vertical){line(q,[[x-depth,y],[x-depth,y+length]],pal.trim+'9c',2);line(q,[[x-3,y],[x-3,y+length]],'#493d2d77',2);for(let a=y+16;a<y+length;a+=28)line(q,[[x-depth+1,a],[x-1,a]],'#5846314a',.7);}
  else{
   q.fillStyle=pal.trim;q.fillRect(x,y-depth-2,length,3);q.fillStyle='#7f68452e';q.fillRect(x,y-depth+3,length,2);q.fillStyle='#5e4c3655';q.fillRect(x,y-4,length,3);
   for(let a=x+18;a<x+length;a+=34){line(q,[[a,y-10],[Math.min(a+34,x+length),y-10]],'#735c4044',.8);line(q,[[a,y-10],[a,y-3]],'#735c4044',.8);}
   // Recesses are painted on the wall face, never added to collision or doors.
   if(pal.wall==='plaster'&&length>105)for(let a=x+34;a<x+length-30;a+=155){q.fillStyle='#463f32';q.fillRect(a-1,y-20,23,16);q.fillStyle='#567779';q.fillRect(a,y-19,20,13);q.fillStyle='#b6c0a233';q.fillRect(a,y-19,20,2);for(let k=0;k<4;k++){q.fillStyle='#203b3966';q.fillRect(a+2+k*5,y-17,2,10);}q.fillStyle='#d4bd91';q.fillRect(a-2,y-6,25,3);}
  }stats.faces++;
 }
 function coverDepth(q,cover){
  const p=cover.polygon,x=Math.min(...p.map(v=>v[0])),y=Math.min(...p.map(v=>v[1])),w=Math.max(...p.map(v=>v[0]))-x,h=Math.max(...p.map(v=>v[1]))-y,kind=cover.material;
  if(w<12||h<12)return;
  q.save();q.beginPath();p.forEach(([a,b],i)=>i?q.lineTo(a,b):q.moveTo(a,b));q.closePath();q.clip();
  const dx=Math.min(10,w*.22),dy=Math.min(kind==='vehicle'?13:17,h*.29),tx=x+2,ty=y+2,tw=w-dx-2,th=h-dy-2;
  if(kind==='vehicle'){
   const vertical=h>w;q.fillStyle='#36484d';q.fillRect(x,y,w,h);q.fillStyle='#8c9f91';q.fillRect(tx,ty,tw,th);q.fillStyle='#31484d';if(vertical){q.fillRect(tx+4,ty+th*.18,tw-8,th*.21);q.fillRect(tx+4,ty+th*.67,tw-8,th*.17);}else{q.fillRect(tx+tw*.18,ty+4,tw*.19,th-8);q.fillRect(tx+tw*.7,ty+4,tw*.15,th-8);}q.fillStyle='#d7dac266';q.fillRect(tx+3,ty+3,Math.max(2,tw-6),2);
  }else{
   const colors=kind==='metal'?['#768e89','#435d5c','#2a4242']:kind==='stone'?['#c5b995','#968767','#746950']:['#c3a06a','#8b6037','#60462e'];
   q.fillStyle=texture(kind==='metal'?'metal':kind==='stone'?'stone':'wood');q.fillRect(tx,ty,tw,th);
   polygon(q,[[tx,ty+th],[tx+tw,ty+th],[x+w,y+h],[x,y+h]],colors[1]);
   polygon(q,[[tx+tw,ty],[x+w,y],[x+w,y+h],[tx+tw,ty+th]],colors[2]);
   if(kind==='wood'){
    q.strokeStyle='#5d452b';q.lineWidth=2;q.strokeRect(tx+3,ty+3,Math.max(2,tw-6),Math.max(2,th-6));
    line(q,[[tx+5,ty+5],[tx+tw-5,ty+th-5]],'#edcb8d',3.5);line(q,[[tx+tw-5,ty+5],[tx+5,ty+th-5]],'#80613c',2.5);
    for(let yy=y+h-dy+5;yy<y+h;yy+=6)line(q,[[x+2,yy],[x+w-2,yy]],'#382d225e',1);
   }else if(kind==='metal'){
    for(let xx=tx+8;xx<tx+tw;xx+=12)line(q,[[xx,ty+2],[xx,ty+th-2]],'#d4dbbe77',1.2);
    q.strokeStyle='#d7d6ad99';q.lineWidth=1.5;q.strokeRect(tx+3,ty+3,Math.max(1,tw-6),Math.max(1,th-6));
   }else for(let yy=ty+13;yy<ty+th;yy+=17)line(q,[[tx,yy],[tx+tw,yy]],'#776f5866',1.2);
   line(q,[[tx,ty+th],[tx+tw,ty+th],[tx+tw,ty]],colors[0],2);
   q.fillStyle='#dbd2b480';q.fillRect(tx+2,ty+1,Math.max(2,tw-4),1.5);
  }
  q.restore();q.save();q.beginPath();p.forEach(([a,b],i)=>i?q.lineTo(a,b):q.moveTo(a,b));q.closePath();q.strokeStyle='#302b25aa';q.lineWidth=1.4;q.stroke();q.restore();
 }
 function paintArchitecture(q,g){
  const start=performance.now(),s=g.cs,{solid,walk,band}=gridPaths(g),edges=SzMapMaterials.edgeRuns(g);
  stats.faces=0;stats.edgeRuns=Object.values(edges).reduce((n,a)=>n+a.length,0);
  // Soft, directional contact shadows are clipped to walkable ground.
  q.save();q.clip(walk);for(const [size,alpha]of[[24,.035],[14,.055],[6,.10]]){q.fillStyle='rgba(29,25,18,'+alpha+')';for(const[x,y,n]of edges.bottom)q.fillRect(x*s,(y+1)*s,n*s+size,size);for(const[x,y,n]of edges.right)q.fillRect((x+1)*s,y*s,size,n*s+size);}q.restore();
  // Caps and facades are confined to solid cells so narrow passages stay clear.
  q.save();q.clip(solid);q.fillStyle=palette().dark;q.fill(solid);q.fillStyle=texture('cap');q.fill(band);
  q.save();q.clip(band);const wash=q.createLinearGradient(0,0,WW,WH);wash.addColorStop(0,'#fff4cf1c');wash.addColorStop(1,'#201b1519');q.fillStyle=wash;q.fillRect(0,0,WW,WH);q.restore();
  for(const[x,y,n]of edges.right)facade(q,(x+1)*s,y*s,n*s,true);
  for(const[x,y,n]of edges.bottom)facade(q,x*s,(y+1)*s,n*s,false);
  q.fillStyle=palette().trim;for(const[x,y,n]of edges.top)q.fillRect(x*s,y*s,n*s,2.6);for(const[x,y,n]of edges.left)q.fillRect(x*s,y*s,2.6,n*s);
  q.fillStyle='#756b5355';for(const[x,y,n]of edges.top)q.fillRect(x*s,y*s+3,n*s,2);for(const[x,y,n]of edges.left)q.fillRect(x*s+3,y*s,2,n*s);
  q.restore();
  for(const window of g.windows||[])drawMapWindow(q,window);
  for(const cover of g.covers||[]){old.cover(q,cover);coverDepth(q,cover);}
  for(const c of g.crates||[]){const x=c[0]*s,y=c[1]*s,w=3*s;coverDepth(q,{material:'wood',polygon:[[x,y],[x+w,y],[x+w,y+w],[x,y+w]]});}
  stats.bakes++;stats.lastBakeMs=performance.now()-start;
 }
 function rectDepth(q,w){const[x,y,a,b]=w;if(a<8||b<8)return;q.save();q.beginPath();q.rect(x,y,a,b);q.clip();const crate=a<110&&b<110&&Math.min(a,b)>24;if(crate)coverDepth(q,{material:'wood',polygon:[[x,y],[x+a,y],[x+a,y+b],[x,y+b]]});else{facade(q,x+a,y,b,true);facade(q,x,y+b,a,false);q.fillStyle=palette().trim;q.fillRect(x,y,a,2);q.fillRect(x,y,2,b);}q.restore();}
 buildStatic=function(g){const before=baking;baking=true;try{return old.build(g);}finally{baking=before;}};
 drawWall=function(w){if(!active())return old.wall(w);if(baking){old.wall(w);rectDepth(cx,w);return;}const pal=palette(),key=pal.cap+'|'+pal.wall+'|'+w[2]+'|'+w[3]+'|'+(w.brCover||'');if(w[2]>512||w[3]>512){old.wall(w);rectDepth(cx,w);return;}let c=sprites.get(key);if(!c){c=document.createElement('canvas');c.width=Math.ceil(w[2])+16;c.height=Math.ceil(w[3])+16;const before=cx;try{cx=c.getContext('2d');cx.translate(8-w[0],8-w[1]);old.wall(w);rectDepth(cx,w);}finally{cx=before;}if(sprites.size>=48)sprites.delete(sprites.keys().next().value);sprites.set(key,c);}cx.drawImage(c,w[0]-8,w[1]-8);};
 drawGridMap=function(){const r=old.grid();if(active())paintArchitecture(cx,GR);return r;};
 // Low-cost cached light/shadow stamps preserve agent and weapon skin colours.
 const shadow=document.createElement('canvas');shadow.width=64;shadow.height=48;{
  const q=shadow.getContext('2d');q.scale(1,.72);const grad=q.createRadialGradient(29,28,3,29,28,24);grad.addColorStop(0,'#171d2270');grad.addColorStop(.6,'#171d2238');grad.addColorStop(1,'#171d2200');q.fillStyle=grad;q.fillRect(0,0,64,67);
 }
 drawBody=function(p){if(active()&&worldPass&&p.alive&&!p.ap){cx.drawImage(shadow,p.x-26,p.y-16,64,48);stats.actorDraws++;}return old.body(p);};
 drawW=function(p,...args){if(active()&&worldPass&&p.alive){cx.save();cx.translate(p.x+1.8,p.y+2.7);cx.rotate(p.a);cx.fillStyle='#18202945';cx.beginPath();cx.ellipse(17,0,p.cur==='knife'?9:13,2.5,0,0,Math.PI*2);cx.fill();cx.restore();}return old.weapon(p,...args);};
 drawGrenadeSprite=function(q,type,x=0,y=0,scale=1){if(active()&&worldPass){q.save();q.fillStyle='#17212955';q.beginPath();q.ellipse(x+2,y+4,7*scale,3.5*scale,0,0,Math.PI*2);q.fill();q.restore();}return old.grenade(q,type,x,y,scale);};
 drawMatchWorld=function(...args){const before=worldPass;worldPass=true;try{return old.world(...args);}finally{worldPass=before;}};
 function invalidate(){SCV=null;SCG=null;SCK='';}
 const compare=document.createElement('button');compare.id='sz-depth-compare';compare.hidden=true;compare.dataset.noTranslate='';compare.type='button';compare.onclick=()=>setEnabled(!enabled());$('game').append(compare);
 function updateCompare(){
  const show=!!G&&!$('game').hidden&&supported()&&!G.intro&&!G.over&&!G.netWaiting&&$('ov').style.display!=='flex';
  if(compare.hidden===show)compare.hidden=!show;
  const key=sel.map+'|'+enabled()+'|'+(root.szLocale?.language||'pl');if(key===signature)return;signature=key;
  compare.innerHTML='<span><strong>'+workshopEscape(MAPN[sel.map]||'MAP')+' · '+(enabled()?'2.5D':'2D')+'</strong><small>'+text('Porównaj wygląd','Compare visuals')+'</small></span><kbd>F8</kbd>';
  compare.setAttribute('aria-label',text('Przełącz wygląd map między 2D i 2.5D','Switch maps between 2D and 2.5D'));
  compare.setAttribute('aria-pressed',String(enabled()));
 }
 function setEnabled(value,persist=true){ST_().mapDepth25=value?1:0;invalidate();signature='';updateCompare();for(const el of document.querySelectorAll('[data-depth-choice]'))el.value=value?'1':'0';if(persist)save();}
 draw=function(...args){const before=worldPass;worldPass=!!G;try{return old.draw(...args);}finally{worldPass=before;updateCompare();}};
 quit=function(...args){compare.hidden=true;return old.quit(...args);};
 addEventListener('keydown',e=>{if(e.code!=='F8'||e.repeat||!G||!supported()||e.target.closest?.('input,textarea,select,[contenteditable="true"],dialog'))return;e.preventDefault();e.stopImmediatePropagation();setEnabled(!enabled());},true);
 function settings(target){if(!target||target.querySelector('[data-depth-settings]'))return;const panel=document.createElement('section');panel.className='box sz-depth-settings';panel.dataset.depthSettings='';panel.dataset.noTranslate='';panel.innerHTML='<h3>'+text('Głębia map 2.5D','2.5D map depth')+'</h3><p>'+text('Głębia i cienie dopasowane do stylu każdej mapy. F8 przełącza wygląd podczas meczu.','Depth and shadows match each map’s style. F8 switches visuals during a match.')+'</p><label>'+text('Wygląd map','Map visuals')+' <select data-depth-choice><option value="1">2.5D</option><option value="0">2D</option></select></label>';const select=panel.querySelector('select');select.value=enabled()?'1':'0';select.onchange=()=>setEnabled(select.value==='1');target.append(panel);}
 setTab=function(mm){const r=old.set(mm);settings(mm?.nodeType?mm:$('main'));return r;};
 function home(){}
 function preview(){if(!G)playFlow();}
 tab=function(...args){const r=old.tab(...args);home();return r;};
 document.addEventListener('sz-language',()=>{signature='';updateCompare();for(const panel of document.querySelectorAll('[data-depth-settings]')){const target=panel.parentElement;panel.remove();settings(target);}document.querySelector('[data-depth-banner]')?.remove();home();});
 root.SzMapDepth={enabled,active,isMirage,supported,setEnabled,preview,stats:()=>({...stats,textureCount:cache.size,textureBytes:cache.size*128*128*4+64*48*4,spriteCount:sprites.size})};
 home();updateCompare();
})(globalThis);
