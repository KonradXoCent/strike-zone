'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const version = require('../package.json').version;
const repo = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Missing valid GITHUB_REPOSITORY.');
const tag = 'v' + version;
function gh(args, options = {}) { return execFileSync('gh', args, { cwd: root, stdio: 'inherit', ...options }); }
let exists = false;
try { gh(['release', 'view', tag, '--repo', repo], { stdio: 'ignore' }); exists = true; } catch {}
if (!exists) gh(['release', 'create', tag, '--repo', repo, '--draft', '--target', process.env.GITHUB_SHA,
  '--title', 'Strike Zone 2D ' + version + ' — test aktualizatora', '--notes-file', 'RELEASE_NOTES.md']);
const names = [`StrikeZone-Setup-${version}.exe`, `StrikeZone-Setup-${version}.exe.blockmap`, 'StrikeZone-Test-1.0.0.exe', 'latest.yml'];
for (const name of names) {
  const file = path.join(root, 'release', name);
  if (!fs.existsSync(file)) throw new Error('Missing release artifact ' + name);
  gh(['release', 'upload', tag, file, '--repo', repo, '--clobber']);
}
gh(['release', 'edit', tag, '--repo', repo, '--draft=false', '--latest']);
console.log('Published https://github.com/' + repo + '/releases/tag/' + tag);
