'use strict';
const $ = id => document.getElementById(id);
let current = null;
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
  const blocked = !allowed || state.gameRunning;
  $('play').disabled = blocked;
  $('play-label').textContent = phase === 'installing' ? 'INSTALOWANIE' : phase === 'downloading' ? 'POBIERANIE'
    : required && phase === 'available' ? 'ZAKTUALIZUJ GRĘ' : required && ['idle', 'checking'].includes(phase) ? 'SPRAWDZANIE' : 'GRAJ';
  $('play-hint').textContent = phase === 'downloaded' ? 'Zainstaluj pobraną aktualizację'
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
$('play').onclick = async () => {
  $('play').disabled = true;
  $('play-label').textContent = 'URUCHAMIANIE';
  await action(() => api.play());
};
$('update-action').onclick = () => action(() => current.update.phase === 'available' ? api.download() : current.update.phase === 'downloaded' ? api.install() : api.check());
$('news').onclick = () => showDialog(current?.update.latestVersion ? 'Co nowego · v' + current.update.latestVersion : 'Co nowego · v' + (current?.update.version || '1.0.1'), current?.update.releaseNotes || 'Wydanie testowe aktualizatora.\n\n• Aktualizacje z GitHub Releases.\n• Wymagana aktualizacja przed uruchomieniem starszej wersji.\n• Automatyczna instalacja i ponowne uruchomienie launchera.\n• Zachowanie lokalnych danych oraz dotychczasowego Supabase.\n• Gra z przesłanego pliku HTML.');
$('help').onclick = () => showDialog('Szybki start', 'GRAJ — uruchamia grę w osobnym oknie.\nF11 — włącza i wyłącza pełny ekran.\nCtrl + Shift + L — wraca do launchera.\n\nZamknięcie okna gry również przywraca launcher.\n\nKonto i zapis: otwórz Profile w grze i zaloguj się tym samym e-mailem i hasłem co w przeglądarce. Do konta, zapisu w chmurze i multiplayera potrzebny jest internet.\n\nDane zapisane wyłącznie w przeglądarce przeniesiesz przyciskami Export save i Import save w zakładce Profile.');
$('close-dialog').onclick = $('dialog-ok').onclick = () => $('details').close();
$('details').addEventListener('click', event => { if (event.target === $('details')) { const r = $('details').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('details').close(); } });
api.onState(render);
api.getState().then(render).catch(() => showDialog('Uruchom aplikację ponownie', 'Nie udało się wczytać stanu launchera.'));
