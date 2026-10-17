'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FriendsController, publicProfile } = require('../core/friends.cjs');
const U = '10000000-0000-4000-8000-000000000001', A = '10000000-0000-4000-8000-000000000002', B = '10000000-0000-4000-8000-000000000003';
const png = 'data:image/png;base64,aGVsbG8=';
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const channels = [], queries = [], removed = [];
  let rows = [{ friend_id: A, name: 'Alpha' }, { friend_id: B, name: 'Bravo' }], response, error, avatarError;
  const client = {
    from: table => ({ select: columns => ({
      eq: async (key, uid) => { queries.push({ table, columns, key, uid }); if (response) await response; return { data: rows, error }; },
      in: async (key, ids) => { queries.push({ table, columns, key, ids }); return { data: [{ user_id: A, name: 'Alpha', av: '🥷', avimg: png }, { user_id: B, name: 'Bravo', av: '🐺' }], error: avatarError }; }
    }) }),
    channel: (topic, config) => {
      const ch = { topic, config, roster: {}, tracks: [],
        on: (type, event, fn) => { ch.sync = fn; return ch; },
        subscribe: fn => { ch.status = fn; return ch; },
        track: async p => { ch.tracks.push(p); return ch.trackResult || 'ok'; }, presenceState: () => ch.roster };
      channels.push(ch); return ch;
    }, removeChannel: async ch => { removed.push(ch); }
  };
  const friends = new FriendsController(client, { retryMs: 10 });
  const login = id => friends.setAccount({ authenticated: true, user: { id, name: 'Player', avatar: '😎', image: png, email: 'private@example.test' } });
  return { friends, channels, queries, removed, login, setRows: r => { rows = r; }, setResponse: p => { response = p; }, setError: e => { error = e; }, setAvatarError: e => { avatarError = e; } };
}
test('launcher reads only its own friend list and public profiles; unknown is distinct from offline', async t => {
  const f = fixture(); t.after(() => f.friends.dispose()); f.login(U); await flush();
  let state = f.friends.snapshot(); assert.equal(state.list.length, 2); assert(state.list.every(p => p.status === 'unknown'));
  assert.equal(f.queries[0].uid, U); assert(!f.queries.some(q => q.table === 'saves'));
  assert.equal(state.list[0].image, png);
  const ch = f.channels[0]; assert.equal(ch.topic, 'sz-online'); assert.equal(ch.config.config.presence.key, U);
  ch.status('SUBSCRIBED'); ch.roster = { [A]: [{ n: 'Alpha', app: 'launcher' }] }; ch.sync(); await flush();
  state = f.friends.snapshot(); assert.equal(state.online, 1); assert.deepEqual(state.list.map(p => p.status), ['online', 'offline']);
  assert.equal(ch.tracks[0].app, 'launcher'); assert(!JSON.stringify(ch.tracks).includes('private@'));
  assert(!JSON.stringify(state).includes('token')); assert.equal(state.list[0].image, png);
});
test('multiple game and launcher sessions prefer a match; quitting one session keeps the friend online', async t => {
  const f = fixture(); t.after(() => f.friends.dispose()); f.login(U); await flush();
  const ch = f.channels[0]; ch.status('SUBSCRIBED');
  ch.roster = { [A]: [{ n: 'Alpha', app: 'launcher' }, { n: 'Alpha', app: 'game', match: true, mode: 'ctf', avimg: png }] }; ch.sync();
  assert.equal(f.friends.snapshot().list[0].activity, 'match'); assert.equal(f.friends.snapshot().list[0].mode, 'ctf');
  ch.roster[A].pop(); ch.sync(); assert.equal(f.friends.snapshot().list[0].status, 'online'); assert.equal(f.friends.snapshot().list[0].activity, 'launcher');
  delete ch.roster[A]; ch.sync(); assert(f.friends.snapshot().list.every(p => p.status === 'offline'));
  f.friends.setGameRunning(true); await flush(); assert.equal(ch.tracks.at(-1).app, 'game'); assert.equal(ch.tracks.at(-1).match, false);
});
test('failed presence becomes unknown and reconnects; old callbacks cannot mutate the new channel', async t => {
  const f = fixture(); t.after(() => f.friends.dispose()); f.login(U); await flush();
  const old = f.channels[0]; old.status('SUBSCRIBED'); old.roster = { [A]: [{}] }; old.sync();
  old.status('CHANNEL_ERROR'); assert.equal(f.friends.snapshot().phase, 'reconnecting'); assert(f.friends.snapshot().list.every(p => p.status === 'unknown'));
  await new Promise(resolve => setTimeout(resolve, 25)); const ch = f.channels.at(-1); assert.notEqual(ch, old); assert(f.removed.includes(old));
  ch.status('SUBSCRIBED'); ch.roster = { [B]: [{}] }; ch.sync(); old.sync(); old.status('CLOSED');
  assert.equal(f.friends.snapshot().phase, 'ready'); assert.equal(f.friends.snapshot().list[0].id, B);
  ch.trackResult = 'timed out'; await f.friends.track(); assert.equal(f.friends.snapshot().phase, 'reconnecting');
});
test('logout and account changes clear previous friends and ignore in-flight queries', async t => {
  const f = fixture(); t.after(() => f.friends.dispose()); let release;
  f.setResponse(new Promise(resolve => { release = resolve; })); f.login(U);
  assert.equal(f.friends.snapshot(A).list.length, 0);
  f.friends.setAccount({ authenticated: false }); release(); await flush();
  assert.equal(f.friends.snapshot().phase, 'signed-out'); assert.deepEqual(f.friends.snapshot().list, []);
  f.setResponse(null); f.setRows([]); f.login(A); await flush();
  f.channels[0].status('SUBSCRIBED'); f.channels[0].sync();
  assert.equal(f.friends.uid, A); assert.deepEqual(f.friends.snapshot().list, []);
});
test('friend refresh failure preserves previous list and avatars are raster, bounded and escaped', async t => {
  const f = fixture(); t.after(() => f.friends.dispose()); f.login(U); await flush();
  f.setError({ message: 'private database error' }); await f.friends.refresh();
  assert.equal(f.friends.snapshot().list.length, 2); assert.match(f.friends.snapshot().error, /odświeżyć/);
  assert(!JSON.stringify(f.friends.snapshot()).includes('private database'));
  for (const image of ['javascript:alert(1)', 'data:image/svg+xml;base64,aGVsbG8=', 'data:image/png;base64,' + 'A'.repeat(25000)]) assert.equal(publicProfile({ avimg: image }).image, null);
  assert.equal(publicProfile({ avimg: png }).image, png); assert(!publicProfile({ name: '<script>evil' }).name.includes('<'));
});
