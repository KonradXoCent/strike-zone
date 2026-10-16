'use strict';
const fs = require('node:fs');

function normalizeConfig(raw = {}) {
  if (raw.enabled !== true) return { enabled: false, required: raw.required === true };
  if (raw.provider === 'github') {
    const owner = String(raw.owner || '');
    const repo = String(raw.repo || '');
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) ||
        !/^[A-Za-z0-9_.-]{1,100}$/.test(repo)) {
      throw new Error('Nieprawidłowa nazwa repozytorium aktualizacji.');
    }
    return { enabled: true, required: raw.required !== false, provider: 'github', owner, repo, releaseType: 'release' };
  }
  if (raw.provider !== 'generic') throw new Error('Nieznany rodzaj serwera aktualizacji.');
  const url = new URL(String(raw.url || ''));
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new Error('Serwer aktualizacji musi mieć adres HTTPS bez hasła i parametrów.');
  }
  return { enabled: true, required: raw.required !== false, provider: 'generic', url: url.href.replace(/\/+$/, '') + '/' };
}

function loadConfig(paths) {
  for (const file of paths) {
    if (fs.existsSync(file)) return normalizeConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return { enabled: false, required: true };
}

function providerConfig(config) {
  const { enabled, required, ...provider } = normalizeConfig(config);
  return enabled ? provider : null;
}

module.exports = { normalizeConfig, loadConfig, providerConfig };
