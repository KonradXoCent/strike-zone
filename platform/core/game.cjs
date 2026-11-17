'use strict';
const {EventEmitter}=require('node:events'),{spawn,spawnSync}=require('node:child_process'),{createChannel}=require('../../core/platform-transport.cjs'),path=require('node:path');
class ManagedGame extends EventEmitter{
 constructor({packages,account,getPreferences=()=>({}),spawnProcess=spawn,spawnSyncProcess=spawnSync,createTransport=process.platform==='win32'?createChannel:null,platform=process.platform,wineCommand=process.env.ZONEHUB_WINE||'wine',flatpakCommand=process.env.ZONEHUB_FLATPAK||'flatpak',flatpakAppId='org.winehq.Wine'}){super();Object.assign(this,{packages,account,getPreferences,spawnProcess,spawnSyncProcess,createTransport,platform,wineCommand,flatpakCommand,flatpakAppId});this.child=null;this.pipe=null;this.transport=null;this.gameRunning=false;this.ready=false;this.epoch=0;this.starting=false;}
 snapshot(){return{launcherRunning:!!this.child,gameRunning:this.gameRunning,ready:this.ready};}
 changed(){this.packages.running=!!this.child;this.packages.emit('state',this.packages.snapshot());this.emit('state',this.snapshot());}
 write(value){const input=this.pipe||this.child?.stdin;if(input&&!input.destroyed)input.write(JSON.stringify(value)+'\n');}
 session(){if(this.child&&this.account.gameSession())this.write({type:'session',...this.account.gameSession(),preferences:this.getPreferences()});}
 inventory(){this.write({type:'inventory'});}
 preferences(value){this.write({type:'preferences',preferences:{language:value.language,fullscreen:value.fullscreen}});}
 probe(command,args,timeout=8000){try{const result=this.spawnSyncProcess(command,args,{encoding:'utf8',timeout,windowsHide:true,stdio:['ignore','pipe','ignore']});return !result?.error&&result?.status===0;}catch{return false;}}
 wineLaunch(executable){
  if(this.probe(this.wineCommand,['--version']))return{command:this.wineCommand,args:[executable,'--zonehub-managed'],flatpak:false};
  if(this.probe(this.flatpakCommand,['run','--command=wine',this.flatpakAppId,'--version'],15000)){
   const folder=path.dirname(executable),debug=process.env.WINEDEBUG||'-all';
   return{command:this.flatpakCommand,args:['run',`--filesystem=${folder}:ro`,`--env=WINEDEBUG=${debug}`,'--command=wine',this.flatpakAppId,executable,'--zonehub-managed'],flatpak:true};
  }
  return{command:this.wineCommand,args:[executable,'--zonehub-managed'],flatpak:false};
 }
 async start(){
  if(this.child)return this.snapshot();if(this.starting)throw Error('HUB_STARTING');this.starting=true;
  try{
   await this.packages.check();if(!this.packages.snapshot().canPlay)throw Error('PACKAGE_REQUIRED');if(!await this.account.validate())throw Error('HUB_LOGIN');
   const transport=this.createTransport?await this.createTransport():null;this.transport=transport;
   const env={...process.env,...transport?.env};for(const k of['ELECTRON_RUN_AS_NODE','ELECTRON_ENABLE_LOGGING','NODE_OPTIONS','ELECTRON_NO_ASAR'])delete env[k];env.ELECTRON_NO_ATTACH_CONSOLE='1';
   const executable=this.packages.executable(),useWine=this.platform==='linux'&&/\.exe$/i.test(executable),launch=useWine?this.wineLaunch(executable):{command:executable,args:['--zonehub-managed'],flatpak:false},command=launch.command,args=launch.args;if(useWine){env.WINEDEBUG=process.env.WINEDEBUG||'-all';env.ZONEHUB_BRIDGE_USE_STDERR='1';}const child=this.spawnProcess(command,args,{stdio:[transport?'ignore':'pipe','pipe','pipe'],windowsHide:false,shell:false,env});this.child=child;this.ready=false;const epoch=++this.epoch;
   const timer=setTimeout(()=>{if(this.child===child&&!this.ready){this.emit('error',Error('HUB_START_TIMEOUT'));this.stop();}},25000);
   const makeReceiver=()=>{let buffer='';return chunk=>{buffer+=chunk.toString();if(buffer.length>64000){buffer='';return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.startsWith('ZONEHUB:'))continue;try{const m=JSON.parse(line.slice(8));if(m.type==='ready'&&m.userId===this.account.snapshot().user?.id){this.ready=true;clearTimeout(timer);}else if(m.type==='failed'){this.emit('error',Error('HUB_WINDOW'));this.stop();}else if(m.type==='game')this.gameRunning=m.running===true;else if(m.type==='logout-request')this.emit('logout');this.changed();}catch{}}};},receiveStdout=makeReceiver(),receiveStderr=makeReceiver();
   child.stdin?.on('error',()=>{});child.stderr.on('data',useWine&&!transport?receiveStderr:()=>{});child.stdout.on('data',transport?()=>{}:receiveStdout);
   const finish=()=>{clearTimeout(timer);if(this.epoch!==epoch)return;transport?.close();this.pipe=null;this.transport=null;this.child=null;this.ready=false;this.gameRunning=false;this.changed();};
   child.once('error',error=>{finish();if(useWine&&error.code==='ENOENT')this.emit('error',Object.assign(Error('HUB_WINE_MISSING'),{code:'HUB_WINE_MISSING'}));else this.emit('error',error);});child.once('exit',finish);
   if(transport)transport.connection.then(socket=>{if(this.child!==child){socket.destroy();return;}this.pipe=socket;socket.on('error',()=>{});socket.on('data',receive);socket.once('close',()=>{if(this.child===child)this.stop();});socket.resume();this.session();}).catch(error=>{if(this.child===child){this.emit('error',error);this.stop();}});
   else this.session();this.changed();return this.snapshot();
  }catch(error){if(!this.child){this.transport?.close();this.transport=null;}throw error;}finally{this.starting=false;}
 }
 async stop(){const child=this.child;if(!child)return;this.write({type:'logout'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},7000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
}
module.exports={ManagedGame};
