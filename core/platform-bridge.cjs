'use strict';
// The session travels only through inherited anonymous pipes. No token-bearing
// command line, environment variable, deep link, temporary file or console log.
const readline=require('node:readline'),{EventEmitter}=require('node:events');
class PlatformBridge extends EventEmitter{
 constructor(input=process.stdin,output=process.stdout){super();this.output=output;this.bootstrap=null;this.closed=false;this.reader=readline.createInterface({input,crlfDelay:Infinity});
  this.reader.on('line',line=>{if(line.length>24000)return;try{const m=JSON.parse(line);if(m.type==='session'&&typeof m.access_token==='string'&&typeof m.refresh_token==='string'&&m.access_token.length<16000&&m.refresh_token.length<2048){if(!this.bootstrap){this.bootstrap=m;this.emit('bootstrap',m);}else this.emit('session',m);}else if(m.type==='inventory')this.emit('inventory');else if(m.type==='preferences'&&m.preferences)this.emit('preferences',m.preferences);else if(m.type==='logout')this.emit('logout');}catch{}});
  this.reader.on('close',()=>{this.closed=true;this.emit('disconnect');});
 }
 first(){if(this.bootstrap)return Promise.resolve(this.bootstrap);if(this.closed)return Promise.reject(Error('HUB_HANDOFF'));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.removeListener('bootstrap',receive);reject(Error('HUB_HANDOFF'));},12000);const receive=m=>{clearTimeout(timer);resolve(m);};this.once('bootstrap',receive);});}
 send(type,extra={}){if(!this.closed)this.output.write('ZONEHUB:'+JSON.stringify({type,...extra})+'\n');}
}
module.exports={PlatformBridge};
