/* Shared, deterministic Prop Hunt geometry. No account or rendering dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzPropData=api;})(globalThis,function(){
 'use strict';
 const MAX_RADIUS=22;
 const models={
  crate:{name:'Mała skrzynia',w:30,h:30,shape:'box'},barrel:{name:'Beczka',w:32,h:32,shape:'circle'},tire:{name:'Opona',w:30,h:30,shape:'circle'},
  toolcase:{name:'Skrzynka narzędziowa',w:32,h:22,shape:'box'},pallet:{name:'Paleta',w:36,h:24,shape:'box'},
  pot:{name:'Doniczka',w:30,h:30,shape:'circle'},rock:{name:'Kamień',w:36,h:26,shape:'ellipse'},bush:{name:'Krzew',w:36,h:36,shape:'circle'},
  chair:{name:'Krzesło',w:28,h:30,shape:'box'},suitcase:{name:'Walizka',w:28,h:22,shape:'box'},bin:{name:'Kosz',w:24,h:28,shape:'box'}
 };
 const pools={hs_warehouse:['crate','barrel','tire','toolcase','pallet'],hs_garden:['pot','rock','bush','crate','barrel'],hs_motel:['chair','suitcase','bin','pot','crate']};
 // Form, wall face/edge, first centre, count, spacing, rotation, empty slot.
 // The empty places belong to the same furniture rows as their neighbours.
 // They never remove scenery or put a bot in a doorway or a circulation lane.
 const rows={
  hs_warehouse:[
   ['crate','south',32,88,6,40,0,2],['barrel','south',32,408,6,40,0,3],
   ['tire','south',32,824,5,40,0,2],['pallet','south',32,1160,8,40,0,3],
   ['barrel','north',352,72,4,40,0,1],['toolcase','north',352,400,7,40,0,3],
   ['crate','north',352,816,5,40,0,2],['tire','north',352,1168,8,40,0,4],
   ['pallet','south',384,72,4,40,0,2],['barrel','south',384,400,7,40,0,3],
   ['toolcase','south',384,816,5,40,0,2],['crate','south',384,1168,8,40,0,4],
   ['crate','north',704,80,7,40,0,3],['tire','north',704,528,5,40,0,2],
   ['pallet','north',704,816,7,40,0,3],['barrel','north',704,1264,6,40,0,3],
   ['toolcase','south',736,80,7,40,0,3],['tire','south',736,816,8,40,0,3],
   ['crate','south',736,1264,6,40,0,3],['barrel','north',992,88,8,40,0,3],
   ['toolcase','north',992,464,6,40,0,2],['crate','north',992,832,7,40,0,3],
   ['pallet','north',992,1184,8,40,0,4]
  ],
  hs_garden:[
   ['pot','south',32,88,7,40,0,3],['rock','south',32,488,7,40,0,3],
   ['bush','south',32,808,7,40,0,3],['barrel','south',32,1208,7,40,0,3],
   ['crate','north',992,88,7,40,0,3],['pot','north',992,488,7,40,0,3],
   ['rock','north',992,808,7,40,0,3],['bush','north',992,1208,7,40,0,3],
   ['pot','east',416,128,4,44,0,1],['rock','west',384,128,4,44,0,2],
   ['bush','east',416,744,4,44,0,2],['pot','west',384,744,4,44,0,1],
   ['bush','west',1120,128,4,44,0,1],['pot','east',1152,128,4,44,0,2],
   ['rock','west',1120,744,4,44,0,2],['crate','east',1152,744,4,44,0,1],
   ['pot','south',240,568,4,44,0,1],['bush','south',240,856,4,44,0,2],
   ['rock','north',784,568,4,44,0,2],['pot','north',784,856,4,44,0,1],
   ['barrel','north',320,128,3,40,0,1],['crate','north',320,1184,3,40,0,1],
   ['pot','east',416,456,3,52,0,1],['bush','west',1120,456,3,52,0,1]
  ],
  hs_motel:[
   ...[72,424,808,1192].map((x,i)=>[['chair','pot','bin','crate'][i],'south',32,x,6,40,0,2]),
   ...[72,424,808,1192].map((x,i)=>[['bin','chair','crate','pot'][i],'north',992,x,6,40,Math.PI,3]),
   ...[352,736,1120,1504].map((x,i)=>[['suitcase','bin','chair','pot'][i],'west',x,i?104:148,i?4:3,44,Math.PI/2,i?2:1]),
   ...[32,384,768,1152].map((x,i)=>[['crate','suitcase','pot','chair'][i],'east',x,792,4,44,-Math.PI/2,1]),
   ...[144,512,896,1280].map(x=>['suitcase','south',208,x,3,32,0,1]),
   ...[144,512,896,1280].map(x=>['bin','north',832,x,3,32,Math.PI,1]),
   ['crate','north',416,288,2,40],['pot','north',416,400,3,40],
   ['bin','north',416,640,2,40],['chair','north',416,1000,3,40],
   ['pot','south',608,288,2,40],['suitcase','south',608,400,3,40],
   ['chair','south',608,640,2,40],['crate','south',608,1000,3,40]
  ]
 };
 const arrangements={},vacancies={};
 for(const[name,list]of Object.entries(rows)){arrangements[name]=[];vacancies[name]=[];for(const[form,face,edge,start,count,step,a=0,empty=-1]of list)for(let i=0;i<count;i++)(i===empty?vacancies[name]:arrangements[name]).push([form,face,edge,start+i*step,a]);}
 const radius=form=>{const m=models[form];return !m?12:m.shape==='box'?Math.hypot(m.w,m.h)/2:Math.max(m.w,m.h)/2;};
 function solid(g,x,y){const c=Math.floor(x/g.cs),r=Math.floor(y/g.cs);return c<0||r<0||c>=g.cols||r>=g.rows||!!g.d[r*g.cols+c];}
 function wallCollision(g,x,y,r){const x0=Math.floor((x-r)/g.cs),x1=Math.floor((x+r)/g.cs),y0=Math.floor((y-r)/g.cs),y1=Math.floor((y+r)/g.cs);for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){if(xx>=0&&yy>=0&&xx<g.cols&&yy<g.rows&&!g.d[yy*g.cols+xx])continue;const px=Math.max(xx*g.cs,Math.min(x,(xx+1)*g.cs)),py=Math.max(yy*g.cs,Math.min(y,(yy+1)*g.cs));if(Math.hypot(px-x,py-y)<r-.01)return true;}return false;}
 const dimensions=o=>models[o.form]||o;
 function bounds(o){const m=dimensions(o),c=m.shape==='circle'?1:Math.abs(Math.cos(o.a||0)),s=m.shape==='circle'?0:Math.abs(Math.sin(o.a||0)),w=(m.w*c+m.h*s)/2,h=(m.w*s+m.h*c)/2;return{left:o.x-w,right:o.x+w,top:o.y-h,bottom:o.y+h};}
 function objectCollision(o,x,y,r){const m=models[o.form];if(m.shape==='circle')return Math.hypot(x-o.x,y-o.y)<r+m.w/2-.01;const c=Math.cos(o.a||0),s=Math.sin(o.a||0),dx=(x-o.x)*c+(y-o.y)*s,dy=-(x-o.x)*s+(y-o.y)*c;return Math.hypot(Math.max(0,Math.abs(dx)-m.w/2),Math.max(0,Math.abs(dy)-m.h/2))<r-.01;}
 function collides(g,objects,x,y,r,skip){return wallCollision(g,x,y,r)||objects.some(o=>o!==skip&&objectCollision(o,x,y,r));}
 // Movement uses the locked form's footprint, so a box can sit as close to a
 // wall as its identical scenery sprite. Ellipses retain a conservative box.
 function overlaps(a,b,gap=0){const am=dimensions(a),bm=dimensions(b),dx=b.x-a.x,dy=b.y-a.y;
  if(dx*dx+dy*dy>Math.pow(Math.hypot(am.w,am.h)/2+Math.hypot(bm.w,bm.h)/2+gap,2))return false;
  if(am.shape==='circle'&&bm.shape==='circle')return Math.hypot(dx,dy)<(am.w+bm.w)/2+gap-.01;
  if(am.shape==='circle'||bm.shape==='circle'){if(am.shape==='circle')return overlaps(b,a,gap);const c=Math.cos(a.a||0),s=Math.sin(a.a||0),x=dx*c+dy*s,y=-dx*s+dy*c;return Math.hypot(Math.max(0,Math.abs(x)-am.w/2),Math.max(0,Math.abs(y)-am.h/2))<bm.w/2+gap-.01;}
  const ac=Math.cos(a.a||0),as=Math.sin(a.a||0),bc=Math.cos(b.a||0),bs=Math.sin(b.a||0);
  for(const[x,y]of[[ac,as],[-as,ac],[bc,bs],[-bs,bc]]){const reach=(Math.abs(x*ac+y*as)*am.w+Math.abs(-x*as+y*ac)*am.h+Math.abs(x*bc+y*bs)*bm.w+Math.abs(-x*bs+y*bc)*bm.h)/2;if(Math.abs(dx*x+dy*y)>=reach+gap-.01)return false;}return true;
 }
 function bodyWallCollision(g,o){const b=bounds(o);for(let y=Math.floor(b.top/g.cs);y<=Math.floor(b.bottom/g.cs);y++)for(let x=Math.floor(b.left/g.cs);x<=Math.floor(b.right/g.cs);x++)if(solid(g,(x+.5)*g.cs,(y+.5)*g.cs)&&overlaps(o,{x:(x+.5)*g.cs,y:(y+.5)*g.cs,w:g.cs,h:g.cs,shape:'box'}))return true;return false;}
 function bodyCollides(g,objects,o){return bodyWallCollision(g,o)||objects.some(q=>q!==o&&overlaps(o,q));}
 function anchored(spec,id){const[form,face,edge,along,a=0]=spec,o={id:'scenery-'+id,form,x:0,y:0,a,anchor:{face,edge,gap:2}},b=bounds(o);if(face==='north'||face==='south'){o.x=along;o.y=edge+(face==='north'?-b.bottom-2:-b.top+2);}else{o.y=along;o.x=edge+(face==='west'?-b.right-2:-b.left+2);}return o;}
 function backed(g,o){const{face,edge}=o.anchor,b=bounds(o);for(const f of[.12,.5,.88]){const x=face==='east'?edge-.5:face==='west'?edge+.5:b.left+(b.right-b.left)*f,y=face==='south'?edge-.5:face==='north'?edge+.5:b.top+(b.bottom-b.top)*f;if(!solid(g,x,y))return false;}return true;}
 function propFits(g,o,objects=[]){const b=bounds(o);for(let y=Math.floor(b.top/g.cs);y<=Math.floor((b.bottom-.001)/g.cs);y++)for(let x=Math.floor(b.left/g.cs);x<=Math.floor((b.right-.001)/g.cs);x++)if(solid(g,(x+.5)*g.cs,(y+.5)*g.cs))return false;return !objects.some(other=>{const c=bounds(other);return b.left<c.right&&b.right>c.left&&b.top<c.bottom&&b.bottom>c.top;});}
 function ray(origin,angle,o,max=500){const m=models[o.form];if(!m)return null;const a=o.a||0,c=Math.cos(a),s=Math.sin(a),vx=Math.cos(angle),vy=Math.sin(angle),ox=(origin.x-o.x)*c+(origin.y-o.y)*s,oy=-(origin.x-o.x)*s+(origin.y-o.y)*c,dx=vx*c+vy*s,dy=-vx*s+vy*c;
  if(m.shape!=='box'){const rx=m.w/2,ry=m.h/2,A=dx*dx/(rx*rx)+dy*dy/(ry*ry),B=2*(ox*dx/(rx*rx)+oy*dy/(ry*ry)),C=ox*ox/(rx*rx)+oy*oy/(ry*ry)-1,D=B*B-4*A*C;if(D<0)return null;const n=(-B-Math.sqrt(D))/(2*A),far=(-B+Math.sqrt(D))/(2*A),hit=n>=0?n:far>=0?0:null;return hit!==null&&hit<=max?hit:null;}
  let near=0,far=max;for(const[p,d,half]of[[ox,dx,m.w/2],[oy,dy,m.h/2]]){if(Math.abs(d)<1e-8){if(Math.abs(p)>half)return null;continue;}const t1=(-half-p)/d,t2=(half-p)/d;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far)return null;}return near;
 }
 function navGrid(g,objects,r=MAX_RADIUS){const d=new Uint8Array(g.cols*g.rows);for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++)if(collides(g,objects,(x+.5)*g.cs,(y+.5)*g.cs,r))d[y*g.cols+x]=1;return{...g,d,nd:d};}
 function connected(g){const first=g.d.indexOf(0);if(first<0)return false;const seen=new Uint8Array(g.d.length),queue=[first];seen[first]=1;for(let j=0;j<queue.length;j++){const i=queue[j],x=i%g.cols,y=Math.floor(i/g.cols);for(const n of[x?i-1:-1,x<g.cols-1?i+1:-1,y?i-g.cols:-1,y<g.rows-1?i+g.cols:-1])if(n>=0&&!seen[n]&&!g.d[n]){seen[n]=1;queue.push(n);}}return g.d.every((v,i)=>v||seen[i]);}
 function roundRows(g,round){const objects=[],empty=[],pool=pools[g.source]||[];let n=0;for(const[form,face,edge,start,count,step,a=0,gap=-1]of rows[g.source]||[]){const vacancy=gap<0?-1:(gap+round*(1+n%2))%count,newForm=round&&pool.length?pool[(pool.indexOf(form)+round)%pool.length]:form;for(let i=0;i<count;i++)(i===vacancy?empty:objects).push([newForm,face,edge,start+i*step,a]);n++;}return{objects,empty};}
 function layout(g,round=0){if(g.workshopProps)return g.workshopProps.map(o=>({...o}));const objects=[];
  for(const spec of (round?roundRows(g,round).objects:arrangements[g.source])||[]){const o=anchored(spec,objects.length);if(backed(g,o)&&propFits(g,o,objects))objects.push(o);}
  // One navigation build for the authored layout; incremental validation is
  // only a fallback for an edited arena that would otherwise seal a route.
  if(connected(navGrid(g,objects)))return objects;
  const safe=[];for(const o of objects)if(connected(navGrid(g,[...safe,o])))safe.push({...o,id:'scenery-'+safe.length});return safe;
 }
 function hidingPlaces(g,objects,nav=navGrid(g,objects),round=0){if(g.workshopHides)return g.workshopHides.map(o=>({...o}));const places=[];
  for(const spec of (round?roundRows(g,round).empty:vacancies[g.source])||[]){const o=anchored(spec,places.length);if(!backed(g,o)||!propFits(g,o,objects))continue;
   const sources=objects.filter(q=>q.form===o.form&&Math.hypot(q.x-o.x,q.y-o.y)<100).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));if(!sources.length)continue;
   const candidates=[];for(let y=Math.floor(o.y/g.cs)-6;y<=Math.floor(o.y/g.cs)+6;y++)for(let x=Math.floor(o.x/g.cs)-6;x<=Math.floor(o.x/g.cs)+6;x++){if(x<0||y<0||x>=g.cols||y>=g.rows||nav.d[y*g.cols+x])continue;const p={x:(x+.5)*g.cs,y:(y+.5)*g.cs};if(!collides(g,objects,p.x,p.y,MAX_RADIUS))candidates.push(p);}
   const approach=candidates.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y)).find(p=>{const steps=Math.ceil(Math.hypot(p.x-o.x,p.y-o.y)/3);for(let i=0;i<=steps;i++)if(bodyCollides(g,objects,{...o,x:o.x+(p.x-o.x)*i/steps,y:o.y+(p.y-o.y)*i/steps}))return false;return true;});
   if(approach)places.push({...o,id:'hide-'+places.length,sourceId:sources[0].id,approach});
  }return places;
 }
 // First match unchanged observations, then require two consecutive, mutually
 // closest movements. A newly revealed row of identical props is not movement.
 // Uses anonymous visible observations only: never an entity ID or a hidden map list.
 function contextSuspicion(o,seen){
  const near=seen.filter(q=>q!==o&&Math.hypot(q.x-o.x,q.y-o.y)>2&&Math.hypot(q.x-o.x,q.y-o.y)<125);
  const same=near.filter(q=>q.form===o.form);
  if(same.length)return 0;
  const counts={};for(const q of near)counts[q.form]=(counts[q.form]||0)+1;
  const majority=Math.max(0,...Object.values(counts));
  // Two or more matching neighbours make an odd item worth checking, not proof.
  return majority>=2?Math.min(.9,.4+majority*.12):0;
 }
 function trackObservations(seen,previous){const used=new Set(),tracks=seen.map(o=>{const i=previous.findIndex((q,j)=>!used.has(j)&&q.form===o.form&&Math.hypot(q.x-o.x,q.y-o.y)<1.5&&Math.abs(Math.atan2(Math.sin((q.a||0)-(o.a||0)),Math.cos((q.a||0)-(o.a||0))))<.08);if(i>=0)used.add(i);return{...o,motions:0,vx:0,vy:0,matched:i>=0};});
  for(const o of tracks){if(o.matched)continue;let index=-1,best=65;previous.forEach((q,i)=>{const d=Math.hypot(q.x-o.x,q.y-o.y);if(!used.has(i)&&q.form===o.form&&d<best){index=i;best=d;}});if(index<0)continue;const q=previous[index];if(tracks.some(other=>other!==o&&!other.matched&&other.form===o.form&&Math.hypot(other.x-q.x,other.y-q.y)<best-.01))continue;
   const vx=o.x-q.x,vy=o.y-q.y,moved=Math.hypot(vx,vy)>2,turned=Math.abs(Math.atan2(Math.sin((o.a||0)-(q.a||0)),Math.cos((o.a||0)-(q.a||0))))>.15,consistent=vx*(q.vx||0)+vy*(q.vy||0)>0||!moved&&turned;o.vx=vx;o.vy=vy;o.motions=moved||turned?consistent?(q.motions||0)+1:1:0;used.add(index);
  }return tracks;
 }
 return{models,pools,arrangements,vacancies,MAX_RADIUS,radius,solid,wallCollision,collides,bounds,objectCollision,overlaps,bodyWallCollision,bodyCollides,backed,propFits,ray,navGrid,connected,layout,hidingPlaces,trackObservations,contextSuspicion};
});
