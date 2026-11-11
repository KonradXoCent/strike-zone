'use strict';

// Publish the installer that passed the existing Windows verification. Do not
// rebuild it here: the release must contain exactly the tested files.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const REPO='KonradXoCent/strike-zone';
const SOURCE='e8aa59295b1279ca4e6ef026b085f97202a64bee';
const RUN=41948712053;
const ARTIFACT=13380177626;
const ARTIFACT_NAME='Zone-Hub-0.1.27-Verified-Installer';
const ARTIFACT_DIGEST='sha256:9590f49a526269a4baff908c53a43089a87c4f25495e8450938d4a4d6748d10a';
const HUB='0.1.27', FOOTBALL='0.6.1';
const REQUIRED_STEPS=[
 'Check frontend syntax and translations',
 'Test football, account, wallet and update rules',
 'Test Zone Studio import and rollback',
 'Test Zone Hub interface and account flows',
 'Test Football interface',
 'Test Football regressions',
 'Test quick online matches',
 'Test Ultimate Team online and live catalog',
 'Test offline Football and pack openings',
 'Build the Windows installer',
 'Verify the installed update preserves login, settings and games',
 'Store the verified installer',
];

function verifyProvenance(run,jobs,artifact){
 assert.equal(run.head_sha,SOURCE);assert.equal(run.head_branch,'release/football-061');
 assert.equal(run.path,'.github/workflows/football-public-061-check.yml');
 assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');
 const job=jobs.find(j=>j.name==='windows-verification');assert(job);
 assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');
 for(const name of REQUIRED_STEPS)assert.equal(job.steps.find(s=>s.name===name)?.conclusion,'success',name);
 assert.equal(artifact.id,ARTIFACT);assert.equal(artifact.name,ARTIFACT_NAME);
 assert.equal(artifact.digest,ARTIFACT_DIGEST);assert.equal(artifact.expired,false);
 assert.equal(artifact.workflow_run.id,RUN);assert.equal(artifact.workflow_run.head_sha,SOURCE);
}

function verifyFeed(feed,report,actual){
 const name=`ZoneHub-Beta-${HUB}.exe`;
 assert.equal(feed.version,HUB);assert.equal(feed.files?.length,1);
 assert.equal(feed.files[0].url,name);assert.equal(feed.files[0].size,actual.exeSize);
 assert.equal(feed.files[0].sha512,actual.exeSha512);assert.equal(feed.sha512,actual.exeSha512);
 assert(actual.exeSize>50_000_000);assert(actual.blockmapSize>0);
 assert.equal(report.status,'passed');assert.equal(report.from,'0.1.22');assert.equal(report.to,HUB);
 for(const text of [
  'Installed 0.1.22 downloads and verifies the new platform from its own update screen',
  'Silent update preserves encrypted login, settings and existing game files',
  'Updated Zone Hub runs on the same account without another login',
 ])assert(report.checks.includes(text),'Missing installed-update check: '+text);
}

function verifyRelease(release,expected,requirePublic){
 assert(release);assert.equal(release.target_commitish,SOURCE);
 if(requirePublic)assert.equal(release.draft,false);
 for(const [name,asset] of Object.entries(expected)){
  const row=release.assets.find(a=>a.name===name);assert(row,'Missing release asset '+name);
  assert.equal(row.size,asset.size);assert.equal(row.digest,'sha256:'+asset.sha256);
 }
}

