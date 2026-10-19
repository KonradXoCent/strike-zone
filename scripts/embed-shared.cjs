// Preserve the one-file browser build while sharing the same tested desktop UI.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function block(){return '<!-- SZ SHARED UI START -->\n'+['settings.css','social.css','game-friends.css','workshop-maps.css','workshop-moderation.css','game-hub.css','game-controls.css'].map(n=>'<style>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8')+'\n</style>').join('\n')+'\n'+['locale-data.js','locale.js','prop-hunt-data.js','hide-seek.js','prop-hunt.js','social.js','social-view.js','settings.js','game-friends.js','workshop-maps.js','workshop-moderation.js','game-hub.js','map-materials.js','game-integration.js','skin-view.js','game-input.js'].map(n=>'<script>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n<!-- SZ SHARED UI END -->';}
function modeData(){return '<!-- SZ MODE MAPS START -->\n<script>\n'+fs.readFileSync(path.join(root,'shared/hide-seek-maps.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>\n<!-- SZ MODE MAPS END -->';}
function branding(){
 const src='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/icon.png')).toString('base64');
 const css=fs.readFileSync(path.join(root,'shared/branding.css'),'utf8');
 // Store the image only once in the standalone HTML; every emblem uses this CSS value.
 return '<!-- SZ BRAND START -->\n<style>\n'+css+'\n</style>\n<script>\n(()=>{const src='+JSON.stringify(src)+';document.documentElement.style.setProperty("--sz-brand-image",\'url("\'+src+\'")\');const icon=document.createElement("link");icon.rel="icon";icon.type="image/png";icon.href=src;document.head.appendChild(icon);})();\n</script>\n<!-- SZ BRAND END -->';
}
function sync(check=false){
 const file=path.join(root,'game-source/index.html'),source=fs.readFileSync(file,'utf8'),value=block(),brand=branding(),maps=modeData();
 if(check){
  if(!source.includes(maps))throw new Error('Embedded mode maps are stale; run node scripts/embed-shared.cjs');
  if(!source.includes(value))throw new Error('Embedded shared UI is stale; run node scripts/embed-shared.cjs');
  if(!source.includes(brand))throw new Error('Embedded game logo is stale; run node scripts/embed-shared.cjs');
  return;
 }
 let next=source.includes('<!-- SZ SHARED UI START -->')?source.replace(/<!-- SZ SHARED UI START -->[\s\S]*?<!-- SZ SHARED UI END -->/,()=>value):source.replace('</body>',()=>value+'\n</body>');
 next=next.includes('<!-- SZ BRAND START -->')?next.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,()=>brand):next.replace('</head>',()=>brand+'\n</head>');
 if(next.includes('<!-- SZ MODE MAPS START -->'))next=next.replace(/<!-- SZ MODE MAPS START -->[\s\S]*?<!-- SZ MODE MAPS END -->/,()=>maps);else{const at=next.lastIndexOf('<script',next.indexOf('const CREATOR_BASE_MAP_COUNT'));if(at<0)throw Error('Workshop map allocation point missing');next=next.slice(0,at)+maps+'\n'+next.slice(at);}
 fs.writeFileSync(file,next);
}
if(require.main===module)sync(process.argv.includes('--check'));
module.exports={sync};
