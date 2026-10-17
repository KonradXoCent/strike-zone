'use strict';
const { _electron } = require('playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { makePreview } = require('./prepare-preview.cjs');
const { createWorkshopDB, USERS: U } = require('./test-support/workshop-db.cjs');
const { requestWorkshopDB } = require('./test-support/workshop-browser.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-preview-login-'));
const repo = path.resolve(__dirname, '..');
const accounts = [
  { id: U.author, email: 'author@example.test', name: 'Tworca' },
  { id: U.admin, email: 'owner@example.test', name: 'Moderator' },
  { id: U.other, email: 'other@example.test', name: 'DrugiProfil' }
];
let completed = false;
process.on('beforeExit', () => { if (!completed && !process.exitCode) process.exitCode = 1; });
fs.writeFileSync(root + '/index.html', makePreview());
fs.writeFileSync(root + '/package.json', JSON.stringify({ main: 'main.cjs' }));
fs.writeFileSync(root + '/main.cjs', `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(root + '/profile')});app.whenReady().then(()=>{for(let i=0;i<3;i++)new BrowserWindow({width:1280,height:900,webPreferences:{partition:'preview-check-'+i,backgroundThrottling:false}}).loadURL('about:blank');});`);
(async () => {
  const { db, asUser } = await createWorkshopDB();
  await db.query('insert into public.sz_workshop_admins(user_id) values($1)', [U.admin]);
  const app = await _electron.launch({ executablePath: require('electron'), args: [root, '--no-sandbox', '--ozone-platform=headless', '--headless', '--disable-gpu'] });
  const errors = [], saved = new Map(), tokens = new Map(), writes = [];
  function session(account) {
    const now = Math.floor(Date.now() / 1000);
    const access_token = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: account.id, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now })).toString('base64url') + '.fixture-signature';
    tokens.set(access_token, account);
    return { access_token, refresh_token: 'fixture-refresh-' + account.id, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: { id: account.id, email: account.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { nickname: account.name }, created_at: new Date().toISOString() } };
  }
  async function installRoutes(page) {
    await page.routeWebSocket('**', ws => ws.close());
    await page.route('https://mvzlqpccmjslxdajjbfw.supabase.co/**', async route => {
      const request = route.request(), url = new URL(request.url()), body = request.postDataJSON(), user = tokens.get((request.headers().authorization || '').replace(/^Bearer /i, ''));
      const answer = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(value) });
      if (request.method() === 'OPTIONS') return answer({});
      if (url.pathname === '/auth/v1/health') return answer({ name: 'Auth fixture' });
      if (url.pathname === '/auth/v1/token') {
        const account = accounts.find(a => a.email === body?.email);
        return account && body.password === 'fixture-password' ? answer(session(account)) : answer({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }, 400);
      }
      if (url.pathname === '/auth/v1/user') return answer(session(user).user);
      if (url.pathname === '/auth/v1/logout') return answer({});
      if (url.pathname === '/rest/v1/saves') {
        if (request.method() === 'POST') { assert.equal(body.user_id, user.id); saved.set(user.id, { json: body.json }); writes.push(user.id); return answer(null, 201); }
        return answer(user && saved.has(user.id) ? [saved.get(user.id)] : []);
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const result = await requestWorkshopDB(asUser, user?.id || null, { rpc: url.pathname.split('/').pop(), args: body });
        return result.error ? answer(result.error, 403) : answer(result.data);
      }
      const table = url.pathname.split('/').pop();
      if (!table.startsWith('sz_workshop_')) return answer([]);
      const req = { table, select: url.searchParams.get('select') || '*', filters: [], limit: Number(url.searchParams.get('limit') || 200), offset: Number(url.searchParams.get('offset') || 0) };
      for (const [key, value] of url.searchParams) if (value.startsWith('eq.')) req.filters.push([key, value.slice(3)]);
      if (url.searchParams.has('order')) { const [key, direction] = url.searchParams.get('order').split('.'); req.order = [key, direction !== 'desc']; }
      const one = request.headers().accept?.includes('object+json');
      if (one) req.single = 'maybe';
      if (request.method() === 'POST') { req.insert = body; req.single = 'one'; }
      const result = await requestWorkshopDB(asUser, user?.id || null, req);
      if (result.error) return answer(result.error, 400);
      if (one && result.data === null) return answer({ code: 'PGRST116', details: 'The result contains 0 rows', message: 'Cannot coerce the result to a single JSON object' }, 406);
      return answer(result.data, request.method() === 'POST' ? 201 : 200);
    });
  }
  async function signIn(page, account) {
    await page.fill('#preview-email', account.email);
    await page.fill('#preview-password', 'fixture-password');
    await page.click('#preview-login-submit');
    await page.waitForFunction(id => SBU?.id === id && window.szDesktopCloudReady() && COMMUNITY.ready && !COMMUNITY_REFRESH && document.getElementById('preview-account-dialog').hidden, account.id);
  }
  try {
    let pages = app.windows();
    while (pages.length < 3) { await new Promise(r => setTimeout(r, 30)); pages = app.windows(); }
    const [author, admin, desktop] = pages;
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().forEach(w => { w.setBounds({x:0,y:0,width:1280,height:900}); w.show(); }));
    for (const page of pages) { await page.setViewportSize({width:1280,height:900}); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept()); await installRoutes(page); }
    await author.goto('file://' + root + '/index.html');
    await author.waitForFunction(() => !!sb && !!window.SZ_TEST_PREVIEW);
    const baseline = await author.evaluate(() => JSON.parse(JSON.stringify(DB)));
    for (const account of accounts) saved.set(account.id, { json: { ...baseline, cur: account.name, ts: 1, profiles: { [account.name]: { ...baseline.profiles[baseline.cur], name: account.name, wallet: 4321 } } } });
    assert.equal(await author.locator('#preview-account-dialog').isVisible(), true);
    if (process.env.STRIKEZONE_PREVIEW_SHOTS) await author.screenshot({path:path.join(process.env.STRIKEZONE_PREVIEW_SHOTS,'login-form.png')});
    assert.equal(await author.getByRole('button', { name: 'Mam kod właściciela' }).count(), 0);
    await author.fill('#preview-email', accounts[0].email); await author.fill('#preview-password', 'wrong-fixture'); await author.click('#preview-login-submit');
    await author.waitForFunction(() => document.getElementById('preview-login-message').textContent.includes('Nieprawidłowy'));
    assert.equal(await author.inputValue('#preview-password'), '');
    assert.equal(await author.evaluate(() => SBU), null);
    await signIn(author, accounts[0]);
    assert.equal(await author.evaluate(() => P().wallet), 4321);
    assert.equal(writes.length, 0, 'Login must read the existing save before uploading');
    assert.equal(await author.evaluate(() => COMMUNITY.admin), false);
    await author.evaluate(() => { creatorTab('maps'); creatorState().map.name = 'Mapa z testowego logowania'; });
    await author.click('[data-cw-submit]');
    await author.waitForFunction(() => COMMUNITY.mine.length === 1 && !COMMUNITY.busy);
    const id = await author.evaluate(() => COMMUNITY.mine[0].id);
    console.log('PASS visible test login, invalid credentials, cleared password, safe existing save and map submission');
    await admin.goto('file://' + root + '/index.html'); await admin.waitForFunction(() => !!sb); await signIn(admin, accounts[1]);
    assert.equal(await admin.evaluate(() => COMMUNITY.admin && COMMUNITY.tab === 'moderation'), true);
    assert.equal(await admin.getByRole('button', { name: 'Mam kod właściciela' }).count(), 0);
    await admin.evaluate(id => communityDetails(id, 'moderation'), id);
    await admin.getByRole('button', { name: 'Zatwierdź i opublikuj' }).click();
    await admin.waitForFunction(() => COMMUNITY.rows.length === 1 && !COMMUNITY.busy);
    await author.evaluate(() => communityRefresh());
    assert.equal(await author.evaluate(() => COMMUNITY.mine[0].status), 'approved');
    console.log('PASS account-assigned moderation without code and approval visible to the author');
    if (process.env.STRIKEZONE_PREVIEW_SHOTS) { await admin.screenshot({ path: path.join(process.env.STRIKEZONE_PREVIEW_SHOTS, 'logged-in-moderation.png') }); }
    await author.click('[data-preview-action=logout]');
    await author.waitForFunction(() => !SBU && !COMMUNITY.admin && !COMMUNITY.mine.length);
    await author.click('[data-preview-action=login]'); await signIn(author, accounts[2]);
    assert.equal(await author.evaluate(() => P().name), accounts[2].name);
    assert.equal(await author.evaluate(() => COMMUNITY.mine.length), 0);
    assert.equal(await author.evaluate(() => COMMUNITY.admin), false);
    console.log('PASS logout and a second account have separate profiles and no inherited moderation');
    const desktopSession = session(accounts[1]);
    await desktop.addInitScript(tokens => { window.strikeZoneDesktop = { session: async () => tokens, onSession() {}, profile: async () => {}, launcher: async () => {}, fullscreen: async () => {} }; }, { access_token: desktopSession.access_token, refresh_token: desktopSession.refresh_token });
    await desktop.goto('file://' + path.join(repo, 'game/index.html'));
    await desktop.waitForFunction(() => window.szDesktopCloudReady?.() && COMMUNITY.admin && document.getElementById('desktop-account-loading').hidden);
    await desktop.evaluate(() => { document.getElementById('splash').style.display = 'none'; tab('prof'); });
    assert.equal(await desktop.locator('#preview-account-dialog,#preview-login-form,#em,#pw,input[type=password]').count(), 0);
    assert.equal(await desktop.evaluate(() => !!window.SZ_TEST_PREVIEW), false);
    assert.match(await desktop.locator('#main').innerText(), /Konto jest zarządzane w launcherze/);
    assert.equal(await desktop.getByRole('button', { name: 'Mam kod właściciela' }).count(), 0);
    console.log('PASS public desktop receives launcher session and has no game login or owner-code control');
    assert.deepEqual(errors, []); completed = true; console.log('PASS all test HTML login and publication checks');
  } finally { await app.close(); await db.close(); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
