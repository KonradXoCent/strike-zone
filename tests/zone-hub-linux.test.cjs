'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter,once}=require('node:events');
const {PassThrough}=require('node:stream');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {ManagedGame}=require('../platform/core/game.cjs');
const {createChannel,connectChannel}=require('../core/platform-transport.cjs');

const executable='/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe';
function setup({spawnProcess,spawnSyncProcess=(_command,args)=>({status:args?.[0]==='--version'?0:1}),platform='linux',createTransport=null}={}){
 const packages=new EventEmitter();packages.snapshot=()=>({canPlay:true});packages.check=async()=>{};packages.executable=()=>executable;
 const account={gameSession:()=>({access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH'}),snapshot:()=>({user:{id:'user-1'}}),validate:async()=>true};
 return new ManagedGame({packages,account,platform,wineCommand:'/usr/bin/wine',flatpakCommand:'flatpak',createTransport,spawnProcess,spawnSyncProcess});
}
function childProcess(){
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('exit',0);return child;
}
function readLines(stream){
 let buffer='';const lines=[];stream.on('data',chunk=>{buffer+=chunk.toString();let at;while((at=buffer.indexOf('\n'))>=0){lines.push(buffer.slice(0,at));buffer=buffer.slice(at+1);}});return lines;
}
async function waitForLine(lines,predicate,timeout=5000){
 const started=Date.now();while(Date.now()-started<timeout){const found=lines.find(predicate);if(found)return found;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out waiting for protocol line');
}
async function makeLiveTransport(){
 const transport=await createChannel();
 const client=connectChannel({...transport.env});
 const lines=readLines(client);
 return{transport,client,lines};
}
async function stopGame(game,client,child){
 client.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();
 client.destroy();game.transport?.close();
}

test('Linux creates an authenticated loopback-only TCP handoff channel',{skip:process.platform!=='linux'},async()=>{
 
 const {transport,client,lines}=await makeLiveTransport();
 const server=await transport.connection;server.on('data',chunk=>server.write(chunk));server.resume();
 client.write('PING\n');
 assert.equal(await waitForLine(lines,line=>line==='PING'),'PING');
 server.write('PONG\n');
 assert.equal(await waitForLine(lines,line=>line==='PONG'),'PONG');
 client.destroy();transport.close();
});

test('Wine GUI handoff does not require inherited stdin or stdout handles',{skip:process.platform!=='linux'},async()=>{
 if(process.platform!=='linux')return;
 const transport=await createChannel();
 const code=`
  Object.defineProperty(process,'stdout',{configurable:true,get(){throw Object.assign(new Error('open EBADF'),{code:'EBADF'});}});
  Object.defineProperty(process,'stdin',{configurable:true,get(){throw Object.assign(new Error('open EBADF'),{code:'EBADF'});}});
  const {PlatformBridge}=require('./core/platform-bridge.cjs');
  const bridge=new PlatformBridge();
  bridge.send('ready',{userId:'user-1'});
  bridge.output.end(()=>process.exit(0));
 `;
 const child=spawn(process.execPath,['-e',code],{cwd:path.join(__dirname,'..'),env:{...process.env,...transport.env},stdio:['ignore','pipe','pipe']});
 const server=await transport.connection;const lines=readLines(server);server.resume();
 const exited=once(child,'exit');
 await waitForLine(lines,line=>line.includes('"type":"ready"')&&line.includes('"userId":"user-1"'));
 const [codeValue]=await exited;assert.equal(codeValue,0);
 transport.close();
});

test('Debian launches Windows game through system Wine using the private channel, not stdio',{skip:process.platform!=='linux'},async()=>{
 const {transport,client,lines}=await makeLiveTransport();let command,args,options,child;
 const game=setup({createTransport:async()=>transport,spawnSyncProcess:(cmd,argv)=>({status:cmd==='/usr/bin/wine'&&argv[0]==='--version'?0:1}),spawnProcess:(cmd,argv,opts)=>{command=cmd;args=argv;options=opts;child=childProcess();return child;}});
 game.on('error',error=>{throw error;});await game.start();
 assert.equal(command,'/usr/bin/wine');assert.deepEqual(args,[executable,'--zonehub-managed']);
 assert.equal(options.shell,false);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
 assert.equal(options.env.ZONEHUB_PIPE,transport.env.ZONEHUB_PIPE);assert.equal(options.env.ZONEHUB_PROOF,transport.env.ZONEHUB_PROOF);
 const session=await waitForLine(lines,line=>line.includes('"type":"session"'));
 assert(session.includes('TEST_ACCESS'));assert(!args.join(' ').includes('TEST_ACCESS'));
 client.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\n');
 await waitForLine(lines,line=>line.includes('"type":"ready"'));
 assert.equal(game.snapshot().ready,true);
 await stopGame(game,client,child);
 assert.equal(game.snapshot().launcherRunning,false);
});

test('Debian passes the loopback channel and network permission into Flathub Wine',{skip:process.platform!=='linux'},async()=>{
 const {transport,client,lines}=await makeLiveTransport();let command,args,options,child;
 const game=setup({createTransport:async()=>transport,spawnSyncProcess:(cmd,argv)=>{
  if(cmd==='/usr/bin/wine')return{status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})};
  if(cmd==='flatpak'&&argv[0]==='run'&&argv.includes('--command=wine')&&argv.includes('--version'))return{status:0,stdout:'wine-11.0'};
  return{status:1};
 },spawnProcess:(cmd,argv,opts)=>{command=cmd;args=argv;options=opts;child=childProcess();return child;}});
 game.on('error',error=>{throw error;});await game.start();
 assert.equal(command,'flatpak');
 assert.deepEqual(args,['run','--share=network','--filesystem=/home/test/.config/ZoneHub/games/strike-zone/versions/hash:ro','--env=WINEDEBUG=-all','--command=wine','org.winehq.Wine',executable,'--zonehub-managed']);
 assert.equal(options.shell,false);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
 assert.equal(options.env.ZONEHUB_PIPE,transport.env.ZONEHUB_PIPE);assert.equal(options.env.ZONEHUB_PROOF,transport.env.ZONEHUB_PROOF);
 const session=await waitForLine(lines,line=>line.includes('"type":"session"'));assert(session.includes('TEST_ACCESS'));
 client.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\n');
 await waitForLine(lines,line=>line.includes('"type":"ready"'));assert.equal(game.snapshot().ready,true);
 await stopGame(game,client,child);assert.equal(game.snapshot().launcherRunning,false);
});

test('Debian reports a clear Wine installation error when neither system Wine nor Flathub Wine is present',{skip:process.platform!=='linux'},async()=>{
 let child;const game=setup({spawnSyncProcess:()=>({status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})}),spawnProcess:()=>{child=childProcess();setImmediate(()=>child.emit('error',Object.assign(new Error('spawn wine ENOENT'),{code:'ENOENT'})));return child;}});
 const failed=once(game,'error');await game.start();const [error]=await failed;
 assert.equal(error.code,'HUB_WINE_MISSING');assert.equal(error.message,'HUB_WINE_MISSING');
});
