'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyProvenance,verifyFeed,verifyRelease,REQUIRED_STEPS}=require('../scripts/publish-football-061.cjs');

const sha='e8aa59295b1279ca4e6ef026b085f97202a64bee';
function provenance(){return{
 run:{head_sha:sha,head_branch:'release/football-061',path:'.github/workflows/football-public-061-check.yml',status:'completed',conclusion:'success'},
 jobs:[{name:'windows-verification',status:'completed',conclusion:'success',steps:REQUIRED_STEPS.map(name=>({name,conclusion:'success'}))}],
 artifact:{id:13380177626,name:'Zone-Hub-0.1.27-Verified-Installer',digest:'sha256:9590f49a526269a4baff908c53a43089a87c4f25495e8450938d4a4d6748d10a',expired:false,workflow_run:{id:41948712053,head_sha:sha}},
};}
test('publication refuses failed checks, wrong commits and expired artifacts',()=>{
 let p=provenance();assert.doesNotThrow(()=>verifyProvenance(p.run,p.jobs,p.artifact));
 p.jobs[0].steps.find(x=>x.name==='Test Ultimate Team online and live catalog').conclusion='failure';
 assert.throws(()=>verifyProvenance(p.run,p.jobs,p.artifact));
 p=provenance();p.artifact.workflow_run.head_sha='different';assert.throws(()=>verifyProvenance(p.run,p.jobs,p.artifact));
 p=provenance();p.artifact.expired=true;assert.throws(()=>verifyProvenance(p.run,p.jobs,p.artifact));
});
test('updater metadata and the real installed update report must match the installer',()=>{
 const actual={exeSize:100000000,blockmapSize:123,exeSha512:'correct-hash'};
 const feed={version:'0.1.27',files:[{url:'ZoneHub-Beta-0.1.27.exe',size:actual.exeSize,sha512:actual.exeSha512}],sha512:actual.exeSha512};
 const report={status:'passed',from:'0.1.22',to:'0.1.27',checks:[
  'Installed 0.1.22 downloads and verifies the new platform from its own update screen',
  'Silent update preserves encrypted login, settings and existing game files',
  'Updated Zone Hub runs on the same account without another login',
 ]};
 assert.doesNotThrow(()=>verifyFeed(feed,report,actual));
 assert.throws(()=>verifyFeed({...feed,sha512:'wrong'},report,actual));
 assert.throws(()=>verifyFeed(feed,{...report,status:'failed'},actual));
 assert.throws(()=>verifyFeed(feed,{...report,from:'0.1.21'},actual));
});
test('published assets must have the exact tested digest, size and source',()=>{
 const expected={'zonehub.yml':{size:150,sha256:'abc'}};
 const release={target_commitish:sha,draft:false,assets:[{name:'zonehub.yml',size:150,digest:'sha256:abc'}]};
 assert.doesNotThrow(()=>verifyRelease(release,expected,true));
 assert.throws(()=>verifyRelease({...release,draft:true},expected,true));
 assert.throws(()=>verifyRelease({...release,target_commitish:'other'},expected,true));
 assert.throws(()=>verifyRelease({...release,assets:[{...release.assets[0],digest:'sha256:changed'}]},expected,true));
});
