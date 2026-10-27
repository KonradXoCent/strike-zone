'use strict';
const {EventEmitter}=require('node:events'),{spawn}=require('node:child_process'),{createChannel}=require('../../core/platform-transport.cjs');
class ManagedGame extends EventEmitter{
 constructor({packages,account,getPreferences=()=>({}),spawnProcess=spawn,createTransport=process.platform==='win32'?createChannel:null}){super();Object.assign(this,{packages,account,getPreferences,spawnProcess,createTransport});this.child=null;this.pipe=null;this.transport=null;this.gameRunning=false;this.ready=false;this.epoch=0;this.starting=false;}
 snapshot(){return{launcherRunning:!!this.child,gameRunning:this.gameRunning,ready:this.ready};}
 changed(){this.packages.running=!!this.child;this.packages.emit('state',this.packages.snapshot());this.emit('state',this.snapshot());}
 write(value){const input=this.pipe||this.child?.stdin;if(input&&!input.destroyed)input.write(JSON.stringify(value)+'\n');}
 session(){if(this.child&&this.account.gameSession())this.write({type:'session',...this.account.gameSession(),preferences:this.getPreferences()});}
 inventory(){this.write({type:'inventory'});}
 preferences(value){this.write({type:'preferences',preferences:{language:value.language,fullscreen:value.fullscreen}});}
 async start(){
  if(this.child)return this.snapshot();if(this.starting)throw Error('HUB_STARTING');this.starting=true;
  try{
   await this.packages.check();if(!this.packages.snapshot().canPlay)throw Error('PACKAGE_REQUIRED');if(!await this.account.validate())throw Error('HUB_LOGIN');
   const transport=this.createTransport?await this.createTransport():null;this.transport=transport;
   const env={...process.env,...transport?.env};for(const k of['ELECTRON_RUN_AS_NODE','ELECTRON_ENABLE_LOGGING','NODE_OPTIONS','ELECTRON_NO_ASAR'])delete env[k];env.ELECTRON_NO_ATTACH_CONSOLE='1';
   const child=this.spawnProcess(this.packages.executable(),['--zonehub-managed'],{stdio:[transport?'ignore':'pipe','pipe','pipe'],windowsHide:true,shell:false,env});this.child=child;this.ready=false;const epoch=++this.epoch;let buffer='';
   const timer=setTimeout(()=>{if(this.child===child&&!this.ready){this.emit('error',Error('HUB_START_TIMEOUT'));this.stop();}},25000);
   const receive=chunk=>{buffer+=chunk.toString();if(buffer.length>64000){this.stop();return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.startsWith('ZONEHUB:'))continue;try{const m=JSON.parse(line.slice(8));if(m.type==='ready'&&m.userId===this.account.snapshot().user?.id){this.ready=true;clearTimeout(timer);}else if(m.type==='game')this.gameRunning=m.running===true;else if(m.type==='logout-request')this.emit('logout');this.changed();}catch{}}};
   child.stdin?.on('error',()=>{});child.stderr.on('data',()=>{});child.stdout.on('data',transport?()=>{}:receive);
   const finish=()=>{clearTimeout(timer);if(this.epoch!==epoch)return;transport?.close();this.pipe=null;this.transport=null;this.child=null;this.ready=false;this.gameRunning=false;this.changed();};
   child.once('error',error=>{finish();this.emit('error',error);});child.once('exit',finish);
   if(transport)transport.connection.then(socket=>{if(this.child!==child){socket.destroy();return;}this.pipe=socket;socket.on('error',()=>{});socket.on('data',receive);socket.once('close',()=>{if(this.child===child)this.stop();});socket.resume();this.session();}).catch(error=>{if(this.child===child){this.emit('error',error);this.stop();}});
   else this.session();this.changed();return this.snapshot();
  }catch(error){if(!this.child){this.transport?.close();this.transport=null;}throw error;}finally{this.starting=false;}
 }
 async stop(){const child=this.child;if(!child)return;this.write({type:'logout'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},7000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
}
module.exports={ManagedGame};
