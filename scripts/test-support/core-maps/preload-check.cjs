const fs=require('fs'),assert=require('assert/strict'),{load}=require('./load.cjs');
// Substitute only the old visual loader, leaving the new refresh wrapper intact.
const html=require('../../prepare-preview.cjs').makePreview(),fixture=fs.readFileSync(__dirname+'/fixture.js','utf8'),file=__dirname+'/preload-fixture.html';
fs.writeFileSync(file,html.replace('<script>\n/* Owner editing','<script>'+fixture+'\n__setCoreQAUser(false);globalThis.__loadCalls=0;loadScreen=cb=>{__loadCalls++;cb();};</script><script>\n/* Owner editing'));
const {w,dom,errors}=load(file),Q=s=>w.eval(s);
setTimeout(async()=>{try{
 const {w:owner,dom:od,errors:ownerErrors}=load();owner.eval(fixture);await owner.SzCoreMaps.authorize();const map=owner.SzCoreMaps.snapshot('core-2-mirage'),d=Buffer.from(map.cells,'base64');let i=d.findIndex((x,i)=>x===0&&i>1000);assert(i>0);d[i]=1;map.cells=d.toString('base64');w.__coreFixture.rows=[{map_key:map.key,revision:7,payload:map}];
 assert.notEqual(Q('GRS[2].d['+i+']'),1);Q("sel.map=2;sel.mode='tdm';sel.team='CT'");await w.loadScreen(()=>Q('begin0();if(G.intro)skipIntro();G.paused=true;'));assert.equal(Q('__loadCalls'),1);assert.equal(Q('GR.d['+i+']'),1);assert.equal(Q('G.coreMapVersion.revision'),7);assert.deepEqual(errors,[]);assert.equal(owner.__coreFixture.rows.length,0);assert.deepEqual(ownerErrors,[]);
 console.log('PASS the regular loading path fetches and applies the latest published map before creating the next match');dom.window.close();od.window.close();fs.unlinkSync(file);process.exit(0);
 }catch(e){console.error(e.stack);console.error(errors);dom.window.close();try{fs.unlinkSync(file)}catch{}process.exit(1);}},20);
