'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const name of ['editor-check','breakables-check','network-check','variants-check','variant-network-check','preload-check','render-check','doors-sandbox-check','doors-network-check']){
 const result=spawnSync(process.execPath,[path.join(__dirname,'test-support/core-maps',name+'.cjs')],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS owner map revisions, separate releases, cached depth rendering, destructible sounds and shared matches');
