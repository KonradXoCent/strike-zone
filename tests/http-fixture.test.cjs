const {test}=require('node:test'),assert=require('node:assert/strict'),net=require('node:net'),{once}=require('node:events');
const {startFixture}=require('../scripts/test-support/supabase-fixture.cjs');
test('GUI fixture shutdown closes Chromium preconnect sockets without waiting for request headers',async()=>{
 const fixture=await startFixture(),url=new URL(fixture.base),socket=net.connect(+url.port,url.hostname);let deadline,closing;
 try{await once(socket,'connect');closing=fixture.close();await Promise.race([closing,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Fixture waited on an unused preconnect socket')),1000);})]);assert.equal(await new Promise(resolve=>socket.destroyed?resolve(true):socket.once('close',()=>resolve(true))),true);}
 finally{clearTimeout(deadline);socket.destroy();await(closing||fixture.close());}
});
