/* Static seasonal artwork uses the game's event dates; account/theme settings stay independent. */
(function(root){'use strict';
 const D=root.SzHalloweenData;
 function mount(){
  const active=D.active(),hero=document.querySelector('.hero');
  document.body.classList.toggle('launcher-halloween',active);
  if(!active){hero?.querySelector('.launcher-halloween-decor')?.remove();hero?.querySelector('.launcher-halloween-badge')?.remove();return;}
  if(!hero||hero.querySelector('.launcher-halloween-decor'))return;
  const bat='<path d="M-44 0Q-29 3-22-14L-10-4-5-12 0-6 5-12 10-4 22-14Q29 3 44 0L31 20Q20 9 12 20L0 29-12 20Q-20 9-31 20Z"/>';
  hero.insertAdjacentHTML('beforeend','<div class="launcher-halloween-decor" aria-hidden="true" inert>'+
   '<svg class="launcher-garland" viewBox="0 0 800 30" preserveAspectRatio="none"><path d="M0 0q200 35 400 0 200 35 400 0" stroke="#7b6263" fill="none"/><g fill="#f2b565"><circle cx="40" cy="4" r="3"/><circle cx="160" cy="13" r="3"/><circle cx="280" cy="11" r="3"/><circle cx="400" cy="2" r="3"/><circle cx="520" cy="12" r="3"/><circle cx="640" cy="13" r="3"/><circle cx="760" cy="5" r="3"/></g></svg><span class="launcher-halloween-embers"></span><svg class="launcher-halloween-sky" viewBox="0 0 420 250" fill="none"><circle cx="277" cy="94" r="72" fill="#eacb9206"/><circle cx="277" cy="94" r="61" fill="#eacb9209"/><circle cx="277" cy="94" r="49" fill="#d9c4a3"/><circle cx="259" cy="74" r="12" fill="#b7a492" opacity=".35"/><circle cx="295" cy="109" r="16" fill="#b7a492" opacity=".25"/><circle cx="264" cy="118" r="6" fill="#b7a492" opacity=".3"/><g fill="#161a29" stroke="#7d657b" stroke-width=".7"><g transform="translate(159 56) rotate(-15) scale(.7)">'+bat+'</g><g transform="translate(328 26) rotate(13) scale(.43)">'+bat+'</g><g transform="translate(362 133) rotate(-20) scale(.5)">'+bat+'</g></g></svg>'+
   '<svg class="launcher-halloween-web" viewBox="0 0 140 140" fill="none" stroke="#d1b9a0" stroke-width="1"><path d="M0 0H140V140M140 0 7 44M140 0 37 94M140 0 91 133"/><circle cx="140" cy="0" r="38"/><circle cx="140" cy="0" r="76"/><circle cx="140" cy="0" r="116"/><path d="M24 0V65"/><g stroke="#b7a38e" stroke-width="1.6"><path d="m21 70-7-5-4 4m11 4-9-1-4 5m19-7 7-5 4 4m-11 4 9-1 4 5"/><ellipse cx="24" cy="72" rx="4" ry="6" fill="#282332"/></g></svg>'+
   '<svg class="launcher-halloween-pumpkins" viewBox="0 0 260 140" fill="none"><ellipse cx="140" cy="126" rx="111" ry="11" fill="#0b121d" opacity=".6"/><path d="M51 83q-14-19-33-13 14 2 16 13-17-3-24 7 24-4 39 7m167-12q13-17 28-12-13 3-14 13 15-2 23 5-21-1-32 9" fill="#4c5944"/>'+
   '<path d="m56 69 4-16 8-2-1 20" fill="#737844"/><ellipse cx="60" cy="99" rx="40" ry="29" fill="#a9572d"/><ellipse cx="47" cy="98" rx="22" ry="28" fill="#c96f34"/><ellipse cx="72" cy="98" rx="22" ry="28" fill="#ba602d"/><ellipse cx="60" cy="98" rx="15" ry="29" fill="#df8540"/><path d="m37 96 14-10 1 13Zm32 3 2-13 13 10ZM43 107l9 3 8-4 8 5 10-3-8 12H52Z" fill="#ffd48b"/>'+
   '<path d="M162 52q-1-19 11-27l9 3q-13 9-10 27" fill="#7b8751"/><path d="M173 49q24-18 39-6-18 2-25 12" fill="#5b704c"/><ellipse cx="168" cy="90" rx="62" ry="43" fill="#bc622e"/><ellipse cx="145" cy="89" rx="36" ry="42" fill="#df8138"/><ellipse cx="190" cy="89" rx="36" ry="42" fill="#cd6b2d"/><ellipse cx="169" cy="89" rx="23" ry="44" fill="#ec9847"/><path d="M137 78q9-12 18-16l-2 20Zm47 4-2-20q9 4 18 16Zm-18 4 7 11h-14Zm-31 14 13 5 6-4 10 8 9-6 9 3 7-5 13-1-10 19-12-1-7 5-13-4-9 1Z" fill="#ffe0a0"/><path d="m143 57-9 8m49-8 11 10" stroke="#ffd09a" stroke-width="2" stroke-linecap="round" opacity=".35"/></svg></div>');
  const badge=document.createElement('span');badge.className='launcher-halloween-badge';badge.dataset.noTranslate='';badge.textContent='HALLOWEEN 2026 · 30.11';hero.querySelector('.hero-top')?.appendChild(badge);
 }
 root.SzLauncherHalloween={mount};mount();
 setInterval(mount,30000);
 document.addEventListener('visibilitychange',mount);addEventListener('focus',mount);
})(globalThis);
