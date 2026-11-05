/* Rooms are allocated by authenticated RPC, with an unguessable per-room Realtime topic. */
(function(root){'use strict';
 function create({client,room,userId,onPacket,onStatus}){const channel=client.channel('zfu-'+room.topic,{config:{broadcast:{self:false,ack:true},presence:{key:userId}}});let seq=0,last=[0,0],closed=false,status='connecting',lastSeen=Date.now();const side=userId===room.host_id?0:1;
 channel.on('broadcast',{event:'ultimate'},({payload:p})=>{if(closed||!p||p.sender!==(side===0?room.guest_id:room.host_id)||!['hello','ready','start','input','sub','snapshot','leave','ping'].includes(p.kind)||!Number.isSafeInteger(p.seq)||p.seq<=last[1]||JSON.stringify(p).length>95000)return;last[1]=p.seq;lastSeen=Date.now();if((side===0&&['snapshot','start'].includes(p.kind))||(side===1&&['input','sub'].includes(p.kind)))return;onPacket(p.kind,p.body);});
 channel.subscribe(async value=>{status=value;onStatus?.(value);if(value==='SUBSCRIBED'){await channel.track({user_id:userId});send('hello',{});}});
 function send(kind,body){if(closed||status!=='SUBSCRIBED')return;return channel.send({type:'broadcast',event:'ultimate',payload:{sender:userId,kind,seq:++seq,body}});}
 const ping=setInterval(()=>send('ping',{}),2000);
 return{side,send,wake(){lastSeen=Date.now();send('ping',{});send('hello',{});},updateRoom(value){if(value.guest_id!==room.guest_id)last[1]=0;room=value;lastSeen=Date.now();},get connected(){return status==='SUBSCRIBED';},get stale(){return Date.now()-lastSeen>15000;},async close(notify=true){if(closed)return;if(notify)await send('leave',{});closed=true;clearInterval(ping);await client.removeChannel(channel);}};
 }
 root.ZoneUltimateNetwork={create};
})(globalThis);
