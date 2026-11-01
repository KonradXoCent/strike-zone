# Stan projektu Zone

Stan odtworzony 31 października 2026 z opublikowanych wydań, repozytorium i najnowszego archiwum CameraFix. Dokument przenosi ustalenia techniczne; nie jest pełnym zapisem poprzednich rozmów.

## Źródła i wersje

Repozytorium: `KonradXoCent/strike-zone`. Bieżąca gałąź interfejsu i dalszej pracy: `feature/zonehub-purple-dashboard`.

| Element | Ostatnia potwierdzona wersja publiczna | Kanał |
| --- | --- | --- |
| Zone Hub | 0.1.13 | `zonehub-v0.1.13` |
| Zone Haunt | 0.1.15 | `haunt-v0.1.15` |
| Zone Royale | 0.1.9 | `royale-v0.1.9` |
| Strike Zone 2D dla Huba | 1.5.10-zonehub.6 | `v1.5.10-zonehub.6` |

Źródłem aktualnego Haunt jest opublikowany commit `7ed1464a04a8c7feb539baf13a0195631ea4c541`, włączony do gałęzi interfejsu. Starszy podgląd Haunt 0.1.8 z tej rozmowy jest nieaktualny. Archiwum `Zone-Haunt-3D-Beta-0.1.15-CameraFix.zip` w wersji 2 zostało odczytane i porównane ze źródłem wydania; przy kolejnych pracach punktem wyjścia pozostaje opublikowany kod.

## Zachowywane funkcje

- Jedno konto Supabase i profil ZeroX jako konto twórcy. Logowanie w Hubie, odzyskiwanie hasła, edycja nicku, awatara i ustawień konta; uruchamianie gier z istniejącą sesją.
- Wspólny portfel Zone Coins, zakupy gier i kosmetyków. Sprzęt Haunt używa oddzielnych Punktów badań; nie zastępować ich ZC.
- Biblioteka i osobne instalacje gier, aktualizacje Huba i zawartości gier, weryfikacja i naprawa plików, osobne ustawienie pełnego ekranu dla każdej gry. Aktualizacja platformy musi zachowywać zainstalowane gry i logowanie.
- Znajomi z obrazami awatarów i stanem online/offline/w meczu, zaproszenia, prywatne wiadomości i grupy, zaproszenia do Haunt.
- Ekwipunki rozdzielone według gier, ich prywatność, wymiany i rynek. Ekwipunek i wymiany są dostępne z profilu.
- Profile, weryfikacja twórcy, komentarze, poziomy, gabloty, osiągnięcia gier, kupione tła, motywy i ramki awatarów.
- Warsztat Strike Zone 2D: mapy i skiny, moderacja właściciela, główna pula map i skrzynka społeczności. Nie zastępować istniejącego systemu statyczną makietą.
- Polski i angielski interfejs oraz dotychczasowe motywy, w tym posiadane motywy premium.

## Gry

Zone Haunt 0.1.15 ma prezentację 3D biura i śledztw, 20 map, 21 narzędzi, rozszerzone duchy i dowody, boty, wspólną ekipę, obserwację i sprzęt zakupiony za Punkty badań. Ta wersja została wydana po poleceniu użytkownika; przebudowa Huba nie zmienia jej kodu ani wymaga ponownego pobierania gry.

Zone Royale 0.1.9 zachowuje Frontier Island z 14 miejscówkami i 26 budynkami, osobne kosmetyki, solo/duo/trio/squad, dobieranie drużyny, ranking, trzy bronie i kilof oraz karty ożywienia i vany.

Strike Zone 2D pozostaje osobną grą z własną zawartością, ekwipunkiem, skinami, StatTrak, warsztatem, trybami i mapami. Nie przywracać usuniętego z niej Battle Royale ani nie łączyć jej przedmiotów z Royale.

## Aktualna praca nad Hubem

Wzór to przesłany fioletowy pulpit z profilem i nawigacją po lewej, dużym banerem gry, niewielkimi kartami katalogu i znajomymi po prawej. Używamy własnych nazw, logo i grafik gier Zone. Wszystkie istniejące funkcje i dane pozostają dostępne. Nowy instalator 0.1.14 jest wersją do sprawdzenia; osobne wydania gier i ich publiczne zasoby pozostają bez zmian.

