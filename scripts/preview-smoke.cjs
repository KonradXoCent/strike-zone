'use strict';
const { _electron } = require('playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { makePreview } = require('./prepare-preview.cjs');
const { createWorkshopDB, USERS: U, skinProject } = require('./test-support/workshop-db.cjs');
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
// Reproduce attachment viewers that allow game scripts but block data: script URLs.
fs.writeFileSync(root + '/index.html', makePreview().replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'unsafe-inline\'; connect-src *">'));
fs.writeFileSync(root + '/package.json', JSON.stringify({ main: 'main.cjs' }));
fs.writeFileSync(root + '/main.cjs', `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(root + '/profile')});app.whenReady().then(()=>{for(let i=0;i<3;i++)new BrowserWindow({width:1280,height:900,webPreferences:{partition:'preview-check-'+i,backgroundThrottling:false}}).loadURL('about:blank');});`);
(async () => {
  const { db, asUser } = await createWorkshopDB();
  await db.query('insert into public.sz_workshop_admins(user_id) values($1)', [U.admin]);
  const app = await _electron.launch({ executablePath: require('electron'), args: [root, '--no-sandbox', '--ozone-platform=headless', '--headless', '--disable-gpu'] });
  const errors = [], saved = new Map(), tokens = new Map(), writes = [];
  let healthChecks = 0, networkFailure = false;
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
      if (url.pathname === '/auth/v1/health') { healthChecks++; return answer({message:'Health probe unavailable'}, 503); }
      if (url.pathname === '/auth/v1/token') {
        if (networkFailure) return route.abort('internetdisconnected');
        const account = accounts.find(a => a.email === body?.email);
        return account && body.password === 'fixture-password' ? answer(session(account)) : answer({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }, 400);
      }
      if (url.pathname === '/auth/v1/user') return answer(session(user).user);
      if (url.pathname === '/auth/v1/logout') return answer({});
      if (url.pathname === '/rest/v1/saves') {
        if (request.method() === 'POST') { assert.equal(body.user_id, user.id); saved.set(user.id, { json: body.json });await db.query('insert into public.saves(user_id,json) values($1,$2) on conflict(user_id) do update set json=excluded.json',[user.id,body.json]); writes.push(user.id); return answer(null, 201); }
        return answer(user ? (await db.query('select json from public.saves where user_id=$1',[user.id])).rows : []);
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
    for (const account of accounts) {const json={...baseline,cur:account.name,ts:1,profiles:{[account.name]:{...baseline.profiles[baseline.cur],name:account.name,wallet:4321}}};saved.set(account.id,{json});await db.query('insert into public.saves(user_id,json) values($1,$2)',[account.id,json]);}
    assert.equal(await author.locator('#preview-account-dialog').isVisible(), true);
    assert.equal(await author.locator('#preview-login-submit').isEnabled(), true);
    assert.equal(healthChecks, 0, 'An unavailable health endpoint must not block signing in');
    if (process.env.STRIKEZONE_PREVIEW_SHOTS) await author.screenshot({path:path.join(process.env.STRIKEZONE_PREVIEW_SHOTS,'login-form.png')});
    assert.equal(await author.getByRole('button', { name: 'Mam kod właściciela' }).count(), 0);
    // A fetch that never settles must still release the actual login form.
    await author.evaluate(() => {
      window.__previewNativeFetch = window.fetch;
      window.fetch = (url, options) => String(url).includes('/auth/v1/token') ? new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => { window.__previewAbortObserved = true; reject(new DOMException('Aborted', 'AbortError')); }, {once:true})) : window.__previewNativeFetch(url, options);
    });
    await author.fill('#preview-email', accounts[0].email); await author.fill('#preview-password', 'fixture-password'); await author.click('#preview-login-submit');
    await author.waitForFunction(() => window.__previewAbortObserved && document.getElementById('preview-login-message').textContent.includes('Serwer kont nie odpowiedział'), null, {timeout:18000});
    assert.equal(await author.locator('#preview-login-submit').isEnabled(), true);
    await author.evaluate(() => { window.fetch = window.__previewNativeFetch; delete window.__previewNativeFetch; });
    await author.click('#preview-connect-retry');
    networkFailure = true;
    await author.fill('#preview-email', accounts[0].email); await author.fill('#preview-password', 'fixture-password'); await author.click('#preview-login-submit');
    await author.waitForFunction(() => document.getElementById('preview-login-message').textContent.includes('Serwer kont nie odpowiedział'));
    assert.equal(await author.locator('#preview-login-submit').isEnabled(), true);
    assert.equal(await author.locator('#preview-connect-retry').isVisible(), true);
    assert.equal(await author.inputValue('#preview-password'), '');
    networkFailure = false;
    await author.click('#preview-connect-retry');
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
    console.log('PASS inline SDK under a no-data CSP, no health gate, stalled-request timeout, network retry, invalid credentials, safe existing save and map submission');
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
    // Four approved projects cannot be bought; the fifth unlocks the real UI.
    async function publishSkin(n){const p=skinProject(require('node:crypto').randomUUID());p.name='Forge test '+n;p.colors=['#37cbb6','#845ddd','#cfedec'];const q=await asUser(U.author,tx=>tx.query("insert into public.sz_workshop_submissions(kind,project_id,payload) values('skin',$1,$2) returning id",[p.id,p]));await asUser(U.admin,tx=>tx.query("select public.sz_workshop_review($1,'approved','')",[q.rows[0].id]));}
    for(let n=0;n<4;n++)await publishSkin(n);
    await author.evaluate(async()=>{await communityRefresh();tab('shop');});
    assert.equal(await author.locator('[data-forge-buy]').isDisabled(),true);
    await author.evaluate(async()=>{await communityEquip(COMMUNITY.rows.find(r=>r.kind==='skin').release_id);if(communityOwnId('knife'))throw Error('Unowned skin equipped');});
    await publishSkin(4);await author.evaluate(()=>communityRefresh());
    assert.equal(await author.locator('[data-forge-buy]').isEnabled(),true);
    if(process.env.STRIKEZONE_PREVIEW_SHOTS)await author.screenshot({path:path.join(process.env.STRIKEZONE_PREVIEW_SHOTS,'forge-shop.png')});
    const walletBefore=await author.evaluate(()=>P().wallet);
    await author.click('[data-forge-buy]');
    await author.waitForFunction(()=>FORGE.cases.length===1&&!FORGE.busy);
    assert.equal(await author.evaluate(()=>P().wallet),walletBefore-2500);
    await author.evaluate(()=>{INV='w';tab('inv');});await author.click('[data-forge-open]');
    await author.waitForFunction(()=>!!CASE_PRESENTATION&&!FORGE.busy);
    assert.equal(await author.evaluate(()=>FORGE.owned.length),1);
    await author.locator('.case-dismiss').click();
    if(process.env.STRIKEZONE_PREVIEW_SHOTS)await author.screenshot({path:path.join(process.env.STRIKEZONE_PREVIEW_SHOTS,'forge-reveal.png')});
    await author.locator('.case-continue').click();
    assert.equal(await author.locator('[data-forge-equip]').count(),1);
    await author.locator('[data-forge-equip]').click();
    await author.waitForFunction(()=>!!communityOwnId('knife')&&!COMMUNITY.busy);
    if(process.env.STRIKEZONE_PREVIEW_SHOTS)await author.screenshot({path:path.join(process.env.STRIKEZONE_PREVIEW_SHOTS,'forge-owned.png')});
    const instance=await author.evaluate(()=>communityOwnRef('knife').owned);
    assert.equal(await author.evaluate(id=>FORGE.owned.some(o=>o.id===id),instance),true);
    await author.evaluate(()=>window.szDesktopFlush());await author.reload();
    await author.waitForFunction(()=>FORGE.ready&&FORGE.owned.length===1&&!!communityOwnId('knife'));
    assert.equal(await author.evaluate(()=>P().wallet),walletBefore-2500);
    assert.equal(await author.evaluate(()=>communityOwnRef('knife').owned),instance);
    console.log('PASS 4/5 lock, fifth approval, paid case purchase, centered reel, owned inventory, equip and reload');
    await author.evaluate(async()=>{presentationCommit(p=>{p.cs.agents=1;p.ks.agents=1;});const random=workshopRandom;workshopRandom=()=>0;try{openC2(CI.indexOf('agents'));caseShowResult();caseClosePresentation();SzAgents.equip('agent:ct_vanguard','CT');}finally{workshopRandom=random;}await window.szDesktopFlush();});
    const agentSave=(await asUser(U.author,tx=>tx.query('select json from public.saves where user_id=$1',[U.author]))).rows[0].json;
    const agentDB=typeof agentSave==='string'?JSON.parse(agentSave):agentSave;assert.deepEqual(agentDB.profiles[agentDB.cur].agents,{items:['agent:ct_vanguard'],eq:{CT:'agent:ct_vanguard'}});
    await author.reload();await author.waitForFunction(()=>window.szDesktopCloudReady()&&SzAgents.equipped('CT')?.id==='agent:ct_vanguard');assert.equal(await author.evaluate(()=>P().agents.items.length),1);
    console.log('PASS real SDK agent reward and team equipment persist in the authenticated JSON save and survive reload');

    await author.click('[data-preview-action=logout]');
    await author.waitForFunction(() => !SBU && !COMMUNITY.admin && !COMMUNITY.mine.length);
    await author.click('[data-preview-action=login]'); await signIn(author, accounts[2]);
    assert.equal(await author.evaluate(() => P().name), accounts[2].name);
    assert.equal(await author.evaluate(() => COMMUNITY.mine.length), 0);
    assert.equal(await author.evaluate(() => COMMUNITY.admin), false);
    assert.equal(await author.evaluate(()=>FORGE.owned.length),0);assert.equal(await author.evaluate(()=>SzAgents.equipped('CT')),null);
    console.log('PASS logout and a second account have separate profiles and no inherited moderation');
    const desktopSession = session(accounts[1]);
    await desktop.addInitScript(tokens => { window.strikeZoneDesktop = { getChat: async () => ({uid:null,threads:[],unread:0}), onChat() {}, getFriends: async () => ({list:[]}), onFriends() {}, getPreferences: async () => ({language:'pl',theme:'night'}), onPreferences() {}, session: async () => tokens, onSession() {}, profile: async () => {}, launcher: async () => {}, fullscreen: async () => {} }; }, { access_token: desktopSession.access_token, refresh_token: desktopSession.refresh_token });
    await desktop.goto('file://' + path.join(repo, 'game/index.html'));
    await desktop.waitForFunction(() => window.szDesktopCloudReady?.() && COMMUNITY.admin && document.getElementById('desktop-account-loading').hidden);
    await desktop.evaluate(() => { document.getElementById('splash').style.display = 'none'; tab('prof'); });
    assert.equal(await desktop.locator('#preview-account-dialog,#preview-login-form,#em,#pw,input[type=password]').count(), 0);
    assert.equal(await desktop.evaluate(() => !!window.SZ_TEST_PREVIEW), false);
    assert.match(await desktop.locator('#main').innerText(), /Konto jest zarządzane w launcherze/);
    assert.equal(await desktop.getByRole('button', { name: 'Mam kod właściciela' }).count(), 0);
    assert.equal(healthChecks, 0);
    console.log('PASS public desktop receives launcher session and has no game login or owner-code control');
    assert.deepEqual(errors, []); completed = true; console.log('PASS all test HTML login and publication checks');
  } finally { await app.close(); await db.close(); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
