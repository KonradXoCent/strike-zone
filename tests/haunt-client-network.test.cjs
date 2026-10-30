'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Room}=require('../game/haunt/network.js'),H=require('../game/haunt/engine.js');
test('late room polls cannot reverse a start, completion or transfer back to the garage',async()=>{
 const user={id:'a'},room={id:'first',protocol:H.PROTOCOL,hostId:'a',phase:'lobby',members:[user],roster:[user]},seen=[];
 let resolve;
 const connection=new Room({rpc:()=>new Promise(done=>{resolve=done;})},user,{onRoom:r=>seen.push(r.id+':'+r.phase)});
 connection.activate=async()=>{};
 try{
  connection.accept(room);connection.accept({...room,phase:'running'});connection.accept(room);assert.equal(connection.room.phase,'running');
  connection.accept({...room,phase:'complete'});connection.accept({...room,phase:'running'});assert.equal(connection.room.phase,'complete');
  const pending=connection.poll();connection.accept({...room,id:'second'});resolve({data:{...room,phase:'complete'}});await pending;
  assert.equal(connection.room.id,'second');assert.deepEqual(seen,['first:lobby','first:running','first:complete','second:lobby']);
 }finally{await connection.stop();}
});
