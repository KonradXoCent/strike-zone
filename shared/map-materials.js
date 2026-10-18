/* Original, procedural top-down materials. Static detail is baked into the
   existing SCV; the normal frame renderer keeps its existing cropped blit. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzMapMaterials=api;api.mount();}})(globalThis,function(root){
 'use strict';
 const names=['dust','ancient','mirage','inferno','overpass','nuke','island','snow','metro','mall','lab','village','aztec','anubis'];
 const profiles={
  dust:{floor:'sand',wall:'sandstone'},ancient:{floor:'pavers',wall:'stone',moss:true},
  mirage:{floor:'pavers',wall:'plaster'},inferno:{floor:'cobble',wall:'brick'},
  overpass:{floor:'asphalt',wall:'concrete'},nuke:{floor:'concrete',wall:'metal'},
  island:{floor:'grass',wall:'stone'},snow:{floor:'snow',wall:'concrete'},
  metro:{floor:'asphalt',wall:'brick'},mall:{floor:'tiles',wall:'concrete'},
  lab:{floor:'tiles',wall:'metal'},village:{floor:'dirt',wall:'wood'},
  aztec:{floor:'pavers',wall:'stone',moss:true},anubis:{floor:'pavers',wall:'sandstone'},
  desert:{floor:'sand',wall:'sandstone'},industrial:{floor:'concrete',wall:'metal'},forest:{floor:'grass',wall:'stone',moss:true}
 };
 function profile(map,theme={}){let id=names[map];if(!id)id=theme.landmark==='temple'?'forest':theme.landmark==='arch'?'desert':'industrial';return{id,...profiles[id],floorColor:theme.floor||'#9e8c68',wallColor:theme.wall||'#d2ba91',dark:theme.dark||'#293033'};}
 function hash(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
 function random(seed){let n=seed>>>0||1;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
 function shade(color,delta){const n=parseInt(color.slice(1),16);return'#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v+delta))).toString(16).padStart(2,'0')).join('');}
 // Runs are inside actual solid cells. Covers (2) and open windows (3) are not
 // walls, and no render path is ever written back into collision/navigation.
 function edgeRuns(g){const out={top:[],bottom:[],left:[],right:[]},d=g.d,W=g.cols,H=g.rows,solid=(x,y)=>x<0||y<0||x>=W||y>=H||d[y*W+x]===1;
  for(const[side,dx,dy,vertical]of[['top',0,-1,false],['bottom',0,1,false],['left',-1,0,true],['right',1,0,true]]){
   const lines=vertical?W:H,length=vertical?H:W;
   for(let line=0;line<lines;line++){let start=-1;for(let i=0;i<=length;i++){const x=vertical?line:i,y=vertical?i:line,edge=i<length&&d[y*W+x]===1&&!solid(x+dx,y+dy);if(edge&&start<0)start=i;else if(!edge&&start>=0){out[side].push(vertical?[line,start,i-start]:[start,line,i-start]);start=-1;}}}
  }return out;
 }
 function mount(){
  const tiles=new Map(),MAX_TILES=64;let sprites=new WeakMap(),baking=false,gridCrates=false;
  const stats={bakes:0,tileBuilds:0,spriteBuilds:0,lastBakeMs:0,cachePixels:0};
  const old={floor:floorPat,wall:wallPat,grid:drawGridMap,drawWall,cover:drawMapCover,build:buildStatic,settings:setTab};
  const enabled=()=>ST_().mapMaterials!==0,current=()=>profile(sel.map,MAP_BRIEFINGS[sel.map]);
  function grain(q,w,h,rand,count,amount){for(let i=0;i<count;i++){q.fillStyle=rand()<.5?'rgba(0,0,0,'+amount+')':'rgba(255,255,255,'+amount+')';q.fillRect(rand()*w|0,rand()*h|0,rand()<.85?1:2,1);}}
  function path(q,points){q.beginPath();points.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.stroke();}
  function masonry(q,w,h,color,rand,moss,brick){const bh=brick?16:24,bw=brick?32:48;
   q.fillStyle=shade(color,-34);q.fillRect(0,0,w,h);
   for(let y=0,row=0;y<h;y+=bh,row++)for(let x=-(row%2)*bw/2;x<w;x+=bw){const c=shade(color,(rand()-.5)*18);q.fillStyle=c;q.fillRect(x+1,y+1,bw-2,bh-2);q.fillStyle=shade(c,12);q.fillRect(x+2,y+1,bw-4,1);q.fillRect(x+1,y+2,1,bh-4);q.fillStyle=shade(c,-18);q.fillRect(x+2,y+bh-2,bw-3,1);
    if(rand()<.28){q.strokeStyle=shade(c,-22);q.lineWidth=.7;path(q,[[x+bw*.65,y+1],[x+bw*.58,y+6],[x+bw*.69,y+9]]);}
    if(moss&&rand()<.65){q.fillStyle='#3c513c66';q.fillRect(x+1,y+bh-3,5+rand()*14,2);q.fillRect(x+1,y+bh-7,2,5);}
   }grain(q,w,h,rand,650,.1);
  }
  function makeTile(kind,color,moss=false){const key=kind+':'+color+':'+moss;if(tiles.has(key))return tiles.get(key).pattern;
   const c=document.createElement('canvas');c.width=c.height=kind==='sandstone'||kind==='stone'||kind==='brick'?96:128;const q=c.getContext('2d'),w=c.width,h=c.height,rand=random(hash(key));q.fillStyle=color;q.fillRect(0,0,w,h);
   if(['sandstone','stone','brick'].includes(kind))masonry(q,w,h,color,rand,moss,kind==='brick');
   else if(kind==='plaster'){q.fillStyle=shade(color,-4);q.fillRect(0,0,w,h);for(let i=0;i<28;i++){q.fillStyle=shade(color,(rand()-.5)*15);q.fillRect(rand()*w|0,rand()*h|0,4+rand()*18,2+rand()*9);}grain(q,w,h,rand,1300,.065);q.strokeStyle=shade(color,-22);q.lineWidth=.65;path(q,[[18,32],[26,40],[23,47],[31,55]]);path(q,[[82,94],[78,103],[83,111]]);}
   else if(kind==='metal'){for(let x=0;x<w;x+=32){q.fillStyle=shade(color,(x%64===0?5:-4));q.fillRect(x,0,32,h);q.fillStyle=shade(color,-32);q.fillRect(x,0,2,h);q.fillStyle=shade(color,20);q.fillRect(x+2,0,1,h);for(const y of [7,h-8]){q.fillStyle=shade(color,-45);q.fillRect(x+7,y,3,3);q.fillRect(x+25,y,3,3);q.fillStyle=shade(color,30);q.fillRect(x+7,y,2,1);q.fillRect(x+25,y,2,1);}}q.fillStyle=shade(color,-25);q.fillRect(0,63,w,2);grain(q,w,h,rand,1000,.07);}
   else if(kind==='wood'||kind==='planks'){const vertical=kind==='wood';for(let a=0;a<128;a+=16){q.fillStyle=shade(color,(rand()-.5)*25);q.fillRect(vertical?a:0,vertical?0:a,vertical?16:128,vertical?128:16);q.fillStyle=shade(color,-32);q.fillRect(vertical?a:0,vertical?0:a,vertical?1:128,vertical?128:1);for(let i=0;i<8;i++){q.strokeStyle=shade(color,-10-rand()*18);q.lineWidth=.5;const p=a+2+rand()*12,b=rand()*128;path(q,vertical?[[p,b],[p+1,b+10],[p,b+20]]:[[b,p],[b+14,p+1],[b+28,p]]);}for(const b of[8,119]){q.fillStyle='#302b25aa';q.fillRect(vertical?a+4:b,vertical?b:a+4,2,2);}}grain(q,w,h,rand,500,.06);}
   else if(kind==='pavers'||kind==='cobble'||kind==='tiles'){const bw=kind==='tiles'?32:kind==='cobble'?24:64,bh=kind==='tiles'?32:kind==='cobble'?16:32;q.fillStyle=shade(color,-24);q.fillRect(0,0,w,h);for(let y=0,row=0;y<h;y+=bh,row++)for(let x=kind==='tiles'?0:-(row%2)*bw/2;x<w;x+=bw){const tone=shade(color,(rand()-.5)*(kind==='tiles'?8:20));q.fillStyle=tone;if(kind==='cobble'){q.beginPath();q.roundRect(x+1,y+1,bw-2,bh-2,3);q.fill();}else q.fillRect(x+1,y+1,bw-1,bh-1);q.fillStyle=shade(tone,11);q.fillRect(x+2,y+1,bw-3,1);if(moss&&rand()<.5){q.fillStyle='#49604766';q.fillRect(x+1,y+bh-2,8+rand()*18,2);}}grain(q,w,h,rand,900,.08);}
   else if(kind==='concrete'||kind==='asphalt'){grain(q,w,h,rand,kind==='asphalt'?1900:1300,.11);q.strokeStyle=shade(color,-15);q.lineWidth=.7;path(q,[[3,88],[17,91],[26,87],[42,93],[49,105]]);if(kind==='concrete'){q.fillStyle=shade(color,-14);q.fillRect(0,0,w,1);q.fillRect(0,0,1,h);q.fillStyle=shade(color,8);q.fillRect(1,1,w,1);}else{for(let i=0;i<16;i++){q.fillStyle=shade(color,22);q.fillRect(rand()*w|0,rand()*h|0,2,1);}}}
   else{const natural=kind==='grass'||kind==='dirt';for(let i=0;i<55;i++){q.fillStyle=shade(color,(rand()-.5)*(natural?22:12));q.beginPath();q.ellipse(rand()*w,rand()*h,4+rand()*12,2+rand()*6,rand()*3,0,Math.PI*2);q.fill();}grain(q,w,h,rand,1500,natural?.1:.07);if(kind==='grass')for(let i=0;i<150;i++){q.strokeStyle=shade(color,(rand()-.5)*35);q.lineWidth=1;const x=rand()*w,y=rand()*h;path(q,[[x,y],[x-1,y-3]]);}if(kind==='sand'||kind==='snow')for(let i=0;i<6;i++){q.strokeStyle=shade(color,8);q.lineWidth=.7;const y=10+i*21;path(q,[[0,y],[34,y-3],[64,y],[96,y-2],[128,y]]);}}
   const pattern=q.createPattern(c,'repeat');if(tiles.size>=MAX_TILES){const key=tiles.keys().next().value;tiles.get(key).canvas.width=0;tiles.delete(key);}tiles.set(key,{canvas:c,pattern});stats.tileBuilds++;return pattern;
  }
  function floor(){const p=current();return makeTile(p.floor,p.floorColor,p.moss);}
  function wall(){const p=current();return makeTile(p.wall,p.wallColor,p.moss);}
  function bevel(q,x,y,w,h){const e=Math.min(3,w/5,h/5);q.fillStyle='#ffffff28';q.fillRect(x,y,w,e);q.fillRect(x,y,e,h);q.fillStyle='#00000050';q.fillRect(x,y+h-e,w,e);q.fillRect(x+w-e,y,e,h);}
  function crate(q,w){const[x,y,a,b]=w;q.fillStyle=makeTile('wood','#a9814d');q.fillRect(x,y,a,b);q.strokeStyle='#493724';q.lineWidth=3;q.strokeRect(x+2,y+2,a-4,b-4);q.strokeStyle='#d2af73';q.lineWidth=4;path(q,[[x+5,y+5],[x+a-5,y+b-5]]);path(q,[[x+a-5,y+5],[x+5,y+b-5]]);q.strokeStyle='#5c4229';q.lineWidth=1;path(q,[[x+4,y+6],[x+a-6,y+b-4]]);path(q,[[x+a-4,y+6],[x+6,y+b-4]]);q.fillStyle='#46494a';for(const dx of[3,a-9])for(const dy of[3,b-9]){q.fillRect(x+dx,y+dy,6,6);q.fillStyle='#9d9c8d';q.fillRect(x+dx+2,y+dy+2,2,2);q.fillStyle='#46494a';}bevel(q,x,y,a,b);}
  function paintWall(w){if(w.brCover){old.drawWall(w);return;}const isCrate=gridCrates||(!GR&&w[2]<100&&w[3]<100&&Math.min(w[2],w[3])>30);if(isCrate){crate(cx,w);return;}cx.fillStyle=wall();cx.fillRect(...w);bevel(cx,...w);}
  function renderWall(w){if(!enabled())return old.drawWall(w);if(baking)return paintWall(w);
   const p=current(),key=p.id+'|'+p.wallColor+'|'+w[2]+'|'+w[3]+'|'+(w.brCover||'');let entry=sprites.get(w);
   if(!entry||entry.key!==key){if(w[2]>512||w[3]>512)return paintWall(w);const c=document.createElement('canvas');c.width=Math.ceil(w[2])+16;c.height=Math.ceil(w[3])+16;const oldContext=cx;try{cx=c.getContext('2d');cx.translate(8-w[0],8-w[1]);paintWall(w);}finally{cx=oldContext;}entry={key,canvas:c};sprites.set(w,entry);stats.spriteBuilds++;}cx.drawImage(entry.canvas,w[0]-8,w[1]-8);
  }
  function runs(g,accept,visit){for(let y=0;y<g.rows;y++){let start=-1;for(let x=0;x<=g.cols;x++){const yes=x<g.cols&&accept(x,y);if(yes&&start<0)start=x;else if(!yes&&start>=0){visit(start,y,x-start);start=-1;}}}}
  function renderGrid(){if(!enabled())return old.grid();const g=GR,q=cx,s=g.cs,W=g.cols,H=g.rows,d=g.d,p=current(),get=(x,y)=>x<0||y<0||x>=W||y>=H?1:d[y*W+x];
   q.fillStyle=p.dark;q.fillRect(0,0,WW,WH);q.save();q.globalAlpha=.16;q.fillStyle=wall();q.fillRect(0,0,WW,WH);q.restore();
   const walk=new Path2D();runs(g,(x,y)=>get(x,y)!==1,(x,y,n)=>walk.rect(x*s,y*s,n*s,s));q.fillStyle=floor();q.fill(walk);
   const edges=edgeRuns(g);q.save();q.clip(walk);for(let layer=3;layer>0;layer--){q.fillStyle='rgba(0,0,0,'+(layer===1?.19:.065)+')';const size=layer*2;for(const[x,y,n]of edges.bottom)q.fillRect(x*s,(y+1)*s,n*s+size,size);for(const[x,y,n]of edges.right)q.fillRect((x+1)*s,y*s,size,n*s+size);}q.restore();
   // Two-cell caps give the wall material enough width to read at low zoom.
   const band=new Path2D();runs(g,(x,y)=>{if(get(x,y)!==1)return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<=2&&get(x+dx,y+dy)!==1)return true;return false;},(x,y,n)=>band.rect(x*s,y*s,n*s,s));q.fillStyle=wall();q.fill(band);
   const bevelSize=Math.min(3,s*.17),face=Math.min(8,s*.42);q.fillStyle='#ffffff44';for(const[x,y,n]of edges.top)q.fillRect(x*s,y*s,n*s,bevelSize);for(const[x,y,n]of edges.left)q.fillRect(x*s,y*s,bevelSize,n*s);q.fillStyle='#00000055';for(const[x,y,n]of edges.bottom)q.fillRect(x*s,(y+1)*s-face,n*s,face);for(const[x,y,n]of edges.right)q.fillRect((x+1)*s-bevelSize,y*s,bevelSize,n*s);
   gridCrates=true;try{for(const c of g.crates||[]){const x=c[0]*s,y=c[1]*s,w=s*3;q.fillStyle='#0005';q.fillRect(x+4,y+6,w,w);paintWall([x+1,y+1,w-2,w-2]);}}finally{gridCrates=false;}
   for(const cover of g.covers||[])drawMapCover(q,cover);for(const window of g.windows||[])drawMapWindow(q,window);drawMapLinks(q,g);
  }
  floorPat=function(){return enabled()?floor():old.floor();};wallPat=function(){return enabled()?wall():old.wall();};drawGridMap=renderGrid;drawWall=renderWall;
  drawMapCover=function(q,cover){old.cover(q,cover);if(!enabled()||cover.material==='vehicle')return;const p=cover.polygon,kind=cover.material==='metal'?'metal':cover.material==='stone'?'stone':'wood',color=kind==='metal'?'#79929d':kind==='stone'?'#a49a81':'#a3794c';q.save();q.beginPath();p.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();q.clip();q.globalCompositeOperation='multiply';q.globalAlpha=.3;q.fillStyle=makeTile(kind,color);const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),x=Math.min(...xs),y=Math.min(...ys);q.fillRect(x,y,Math.max(...xs)-x,Math.max(...ys)-y);q.restore();};
  buildStatic=function(g){const start=performance.now();baking=true;try{return old.build(g);}finally{baking=false;stats.bakes++;stats.lastBakeMs=performance.now()-start;stats.cachePixels=SCV?SCV.width*SCV.height:0;}};
  const t=s=>root.szLocale?.t(s)||s;
  function settings(target){if(target.querySelector('[data-map-materials-panel]'))return;const panel=document.createElement('section');panel.className='box';panel.setAttribute('data-map-materials-panel','');panel.setAttribute('data-no-translate','');panel.innerHTML='<h3>'+t('Wygląd map')+'</h3><p style="font:12px system-ui;color:#9aafbf;line-height:1.7">'+t('Materiały ścian, podłoża i skrzyń oraz delikatne cienie.')+'</p><label style="font:12px system-ui">'+t('Szczegółowość')+' <select data-map-materials onchange="SzMapMaterials.setEnabled(this.value===\'1\')"><option value="1" '+(enabled()?'selected':'')+'>'+t('Tekstury i cieniowanie')+'</option><option value="0" '+(!enabled()?'selected':'')+'>'+t('Uproszczony wygląd')+'</option></select></label>';target.append(panel);}
  setTab=function(mm){const result=old.settings(mm);settings(mm?.nodeType?mm:$('main'));return result;};
  root.SzMapMaterials.setEnabled=function(value,persist=true){ST_().mapMaterials=value?1:0;SCV=null;SCG=null;SCK='';sprites=new WeakMap();if(persist)save();for(const el of document.querySelectorAll('[data-map-materials]'))el.value=value?'1':'0';};
  root.SzMapMaterials.enabled=enabled;
  root.SzMapMaterials.stats=()=>({...stats,tileCount:tiles.size,tileBytes:[...tiles.values()].reduce((n,t)=>n+t.canvas.width*t.canvas.height*4,0)});
  document.addEventListener('sz-language',()=>{for(const panel of document.querySelectorAll('[data-map-materials-panel]')){const target=panel.parentElement;panel.remove();settings(target);}});
 }
 return{profile,hash,random,shade,edgeRuns,mount};
});
