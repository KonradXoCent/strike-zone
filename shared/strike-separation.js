/* Strike keeps the shared engine, but Royale content belongs to Zone Royale. */
(function(root){'use strict';
 if(root.SZ_ROYALE)return;
 const crates=new Set(['drop','supply']),blockedModes=new Set(root.SZ_FOOTBALL?['br','zombie']:['br','football','zombie']);
 if(!root.SZ_FOOTBALL){const at=SzMiniData.keys.indexOf('football');if(at>=0)SzMiniData.keys.splice(at,1);}
 for(let i=CI.length-1;i>=0;i--)if(crates.has(CI[i]))CI.splice(i,1);
 for(let i=MODES.length-1;i>=0;i--)if(blockedModes.has(MODES[i][0])){MODES.splice(i,1);MI.splice(i,1);MD.splice(i,1);}
 for(let i=ACH.length-1;i>=0;i--)if(blockedModes.has(ACH[i][0]))ACH.splice(i,1);
 if(typeof GEN!=='undefined')for(let i=GEN.length-1;i>=0;i--)if(/Battle Royale/i.test(GEN[i]))GEN.splice(i,1);
 for(const id of blockedModes)delete SLOTS[id];
 const baseMaps=mapSet;mapSet=function(id){return blockedModes.has(id)?[]:baseMaps(id);};
 let mode=blockedModes.has(sel.mode)?'classic':sel.mode;
 Object.defineProperty(sel,'mode',{enumerable:true,configurable:true,get:()=>mode,set:value=>{mode=blockedModes.has(value)?'classic':value;}});
 if([6,7,8,9,10,11].includes(sel.map)||!root.SZ_FOOTBALL&&sel.map===SzMiniData.ids.football)sel.map=0;
 const tabs=workshopTabs;workshopTabs=function(){const box=document.createElement('div');box.innerHTML=tabs();for(const b of box.querySelectorAll('button'))if(/invSet\(['"]br['"]\)/.test(b.getAttribute('onclick')||''))b.remove();return box.innerHTML;};
 const set=invSet;invSet=function(value){return set(value==='br'?'w':value);};
 const inventory=invTabs;invTabs=function(...args){if(INV==='br')INV='w';return inventory(...args);};
 const hub=featureHub;featureHub=function(...args){const result=hub(...args);document.querySelector('.br-news')?.remove();return result;};
 const open=openBR;openBR=function(i,...args){if(crates.has(CI[i]))return;return open(i,...args);};
 const buy=buyC;buyC=function(i,...args){if(crates.has(CI[i])||!CS[CI[i]])return;return buy(i,...args);};
 const beforeTab=tab;tab=function(...args){if(INV==='br')INV='w';const result=beforeTab(...args);document.querySelector('.br-news')?.remove();for(const option of document.querySelectorAll('option[value="br"]'))option.remove();return result;};
 root.SzStrikeSeparation={allowsMode:id=>!blockedModes.has(id),allowsCase:id=>!crates.has(id)};
 if(typeof T==='string'&&['play','shop','inv','prof','features'].includes(T))tab(T);
})(globalThis);
