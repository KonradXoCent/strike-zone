'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../shared/prop-hunt-data.js'),maps=require('../shared/hide-seek-maps.js');
test('Prop forms have bounded movement geometry and finite oriented shot intersections',()=>{
 for(const[form,m]of Object.entries(D.models)){assert.ok(D.radius(form)<=D.MAX_RADIUS);assert.ok(D.radius(form)>=12);for(const a of[0,Math.PI/4,Math.PI/2]){const o={form,x:100,y:100,a};assert.ok(D.ray({x:0,y:100},0,o)>75);assert.equal(D.ray({x:0,y:0},0,o),null);assert.equal(D.ray({x:0,y:100},0,o,50),null);}}
 const o={form:'pallet',x:100,y:100,a:Math.PI/2};assert.equal(D.ray({x:0,y:100},0,o),88);assert.equal(D.ray({x:0,y:117},0,o),88);assert.equal(D.ray({x:0,y:120},0,o),null);
});
test('Scenery collision follows its oriented sides without an invisible circular gap',()=>{const o={form:'toolcase',x:100,y:100,a:Math.PI/2};assert.equal(D.objectCollision(o,123,100,12),false);assert.equal(D.objectCollision(o,122,100,12),true);});
test('Locked disguises fit beside walls and oriented props without clipping',()=>{
 const g={cs:16,cols:16,rows:16,d:new Uint8Array(256)};for(let i=0;i<16;i++)g.d[i*16]=1;
 const box={form:'pallet',x:36,y:80,a:0};assert.equal(D.wallCollision(g,box.x,box.y,D.radius(box.form)),true);assert.equal(D.bodyWallCollision(g,box),false);assert.equal(D.bodyWallCollision(g,{...box,x:33}),true);assert.equal(D.bodyWallCollision(g,{...box,a:Math.PI/2}),false);
 const tool={form:'toolcase',x:100,y:100,a:Math.PI/2};assert.equal(D.overlaps(tool,{form:'crate',x:127,y:100,a:0}),false);assert.equal(D.overlaps(tool,{form:'crate',x:125,y:100,a:0}),true);assert.equal(D.overlaps({form:'tire',x:100,y:100,a:0},{form:'tire',x:130,y:100,a:0}),false);
});
test('Anonymous motion tracking ignores newly visible scenery and confirms real consecutive movement',()=>{
 const prop=(x,y=80)=>({form:'crate',x,y,a:0});let tracks=D.trackObservations([prop(80),prop(120),prop(160)],[]);
 tracks=D.trackObservations([prop(120),prop(160),prop(200)],tracks);assert.ok(tracks.every(o=>o.motions<2));
 tracks=D.trackObservations([prop(160),prop(200),prop(240)],tracks);assert.ok(tracks.every(o=>o.motions<2));
 tracks=D.trackObservations([prop(300)],[]);tracks=D.trackObservations([prop(320)],tracks);assert.equal(tracks[0].motions,1);tracks=D.trackObservations([prop(340)],tracks);assert.equal(tracks[0].motions,2);
 tracks=D.trackObservations([prop(340)],tracks);assert.equal(tracks[0].motions,0);
});
for(const spec of maps.specs)test(spec.name+' Prop Hunt scenery is deterministic, themed and leaves every route connected',()=>{
 const grid=maps.build(spec),before=Buffer.from(grid.d),objects=D.layout(grid);assert.deepEqual(D.layout(grid),objects);assert.deepEqual(Buffer.from(grid.d),before);assert.equal(objects.length,D.arrangements[spec.name].length);assert.equal(new Set(objects.map(o=>o.form)).size,5);assert.equal(D.connected(D.navGrid(grid,objects)),true);
 assert.ok(objects.length>=90);const nav=D.navGrid(grid,objects),slots=D.hidingPlaces(grid,objects,nav);assert.equal(slots.length,D.vacancies[spec.name].length);assert.ok(slots.length>=20);assert.equal(D.connected(D.navGrid(grid,[...objects,...slots])),true,'All hiding places can be occupied without sealing circulation lanes');
 for(const o of [...objects,...slots]){assert.ok(D.pools[spec.name].includes(o.form));assert.equal(D.propFits(grid,o,objects.filter(q=>q!==o)),true);assert.equal(D.backed(grid,o),true);const b=D.bounds(o),gap=o.anchor.face==='north'?o.anchor.edge-b.bottom:o.anchor.face==='south'?b.top-o.anchor.edge:o.anchor.face==='west'?o.anchor.edge-b.right:b.left-o.anchor.edge;assert.ok(Math.abs(gap-2)<.001);if(objects.includes(o))assert.equal(D.collides(grid,objects,o.x,o.y,12),true);}
 for(const o of slots){assert.equal(D.bodyCollides(grid,objects,o),false);const source=objects.find(q=>q.id===o.sourceId);assert.equal(source.form,o.form);assert.ok(Math.hypot(o.x-source.x,o.y-source.y)<100);assert.equal(nav.d[Math.floor(o.approach.y/nav.cs)*nav.cols+Math.floor(o.approach.x/nav.cs)],0);for(let f=0;f<=1;f+=.05)assert.equal(D.bodyCollides(grid,objects,{...o,x:o.x+(o.approach.x-o.x)*f,y:o.y+(o.approach.y-o.y)*f}),false);}
});
