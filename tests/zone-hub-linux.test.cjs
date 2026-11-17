'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter,once}=require('node:events');
const {PassThrough}=require('node:stream');
const {ManagedGame}=require('../platform/core/game.cjs');

function setup({spawnProcess,platform='linux'}={}){
 const packages=new EventEmitter();
 packages.snapshot=()=>({canPlay:true});
 packages.check=async()=>{};
 packages.executable=()=>'/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe';
 const account={gameSession:()=>({access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH'}),snapshot:()=>({user:{id:'user-1'}}),validate:async()=>true};
 return new ManagedGame({packages,account,platform,wineCommand:'/usr/bin/wine',createTransport:null,spawnProcess});
}

test('Debian launches downloaded Windows game packages through Wine and keeps SSO on stdin',async()=>{
 let command,args,options,child;
 const game=setup({spawnProcess:(cmd,argv,opts)=>{
  command=cmd;args=argv;options=opts;
  child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('exit',0);
  return child;
 }});
 game.on('error',error=>{throw error;});
 await game.start();
 assert.equal(command,'/usr/bin/wine');
 assert.deepEqual(args,['/home/test/.config/ZoneHub/games/strike-zone/versions/hash/StrikeZone.exe','--zonehub-managed']);
 assert.equal(options.shell,false);
 assert.equal(options.stdio[0],'pipe');
 assert(child.stdin.read().toString().includes('TEST_ACCESS'));
 child.stdout.write('ZONEHUB:'+JSON.stringify({type:'ready',userId:'user-1'})+'\n');
 assert.equal(game.snapshot().ready,true);
 child.stdin.on('data',chunk=>{if(chunk.toString().includes('"type":"logout"'))setImmediate(()=>child.emit('exit',0));});
 await game.stop();
 assert.equal(game.snapshot().launcherRunning,false);
});

test('Debian reports a clear Wine installation error when Wine is absent',async()=>{
 let child;
 const game=setup({spawnProcess:()=>{
  child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('exit',0);
  setImmediate(()=>child.emit('error',Object.assign(new Error('spawn wine ENOENT'),{code:'ENOENT'})));
  return child;
 }});
 const failed=once(game,'error');
 await game.start();
 const [error]=await failed;
 assert.equal(error.code,'HUB_WINE_MISSING');
 assert.equal(error.message,'HUB_WINE_MISSING');
});
