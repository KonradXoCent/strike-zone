'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Windows uses DPAPI through Electron safeStorage. Never fall back to plaintext tokens.
function createAuthStorage(file, safeStorage) {
  const memory = new Map();
  const secure = () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend?.() !== 'basic_text');
  return {
    getItem(key) {
      if (!secure()) return memory.get(key) || null;
      try { const record = JSON.parse(fs.readFileSync(file, 'utf8')); return record.key === key ? safeStorage.decryptString(Buffer.from(record.value, 'base64')) : null; }
      catch { return null; }
    },
    setItem(key, value) {
      if (!secure()) { memory.set(key, value); return; }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const record = JSON.stringify({ key, value: safeStorage.encryptString(value).toString('base64') });
      fs.writeFileSync(file + '.tmp', record, { mode: 0o600 });
      fs.renameSync(file + '.tmp', file);
    },
    removeItem(key) { memory.delete(key); try { fs.unlinkSync(file); } catch {} }
  };
}
module.exports = { createAuthStorage };
