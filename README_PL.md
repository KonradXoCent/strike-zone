# Strike Zone 2D — 1.1.0

Pobierz `StrikeZone-Setup-1.1.0.exe` z [GitHub Releases](https://github.com/KonradXoCent/strike-zone/releases/latest).
Posiadacze wersji 1.0.1 aktualizują grę przez launcher. Gracz nie potrzebuje Node.js.

## Konto i sterowanie

Zaloguj się w launcherze tym samym e-mailem i hasłem co w przeglądarkowej wersji gry.
Można też utworzyć konto; jeśli pojawi się komunikat o potwierdzeniu e-maila,
otwórz wiadomość, potwierdź adres i zaloguj się w launcherze.
Launcher pokazuje nick i awatar z bieżącego profilu zapisanego w chmurze.
Po zmianie profilu w grze widok w launcherze aktualizuje się automatycznie.
Wylogowanie jest dostępne w launcherze. W grze nie ma osobnego logowania.

F11 przełącza pełny ekran gry. Escape w menu głównym otwiera potwierdzenie:
„Nie” po lewej w zieleni anuluje, „Tak” po prawej w czerwieni zapisuje postęp
i zamyka okno gry, wracając do launchera. W meczu Escape nadal włącza pauzę.
Ctrl + Shift + L również wraca do launchera.

Konta i postęp korzystają z dotychczasowego Supabase. Nie zmieniono schematu bazy.
Dane lokalne są w `%APPDATA%\StrikeZone2D`, a sesja jest chroniona przez Windows DPAPI.
Hasło nie jest zapisywane. Do konta, chmury i sprawdzania wersji potrzebny jest internet.
Gra najpierw wczytuje zapis konta, zanim pozwala wysłać własny zapis do chmury.
Gdy odczyt się nie powiedzie, można go ponowić bez nadpisania danych.

## Nowe wydania

1. Podmień `game-source/index.html`, jeśli zmienia się gra.
2. Zwiększ numer wersji w `package.json` i `package-lock.json`.
3. Uruchom `npm ci`, `npm test` i `npm run prepare:game`.
4. Wyślij zmiany na main. GitHub Actions buduje i publikuje instalator, blockmap i latest.yml.

Zachowaj appId, origin `strikezone://app` i katalog danych między wersjami.
Konfiguracja `updates.json` jest wewnątrz aplikacji. Wymagana aktualizacja blokuje
uruchomienie starszej wersji w procesie głównym. Trwający mecz nie jest przerywany.
Pierwsza paczka 1.0.0 spoza GitHuba miała wyłączony kanał i wymaga nowego instalatora.

## Testy

`npm test` sprawdza konta, sesje, odczyt chmury przed zapisem, rozmiar okna i aktualizator.
Workflow Windows instaluje prawdziwą publiczną 1.0.1 i aktualizuje ją do bieżącej wersji.
Następnie sprawdza błędne hasło, rejestrację z potwierdzeniem e-maila i bez niego,
odczyt nicku i awatara, tę samą sesję w grze, brak osobnych kontrolek logowania,
Escape, zapis postępu, zmiany profilu, wylogowanie oraz izolację dwóch kont.
Testy kont używają odizolowanych odpowiedzi HTTP; bez modyfikacji prawdziwych kont i bazy.
Raport `update-smoke-report.json` jest dołączany do wydania.

Instalatory nie mają podpisu cyfrowego wydawcy.
