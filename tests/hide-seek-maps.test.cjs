'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{specs,build}=require('../shared/hide-seek-maps.js');
for(const spec of specs)test(spec.name+': dedicated arena has connected hiding spots with actor clearance',()=>{
 const g=build(spec),free=new Uint8Array(g.d.length);
 for(let y=1;y<g.rows-1;y++)for(let x=1;x<g.cols-1;x++){let valid=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(g.d[(y+dy)*g.cols+x+dx])valid=false;free[y*g.cols+x]=valid?1:0;}
 const origin=free.findIndex(Boolean),queue=[origin],seen=new Set(queue);for(let n=0;n<queue.length;n++){const i=queue[n];for(const j of[i-1,i+1,i-g.cols,i+g.cols])if(free[j]&&!seen.has(j)){seen.add(j);queue.push(j);}}
 assert.ok(g.hidePoints.length>=25);assert.equal(seen.size,free.filter(Boolean).length,'every walkable room connects');
 for(const p of g.hidePoints)assert.ok(seen.has(Math.floor(p.y/g.cs)*g.cols+Math.floor(p.x/g.cs)),JSON.stringify(p));
 assert.equal(g.mode,'hns');assert.ok(g.covers.length>=8);assert.equal(g.windows.length,0);
});
