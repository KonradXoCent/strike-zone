'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PE = require('pe-library');
const ResEdit = require('resedit');
module.exports = async context => {
  if (process.platform === 'win32' || context.electronPlatformName !== 'win32') return;
  const executable = context.packager.platformSpecificBuildOptions.executableName || 'StrikeZone';
  const file = path.join(context.appOutDir, executable + '.exe');
  const exe = PE.NtExecutable.from(fs.readFileSync(file), { ignoreCert: true });
  const resources = PE.NtExecutableResource.from(exe);
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '../assets/icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  for (const group of groups) ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries, group.id, group.lang, icon.icons.map(item => item.data));
  const version = context.packager.appInfo.version.split('-')[0].split('.').map(Number);
  for (const info of ResEdit.Resource.VersionInfo.fromEntries(resources.entries)) {
    info.setFileVersion(version[0], version[1], version[2], 0, 1033);
    info.setProductVersion(version[0], version[1], version[2], 0, 1033);
    info.setStringValues({ lang: 1033, codepage: 1200 }, {
      FileDescription:context.packager.appInfo.productName,ProductName:context.packager.appInfo.productName, CompanyName: 'Konrad Xocent',
      InternalName: executable, OriginalFilename: executable + '.exe'
    });
    info.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(exe);
  fs.writeFileSync(file, Buffer.from(exe.generate()));
};
