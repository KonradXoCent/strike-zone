# Strike Zone 2D — 1.5.7

Pobierz `StrikeZone-Setup-1.5.7.exe` z [GitHub Releases](https://github.com/KonradXoCent/strike-zone/releases/latest).
Dotychczasowy launcher otrzyma aktualizację 1.5.7. Wybierz pobranie, a potem instalację i ponowne uruchomienie. Konto i ekwipunek pozostają zachowane. Nazwa gry nadal brzmi **Strike Zone 2D**.

Wydanie dodaje buforowany wygląd 2.5D, edycję obecnych map przez właściciela, publikowanie niezależnych map i wersji oraz zniszczalne deski i kratki z odrębnymi dźwiękami. Zawiera także zatwierdzone poprawki piłki nożnej, dźwięków, zaproszeń i profilu oraz tryb walki na lasery.

Pełna lista zmian: [RELEASE_NOTES.md](RELEASE_NOTES.md). Narzędzia właściciela: [docs/core-map-editor.md](docs/core-map-editor.md).

## W przygotowaniu: Hide and Seek i Prop Hunt

Prop Hunt pozwala graczom i botom przebierać się za przedmioty otoczenia.
Każda z trzech aren ma pięć dostępnych przebrań. **R** kopiuje pobliski
przedmiot, **F** blokuje obrót, a **E** uruchamia zryw. Szukający strzelają
z pistoletów; trafienie zwykłej dekoracji kosztuje 5 HP. Zmiany przebrania,
trafienia i zmiany ról rozstrzyga host wspólnego meczu.

Test nowego wariantu: `npm run test:prop-hunt`. Opis: [docs/prop-hunt.md](docs/prop-hunt.md).

Tryb **Zabawa w chowanego / Hide and Seek** ma trzy własne areny:
`hs_warehouse`, `hs_garden` i `hs_motel`. Pula jest oddzielona od zwykłych map.
Drużyny mają 30 sekund na ukrycie i 150 sekund na szukanie. Po rundzie zmiana
ról; mecz obejmuje sześć rund. Szukający łapią dotknięciem lub lewym przyciskiem
myszy z bliska. Ukrywający się mają zryw pod E z czasem odnowienia.
Co 25 sekund pojawia się przybliżona wskazówka dźwiękowa o okolicy ukrycia.
Boty reagują na widoczność i wskazówki oraz pamiętają ostatnią obserwację.

Tryb działa lokalnie oraz w lobby i serwerach ze wspólną symulacją hosta.
`npm run test:hide-seek` sprawdza mapy, boty, rundy, łapanie i nagrody;
`npm run test:network` obejmuje też synchronizację nowego trybu.
Szczegóły: [docs/hide-seek.md](docs/hide-seek.md).

## Język, motywy i rozmowy

Wersja 1.5.1 dodaje materiały i cieniowanie map. W ustawieniach
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

Pierwsze kliknięcie na pole gry przechwytuje mysz.
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

Mniejsze aktualizacje zwiększają ostatni człon numeru: **1.5.1 → 1.5.2 → 1.5.3**.
Numer 1.6.0 wymaga osobnej decyzji właściciela o większym wydaniu.

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
Workflow Windows instaluje prawdziwą publiczną 1.5.2 i aktualizuje ją do bieżącej wersji.
Następnie sprawdza błędne hasło, rejestrację z potwierdzeniem e-maila i bez niego,
odczyt nicku i awatara, tę samą sesję w grze, brak osobnych kontrolek logowania,
Escape, zapis postępu, zmiany profilu, wylogowanie oraz izolację dwóch kont.
Testy kont używają odizolowanych odpowiedzi HTTP; bez modyfikacji prawdziwych kont i bazy.
Raport `update-smoke-report.json` jest dołączany do wydania.

Instalatory nie mają podpisu cyfrowego wydawcy.


## Zone Hub 0.1.6 / Zone Royale 0.1.3

Zone Hub uruchamia zarządzane gry bez dodatkowego okna launchera. Przy każdej grze w bibliotece jest zębatka z ustawieniem pełnego ekranu, weryfikacją SHA-256 zainstalowanych plików i naprawą. Naprawa zachowuje konto oraz zapisy w chmurze. Kontrola plików służy integralności instalacji.

Wiadomości i grupy używają istniejącego `sz_chat`; te same rozmowy widać w grze, dawnym launcherze i Zone Hub. Ekwipunek i wymiany otwiera się z profilu. Warsztat pokazuje wyłącznie opublikowane, aktywne prace z istniejącego katalogu Supabase. Oficjalne oznaczenie ZeroX pochodzi z prywatnej tabeli uprawnień, a nie z nicku lub metadanych użytkownika.

Rynek posiada sortowanie, kategorie i strony po 24 oferty dla każdej gry. Boty uzupełniają zróżnicowane oferty; limit wydatków botów pozostaje niezmieniony.

W Zone Royale klawisze **1–3** wybierają bronie, **4** kilof, **5** granat. Gdy trzy sloty są pełne, przytrzymaj **E**, aby podnieść inną broń w miejsce wybranej. **G** upuszcza trzymaną broń. W duo, trio i squad karta po śmierci wygasa po 180 sekundach, jeśli drużyna jej nie zbierze. Zebrana karta umożliwia odrodzenie przy vanie: przytrzymaj **E** przez 6 sekund. Ruch i obrażenia przerywają operację. Van po odrodzeniu ma 90 sekund odnowienia. Boty także zbierają karty i odradzają sojuszników. Host kontroluje stan broni, kart i vanów; protokół kolejki 4 oddziela te mecze od starszych klientów.

Nowe migracje po dotychczasowym schemacie: `zone-hub-item-categories.sql`, `zone-hub-browse.sql`, `zone-hub-market-stock.sql`; `zone-royale-matchmaking.sql` obsługuje protokół 4. W działającej bazie można zastosować krótszą, idempotentną migrację `zone-royale-protocol4.sql`. Oryginalny kanał aktualizacji samodzielnego Strike Zone 2D nie jest zastępowany.

Źródłami znaków aplikacji są `assets/hub-logo.svg` oraz `assets/strike-emblem.b64` (oryginalna grafika utworzona przez imagegen). `scripts/brand-assets.cjs` odtwarza PNG/ICO przed przygotowaniem gry i pakowaniem.

## Zone Hub 0.1.7 / Zone Royale 0.1.4

- Zone Royale wyświetla własne logo i wyspę już na pierwszym ekranie. Ma osobne statystyki, rangi, 12 osiągnięć BR i przełącznik meczów rankingowych/nierankingowych. Kolejki i wyniki są rozdzielone na serwerze.
- Ustawienia gry i zapis postępu nie nadpisują drugiej gry. Zarządzana wersja Strike Zone: 1.5.10-zonehub.2.
- Ustawienia konta Zone Hub: nick, kadrowany awatar, odzyskanie hasła przez e-mail, opis i prywatność.
- Sklep: pakiet Halloween za 500 monet Strike Zone 2D. Zakup jednorazowy, osobny wybór motywu profilu i platformy.
- Profil z tłem, odznakami, bocznym panelem i gablotą na maksymalnie 6 posiadanych skinów lub ulubioną grę. Prywatność ekwipunku obowiązuje także w gablocie.
- Osiągnięcia każdej gry są osobno w bibliotece i na profilu.

Zone Hub **0.1.8**, Zone Royale **0.1.5** i zarządzany Strike **1.5.10-zonehub.3** uzupełniają tę aktualizację o dynamicznie tłumaczony ekran wczytywania Royale oraz pełny audyt nowych tekstów PL/EN. Dotychczasowe pakiety pozostają dostępne.

## Zone Hub 0.1.9 — aktualizacje zawartości

Aktualizacja platformy zachowuje gry w stałym katalogu użytkownika. Brakujący lub stary wpis `installed.json` jest odzyskiwany z istniejącej instalacji, także ze znanych wcześniejszych lokalizacji. Nazwa, konto i ekwipunek gry pozostają niezależne od wersji Zone Hub.

Pakiety Strike `1.5.10-zonehub.4` i Royale `0.1.6` publikują obok pełnego ZIP mały ZIP z `resources/app.asar`. Manifest zachowuje schemat 1, więc starsze platformy nadal pobierają pełną paczkę. Zone Hub 0.1.9 porównuje kod pliku PE, ikonę oraz wszystkie pozostałe pliki silnika z manifestem; zgodny silnik jest ponownie używany. Aktualizacja zawartości sprawdza rozmiar, SHA-256, tożsamość gry i wersję, następnie zapisuje nowy indeks integralności i przełącza katalog atomowo. Błąd pobierania nie usuwa poprzedniej instalacji. Pierwsza instalacja, zmiana silnika lub uszkodzony silnik wymagają pełnej paczki.

`zone-hub-content-smoke.cjs` sprawdza rzeczywiste publiczne gry Windows → nowe paczki zawartości, odzyskanie rejestru i ponowne uruchomienie platformy. Test NSIS instaluje oryginalny Zone Hub 0.1.1, aktualizuje go i wymaga `canPlay` obu rzeczywistych gier bez żadnego pobrania gry.

## Zone Hub 0.1.10 / Zone Haunt Beta 0.1.0

Nowa gra kooperacyjna **Zone Haunt** ma trzy lokacje, osiem zjawisk, siedem dowodów, sprzęt pomiarowy, dziennik i polowania z bezpiecznymi szafami. Graj sam z botami lub w lobby do czterech osób. Sterowanie i wyniki są odrębne od pozostałych gier. [Opis funkcji i walidacji](docs/zone-haunt-and-style-shop.md).

Strike `1.5.10-zonehub.5` usuwa Battle Royale z wyboru trybów, ekwipunku i skrzynek; BR pozostaje w osobnym Zone Royale `0.1.7`. Royale otrzymuje nową grafikę i znak. Sklep platformy zawiera sześć płatnych motywów/teł i sześć ramek awatara; zakupy i wyposażenie kontroluje serwer. Rynek uzupełnia do 240 ofert botów w każdej z obu gier.


### Zone Haunt 0.1.5 — pełny zestaw, kamery i pomocnicy

Po bazowym `database/zone-haunt.sql` i wspólnym portfelu `database/zone-wallet.sql` zastosuj `database/haunt-progression.sql`, następnie `database/haunt-research.sql`, a na końcu `database/haunt-operations.sql`. Jest to dodatek do istniejącego backendu, zachowujący obsługę starszych protokołów. Nowa gra korzysta z protokołu 3. Nie uruchamiaj ponownie starszych migracji, które zmieniają router RPC po tym dodatku.

Gra kosztuje 500 ZC, z potwierdzeniem ceny po stronie klienta. Dotychczasowe wpisy w bibliotece zachowują licencję. Sprzęt, rozliczenia i zaproszenia są trzymane w prywatnym schemacie z RLS. Na każdą wyprawę ekipa otrzymuje po jednej bezpłatnej sztuce wszystkich 12 narzędzi. Ten wspólny zestaw wraca także po przegranej. Własne zapasy i wybrany ładunek to dodatkowe sztuki: wracają, gdy ktoś przeżyje, albo przepadają po śmierci całej ekipy lub przerwaniu kontraktu. Rezerwy w biurze pozostają. Trwające wyprawy zachowują swój pierwotny ładunek. Sprzęt i nagrody za zlecenia korzystają z osobnych Punktów badań (PB / RP). Każdy właściciel dostaje jednorazowo 1K PB. Ceny ustala serwer, a ponowienia zakupu i wyniku są idempotentne. Wcześniejsze obciążenia ZC za sprzęt są jednorazowo zwracane; dotychczasowy sprzęt zostaje. Nowe wyniki RP nie trafiają do ZC ani podczas późniejszego importu sald. Salda, ceny i nagrody używają skrótów K/M/B/T.

Mapy odblokowuje poziom Zone Haunt lidera: 1 + suma XP / 250 (część całkowita). Willow i Harvest House są od poziomu 1; kolejne lokacje od poziomów 2–10, asylum od 12. Kolejność w tablicy wynika z powierzchni mapy. Znajomi z niższym poziomem mogą grać na mapie odblokowanej przez lidera.

Kooperacja nadal używa symulacji prowadzonej przez lidera i prywatnych kanałów Realtime z autoryzacją SQL oraz zapasową synchronizacją RPC. Taki model nie jest niezależnym serwerem symulującym ducha ani zabezpieczeniem przed fałszowaniem przebiegu przez zmodyfikowanego klienta lidera.

Kamery automatycznie kadrują panoramę pokoju bez obracania obrazu. Widać rozstawiony sprzęt, także książki i krucyfiksy; ściany i zamknięte drzwi zasłaniają obraz. Boty zabierają narzędzia i spokojnie sprawdzają różne pomieszczenia, zgłaszając rzeczywiste odczyty. Nie znają pokoju ducha i nie wypełniają dziennika za gracza. Polecenia pod Z mają pierwszeństwo; sprzęt niesiony przez bota można zamówić także w vanie.

### Zone Haunt 0.1.6 — przeklęte przedmioty i wyzwania

Po `haunt-operations.sql` zastosuj `database/haunt-fieldwork.sql`. Nowe śledztwa używają protokołu 4, zachowując stare kontrakty i obsługę zaproszeń z Zone Hub 0.1.13. Na każdą wyprawę jest 15 bezpłatnych narzędzi. REM-POD działa w ręce, po postawieniu i w vanie; czujnik ruchu oraz zabawkowy samochód reagują na faktyczne położenie ducha. Na mapie jest jeden losowy przeklęty przedmiot. Boty samodzielnie badają pokoje od początku, cała ekipa może dzielić szafę, a lider wybiera siedem wyzwań z dodatkowymi PB. Wymagane dowody duchów są w dzienniku. [Pełny opis i walidacja](docs/zone-haunt-and-style-shop.md).


### Zone Haunt 0.1.7 — piwnice, nowe lokacje i współpraca

Po `haunt-fieldwork.sql` zastosuj `database/haunt-expeditions.sql`. Nowe wyprawy korzystają z protokołu 5; kontrakty protokołów 1–4 zachowują poprzednie rozliczenia, a zaproszenia nadal działają z Zone Hub 0.1.13.

Gra ma 19 lokacji, w tym nowy cyrk, sklep, arcade, opuszczony szpital i więzienie, cmentarz i kamping z namiotami oraz domkami. Na każdej mapie schody pod **E** prowadzą do piwnicy z bezpiecznikami. **Z → Tu jest pokój ducha** kieruje boty ze sprzętem do aktualnego pokoju gracza; boty nie otrzymują tajnej pozycji ducha. Poprawiono otwieranie drzwi ze sprzętem w progu i dochodzenie botów do półek vana.

Pomocnicy fotografują i zbierają zauważoną kość, fizycznie przynosząc dostępny aparat. Zdjęcia brudnej wody i odcisków w soli mają osobne, jednorazowe bonusy PB. Demon częściej poluje, szybciej obniża spokój i częściej wyłącza prąd. Zjawiska mają głosy dopasowane do modeli oraz demoniczny śmiech. Odświeżone menu i ekran ładowania pokazują plan oraz opis wybranej mapy. [Szczegóły zmian i walidacji](docs/zone-haunt-and-style-shop.md).


### Zone Haunt 0.1.8 / Zone Royale 0.1.9

W Zone Haunt poprawiono przewijanie tablicy map: odświeżenia lobby i wybór mapy zachowują pozycję listy. W **Ustawienia → Obraz i sterowanie → Widok gry** można włączyć testowy widok **3D z oczu postaci**. Korzysta z tych samych 19 map i mechanik; gracze 3D i 2.5D mogą być w jednej ekipie. Jakość, pole widzenia i czułość myszy zapisują się osobno dla Haunt. Dziennik i inne okna uwalniają kursor. Schody nadal obsługuje **E**. Domyślny widok 2.5D pozostaje dostępny. [Opis i ograniczenia wersji testowej](docs/zone-haunt-and-style-shop.md).

Zone Royale ma 14 miejscówek, 26 budynków i 32 dodatkowe osłony. Dodano osadę nad kanałem, zajezdnię, posterunek rzeczny, giełdę portową, zakład przemysłowy, kamieniołom, obozowisko i obserwatorium. `database/zone-royale-frontier.sql` oddziela kolejki różnych wersji geometrii i zachowuje stare mecze. Obie gry aktualizują się samodzielnie w obecnej bibliotece Zone Hub.
