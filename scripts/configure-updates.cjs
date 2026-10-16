'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { normalizeConfig } = require('../core/config.cjs');
async function main() {
  let args = process.argv.slice(2);
  if (!args.length) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log('Aktualizacje Strike Zone 2D\n1 — publiczne GitHub Releases\n2 — własny hosting HTTPS\n0 — wyłączone');
      const choice = (await rl.question('Wybierz: ')).trim();
      args = choice === '1' ? ['--github', await rl.question('Repozytorium (właściciel/nazwa): ')]
        : choice === '2' ? ['--url', await rl.question('Adres folderu z latest.yml (https://.../): ')]
          : ['--off'];
    } finally { rl.close(); }
  }
  let config;
  if (args[0] === '--github') {
    const parts = String(args[1] || '').trim().split('/');
    if (parts.length !== 2) throw new Error('Podaj repozytorium jako właściciel/nazwa.');
    config = normalizeConfig({ enabled: true, provider: 'github', owner: parts[0], repo: parts[1] });
  } else if (args[0] === '--url') config = normalizeConfig({ enabled: true, provider: 'generic', url: String(args[1] || '').trim() });
  else if (args[0] === '--off') config = { enabled: false, provider: 'generic', url: '' };
  else throw new Error('Użycie: --github właściciel/repo | --url https://adres/folder/ | --off');
  fs.writeFileSync(path.join(__dirname, '../updates.json'), JSON.stringify(config, null, 2) + '\n');
  console.log('Zapisano ustawienia. Teraz zbuduj i udostępnij instalator.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
