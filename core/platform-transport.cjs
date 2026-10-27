'use strict';
const net=require('node:net'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
// Authenticate a private OS pipe before sending any account tokens. Windows
// GUI processes cannot reliably inherit stdin. No TCP ports or token files.
async function createChannel(){
 const id=crypto.randomBytes(16).toString('hex'),proof=crypto.randomBytes(32).toString('hex');
 const directory=process.platform==='win32'?null:fs.mkdtempSync(path.join(os.tmpdir(),'zh-ipc-'));
 const address=directory?path.join(directory,'channel.sock'):'\\\\.\\pipe\\zonehub-'+id;
 let resolve,reject,accepted=false,closed=false,timer;const sockets=new Set();
 const connection=new Promise((yes,no)=>{resolve=yes;reject=no;});connection.catch(()=>{});
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('error',()=>{});socket.once('close',()=>sockets.delete(socket));
  if(accepted||sockets.size>8){socket.destroy();return;}let pending='';socket.setTimeout(2500,()=>socket.destroy());
  const receive=chunk=>{
   pending+=chunk.toString();if(pending.length>1024){socket.destroy();return;}const at=pending.indexOf('\n');if(at<0)return;
   let value;try{value=JSON.parse(pending.slice(0,at));}catch{socket.destroy();return;}if(!value||typeof value!=='object'){socket.destroy();return;}
   const key=typeof value.proof==='string'?Buffer.from(value.proof):Buffer.alloc(0),expected=Buffer.from(proof);
   if(accepted||value.type!=='hello'||key.length!==expected.length||!crypto.timingSafeEqual(key,expected)){socket.destroy();return;}
   accepted=true;clearTimeout(timer);socket.setTimeout(0);socket.pause();socket.removeListener('data',receive);
   const rest=pending.slice(at+1);if(rest)socket.unshift(Buffer.from(rest));server.close();resolve(socket);
  };socket.on('data',receive);
 });
 const close=()=>{if(closed)return;closed=true;clearTimeout(timer);reject(Error('HUB_PIPE_CLOSED'));for(const socket of sockets)socket.destroy();try{server.close();}catch{}if(directory)fs.rmSync(directory,{recursive:true,force:true});};
 server.on('error',error=>{reject(error);close();});
 try{await new Promise((yes,no)=>{server.once('error',no);server.listen(address,()=>{server.removeListener('error',no);yes();});});if(directory)fs.chmodSync(address,0o600);}catch(error){close();throw error;}
 timer=setTimeout(()=>{reject(Error('HUB_PIPE_TIMEOUT'));close();},12000);timer.unref();
 return{env:{ZONEHUB_PIPE:address,ZONEHUB_PROOF:proof},connection,close};
}
function connectChannel(env=process.env){
 const address=env.ZONEHUB_PIPE,proof=env.ZONEHUB_PROOF;if(!address&&!proof)return null;
 if(typeof address!=='string'||address.length>250||typeof proof!=='string'||!/^[a-f0-9]{64}$/.test(proof))throw Error('HUB_HANDOFF');
 if(process.platform==='win32'&&!/^\\\\\.\\pipe\\zonehub-[a-f0-9]{32}$/.test(address))throw Error('HUB_HANDOFF');
 delete env.ZONEHUB_PIPE;delete env.ZONEHUB_PROOF;
 const socket=net.createConnection(address);socket.on('error',()=>{});socket.once('connect',()=>socket.write(JSON.stringify({type:'hello',proof})+'\n'));return socket;
}
module.exports={createChannel,connectChannel};
