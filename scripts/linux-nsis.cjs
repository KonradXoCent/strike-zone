'use strict';
// electron-builder 26.15.3 already ships a native NSIS uninstaller extractor
// for macOS. Use the same extractor when cross-building on Linux, where Wine
// is unnecessary for this unsigned build. Windows uses the normal builder.
module.exports = function nativeNsisOnLinux() {
  if (process.platform !== 'linux') return;
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { NsisTarget } = require('app-builder-lib/out/targets/nsis/NsisTarget');
  const { UninstallerReader, nsisTemplatesDir } = require('app-builder-lib/out/targets/nsis/nsisUtil');
  NsisTarget.prototype.computeScriptAndSignUninstaller = async function (defines, commands, installerPath, sharedHeader, archs) {
    const customScript = await this.packager.getResource(this.options.script, 'installer.nsi');
    if (customScript) throw new Error('Ta metoda budowania na Linux wymaga domyślnego skryptu NSIS.');
    const script = await fs.readFile(path.join(nsisTemplatesDir, 'installer.nsi'), 'utf8');
    const uninstaller = path.join(this.outDir, `${path.basename(installerPath, 'exe')}__uninstaller.exe`);
    defines.BUILD_UNINSTALLER = null;
    defines.UNINSTALLER_OUT_FILE = path.win32.join('Z:', uninstaller);
    await this.executeMakensis(defines, commands, sharedHeader + await this.computeFinalScript(script, false, archs));
    await UninstallerReader.exec(installerPath, uninstaller);
    delete defines.BUILD_UNINSTALLER;
    defines.UNINSTALLER_OUT_FILE = uninstaller;
    return { script, isCustomScript: false };
  };
};
