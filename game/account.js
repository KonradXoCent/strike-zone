'use strict';
(() => {
  const bridge = window.strikeZoneDesktop;
  const overlay = SzLoading.create('desktop-account-loading');
  overlay.querySelector('.sz-loading-copy').insertAdjacentHTML('beforeend','<button id="desktop-account-retry" hidden>Spróbuj ponownie</button> <button id="desktop-account-back" hidden>Wróć do launchera</button>');
  document.body.appendChild(overlay);
  const showBack=setTimeout(()=>{if(!overlay.hidden)document.getElementById('desktop-account-back').hidden=false;},12000);
  document.getElementById('desktop-account-back').onclick = () => bridge.launcher();
  sbIn = sbUp = sbOut = () => bridge.launcher();
  acctHTML = () => `<div class=box><h3>Konto i zapis w chmurze</h3>Konto jest zarządzane w launcherze.<br><small>${esc(CL.msg)}</small><br><br><button onclick="cloudPush(1);tab('prof')">Zapisz w chmurze</button> <button onclick=expSave()>Eksportuj zapis</button> <button onclick=impSave()>Importuj zapis</button><br><textarea id=sv rows=3 style="width:100%;margin-top:8px" placeholder="Wklej kod zapisu i wybierz Importuj zapis"></textarea></div>`;
  const originalHeader = hdr;
  hdr = function () { originalHeader(); if (SBU && window.szDesktopCloudReady()) bridge.profile({ name: P().name, av: P().av, avimg: P().avimg }).catch(() => {}); };
  async function applySession(tokens) {
    if (!tokens) { window.SzWallet?.stop(); SBU = null; clearTimeout(CL.h); await bridge.launcher(); return; }
    const { data, error } = await sb.auth.setSession(tokens);
    if (error || !data.session) throw error || new Error('Brak sesji konta.');
    SBU = data.session.user;
  }
  async function init() {
    overlay.hidden = false;overlay.classList.remove('sz-loading-failure');overlay.setAttribute('aria-busy','true');overlay.querySelector('h2').textContent='Przygotuj się do gry';overlay.querySelector('p').textContent='Twoja następna runda czeka.';
    document.getElementById('desktop-account-retry').hidden = true;
    try {
      if (!sb) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'strikezone-game-memory' }, realtime: { params: { eventsPerSecond: 30 } } });
      await applySession(await bridge.session());
      if (!SBU) return;
      await window.SzWallet?.open(sb,SBU.id);
      await cloudLoad();
      window.SzWallet?.attach();
      if (!window.szDesktopCloudReady()) throw new Error(CL.msg);
      window.SzGameSave?.restoreSettings();window.szGameAccountReady?.();
      await friInit(); hdr(); tab(T); overlay.hidden = true;overlay.setAttribute('aria-busy','false');clearTimeout(showBack);
    } catch {
      overlay.classList.add('sz-loading-failure');overlay.setAttribute('aria-busy','false');document.getElementById('desktop-account-back').hidden=false;
      overlay.querySelector('h2').textContent = 'Nie udało się wczytać konta';
      overlay.querySelector('p').textContent = 'Sprawdź połączenie i spróbuj ponownie. Twój zapis nie został nadpisany.';
      document.getElementById('desktop-account-retry').hidden = false;
    }
  }
  bridge.onSession(tokens => applySession(tokens).catch(() => bridge.launcher()));
  document.getElementById('desktop-account-retry').onclick = init;
  init();
})();
