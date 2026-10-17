# Strike Zone 2D — 1.2.0

Pobierz `StrikeZone-Setup-1.2.0.exe` z [GitHub Releases](https://github.com/KonradXoCent/strike-zone/releases/latest).
Posiadacze wersji 1.0.1 i 1.1.0 aktualizują grę przez launcher. Gracz nie potrzebuje Node.js.

Pełna lista zmian 1.2.0: [RELEASE_NOTES.md](RELEASE_NOTES.md).

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

## Funkcje w wersji testowej

Na gałęzi testowej: odświeżone menu z ikonami SVG, zwarta nawigacja oraz Butterfly,
kilof w stylu voxel, Kukri i Stiletto. Każdy nowy model ma sześć wykończeń i warianty
StatTrak. Dotychczasowe identyfikatory przedmiotów pozostają bez zmian.

W menu **Warsztat** są dwa lokalne edytory:

- **Mapy:** ściany, skrzynie, okna, spawny CT/T i bombsite’y A/B, przesuwanie,
  cofanie i ponawianie, trzy motywy oraz test z botami w TDM, CTF i rozbrajaniu bomby.
  Przed testem gra sprawdza przejścia z uwzględnieniem rozmiaru postaci.
- **Skiny:** wszystkie bronie i osiem modeli noży, trzy kolory, sześć wzorów oraz
  pędzel przycinany do powierzchni broni. Projekt można zapisać i wyposażyć lokalnie.

Projekty są zapisane na urządzeniu osobno dla każdego konta; nie synchronizują się
z chmurą. Eksport/import plików `.szmap.json` i `.szskin.json` pozwala przenieść je
na inny komputer. Własne mapy są obecnie przeznaczone do lokalnego treningu,
bez nagród i zmian statystyk. Własne skiny widzi ich autor; nie są przedmiotami
rynkowymi i nie trafiają do wymian, kontraktów ani upgradera. Wybór skina
z ekwipunku przywraca zwykłe wyposażenie.

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
`npm run test:gameplay` sprawdza rozgrywkę, mapy i dwóch klientów w odizolowanej sieci testowej.
`npm run test:creator` sprawdza nowe noże i zabójstwa StatTrak, nawigację przy sześciu
rozmiarach okna, edycję myszą, zapis i wyposażanie skinów, izolację kont oraz testy
własnych map z botami bez nagród. Oba testy Electron uruchamiaj kolejno.
Workflow Windows instaluje prawdziwą publiczną 1.1.0 i aktualizuje ją do bieżącej wersji.
Następnie sprawdza błędne hasło, rejestrację z potwierdzeniem e-maila i bez niego,
odczyt nicku i awatara, tę samą sesję w grze, brak osobnych kontrolek logowania,
Escape, zapis postępu, zmiany profilu, wylogowanie oraz izolację dwóch kont.
Testy kont używają odizolowanych odpowiedzi HTTP; bez modyfikacji prawdziwych kont i bazy.
Raport `update-smoke-report.json` jest dołączany do wydania.

Instalatory nie mają podpisu cyfrowego wydawcy.
