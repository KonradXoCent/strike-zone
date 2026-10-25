const{test}=require('node:test'),assert=require('node:assert/strict'),M=require('../shared/objective-maps.js');
for(const mode of['domination','heist','survival'])test(mode+' has three distinct authored arenas with connected actor-clear routes',()=>{
 const maps=M.specs.filter(s=>s.mode===mode);assert.equal(maps.length,3);assert.equal(new Set(maps.map(s=>s.theme)).size,3);const hashes=[];
 for(const s of maps){const g=M.build(s),d=g.d,nd=new Uint8Array(d.length),C=g.cols,H=g.rows;for(let y=0;y<H;y++)for(let x=0;x<C;x++)for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(xx<0||yy<0||xx>=C||yy>=H||d[yy*C+xx])nd[y*C+x]=1;
 const cell=(x,y)=>Math.floor(y/16)*C+Math.floor(x/16),start=cell(mode==='survival'?768:160,mode==='domination'?768:512),seen=new Uint8Array(d.length),q=[start];assert.equal(nd[start],0,s.name);seen[start]=1;for(let h=0;h<q.length;h++){const i=q[h];for(const j of[i-1,i+1,i-C,i+C])if(j>=0&&j<d.length&&!nd[j]&&!seen[j]){seen[j]=1;q.push(j);}}
 const goals=mode==='domination'?g.objectives.map(p=>[p.x,p.y]).concat([[2096,768]]):mode==='heist'?[[256,448],[256,512],[256,576],[1376,512]]:[[176,160],[1360,160],[176,864],[1360,864],[688,432],[848,592]];for(const[x,y]of goals)assert.equal(seen[cell(x,y)],1,s.name+' objective '+x+','+y);hashes.push(Buffer.from(d).toString('base64'));}
 assert.equal(new Set(hashes).size,3);
});

test('Domination spreads objectives behind separate sight screens on larger symmetric fields',()=>{for(const spec of M.specs.filter(s=>s.mode==='domination')){const g=M.build(spec);assert.equal(g.cols*g.cs,2304);assert.equal(g.rows*g.cs,1536);const z=g.objectives;assert.equal(z.length,3);for(let i=1;i<z.length;i++){assert.ok(Math.hypot(z[i].x-z[i-1].x,z[i].y-z[i-1].y)>=512);const x=z[i].x,mid=(z[i].y+z[i-1].y)/2;let blocked=false;for(let y=z[i-1].y;y<z[i].y;y+=8)if(g.d[Math.floor(y/16)*g.cols+Math.floor(x/16)])blocked=true;assert.ok(blocked,spec.name+' needs a sight screen between objectives');}}});
