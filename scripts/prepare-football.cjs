'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
function prepare(destination=path.join(root,'game/football/index.html')){
 const {createCanvas,Image}=require('@napi-rs/canvas'),icon=createCanvas(256,256),image=new Image();image.src=fs.readFileSync(path.join(root,'assets/football-logo.svg'));icon.getContext('2d').drawImage(image,0,0,256,256);fs.writeFileSync(path.join(root,'assets/football-icon.png'),icon.toBuffer('image/png'));
 let html=require('./prepare-preview.cjs').makePreview();
 const assets=Object.fromEntries(['logo','cover'].map(name=>[name,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/football-'+name+'.svg')).toString('base64')]));
 html=html.replace(/<script id="sz-test-preview-account">[\s\S]*?<\/script>/,'');
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Zone Football · Preview</title>');
 // Every legacy storage reference is namespaced before any script executes.
 html=html.replace(/(['"])sz2(?=[-'" ])/g,'$1zone-football-preview');
 html=html.replace('<head>','<head><script>window.SZ_FOOTBALL=true;window.ZONE_FOOTBALL_ASSETS='+JSON.stringify(assets)+';</script>');
 const wallet='<script>\n'+fs.readFileSync(path.join(root,'shared/wallet.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>';
 if(!html.includes(wallet))throw Error('Football wallet isolation anchor missing');
 html=html.replace(wallet,'<!-- Zone Football preview never connects the shared wallet. -->');
 html=html.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,'<style>'+fs.readFileSync(path.join(root,'shared/branding.css'),'utf8')+'</style><script>document.documentElement.style.setProperty("--sz-brand-image",\'url("'+assets.logo+'")\');document.documentElement.style.setProperty("--sz-loading-art",\'url("'+assets.cover+'")\');</script><link rel="icon" href="'+assets.logo+'">');
 html=html.replace('</head>',()=>'<style>'+fs.readFileSync(path.join(root,'game/football.css'),'utf8')+'</style></head>');
 html=html.replace('</body>',()=>'<script>'+fs.readFileSync(path.join(root,'game/football.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script></body>');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,html);return destination;
}
if(require.main===module)console.log(prepare(process.argv[2]&&path.resolve(process.argv[2])));
module.exports={prepare};
