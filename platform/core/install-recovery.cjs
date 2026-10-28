'use strict';
const fs=require('./file-system.cjs'),path=require('node:path');
function read(file){try{if(fs.statSync(file).size>4000000)return null;return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function recover({root,legacyRoots=[],game,executable,version,compare,readAsarFile}){const choices=[];
 for(const base of [...new Set([root,...legacyRoots])]){let names=[];try{names=fs.readdirSync(path.join(base,'versions')).filter(x=>/^[a-f0-9]{64}$/.test(x)).slice(0,64);}catch{continue;}
  const record=read(path.join(base,'installed.json'));
  for(const sha256 of names){try{const dir=path.join(base,'versions',sha256);if(fs.lstatSync(dir).isSymbolicLink()||!fs.statSync(path.join(dir,executable)).isFile()||!fs.statSync(path.join(dir,'resources/app.asar')).isFile())continue;const index=read(path.join(dir,'zonehub-integrity.json'));let v=null;
    if(index?.schema===1&&index.game===game&&version(index.version)&&Array.isArray(index.files)&&index.files.some(x=>x.path===executable)&&index.files.some(x=>x.path==='resources/app.asar'))v=index.version;
    if(!v&&record?.sha256===sha256&&(!record.game||record.game===game)&&version(record.version)){try{const pkg=JSON.parse(readAsarFile(path.join(dir,'resources/app.asar'),'package.json'));if(pkg.platformOnly===true&&(game==='zone-royale'?pkg.brStandalone===true:game==='strike-zone'?pkg.brStandalone!==true:false))v=record.version;}catch{}}
    if(v)choices.push({base,dir,version:v,sha256});
   }catch{}}
 }
 choices.sort((a,b)=>compare(b.version,a.version));for(const item of choices){try{const target=path.join(root,'versions',item.sha256);fs.mkdirSync(path.dirname(target),{recursive:true});if(path.resolve(target)!==path.resolve(item.dir)&&!fs.existsSync(target)){try{fs.renameSync(item.dir,target);}catch{fs.cpSync(item.dir,target,{recursive:true,errorOnExist:true,force:false});}}
   const record={game,version:item.version,sha256:item.sha256,installedAt:new Date().toISOString(),recovered:true};fs.writeFileSync(path.join(root,'installed.json.tmp'),JSON.stringify(record));fs.renameSync(path.join(root,'installed.json.tmp'),path.join(root,'installed.json'));return record;
  }catch{}}
 return null;
}
module.exports={recover};
