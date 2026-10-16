'use strict';
const path = require('node:path');

function resolveAsset(root, value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'strikezone:' || url.hostname !== 'app') return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\0') || pathname.includes('\\')) return null;
  const allowed = ['launcher/', 'assets/', 'game/', 'vendor/'];
  const relative = pathname.replace(/^\/+/, '');
  if (!allowed.some(prefix => relative.startsWith(prefix))) return null;
  const full = path.resolve(root, relative);
  if (!full.startsWith(path.resolve(root) + path.sep)) return null;
  // A route may not escape into another directory through encoded path components.
  if (!full.startsWith(path.resolve(root, relative.split('/')[0]) + path.sep)) return null;
  return full;
}
module.exports = { resolveAsset };
