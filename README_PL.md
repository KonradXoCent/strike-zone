# Strike Zone 2D — wydanie testowe 1.0.1

Pobierz instalator z [GitHub Releases](https://github.com/KonradXoCent/strike-zone/releases/latest).
`StrikeZone-Setup-1.0.1.exe` instaluje aktualną wersję.
Gracze nie potrzebują Node.js ani plików projektu.

## Konto i sterowanie

W grze otwórz Profile i zaloguj się dotychczasowym kontem Supabase.
F11 przełącza pełny ekran. Ctrl + Shift + L wraca do launchera.
Zamknięcie gry również przywraca launcher i podejmuje próbę wysłania zapisu.
Dane z samej przeglądarki przeniesiesz przez Export save i Import save
w zakładce Profile, po zalogowaniu i wczytaniu chmury.

## Test aktualizacji

Do sprawdzenia aktualizacji zainstaluj `StrikeZone-Test-1.0.0.exe` z tego samego
wydania. To wersja 1.0.0 z już włączonym kanałem GitHub. Launcher powinien wykryć
1.0.1, zablokować grę, pobrać aktualizację po kliknięciu przycisku, zainstalować
ją po kolejnym kliknięciu i uruchomić nowszy launcher.

Pierwsza paczka 1.0.0 otrzymana wcześniej poza GitHubem miała wyłączony kanał.
Jednorazowo użyj instalatora z repozytorium. Kolejne wydania obsłuży launcher.

Launcher sprawdza wersję przy starcie i przed uruchomieniem gry. Wymagana
aktualizacja i błąd weryfikacji blokują uruchomienie w procesie głównym,
a nie tylko przez wyłączenie przycisku. Trwający mecz nie jest przerywany.
Do uruchomienia gry potrzebny jest internet do sprawdzenia wersji.
Dane lokalne pozostają w `%APPDATA%\StrikeZone2D`.

## Nowe wydania dla twórcy

1. Zapisz nową grę jako `game-source/index.html`.
2. Zwiększ wersję w `package.json` i `package-lock.json`.
3. Uruchom `npm ci`, `npm test` i `npm run prepare:game`.
4. Wyślij zmiany na main. GitHub Actions buduje, publikuje i testuje wydanie.

Na Windows z Node.js 24 możesz też uruchomić `ZBUDUJ_WINDOWS.cmd` lub
`NOWA_WERSJA.cmd`. Zachowaj appId, origin `strikezone://app` i katalog danych.
Konfiguracja `updates.json` jest wewnątrz aplikacji. Zawiera publiczny kanał
GitHub i `required: true`; nie wymaga tokena na komputerze gracza.

SDK Supabase 2.45.4 jest dołączane lokalnie. Konto, postęp i konfiguracja bazy
pochodzą z oryginalnego HTML. Projekt nie wykonuje migracji bazy Supabase.

## Wynik testu

`npm test` sprawdza synchronizację zapisów i mechanizm obowiązkowych aktualizacji.
GitHub Actions instaluje testową 1.0.0 na Windows, wykrywa wydanie z GitHuba,
sprawdza blokadę gry, pobiera i instaluje aktualizację, weryfikuje nową wersję,
zachowanie localStorage oraz uruchomienie gry i powrót do launchera.
Raport `update-smoke-report.json` jest dołączany do wydania.
Testy nie logują się na prawdziwe konto ani nie zmieniają bazy Supabase.

Instalatory nie mają podpisu cyfrowego wydawcy.
