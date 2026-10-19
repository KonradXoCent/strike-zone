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
 const radius=form=>{const m=models[form];return !m?12:m.shape==='box'?Math.hypot(m.w,m.h)/2:Math.max(m.w,m.h)/2;};
 function solid(g,x,y){const c=Math.floor(x/g.cs),r=Math.floor(y/g.cs);return c<0||r<0||c>=g.cols||r>=g.rows||!!g.d[r*g.cols+c];}
 function wallCollision(g,x,y,r){const x0=Math.floor((x-r)/g.cs),x1=Math.floor((x+r)/g.cs),y0=Math.floor((y-r)/g.cs),y1=Math.floor((y+r)/g.cs);for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){if(xx>=0&&yy>=0&&xx<g.cols&&yy<g.rows&&!g.d[yy*g.cols+xx])continue;const px=Math.max(xx*g.cs,Math.min(x,(xx+1)*g.cs)),py=Math.max(yy*g.cs,Math.min(y,(yy+1)*g.cs));if(Math.hypot(px-x,py-y)<r-.01)return true;}return false;}
 function collides(g,objects,x,y,r,skip){return wallCollision(g,x,y,r)||objects.some(o=>o!==skip&&Math.hypot(x-o.x,y-o.y)<r+radius(o.form));}
 function ray(origin,angle,o,max=500){const m=models[o.form];if(!m)return null;const a=o.a||0,c=Math.cos(a),s=Math.sin(a),vx=Math.cos(angle),vy=Math.sin(angle),ox=(origin.x-o.x)*c+(origin.y-o.y)*s,oy=-(origin.x-o.x)*s+(origin.y-o.y)*c,dx=vx*c+vy*s,dy=-vx*s+vy*c;
  if(m.shape!=='box'){const rx=m.w/2,ry=m.h/2,A=dx*dx/(rx*rx)+dy*dy/(ry*ry),B=2*(ox*dx/(rx*rx)+oy*dy/(ry*ry)),C=ox*ox/(rx*rx)+oy*oy/(ry*ry)-1,D=B*B-4*A*C;if(D<0)return null;const n=(-B-Math.sqrt(D))/(2*A),far=(-B+Math.sqrt(D))/(2*A),hit=n>=0?n:far>=0?0:null;return hit!==null&&hit<=max?hit:null;}
  let near=0,far=max;for(const[p,d,half]of[[ox,dx,m.w/2],[oy,dy,m.h/2]]){if(Math.abs(d)<1e-8){if(Math.abs(p)>half)return null;continue;}const t1=(-half-p)/d,t2=(half-p)/d;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far)return null;}return near;
 }
 function navGrid(g,objects,r=MAX_RADIUS){const d=new Uint8Array(g.cols*g.rows);for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++)if(collides(g,objects,(x+.5)*g.cs,(y+.5)*g.cs,r))d[y*g.cols+x]=1;return{...g,d,nd:d};}
 function connected(g){const first=g.d.indexOf(0);if(first<0)return false;const seen=new Uint8Array(g.d.length),queue=[first];seen[first]=1;for(let j=0;j<queue.length;j++){const i=queue[j],x=i%g.cols,y=Math.floor(i/g.cols);for(const n of[x?i-1:-1,x<g.cols-1?i+1:-1,y?i-g.cols:-1,y<g.rows-1?i+g.cols:-1])if(n>=0&&!seen[n]&&!g.d[n]){seen[n]=1;queue.push(n);}}return g.d.every((v,i)=>v||seen[i]);}
 function layout(g){const pool=pools[g.source]||pools.hs_warehouse,objects=[],points=g.hidePoints||[];
  for(let i=0;i<points.length;i++){if(i%2&&objects.length>=pool.length)continue;const p=points[i],form=pool[objects.length%pool.length],o={id:'scenery-'+objects.length,form,x:p.x,y:p.y,a:(objects.length%4)*Math.PI/2};if(p.x<240&&Math.abs(p.y-496)<128||p.x>1240&&Math.abs(p.y-496)<96)continue;if(collides(g,objects,o.x,o.y,radius(form)+4))continue;const next=[...objects,o];if(connected(navGrid(g,next)))objects.push(o);if(objects.length>=28)break;}
  return objects;
 }
 return{models,pools,MAX_RADIUS,radius,solid,wallCollision,collides,ray,navGrid,connected,layout};
});
