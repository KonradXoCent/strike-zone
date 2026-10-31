'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{settings}=require('../platform/core/preferences.cjs');
test('upgrading old preferences keeps per-game settings and applies compact appearance defaults',()=>{
 const p=settings({language:'en',theme:'forest',minimizeOnPlay:false,fullscreen:false,games:{'zone-haunt':{fullscreen:true}}});
 assert.equal(p.language,'en');assert.equal(p.theme,'forest');assert.equal(p.minimizeOnPlay,false);assert.equal(p.fullscreen,false);assert.deepEqual(p.games,{'zone-haunt':{fullscreen:true}});assert.equal(p.density,'compact');assert.equal(p.accent,'theme');assert.deepEqual(p.favorites,[]);
 const copy=settings(JSON.parse(JSON.stringify({...p,accent:'#56D4AC',showFriends:false,reduceMotion:true,favorites:['zone-haunt','zone-haunt','zone-football']})));
 assert.equal(copy.accent,'#56d4ac');assert.equal(copy.showFriends,false);assert.equal(copy.reduceMotion,true);assert.deepEqual(copy.favorites,['zone-haunt','zone-football']);assert.deepEqual(copy.games,p.games);
});
test('malformed preference files cannot inject CSS or grow an unbounded list of favorites',()=>{
 const p=settings({accent:'red; background:url(https://example.invalid)',density:'broken',theme:'not-owned-theme',favorites:['../game',null,{},'zone-football'],games:{'../game':{fullscreen:true},'strike-zone':{fullscreen:'true'}}});
 assert.equal(p.accent,'theme');assert.equal(p.density,'compact');assert.equal(p.theme,'violet');assert.deepEqual(p.games,{});assert.deepEqual(p.favorites,['zone-football']);assert.equal(settings({favorites:Array.from({length:1000},(_,i)=>'game-'+i)}).favorites.length,100);assert.equal(settings(null).theme,'violet');
});
