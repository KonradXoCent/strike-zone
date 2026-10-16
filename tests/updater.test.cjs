'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { UpdateController, plainNotes } = require('../core/updater.cjs');
const { normalizeConfig } = require('../core/config.cjs');
const { resolveAsset } = require('../core/protocol.cjs');

function fixture(config = { enabled: true, provider: 'generic', url: 'https://updates.example.com/game/' }, packaged = true) {
  const updater = new EventEmitter();
  updater.setFeedURL = value => { updater.feed = value; };
  updater.checkForUpdates = async () => { updater.emit('checking-for-update'); updater.emit('update-not-available'); };
  updater.downloadUpdate = async () => {
    updater.emit('download-progress', { percent: 37.5, transferred: 300, total: 800, bytesPerSecond: 100 });
    updater.emit('update-downloaded', { version: '1.0.1' });
  };
  updater.quitAndInstall = (...args) => { updater.installed = args; };
  return { updater, controller: new UpdateController({ updater, config, version: '1.0.0', packaged, platform: 'win32' }) };
}
test('unconfigured and development builds never contact an update server', async () => {
  for (const [config, packaged] of [[{ enabled: false }, true], [{ enabled: true, provider: 'generic', url: 'https://example.com' }, false]]) {
    const { updater, controller } = fixture(config, packaged);
    updater.checkForUpdates = () => { throw new Error('Unexpected request'); };
    assert.equal((await controller.check()).phase, 'disabled');
    assert.equal(updater.feed, undefined);
  }
});
test('a current release returns to a playable state', async () => {
  const { controller } = fixture();
  assert.equal((await controller.check()).phase, 'current');
});
test('available -> progress -> downloaded -> explicit install', async () => {
  const { updater, controller } = fixture();
  updater.checkForUpdates = async () => updater.emit('update-available', { version: '1.0.1', releaseNotes: '<b>New map</b>' });
  await controller.check();
  assert.equal(controller.state.phase, 'available');
  assert.equal(controller.state.releaseNotes, 'New map');
  const states = [];
  controller.on('state', state => states.push(state));
  await controller.download();
  assert(states.some(state => state.phase === 'downloading' && state.progress === 37.5));
  assert.equal(controller.state.phase, 'downloaded');
  await controller.check();
  assert.equal(controller.state.phase, 'downloaded');
  assert.equal(controller.install(), true);
  assert.deepEqual(updater.installed, [true, true]);
  assert.equal(updater.autoInstallOnAppQuit, false);
});
test('failed downloads allow retry without starting the installer', async () => {
  const { updater, controller } = fixture();
  updater.emit('update-available', { version: '1.0.1' });
  updater.downloadUpdate = async () => { throw new Error('Network failure'); };
  await controller.download();
  assert.equal(controller.state.phase, 'error');
  assert.equal(controller.install(), false);
  assert.equal(updater.installed, undefined);
  assert.equal((await controller.check()).phase, 'current');
});
test('concurrent checks share a single request', async () => {
  const { updater, controller } = fixture();
  let requests = 0, finish;
  updater.checkForUpdates = () => { requests++; return new Promise(resolve => { finish = resolve; }); };
  const a = controller.check(), b = controller.check();
  assert.equal(requests, 1);
  finish(); await Promise.all([a, b]);
});
test('unsafe update configuration is rejected', () => {
  for (const url of ['http://example.com', 'file:///tmp/installer.exe', 'https://user:password@example.com', 'https://example.com/#fragment']) {
    assert.throws(() => normalizeConfig({ enabled: true, provider: 'generic', url }));
  }
  assert.deepEqual(normalizeConfig({ enabled: true, provider: 'github', owner: 'konrad', repo: 'strike-zone' }),
    { enabled: true, required: true, provider: 'github', owner: 'konrad', repo: 'strike-zone', releaseType: 'release' });
  assert.equal(plainNotes('<script>bad()</script><p>Changes</p>'), 'bad()Changes');
});
test('required updates block launch until a successful version check', async () => {
  const { updater, controller } = fixture({ enabled: true, required: true, provider: 'github', owner: 'konrad', repo: 'strike-zone' });
  assert.equal(controller.canPlay(), false);
  assert.equal(controller.snapshot().canPlay, false);
  await controller.check();
  assert.equal(controller.canPlay(), true);
  updater.emit('update-available', { version: '1.0.1' });
  assert.equal(controller.canPlay(), false);
  await controller.download();
  assert.equal(controller.canPlay(), false);
});
test('a failed required check cannot reuse an earlier permission to play', async () => {
  const { updater, controller } = fixture({ enabled: true, required: true, provider: 'generic', url: 'https://updates.example.com' });
  await controller.check();
  assert.equal(controller.canPlay(), true);
  updater.checkForUpdates = async () => { throw new Error('Offline'); };
  await controller.check();
  assert.equal(controller.state.phase, 'error');
  assert.equal(controller.canPlay(), false);
});
test('a broken required channel fails closed', async () => {
  const { controller } = fixture({ enabled: false, required: true });
  await controller.check();
  assert.equal(controller.canPlay(), false);
  assert.equal(controller.state.phase, 'error');
});
test('the asset protocol cannot read source code or escape its route', () => {
  assert.equal(resolveAsset('/app', 'strikezone://app/game/index.html'), '/app/game/index.html');
  for (const url of ['https://app/game/index.html', 'strikezone://other/game/index.html',
    'strikezone://app/main.cjs', 'strikezone://app/launcher/..%2fcore/config.cjs',
    'strikezone://app/game/%00index.html', 'strikezone://app/game/%5c..%5cmain.cjs']) {
    assert.equal(resolveAsset('/app', url), null, url);
  }
});
