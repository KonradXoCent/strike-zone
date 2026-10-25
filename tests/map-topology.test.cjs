const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'maps/topology.json'),'utf8')),html=fs.readFileSync(path.join(root,'game-source/index.html'),'utf8'),maps=JSON.parse(html.match(/const REBUILT_MAPS=(\[.*?\]);/)[1]);
function grid(m){const b=Buffer.from(m.bits,'base64'),n=m.cols*m.rows,d=Uint8Array.from({length:n},(_,i)=>(b[i>>3]>>(i&7))&1),nd=new Uint8Array(n);for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++)for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(xx<0||yy<0||xx>=m.cols||yy>=m.rows||d[yy*m.cols+xx])nd[y*m.cols+x]=1;return{d,nd};}
function route(m,a,b,bounds=[0,0,1024,1024],useLinks=true){const {nd}=grid(m),C=m.cols,R=m.rows,s=1024/C,ok=(x,y)=>x>=0&&y>=0&&x<C&&y<R&&!nd[y*C+x]&&(x+.5)*s>=bounds[0]&&(x+.5)*s<=bounds[0]+bounds[2]&&(y+.5)*s>=bounds[1]&&(y+.5)*s<=bounds[1]+bounds[3];const near=p=>{const x=p[0]/s|0,y=p[1]/s|0;for(let r=0;r<=8;r++)for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(ok(xx,yy))return yy*C+xx;return-1;},start=near(a),end=near(b);if(start<0||end<0)return false;const edges=new Map();for(const l of (useLinks?m.links||[]:[])){const aa=near(l.a.map(v=>v/2400*1024)),bb=near(l.b.map(v=>v/2400*1024));if(aa>=0&&bb>=0){edges.set(aa,[...(edges.get(aa)||[]),bb]);edges.set(bb,[...(edges.get(bb)||[]),aa]);}}const seen=new Uint8Array(C*R),q=[start];seen[start]=1;for(let h=0;h<q.length;h++){const i=q[h];if(i===end)return true;const x=i%C,y=i/C|0;for(const [xx,yy]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1],...(edges.get(i)||[]).map(j=>[j%C,j/C|0])]){const j=yy*C+xx;if(ok(xx,yy)&&!seen[j]){seen[j]=1;q.push(j);}}}return false;}
for(const m of maps)test(m.name+': both spawns reach both sites with actor clearance',()=>{const p=r=>[(r[0]+r[2]/2)/2400*1024,(r[1]+r[3]/2)/2400*1024];for(const spawn of m.spawns)for(const site of m.sites)assert.ok(route(m,p(spawn),p(site)),JSON.stringify({id:m.id,spawn,site}));assert.ok(m.covers.length>=6);});
for(const edit of config.maps)for(const check of edit.checks||[])test(edit.name+': '+check.name,()=>{const m=maps.find(m=>m.id===edit.id);if(check.blocked){const {d}=grid(m),[x,y]=check.blocked;assert.equal(d[(y/1024*m.rows|0)*m.cols+(x/1024*m.cols|0)],1);}else assert.ok(route(m,check.a,check.b,check.bounds),'Passage must be local, not a detour through the entire map');});
test('B apartments and short have a solid separating wall',()=>{const m=maps.find(m=>m.id===2),{d}=grid(m);for(const x of [286,318,350,382,410])assert.equal(d[(247/1024*m.rows|0)*m.cols+(x/1024*m.cols|0)],1);});

test('Nuke lower B is reached by stairs, not an artificial corridor across the upper layout',()=>{const m=maps.find(m=>m.id===5),p=r=>[(r[0]+r[2]/2)/2400*1024,(r[1]+r[3]/2)/2400*1024];assert.equal(m.links.length,3);for(const spawn of m.spawns){assert.equal(route(m,p(spawn),p(m.sites[1])),true);assert.equal(route(m,p(spawn),p(m.sites[1]),[0,0,1024,1024],false),false);}});
test('Nuke stair endpoints have actor clearance on both levels',()=>{const m=maps.find(m=>m.id===5),{nd}=grid(m);for(const l of m.links)for(const p of[l.a,l.b]){const i=Math.floor(p[1]/m.cs)*m.cols+Math.floor(p[0]/m.cs);assert.equal(nd[i],0,l.name+': '+p);}});

test('Ancient T-to-mid corner retains clearance along the whole turn, not just connectivity',()=>{
 const m=maps.find(m=>m.id===1),{d}=grid(m),s=1024/m.cols;
 const lane=[[355,635],[355,608],[380,581],[420,581]],radius=16; // 37.5 world units: more than an actor radius.
 for(let k=1;k<lane.length;k++){const a=lane[k-1],b=lane[k],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=steps;i++){
  const x=a[0]+(b[0]-a[0])*i/steps,y=a[1]+(b[1]-a[1])*i/steps;
  for(let yy=Math.floor((y-radius)/s);yy<=Math.floor((y+radius)/s);yy++)for(let xx=Math.floor((x-radius)/s);xx<=Math.floor((x+radius)/s);xx++)if(d[yy*m.cols+xx]){
   const px=Math.max(xx*s,Math.min(x,(xx+1)*s)),py=Math.max(yy*s,Math.min(y,(yy+1)*s));assert.ok(Math.hypot(px-x,py-y)>=radius,'Corner clips the movement envelope at '+x+','+y);
  }
 }}
});
