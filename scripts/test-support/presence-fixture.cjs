'use strict';
// Test-only Phoenix presence transport. Production uses the Supabase SDK unchanged.
const { WebSocketServer } = require('ws');
const { randomUUID } = require('node:crypto');
async function startPresenceFixture() {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise(resolve => server.once('listening', resolve));
  const connections = new Map();
  function send(ws, topic, event, payload, ref = null) { if (ws.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref })); }
  function state(topic) {
    const roster = {};
    for (const channels of connections.values()) for (const [name, ch] of channels) if (name === topic && ch.meta) {
      (roster[ch.key] ||= { metas: [] }).metas.push(ch.meta);
    }
    return roster;
  }
  function sync(topic) { for (const [ws, channels] of connections) if (channels.has(topic)) send(ws, topic, 'presence_state', state(topic)); }
  server.on('connection', ws => {
    const channels = new Map(); connections.set(ws, channels);
    ws.on('message', raw => {
      const m = JSON.parse(raw.toString()), reply = () => send(ws, m.topic, 'phx_reply', { status: 'ok', response: {} }, m.ref);
      if (m.event === 'phx_join') {
        channels.set(m.topic, { key: m.payload.config?.presence?.key || randomUUID() }); reply(); sync(m.topic);
      } else if (m.event === 'phx_leave') { channels.delete(m.topic); reply(); sync(m.topic); }
      else if (m.event === 'presence') {
        const ch = channels.get(m.topic);
        if (ch) ch.meta = m.payload.event === 'track' ? { ...m.payload.payload, phx_ref: randomUUID() } : null;
        reply(); sync(m.topic);
      } else if (m.event === 'broadcast') { for (const [peer, rooms] of connections) if (peer !== ws && rooms.has(m.topic)) send(peer, m.topic, 'broadcast', m.payload); reply(); } else reply();
    });
    ws.on('close', () => { const topics = [...channels.keys()]; connections.delete(ws); for (const topic of topics) sync(topic); });
  });
  return { endpoint: 'ws://127.0.0.1:' + server.address().port + '/websocket',
    disconnect: () => { for (const ws of connections.keys()) ws.terminate(); },
    close: async () => { for (const ws of connections.keys()) ws.terminate(); await new Promise(resolve => server.close(resolve)); } };
}
async function connectPresenceFixture(electron, endpoint, moduleFile) {
  await electron.evaluate(({ app }, options) => {
    const requireApp = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
    const cls = requireApp(options.moduleFile || './core/friends.cjs').FriendsController, connect = cls.prototype.connect;
    cls.prototype.connect = function () { this.client.realtime.endPoint = options.endpoint; return connect.call(this); };
  }, { endpoint, moduleFile });
}
module.exports = { startPresenceFixture, connectPresenceFixture };
