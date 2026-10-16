'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AccountController, profileView } = require('../core/account.cjs');
const { launcherBounds } = require('../core/window-size.cjs');
function fixture({ confirmed = true } = {}) {
  const user = { id: 'user-a', email: 'player@example.test', user_metadata: { nickname: 'NewPlayer' } };
  const session = { user, access_token: 'access-secret', refresh_token: 'refresh-secret' };
  let current = null, listener, revoked = false;
  const client = { auth: {
    onAuthStateChange: fn => { listener = fn; },
    getSession: async () => ({ data: { session: current } }),
    getUser: async () => revoked ? { error: { status: 401, message: 'Invalid token' } } : { data: { user } },
    signInWithPassword: async input => input.password === 'correct' ? (current = session, { data: { session } }) : { error: { message: 'Invalid login credentials' } },
    signUp: async () => ({ data: { session: confirmed ? (current = session) : null } }),
    signOut: async () => { current = null; listener('SIGNED_OUT', null); return {}; }
  }, from: table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'saves' ? { json: { profiles: { Konrad: { name: 'Konrad', av: '🥷' } }, cur: 'Konrad' } } : null }) }) }) }) };
  return { account: new AccountController(client), session, revoke: () => { revoked = true; } };
}
test('existing account loads its game nickname and avatar without exposing tokens in launcher state', async () => {
  const { account } = fixture(); await account.init();
  assert.equal(account.snapshot().authenticated, false);
  await account.credentials('signin', { email: 'player@example.test', password: 'correct' });
  assert.equal(account.snapshot().user.name, 'Konrad'); assert.equal(account.snapshot().user.avatar, '🥷');
  assert.equal(account.snapshot().authenticated, true); assert(!JSON.stringify(account.snapshot()).includes('secret'));
  assert.equal(account.gameSession().access_token, 'access-secret');
});
test('wrong password cannot enable play and gets a Polish error', async () => {
  const { account } = fixture(); await account.init();
  await account.credentials('signin', { email: 'player@example.test', password: 'wrong' });
  assert.equal(account.snapshot().authenticated, false); assert.equal(account.gameSession(), null);
  assert.match(account.snapshot().error, /Nieprawidłowy/);
});
test('email-confirmation signup stays signed out and tells the player what to do', async () => {
  const { account } = fixture({ confirmed: false }); await account.init();
  await account.credentials('signup', { email: 'player@example.test', password: 'correct', nickname: 'Konrad' });
  assert.equal(account.snapshot().authenticated, false); assert.match(account.snapshot().notice, /potwierdź/);
});
test('server-side revocation invalidates the launch gate, and logout removes session', async () => {
  const f = fixture(); await f.account.init();
  await f.account.credentials('signin', { email: 'player@example.test', password: 'correct' });
  f.revoke(); assert.equal(await f.account.validate(), false); assert.equal(f.account.gameSession(), null);
  const other = fixture(); await other.account.init();
  await other.account.credentials('signin', { email: 'player@example.test', password: 'correct' });
  await other.account.signOut(); assert.equal(other.account.snapshot().authenticated, false);
});
test('avatar display accepts raster data only and limits nickname length', () => {
  assert.equal(profileView({ avimg: 'javascript:alert(1)', name: '<script>abcdefghijklmnop' }).image, null);
  assert.equal(profileView({ avimg: 'data:image/svg+xml;base64,PHN2Zz4=' }).image, null);
  assert(profileView({ name: 'abcdefghijklmnop' }).name.length <= 14);
});
test('launcher fits smaller work areas with space around the window', () => {
  for (const [width, height] of [[1920, 1040], [1366, 728], [1024, 728], [800, 560], [1280, 640]]) {
    const b = launcherBounds({ width, height, x: 0, y: 0 });
    assert(b.width < width); assert(b.height < height); assert(b.x > 0); assert(b.y > 0);
  }
});
