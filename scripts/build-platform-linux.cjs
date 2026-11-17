'use strict';
const path=require('node:path'),fs=require('node:fs');
const {build,Platform,Arch}=require('electron-builder');
async function main(){
 const root=path.join(__dirname,'..');
 const version=require('../platform/package.json').version;
 const output=path.join(root,'dist-linux');
 fs.rmSync(output,{recursive:true,force:true});
 require('./prepare-football.cjs').prepare();
 require('./prepare-zombie.cjs').prepare();
 const files=[
  'game/football/**',
  'game/zombie/index.html',
  'platform/**',
  '!platform/zonehub*seed.json',
  'core/**',
  'shared/friendships.js',
  'shared/money.js',
  'shared/hub-cosmetics.js',
  'shared/royale-data.js',
  'shared/royale-progress.js',
  'shared/social.js',
  'shared/social-view.js',
  'shared/social.css',
  'shared/locale-data.js',
  'shared/locale.js',
  'shared/workshop-preview.js',
  'assets/**',
  'package.json'
 ];
 await build({
  projectDir:root,
  targets:Platform.LINUX.createTarget(['deb'],Arch.x64),
  publish:'never',
  config:{
   appId:'pl.konradxocent.zonehub',
   productName:'Zone Hub',
   asar:true,
   npmRebuild:false,
   electronVersion:'44.7.2',
   extraMetadata:{name:'zone-hub',version,main:'platform/main.cjs'},
   directories:{output,buildResources:'assets'},
   files,
   publish:[{provider:'generic',url:'https://github.com/KonradXoCent/strike-zone/releases/download/zonehub-debian-v'+version+'/',channel:'zonehub'}],
   linux:{
    target:['deb'],
    executableName:'zonehub',
    icon:'assets/hub-icon.png',
    category:'Game',
    synopsis:'Launcher gier Zone Hub',
    description:'Zone Hub — launcher, biblioteka, sklep i Zone Studio dla gier Zone.',
    desktop:{entry:{Name:'Zone Hub',Comment:'Gry Zone, biblioteka i Zone Studio',Categories:'Game;'}}
   },
   deb:{
    depends:[
     'libgtk-3-0 | libgtk-3-0t64',
     'libnotify4',
     'libnss3',
     'libxss1',
     'libxtst6',
     'xdg-utils',
     'libatspi2.0-0 | libatspi2.0-0t64',
     'libuuid1',
     'libsecret-1-0',
     'libgbm1',
     'libasound2 | libasound2t64'
    ],
    recommends:['flatpak','libappindicator3-1'],
    priority:'optional',
    packageCategory:'games',
    maintainer:'Konrad Xocent',
    synopsis:'Launcher gier Zone Hub'
   },
   artifactName:'zonehub.deb'
  }
 });
 const deb=path.join(output,'zonehub.deb');
 if(!fs.existsSync(deb)||fs.statSync(deb).size<50000000)throw new Error('ZONEHUB_DEB_MISSING_OR_TOO_SMALL');
 if(!fs.existsSync(path.join(output,'zonehub-linux.yml')))throw new Error('ZONEHUB_LINUX_UPDATE_METADATA_MISSING');
 console.log('Built '+deb+' ('+fs.statSync(deb).size+' bytes)');
}
main().catch(error=>{console.error(error.stack||error);process.exit(1);});
