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

Konta i postęp korzystają z dotychczasowego Supabase. Dotychczasowe tabele zapisów
pozostają bez zmian; Warsztat online ma osobne tabele zgłoszeń i publikacji.
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

Szkice są zapisane lokalnie osobno dla każdego konta. Eksport/import plików
`.szmap.json` i `.szskin.json` pozwala przenieść je na inny komputer.
Przycisk **Wyślij do oceny** wysyła niezmienną kopię projektu. W zakładce
**Moje zgłoszenia** autor widzi status i ewentualny powód odrzucenia.

Właściciel aktywuje panel przez **Warsztat → Katalog graczy → Mam kod właściciela**.
Jednorazowy kod jest przekazywany osobno, poza grą i repozytorium. Panel zostaje
przypisany do zalogowanego konta, niezależnie od jego aktualnego nicku.
W **Moderacji** można obejrzeć projekt, sprawdzić mapę z botami, zatwierdzić
publikację lub odrzucić projekt z uzasadnieniem. Zatwierdzony projekt pojawia się
w **Katalogu graczy** po odświeżeniu; klient sprawdza też katalog w menu co minutę.

Zatwierdzone mapy działają z botami i w lobby w TDM, CTF oraz trybie bombowym.
Mecz przesyła identyfikator zatwierdzonej wersji; każda strona pobiera tę samą
geometrię, nawet jeśli ma mapę pod innym lokalnym numerem. Opublikowane wersje
pozostają niezmienne, więc aktualizacja projektu nie podmienia mapy trwającego meczu.

Zatwierdzone skiny są darmowymi wyglądami widocznymi dla innych graczy używających
tej wersji klienta, z osobnym licznikiem StatTrak. Nie są przedmiotami rynkowymi:
nie trafiają do sprzedaży, wymian, skrzynek, kontraktów ani upgradera. Wybór skina
z ekwipunku przywraca zwykłe wyposażenie. Nieopublikowane szkice widzi tylko autor.
Testy lokalnych map i oczekujących zgłoszeń nie przyznają nagród ani statystyk.

Obsługa online wymaga klienta z tej gałęzi; wydanie instalatora nadal ma numer 1.2.0.
Szczegóły bazy i testów: [docs/community-workshop.md](docs/community-workshop.md).

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
własnych map z botami bez nagród. `npm run test:community` sprawdza autora,
moderatora i innego gracza, prawdziwe reguły PostgreSQL, publikowanie i odrzucanie,
wspólną mapę oraz widoczność skinów. Testy Electron uruchamiaj kolejno.
Workflow Windows instaluje prawdziwą publiczną 1.1.0 i aktualizuje ją do bieżącej wersji.
Następnie sprawdza błędne hasło, rejestrację z potwierdzeniem e-maila i bez niego,
odczyt nicku i awatara, tę samą sesję w grze, brak osobnych kontrolek logowania,
Escape, zapis postępu, zmiany profilu, wylogowanie oraz izolację dwóch kont.
Testy kont używają odizolowanych odpowiedzi HTTP; bez modyfikacji prawdziwych kont i bazy.
Raport `update-smoke-report.json` jest dołączany do wydania.

Instalatory nie mają podpisu cyfrowego wydawcy.
