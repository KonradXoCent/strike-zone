'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const limit=24*1024*1024,games=new Set(['strike','royale','haunt','football','zombie','night']);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const validMode=x=>x==='base'||typeof x==='string'&&/^mode-[a-z0-9-]{1,40}$/.test(x);
const text=(x,n)=>typeof x==='string'&&x.trim()&&x.length<=n&&!/[\u0000-\u001f]/.test(x);
function validate(b){
 if(!b||b.schema!=='zone-studio-build-1'||!games.has(b.gameId)||!validMode(b.modeId)||!text(b.name,48)||!text(b.project,48)||!text(b.baseVersion,64)||typeof b.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(b.version)||typeof b.html!=='string'||!/^<!doctype html\b/i.test(b.html.trimStart())||Buffer.byteLength(b.html)>limit||!/^[a-f0-9]{64}$/.test(b.sha256)||hash(b.html)!==b.sha256)throw Error('STUDIO_INVALID');
 return{gameId:b.gameId,modeId:b.modeId,name:b.name.trim(),project:b.project.trim(),version:b.version,baseVersion:b.baseVersion.trim(),sha256:b.sha256};
}
function writeAtomic(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';try{const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}finally{try{fs.unlinkSync(temp);}catch{}}}
class StudioBuilds{
 constructor(root){this.root=root;}
 userDirectory(id){if(typeof id!=='string'||!id||id.length>200)throw Error('HUB_LOGIN');return path.join(this.root,hash(id));}
 readIndex(id){const file=path.join(this.userDirectory(id),'index.json');try{const value=JSON.parse(fs.readFileSync(file,'utf8'));if(!value||value.schema!==1||!Array.isArray(value.builds)||value.builds.length>100)throw Error();return value;}catch(e){if(e.code==='ENOENT')return{schema:1,builds:[]};throw Error('STUDIO_INDEX');}}
 list(id){if(!id)return[];return this.readIndex(id).builds.map(({previous,...item})=>({...item,canRollback:!!previous}));}
 install(id,file){const stat=fs.statSync(file);if(!stat.isFile()||stat.size>limit*2||stat.size<1)throw Error('STUDIO_INVALID');let build;try{build=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('STUDIO_INVALID');}const info=validate(build),dir=this.userDirectory(id),index=this.readIndex(id),pos=index.builds.findIndex(x=>x.gameId===info.gameId&&x.modeId===info.modeId);if(pos<0&&index.builds.length>=100)throw Error('STUDIO_LIMIT');const target=path.join(dir,'content',info.sha256+'.html');if(!fs.existsSync(target)||hash(fs.readFileSync(target))!==info.sha256)writeAtomic(target,build.html);if(pos>=0){const {previous,...current}=index.builds[pos];index.builds[pos]={...info,previous:current.sha256===info.sha256?previous||null:current};}else index.builds.push({...info,previous:null});writeAtomic(path.join(dir,'index.json'),JSON.stringify(index));return info;}
 readContent(id,info){if(!info||!/^[a-f0-9]{64}$/.test(info.sha256))throw Error('STUDIO_INVALID');const file=path.join(this.userDirectory(id),'content',info.sha256+'.html');try{const stat=fs.statSync(file);if(!stat.isFile()||stat.size>limit)throw Error();const data=fs.readFileSync(file);if(hash(data)!==info.sha256)throw Error();return data;}catch{throw Error('STUDIO_DAMAGED');}}
 get(id,gameId,modeId){if(!games.has(gameId)||!validMode(modeId))throw Error('STUDIO_INVALID');const info=this.readIndex(id).builds.find(x=>x.gameId===gameId&&x.modeId===modeId);if(!info)throw Error('STUDIO_MISSING');return{info,html:this.readContent(id,info)};}
 rollback(id,gameId,modeId){if(!games.has(gameId)||!validMode(modeId))throw Error('STUDIO_INVALID');const index=this.readIndex(id),i=index.builds.findIndex(x=>x.gameId===gameId&&x.modeId===modeId);if(i<0||!index.builds[i].previous)throw Error('STUDIO_MISSING');const{previous,...current}=index.builds[i];this.readContent(id,previous);index.builds[i]={...previous,previous:current};writeAtomic(path.join(this.userDirectory(id),'index.json'),JSON.stringify(index));}
}
module.exports={StudioBuilds,validate};
