'use strict';
// Optional reproducible vendor build. Normal game preparation uses the committed bundle.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),modules=path.resolve(process.argv[2]||path.join(root,'node_modules'));
for(const [name,version]of[['three','0.187.0'],['esbuild','0.28.2']])if(JSON.parse(fs.readFileSync(path.join(modules,name,'package.json'))).version!==version)throw Error('Expected '+name+' '+version);
const esbuild=require(path.join(modules,'esbuild')),dest=path.join(root,'game/haunt/vendor');fs.mkdirSync(dest,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(root,'game/haunt/three-entry.mjs')],nodePaths:[modules],bundle:true,minify:true,format:'iife',target:'chrome130',outfile:path.join(dest,'three.js'),banner:{js:'/* Three.js 0.187.0 — MIT. See THREE-LICENSE.txt. Bundled with esbuild 0.28.2. */'}});
fs.copyFileSync(path.join(modules,'three/LICENSE'),path.join(dest,'THREE-LICENSE.txt'));
console.log('Prepared the pinned offline Three.js renderer');
