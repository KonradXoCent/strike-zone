'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {StudioBuilds,validate}=require('../platform/core/studio-builds.cjs');
test('Studio imports each game, isolates accounts and safely restores a previous version',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zone-studio-hub-'));
 try{const store=new StudioBuilds(dir),file=path.join(dir,'test.zonegame');
  const make=(gameId,html)=>({schema:'zone-studio-build-1',gameId,modeId:'mode-test',name:'Tryb testowy',project:'Moj projekt',baseVersion:'1.0.0',version:'0.1.0',html,sha256:crypto.createHash('sha256').update(html).digest('hex')});
  for(const gameId of ['strike','royale','haunt','football','zombie','night']){const build=make(gameId,'<!doctype html><p>'+gameId+'</p>');fs.writeFileSync(file,JSON.stringify(build));store.install('alice',file);assert.equal(store.get('alice',gameId,'mode-test').html.toString(),build.html);}
  assert.equal(store.list('alice').length,6);assert.equal(store.list('bob').length,0);
  const updated=make('football','<!doctype html><p>new</p>');fs.writeFileSync(file,JSON.stringify(updated));store.install('alice',file);assert(store.list('alice').find(x=>x.gameId==='football').canRollback);store.rollback('alice','football','mode-test');assert(store.get('alice','football','mode-test').html.toString().includes('football'));
  assert.throws(()=>validate({...updated,sha256:'0'.repeat(64)}),/STUDIO_INVALID/);assert.throws(()=>store.get('bob','football','mode-test'),/STUDIO_MISSING/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
