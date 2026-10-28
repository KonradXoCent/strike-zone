'use strict';
// Update real released Windows games using only the new ASAR, inside Electron.
const {_electron}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-content-live-'));
(async()=>{let app;try{
 fs.writeFileSync(tmp+'/package.json',JSON.stringify({main:'main.cjs'}));
 fs.writeFileSync(tmp+'/main.cjs',"globalThis.__req=require;require('electron').app.whenReady();");
 const args=[tmp,'--no-sandbox','--ozone-platform=headless','--headless','--disable-gpu'];
 if(process.env.HTTPS_PROXY)args.push('--proxy-server='+process.env.HTTPS_PROXY,'--ignore-certificate-errors');
 app=await _electron.launch({executablePath:require('electron'),args});
 const reports=[];
 for(const spec of require('../platform/core/catalog.cjs')){
  const result=await app.evaluate(async({net},{root,tmp,spec})=>{
   const fs=__req('original-fs'),path=__req('node:path'),crypto=__req('node:crypto'),{Packages}=__req(root+'/platform/core/packages.cjs'),fetchLive=__req(root+'/platform/core/network.cjs').createNetFetch(net);
   const built=root+(spec.id==='zone-haunt'?'/dist-haunt':spec.id==='strike-zone'?'/dist-managed':'/dist-royale'),next=JSON.parse(fs.readFileSync(built+'/'+spec.manifestName,'utf8')),installRoot=tmp+'/'+spec.id;
   const priorFetch=async(url,options)=>{const response=await fetchLive(url,options);if(url.includes('/releases?'))return Response.json((await response.json()).filter(r=>r.tag_name!==spec.releasePrefix+next.version));return response;};
   const options={root:installRoot,game:spec.id,executable:spec.executable,manifestName:spec.manifestName,releasePrefix:spec.releasePrefix,fetch:priorFetch};
   if(spec.id==='zone-haunt'&&next.version==='0.1.0')return{game:spec.id,firstRelease:true,fullBytes:next.bytes};
   const previous=new Packages(options);await previous.install();
   if(!previous.snapshot().canPlay)throw Error('Previous public installation failed: '+JSON.stringify(previous.state));
   const from=previous.state.installed.version,exeBefore=crypto.createHash('sha256').update(fs.readFileSync(previous.executable())).digest('hex');
   // A platform upgrade must recover a lost registry from the existing game.
   fs.rmSync(installRoot+'/installed.json');let downloads=0,transferred=0;
   const fetch=async(url)=>{
    if(url.includes('/releases?'))return Response.json([{tag_name:spec.releasePrefix+next.version,assets:[{name:spec.manifestName,browser_download_url:'https://github.com/KonradXoCent/strike-zone/releases/download/test/'+spec.manifestName}]}]);
    if(url.endsWith(spec.manifestName))return Response.json(next);
    if(url!==next.content.url&&url!==next.url)throw Error('Unexpected game download: '+url);
    downloads++;const bytes=fs.readFileSync(built+'/'+new URL(url).pathname.split('/').at(-1));transferred+=bytes.length;return new Response(bytes);
   };
   const current=new Packages({...options,fetch});if(!current.state.installed?.recovered||current.state.installed.version!==from)throw Error('Existing game was not recovered');
   await current.install();if(!current.snapshot().canPlay||!['content','full'].includes(current.state.installed.source)||downloads!==1)throw Error('Content update failed: '+JSON.stringify(current.state));
   await current.verify();if(current.state.verification.status!=='ok')throw Error('Updated integrity check failed');
   const exeAfter=crypto.createHash('sha256').update(fs.readFileSync(current.executable())).digest('hex');if(current.state.installed.source==='content'&&exeAfter!==exeBefore)throw Error('Electron executable was replaced during a content update');
   const pkg=JSON.parse(__req('node:fs').readFileSync(path.join(path.dirname(current.executable()),'resources/app.asar/package.json'),'utf8'));
   if(pkg.version!==next.version)throw Error('Game version did not update');
   const reopened=new Packages({...options,fetch});await reopened.check();if(!reopened.snapshot().canPlay||downloads!==1)throw Error('Restart lost the installation');
   return{game:spec.id,from,to:next.version,fullBytes:next.bytes,downloadedBytes:transferred,downloads,kind:current.state.installed.source,recovered:true,canPlay:reopened.snapshot().canPlay,integrity:current.state.verification.status};
  },{root,tmp,spec});
  if(!result.firstRelease&&result.kind==='content')assert(result.downloadedBytes<result.fullBytes/10);if(spec.id==='strike-zone')assert.equal(result.kind,'content');reports.push(result);console.log('PASS public Windows game content update:',JSON.stringify(result));
 }
 fs.mkdirSync(root+'/dist-platform',{recursive:true});fs.writeFileSync(root+'/dist-platform/content-update-report.json',JSON.stringify({status:'passed',games:reports},null,2));
 }finally{if(app)await app.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
