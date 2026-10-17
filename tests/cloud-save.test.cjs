'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const integration = fs.readFileSync(path.join(__dirname, '../game/desktop.js'), 'utf8');
const sourceHTML=fs.readFileSync(path.join(__dirname,'../game-source/index.html'),'utf8');
const browserIntegration=sourceHTML.match(/<script>\r?\n\/\* Standalone browser builds[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
function fixture({ saved = null, owner = null, userId = 'user-a', failure = false, code = integration } = {}) {
  const storage = new Map(owner ? [['sz2-cloud-owner', owner]] : []);
  const writes = [], timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    window: {}, document: { createElement: () => ({ append() {} }), head: { appendChild() {} }, body: { appendChild() {} } },
    console, inputUser: userId, records: { saved, failure }, writes
  });
  vm.runInContext(`
    var DB = {profiles:{Local:{name:'Local',wallet:10}},cur:'Local',ts:999999};
    var SBU = {id:inputUser,email:'test@example.test'}, CL={}, T='play';
    var cloudLoad=function(){}, cloudPush=function(){}, tab=function(){}, hdr=function(){}, lbPush=function(){};
    var mk=n=>({name:n,wallet:500}),communityReset=()=>{},communityRefresh=()=>{};
    var sb={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:records.saved?{json:records.saved}:null,error:records.failure?new Error('Offline'):null})})}),upsert:async v=>{writes.push(v);return {error:null}}})};
  `, context);
  vm.runInContext(code, context);
  return { storage, writes, timers, context, run: value => vm.runInContext(value, context) };
}
test('a fresh installation reads the cloud before writing, even if local timestamps are newer', async () => {
  const f = fixture({ saved: { profiles: { Konrad: { name: 'Konrad', wallet: 12345 } }, cur: 'Konrad', ts: 10 } });
  await f.run('cloudLoad()');
  assert.equal(f.run('DB.profiles.Konrad.wallet'), 12345);
  assert.equal(f.writes.length, 0);
  assert.equal(f.storage.get('sz2-cloud-owner'), 'user-a');
  assert(f.storage.has('sz2-before-cloud'));
});
test('cloud writes remain blocked after a failed initial read', async () => {
  const f = fixture({ failure: true });
  await f.run('cloudLoad()');
  await f.run('window.szDesktopFlush()');
  f.run('cloudPush(1)');
  assert.equal(f.writes.length, 0);
  assert.equal(f.timers.size, 0);
});
test('an existing account can upload its newer local progress after the read', async () => {
  const f = fixture({ owner: 'user-a', saved: { profiles: { Local: { wallet: 1 } }, cur: 'Local', ts: 10 } });
  await f.run('cloudLoad()');
  await f.run('window.szDesktopFlush()');
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].user_id, 'user-a');
  assert.equal(f.writes[0].json.profiles.Local.wallet, 10);
});
test('an empty second account does not inherit another account inventory', async () => {
  const f = fixture({ owner: 'user-a', userId: 'user-b' });
  await f.run('cloudLoad()');
  assert.equal(f.run('DB.cur'), 'Player');
  assert.equal(f.run('DB.profiles.Local'), undefined);
  assert.equal(f.storage.get('sz2-cloud-owner'), 'user-b');
});
test('signing out prevents the closing game from writing to the previous account', async () => {
  const f = fixture();
  await f.run('cloudLoad()');
  f.run('SBU=null');
  await f.run('cloudLoad()');
  await f.run('window.szDesktopFlush()');
  assert.equal(f.writes.length, 0);
});
test('a malformed cloud save is preserved and never overwritten', async () => {
  const f = fixture({ saved: { profiles: {}, ts: 50 } });
  await f.run('cloudLoad()');
  await f.run('window.szDesktopFlush()');
  assert.equal(f.writes.length, 0);
  assert.match(f.run('CL.msg'), /invalid/);
});
test('standalone HTML also reads the existing account before any upload',async()=>{
  const f=fixture({code:browserIntegration,saved:{profiles:{Existing:{name:'Existing',wallet:4321}},cur:'Existing',ts:1}});
  await f.run('cloudLoad()');assert.equal(f.run('DB.profiles.Existing.wallet'),4321);assert.equal(f.writes.length,0);assert.equal(f.storage.get('sz2-cloud-owner'),'user-a');
});
test('standalone HTML blocks writes after a failed initial account read',async()=>{
  const f=fixture({code:browserIntegration,failure:true});await f.run('cloudLoad()');await f.run('window.szDesktopFlush()');f.run('cloudPush(1)');assert.equal(f.writes.length,0);assert.equal(f.timers.size,0);
});
for(const [name,code]of [['desktop',integration],['standalone',browserIntegration]])test(name+' pauses cloud writes during a server wallet transaction and tracks pending saves',async()=>{
 const f=fixture({code,saved:{profiles:{Existing:{name:'Existing',wallet:4321}},cur:'Existing',ts:1}});await f.run('cloudLoad()');
 f.run('window.szCloudEconomyLocked=()=>true');assert.equal(await f.run('window.szDesktopFlush()'),false);f.run('cloudPush(1)');assert.equal(f.writes.length,0);assert.equal(f.timers.size,0);
 f.run('window.szCloudEconomyLocked=()=>false');const pending=f.run('window.szDesktopFlush()');assert.equal(f.run('window.szCloudPending.size'),1);assert.equal(await pending,true);assert.equal(f.run('window.szCloudPending.size'),0);assert.equal(f.writes.length,1);
});
