# strike-zone

Strike Zone 2D na Windows z launcherem i obowiązkowymi aktualizacjami.

**[Pobierz najnowsze wydanie](https://github.com/KonradXoCent/strike-zone/releases/latest)**

Zainstaluj `StrikeZone-Setup-1.0.1.exe`. Launcher sprawdza wydania na GitHubie
i blokuje uruchomienie starszej wersji do czasu aktualizacji. Aktualizacja
instaluje się po kliknięciu przycisku i ponownie uruchamia launcher.

## Test aktualizacji 1.0.0 → 1.0.1

W wydaniu jest także `StrikeZone-Test-1.0.0.exe`: starsza, testowa wersja
z już skonfigurowanym kanałem aktualizacji. Zainstaluj ją i otwórz launcher.
Powinien pokazać wymaganą aktualizację do 1.0.1, pobrać ją po kliknięciu
przycisku, zainstalować i uruchomić nowszą wersję.

Pierwszy instalator 1.0.0 udostępniony wcześniej poza GitHubem miał wyłączony
kanał aktualizacji. Do pierwszego uruchomienia połączenia z GitHubem użyj
jednego z instalatorów z tego repozytorium.

## Dane gracza

Gra i Supabase pochodzą z przesłanego pliku HTML. Nie są wykonywane migracje
bazy. Konto, postęp i multiplayer korzystają z dotychczasowego Supabase.
Dane lokalne są przechowywane w `%APPDATA%\StrikeZone2D` i pozostają po aktualizacji.
Launcher wymaga internetu do weryfikacji aktualnej wersji przed uruchomieniem gry.

## Kod i wydania

Plik gry znajduje się w `game-source/index.html`. Nowe wydanie przygotuj przez
podmianę tego pliku oraz zwiększenie wersji w `package.json` i `package-lock.json`.
Push na `main` uruchamia budowanie, publikowanie i test Windows w GitHub Actions.
Użytkownicy pobierają gotowe aktualizacje przez launcher.

Szczegóły: [README_PL.md](README_PL.md).

## Wynik testu

Workflow instaluje testową wersję 1.0.0 na Windows, wykrywa aktualizację
z prawdziwego GitHub Releases, sprawdza blokadę gry, pobiera instalator,
uruchamia aktualizację i weryfikuje wersję oraz zachowanie danych lokalnych.
Sprawdza również start gry i powrót do launchera.
Wynik jest publikowany w pliku `update-smoke-report.json` w wydaniu.

Instalatory nie mają podpisu cyfrowego wydawcy.