function main(){
 assert.equal(process.env.GITHUB_REPOSITORY,REPO);
 assert(process.env.GH_TOKEN,'GH_TOKEN is required');
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'dist-platform');
 const gh=(args,input)=>execFileSync('gh',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,...(input===undefined?{}:{input:JSON.stringify(input)})});
 const api=(endpoint,method,body)=>JSON.parse(gh(['api',...(method?['--method',method]:[]),`repos/${REPO}/${endpoint}`,...(body?['--input','-']:[])],body));
 const run=api(`actions/runs/${RUN}`),jobs=api(`actions/runs/${RUN}/jobs?per_page=100`).jobs,artifact=api(`actions/artifacts/${ARTIFACT}`);
 verifyProvenance(run,jobs,artifact);
 console.log('PASS: successful Windows verification and exact artifact provenance');
 if(process.argv.includes('--check-source'))return;

 const yaml=require('js-yaml'),file=`ZoneHub-Beta-${HUB}.exe`;
 const names=[file,file+'.blockmap','zonehub.yml'],byName=Object.fromEntries(names.map(n=>[n,path.join(dir,n)]));
 const sha=(algorithm,file,encoding='hex')=>crypto.createHash(algorithm).update(fs.readFileSync(file)).digest(encoding);
 const feed=yaml.load(fs.readFileSync(byName['zonehub.yml'],'utf8'));
 const report=JSON.parse(fs.readFileSync(path.join(dir,'installed-update-report.json'),'utf8'));
 verifyFeed(feed,report,{exeSize:fs.statSync(byName[file]).size,blockmapSize:fs.statSync(byName[file+'.blockmap']).size,exeSha512:sha('sha512',byName[file],'base64')});
 const expected=Object.fromEntries(names.map(n=>[n,{size:fs.statSync(byName[n]).size,sha256:sha('sha256',byName[n])}]));
 console.log('PASS: verified installer, updater feed and installed-update report');

 function releases(){return api('releases?per_page=100');}
 function ensure(tag,title,notes){
  let release=releases().find(r=>r.tag_name===tag);
  if(release){assert.equal(release.target_commitish,SOURCE,'Existing release points to a different commit');return release;}
  return api('releases','POST',{tag_name:tag,target_commitish:SOURCE,name:title,body:notes,draft:true,prerelease:true,make_latest:'false'});
 }
 const hubTag=`zonehub-v${HUB}`,footballTag=`football-v${FOOTBALL}`;
 const hubNotes=['# Zone Hub 0.1.27 / Zone Football 0.6.1','',
  '- Nowa wersja Zone Football, dostępna po aktualizacji Zone Hub.',
  '- Zone Studio umożliwia uprawnionemu właścicielowi dodawanie, zmianę i wycofywanie paczek w sklepie Football online bez kolejnej aktualizacji gry.',
  '- Konto, ustawienia i istniejące instalacje gier zostają zachowane przy aktualizacji Huba.',
  '',`[Weryfikacja instalatora Windows](https://github.com/${REPO}/actions/runs/${RUN})`].join('\n');
 const footballNotes=['# Zone Football 0.6.1','',
  `Gra jest wbudowana w [Zone Hub 0.1.27](https://github.com/${REPO}/releases/tag/${hubTag}).`,
  'Po jednorazowej aktualizacji Huba nowe paczki można publikować z Zone Studio bez aktualizowania gry.'].join('\n');
 let hub=ensure(hubTag,`Zone Hub Beta ${HUB} — Zone Football i Zone Studio`,hubNotes);
 let football=ensure(footballTag,`Zone Football Beta ${FOOTBALL}`,footballNotes);
 if(hub.draft){
  gh(['release','upload',hubTag,...names.map(n=>byName[n]),'--repo',REPO,'--clobber']);
  hub=api(`releases/${hub.id}`);verifyRelease(hub,expected,false);
  hub=api(`releases/${hub.id}`,'PATCH',{draft:false,prerelease:true,make_latest:'false'});
 }
 verifyRelease(hub,expected,true);
 if(football.draft)football=api(`releases/${football.id}`,'PATCH',{draft:false,prerelease:true,make_latest:'false'});
 verifyRelease(football,{},true);
 const visible=releases();assert(visible.some(r=>r.tag_name===hubTag&&!r.draft&&r.assets.some(a=>a.name==='zonehub.yml')));
 console.log(`PASS: public release https://github.com/${REPO}/releases/tag/${hubTag}`);
 console.log(`PASS: public release https://github.com/${REPO}/releases/tag/${footballTag}`);
}

module.exports={verifyProvenance,verifyFeed,verifyRelease,REQUIRED_STEPS};
if(require.main===module){try{main();}catch(e){console.error(e.stack);process.exitCode=1;}}
