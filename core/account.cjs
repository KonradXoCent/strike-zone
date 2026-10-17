'use strict';
const { EventEmitter } = require('node:events');

function profileView(profile = {}, user = {}) {
  const name = String(profile.name || user.user_metadata?.nickname || 'Gracz').replace(/[<>&"']/g, '').trim().slice(0, 14) || 'Gracz';
  const avatar = String(profile.av || '😎').slice(0, 16);
  const image = typeof profile.avimg === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(profile.avimg) && profile.avimg.length < 200000 ? profile.avimg : null;
  return { name, avatar, image };
}
function authMessage(error) {
  const message = String(error?.message || error || '');
  if (/invalid login|invalid credentials/i.test(message)) return 'Nieprawidłowy e-mail lub hasło.';
  if (/email not confirmed/i.test(message)) return 'Potwierdź adres e-mail, a następnie się zaloguj.';
  if (/already registered|already been registered/i.test(message)) return 'To konto już istnieje. Zaloguj się.';
  if (/rate limit|too many|after \d+ seconds/i.test(message)) return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  if (/password/i.test(message)) return 'Hasło nie spełnia wymagań. Użyj co najmniej 6 znaków.';
  if (/signup.*disabled|signups.*not allowed/i.test(message)) return 'Rejestracja jest obecnie wyłączona przez właściciela gry.';
  return 'Nie udało się połączyć z kontem. Sprawdź internet i spróbuj ponownie.';
}

class AccountController extends EventEmitter {
  constructor(client) {
    super(); this.client = client; this.session = null; this.busy = false;
    this.state = { phase: 'checking', user: null, error: null, notice: null };
    client.auth.onAuthStateChange((event, session) => {
      // Supabase holds its auth lock inside this callback; do no async SDK work here.
      if (event === 'TOKEN_REFRESHED') {
        this.session = session;
        setTimeout(() => this.emit('session', this.gameSession()), 0);
      } else if (event === 'SIGNED_OUT') {
        this.session = null;
        this.set({ phase: 'signed-out', user: null });
        setTimeout(() => this.emit('session', null), 0);
      }
    });
  }
  set(patch) { Object.assign(this.state, patch); this.emit('state', this.snapshot()); }
  snapshot() { return { ...this.state, authenticated: !!this.session && !!this.state.user }; }
  gameSession() { return this.session ? { access_token: this.session.access_token, refresh_token: this.session.refresh_token } : null; }
  async init() {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      if (data.session) await this.accept(data.session);
      else this.set({ phase: 'signed-out' });
    } catch (error) { this.session = null; this.set({ phase: 'signed-out', user: null, error: authMessage(error) }); }
  }
  async accept(session) {
    this.session = session;
    if (!await this.validate()) return;
    await this.refreshProfile();
    this.emit('session', this.gameSession());
  }
  async validate() {
    if (!this.session) return false;
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error || !data?.user || data.user.id !== this.session.user.id) throw error || new Error('Invalid session');
      this.set({ phase: 'signed-in', user: { id: data.user.id, email: data.user.email, ...profileView(this.state.user?.id === data.user.id ? { name: this.state.user.name, av: this.state.user.avatar, avimg: this.state.user.image } : {}, data.user) }, error: null });
      const current = await this.client.auth.getSession();
      if (current.data?.session) this.session = current.data.session;
      return true;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403 || /session missing|invalid.*token/i.test(error?.message || '')) {
        this.session = null; this.set({ phase: 'signed-out', user: null });
        this.emit('session', null);
      }
      this.set({ phase: this.state.user ? 'signed-in' : 'signed-out', error: authMessage(error) }); return false;
    }
  }
  async refreshProfile() {
    const user = this.session?.user;
    if (!user || !this.state.user) return;
    try {
      const { data, error } = await this.client.from('saves').select('json').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const saved = typeof data?.json === 'string' ? JSON.parse(data.json) : data?.json;
      const profile = saved?.profiles?.[saved.cur] || Object.values(saved?.profiles || {})[0];
      if (this.session?.user.id !== user.id) return;
      if (profile) this.updateProfile(profile);
      else {
        const fallback = await this.client.from('leaderboard').select('name,av,avimg').eq('user_id', user.id).maybeSingle();
        if (fallback.data && this.session?.user.id === user.id) this.updateProfile(fallback.data);
      }
    } catch { /* Auth remains usable; the game retries its own cloud read before any write. */ }
  }
  updateProfile(profile) {
    if (this.state.user) this.set({ user: { ...this.state.user, ...profileView(profile, this.session?.user) } });
  }
  async credentials(mode, input = {}) {
    if (this.busy || this.state.user) return this.snapshot();
    const email = String(input.email || '').trim(), password = String(input.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 512) {
      this.set({ error: 'Podaj prawidłowy e-mail i hasło.' }); return this.snapshot();
    }
    if (mode === 'signup' && password.length < 6) { this.set({ error: 'Hasło musi mieć co najmniej 6 znaków.' }); return this.snapshot(); }
    this.busy = true; this.set({ phase: 'working', error: null, notice: null });
    try {
      const result = mode === 'signup'
        ? await this.client.auth.signUp({ email, password, options: { data: { nickname: profileView({ name: input.nickname }).name } } })
        : await this.client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) await this.accept(result.data.session);
      else this.set({ phase: 'signed-out', notice: 'Sprawdź pocztę i potwierdź adres e-mail, a następnie zaloguj się tutaj.' });
    } catch (error) { this.set({ phase: this.session ? 'signed-in' : 'signed-out', error: authMessage(error) }); }
    finally { this.busy = false; }
    return this.snapshot();
  }
  async signOut() {
    if (this.busy) return this.snapshot();
    this.busy = true;
    try {
      const { error } = await this.client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      this.session = null; this.set({ phase: 'signed-out', user: null, error: null, notice: null });
      this.emit('session', null);
    } catch (error) { this.set({ error: authMessage(error) }); }
    finally { this.busy = false; }
    return this.snapshot();
  }
}
module.exports = { AccountController, profileView, authMessage };
