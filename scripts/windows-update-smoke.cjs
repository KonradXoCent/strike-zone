'use strict';
const { _electron } = require('playwright-core');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');

const root = path.join(__dirname, '..');
const version = require('../package.json').version;
const installDir = path.join(process.env.RUNNER_TEMP || process.env.TEMP, 'StrikeZoneUpdateSmoke');
const installedExe = path.join(installDir, 'StrikeZone.exe');
const report = { expectedVersion: version, bootstrapVersion: '1.0.0', startedAt: new Date().toISOString(), checks: [] };
let electron;
function passed(check) { report.checks.push(check); console.log('PASS:', check); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function installedVersion() {
  try { return JSON.parse(asar.extractFile(path.join(installDir, 'resources/app.asar'), 'package.json').toString()).version; }
  catch { return null; }
}
function stopInstalledApp() {
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name='StrikeZone.exe'\" | Where-Object { $_.ExecutablePath -eq $env:STRIKE_ZONE_SMOKE_EXE } | ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }"],
  { env: { ...process.env, STRIKE_ZONE_SMOKE_EXE: installedExe }, stdio: 'inherit' });
}
async function installBootstrap() {
  await new Promise((resolve, reject) => {
    const child = spawn(path.join(root, 'release/StrikeZone-Test-1.0.0.exe'), ['/S', '/D=' + installDir], { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Installer exit ' + code)));
  });
  for (let i = 0; i < 30 && installedVersion() !== '1.0.0'; i++) await wait(1000);
  assert.equal(installedVersion(), '1.0.0');
  stopInstalledApp();
  passed('Windows NSIS bootstrap installation');
}
async function launchInstalled() {
  electron = await _electron.launch({ executablePath: installedExe, timeout: 45000 });
  const launcher = await electron.firstWindow();
  await launcher.locator('#play').waitFor();
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
  assert.equal(oldState.update.version, '1.0.0'); assert.equal(oldState.update.latestVersion, version);
  assert.equal(oldState.update.required, true); assert.equal(oldState.update.canPlay, false);
  assert.equal(await launcher.locator('#play').isDisabled(), true);
  passed('GitHub release detected by installed 1.0.0');
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
  const nextWindow = electron.waitForEvent('window', { timeout: 45000 });
  await launcher.locator('#play').click();
  const game = await nextWindow;
  await game.waitForFunction(() => typeof window.szDesktopFlush === 'function', null, { timeout: 30000 });
  const gameVersion = await game.evaluate(() => ({ sdk: typeof window.supabase?.createClient, secure: isSecureContext }));
  assert.equal(gameVersion.sdk, 'function'); assert.equal(gameVersion.secure, true);
  passed('Game starts after mandatory update with bundled Supabase SDK');
  const gameClosed = game.waitForEvent('close');
  await game.evaluate(() => window.strikeZoneDesktop.launcher()); await gameClosed;
  passed('Game returns to launcher on Windows');
  report.status = 'passed';
}
main().catch(error => { report.status = 'failed'; report.error = error.stack || String(error); console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (electron) await electron.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.join(root, 'release'), { recursive: true });
    fs.writeFileSync(path.join(root, 'release/update-smoke-report.json'), JSON.stringify(report, null, 2) + '\n');
  });
