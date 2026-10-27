'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
function royaleCSS(){let s=fs.readFileSync(path.join(root,'game/royale.css'),'utf8');for(const name of ['royale-logo.svg','royale-cover.svg'])s=s.replaceAll('../assets/'+name,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));return s;}
function decorate(html,{inline=false}={}){
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Zone Royale · Battle Royale</title>');
 const css=inline?'<style>'+royaleCSS()+'</style>':'<link rel="stylesheet" href="./royale.css">';
 const js0=inline?'<script>'+fs.readFileSync(path.join(root,'game/royale.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>':'<script src="./royale.js"></script>';
 const additions=['../shared/royale-data.js','royale-visuals.js','royale-expansion.js'];const tag=file=>inline?'<script>'+fs.readFileSync(path.join(root,'game',file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>':'<script src=\"'+(file.startsWith('../')?file:'./'+file)+'\"></script>';const js=additions.slice(0,2).map(tag).join('')+js0+tag(additions[2]);
 html=html.replace('</head>',()=>css+'<script>window.SZ_ROYALE=true;</script></head>');
 // In squad modes allies do not count as threats while scavenging or healing.
 html=html.replaceAll('e!==p&&e.alive&&!e.ap','e!==p&&e.team!==p.team&&e.alive&&!e.ap');
 // Remote players and bots use their synchronized owned-style parachute colour.
 html=html.replaceAll("p.human?chuteCol():'#fff'","p.brChute&&bit(p.brChute)?bit(p.brChute).c:p.human?chuteCol():'#fff'");
 return html.replace('</body>',()=>js+'</body>');
}
function prepare(){const target=path.join(root,'game/royale.html');fs.writeFileSync(target,decorate(fs.readFileSync(path.join(root,'game/index.html'),'utf8')));return target;}
function preview(){return decorate(require('./prepare-preview.cjs').makePreview(),{inline:true});}
if(require.main===module){if(process.argv.includes('--preview')){const file=process.argv[process.argv.indexOf('--preview')+1];if(!file)throw Error('Preview destination required');fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,preview());}else prepare();}
module.exports={prepare,preview,decorate};
