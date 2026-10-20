'use strict';
const { _electron } = require('playwright-core');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');
const { accountChecks } = require('./test-support/account-checks.cjs');
const { startPresenceFixture, connectPresenceFixture } = require('./test-support/presence-fixture.cjs');

const root = path.join(__dirname, '..');
const version = require('../package.json').version;
const baseVersion = '1.5.1';
const installDir = path.join(process.env.RUNNER_TEMP || process.env.TEMP, 'StrikeZoneUpdateSmoke');
const installedExe = path.join(installDir, 'StrikeZone.exe');
const report = { expectedVersion: version, bootstrapVersion: baseVersion, authenticationTest: 'Isolated Supabase HTTP fixture; no production account or database writes', startedAt: new Date().toISOString(), checks: [] };
let electron;
let presence;
function passed(check) { report.checks.push(check); console.log('PASS:', check); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function installedVersion() {
  const archive = path.join(installDir, 'resources/app.asar');
  try {
    // NSIS replaces this file in place; asar otherwise keeps the old header/offsets cached.
    asar.uncache(archive);
    return JSON.parse(asar.extractFile(archive, 'package.json').toString()).version;
  }
  catch { return null; }
}
function stopInstalledApp() {
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name='StrikeZone.exe'\" | Where-Object { $_.ExecutablePath -eq $env:STRIKE_ZONE_SMOKE_EXE } | ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }"],
  { env: { ...process.env, STRIKE_ZONE_SMOKE_EXE: installedExe }, stdio: 'inherit' });
}
async function installBootstrap() {
  await new Promise((resolve, reject) => {
    const child = spawn(path.join(root, 'release/StrikeZone-Setup-' + baseVersion + '.exe'), ['/S', '/D=' + installDir], { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Installer exit ' + code)));
  });
  for (let i = 0; i < 30 && installedVersion() !== baseVersion; i++) await wait(1000);
  assert.equal(installedVersion(), baseVersion);
  stopInstalledApp();
  passed('Windows NSIS bootstrap installation');
}
async function launchInstalled() {
  electron = await _electron.launch({ executablePath: installedExe, timeout: 45000 });
  const launcher = await electron.firstWindow();
  await launcher.waitForFunction(() => typeof window.strikeZone?.getState === 'function');
  return launcher;
}
async function expectedState(page, phase, { timeout = 30000, retry = true } = {}) {
  const deadline = Date.now() + timeout;
  let lastPhase;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => window.strikeZone.getState());
    if (state.update.phase !== lastPhase) console.log('Update state:', JSON.stringify(state.update));
    lastPhase = state.update.phase;
    if (state.update.phase === phase) return state;
    if (state.update.phase === 'error' && !retry) throw new Error('Update failed: ' + JSON.stringify(state.update));
    if (retry && ['error', 'idle'].includes(state.update.phase)) await page.evaluate(() => window.strikeZone.check());
    await wait(1000);
  }
  throw new Error('Expected update state ' + phase + ', got ' + JSON.stringify(await page.evaluate(() => window.strikeZone.getState())));
}
async function main() {
  if (process.platform !== 'win32') throw new Error('This test requires Windows.');
  await installBootstrap();
  let launcher = await launchInstalled();
  const oldState = await expectedState(launcher, 'available');
  assert.equal(oldState.update.version, baseVersion); assert.equal(oldState.update.latestVersion, version);
  assert.equal(oldState.update.required, true); assert.equal(oldState.update.canPlay, false);
  assert.equal(await launcher.locator('#play').isDisabled(), true);
  passed('GitHub release detected by installed ' + baseVersion);
  await launcher.evaluate(() => window.strikeZone.play());
  assert.equal(await electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
  passed('Required update enforced in main process and UI');
  const probe = 'probe-' + Date.now();
  await launcher.evaluate(value => localStorage.setItem('sz-update-smoke', value), probe);
  await launcher.locator('#update-action').click();
  // Playwright treats an async predicate's Promise as truthy. Poll the resolved IPC state in Node.
  const downloaded = await expectedState(launcher, 'downloaded', { timeout: 300000, retry: false });
  assert.equal(downloaded.update.latestVersion, version);
  assert.equal(downloaded.update.canPlay, false);
  passed('Installer downloaded and verified by electron-updater');
  const closed = electron.waitForEvent('close', { timeout: 120000 });
  const installState = await launcher.evaluate(() => window.strikeZone.install()).catch(error => {
    if (!/closed|destroyed/i.test(error.message)) throw error;
  });
  if (installState) assert.equal(installState.update.phase, 'installing');
  await closed; electron = null;
  for (let i = 0; i < 120 && installedVersion() !== version; i++) await wait(1000);
  assert.equal(installedVersion(), version);
  await wait(5000); stopInstalledApp(); await wait(1000);
  passed('Silent NSIS update installed ' + version);
  launcher = await launchInstalled();
  const state = await expectedState(launcher, 'current');
  assert.equal(state.update.version, version); assert.equal(state.update.canPlay, true);
  assert.equal(await launcher.evaluate(() => localStorage.getItem('sz-update-smoke')), probe);
  passed('New launcher runs and preserves local data');
  assert.equal(await launcher.locator('#friends-search').count(), 1);
  assert.equal(await launcher.locator('#friends-list').count(), 1);
  // Keep account/presence checks isolated from production on the installed app too.
  presence = await startPresenceFixture();
  await connectPresenceFixture(electron, presence.endpoint);
  await electron.context().routeWebSocket('wss://mvzlqpccmjslxdajjbfw.supabase.co/**', ws => ws.close());
  await accountChecks(electron, launcher, passed);
  report.status = 'passed';
}
main().catch(error => { report.status = 'failed'; report.error = error.stack || String(error); console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (electron) await electron.close().catch(() => {});
    if (presence) await presence.close();
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.join(root, 'release'), { recursive: true });
    fs.writeFileSync(path.join(root, 'release/update-smoke-report.json'), JSON.stringify(report, null, 2) + '\n');
  });
