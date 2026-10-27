'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
function decorate(html,{inline=false}={}){
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Zone Royale · Battle Royale</title>');
 const css=inline?'<style>'+fs.readFileSync(path.join(root,'game/royale.css'),'utf8')+'</style>':'<link rel="stylesheet" href="./royale.css">';
 const js=inline?'<script>'+fs.readFileSync(path.join(root,'game/royale.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>':'<script src="./royale.js"></script>';
 html=html.replace('</head>',()=>css+'<script>window.SZ_ROYALE=true;</script></head>');
 // Remote players and bots use their synchronized owned-style parachute colour.
 html=html.replaceAll("p.human?chuteCol():'#fff'","p.brChute&&bit(p.brChute)?bit(p.brChute).c:p.human?chuteCol():'#fff'");
 return html.replace('</body>',()=>js+'</body>');
}
function prepare(){const target=path.join(root,'game/royale.html');fs.writeFileSync(target,decorate(fs.readFileSync(path.join(root,'game/index.html'),'utf8')));return target;}
function preview(){return decorate(require('./prepare-preview.cjs').makePreview(),{inline:true});}
if(require.main===module){if(process.argv.includes('--preview')){const file=process.argv[process.argv.indexOf('--preview')+1];if(!file)throw Error('Preview destination required');fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,preview());}else prepare();}
module.exports={prepare,preview,decorate};
