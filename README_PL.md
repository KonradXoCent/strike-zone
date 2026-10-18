# Strike Zone 2D — 1.5.0

Pobierz `StrikeZone-Setup-1.5.0.exe` z [GitHub Releases](https://github.com/KonradXoCent/strike-zone/releases/latest).
Posiadacze wersji 1.0.1, 1.1.0, 1.2.0, 1.3.0, 1.4.0 i 1.4.1 aktualizują grę i launcher razem przez dotychczasowy launcher. Gracz nie potrzebuje Node.js.

Pełna lista zmian 1.5.0: [RELEASE_NOTES.md](RELEASE_NOTES.md).

Wersja 1.4.1 ujednolica logo launchera, menu, ekranów startowych oraz ikon aplikacji
i instalatora: złota tarcza z literą Z na przezroczystym tle. `assets/icon.png` jest
wspólnym źródłem dla interfejsu i osadzonego HTML, a `assets/icon.ico` zawiera siedem
rozmiarów ikon Windows (16–256 px). Po zmianie obrazu uruchom
`node scripts/embed-shared.cjs`; przygotowanie gry sprawdza zgodność logo.

## Język, motywy i rozmowy

Przygotowana wersja testowa dodaje materiały i cieniowanie map. W ustawieniach
gry albo pauzy wybierz **Wygląd map → Tekstury i cieniowanie** lub
**Uproszczony wygląd**. Rysowanie korzysta z dotychczasowego obrazu mapy,
bez dodatkowej warstwy całej mapy i generowania tekstur w kolejnych klatkach.
Szczegóły oraz sposób porównania kosztu renderowania:
[docs/map-materials.md](docs/map-materials.md).

W ustawieniach launchera wybierz PL lub EN. Zapamiętany wybór jest wspólny z grą
i działa także przy otwartym oknie gry. Motywy launchera: Nocny, Leśny i Piaskowy.
Wiadomości prywatne oraz grupy do 16 osób zachowują historię, trafiają również do
osób offline i pokazują liczniki nieprzeczytanych oraz powiadomienia w obu oknach.
Właściciel grupy zarządza jej nazwą i uczestnikami.

Znajomi w grze pokazują ustawione zdjęcie, nick oraz Offline / Online / W Meczu.
Po kliknięciu znajomego przycisk Trade pozwala wysłać zaproszenie do wymiany.
Wysyłanie, przyjmowanie i potwierdzanie wymaga aktywnego połączenia obu graczy.

## Ekwipunek i ekrany gry — nowości 1.5.0

W zakładce skinów wyszukasz nazwę skina lub broni i wybierzesz typ wyposażenia.
Wszystkie osiem modeli noży ma wspólną kategorię **Noże**. Wyszukiwanie obejmuje
posiadane skiny społeczności i StatTrak, toleruje wielkość liter oraz brak polskich
znaków i zachowuje filtry po założeniu albo sprzedaży przedmiotu.

Przepustka pokazuje postęp, nagrody w zakresach po dziesięć poziomów, misje i serię
codziennych nagród. Lobby ma drużyny, kod zaproszenia, podgląd mapy i kontrolki
hosta. Wybór trybów ma osobne ikony SVG, a głosowanie pokazuje aktualne układy map.
Pełne nagłówki są tłumaczone razem, bez mieszania polskich i angielskich słów.
Moduł `shared/game-hub.js` zmienia widoki; korzysta z dotychczasowej logiki nagród,
wyposażania, sprzedaży i sieci. `npm run test:hub` sprawdza te działania oraz
rozmiary okien. Po zmianie współdzielonych plików odśwież osadzenie poleceniem
`node scripts/embed-shared.cjs`.

## Konto i sterowanie

Zaloguj się w launcherze tym samym e-mailem i hasłem co w przeglądarkowej wersji gry.
Można też utworzyć konto; jeśli pojawi się komunikat o potwierdzeniu e-maila,
otwórz wiadomość, potwierdź adres i zaloguj się w launcherze.
Launcher pokazuje nick i awatar z bieżącego profilu zapisanego w chmurze.
Po zmianie profilu w grze widok w launcherze aktualizuje się automatycznie.
Wylogowanie jest dostępne w launcherze. W grze nie ma osobnego logowania.
Lista znajomych jest wspólna z grą: zielona kropka oznacza online, szara offline.
Wyszukiwarka filtruje nicki, a aktywność rozróżnia launcher, menu, lobby i mecz.

W przygotowanej wersji testowej pierwsze kliknięcie na pole gry przechwytuje mysz.
Widać celownik ustawiony w grze, a mysz pozostaje w jej oknie. Escape otwiera
pauzę i zwalnia mysz. Zakupy (B), mapa BR i okna rozmów także zwalniają kursor.
Po powrocie kliknij pole gry lub przycisk wznowienia. Przechwytywanie można
wyłączyć w ustawieniach gry lub pauzy w sekcji **Sterowanie myszą**.

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

## Funkcje Warsztatu i nowe wyposażenie

Odświeżone menu z ikonami SVG, zwarta nawigacja oraz Butterfly,
kilof w stylu voxel, Kukri i Stiletto. Każdy nowy model ma sześć wykończeń i warianty
StatTrak. Dotychczasowe identyfikatory przedmiotów pozostają bez zmian.

W edytorze skinów użyj przycisków − / + albo kółka, aby zmienić zoom w zakresie
50–400%. Kółko powiększa wskazany fragment. Model przesuniesz środkowym
przyciskiem myszy, przez Spacja + przeciągnięcie lub przyciskiem **Przesuwanie**
na pasku widoku. **Reset widoku** wraca do 100%. Widok nie zmienia zapisanego
projektu ani szerokości i położenia pociągnięć pędzla.

W menu **Warsztat** są dwa lokalne edytory:

- **Mapy:** ściany, skrzynie, okna, spawny CT/T i bombsite’y A/B, przesuwanie,
  cofanie i ponawianie, trzy motywy oraz test z botami w TDM, CTF i rozbrajaniu bomby.
  Przed testem gra sprawdza przejścia z uwzględnieniem rozmiaru postaci.
- **Skiny:** wszystkie bronie i osiem modeli noży, trzy kolory, sześć wzorów oraz
  pędzel przycinany do powierzchni broni. Projekt można zapisać i wysłać do oceny;
  szkic jest podglądem edytora i nie daje darmowego wyposażenia.

Szkice są zapisane lokalnie osobno dla każdego konta. Eksport/import plików
`.szmap.json` i `.szskin.json` pozwala przenieść je na inny komputer.
Przycisk **Wyślij do oceny** wysyła niezmienną kopię projektu. W zakładce
**Moje zgłoszenia** autor widzi status i ewentualny powód odrzucenia.

Panel **Warsztat → Moderacja** pojawia się automatycznie na koncie właściciela.
Uprawnienia są przypisane w bazie do UUID konta, niezależnie od aktualnego nicku.
W **Moderacji** można obejrzeć projekt, sprawdzić mapę z botami, zatwierdzić
publikację lub odrzucić projekt z uzasadnieniem. Zatwierdzony projekt pojawia się
w **Katalogu graczy** po odświeżeniu; klient sprawdza też katalog w menu co minutę.

Każda mapa zapisuje tryb autora: TDM, CTF albo rozbrajanie bomby. Zatwierdzona mapa
działa z botami i w lobby we własnym trybie; starsze projekty bez trybu używają TDM.
Mecz przesyła identyfikator zatwierdzonej wersji; każda strona pobiera tę samą
geometrię, nawet jeśli ma mapę pod innym lokalnym numerem. Opublikowane wersje
pozostają niezmienne, więc aktualizacja projektu nie podmienia mapy trwającego meczu.

Mapy mają publiczne liczniki zagrań i polubień. Zalogowane konto może polubić mapę
raz lub cofnąć polubienie. Zagranie liczy się po minucie aktywnej gry; lobby liczy
jeden mecz hosta. Liczniki rozpoczynają się z tą aktualizacją.

Automatyczny awans do głównej puli własnego trybu domyślnie wymaga 50 zagrań
i 10 polubień, z jednym miejscem na tryb. Właściciel ustawia progi, liczbę miejsc
i włączenie automatycznego awansu w **Moderacja → Awans map do głównej puli**.
Wycofanie mapy usuwa ją z puli; rewizja w tym samym trybie zachowuje popularność,
a zmiana trybu rozpoczyna nowe liczniki. Mapy społecznościowe pozostają nierankingowe.

Właściciel Warsztatu nie ma limitu wysłanych ani oczekujących zgłoszeń map i skinów.
Pozostali gracze mogą mieć do 10 oczekujących i wysłać 10 w ciągu 24 godzin.

Zatwierdzone skiny automatycznie trafiają do **Community Forge Case**. Skrzynka ma
osobną grafikę grafitowej kapsuły z turkusowym rdzeniem. Zakup kosztuje 2500$ z gry,
nie wymaga klucza i odblokowuje się po 5 różnych zatwierdzonych projektach skinów.
Aktualizacja projektu nie zwiększa licznika, a wycofany skin opuszcza pulę.
Każdy aktywny projekt ma równą szansę; wariant StatTrak wypada z szansą 10%.

Zdobyte skiny są przypisanymi do konta przedmiotami w **Ekwipunek → Weapon skins**.
Można wyposażyć wyłącznie posiadany egzemplarz, także w przypadku nowego modelu
noża. Katalog nie daje darmowego wyposażenia. Licznik StatTrak jest osobny dla
każdego egzemplarza; wygląd jest widoczny w multiplayer po weryfikacji własności.
Przedmioty społecznościowe nie są obecnie sprzedawane, wymieniane ani używane
w kontraktach lub upgraderze. Nieopublikowane szkice widzi tylko autor w edytorze.
Testy lokalnych map i oczekujących zgłoszeń nie przyznają nagród ani statystyk.

Obsługa online jest dostępna od wydania 1.3.0.
Szczegóły bazy i testów: [docs/community-workshop.md](docs/community-workshop.md).

Samodzielny plik do sprawdzenia Warsztatu można zbudować poleceniem
`npm run prepare:preview -- /pełna/ścieżka/index.html`. Zawiera widoczny formularz
logowania do tego samego konta i osadzony SDK Supabase. Logowanie jest dostępne
tylko w tym pliku testowym. `prepare:game` i publiczny instalator nie dołączają
modułu testowego; sesję gry przekazuje launcher.
Formularz startuje bez dodatkowego testu `/auth/v1/health`. Biblioteka jest
osadzona w zwykłym skrypcie, więc nie wymaga zgody podglądu na skrypty `data:`.
Żądania mają limit 12 sekund; po błędzie można ponowić logowanie.

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
rozmiarach okna, edycję myszą, zapis i brak darmowego wyposażania szkiców, izolację kont oraz testy
własnych map z botami bez nagród. `npm run test:community` sprawdza autora,
moderatora i innego gracza, prawdziwe reguły PostgreSQL, publikowanie i odrzucanie,
wspólną mapę oraz widoczność skinów. Testy Electron uruchamiaj kolejno.
`npm run test:preview` sprawdza formularz i błędne hasło, wczytanie istniejącego
zapisu, wysłanie mapy, moderację przypisaną do konta, publikację, wylogowanie
i zmianę konta, a także brak logowania w publicznym kliencie desktopowym.
Sprawdza także blokadę 4/5, odblokowanie po piątym projekcie, zakup, animację
otwierania, wyposażenie zdobytego przedmiotu i jego odczyt po przeładowaniu.
Obejmuje też niedostępny health endpoint, ograniczenie skryptów `data:`, zerwanie
sieci oraz żądanie, które nie odpowiada aż do przerwania po limicie czasu.
Workflow Windows instaluje prawdziwą publiczną 1.2.0 i aktualizuje ją do bieżącej wersji.
Następnie sprawdza błędne hasło, rejestrację z potwierdzeniem e-maila i bez niego,
odczyt nicku i awatara, tę samą sesję w grze, brak osobnych kontrolek logowania,
Escape, zapis postępu, zmiany profilu, wylogowanie oraz izolację dwóch kont.
Testy kont używają odizolowanych odpowiedzi HTTP; bez modyfikacji prawdziwych kont i bazy.
Raport `update-smoke-report.json` jest dołączany do wydania.

Instalatory nie mają podpisu cyfrowego wydawcy.
