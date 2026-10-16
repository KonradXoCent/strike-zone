'use strict';
const { EventEmitter } = require('node:events');
const { providerConfig } = require('./config.cjs');

class UpdateController extends EventEmitter {
  constructor({ updater, config, version, packaged, platform = process.platform }) {
    super();
    this.updater = updater;
    this.required = packaged && platform === 'win32' && config.required === true;
    this.state = { version, latestVersion: null, phase: 'disabled', progress: 0,
      transferred: 0, total: 0, bytesPerSecond: 0, releaseNotes: '', error: null,
      required: this.required };
    this.active = false;
    this.checkPromise = null;
    if (!packaged || platform !== 'win32' || !config.enabled) {
      if (this.required) {
        this.state.phase = 'error';
        this.state.error = 'Brak poprawnej konfiguracji wymaganych aktualizacji.';
      }
      return;
    }
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.setFeedURL(providerConfig(config));
    this.active = true;
    this.state.phase = 'idle';
    updater.on('checking-for-update', () => this.set({ phase: 'checking', error: null }));
    updater.on('update-available', info => this.set({ phase: 'available', latestVersion: info.version,
      releaseNotes: plainNotes(info.releaseNotes), error: null }));
    updater.on('update-not-available', () => this.set({ phase: 'current', error: null }));
    updater.on('download-progress', progress => this.set({ phase: 'downloading',
      progress: Math.max(0, Math.min(100, Number(progress.percent) || 0)),
      transferred: progress.transferred, total: progress.total, bytesPerSecond: progress.bytesPerSecond }));
    updater.on('update-downloaded', info => this.set({ phase: 'downloaded', progress: 100,
      latestVersion: info.version, error: null }));
    updater.on('error', () => this.failed());
  }
  set(patch) { Object.assign(this.state, patch); this.emit('state', this.snapshot()); }
  canPlay() {
    if (this.required) return this.active && this.state.phase === 'current';
    return !['downloading', 'downloaded', 'installing'].includes(this.state.phase);
  }
  snapshot() { return { ...this.state, canPlay: this.canPlay() }; }
  failed() {
    this.set({ phase: 'error', error: 'Nie udało się pobrać aktualizacji. Sprawdź połączenie lub spróbuj później.' });
  }
  async check() {
    if (!this.active || ['downloading', 'downloaded', 'installing'].includes(this.state.phase)) return this.snapshot();
    if (this.checkPromise) return this.checkPromise;
    this.set({ phase: 'checking', error: null });
    this.checkPromise = (async () => {
      try { await this.updater.checkForUpdates(); } catch { this.failed(); }
      return this.snapshot();
    })();
    try { return await this.checkPromise; } finally { this.checkPromise = null; }
  }
  async download() {
    if (!this.active || this.state.phase !== 'available') return this.snapshot();
    this.set({ phase: 'downloading', progress: 0, error: null });
    try { await this.updater.downloadUpdate(); } catch { this.failed(); }
    return this.snapshot();
  }
  install() {
    if (!this.active || this.state.phase !== 'downloaded') return false;
    this.set({ phase: 'installing' });
    this.updater.quitAndInstall(true, true);
    return true;
  }
}

function plainNotes(notes) {
  const text = Array.isArray(notes) ? notes.map(n => n.note || '').join('\n') : String(notes || '');
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').slice(0, 12000);
}
module.exports = { UpdateController, plainNotes };
