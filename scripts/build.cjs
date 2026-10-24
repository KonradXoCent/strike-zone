'use strict';
const path = require('node:path');
const { build, Platform, Arch } = require('electron-builder');
const { loadConfig, providerConfig } = require('../core/config.cjs');
require('./linux-nsis.cjs')();
const root = path.join(__dirname, '..');
const testBuild = process.argv.includes('--test');
const stableVersion = require('../package.json').version;
const testRevision = process.argv.find(arg => arg.startsWith('--test-revision='))?.split('=')[1] || '1';
if (!/^[1-9]\d{0,3}$/.test(testRevision)) throw new Error('Nieprawidłowy numer wersji testowej.');
const version = testBuild ? stableVersion + '-test.' + testRevision : stableVersion;
const output = testBuild ? 'dist-test' : 'dist';
const channel = loadConfig([path.join(root, 'updates.json')]);
const config = {
  appId: 'pl.konradxocent.strikezone.desktop', productName: 'Strike Zone 2D',
  asar: true, npmRebuild: false, electronVersion: '44.7.2',
  afterPack: require('./brand-windows.cjs'),
  directories: { output, buildResources: 'assets' },
  files: ['main.cjs', 'preload.cjs', 'game-preload.cjs', 'core/**', 'launcher/**', 'shared/**',
    'assets/**', 'game/**', 'vendor/**', 'updates.json', 'package.json'],
  win: { target: 'nsis', executableName: 'StrikeZone', icon: 'assets/icon.ico',
    signAndEditExecutable: process.platform === 'win32' },
  nsis: { oneClick: false, perMachine: false, allowElevation: false,
    allowToChangeInstallationDirectory: true, createDesktopShortcut: 'always',
    createStartMenuShortcut: true, shortcutName: 'Strike Zone 2D',
    uninstallDisplayName: 'Strike Zone 2D', deleteAppDataOnUninstall: false,
    installerIcon: 'assets/icon.ico', uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    artifactName: testBuild ? 'StrikeZone-Test-${version}.${ext}' : 'StrikeZone-Setup-${version}.${ext}' }
};
if (testBuild) {
  config.extraMetadata = { version, desktopTest: true };
  config.appId += '.test'; config.productName = 'Strike Zone 2D Test';
  config.win.executableName = 'StrikeZoneTest';
  config.nsis.shortcutName = config.nsis.uninstallDisplayName = 'Strike Zone 2D Test';
}
if (channel.enabled) config.publish = [providerConfig(channel)];
build({ projectDir: root, targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64),
  publish: 'never', config }).then(() => {
    const fs = require('node:fs');
    const file = path.join(root, output, `StrikeZone-${testBuild ? 'Test' : 'Setup'}-${version}.exe`);
    if (!fs.existsSync(file) || fs.statSync(file).size < 1024 * 1024) {
      throw new Error('Nie powstał kompletny instalator Windows.');
    }
    console.log('Gotowy instalator:', path.basename(file));
  }).catch(error => { console.error(error.message); process.exit(1); });
