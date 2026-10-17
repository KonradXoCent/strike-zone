'use strict';
const { _electron } = require('playwright-core');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { accountChecks } = require('./test-support/account-checks.cjs');
const { startFixture, connectFixture } = require('./test-support/supabase-fixture.cjs');
const { startPresenceFixture, connectPresenceFixture } = require('./test-support/presence-fixture.cjs');
const root = path.resolve(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-launcher-'));
const screenshots = process.env.SZ_LAUNCHER_SCREENSHOTS;
let completed = false;
process.on('beforeExit', () => { if (!completed && !process.exitCode) { console.error('Launcher checks did not complete'); process.exitCode = 1; } });
const passed = message => console.log('PASS:', message);
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM5kAAAAASUVORK5CYII=';
(async () => {
  const broker = await startPresenceFixture();
  fs.writeFileSync(tmp + '/package.json', JSON.stringify({ main: 'main.cjs', version: require('../package.json').version }));
  fs.writeFileSync(tmp + '/main.cjs', `const {app}=require('electron');app.setPath('appData',${JSON.stringify(tmp)});app.requestSingleInstanceLock=()=>true;require(${JSON.stringify(root + '/main.cjs')});`);
  if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
  const app = await _electron.launch({ executablePath: require('electron'), args: [tmp, '--no-sandbox', '--ozone-platform=headless', '--headless', '--disable-gpu'] });
  let fixture; const peers = [], errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setBounds({ x: 0, y: 0, width: 1020, height: 680 }); });
    await page.setViewportSize({ width: 1020, height: 680 });
    await page.waitForFunction(() => typeof window.strikeZone?.getState === 'function');
    await connectPresenceFixture(app, broker.endpoint, root + '/core/friends.cjs');
    await app.context().routeWebSocket('wss://mvzlqpccmjslxdajjbfw.supabase.co/**', ws => ws.close());
    await accountChecks(app, page, passed, { screenshots });
    const a = randomUUID(), b = randomUUID();
    fixture = await startFixture({ friends: [{ friend_id: a, name: 'AtlasQA' }, { friend_id: b, name: 'BlazeQA' }], profiles: [{ user_id: a, name: 'AtlasQA', av: '🥷', avimg: png }, { user_id: b, name: 'BlazeQA', av: '🐺' }] });
    await connectFixture(app, fixture);
    await page.locator('#auth-signin').click(); await page.locator('#auth-email').fill(fixture.email); await page.locator('#auth-password').fill(fixture.password); await page.locator('#auth-submit').click();
    await page.waitForFunction(() => document.querySelectorAll('.friend-row.offline').length === 2);
    assert.equal(await page.locator('.friend-row img').count(), 1);
    const peer = async (id, presence) => {
      const client = createClient('https://mvzlqpccmjslxdajjbfw.supabase.co', 'fixture-key', { auth: { persistSession: false, autoRefreshToken: false } });
      client.realtime.endPoint = broker.endpoint; peers.push(client);
      const channel = client.channel('sz-online', { config: { presence: { key: id } } });
      await new Promise((resolve, reject) => { channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') { const result = await channel.track(presence); result === 'ok' ? resolve() : reject(Error(result)); }
        else if (status === 'CHANNEL_ERROR') reject(Error(status));
      }); }); return { client, channel };
    };
    const launcherPeer = await peer(a, { n: 'AtlasQA', app: 'launcher', av: '🥷' });
    await page.waitForFunction(() => document.querySelector('.friend-row.online small')?.textContent === 'W launcherze');
    const color = await page.locator('.friend-row.online .presence-dot').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(color, 'rgb(67, 199, 138)');
    assert.equal(await page.locator('.friend-row.offline .presence-dot').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(125, 135, 151)');
    const gamePeer = await peer(a, { n: 'AtlasQA', app: 'game', match: true, mode: 'ctf', avimg: png });
    await page.waitForFunction(() => document.querySelector('.friend-row.online small')?.textContent === 'W grze · Przejmowanie flagi');
    passed('Actual SDK presence updates avatar badges and match activity; saved avatars also work offline');
    for (const phase of ['available', 'downloading', 'downloaded', 'error']) {
      await page.evaluate(async phase => { const state = await window.strikeZone.getState(); render({ ...state, update: { ...state.update, required: true, canPlay: false, phase, progress: 42, latestVersion: '1.2.1', transferred: 4200, total: 10000, bytesPerSecond: 1000 } }); }, phase);
      assert(await page.locator('#play').isDisabled());
      if (phase === 'downloading') { assert(await page.locator('#progress-track').isVisible()); assert.equal(await page.locator('#progress-value').textContent(), '42%'); }
    }
    await page.evaluate(async () => render(await window.strikeZone.getState()));
    passed('Updated launcher still shows mandatory updates, progress, restart and retry states');
    await page.locator('#friends-search').fill('Blaze'); assert.equal(await page.locator('.friend-row').count(), 1);
    await page.locator('#friends-search').fill('missing'); assert.equal(await page.locator('.friend-row').count(), 0); await page.getByText('Nie znaleziono znajomego', { exact: true }).waitFor();
    await page.locator('#friends-search').fill(''); assert.equal(await page.locator('.friend-row').count(), 2);
    if (screenshots) await page.screenshot({ path: screenshots + '/launcher-friends.png' });
    for (const [width, height] of [[1020,680],[900,600],[760,520],[680,480]]) {
      await app.evaluate(({ BrowserWindow }, bounds) => { const w = BrowserWindow.getAllWindows()[0]; w.setMinimumSize(340,360); w.setBounds({ x: 0, y: 0, ...bounds }); w.show(); }, { width, height });
      await page.setViewportSize({ width, height });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, play: document.getElementById('play').getBoundingClientRect().toJSON(), footer: document.querySelector('footer').getBoundingClientRect().bottom }));
      assert(dimensions.scroll <= width + 1, JSON.stringify(dimensions)); assert(dimensions.play.right <= width); assert(dimensions.play.bottom <= height); assert(dimensions.footer <= height + 1);
      if (screenshots) await page.screenshot({ path: screenshots + '/launcher-' + width + '.png' });
    }
    passed('Launcher fits four desktop sizes, including 680 × 480, with Play visible and no horizontal overflow');
    await gamePeer.client.removeChannel(gamePeer.channel);
    await page.waitForFunction(() => document.querySelector('.friend-row.online small')?.textContent === 'W launcherze');
    await launcherPeer.client.removeChannel(launcherPeer.channel);
    await page.waitForFunction(() => document.querySelectorAll('.friend-row.offline').length === 2);
    passed('Closing the game keeps a friend online until their remaining launcher session also disconnects');
    broker.disconnect();
    await page.waitForFunction(() => document.getElementById('friends-connection').textContent.includes('łączenie'));
    assert.equal(await page.locator('.friend-row.offline').count(), 0);
    await page.waitForFunction(() => document.querySelectorAll('.friend-row.offline').length === 2, null, { timeout: 15000 });
    passed('Socket loss shows unknown status, then automatically restores a synchronized roster');
    await page.locator('#account-logout').click(); await page.locator('#auth-form').waitFor(); assert.equal(await page.locator('.friend-row').count(), 0);
    await page.locator('#auth-signup').click(); await page.locator('#auth-nickname').fill('SocialFreshQA'); await page.locator('#auth-email').fill('social-new@example.test'); await page.locator('#auth-password').fill(fixture.password); await page.locator('#auth-submit').click();
    await page.locator('#account-name').filter({ hasText: 'SocialFreshQA' }).waitFor(); await page.waitForFunction(() => document.getElementById('friends-list').textContent.includes('Zbierz swoją drużynę'));
    assert.equal(await page.locator('.friend-row').count(), 0); assert.deepEqual(errors, []);
    passed('Logging out clears friends, and another account gets its own empty roster');
    completed = true;
  } finally {
    for (const peer of peers) await peer.removeAllChannels();
    await app.close(); await fixture?.close(); await broker.close(); fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
