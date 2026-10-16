'use strict';
(() => {
  const bridge = window.strikeZoneDesktop;
  const overlay = document.createElement('div');
  overlay.id = 'desktop-account-loading';
  overlay.innerHTML = '<div><h2>Wczytywanie konta…</h2><p>Przygotowujemy Twój zapis gry.</p><button id="desktop-account-retry" hidden>Spróbuj ponownie</button> <button id="desktop-account-back">Wróć do launchera</button></div>';
  const css = document.createElement('style');
  css.textContent = '#desktop-account-loading{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#0b1119f5;text-align:center;padding:24px}#desktop-account-loading>div{max-width:460px}#desktop-account-loading p{color:#a7b3c4;line-height:1.6}#desktop-account-loading[hidden]{display:none}';
  document.head.appendChild(css); document.body.appendChild(overlay);
  document.getElementById('desktop-account-back').onclick = () => bridge.launcher();
  sbIn = sbUp = sbOut = () => bridge.launcher();
  acctHTML = () => `<div class=box><h3>Konto i zapis w chmurze</h3>Konto jest zarządzane w launcherze.<br><small>${esc(CL.msg)}</small><br><br><button onclick="cloudPush(1);tab('prof')">Zapisz w chmurze</button> <button onclick=expSave()>Eksportuj zapis</button> <button onclick=impSave()>Importuj zapis</button><br><textarea id=sv rows=3 style="width:100%;margin-top:8px" placeholder="Wklej kod zapisu i wybierz Importuj zapis"></textarea></div>`;
  const originalHeader = hdr;
  hdr = function () { originalHeader(); if (SBU && window.szDesktopCloudReady()) bridge.profile({ name: P().name, av: P().av, avimg: P().avimg }).catch(() => {}); };
  async function applySession(tokens) {
    if (!tokens) { SBU = null; clearTimeout(CL.h); await bridge.launcher(); return; }
    const { data, error } = await sb.auth.setSession(tokens);
    if (error || !data.session) throw error || new Error('Brak sesji konta.');
    SBU = data.session.user;
  }
  async function init() {
    overlay.hidden = false;
    document.getElementById('desktop-account-retry').hidden = true;
    try {
      if (!sb) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'strikezone-game-memory' }, realtime: { params: { eventsPerSecond: 30 } } });
      await applySession(await bridge.session());
      if (!SBU) return;
      await cloudLoad();
      if (!window.szDesktopCloudReady()) throw new Error(CL.msg);
      await friInit(); hdr(); tab(T); overlay.hidden = true;
    } catch {
      overlay.querySelector('h2').textContent = 'Nie udało się wczytać konta';
      overlay.querySelector('p').textContent = 'Sprawdź połączenie i spróbuj ponownie. Twój zapis nie został nadpisany.';
      document.getElementById('desktop-account-retry').hidden = false;
    }
  }
  bridge.onSession(tokens => applySession(tokens).catch(() => bridge.launcher()));
  document.getElementById('desktop-account-retry').onclick = init;
  init();
})();
