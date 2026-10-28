'use strict';
// Real Phoenix envelopes with permissions evaluated by the production SQL helper.
const{WebSocketServer}=require('ws');
async function startHauntBroker(db){const server=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise(r=>server.once('listening',r));const peers=new Map(),stats={privateJoins:0,denied:0,states:0,inputs:0};
 const send=(ws,m)=>{if(ws.readyState===1)ws.send(JSON.stringify(m));};
 server.on('connection',ws=>{const channels=new Map();peers.set(ws,channels);ws.on('message',async raw=>{try{const m=JSON.parse(raw),reply=(status='ok',response={})=>send(ws,{topic:m.topic,event:'phx_reply',payload:{status,response},ref:m.ref});
  if(m.event==='phx_join'){let uid;try{uid=JSON.parse(Buffer.from(m.payload.access_token.split('.')[1],'base64url')).sub;}catch{}const topic=m.topic.replace(/^realtime:/,'');if(!uid||m.payload.config?.private!==true){stats.denied++;reply('error',{reason:'Private authenticated channels required'});return;}
   const read=(await db.as(uid,'select haunt_private.channel_allowed($1,false) ok',[topic])).rows[0].ok,write=(await db.as(uid,'select haunt_private.channel_allowed($1,true) ok',[topic])).rows[0].ok;if(!read&&!write){stats.denied++;reply('error',{reason:'Forbidden channel'});return;}channels.set(m.topic,{uid,read,write});stats.privateJoins++;reply();
  }else if(m.event==='broadcast'){const own=channels.get(m.topic);if(!own?.write){stats.denied++;reply('error',{reason:'Forbidden sender'});return;}if(m.payload.event==='state')stats.states++;else stats.inputs++;for(const [peer,rooms]of peers)if(peer!==ws&&rooms.get(m.topic)?.read)send(peer,{topic:m.topic,event:'broadcast',payload:m.payload,ref:null});reply();
  }else if(m.event==='phx_leave'){channels.delete(m.topic);reply();}else reply();
 }catch(error){console.error('Haunt broker:',error.message);}});ws.on('close',()=>peers.delete(ws));});
 return{endpoint:'ws://127.0.0.1:'+server.address().port+'/websocket',stats,close:async()=>{for(const ws of peers.keys())ws.terminate();await new Promise(r=>server.close(r));}};
}
module.exports={startHauntBroker};
