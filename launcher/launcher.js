'use strict';
const $ = id => document.getElementById(id);
let current = null;
let authMode = 'signin';
const api = window.strikeZone;
const phaseCopy = {
  disabled: ['Wersja lokalna', 'Wydawca nie udostępnił jeszcze kanału aktualizacji. Możesz uruchomić zainstalowaną grę.'],
  idle: ['Gotowy do sprawdzenia', 'Sprawdź, czy jest już dostępna nowa wersja.'],
  checking: ['Sprawdzanie aktualizacji…', 'Łączymy się z serwerem aktualizacji.'],
  current: ['Masz aktualną wersję', 'Wszystko gotowe. Do zobaczenia na mapie.'],
  available: ['Dostępna aktualizacja', 'Pobierz nowe wydanie, aby korzystać z najnowszych zmian.'],
  downloading: ['Pobieranie aktualizacji', 'Pozostaw launcher otwarty. Aktualizacja nie zmienia zapisów Twojego konta.'],
  downloaded: ['Aktualizacja pobrana', 'Zainstaluj nowe wydanie. Aplikacja uruchomi się ponownie.'],
  installing: ['Instalowanie…', 'Za chwilę uruchomimy zaktualizowany launcher.'],
  error: ['Aktualizacja niedostępna', 'Nie udało się połączyć. Możesz spróbować ponownie lub grać w zainstalowaną wersję.']
};
function bytes(value) {
  if (!Number.isFinite(value)) return '—';
  if (value < 1024 * 1024) return (value / 1024).toFixed(0) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}
