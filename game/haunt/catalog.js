(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.HauntCatalog=v;})(globalThis,()=>{
 'use strict';
 const TOOLS=['flashlight','emf','thermo','uv','spirit','book','camera','dots','crucifix','salt','recorder','photo'];
 const ITEMS={
  flashlight:['Latarka','Flashlight'],emf:['Miernik EMF','EMF reader'],thermo:['Termometr','Thermometer'],uv:['Latarka UV','UV flashlight'],spirit:['Radio duchów','Spirit radio'],book:['Notatnik','Writing book'],camera:['Kamera wideo','Video camera'],dots:['Projektor laserowy','Laser projector'],crucifix:['Krucyfiks','Crucifix'],salt:['Sól badawcza','Investigation salt'],recorder:['Rejestrator dźwięku','Audio recorder'],photo:['Aparat fotograficzny','Photo camera']
 };
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
 return{PROTOCOL:2,TOOLS,ITEMS,EVIDENCE,GHOSTS,QUESTIONS,REPLIES};
});
