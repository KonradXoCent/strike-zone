'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('./ensure-generated.cjs');
require('./embed-shared.cjs').sync(true);
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'game-source/index.html'), 'utf8');
if (!source.includes(fs.readFileSync(path.join(__dirname, 'community-case.html'), 'utf8'))) throw new Error('Embedded Community Forge module is stale.');
const sdk = path.join(root, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js');
if (!fs.existsSync(sdk)) throw new Error('Brak zależności. Uruchom najpierw npm ci.');
const tag = /<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.45\.4\/dist\/umd\/supabase\.min\.js"><\/script>/;
if (!tag.test(source)) throw new Error('Nie znaleziono oczekiwanego skryptu Supabase 2.45.4. Sprawdź nową wersję index.html.');
// Reject accidentally pasted privileged keys before creating a distributable client.
const key = source.match(/SB_KEY\s*=\s*['"]([^'"]+)/)?.[1] || '';
if (key.startsWith('sb_secret_')) throw new Error('Klucz serwerowy nie może trafić do aplikacji.');
if (key.startsWith('eyJ')) {
  let jwt;
  try { jwt = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')); } catch { throw new Error('Nieprawidłowy klucz JWT.'); }
  if (jwt.role !== 'anon') throw new Error('Aplikacja wymaga klucza publicznego anon/publishable.');
}
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
fs.mkdirSync(path.join(root, 'game'), { recursive: true });
fs.copyFileSync(sdk, path.join(root, 'vendor/supabase.js'));
let html = source.replace(tag, '<script src="../vendor/supabase.js"></script>');
// The supplied file still calls an obsolete host-specific cloud initializer.
html = html.replace("addEventListener('resize',drawScene);cloudInit();splashRun();", "addEventListener('resize',drawScene);splashRun();");
if (!html.includes('\nsbInit();')) throw new Error('Nie znaleziono inicjalizacji konta gry.');
html = html.replace('\nsbInit();', '\n/* Session initialization is owned by the desktop launcher. */');
html = html.replace('</body>', '<script src="./desktop.js"></script><script src="./account.js"></script><script src="./exit.js"></script></body>');
fs.writeFileSync(path.join(root, 'game/index.html'), html);
fs.copyFileSync(path.join(root, 'node_modules/@supabase/supabase-js/LICENSE'), path.join(root, 'vendor/SUPABASE-LICENSE.txt'));
fs.writeFileSync(path.join(root, 'game/source-sha256.txt'), crypto.createHash('sha256').update(source).digest('hex') + '\n');
require('./prepare-royale.cjs').prepare();
console.log('Gra przygotowana. Supabase SDK 2.45.4 dołączone lokalnie.');
