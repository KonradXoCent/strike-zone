// Preserve the one-file browser build while sharing the same tested desktop UI.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function block(){return '<!-- SZ SHARED UI START -->\n'+['loading.css','settings.css','social.css','game-friends.css','workshop-maps.css','workshop-moderation.css','game-hub.css','game-controls.css','minigames.css','arcade-ui.css','halloween.css','bonus-codes.css','loadout-buy.css','match-hud.css','agents.css','match-presentation.css','objective-modes.css','creator-modes.css','match-entry.css','player-profile.css','map-depth.css','core-maps.css','map-sandbox.css'].map(n=>'<style>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8')+'\n</style>').join('\n')+'\n'+['loading.js','friendships.js','locale-data.js','locale.js','prop-hunt-data.js','hide-seek.js','prop-hunt.js','arcade-rules.js','minigames.js','football.js','minigames-view.js','social.js','social-view.js','settings.js','game-friends.js','workshop-maps.js','workshop-moderation.js','game-hub.js','map-materials.js','game-integration.js','game-save.js','hub-inventory.js','skin-view.js','game-input.js','zombie.js','halloween-art.js','halloween-music.js','halloween.js','bonus-codes.js','bot-travel.js','loadout.js','buy-menu.js','spectator.js','football-replay.js','arcade-ui.js','match-hud.js','agents-data.js','agents.js','inventory-cases.js','money.js','match-presentation.js','objective-modes.js','creator-modes.js','game-audio.js','prop-taunts.js','football-possession.js','football-referee.js','laser-tag.js','player-profile.js','match-entry.js','friend-spectating.js','map-depth.js','core-maps.js','breakables.js','doors.js','map-sandbox.js','strike-separation.js','wallet.js'].map(n=>'<script>\n'+fs.readFileSync(path.join(root,'shared',n),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n<!-- SZ SHARED UI END -->';}
function modeData(){return '<!-- SZ MODE MAPS START -->\n'+['zombie-rules.js','hide-seek-maps.js','minigames-data.js','halloween-map.js','objective-maps.js','laser-maps.js'].map(name=>'<script>\n'+fs.readFileSync(path.join(root,'shared',name),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n<!-- SZ MODE MAPS END -->';}
function eventData(){return '<!-- SZ EVENT DATA START -->\n<script>\n'+fs.readFileSync(path.join(root,'shared/halloween-data.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>\n<!-- SZ EVENT DATA END -->';}
function branding(){
 const src='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/icon.png')).toString('base64');
 const css=fs.readFileSync(path.join(root,'shared/branding.css'),'utf8');
 const art='data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets/loading-scene.webp')).toString('base64');
 // Store the image only once in the standalone HTML; every emblem uses this CSS value.
 return '<!-- SZ BRAND START -->\n<style>\n'+css+'\n</style>\n<script>\n(()=>{const art='+JSON.stringify(art)+';document.documentElement.style.setProperty("--sz-loading-art",\'url("\'+art+\'")\');const src='+JSON.stringify(src)+';document.documentElement.style.setProperty("--sz-brand-image",\'url("\'+src+\'")\');const icon=document.createElement("link");icon.rel="icon";icon.type="image/png";icon.href=src;document.head.appendChild(icon);})();\n</script>\n<!-- SZ BRAND END -->';
}
function sync(check=false){
 const file=path.join(root,'game-source/index.html'),source=fs.readFileSync(file,'utf8'),value=block(),brand=branding(),maps=modeData(),event=eventData();
 const community=fs.readFileSync(path.join(__dirname,'community-case.html'),'utf8');
 if(check){
  if(!source.includes(community))throw new Error('Embedded Community Forge module is stale; run node scripts/embed-shared.cjs');
  if(!source.includes(event))throw new Error('Embedded seasonal content is stale; run node scripts/embed-shared.cjs');
  if(!source.includes(maps))throw new Error('Embedded mode maps are stale; run node scripts/embed-shared.cjs');
  if(!source.includes(value))throw new Error('Embedded shared UI is stale; run node scripts/embed-shared.cjs');
  if(!source.includes(brand))throw new Error('Embedded game logo is stale; run node scripts/embed-shared.cjs');
  return;
 }
 let next=source.includes('<!-- SZ SHARED UI START -->')?source.replace(/<!-- SZ SHARED UI START -->[\s\S]*?<!-- SZ SHARED UI END -->/,()=>value):source.replace('</body>',()=>value+'\n</body>');
 next=next.replace(/<!-- Server-owned Community Forge Case\. Inlined into the single game source\. -->[\s\S]*?<\/script>/,()=>community.trimEnd());
 next=next.includes('<!-- SZ BRAND START -->')?next.replace(/<!-- SZ BRAND START -->[\s\S]*?<!-- SZ BRAND END -->/,()=>brand):next.replace('</head>',()=>brand+'\n</head>');
 if(next.includes('<!-- SZ MODE MAPS START -->'))next=next.replace(/<!-- SZ MODE MAPS START -->[\s\S]*?<!-- SZ MODE MAPS END -->/,()=>maps);else{const at=next.lastIndexOf('<script',next.indexOf('const CREATOR_BASE_MAP_COUNT'));if(at<0)throw Error('Workshop map allocation point missing');next=next.slice(0,at)+maps+'\n'+next.slice(at);}
 next=next.includes('<!-- SZ EVENT DATA START -->')?next.replace(/<!-- SZ EVENT DATA START -->[\s\S]*?<!-- SZ EVENT DATA END -->/,()=>event):next.replace('</head>',()=>event+'\n</head>');
 if(!next.includes('if(readOwner()===userId&&saved.zhEpoch'))next=next.replace("if (readOwner() !== userId || (saved.ts || 0) > (DB.ts || 0)) {","if(readOwner()===userId&&saved.zhEpoch&&saved.zhEpoch!==DB.zhEpoch)window.SzHubInventory?.apply(saved);\n          if (readOwner() !== userId || (saved.ts || 0) > (DB.ts || 0)) {");
 next=next.replace("} catch (error) { CL.msg = 'Cloud save failed: ' + (error.message || error); return false; }","} catch (error) {if(await window.SzHubInventory?.recover(error))return flushAccount();CL.msg='Cloud save failed: '+(error.message||error);return false;}");
 next=next.replace("const result = await sb.from('saves').upsert({ user_id: userId, json: value, updated_at: new Date().toISOString() });\n      if (result.error) throw result.error;","await window.SzGameSave.write(sb,value);");
 next=next.replace("if (readOwner() !== userId || (saved.ts || 0) > (DB.ts || 0)) {","if (window.SzWallet?.active || readOwner() !== userId || (saved.ts || 0) > (DB.ts || 0)) {");
 next=next.replace('const save=()=>{DB.ts=', 'const save=()=>{window.SzWallet?.attach();DB.ts=');
 fs.writeFileSync(file,next);
}
if(require.main===module)sync(process.argv.includes('--check'));
module.exports={sync};
