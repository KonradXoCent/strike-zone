'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { spawnSync } = require('node:child_process');
async function main() {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let version;
  try { version = (await rl.question(`Obecna wersja: ${pkg.version}. Nowa wersja (np. 1.0.1): `)).trim(); }
  finally { rl.close(); }
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Podaj numer w formacie 1.0.1.');
  const old = pkg.version.split('.').map(Number), next = version.split('.').map(Number);
  let newer = false;
  for (let i = 0; i < 3; i++) { if (next[i] !== old[i]) { newer = next[i] > old[i]; break; } }
  if (!newer) throw new Error('Nowa wersja musi być większa od obecnej.');
  if (!process.env.npm_execpath) throw new Error('Uruchom przez npm run release.');
  for (const args of [['version', version, '--no-git-tag-version'], ['test'], ['run', 'dist:win']]) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Przerwano tworzenie wydania.');
  }
  console.log('Wydanie gotowe w dist. Opublikuj instalator, plik .blockmap i latest.yml.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
