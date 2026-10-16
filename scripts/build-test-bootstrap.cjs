'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const packageFile = path.join(root, 'package.json');
const lockFile = path.join(root, 'package-lock.json');
const originalPackage = fs.readFileSync(packageFile, 'utf8');
const originalLock = fs.readFileSync(lockFile, 'utf8');
try {
  const pkg = JSON.parse(originalPackage), lock = JSON.parse(originalLock);
  pkg.version = lock.version = lock.packages[''].version = '1.0.0';
  fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'build.cjs')], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Nie udało się zbudować testowego instalatora 1.0.0.');
  fs.mkdirSync(path.join(root, 'release'), { recursive: true });
  fs.copyFileSync(path.join(root, 'dist/StrikeZone-Setup-1.0.0.exe'), path.join(root, 'release/StrikeZone-Test-1.0.0.exe'));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { fs.writeFileSync(packageFile, originalPackage); fs.writeFileSync(lockFile, originalLock); }
