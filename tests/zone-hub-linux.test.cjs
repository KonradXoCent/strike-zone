'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter,once}=require('node:events');
const {PassThrough}=require('node:stream');
const {spawn,spawnSync}=require('node:child_process');
const path=require('node:path');
const {ManagedGame}=require('../platform/core/game.cjs');
const {createChannel,connectChannel}=require('../core/platform-transport.cjs');

const executable='/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe';
function fakeTransport(){
 const socket=new PassThrough();
 return{env:{ZONEHUB_PIPE:'tcp://127.0.0.1:45678',ZONEHUB_PROOF:'a'.repeat(64)},connection:Promise.resolve(socket),socket,close:()=>socket.destroy()};
}
function setup({spawnProcess,spawnSyncProcess=(_command,args)=>({status:args?.[0]==='--version'?0:1}),platform='linux',createTransport=null}={}){
 const packages=new EventEmitter();packages.snapshot=()=>({canPlay:true});packages.check=async()=>{};packages.executable=()=>executable;
 const account={gameSession:()=>({access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH'}),snapshot:()=>({user:{id:'user-1'}}),validate:async()=>true};
 return new ManagedGame({packages,account,platform,wineCommand:'/usr/bin/wine',flatpakCommand:'flatpak',createTransport,spawnProcess,spawnSyncProcess});
}
function childProcess(){
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('exit',0);return child;
}
function readLines(stream){
 let buffer='';const lines=[];stream.on('data',chunk=>{buffer+=chunk.toString();let at;while((at=buffer.indexOf('\\n'))>=0){lines.push(buffer.slice(0,at));buffer=buffer.slice(at+1);}});return lines;
}

test('Linux creates an authenticated loopback-only TCP handoff channel',async()=>{
 if(process.platform!=='linux')return;
 const channel=await createChannel();
 assert.match(channel.env.ZONEHUB_PIPE,/^tcp:\/\/127\.0\.0\.1:\d+$/);
 assert.match(channel.env.ZONEHUB_PROOF,/^[a-f0-9]{64}$/);
 const client=connectChannel({...channel.env});
 const server=await channel.connection;
 const received=new Promise(resolve=>server.once('data',resolve));
 client.write('PING\\n');
 assert.equal((await received).toString(),'PING\\n');
 const reply=new Promise(resolve=>client.once('data',resolve));
 server.write('PONG\\n');
 assert.equal((await reply).toString(),'PONG\\n');
 client.destroy();channel.close();
});

test('Wine GUI handoff does not require inherited stdin or stdout handles',async()=>{
 if(process.platform!=='linux')return;
 const channel=await createChannel();
 const code=`
  Object.defineProperty(process,'stdout',{configurable:true,get(){throw Object.assign(new Error('open EBADF'),{code:'EBADF'});}});
  Object.defineProperty(process,'stdin',{configurable:true,get(){throw Object.assign(new Error('open EBADF'),{code:'EBADF'});}});
  const {PlatformBridge}=require('./core/platform-bridge.cjs');
  const bridge=new PlatformBridge();
  bridge.send('ready',{userId:'user-1'});
  bridge.output.end(()=>process.exit(0));
 `;
 const child=spawn(process.execPath,['-e',code],{cwd:path.join(__dirname,'..'),env:{...process.env,...channel.env},stdio:['ignore','pipe','pipe']});
 const server=await channel.connection;const lines=readLines(server);
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Wine-style TCP bridge timed out')),5000);
  const check=setInterval(()=>{if(lines.some(x=>x.includes('"type":"ready"'))){clearTimeout(timer);clearInterval(check);resolve();}},10);
  child.once('error',error=>{clearTimeout(timer);clearInterval(check);reject(error);});
 });
 assert(lines.some(x=>x.includes('"type":"ready"')&&x.includes('"userId":"user-1"')));
 const [codeValue]=await once(child,'exit');assert.equal(codeValue,0);
 channel.close();
});

test('Debian launches Windows game through system Wine using the private channel, not stdio',async()=>{
 const transport=fakeTransport();let command,args,options,child;const sent=readLines(transport.socket);
 const game=setup({createTransport:async()=>transport,spawnSyncProcess:(cmd,argv)=>({status:cmd==='/usr/bin/wine'&&argv[0]==='--version'?0:1}),spawnProcess:(cmd,argv,opts)=>{command=cmd;args=argv;options=opts;child=childProcess();return child;}});
 game.on('error',error=>{throw error;});await game.start();
 assert.equal(command,'/usr/bin/wine');assert.deepEqual(args,[executable,'--zonehub-managed']);
 assert.equal(options.shell,false);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
 assert.equal(options.env.ZONEHUB_PIPE,transport.env.ZONEHUB_PIPE);assert.equal(options.env.ZONEHUB_PROOF,transport.env.ZONEHUB_PROOF);
 assert(sent.some(line=>line.includes('"type":"session"')&&line.includes('TEST_ACCESS')));
 transport.socket.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\\n');
 assert.equal(game.snapshot().ready,true);
 child.stdin.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();assert.equal(game.snapshot().launcherRunning,false);transport.close();
});

test('Debian passes the authenticated loopback channel into the Flathub Wine sandbox',async()=>{
 const transport=fakeTransport();let command,args,options,child;const sent=readLines(transport.socket);
 const game=setup({createTransport:async()=>transport,spawnSyncProcess:(cmd,argv)=>{
  if(cmd==='/usr/bin/wine')return{status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})};
  if(cmd==='flatpak'&&argv[0]==='run'&&argv.includes('--command=wine')&&argv.includes('--version'))return{status:0,stdout:'wine-11.0'};
  return{status:1};
 },spawnProcess:(cmd,argv,opts)=>{command=cmd;args=argv;options=opts;child=childProcess();return child;}});
 game.on('error',error=>{throw error;});await game.start();
 assert.equal(command,'flatpak');
 assert.deepEqual(args,['run','--share=network',`--env=ZONEHUB_PIPE=${transport.env.ZONEHUB_PIPE}`,`--env=ZONEHUB_PROOF=${transport.env.ZONEHUB_PROOF}`,'--filesystem=/home/test/.config/ZoneHub/games/strike-zone/versions/hash:ro','--env=WINEDEBUG=-all','--command=wine','org.winehq.Wine',executable,'--zonehub-managed']);
 assert.equal(options.shell,false);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
 assert.equal(options.env.ZONEHUB_PIPE,transport.env.ZONEHUB_PIPE);assert.equal(options.env.ZONEHUB_PROOF,transport.env.ZONEHUB_PROOF);
 assert(sent.some(line=>line.includes('"type":"session"')&&line.includes('TEST_ACCESS')));
 transport.socket.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\\n');
 assert.equal(game.snapshot().ready,true);
 child.stdin.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();assert.equal(game.snapshot().launcherRunning,false);transport.close();
});

test('Debian reports a clear Wine installation error when neither system Wine nor Flathub Wine is present',async()=>{
 let child;const game=setup({spawnSyncProcess:()=>({status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})}),spawnProcess:()=>{child=childProcess();setImmediate(()=>child.emit('error',Object.assign(new Error('spawn wine ENOENT'),{code:'ENOENT'})));return child;}});
 const failed=once(game,'error');await game.start();const [error]=await failed;
 assert.equal(error.code,'HUB_WINE_MISSING');assert.equal(error.message,'HUB_WINE_MISSING');
});
