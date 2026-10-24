'use strict';
const { EventEmitter } = require('node:events');
const { profileView } = require('./account.cjs');
const Friendship = require('../shared/friendships.js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AVATAR_LIMIT = 24000;

function publicProfile(input = {}) {
  const profile = profileView(input);
  if (profile.image?.length > AVATAR_LIMIT) profile.image = null;
  return profile;
}

class FriendsController extends EventEmitter {
  constructor(client, { heartbeatMs = 10000, refreshMs = 8000, retryMs = 4000 } = {}) {
    super();
    Object.assign(this, { client, heartbeatMs, refreshMs, retryMs });
    this.uid = null; this.epoch = 0; this.channel = null; this.user = null;
    this.list = []; this.profiles = new Map(); this.phase = 'signed-out';
    this.synced = false; this.subscribed = false; this.refreshing = false;
    this.error = null; this.gameRunning = false;
    this.requests = { incoming: [], outgoing: [] }; this.requestError = null;
  }
  changed() { this.emit('state'); }
  snapshot(owner = this.uid) {
    if (!this.uid || owner !== this.uid) return { phase: 'signed-out', list: [], online: 0, refreshing: false, error: null };
    const known = this.synced && this.subscribed;
    const roster = known ? this.channel?.presenceState() || {} : {};
    const list = this.list.map(friend => {
      const peers = Array.isArray(roster[friend.friend_id]) ? roster[friend.friend_id] : [];
      const peer = peers.find(p => p.match === true) || peers.find(p => p.app === 'game') || peers[0];
      const saved = this.profiles.get(friend.friend_id) || {};
      const avatarPeer = peers.find(p => publicProfile(p).image);
      const profile = publicProfile({ name: peer?.n || saved.name || friend.name, av: peer?.av || saved.av,
        avimg: avatarPeer?.avimg || saved.avimg });
      return { id: friend.friend_id, ...profile, status: !known ? 'unknown' : peer ? 'online' : 'offline',
        activity: !peer ? null : peer.match === true ? 'match' : peer.l ? 'lobby' : peer.app === 'launcher' ? 'launcher' : peer.app === 'game' ? 'menu' : 'online',
        mode: typeof peer?.mode === 'string' ? peer.mode.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) : null };
    }).sort((a, b) => Number(b.status === 'online') - Number(a.status === 'online') || a.name.localeCompare(b.name, 'pl'));
    return { phase: this.phase, list, online: list.filter(f => f.status === 'online').length,
      refreshing: this.refreshing, error: this.error, requests: this.requests, requestError: this.requestError, actionMessage: this.actionMessage || null };
  }
  setAccount(account) {
    const user = account?.authenticated && account.user;
    const uid = user && UUID.test(user.id) ? user.id : null;
    if (uid !== this.uid) {
      this.dispose();
      if (!uid) { this.changed(); return; }
      this.uid = uid; this.user = user; this.phase = 'connecting';
      this.connect(); this.refresh();
      this.heartbeat = setInterval(() => this.track(), this.heartbeatMs); this.heartbeat.unref?.();
      this.refreshTimer = setInterval(() => this.refresh(), this.refreshMs); this.refreshTimer.unref?.();
      this.changed();
    } else if (uid) {
      const changed = ['name', 'avatar', 'image'].some(key => user[key] !== this.user?.[key]);
      this.user = user;
      if (changed) this.track();
    }
  }
  setGameRunning(value) {
    if (this.gameRunning === !!value) return;
    this.gameRunning = !!value; this.track();
  }
  connect() {
    if (!this.uid) return;
    const epoch = this.epoch;
    const channel = this.client.channel('sz-online', { config: { presence: { key: this.uid } } });
    this.channel = channel; this.subscribed = this.synced = false;
    const active = () => this.epoch === epoch && this.channel === channel;
    channel.on('presence', { event: 'sync' }, () => {
      if (!active()) return;
      this.synced = true;
      if (this.subscribed) this.phase = 'ready';
      this.changed();
    }).subscribe(status => {
      if (!active()) return;
      if (status === 'SUBSCRIBED') {
        clearTimeout(this.retry); this.retry = null;
        this.subscribed = true; this.phase = this.synced ? 'ready' : 'connecting'; this.track();
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) this.reconnect();
      this.changed();
    });
  }
  reconnect() {
    if (!this.uid) return;
    this.subscribed = this.synced = false; this.phase = 'reconnecting';
    if (!this.retry) {
      const epoch = this.epoch;
      this.retry = setTimeout(() => {
        this.retry = null;
        if (epoch !== this.epoch || !this.uid) return;
        const old = this.channel; this.channel = null;
        if (old) Promise.resolve(this.client.removeChannel(old)).catch(() => {});
        this.connect(); this.changed();
      }, this.retryMs);
      this.retry.unref?.();
    }
    this.changed();
  }
  async track() {
    const channel = this.channel, epoch = this.epoch;
    if (!channel || !this.subscribed || !this.user) return;
    const p = publicProfile({ name: this.user.name, av: this.user.avatar, avimg: this.user.image });
    try {
      const result = await channel.track({ n: p.name, av: p.avatar, avimg: p.image,
        app: this.gameRunning ? 'game' : 'launcher', match: false, l: null, at: Date.now() });
      if (this.epoch === epoch && this.channel === channel && result !== 'ok') this.reconnect();
    } catch { if (this.epoch === epoch && this.channel === channel) this.reconnect(); }
  }
  async refresh() {
    if (!this.uid || this.refreshing) return;
    const epoch = this.epoch, uid = this.uid;
    this.refreshing = true; this.changed();
    try {
      const result = await this.client.from('friends').select('friend_id,name').eq('user_id', uid);
      if (result.error) throw result.error;
      if (epoch !== this.epoch) return;
      const seen = new Set();
      const list = (result.data || []).filter(f => UUID.test(f.friend_id) && f.friend_id !== uid && !seen.has(f.friend_id) && seen.add(f.friend_id));
      const profiles = new Map(); let avatarError = false;
      for (let offset = 0; offset < list.length; offset += 100) {
        const rows = await this.client.from('leaderboard').select('user_id,name,av,avimg').in('user_id', list.slice(offset, offset + 100).map(f => f.friend_id));
        if (epoch !== this.epoch) return;
        if (rows.error) avatarError = true;
        else for (const row of rows.data || []) if (seen.has(row.user_id)) profiles.set(row.user_id, row);
      }
      this.list = list; this.profiles = profiles;
      this.error = avatarError ? 'Nie udało się odświeżyć części awatarów. Spróbuj ponownie.' : null;
      if (this.client.rpc) {
        try { const value = await Friendship.call(this.client, 'list'); if (epoch === this.epoch) { this.requests = { incoming: value.incoming || [], outgoing: value.outgoing || [] }; this.requestError = null; } }
        catch (error) { if (epoch === this.epoch) this.requestError = Friendship.message(error); }
      }
    } catch {
      if (epoch === this.epoch) this.error = 'Nie udało się odświeżyć znajomych. Spróbuj ponownie.';
    } finally {
      if (epoch === this.epoch) { this.refreshing = false; this.changed(); }
    }
  }
  async command(action, args) {
    if (!this.uid) throw Error('FRIEND_LOGIN');
    const epoch = this.epoch;
    try { await Friendship.call(this.client, action, args); if (epoch === this.epoch) this.actionMessage = action === 'request' ? 'Zaproszenie wysłane. Czekamy na akceptację.' : action === 'accept' ? 'Zaproszenie zaakceptowane. Jesteście znajomymi.' : 'Lista znajomych została zaktualizowana.'; }
    catch (error) { if (epoch === this.epoch) this.actionMessage = Friendship.message(error); }
    if (epoch === this.epoch) { await this.refresh(); this.changed(); }
  }
  dispose() {
    this.epoch++;
    clearInterval(this.heartbeat); clearInterval(this.refreshTimer); clearTimeout(this.retry);
    this.heartbeat = this.refreshTimer = this.retry = null;
    const old = this.channel; this.channel = null;
    this.uid = this.user = null; this.list = []; this.profiles = new Map();
    this.phase = 'signed-out'; this.subscribed = this.synced = this.refreshing = false; this.error = null;
    this.requests = { incoming: [], outgoing: [] }; this.requestError = this.actionMessage = null;
    if (old) Promise.resolve(this.client.removeChannel(old)).catch(() => {});
  }
}
module.exports = { FriendsController, publicProfile, AVATAR_LIMIT };