Sprawdzić wygląd przy 1440 × 900, 1024 × 720 i 920 × 650, wyszukiwanie, pełną nawigację, PL/EN, posiadane motywy oraz aktualizację instalatora z zachowaniem sesji i istniejących gier. Przed publikacją korzystać z wyników bieżącej gałęzi, zamiast ponownie wydawać starsze pakiety gier.

Opis i tagi Haunt w publicznym katalogu zostały uaktualnione do 3D, 20 map i 21 narzędzi. Cena 500 ZC, konfiguracja pakietu i zakupione licencje pozostały bez zmian.


## Preview 0.1.15 — compact catalog and Zone Football

The Hub uses a single set of cover tiles (three columns on wide screens, two on smaller screens), with captions and actions below the artwork. Search, library actions, the real wallet and all existing navigation remain. Favorites are local and persist across refresh/restart. Appearance preferences add validated custom accent colours, compact/comfortable density, a hideable friends rail, reduced motion, contrast and background glow. Purchased themes remain independently owned. Existing per-game fullscreen preferences are preserved.

Zone Football 0.1.0 is an experimental standalone entry bundled in this preview Hub. It opens in its own sandboxed window, receives the authenticated Hub session through a restricted preload, and reuses the shipped football rules/bots/referee/replay. It has its own locker-room screen, branding, settings and storage namespace. Multiplayer rooms use `zf-` instead of `sz-`. Free kicks, penalties, protected goalkeepers, passes, tackles and ten-goal matches stay intact. It does not modify the Strike Zone mode, read/write cloud game saves, spend or reward ZC, or publish a new game to the public catalog. Its standalone HTML can also be tested offline with bots; online authentication comes from Zone Hub.

Checks include the full native Hub suite, persisted appearance/favorites, actual Hub-to-Football SSO, original football rule checks, a full bot match to ten goals, and two real clients sharing a match through the pinned SDK/local Phoenix fixture. No schema or production account changes are part of this preview.


## Kontynuacja 1 listopada 2026 — Hub 0.1.16

Bieżąca gałąź: `feature/stadiums-zombie-chat`, na bazie podglądu Huba 0.1.15. Użytkownik zaakceptował wygląd i zlecił rozwój Football, osobną grę Zombie, naprawę rynku oraz czat z GIF/emoji. Następnie polecił usunąć Piłkę Nożną i Zombie ze Strike Zone 2D oraz ich opcje tworzenia map w Warsztacie; to zastępuje wcześniejsze zachowanie starych trybów.

- Football 0.1.1: Zone Arena, Neon Harbour i Forest Park; sekwencja wejścia, powitanie i rozstawienie drużyn, widownie i drużynowe konfetti. Zasady piłki, faule, chronieni bramkarze, mecze do 10 goli i multiplayer pozostają. Boty omijają zawodników blokujących im drogę.
- Zone Zombie 0.1.0 ma własne menu, zapis i okno Huba. Cztery tryby i po dwie mapy: Survival (Dead Mall, Rotten Village), Objectives (Outbreak Lab, Blackout Station), Survive Rounds (Ashfall Foundry, Quarantine Yard) i Zombie Escape (Harbour Run, Last Metro). Infekcja korzysta z zasad Strike; zamrażanie używa wspólnego modułu. Jest gra z botami i do czterech klientów przez osobne kanały `zz-`; host symuluje mecz, klienci wysyłają sterowanie. Podgląd nie używa zapisów ani portfela pozostałych gier.
- Rynek: zmieniona funkcja przeglądania zwraca `own_listings` niezależnie od filtrów/stronicowania. Wycofanie korzysta z istniejącej atomowej procedury zwrotu. Wyceny 1641 przedmiotów pochodzą z `itemValue`, jak w ekwipunku; boty mogą kupować oferty do 110% wyceny, wybierają różne przedziały wartości i zachowują budżet 250000 ZC dziennie. Migracja `zonehub_market_withdraw_and_fair_prices` została zastosowana w projekcie Supabase Strike Zone 2D. Istniejący łańcuch RPC portfela pozostał zachowany.
- Czat zachowuje dotychczasowy protokół tekstowych wiadomości i potwierdzenia odczytu. Emoji są Unicode; GIF-y są walidowanymi linkami do GIPHY/Tenor. Nie wprowadzono nowej usługi płatnej ani kluczy API. Linki spoza listy hostów nie są osadzane, a wstrzymanie animacji respektuje preferencje odbiorcy.
- Stare projekty map graczy nie zostały skasowane. W Strike nie można wybrać usuniętych trybów ani stworzyć dla nich nowej mapy z interfejsu.

