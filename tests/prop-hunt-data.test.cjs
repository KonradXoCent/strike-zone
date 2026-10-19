'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../shared/prop-hunt-data.js'),maps=require('../shared/hide-seek-maps.js');
test('Prop forms have bounded movement geometry and finite oriented shot intersections',()=>{
 for(const[form,m]of Object.entries(D.models)){assert.ok(D.radius(form)<=D.MAX_RADIUS);assert.ok(D.radius(form)>=12);for(const a of[0,Math.PI/4,Math.PI/2]){const o={form,x:100,y:100,a};assert.ok(D.ray({x:0,y:100},0,o)>75);assert.equal(D.ray({x:0,y:0},0,o),null);assert.equal(D.ray({x:0,y:100},0,o,50),null);}}
 const o={form:'pallet',x:100,y:100,a:Math.PI/2};assert.equal(D.ray({x:0,y:100},0,o),88);assert.equal(D.ray({x:0,y:117},0,o),88);assert.equal(D.ray({x:0,y:120},0,o),null);
});
for(const spec of maps.specs)test(spec.name+' Prop Hunt scenery is deterministic, themed and leaves every route connected',()=>{
 const grid=maps.build(spec),before=Buffer.from(grid.d),objects=D.layout(grid);assert.deepEqual(D.layout(grid),objects);assert.deepEqual(Buffer.from(grid.d),before);assert.ok(objects.length>=10);assert.equal(new Set(objects.map(o=>o.form)).size,5);assert.equal(D.connected(D.navGrid(grid,objects)),true);
 for(const o of objects){assert.ok(D.pools[spec.name].includes(o.form));assert.equal(D.collides(grid,objects,o.x,o.y,D.radius(o.form),o),false);assert.equal(D.collides(grid,objects,o.x,o.y,12),true);}
});
