(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.HauntCatalog=v;})(globalThis,()=>{
 'use strict';
 const TOOLS=['flashlight','emf','thermo','uv','spirit','book','camera','dots','crucifix','salt','recorder','photo','motion','rempod','toycar'];
 const ITEMS={
  flashlight:['Latarka','Flashlight'],emf:['Miernik EMF','EMF reader'],thermo:['Termometr','Thermometer'],uv:['Latarka UV','UV flashlight'],spirit:['Radio duchów','Spirit radio'],book:['Notatnik','Writing book'],camera:['Kamera wideo','Video camera'],dots:['Projektor laserowy','Laser projector'],crucifix:['Krucyfiks','Crucifix'],salt:['Sól badawcza','Investigation salt'],recorder:['Rejestrator dźwięku','Audio recorder'],photo:['Aparat fotograficzny','Photo camera']
 };
 Object.assign(ITEMS,{motion:['Czujnik ruchu','Motion sensor'],rempod:['REM-POD','REM-POD'],toycar:['Zabawkowy samochód','Toy car']});
 const EVIDENCE=[['emf','EMF 5','EMF level 5'],['freezing','Ujemna temperatura','Freezing temperatures'],['uv','Ślady UV','UV traces'],['voice','Odpowiedź radiowa','Spirit radio response'],['writing','Pismo ducha','Ghost writing'],['orb','Widmowe kule','Spectral orbs'],['dots','Sylwetka w laserze','Laser silhouette'],['salt','Ślady w soli','Disturbed salt'],['resonance','Echo widmowe','Spectral resonance']].map(([id,pl,en])=>({id,pl,en}));
 const GHOSTS=[
  ['wisp','Błędny ognik','Will-o-wisp',['emf','freezing','dots'],125,'Zimne światło. Chętnie gasi prąd.','A cold light that often cuts the power.'],
  ['lament','Lament','Lament',['voice','writing','orb'],96,'Odpowiada przez radio i pozostawia zapiski.','Answers the radio and leaves unsettling notes.'],
  ['cinder','Popielnik','Cinder',['emf','uv','freezing'],145,'Zimny dotyk zostawia ślady na drzwiach.','Its cold touch leaves traces on doors.'],
  ['watcher','Obserwator','Watcher',['orb','dots','emf'],138,'Przyspiesza, kiedy widzi swoją ofiarę.','Moves faster when it sees its prey.'],
  ['veil','Zasłona','Veil',['uv','voice','writing'],125,'Manifestuje się częściej przy zgaszonym świetle.','Manifests more often with the lights off.'],
  ['morrow','Mara zmierzchu','Morrow',['orb','freezing','writing'],90,'Wolniejsza, lecz długo pozostaje aktywna w swoim pokoju.','Slower, but remains active in its room for longer.'],
  ['echo','Echo','Echo',['emf','voice','dots'],155,'Zakłóca elektronikę i odpowiada krótkim szeptem.','Disrupts electronics and answers with a brief whisper.'],
  ['thorn','Cierń','Thorn',['uv','dots','orb'],138,'Ślady jego dotyku można ujawnić lampą UV.','Its touch can be revealed with a UV flashlight.'],
  ['hollow','Pustka','Hollow',['freezing','resonance','voice'],126,'Zimno i echo głosu zdradzają jej obecność.','Cold air and a recorded echo betray its presence.'],
  ['rattle','Grzechotnik','Rattle',['uv','salt','emf'],132,'Narusza sól i pozostawia odciski.','Disturbs salt and leaves prints.'],
  ['mourner','Żałobnik','Mourner',['writing','resonance','dots'],105,'Jego lament można nagrać w pokoju zjawisk.','Its lament can be recorded in the haunted room.'],
  ['drifter','Wędrowiec','Drifter',['orb','salt','freezing'],160,'W zimnym pokoju pozostawia ślady w soli.','Leaves disturbed salt in its cold room.'],
  ['pulse','Impuls','Pulse',['emf','resonance','writing'],174,'Silne zakłócenia towarzyszą zapiskom i echu.','Strong interference accompanies writing and resonance.'],
  ['deceiver','Zwodziciel','Deceiver',['voice','salt','resonance'],129,'Ma trzy prawdziwe dowody i naśladuje jeden dodatkowy. Cztery sprzeczne dowody wskazują Zwodziciela.','Has three real evidence types and imitates one extra. Four conflicting readings point to the Deceiver.']
 ].map(([id,pl,en,evidence,speed,traitPl,traitEn])=>({id,pl,en,evidence,speed,traitPl,traitEn}));
 const QUESTIONS=[['where','Gdzie jesteś?','Where are you?'],['age','Ile masz lat?','How old are you?'],['intent','Czego od nas chcesz?','What do you want?'],['alone','Czy jesteś tu sam?','Are you alone?'],['name','Jak masz na imię?','What is your name?']].map(([id,pl,en])=>({id,pl,en}));
 const REPLIES={where:['Jestem obok ciebie.','I am beside you.'],age:['Czekam tu od wielu lat.','I have waited here for many years.'],intent:['Odejdźcie.','Leave this place.'],alone:['Nie jesteście sami.','You are not alone.'],name:['Moje imię zostało zapomniane.','My name has been forgotten.']};
 const PRICES={flashlight:60,emf:90,thermo:80,uv:110,spirit:140,book:90,camera:200,dots:180,crucifix:180,salt:35,recorder:160,photo:150,motion:140,rempod:170,toycar:65};
 const MODELS=['child','woodsman','widow','elder','nurse','shade'];
 const CURSES=[
  {id:'mirror',pl:'Przeklęte lustro',en:'Cursed mirror',hintPl:'Pokazuje pokój ducha. Drugie użycie rozbija lustro i wywołuje przeklęte polowanie.',hintEn:'Reveals the haunted room. The second use shatters the mirror and starts a cursed hunt.'},
  {id:'ouija',pl:'Tablica Ouija',en:'Ouija board',hintPl:'Zadaj pytanie i pożegnaj się. Po 20 sekundach łącznej rozmowy tablica pęka i rozpoczyna się polowanie.',hintEn:'Ask a question and say goodbye. After 20 seconds of total conversation the board breaks and a hunt begins.'},
  {id:'tarot',pl:'Karty tarota',en:'Tarot cards',hintPl:'Dziesięć losowo ułożonych kart. Każda ma prawdziwy efekt; jedna wywołuje polowanie.',hintEn:'Ten shuffled cards with real effects. One card starts a hunt.'}
 ];
 const CARDS=[
  ['death','Śmierć','Death','Rozpoczyna przeklęte polowanie.','Starts a cursed hunt.'],
  ['tower','Wieża','The Tower','Wyłącza prąd.','Cuts the power.'],
  ['sun','Słońce','The Sun','Przywraca 20 punktów spokoju.','Restores 20 composure.'],
  ['moon','Księżyc','The Moon','Odbiera 20 punktów spokoju.','Removes 20 composure.'],
  ['devil','Diabeł','The Devil','Wywołuje manifestację ducha.','Causes a ghost manifestation.'],
  ['wheel','Koło Fortuny','Wheel of Fortune','Duch przenosi swój pokój.','The entity changes its favorite room.'],
  ['hermit','Pustelnik','The Hermit','Odsuwa zwykłe polowanie o 30 sekund.','Delays a normal hunt by 30 seconds.'],
  ['star','Gwiazda','The Star','Przywraca ekipie 10 punktów spokoju.','Restores 10 composure to the team.'],
  ['magician','Mag','The Magician','Włącza światła, jeśli wyzwanie na to pozwala.','Restores the lights if the challenge permits.'],
  ['hanged','Wisielec','The Hanged One','Szepty i trzaski nasilają aktywność.','Whispers and knocks increase activity.']
 ].map(([id,pl,en,descriptionPl,descriptionEn])=>({id,pl,en,descriptionPl,descriptionEn}));
 const CHALLENGES=[
  ['no_flashlight',25,'Bez latarki','No flashlight','Zwykłe latarki nie działają przez całą wyprawę. UV pozostaje dostępne.','Regular flashlights are disabled for the whole contract. UV remains available.'],
  ['no_power',25,'Bez prądu','No power','Bezpieczniki i oświetlenie budynku pozostają wyłączone.','The building breaker and lights stay off.'],
  ['hard_evidence',30,'Trudne dowody','Hard evidence','Dowody pojawiają się później i na krócej; pomiary wymagają cierpliwości.','Evidence appears later and for shorter windows; readings require patience.'],
  ['roaming',25,'Wędrujący duch','Roaming entity','Duch znacznie częściej przenosi swój ulubiony pokój.','The entity changes its favorite room much more often.'],
  ['frequent_hunts',35,'Częste polowania','Frequent hunts','Krótsze przygotowanie i przerwy między polowaniami.','Shorter preparation and cooldowns between hunts.'],
  ['no_sanity',15,'Bez monitora spokoju','No sanity monitor','Odczyty spokoju ekipy są niedostępne, także na HUD.','Team composure readings are unavailable, including on the HUD.'],
  ['no_activity',15,'Bez monitora aktywności','No activity monitor','Wykres aktywności w vanie jest wyłączony. Czujniki nadal działają.','The van activity graph is disabled. Deployed sensors still work.']
 ].map(([id,bonus,pl,en,descriptionPl,descriptionEn])=>({id,bonus,pl,en,descriptionPl,descriptionEn}));
 const challenges=ids=>CHALLENGES.filter(c=>Array.isArray(ids)&&ids.includes(c.id)).map(c=>c.id);
 const challengePercent=ids=>CHALLENGES.reduce((n,c)=>n+(Array.isArray(ids)&&ids.includes(c.id)?c.bonus:0),0);
 const STARTER=Object.fromEntries(TOOLS.map(id=>[id,1]));
 const supplies=(extra={})=>Object.fromEntries(TOOLS.map(id=>[id,1+Math.min(31,Math.max(0,Math.floor(Number(extra[id])||0)))]));
 const level=xp=>1+Math.floor(Math.max(0,Number(xp)||0)/250);
 const mapFactor=size=>({small:1,medium:1.15,large:1.35,huge:1.6})[size]||1;
 function reward({correct,evidence=0,hunt=false,photo=false,bonus=0,wipe=false,difficulty='normal',size='small',challenges:ids=[],seconds=0}){const base=wipe?0:Math.min(900,Math.round(((correct?90:0)+Math.min(3,evidence)*10+Math.min(140,bonus))*mapFactor(size)*({calm:1,normal:1.25,nightmare:1.6}[difficulty]||1)));const challengeBonus=correct&&!wipe&&seconds>=30?Math.round(base*challengePercent(ids)/100):0;return{xp:wipe?Math.min(30,evidence*5):Math.round((correct?120+Math.min(3,evidence)*30+(hunt?25:0)+(photo?25:0):Math.min(3,evidence)*10)*mapFactor(size)),money:base+challengeBonus,challengeBonus,challengePercent:challengePercent(ids),baseMoney:base};}
 return{PROTOCOL:4,TOOLS,ITEMS,EVIDENCE,GHOSTS,QUESTIONS,REPLIES,PRICES,STARTER,supplies,level,reward,MODELS,CURSES,CARDS,CHALLENGES,challenges,challengePercent};
});
