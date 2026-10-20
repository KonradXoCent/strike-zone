'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),map=require('../shared/halloween-map.js'),event=require('../shared/halloween-data.js');
test('Halloween zombie cemetery has deterministic connected routes and actor clearance',()=>{
 const g=map.build(),free=new Uint8Array(g.d.length);
 for(let y=1;y<g.rows-1;y++)for(let x=1;x<g.cols-1;x++){let clear=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(g.d[(y+dy)*g.cols+x+dx])clear=false;free[y*g.cols+x]=clear?1:0;}
 const start=free.findIndex(Boolean),queue=[start],seen=new Set(queue);for(let n=0;n<queue.length;n++)for(const j of[queue[n]-1,queue[n]+1,queue[n]-g.cols,queue[n]+g.cols])if(free[j]&&!seen.has(j)){seen.add(j);queue.push(j);}
 assert.equal(seen.size,free.filter(Boolean).length,'all traversable areas connect');assert.ok(seen.size>1800);assert.deepEqual(map.build().d,g.d);assert.equal(g.mode,'zombie');assert.equal(g.covers.length,12);assert.equal(g.cols*g.cs,1280);assert.equal(g.rows*g.cs,832);
 for(const[x,y]of[[640,448],[640,352],[464,272],[816,272],[240,272],[1040,272],[240,608],[1040,608]])assert.ok(seen.has(Math.floor(y/g.cs)*g.cols+Math.floor(x/g.cs)),`passage ${x},${y}`);
});
test('The seasonal map follows the exact event deadline including all of 30 November',()=>{assert.equal(map.available(event.START-1),false);assert.equal(map.available(event.START),true);assert.equal(map.available(event.END-1),true);assert.equal(map.available(event.END),false);});
test('Seasonal reservation appends one stable slot without changing earlier arena indices',()=>{const world={};for(const key of['MAPN','GRS','MAPS','WINS','FLRS','SITES','SPW','LB','SCL','FL','WC','FLG','WCG','BGC','MAP_BRIEFINGS'])world[key]=Array.from({length:21},(_,i)=>i);assert.equal(map.install(world),21);assert.equal(map.install(world),21);assert.equal(world.MAPN.length,22);assert.equal(world.MAPN[20],20);assert.equal(world.MAPN[21],'zm_hallows_end');assert.equal(world.GRS[21].mode,'zombie');assert.deepEqual(world.SITES[21],[]);});