Wydania publiczne Haunt 0.1.15 i Royale 0.1.9 pozostają punktami wyjścia. Zmiany gier/Huba mają status podglądu, dopóki nie zostaną osobno opublikowane.


## Ultimate Team — 1 listopada 2026, Hub 0.1.17 / Football 0.2.0

Bieżąca gałąź: `feature/football-ultimate-club`, baza `f39a2a617b5079a223cb14ff8a8bede476cd2aa8`. Własny silnik, renderowanie i klub w `game/football-ultimate/`; stary tryb 5v5 pozostaje w osobnym menu.

- Silnik hosta: 22 zawodników, kontrola 10 z pola na drużynę, keeper AI, 2x45 wirtualnych minut, przerwy na żądanie przy zatrzymaniu i 5 zmian, połowa ze zmianą stron. Zegar nie biegnie podczas przerw, VAR i wznowień.
- Sędzia główny i dwaj asystenci, aut/rożny/rzut od bramki/wolny/karny, spalony zapamiętany w chwili podania i odgwizdany przy zaangażowaniu zawodnika, VAR oparty na zapisanych odległościach/kontakcie i goal-line wymagający przekroczenia linii przez całą piłkę. Reguły są uproszczoną własną symulacją 2D.
- 180 fikcyjnych piłkarzy, 18 kart startowych, formacje 4-3-3/4-4-2/3-5-2, rezerwy i ławka. Paczki: Kickoff 75 ZC (85/14/1/0%), Rising Stars 200 ZC (0/85/14/1%), Elite Nights 500 ZC (0/0/94/6%); po 3 niezależne losowania, możliwe duplikaty.
- Katalog gry kosztuje 50 ZC. `public.zone_football` jest fasadą invoker; prywatna procedura wymaga zakupu gry, blokuje portfel, losuje karty na serwerze i zapisuje nonce idempotencji. Tabele są prywatne, RLS i odebrane bezpośrednie uprawnienia. Nowy łańcuch `zone_hub -> football_hub_command -> haunt_economy_command -> wallet_hub_command` zachowuje Haunt i całą dotychczasową ekonomię.
- Ligi Zone/Premier po 7 kolejek (8 klubów), puchary Zone/Neon po 3 etapy i sparing. Pucharowy remis daje powtórkę. Wyniki są osobistą historią, bez nagród pieniężnych/kart ani globalnego rankingu.
- Online: prywatne lobby dwóch graczy, serwer przydziela użytkowników i składy oraz losowy topic `zfu-<uuid>`. Host symuluje, gość wysyła sterowanie. Nie jest to dedykowany serwer meczu ani publiczny matchmaking. Wyniki nie służą rozliczaniu ekonomii.
- Football jest wbudowany w Hub i aktualizowany z nim. Start gry i zakupy wymagają zalogowania/własności; plik HTML jest demonstracją offline bez prawdziwego portfela i zakupów. Preload dopuszcza tylko zamkniętą listę operacji klubu.
- Testy: `tests/zone-football-engine.test.cjs`, `tests/zone-football-economy.test.cjs`, `scripts/football-ultimate-smoke.cjs`; ostatni uruchamia dwa prawdziwe klienty przypiętego SDK z lokalną bazą i brokerem. Test Huba obejmuje zakup gry za 50 ZC oraz uruchomienie z sesją. Zachować dotychczasowe testy 5v5, Zombie, czatu/rynku i usunięcia trybów Strike.
