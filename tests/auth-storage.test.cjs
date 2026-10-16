'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createAuthStorage } = require('../core/auth-storage.cjs');
test('session storage uses the OS encryption adapter, restores it, and deletes on logout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-auth-'));
  try {
    const file = path.join(dir, 'session.json');
    const crypto = { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'test', encryptString: text => Buffer.from(text.split('').reverse().join('')), decryptString: buf => buf.toString().split('').reverse().join('') };
    createAuthStorage(file, crypto).setItem('session', 'private-refresh-token');
    assert(!fs.readFileSync(file, 'utf8').includes('private-refresh-token'));
    const restored = createAuthStorage(file, crypto);
    assert.equal(restored.getItem('session'), 'private-refresh-token'); assert.equal(restored.getItem('other'), null);
    restored.removeItem('session'); assert.equal(fs.existsSync(file), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('without OS encryption session tokens remain in memory and are never written as plaintext', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-auth-'));
  try {
    const file = path.join(dir, 'session.json'), unavailable = { isEncryptionAvailable: () => false };
    const storage = createAuthStorage(file, unavailable); storage.setItem('session', 'private-refresh-token');
    assert.equal(storage.getItem('session'), 'private-refresh-token'); assert.equal(fs.existsSync(file), false);
    assert.equal(createAuthStorage(file, unavailable).getItem('session'), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
