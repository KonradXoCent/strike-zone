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
 // Form, visible wall face, wall edge, position along that edge, rotation.
 // Storage rows, pavilion edges and room furniture are authored per arena.
 const arrangements={
  hs_warehouse:[
   ['crate','south',32,96],['crate','south',32,130],['barrel','south',32,166],['pallet','east',768,128,Math.PI/2],
   ['crate','north',352,400],['barrel','north',352,438],['toolcase','north',352,480],['tire','north',352,522],
   ['crate','south',32,896],['barrel','south',32,934],['tire','south',32,974],['pallet','south',32,1392],
   ['crate','north',704,96],['barrel','north',704,134],['toolcase','north',704,176],
   ['crate','north',704,832],['barrel','north',704,870],['toolcase','north',704,912],['tire','north',704,1304],
   ['crate','south',736,96],['barrel','south',736,134],['pallet','north',992,416],['tire','north',992,460],
   ['crate','north',992,1056],['barrel','north',992,1094],['pallet','north',992,1392]
  ],
  hs_garden:[
   ['pot','south',32,104],['rock','south',32,146],['bush','south',32,192],
   ['pot','east',416,152],['bush','east',416,198],['rock','east',416,268],
   ['pot','south',240,576],['bush','south',240,620],['pot','south',240,664],
   ['pot','south',240,864],['bush','south',240,908],['rock','south',240,956],
   ['pot','west',1120,152],['bush','west',1120,198],['rock','west',1120,268],
   ['pot','north',784,576],['bush','north',784,620],['rock','north',784,668],
   ['pot','north',784,864],['bush','north',784,908],['pot','north',784,952],
   ['crate','north',992,96],['barrel','north',992,134],['crate','west',1504,880],['barrel','west',1504,838]
  ],
  hs_motel:[
   ['pot','south',32,64],['chair','south',32,304],['suitcase','north',416,112],
   ['pot','south',32,416],['chair','south',32,688],['suitcase','north',416,464],
   ['pot','south',32,800],['chair','south',32,1072],['suitcase','north',416,816],
   ['pot','south',32,1184],['chair','south',32,1456],['suitcase','north',416,1360],
   ['pot','north',992,64],['chair','north',992,304,Math.PI],['bin','south',608,288,Math.PI],
   ['pot','north',992,416],['chair','north',992,688,Math.PI],['bin','south',608,656,Math.PI],
   ['pot','north',992,800],['chair','north',992,1072,Math.PI],['bin','south',608,1040,Math.PI],
   ['pot','north',992,1184],['chair','north',992,1456,Math.PI],['bin','south',608,1424,Math.PI],
   ['crate','east',32,912],['crate','east',384,376],['crate','east',768,912],['crate','east',1152,376]
  ]
 };
 const radius=form=>{const m=models[form];return !m?12:m.shape==='box'?Math.hypot(m.w,m.h)/2:Math.max(m.w,m.h)/2;};
 function solid(g,x,y){const c=Math.floor(x/g.cs),r=Math.floor(y/g.cs);return c<0||r<0||c>=g.cols||r>=g.rows||!!g.d[r*g.cols+c];}
 function wallCollision(g,x,y,r){const x0=Math.floor((x-r)/g.cs),x1=Math.floor((x+r)/g.cs),y0=Math.floor((y-r)/g.cs),y1=Math.floor((y+r)/g.cs);for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){if(xx>=0&&yy>=0&&xx<g.cols&&yy<g.rows&&!g.d[yy*g.cols+xx])continue;const px=Math.max(xx*g.cs,Math.min(x,(xx+1)*g.cs)),py=Math.max(yy*g.cs,Math.min(y,(yy+1)*g.cs));if(Math.hypot(px-x,py-y)<r-.01)return true;}return false;}
 function bounds(o){const m=models[o.form],c=Math.abs(Math.cos(o.a||0)),s=Math.abs(Math.sin(o.a||0)),w=(m.w*c+m.h*s)/2,h=(m.w*s+m.h*c)/2;return{left:o.x-w,right:o.x+w,top:o.y-h,bottom:o.y+h};}
 function objectCollision(o,x,y,r){const m=models[o.form];if(m.shape==='circle')return Math.hypot(x-o.x,y-o.y)<r+m.w/2-.01;const c=Math.cos(o.a||0),s=Math.sin(o.a||0),dx=(x-o.x)*c+(y-o.y)*s,dy=-(x-o.x)*s+(y-o.y)*c;return Math.hypot(Math.max(0,Math.abs(dx)-m.w/2),Math.max(0,Math.abs(dy)-m.h/2))<r-.01;}
 function collides(g,objects,x,y,r,skip){return wallCollision(g,x,y,r)||objects.some(o=>o!==skip&&objectCollision(o,x,y,r));}
 function anchored(spec,id){const[form,face,edge,along,a=0]=spec,o={id:'scenery-'+id,form,x:0,y:0,a,anchor:{face,edge,gap:2}},b=bounds(o);if(face==='north'||face==='south'){o.x=along;o.y=edge+(face==='north'?-b.bottom-2:-b.top+2);}else{o.y=along;o.x=edge+(face==='west'?-b.right-2:-b.left+2);}return o;}
 function backed(g,o){const{face,edge}=o.anchor,b=bounds(o);for(const f of[.12,.5,.88]){const x=face==='east'?edge-.5:face==='west'?edge+.5:b.left+(b.right-b.left)*f,y=face==='south'?edge-.5:face==='north'?edge+.5:b.top+(b.bottom-b.top)*f;if(!solid(g,x,y))return false;}return true;}
 function propFits(g,o,objects=[]){const b=bounds(o);for(let y=Math.floor(b.top/g.cs);y<=Math.floor((b.bottom-.001)/g.cs);y++)for(let x=Math.floor(b.left/g.cs);x<=Math.floor((b.right-.001)/g.cs);x++)if(solid(g,(x+.5)*g.cs,(y+.5)*g.cs))return false;return !objects.some(other=>{const c=bounds(other);return b.left<c.right&&b.right>c.left&&b.top<c.bottom&&b.bottom>c.top;});}
 function ray(origin,angle,o,max=500){const m=models[o.form];if(!m)return null;const a=o.a||0,c=Math.cos(a),s=Math.sin(a),vx=Math.cos(angle),vy=Math.sin(angle),ox=(origin.x-o.x)*c+(origin.y-o.y)*s,oy=-(origin.x-o.x)*s+(origin.y-o.y)*c,dx=vx*c+vy*s,dy=-vx*s+vy*c;
  if(m.shape!=='box'){const rx=m.w/2,ry=m.h/2,A=dx*dx/(rx*rx)+dy*dy/(ry*ry),B=2*(ox*dx/(rx*rx)+oy*dy/(ry*ry)),C=ox*ox/(rx*rx)+oy*oy/(ry*ry)-1,D=B*B-4*A*C;if(D<0)return null;const n=(-B-Math.sqrt(D))/(2*A),far=(-B+Math.sqrt(D))/(2*A),hit=n>=0?n:far>=0?0:null;return hit!==null&&hit<=max?hit:null;}
  let near=0,far=max;for(const[p,d,half]of[[ox,dx,m.w/2],[oy,dy,m.h/2]]){if(Math.abs(d)<1e-8){if(Math.abs(p)>half)return null;continue;}const t1=(-half-p)/d,t2=(half-p)/d;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far)return null;}return near;
 }
 function navGrid(g,objects,r=MAX_RADIUS){const d=new Uint8Array(g.cols*g.rows);for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++)if(collides(g,objects,(x+.5)*g.cs,(y+.5)*g.cs,r))d[y*g.cols+x]=1;return{...g,d,nd:d};}
 function connected(g){const first=g.d.indexOf(0);if(first<0)return false;const seen=new Uint8Array(g.d.length),queue=[first];seen[first]=1;for(let j=0;j<queue.length;j++){const i=queue[j],x=i%g.cols,y=Math.floor(i/g.cols);for(const n of[x?i-1:-1,x<g.cols-1?i+1:-1,y?i-g.cols:-1,y<g.rows-1?i+g.cols:-1])if(n>=0&&!seen[n]&&!g.d[n]){seen[n]=1;queue.push(n);}}return g.d.every((v,i)=>v||seen[i]);}
 function layout(g){const objects=[];
  for(const spec of arrangements[g.source]||[]){const o=anchored(spec,objects.length);if(!backed(g,o)||!propFits(g,o,objects))continue;if(connected(navGrid(g,[...objects,o])))objects.push(o);}
  return objects;
 }
 return{models,pools,arrangements,MAX_RADIUS,radius,solid,wallCollision,collides,bounds,objectCollision,backed,propFits,ray,navGrid,connected,layout};
});
