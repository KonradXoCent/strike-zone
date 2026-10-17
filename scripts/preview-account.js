/* Included only by prepare-preview.cjs. Desktop releases use the launcher. */
(() => {
  'use strict';
  if (window.strikeZoneDesktop) return;
  window.SZ_TEST_PREVIEW = true;
  let busy = false, bannerKey = '', scheduled = false;
  const style = document.createElement('style');
  style.textContent = `
    .preview-session{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 17px;margin-bottom:20px;border:1px solid #cda45b55;border-radius:10px;background:#1c2636;font:12px system-ui;letter-spacing:0;color:#e6edf6}
    .preview-session small{display:block;color:#d4ae6b;font-size:9px;letter-spacing:1.5px;margin-bottom:5px}.preview-session p{margin:4px 0 0;color:#a9b8cb;font-size:11px}.preview-session-actions{display:flex;gap:7px;flex-wrap:wrap}.preview-session button{font:12px system-ui;text-transform:none;white-space:nowrap}
    #preview-account-dialog{position:fixed;inset:0;z-index:20000;background:#070d16de;backdrop-filter:blur(9px);padding:20px;display:grid;place-items:center;font:14px system-ui;letter-spacing:0;color:#edf3fc}
    #preview-account-dialog[hidden]{display:none}#preview-account-dialog>section{box-sizing:border-box;width:min(460px,100%);max-height:calc(100vh - 40px);overflow:auto;background:linear-gradient(145deg,#1a293b,#101925);border:1px solid #bda16c66;border-radius:17px;padding:29px;box-shadow:0 25px 100px #0007}
    #preview-account-dialog h2{font-size:26px;margin:10px 0}#preview-account-dialog p{color:#aebdd0;line-height:1.7;margin:10px 0 20px}#preview-account-dialog small{color:#d8b775;letter-spacing:1.6px;font-size:10px}
    #preview-account-dialog label{display:block;color:#d2ddeb;font-size:12px;margin:17px 0 6px}#preview-account-dialog input{box-sizing:border-box;width:100%;border:1px solid #526176;background:#0c1624;color:white;border-radius:7px;padding:12px;font:14px system-ui;letter-spacing:0}#preview-account-dialog input:focus{outline:2px solid #c8a66c;outline-offset:2px}
    #preview-account-dialog button{font:13px system-ui;letter-spacing:0;text-transform:none;border-radius:7px;padding:11px 16px}#preview-account-dialog button[type=submit]{background:#e3bc7c;color:#152030;border:0;font-weight:700;width:100%;margin-top:18px}#preview-account-dialog button:disabled{opacity:.5}
    #preview-login-message{font-size:12px;min-height:20px;margin:12px 0;color:#b4c6db;line-height:1.6}#preview-login-message[data-error=true]{color:#ffa998}.preview-account-footer{border-top:1px solid #ffffff16;padding-top:15px;display:flex;align-items:center;justify-content:space-between;gap:12px}.preview-account-footer span{font-size:10px;color:#8197b0;line-height:1.6}
    @media(max-width:700px){.preview-session{align-items:flex-start;flex-direction:column}#preview-account-dialog>section{padding:23px}}
  `;
  document.head.appendChild(style);
  const dialog = document.createElement('div');
  dialog.id = 'preview-account-dialog';
  dialog.hidden = true;
  dialog.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="preview-login-title"><small>STRIKE ZONE / WERSJA TESTOWA</small><h2 id="preview-login-title">Zaloguj się do gry</h2><p>Użyj tego samego konta co w launcherze. Wczytamy Twój profil i uprawnienia do Warsztatu.</p><form id="preview-login-form"><label for="preview-email">Adres e-mail</label><input id="preview-email" name="email" type="email" autocomplete="username" placeholder="Twój adres e-mail" required><label for="preview-password">Hasło</label><input id="preview-password" name="password" type="password" autocomplete="current-password" placeholder="Hasło do konta gry" required><button type="submit" id="preview-login-submit">Zaloguj się</button></form><div id="preview-login-message" role="status" aria-live="polite"></div><button id="preview-cloud-retry" hidden>Wczytaj konto ponownie</button><div class="preview-account-footer"><span>Logowanie w grze jest dostępne tylko w tym pliku testowym.</span><button id="preview-login-close">Zamknij</button></div></section>`;
  document.body.appendChild(dialog);
  const message = (text, error = false) => {
    const el = document.getElementById('preview-login-message');
    el.textContent = text; el.dataset.error = String(error);
  };
  function updateConnection() {
    document.getElementById('preview-login-submit').disabled = busy || !sb;
    if (!busy && !sb) message('Łączenie z serwerem kont… Sprawdź połączenie z internetem.');
    else if (!busy && document.getElementById('preview-login-message').textContent.startsWith('Łączenie')) message('');
  }
  function openAccount() {
    dialog.hidden = false;
    document.getElementById('preview-cloud-retry').hidden = !SBU || !!window.szDesktopCloudReady?.();
    updateConnection();
    document.getElementById('preview-email').focus();
  }
  function closeAccount() {
    if (busy) return;
    dialog.hidden = true;
    document.getElementById('preview-password').value = '';
  }
  function renderBanner() {
    const main = document.getElementById('main');
    if (!main) return;
    let el = document.getElementById('preview-session-banner');
    if (!el) { el = document.createElement('section'); el.id = 'preview-session-banner'; el.className = 'preview-session'; main.prepend(el); bannerKey = ''; }
    const ready = !!window.szDesktopCloudReady?.();
    const key = JSON.stringify([SBU?.id, ready, P().name, COMMUNITY.admin]);
    if (bannerKey === key) return;
    bannerKey = key;
    el.innerHTML = `<div><small>WERSJA TESTOWA · KONTO I WARSZTAT ONLINE</small><b>${SBU ? ready ? 'Zalogowano: ' + workshopEscape(P().name) : 'Wczytywanie konta…' : 'Zaloguj się, aby wysłać mapę lub skin'}</b><p>${SBU && ready ? COMMUNITY.admin ? 'Panel moderacji jest przypisany do Twojego konta.' : 'Twoje zgłoszenia znajdziesz w Warsztacie.' : 'To samo konto i hasło, których używasz w launcherze.'}</p></div><div class="preview-session-actions">${SBU && ready ? `<button data-preview-action="workshop">Warsztat</button>${COMMUNITY.admin ? '<button data-preview-action="moderation">Moderacja</button>' : ''}<button data-preview-action="logout">Wyloguj</button>` : '<button class="pri" data-preview-action="login">Zaloguj się</button>'}</div>`;
    el.querySelector('[data-preview-action=login]')?.addEventListener('click', openAccount);
    el.querySelector('[data-preview-action=logout]')?.addEventListener('click', logout);
    el.querySelector('[data-preview-action=workshop]')?.addEventListener('click', () => creatorTab('maps'));
    el.querySelector('[data-preview-action=moderation]')?.addEventListener('click', () => communityTab('moderation'));
  }
  function scheduleBanner() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; renderBanner(); });
  }
  async function finishLogin() {
    await cloudLoad();
    if (!window.szDesktopCloudReady?.()) {
      message('Zalogowano, ale nie udało się wczytać zapisu konta. Spróbuj ponownie.', true);
      document.getElementById('preview-cloud-retry').hidden = false;
      return false;
    }
    await communityRefresh();
    dialog.hidden = true;
    communityTab(COMMUNITY.admin ? 'moderation' : 'mine');
    scheduleBanner();
    return true;
  }
  async function login(event) {
    event?.preventDefault();
    if (busy || !sb) return;
    const form = document.getElementById('preview-login-form');
    if (!form.reportValidity()) return;
    busy = true; updateConnection(); message('Logowanie i wczytywanie Twojego konta…');
    const password = document.getElementById('preview-password');
    try {
      const result = await sb.auth.signInWithPassword({ email: document.getElementById('preview-email').value.trim(), password: password.value });
      password.value = '';
      if (result.error) throw result.error;
      if (!result.data?.session?.user) throw new Error('Brak sesji konta. Spróbuj ponownie.');
      SBU = result.data.session.user;
      await finishLogin();
    } catch (error) {
      password.value = '';
      const raw = String(error?.message || '');
      message(/invalid login|invalid credentials/i.test(raw) ? 'Nieprawidłowy adres e-mail lub hasło.' : /email not confirmed/i.test(raw) ? 'Potwierdź adres e-mail konta przed zalogowaniem.' : 'Nie udało się zalogować. Sprawdź połączenie i spróbuj ponownie.', true);
    } finally { busy = false; updateConnection(); scheduleBanner(); }
  }
  async function logout() {
    if (busy || !sb) return;
    busy = true;
    try {
      await window.szDesktopFlush?.();
      const result = await sb.auth.signOut();
      if (result.error) throw result.error;
      SBU = null; await cloudLoad(); communityReset();
      communityTab('catalog');
    } catch { toast('Nie udało się wylogować. Spróbuj ponownie.'); }
    finally { busy = false; scheduleBanner(); }
  }
  acctHTML = () => `<section class="box"><h3>Konto — wersja testowa</h3><p>${SBU ? 'Zalogowano na konto: <b>' + workshopEscape(SBU.email) + '</b>' : 'Zaloguj się na swoje istniejące konto, aby sprawdzić wysyłanie map i skinów.'}</p><button onclick="szPreviewOpenAccount()">${SBU ? 'Konto i połączenie' : 'Zaloguj się'}</button><small>W publicznej aplikacji konto obsługuje launcher.</small></section>`;
  window.szPreviewOpenAccount = openAccount;
  document.getElementById('preview-login-form').addEventListener('submit', login);
  document.getElementById('preview-login-close').addEventListener('click', closeAccount);
  document.getElementById('preview-cloud-retry').addEventListener('click', async () => {
    if (busy || !SBU) return;
    busy = true; updateConnection(); message('Wczytywanie konta…');
    try { await finishLogin(); } finally { busy = false; updateConnection(); }
  });
  new MutationObserver(scheduleBanner).observe(document.getElementById('main'), { childList: true });
  const oldHeader = hdr;
  hdr = function () { oldHeader(); scheduleBanner(); };
  const oldRender = communityRender;
  communityRender = function () { oldRender(); scheduleBanner(); };
  const accountReady = window.szGameAccountReady;
  window.szGameAccountReady = function () { accountReady(); scheduleBanner(); if (SBU && !busy) dialog.hidden = true; };
  const check = setInterval(() => { updateConnection(); if (sb) clearInterval(check); }, 300);
  renderBanner(); updateConnection();
  if (document.getElementById('splash')) document.getElementById('splash').style.display = 'none';
  if (!SBU) openAccount();
})();
