const assert=require('assert/strict'),fs=require('fs'),acorn=require('acorn'),{load}=require('./load.cjs');
const path=require('path'),root=path.resolve(__dirname,'../../..'),html=require('../../prepare-preview.cjs').makePreview(),source=fs.readFileSync(path.join(root,'game-source/index.html'),'utf8');assert(!source.includes('__coreFixture'));assert(!source.includes('sz-test-preview-account'));assert(source.includes('<title>Strike Zone 2D</title>'));assert(html.includes('window.supabase.createClient'));require('../../embed-shared.cjs').sync(true);
let count=0;for(const s of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/type=["'](?:text\/plain|application\/json)/.test(s[1]))continue;acorn.parse(s[2],{ecmaVersion:'latest'});count++;}
const {w,dom,errors}=load();
setTimeout(()=>{try{
 const entries=w.SzCoreMaps.entries();assert.equal(entries.length,34);
 for(const e of entries){const mode=e.id>=6&&e.id<=8?'br':e.id>=9&&e.id<=11?'zombie':e.id>=14&&e.id<=16?'prophunt':e.id>=17&&e.id<=20?'minigames':e.id===21?'zombie':e.id>=22&&e.id<=24?'domination':e.id>=25&&e.id<=27?'heist':e.id>=28&&e.id<=30?'survival':e.id>=31?'laser':'tdm';
  w.eval(`if(G)quit();sel.mode=${JSON.stringify(mode)};sel.map=${e.id};sel.team='CT';begin0();if(G.intro)skipIntro();G.paused=false;G.bo=0;$('buy').style.display='none';draw();for(let n=0;n<30;n++)upd(1/30);draw();`);
  assert(w.SzMapDepth.active(),e.name);assert(w.eval('G.ps.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.hp))'),e.name);
  const bakes=w.SzMapDepth.stats().bakes,tiles=w.SzMapDepth.stats().textureBuilds;w.draw();w.draw();assert.equal(w.SzMapDepth.stats().bakes,bakes);assert.equal(w.SzMapDepth.stats().textureBuilds,tiles);
 }
 assert.deepEqual(errors,[]);console.log('PASS',entries.length,'maps render and simulate with stable 2.5D caches and valid player/bot state');console.log('PASS',count,'executable scripts parse; normal authentication is retained; QA fixtures are absent from the deliverable');dom.window.close();process.exit(0);
}catch(e){console.error(e.stack);console.error(errors);dom.window.close();process.exit(1);}},50);
