'use strict';
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM5kAAAAASUVORK5CYII=';
async function startFixture({ friends = [], profiles = [], userId = randomUUID(), chatRPC = null, bonusRPC = null, friendsRPC = null, friendsRead = null, hubRPC = null } = {}) {
  const users = new Map(), saves = new Map(), writes = [];
  const email = 'desktop-smoke@example.test', password = 'SmokePass123!';
  const user = { id: userId, email, aud: 'authenticated', role: 'authenticated', email_confirmed_at: new Date().toISOString(), user_metadata: { nickname: 'KonradQA' }, app_metadata: { provider: 'email' }, identities: [] };
  users.set(email, user);
  saves.set(user.id, { profiles: { KonradQA: { name: 'KonradQA', av: '🥷', avimg: png, wallet: 4242, cases: 1, keys: 1, skins: [], eq: {}, kills: 0, deaths: 0, wins: 0, matches: 0 } }, cur: 'KonradQA', ts: 10 });
  function token(u) { return Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString('base64url') + '.test-signature'; }
  function session(u) { return { access_token: token(u), refresh_token: 'fixture-refresh-' + u.id, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: u }; }
  function request(method, url, body = '', headers = {}) {
    const u = new URL(url, 'http://fixture'), data = body ? JSON.parse(body) : {};
    const bearer = headers.authorization || headers.Authorization || '';
    let id; try { id = JSON.parse(Buffer.from(bearer.replace(/^Bearer /i, '').split('.')[1], 'base64url')).sub; } catch {}
    const actor = [...users.values()].find(u => u.id === id);
    if (u.pathname.endsWith('/rpc/zone_hub') && hubRPC) return hubRPC(actor?.id, data.action, data.args).then(value => ({ status: 200, body: JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })).catch(error => ({ status: 400, body: JSON.stringify({ message: error.message }), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    if (u.pathname.endsWith('/rpc/sz_friends') && friendsRPC) return friendsRPC(actor?.id, data.action, data.args).then(value => ({ status: 200, body: JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })).catch(error => ({ status: 400, body: JSON.stringify({ message: error.message }), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    if (u.pathname.endsWith('/friends') && friendsRead && method === 'GET') return friendsRead(actor?.id).then(value => ({ status: 200, body: JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    if (u.pathname.endsWith('/rpc/sz_bonus_redeem') && bonusRPC) return bonusRPC(actor?.id, data).then(value => ({ status: 200, body: JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })).catch(error => ({ status: 400, body: JSON.stringify({ message: error.message }), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    if (u.pathname.endsWith('/rpc/sz_chat') && chatRPC) return chatRPC(actor?.id, data.action, data.args).then(value => ({ status: 200, body: JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })).catch(error => ({ status: 400, body: JSON.stringify({ message: error.message }), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    let status = 200, value = {};
    if (method === 'OPTIONS') status = 204;
    else if (u.pathname.endsWith('/health')) value = { name: 'GoTrue', version: 'fixture' };
    else if (u.pathname.endsWith('/token')) {
      const found = users.get(data.email);
      if (u.searchParams.get('grant_type') === 'refresh_token') {
        const refreshUser = [...users.values()].find(u => data.refresh_token === 'fixture-refresh-' + u.id);
        if (refreshUser) value = session(refreshUser); else { status = 400; value = { msg: 'Invalid refresh token' }; }
      } else if (found && data.password === password) value = session(found);
      else { status = 400; value = { code: 'invalid_credentials', msg: 'Invalid login credentials' }; }
    } else if (u.pathname.endsWith('/user')) {
      if (actor) value = actor; else { status = 401; value = { msg: 'Invalid token' }; }
    } else if (u.pathname.endsWith('/signup')) {
      const created = { ...user, id: randomUUID(), email: data.email, user_metadata: data.data || {} };
      users.set(data.email, created);
      value = data.email.startsWith('confirm') ? created : session(created);
    } else if (u.pathname.endsWith('/logout')) status = 204;
    else if (u.pathname.endsWith('/saves')) {
      if (!actor) { status = 401; value = { message: 'No session' }; }
      else if (method === 'GET') value = saves.has(actor.id) ? { json: saves.get(actor.id) } : null;
      else { saves.set(actor.id, data.json); writes.push(data); status = 201; }
    } else if (u.pathname.endsWith('/leaderboard')) value = method === 'GET' ? (u.searchParams.has('user_id') && u.searchParams.get('user_id').startsWith('in.') ? profiles : null) : {};
    else if (u.pathname.endsWith('/friends')) value = actor?.id === user.id ? friends : [];
    return { status, body: status === 204 ? '' : JSON.stringify(value), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } };
  }
  const server = http.createServer((req, res) => { let body = ''; req.on('data', b => { body += b; }); req.on('end', async () => { try { const result = await request(req.method, req.url, body, req.headers); res.writeHead(result.status, result.headers); res.end(result.body); } catch (e) { res.writeHead(500); res.end(JSON.stringify({ message: e.message })); } }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  // Chromium may preconnect without sending HTTP headers. Such sockets survive
  // server.close() and otherwise leave GUI checks waiting indefinitely at cleanup.
  return { base: 'http://127.0.0.1:' + server.address().port, request, user, users, email, password, writes, saves, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
async function connectFixture(electron, fixture) {
  // Inject only through the debugger in this test, never via a production flag or IPC API.
  await electron.evaluate(({ net }, base) => {
    const original = net.fetch.bind(net);
    net.fetch = (input, options) => { const url = String(input); return original(url.startsWith('https://mvzlqpccmjslxdajjbfw.supabase.co/') ? base + new URL(url).pathname + new URL(url).search : input, options); };
  }, fixture.base);
  await electron.context().route('https://mvzlqpccmjslxdajjbfw.supabase.co/**', async route => {
    const req = route.request(); const result = await fixture.request(req.method(), req.url(), req.postData() || '', req.headers());
    await route.fulfill(result);
  });
}
module.exports = { startFixture, connectFixture };