function render(state) {
  current = state;
  const update = state.update;
  const phase = update.phase;
  const account = state.account || { phase: 'checking', authenticated: false, user: null };
  const loggedIn = account.authenticated;
  $('auth-gate').hidden = loggedIn;
  $('launch-status').hidden = !loggedIn;
  document.body.classList.toggle('signed-out', !loggedIn);
  $('auth-message').hidden = !account.error && !account.notice;
  $('auth-message').textContent = account.error || account.notice || '';
  $('auth-message').classList.toggle('success', !account.error);
  const busy = ['checking', 'working'].includes(account.phase);
  for (const id of ['auth-submit', 'auth-signin', 'auth-signup', 'auth-email', 'auth-password', 'auth-nickname']) $(id).disabled = busy;
  $('auth-submit').textContent = busy ? 'Łączenie…' : authMode === 'signup' ? 'Utwórz konto' : 'Zaloguj się';
  $('account-name').textContent = account.user?.name || 'Jedno konto. Cały Twój postęp.';
  $('account-caption').textContent = loggedIn ? 'Zalogowano · ' + account.user.email : 'Zaloguj się w launcherze — gra otworzy się na tym samym koncie.';
  $('account-logout').hidden = !loggedIn;
  $('account-logout').disabled = state.gameRunning || busy;
  $('account-avatar').replaceChildren();
  if (account.user?.image) { const img = document.createElement('img'); img.src = account.user.image; img.alt = ''; $('account-avatar').appendChild(img); }
  else $('account-avatar').textContent = account.user?.avatar || '😎';
  const required = update.required === true;
  const [title, description] = phaseCopy[phase] || phaseCopy.error;
  $('version').textContent = 'v' + update.version;
  $('update-title').textContent = required && phase === 'available' ? 'Wymagana aktualizacja' : title;
  $('update-description').textContent = state.configError
    ? 'Nie udało się wczytać kanału aktualizacji. Uruchom najnowszy instalator wydawcy.'
    : required && phase === 'error' ? 'Nie można sprawdzić wersji gry. Sprawdź połączenie i spróbuj ponownie przed uruchomieniem gry.'
    : required && phase === 'available' ? 'Zainstaluj nowe wydanie, aby uruchomić grę.' : description;
  $('update-dot').className = 'dot ' + (phase === 'error' ? 'error' : ['available', 'downloading', 'downloaded'].includes(phase) ? 'amber' : phase === 'current' ? '' : 'neutral');
  $('progress-value').textContent = phase === 'downloading' ? Math.floor(update.progress || 0) + '%' : '';
  $('progress-track').hidden = phase !== 'downloading';
  $('download-stats').hidden = phase !== 'downloading';
  $('progress-fill').style.width = (update.progress || 0) + '%';
  $('download-stats').textContent = `${bytes(update.transferred)} / ${bytes(update.total)} · ${bytes(update.bytesPerSecond)}/s`;
  $('update-action').hidden = !['idle', 'current', 'error', 'available', 'downloaded'].includes(phase);
  $('update-action').textContent = phase === 'available' ? `Pobierz v${update.latestVersion} ↓` : phase === 'downloaded' ? 'Zainstaluj i uruchom ponownie ↗' : 'Sprawdź ponownie ↻';
  const allowed = typeof update.canPlay === 'boolean' ? update.canPlay
    : required ? phase === 'current' : !['downloading', 'downloaded', 'installing'].includes(phase);
  const blocked = !allowed || state.gameRunning || !loggedIn || busy;
  $('play').disabled = blocked;
  $('play-label').textContent = phase === 'installing' ? 'INSTALOWANIE' : phase === 'downloading' ? 'POBIERANIE'
    : !loggedIn ? 'ZALOGUJ SIĘ'
    : required && phase === 'available' ? 'ZAKTUALIZUJ GRĘ' : required && ['idle', 'checking'].includes(phase) ? 'SPRAWDZANIE' : 'GRAJ';
  $('play-hint').textContent = phase === 'downloaded' ? 'Zainstaluj pobraną aktualizację'
    : !loggedIn ? 'Konto jest wymagane do uruchomienia gry'
    : required && !allowed ? 'Uruchomienie wymaga aktualnej wersji gry' : blocked ? 'Gra jest uruchomiona' : 'Uruchom Strike Zone 2D';
  $('status-title').textContent = phase === 'available' ? (required ? 'Wymagana aktualizacja' : 'Nowa wersja czeka')
    : phase === 'downloading' ? 'Szykujemy nową rundę' : phase === 'downloaded' ? 'Prawie gotowe'
    : required && ['idle', 'checking'].includes(phase) ? 'Sprawdzanie wersji'
    : required && phase === 'error' ? 'Sprawdź połączenie' : 'Gotowy do gry';
  $('status-description').textContent = phase === 'available' ? `Dostępna wersja ${update.latestVersion}` : phase === 'downloaded' ? 'Pozostał już tylko restart aplikacji.' : 'Twoja następna runda czeka.';
  const online = state.backend.phase === 'online';
  $('network-dot').className = 'dot ' + (online ? '' : 'neutral');
  $('network-label').textContent = online ? 'Usługi online osiągalne' : state.backend.phase === 'checking' ? 'Sprawdzanie usług online…' : 'Brak połączenia z usługami online';
}
function showDialog(title, text) {
  $('dialog-title').textContent = title;
  $('dialog-content').textContent = text;
  $('details').showModal();
}
async function action(callback) {
  try { render(await callback()); }
  catch { showDialog('Nie udało się wykonać operacji', 'Spróbuj ponownie. Jeżeli problem się powtarza, uruchom aplikację ponownie.'); }
}
$('minimize').onclick = () => api.minimize();
$('quit').onclick = () => api.quit();
function authTab(mode) {
  authMode = mode;
  $('auth-signin').setAttribute('aria-selected', String(mode === 'signin'));
  $('auth-signup').setAttribute('aria-selected', String(mode === 'signup'));
  $('nickname-field').hidden = mode !== 'signup';
  $('auth-nickname').required = mode === 'signup';
  $('auth-password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  $('auth-password').minLength = mode === 'signup' ? 6 : 1;
  $('auth-title').textContent = mode === 'signup' ? 'Dołącz do gry' : 'Witaj ponownie';
  if (current) render(current);
}
$('auth-signin').onclick = () => authTab('signin');
$('auth-signup').onclick = () => authTab('signup');
$('auth-form').onsubmit = async event => {
  event.preventDefault();
  $('auth-submit').disabled = true;
  const input = { email: $('auth-email').value, password: $('auth-password').value, nickname: $('auth-nickname').value };
  await action(() => authMode === 'signup' ? api.register(input) : api.login(input));
  $('auth-password').value = '';
};
$('account-logout').onclick = async () => { await action(() => api.logout()); $('auth-password').value = ''; };
$('play').onclick = async () => {
  $('play').disabled = true;
  $('play-label').textContent = 'URUCHAMIANIE';
  await action(() => api.play());
};
$('update-action').onclick = () => action(() => current.update.phase === 'available' ? api.download() : current.update.phase === 'downloaded' ? api.install() : api.check());
$('news').onclick = () => showDialog('Co nowego · v' + (current?.update.latestVersion || current?.update.version || '1.1.0'), current?.update.releaseNotes || '• Logowanie i rejestracja w launcherze.\n• Wspólna sesja konta z grą.\n• Twój nick i awatar oraz przycisk wylogowania.\n• Mniejszy launcher dopasowany do ekranu.\n• Escape w menu gry: potwierdzenie powrotu do launchera.');
$('help').onclick = () => showDialog('Szybki start', 'Zaloguj się w launcherze na istniejące konto gry lub utwórz nowe. Jeśli wymagane jest potwierdzenie e-maila, sprawdź pocztę, potwierdź adres i zaloguj się ponownie.\n\nGRAJ — otwiera grę na zalogowanym koncie.\nF11 — pełny ekran w grze.\nEscape w menu — potwierdzenie zamknięcia gry.\nCtrl + Shift + L — powrót do launchera.\n\nNick i awatar zmienisz w zakładce Profile w grze. Konto wylogujesz przyciskiem w launcherze.\n\nDo logowania, zapisów w chmurze i sprawdzania aktualizacji potrzebny jest internet.');
$('close-dialog').onclick = $('dialog-ok').onclick = () => $('details').close();
$('details').addEventListener('click', event => { if (event.target === $('details')) { const r = $('details').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('details').close(); } });
api.onState(render);
api.getState().then(render).catch(() => showDialog('Uruchom aplikację ponownie', 'Nie udało się wczytać stanu launchera.'));
