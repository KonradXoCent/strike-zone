'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),net=require('node:net'),{once}=require('node:events');
const {createChannel,connectChannel}=require('../core/platform-transport.cjs'),{PlatformBridge}=require('../core/platform-bridge.cjs');
test('Windows named pipe rejects unauthenticated peers and carries tokens only after its one-time proof',{skip:process.platform!=='win32'},async()=>{
 const channel=await createChannel();let client;
 try{
  for(const payload of ['null\n',JSON.stringify({type:'hello',proof:'0'.repeat(64)})+'\n','x'.repeat(2048)+'\n']){
   const wrong=net.createConnection(channel.env.ZONEHUB_PIPE);wrong.on('error',()=>{});await once(wrong,'connect');const closed=new Promise(resolve=>wrong.once('close',resolve));wrong.write(payload);await closed;
  }
  const env={...channel.env};client=connectChannel(env);assert(!env.ZONEHUB_PIPE&&!env.ZONEHUB_PROOF);const bridge=new PlatformBridge(client,client),first=bridge.first(),server=await channel.connection;
  server.write(JSON.stringify({type:'session',access_token:'PRIVATE_ACCESS',refresh_token:'PRIVATE_REFRESH'})+'\n');assert.equal((await first).access_token,'PRIVATE_ACCESS');
  assert(!JSON.stringify(channel.env).includes('PRIVATE_'));const received=once(server,'data');server.resume();bridge.send('ready',{userId:'owner'});const message=(await received)[0].toString();assert(message.includes('ZONEHUB:'));assert(!message.includes('PRIVATE_'));
 }finally{client?.destroy();channel.close();}
});
