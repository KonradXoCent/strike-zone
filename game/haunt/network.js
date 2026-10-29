(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.HauntNetwork=factory(root.ZoneHaunt);})(globalThis,H=>{
 'use strict';
 class Room{
  constructor(client,user,{onRoom=()=>{},onSnapshot=()=>{},onInput=()=>{},onError=()=>{}}={}){Object.assign(this,{client,user,onRoom,onSnapshot,onInput,onError});this.room=null;this.channels=[];this.stateChannel=null;this.inputChannel=null;this.ready=new Set();this.epoch=0;this.timer=null;this.pollBusy=null;this.snapshot=null;this.input={};this.remoteInputs=new Map();this.lastTime=-1;this.channelRoom=null;this.closed=false;}
  async call(action,args={}){const {data,error}=await this.client.rpc('zone_haunt',{action,args:{protocol:H.PROTOCOL,...args,...(this.room?.id&&!args.room?{room:this.room.id}:{})}});if(error)throw Error(error.message||'HAUNT_NETWORK');return data;}
  async create(){await this.stop();this.closed=false;this.accept(await this.call('create'));this.poll();return this.room;}
  async join(code){await this.stop();this.closed=false;this.accept(await this.call('join',{code}));this.poll();return this.room;}
  async resume(room){await this.stop();this.closed=false;this.accept(room);this.poll();}
  async configure(config){this.accept(await this.call('configure',config));}
  async setReady(ready){this.accept(await this.call('ready',{ready}));}
  async start(){this.accept(await this.call('start'));}
  async finish(result){if(!this.room||this.room.hostId!==this.user.id)return;await this.call('sync',{snapshot:this.snapshot});this.accept(await this.call('finish',{guess:result.guess}));}
  accept(room){if(!room?.id)return;if(room.protocol!==H.PROTOCOL)throw Error('HAUNT_VERSION');this.room=room;if(room.phase==='running'&&this.channelRoom!==room.id)this.activate();this.onRoom(room);const snapshot=room.snapshot;if(snapshot&&H.validSnapshot(snapshot,(room.roster||room.members).map(p=>p.id))&&snapshot.time>=this.lastTime){this.lastTime=snapshot.time;this.onSnapshot(snapshot);}if(room.hostId===this.user.id)for(const [id,value]of Object.entries(room.inputs||{})){const old=this.remoteInputs.get(id);if(!old||performance.now()-old.at>1000){this.remoteInputs.set(id,{value,at:performance.now()});this.onInput(id,value);}}}
  activate(){this.channelRoom=this.room.id;const epoch=this.epoch,host=this.room.hostId===this.user.id,roster=(this.room.roster||this.room.members).map(p=>p.id),base='zh-haunt:'+this.room.id;
   const channel=(topic,event,handler)=>{const c=this.client.channel(topic,{config:{private:true,broadcast:{self:false,ack:false}}}).on('broadcast',{event},message=>{if(this.epoch!==epoch||this.closed)return;handler(message.payload);}).subscribe(status=>{if(this.epoch!==epoch)return;if(status==='SUBSCRIBED')this.ready.add(topic);else this.ready.delete(topic);});this.channels.push(c);return c;};
   this.stateChannel=channel(base+':state','state',s=>{if(host||!H.validSnapshot(s,roster)||s.time<this.lastTime)return;this.lastTime=s.time;this.onSnapshot(s);});
   if(host){for(const id of roster.filter(id=>id!==this.user.id))channel(base+':input:'+id,'input',v=>{if(!v||typeof v!=='object'||JSON.stringify(v).length>2048)return;this.remoteInputs.set(id,{value:v,at:performance.now()});this.onInput(id,v);});}
   else this.inputChannel=channel(base+':input:'+this.user.id,'input',()=>{});
  }
  setInput(input){this.input=input;if(this.inputChannel&&this.ready.has('zh-haunt:'+this.room.id+':input:'+this.user.id))this.inputChannel.send({type:'broadcast',event:'input',payload:input}).catch(()=>{});}
  setSnapshot(snapshot){this.snapshot=snapshot;if(this.stateChannel&&this.ready.has('zh-haunt:'+this.room.id+':state'))this.stateChannel.send({type:'broadcast',event:'state',payload:snapshot}).catch(()=>{});}
  inputs(){const result={};for(const [id,v]of this.remoteInputs)if(performance.now()-v.at<1800)result[id]=v.value;return result;}
  realtime(){if(!this.room||this.room.phase!=='running')return false;const base='zh-haunt:'+this.room.id;if(!this.ready.has(base+':state'))return false;if(this.room.hostId!==this.user.id)return this.ready.has(base+':input:'+this.user.id);return(this.room.roster||[]).every(p=>p.id===this.user.id||this.ready.has(base+':input:'+p.id));}
  async poll(){clearTimeout(this.timer);if(this.closed||!this.room||this.pollBusy===this.epoch)return;const epoch=this.epoch;this.pollBusy=epoch;try{const args={};if(this.room.phase==='running'){if(!this.realtime())args.input=this.input;if(this.room.hostId===this.user.id&&this.snapshot)args.snapshot=this.snapshot;}const room=await this.call('sync',args);if(this.epoch===epoch&&!this.closed)this.accept(room);}catch(e){if(this.epoch===epoch&&!this.closed)this.onError(e);}finally{if(this.pollBusy===epoch)this.pollBusy=null;if(this.epoch===epoch&&!this.closed)this.timer=setTimeout(()=>this.poll(),this.room?.phase==='running'?(this.realtime()?1600:125):1500);}}
  async leave(){const room=this.room?.id;await this.stop();if(room){const {error}=await this.client.rpc('zone_haunt',{action:'leave',args:{room}});if(error)throw Error(error.message);}this.room=null;}
  async stop(){this.closed=true;this.epoch++;clearTimeout(this.timer);this.channelRoom=null;this.room=null;this.snapshot=null;this.input={};this.lastTime=-1;this.ready.clear();this.remoteInputs.clear();const channels=this.channels.splice(0);this.stateChannel=null;this.inputChannel=null;await Promise.allSettled(channels.map(c=>this.client.removeChannel(c)));}
 }
 return{Room};
});
