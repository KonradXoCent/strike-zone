'use strict';
// Installation operates on archive bytes. Electron's regular fs treats .asar
// files as virtual directories and refuses to write a new game archive.
module.exports=process.versions.electron?require('original-fs'):require('node:fs');
