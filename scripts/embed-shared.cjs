// Preserve the one-file browser build while sharing the same tested desktop UI.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function block(){return '<!-- SZ SHARED UI START -->\n'+['settings.css','social.css','game-friends.css','workshop-maps.css'].map(n=>'<style>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8')+'\n</style>').join('\n')+'\n'+['locale-data.js','locale.js','social.js','social-view.js','settings.js','game-friends.js','workshop-maps.js','game-integration.js'].map(n=>'<script>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n<!-- SZ SHARED UI END -->';}
function branding(){
 const src='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/icon.png')).toString('base64');
 const css=fs.readFileSync(path.join(root,'shared/branding.css'),'utf8');
 // Store the image only once in the standalone HTML; every emblem uses this CSS value.
 return '<!-- SZ BRAND START -->\n<style>\n'+css+'\n</style>\n<script>\n(()=>{const src='+JSON.stringify(src)+';document.documentElement.style.setProperty("--sz-brand-image",\'url("\'+src+\'")\');const icon=document.createElement("link");icon.rel="icon";icon.type="image/png";icon.href=src;document.head.appendChild(icon);})();\n</script>\n<!-- SZ BRAND END -->';
}
function sync(check=false){
 const file=path.join(root,'game-source/index.html'),source=fs.readFileSync(file,'utf8'),value=block(),brand=branding();
 if(check){
  if(!source.includes(value))throw new Error('Embedded shared UI is stale; run node scripts/embed-shared.cjs');
  if(!source.includes(brand))throw new Error('Embedded game logo is stale; run node scripts/embed-shared.cjs');
  return;
 }
 let next=source.includes('<!-- SZ SHARED UI START -->')?source.replace(/<!-- SZ SHARED UI START -->[\s\S]*?<!-- SZ SHARED UI END -->/,()=>value):source.replace('</body>',()=>value+'\n</body>');
 next=next.includes('<!-- SZ BRAND START -->')?next.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,()=>brand):next.replace('</head>',()=>brand+'\n</head>');
 fs.writeFileSync(file,next);
}
if(require.main===module)sync(process.argv.includes('--check'));
module.exports={sync};
