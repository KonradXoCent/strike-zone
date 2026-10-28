'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
function royaleCSS(){let s=fs.readFileSync(path.join(root,'game/royale.css'),'utf8');for(const name of ['royale-logo.svg','royale-cover.svg'])s=s.replaceAll('../assets/'+name,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));return s;}
function decorate(html,{inline=false}={}){
 // The first painted frame and the account overlay already belong to Royale.
 const logo='data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/royale-logo.svg')).toString('base64'),cover='data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/royale-cover.svg')).toString('base64');
 html=html.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,()=>'<style>'+fs.readFileSync(path.join(root,'shared/branding.css'),'utf8')+'</style><style>:root{--sz-brand-image:url("'+logo+'");--sz-loading-art:url("'+cover+'");}</style><link rel="icon" href="'+logo+'">');
 html=html.replace('<head>','<head><script>window.SZ_ROYALE=true;</script><script>'+fs.readFileSync(path.join(root,'shared/royale-data.js'),'utf8')+'</script><script>'+fs.readFileSync(path.join(root,'shared/royale-progress.js'),'utf8')+'</script>');
 html=html.replace('<body>','<body class="royale-client">').replace('aria-label="Strike Zone 2D"','aria-label="Zone Royale"').replace('<div class="sl">STRIKE <b>ZONE</b></div>','<div class="sl" data-no-translate>ZONE <b>ROYALE</b></div>').replace('<div class="ss">2D · Tactical Shooter</div>','<div class="ss" data-no-translate>2.5D · BATTLE ROYALE</div>');
 const profileAnchor="return p};\n// ---------- data";
 if(!html.includes(profileAnchor))throw Error('Royale profile isolation anchor missing');
 html=html.replace(profileAnchor,"return ZRProgress.profile(p)};\n// ---------- data");
 html=html.replace('function ST_(){DB.st=DB.st||{};const s=DB.st;','function ST_(){DB.royaleSt=DB.royaleSt||JSON.parse(JSON.stringify(DB.st||{}));const s=DB.royaleSt;');
 html=html.replaceAll('DB.st?.zoom','DB.royaleSt?.zoom').replaceAll('DB.st.zoom','DB.royaleSt.zoom');
 html=html.replace(/const ACH=\[[^\n]*;/,'const ACH=ZRProgress.rows(globalThis.szLocale?.language||\'pl\');');
 html=html.replace(/rank=p=>[^\n]*?,esc=s=>/,'rank=p=>ZRProgress.rankName(p,globalThis.szLocale?.language||\'pl\'),esc=s=>');
 html=html.replace(/prk=q=>\{[^\n]*?\};/,'prk=q=>q.human?ZRProgress.rankName(P(),globalThis.szLocale?.language||\'pl\'):\'BOT\';');
 const coreAnchor="(function(root){'use strict';\n const clone=value=>structuredClone(value),esc=workshopEscape,t=";
 if(!html.includes(coreAnchor))throw Error('Royale core-map isolation anchor missing');
 html=html.replace(coreAnchor,"(function(root){'use strict';if(root.SZ_ROYALE){root.SzCoreMaps={sourceOfMap:id=>id,arenaMap:id=>id,breakablesAt:()=>[],doorsAt:()=>[],networkMapAllowed:()=>false,testing:()=>false};return;}\n const clone=value=>structuredClone(value),esc=workshopEscape,t=");
 html=html.replace('const P=()=>','let P=()=>').replace('if(GR&&SPW[sel.map])','if(!SZ_ROYALE&&GR&&SPW[sel.map])').replace("else{cx.fillText('CT SPAWN'","else if(!SZ_ROYALE){cx.fillText('CT SPAWN'");
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Zone Royale · Battle Royale</title>');
 const css=inline?'<style>'+royaleCSS()+'</style>':'<link rel="stylesheet" href="./royale.css">';
 const js0=inline?'<script>'+fs.readFileSync(path.join(root,'game/royale.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>':'<script src="./royale.js"></script>';
 const additions=['royale-visuals.js','royale-expansion.js'];const tag=file=>inline?'<script>'+fs.readFileSync(path.join(root,'game',file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>':'<script src=\"'+(file.startsWith('../')?file:'./'+file)+'\"></script>';const js=tag(additions[0])+js0+tag(additions[1])+tag('royale-matchmaking.js')+tag('../shared/royale-island.js')+tag('royale-content.js')+tag('royale-squad.js')+tag('royale-progression.js');
 html=html.replace('</head>',()=>css+'<script>window.SZ_ROYALE=true;</script></head>');
 // A storm hole is a separate complete circle, never a connected partial fan.
 html=html.replace('cx.rect(0,0,WW,WH);cx.arc(g.z.x,g.z.y,Math.max(1,g.z.r),0,7,true)', 'cx.rect(0,0,WW,WH);cx.moveTo(g.z.x+Math.max(1,g.z.r),g.z.y);cx.arc(g.z.x,g.z.y,Math.max(1,g.z.r),0,Math.PI*2,true)');
 html=html.replace('q.rect(0,0,WW,WH);q.arc(G.z.x,G.z.y,G.z.r,0,Math.PI*2,true)', 'q.rect(0,0,WW,WH);q.moveTo(G.z.x+G.z.r,G.z.y);q.arc(G.z.x,G.z.y,G.z.r,0,Math.PI*2,true)');
 html=html.replace("toast('Fog of war: you only see what is in line of sight')", "toast(szLocale.language==='en'?'Frontier Island — use M to plan your landing':'Frontier Island — użyj M, aby zaplanować lądowanie')");
 // In squad modes allies do not count as threats while scavenging or healing.
 html=html.replaceAll('e!==p&&e.alive&&!e.ap','e!==p&&e.team!==p.team&&e.alive&&!e.ap');
 // Remote players and bots use their synchronized owned-style parachute colour.
 html=html.replaceAll("p.human?chuteCol():'#fff'","p.brChute&&bit(p.brChute)?bit(p.brChute).c:p.human?chuteCol():'#fff'");
 html=html.replace("q.fillStyle='#1b2c33';q.fillRect(0,0,c.width,c.height);q.save();q.scale(sx,sy);","q.clearRect(0,0,c.width,c.height);q.save();q.scale(sx,sy);if(globalThis.ZRIsland)ZRIsland.drawBase(q);");
 return html.replace('</body>',()=>js+'</body>');
}
function prepare(){const target=path.join(root,'game/royale.html');fs.writeFileSync(target,decorate(fs.readFileSync(path.join(root,'game/index.html'),'utf8')));return target;}
function preview(){return decorate(require('./prepare-preview.cjs').makePreview(),{inline:true});}
if(require.main===module){if(process.argv.includes('--preview')){const file=process.argv[process.argv.indexOf('--preview')+1];if(!file)throw Error('Preview destination required');fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,preview());}else prepare();}
module.exports={prepare,preview,decorate};
