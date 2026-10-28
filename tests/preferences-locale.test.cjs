const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {preferences}=require('../core/preferences.cjs'),{create}=require('../shared/locale.js');
test('desktop preferences persist and reject arbitrary properties or values',t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sz-pref-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const p=preferences(path.join(dir,'prefs.json'));assert.deepEqual(p.get(),{language:'pl',theme:'night',fullscreen:false});p.set({language:'en',theme:'forest'});assert.deepEqual(preferences(path.join(dir,'prefs.json')).get(),{language:'en',theme:'forest',fullscreen:false});p.set({fullscreen:true});assert.equal(preferences(path.join(dir,'prefs.json')).get().fullscreen,true);assert.throws(()=>p.set({fullscreen:'yes'}));assert.throws(()=>p.set({language:'xx'}));assert.throws(()=>p.set({path:'/tmp'}));});
test('locale translates display labels in both directions and preserves user content and numbers',()=>{const l=create('en');assert.equal(l.t('  Wybierz mapę  '),'  Choose map  ');assert.equal(l.t('Twoja drużyna: CT'),'Your team: CT');assert.equal(l.t('Wymagana aktualizacja'),'Update required');assert.equal(l.t('POBIERANIE'),'DOWNLOADING');l.protected.add('Wybierz');assert.equal(l.t('Wybierz'),'Wybierz');l.set('pl');assert.equal(l.t('Music volume'),'Głośność muzyki');assert.equal(l.t('Skins (12)'),'Skiny (12)');assert.equal(l.t('9007199254740995'),'9007199254740995');});
test('complete Workshop labels and dynamic contract descriptions translate without changing inserted values',()=>{
 const l=create('en'),template='10 wybranych egzemplarzy zostanie zużytych. Każdy z {count} skinów następnej jakości ma taką samą szansę. 10 skinów StatTrak™ daje nagrodę StatTrak™; mieszany kontrakt daje zwykły skin.';
 assert.equal(l.t('WYCOFAJ'),'WITHDRAW');assert.equal(l.t('Zatwierdź i dodaj do głównej puli'),'Approve and add to the main pool');
 assert.equal(l.format(template,{count:124}),'The 10 selected items will be consumed. Each of the 124 skins of the next rarity has the same chance. Ten StatTrak™ skins grant a StatTrak™ reward; a mixed contract grants a regular skin.');
 assert.match(l.format(template,{count:0}),/Each of the 0 skins/);assert.match(l.format(template,{count:'Mapa gracza'}),/Each of the Mapa gracza skins/);
 l.set('pl');assert.equal(l.t('Remove from the main pool'),'Wyłącz z głównej puli');assert.equal(l.format(template,{count:3}),template.replace('{count}','3'));
});
test('Workshop map labels translate the game prefix and preserve the entire authored title',()=>{
 const l=create('en'),title='Warsztat Zapisz Północ <img src=x onerror=alert(1)>';
 assert.equal(l.mapName('[Warsztat] '+title),'[Workshop] '+title);assert.equal(l.t('[Warsztat] '+title),'[Workshop] '+title);assert.equal(l.mapName('workshop / '+title),'Workshop / '+title);
 const html=l.mapNameHTML('[Warsztat] '+title);assert.match(html,/data-map-label=/);assert.ok(html.includes('[Workshop] '));assert.ok(html.includes('data-user-content'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 l.set('pl');assert.equal(l.mapName('[Workshop] '+title),'[Warsztat] '+title);assert.equal(l.mapName('Workshop / '+title),'Warsztat / '+title);assert.equal(l.mapName('Mirage'),'Mirage');assert.equal(l.t('Strike Zone 2D'),'Strike Zone 2D');
});
test('language auditing includes object values and nested tips and detects mixed text without diacritics',()=>{
 const{interfaceStrings,polishRemainder}=require('../scripts/test-support/locale-audit.cjs');const strings=interfaceStrings("const map={description:'Opis mapy',tips:['Dym',{text:'Przejście'}],nested:{label:'Warsztat'}};");
 for(const s of['Opis mapy','Dym','Przejście','Warsztat'])assert.ok(strings.includes(s),s);
 assert.equal(polishRemainder('Desert dziedziniec and tunele'),true);assert.equal(polishRemainder('Workshop maps and legitimate bombsite shots'),false);
});

test('owner editor headings translate as complete UI labels while map titles remain literal',()=>{const l=create('en');assert.equal(l.t('WARSZTAT / NARZĘDZIA WŁAŚCICIELA'),'WORKSHOP / OWNER TOOLS');assert.equal(l.t('WARSZTAT / MAPA GŁÓWNA'),'WORKSHOP / MAIN MAP');assert.equal(l.t('Warsztat / Mapa Autora QX'),'Workshop / Mapa Autora QX');});

test('each game keeps its own desktop preferences after Hub language broadcasts',t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'game-prefs-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const strike=preferences(path.join(dir,'strike.json')),royale=preferences(path.join(dir,'royale.json'));strike.seed({language:'pl'});royale.seed({language:'en'});royale.set({fpsLimit:120,muteUnfocused:true});strike.set({fpsLimit:30});royale.seed({language:'pl'});assert.equal(royale.get().language,'en');assert.equal(royale.get().fpsLimit,120);assert.equal(strike.get().fpsLimit,30);assert.equal(strike.get().muteUnfocused,undefined);assert.equal(preferences(path.join(dir,'royale.json')).get().fpsLimit,120);assert.throws(()=>royale.set({fpsLimit:144}));});
