const {test}=require('node:test'),assert=require('node:assert/strict');
const {profile,edgeRuns,hash,random,shade}=require('../shared/map-materials.js');
test('materials match all 14 built-in map themes and all workshop themes',()=>{
 for(let map=0;map<14;map++){const p=profile(map,{floor:'#123456',wall:'#abcdef'});assert.ok(p.floor&&p.wall);assert.equal(p.floorColor,'#123456');assert.equal(p.wallColor,'#abcdef');}
 assert.equal(profile(2).wall,'plaster');assert.equal(profile(5).wall,'metal');assert.equal(profile(1).moss,true);
 for(const[landmark,id]of[['temple','forest'],['arch','desert'],['reactor','industrial']])assert.equal(profile(20,{landmark}).id,id);
});
test('wall edge runs merge faces without treating covers or windows as solid walls',()=>{
 const g={cols:5,rows:4,d:Uint8Array.from([1,1,1,1,1,1,0,0,3,1,1,0,2,0,1,1,1,1,1,1])};
 const before=Array.from(g.d),e=edgeRuns(g);
 assert.deepEqual(e.bottom,[[1,0,3]]);assert.deepEqual(e.top,[[1,3,3]]);
 assert.deepEqual(e.right,[[0,1,2]]);assert.deepEqual(e.left,[[4,1,2]]);
 assert.deepEqual(Array.from(g.d),before);
});
test('procedural detail is deterministic and independent of gameplay randomness',()=>{
 const original=Math.random;Math.random=()=>{throw Error('Shared gameplay RNG consumed');};
 try{const a=random(hash('stone:#abccdd')),b=random(hash('stone:#abccdd'));assert.deepEqual(Array.from({length:20},a),Array.from({length:20},b));assert.notEqual(hash('stone'),hash('sand'));assert.equal(shade('#000010',-50),'#000000');assert.equal(shade('#f0ffff',100),'#ffffff');}finally{Math.random=original;}
});
