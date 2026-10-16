'use strict';
(() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'desktop-exit';
  dialog.setAttribute('aria-labelledby', 'desktop-exit-title');
  dialog.innerHTML = '<h2 id="desktop-exit-title">Zamknąć grę?</h2><p>Wrócisz do launchera. Twój postęp zostanie zapisany.</p><div class="desktop-exit-actions"><button id="desktop-exit-no">Nie</button><button id="desktop-exit-yes">Tak</button></div>';
  const css = document.createElement('style');
  css.textContent = '#desktop-exit{width:min(430px,calc(100vw - 40px));padding:28px;background:#141d29;color:#eef2f8;border:1px solid #3a495f;border-radius:14px;box-shadow:0 30px 100px #000b}#desktop-exit::backdrop{background:#030711ba;backdrop-filter:blur(5px)}#desktop-exit h2{margin:0 0 12px;font-size:24px}#desktop-exit p{color:#a6b4c8;line-height:1.6;font-size:14px}.desktop-exit-actions{display:flex;gap:14px;margin-top:24px}.desktop-exit-actions button{flex:1;font-weight:700;padding:12px}#desktop-exit-no{background:#238046;color:white;border-color:#3fba6c}#desktop-exit-yes{background:#b83238;color:white;border-color:#e85b60}';
  document.head.appendChild(css); document.body.appendChild(dialog);
  const no = document.getElementById('desktop-exit-no'), yes = document.getElementById('desktop-exit-yes');
  no.onclick = () => dialog.close();
  yes.onclick = async () => { yes.disabled = no.disabled = true; yes.textContent = 'Zapisywanie…'; try { await window.strikeZoneDesktop.launcher(); } catch { yes.disabled = no.disabled = false; yes.textContent = 'Tak'; } };
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!yes.disabled) dialog.close(); });
  addEventListener('keydown', event => {
    if (event.key !== 'Escape' || G || LOADING || !document.getElementById('game')?.hidden || !document.getElementById('desktop-account-loading')?.hidden) return;
    if (document.querySelector('dialog[open]') && !dialog.open) return;
    // Existing in-game pause and menu overlays keep their own Escape behavior.
    if (['pm', 'profModal'].some(id => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none'; })) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (dialog.open) dialog.close(); else { dialog.showModal(); no.focus(); }
  }, true);
})();
