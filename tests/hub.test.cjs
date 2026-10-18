const {test}=require('node:test'),assert=require('node:assert/strict');
const {category,fold,matches}=require('../shared/game-hub.js');
const {create}=require('../shared/locale.js');
test('inventory categories separate legacy heavy/shotgun SMGs and group every knife variant',()=>{
 for(const key of ['knife','knife:0','knife:24:st','knife:55:st'])assert.equal(category(key),'knives');
 for(const key of ['nova','xm1014','mag7','sawed'])assert.equal(category(key,{slot:0,c:'smg'}),'shotguns');
 for(const key of ['m249','negev'])assert.equal(category(key,{slot:0,c:'smg'}),'heavy');
 for(const key of ['mp9','ump','mp7','bizon'])assert.equal(category(key,{slot:0,c:'smg'}),'smgs');
 assert.equal(category('deagle',{slot:1}),'pistols');assert.equal(category('ak',{slot:0}),'rifles');
 assert.equal(category('awp',{slot:0,c:'sniper'}),'snipers');assert.equal(category('unknown'),'other');
});
test('skin discovery combines a type filter with case and accent independent names',()=>{
 const skin={category:'knives',search:'Butterfly Knife | Żółw StatTrak'};
 assert.equal(fold('  ŻÓŁW  '),'zolw');assert.equal(matches(skin,'ŻÓŁW','knives'),true);
 assert.equal(matches(skin,'zolw','all'),true);assert.equal(matches(skin,'STATTrak','knives'),true);
 assert.equal(matches(skin,'zolw','snipers'),false);assert.equal(matches(skin,'Dragon Lore','knives'),false);
 assert.equal(matches(skin,'','all'),true);
});
test('mode and map voting headings translate as complete phrases in both languages',()=>{
 const pl=create('pl'),en=create('en');
 assert.equal(pl.t('SELECT GAME MODE'),'WYBIERZ TRYB GRY');
 assert.equal(pl.t('VOTE FOR THE MAP — 10s'),'Głosuj na mapę — 10s');
 assert.equal(en.t('Wybierz tryb gry'),'Select game mode');
 assert.equal(en.t('Głosuj na mapę'),'Vote for the map');
 assert.equal(en.t('Ty'),'You');assert.equal(en.t('Strzelby'),'Shotguns');
 assert.equal(en.t('Cztery nowe noże'),'Four new knives');
});
