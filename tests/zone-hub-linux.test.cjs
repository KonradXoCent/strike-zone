'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter,once}=require('node:events');
const {PassThrough}=require('node:stream');
const {spawnSync}=require('node:child_process');
const {ManagedGame}=require('../platform/core/game.cjs');

function setup({spawnProcess,spawnSyncProcess=(_command,args)=>({status:args?.[0]==='--version'?0:1}),platform='linux'}={}){
 const packages=new EventEmitter();
 packages.snapshot=()=>({canPlay:true});
 packages.check=async()=>{};
 packages.executable=()=>'/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe';
 const account={gameSession:()=>({access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH'}),snapshot:()=>({user:{id:'user-1'}}),validate:async()=>true};
 return new ManagedGame({packages,account,platform,wineCommand:'/usr/bin/wine',flatpakCommand:'flatpak',createTransport:null,spawnProcess,spawnSyncProcess});
}
function childProcess(){
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('exit',0);return child;
}

test('Debian launches downloaded Windows game packages through system Wine and keeps SSO on stdin',async()=>{
 let command,args,options,child;
 const game=setup({spawnSyncProcess:(cmd,argv)=>({status:cmd==='/usr/bin/wine'&&argv[0]==='--version'?0:1}),spawnProcess:(cmd,argv,opts)=>{
  command=cmd;args=argv;options=opts;child=childProcess();return child;
 }});
 game.on('error',error=>{throw error;});
 await game.start();
 assert.equal(command,'/usr/bin/wine');
 assert.deepEqual(args,['/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe','--zonehub-managed']);
 assert.equal(options.shell,false);
 assert.equal(options.stdio[0],'pipe');
 assert.equal(options.env.ZONEHUB_BRIDGE_USE_STDERR,'1');
 assert.equal(options.env.ZONEHUB_BRIDGE_USE_STDERR,'1');
 assert(child.stdin.read().toString().includes('TEST_ACCESS'));
 child.stderr.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\n');
 assert.equal(game.snapshot().ready,true);
 child.stdin.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();
 assert.equal(game.snapshot().launcherRunning,false);
});

test('Debian detects Flathub Wine and grants it read-only access to the selected game directory',async()=>{
 let command,args,options,child;const executable='/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe';
 const game=setup({spawnSyncProcess:(cmd,argv)=>{
  if(cmd==='/usr/bin/wine')return{status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})};
  if(cmd==='flatpak'&&argv[0]==='run'&&argv.includes('--command=wine')&&argv.includes('--version'))return{status:0,stdout:'wine-11.0'};
  return{status:1};
 },spawnProcess:(cmd,argv,opts)=>{command=cmd;args=argv;options=opts;child=childProcess();return child;}});
 game.on('error',error=>{throw error;});
 await game.start();
 assert.equal(command,'flatpak');
 assert.deepEqual(args,['run','--filesystem=/home/test/.config/ZoneHub/games/strike-zone/versions/hash:ro','--env=WINEDEBUG=-all','--command=wine','org.winehq.Wine',executable,'--zonehub-managed']);
 assert.equal(options.shell,false);
 assert.equal(options.stdio[0],'pipe');
 assert.equal(options.env.ZONEHUB_BRIDGE_USE_STDERR,'1');
 assert(child.stdin.read().toString().includes('TEST_ACCESS'));
 child.stderr.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\n');
 assert.equal(game.snapshot().ready,true);
 child.stdin.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();
 assert.equal(game.snapshot().launcherRunning,false);
});

test('Debian reports a clear Wine installation error when neither system Wine nor Flathub Wine is present',async()=>{
 let child;
 const game=setup({spawnSyncProcess:()=>({status:1,error:Object.assign(new Error('not found'),{code:'ENOENT'})}),spawnProcess:()=>{
  child=childProcess();setImmediate(()=>child.emit('error',Object.assign(new Error('spawn wine ENOENT'),{code:'ENOENT'})));return child;
 }});
 const failed=once(game,'error');
 await game.start();
 const [error]=await failed;
 assert.equal(error.code,'HUB_WINE_MISSING');
 assert.equal(error.message,'HUB_WINE_MISSING');
});

test('Wine PlatformBridge does not access invalid stdout and sends protocol over stderr',()=>{
 const code=`
  Object.defineProperty(process,'stdout',{configurable:true,get(){throw Object.assign(new Error('open EBADF'),{code:'EBADF'});}});
  const {PlatformBridge}=require('./core/platform-bridge.cjs');
  const bridge=new PlatformBridge();
  bridge.send('ready',{userId:'user-1'});
 `;
 const result=spawnSync(process.execPath,['-e',code],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8',env:{...process.env,ZONEHUB_BRIDGE_USE_STDERR:'1'}});
 assert.equal(result.status,0,result.stderr||result.error?.message);
 assert.match(result.stderr,/ZONEHUB:.*"type":"ready".*"userId":"user-1"/);
 assert.equal(result.stdout,'');
});
