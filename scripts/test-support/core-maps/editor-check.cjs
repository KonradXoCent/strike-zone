const {load}=require('./load.cjs'),fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const game=load(),w=game.w,Q=s=>w.eval(s),fixture=fs.readFileSync(__dirname+'/fixture.js','utf8');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const json=s=>JSON.parse(Q('JSON.stringify('+s+')'));const tick=()=>new Promise(r=>setTimeout(r,5));
async function run(){
 await tick();w.document.getElementById('preview-account-dialog')?.remove();Q(fixture);await w.SzCoreMaps.authorize();await w.SzCoreMaps.refresh();assert(w.SzCoreMaps.isOwner());
 const entries=w.SzCoreMaps.entries();assert.equal(entries.length,34);
 for(const e of entries){const model=w.SzCoreMaps.snapshot(e.key);w.SzCoreMaps.parse(model);w.SzCoreMaps.check(model);w.SzCoreMaps.load(e.key);assert(w.document.getElementById('core-map-canvas'),e.name);assert.equal(hash(w.SzCoreMaps.draft()),hash(model),e.name+' loads exactly');}
 console.log('PASS all 34 existing map layouts load at their native dimensions, cells, covers, windows, spawns and sites');
 const key='core-2-mirage';w.SzCoreMaps.load(key);const original=w.SzCoreMaps.draft(),baseline=hash(original);
 const raw=Buffer.from(original.cells,'base64');let cell=-1;for(let y=10;y<original.rows-10&&cell<0;y++)for(let x=10;x<original.cols-10&&cell<0;x++){if([0,1,-1,original.cols,-original.cols].every(n=>raw[y*original.cols+x+n]===0))cell=y*original.cols+x;}
 assert(cell>=0);const x=(cell%original.cols)*original.cell,y=Math.floor(cell/original.cols)*original.cell;
 // Drive the real canvas pointer handlers, including undo recording.
 const c=w.document.getElementById('core-map-canvas'),r=c.getBoundingClientRect(),scale=Math.min((c.width-36)/original.width,(c.height-36)/original.height),ox=(c.width-original.width*scale)/2,oy=(c.height-original.height*scale)/2;
 w.document.querySelector('[data-tool="wall"]').click();const ev={button:0,clientX:(ox+(x+1)*scale)/c.width*r.width,clientY:(oy+(y+1)*scale)/c.height*r.height,pointerId:1,preventDefault(){}};
 c.onpointerdown(ev);c.onpointerup(ev);assert.equal(Buffer.from(w.SzCoreMaps.draft().cells,'base64')[cell],1);w.SzCoreMaps.history();assert.equal(hash(w.SzCoreMaps.draft()),baseline);w.SzCoreMaps.history(true);assert.equal(Buffer.from(w.SzCoreMaps.draft().cells,'base64')[cell],1);
 console.log('PASS actual canvas stroke adds a wall; undo and redo preserve every other map field');
 w.SzCoreMaps.paint([x,y,original.cell,original.cell],'erase');assert.equal(hash(w.SzCoreMaps.draft()),baseline);w.SzCoreMaps.paint([x,y,original.cell,original.cell],'wall');
 const draft=w.SzCoreMaps.draft();w.SzCoreMaps.saveDraft();w.SzCoreMaps.load(key);assert.equal(hash(w.SzCoreMaps.draft()),hash(draft));assert.equal(json('GRS[2].d['+cell+']'),0,'draft does not modify live map');
 console.log('PASS saving and reopening an owner draft leaves the live pool unchanged');
 const stats=hash(json('({wallet:P().wallet,kills:P().kills,matches:P().matches,wins:P().wins,xp:P().xp})'));
 w.SzCoreMaps.beginTest();assert(Q('!!G.creatorTest'));assert.equal(Q('GR.d['+cell+']'),1);assert.equal(Q('sel.map'),2);Q("if(G.intro)skipIntro();G.paused=false;G.bo=0;$('buy').style.display='none';for(let i=0;i<30;i++)upd(1/30);draw();quit();");
 assert.equal(json('GRS[2].d['+cell+']'),0);assert(w.document.getElementById('core-map-canvas'));assert.equal(hash(w.SzCoreMaps.draft()),hash(draft));assert.equal(hash(json('({wallet:P().wallet,kills:P().kills,matches:P().matches,wins:P().wins,xp:P().xp})')),stats);
 console.log('PASS test with bots uses the edited map, awards no account progress, restores the live version and returns to this draft');
 w.document.querySelector('[data-action="publish"]').click();await tick();await tick();assert.equal(w.__coreFixture.published,1);assert.equal(w.__coreFixture.rows[0].revision,1);assert.equal(json('GRS[2].d['+cell+']'),1);
 // A refresh while playing must not replace the match's collision mask.
 Q("sel.map=2;sel.mode='tdm';sel.team='CT';begin0();if(G.intro)skipIntro();G.paused=true;");
 w.__coreFixture.rows[0]={...w.__coreFixture.rows[0],revision:2,payload:original};await w.SzCoreMaps.refresh();assert.equal(Q('GR.d['+cell+']'),1);Q('quit()');assert.equal(json('GRS[2].d['+cell+']'),0);
 console.log('PASS publication is versioned and updates future matches while the current match retains its geometry');
 w.SzCoreMaps.load(key);w.SzCoreMaps.paint([x,y,original.cell,original.cell],'wall');const saved=hash(w.SzCoreMaps.draft());w.__coreFixture.rows[0].revision=3;
 w.document.querySelector('[data-action="publish"]').click();await tick();await tick();assert.equal(w.__coreFixture.published,1);assert.equal(hash(w.SzCoreMaps.draft()),saved);assert(w.document.getElementById('core-map-notice').textContent.includes('nowsza'));
 console.log('PASS a concurrent publication is rejected without losing the local edit');
 Q('__setCoreQAUser(false)');assert.equal(await w.SzCoreMaps.authorize(),false);assert.equal(w.SzCoreMaps.snapshot(key),null);assert.equal(w.SzCoreMaps.draft(),null);Q('creatorTab("maps")');assert.equal(w.document.querySelectorAll('[data-core-nav]').length,0);
 const count=w.__coreFixture.published;w.SzCoreMaps.paint([100,100,12.5,12.5],'wall');await w.SzCoreMaps.open();assert.equal(w.__coreFixture.published,count);assert.equal(w.document.querySelectorAll('.core-editor').length,0);
 console.log('PASS an ordinary account cannot open or invoke owner editing, including direct calls');
 assert.deepEqual(game.errors,[]);console.log('ALL EDITOR CHECKS PASSED');
}
run().then(()=>{game.dom.window.close();process.exit(0)}).catch(e=>{console.error(e.stack);game.dom.window.close();process.exit(1)});
