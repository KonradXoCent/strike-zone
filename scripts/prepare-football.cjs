'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
function prepare(destination=path.join(root,'game/football/index.html')){
 const {createCanvas,Image}=require('@napi-rs/canvas'),icon=createCanvas(256,256),image=new Image();image.src=fs.readFileSync(path.join(root,'assets/football-logo.svg'));icon.getContext('2d').drawImage(image,0,0,256,256);fs.writeFileSync(path.join(root,'assets/football-icon.png'),icon.toBuffer('image/png'));
 let html=require('./prepare-preview.cjs').makePreview();
 const assets=Object.fromEntries(['logo','cover'].map(name=>[name,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/football-'+name+'.svg')).toString('base64')]));
 assets.positions=JSON.parse(fs.readFileSync(path.join(root,'game/football-known-positions.json'),'utf8'));
 assets.badges=Object.fromEntries(fs.readdirSync(path.join(root,'assets/football-badges')).filter(n=>n.endsWith('.png')).map(n=>[n.slice(0,-4),'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/football-badges',n)).toString('base64')]));
 assets.catalog=JSON.parse(fs.readFileSync(path.join(root,'game/football-catalog.json'),'utf8'));
 assets.background='data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets/football-stadium-032.webp')).toString('base64');
 assets.audio=Object.fromEntries([['crowd','crowd-loop.ogg'],['cheer','crowd-goal-fast.ogg'],['madrid','chant-madrid.ogg'],['barcelona','chant-barcelona.ogg']].map(([key,name])=>[key,'data:audio/ogg;base64,'+fs.readFileSync(path.join(root,'assets/audio/football',name)).toString('base64')]));
 html=html.replace(/<script id="sz-test-preview-account">[\s\S]*?<\/script>/,'');
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Zone Football · Preview</title>');
 // Every legacy storage reference is namespaced before any script executes.
 html=html.replace(/(['"])sz2(?=[-'" ])/g,'$1zone-football-preview');
 html=html.replace('<head>','<head><meta charset="utf-8"><script>window.SZ_FOOTBALL=true;window.ZONE_FOOTBALL_ASSETS='+JSON.stringify(assets).replaceAll('<','\\u003c')+';</script>');
 const wallet='<script>\n'+fs.readFileSync(path.join(root,'shared/wallet.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>';
 if(!html.includes(wallet))throw Error('Football wallet isolation anchor missing');
 html=html.replace(wallet,'<!-- Zone Football preview never connects the shared wallet. -->');
 html=html.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,'<style>'+fs.readFileSync(path.join(root,'shared/branding.css'),'utf8')+'</style><script>document.documentElement.style.setProperty("--sz-brand-image",\'url("'+assets.logo+'")\');document.documentElement.style.setProperty("--sz-loading-art",\'url("'+assets.cover+'")\');</script><link rel="icon" href="'+assets.logo+'">');
 html=html.replace('</head>',()=>'<style>'+fs.readFileSync(path.join(root,'game/football.css'),'utf8')+['ui.css','break-ui.css','pack-show.css','club-ui.css','match-controls.css','matchday.css','squad-board.css'].map(f=>{const css=fs.readFileSync(path.join(root,'game/football-ultimate',f),'utf8');return css+'\n'+css.replaceAll('#ultimate','#football-pro');}).join('\n')+fs.readFileSync(path.join(root,'game/football-front.css'),'utf8')+fs.readFileSync(path.join(root,'game/football-polish.css'),'utf8')+'</style></head>');
 html=html.replace('</head>','<!-- Three.js MIT license: '+fs.readFileSync(path.join(root,'game/haunt/vendor/THREE-LICENSE.txt'),'utf8').replaceAll('--','—')+' --></head>');
 // Disable the inherited shooter splash before it can paint. One football loader owns startup.
 html=html.replace('<div id="splash">','<div id="splash" style="display:none!important">');
 html=html.replace(/<div class="sl">STRIKE <b>ZONE<\/b><\/div><div class="ss">[^<]*<\/div>/,'<div class="sl">ZONE <b>FOOTBALL</b></div><div class="ss">FOOTBALL / CLUBS</div>');
 html=html.replace('</body>',()=>'<script>'+['game/football.js','game/football-stadiums.js','game/football-roster-data.js','game/football-ultimate/data.js','game/football-clubs.js','game/haunt/vendor/three.js','game/football-ultimate/squad-board.js','game/football-visuals.js','game/football-controls.js','game/football-audio.js','game/football-anthems.js','game/football-window.js','game/football-ultimate/engine.js','game/football-ultimate/matchday-view.js','game/football-ultimate/view.js','game/football-ultimate/network.js','game/football-ultimate/break-ui.js','game/football-ultimate/pack-show.js','game/football-ultimate/ui.js','game/football-classic.js','game/football-front.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n').replace(/<\/script/gi,'<\\/script')+'</script></body>');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,html);return destination;
}
if(require.main===module)console.log(prepare(process.argv[2]&&path.resolve(process.argv[2])));
module.exports={prepare};
