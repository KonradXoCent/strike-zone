# Zone Haunt 0.1.16 — zgodność z Wine i Zone Hub

Uaktualnienie wersji 0.1.14a zaakceptowanej po testach lokalnych.

- Pełna prezentacja 3D biura i śledztw, perspektywa pierwszej osoby oraz odświeżone wnętrza.
- 20 map, w tym Kościół św. Michała, przebudowany Kamping Szepczący Las i nowe dekoracje.
- Piwnice z przejściami wentylacyjnymi, poprawki kolizji, map, drzwi, szaf i wnętrza vana.
- Rozbudowane zachowania botów, oznaczanie pokoju ducha oraz rotacja wyposażenia.
- Poprawiona droga botów do dostępnych półek w vanie (punkt w zasięgu odbioru sprzętu): pomocnicy pobierają sprzęt, docierają do oznaczonego pokoju i zwracają pożyczony aparat po sfotografowaniu kości.
- Kulki reagujące na ruch (do trzech osobno rozstawianych), z migającymi diodami i poświatą.
- Pozytywka ruchowa, głośnik duchów, detektor ektoplazmy, mikrofon kierunkowy i sejsmograf.
- Nowe duchy, dowody, rejestrator dźwięku z odsłuchem, bonusy fotograficzne, mgliste otoczenie.
- Rozbudowany tryb obserwatora, ciała pozostające do końca śledztwa i upuszczanie sprzętu.
- Polski i angielski interfejs.
- Poprawiona komunikacja PlatformBridge podczas uruchamiania przez Wine: protokół Zone Hub korzysta ze stderr zamiast niedostępnego stdout, eliminując błąd EBADF. Wymagana jednakowa wersja klienta podczas rozgrywki wieloosobowej.
- Poprawiony aparat fotograficzny w vanie: pewny odbiór przedmiotu, odświeżanie zapasów i synchronizacja zdjęć między członkami ekipy.
- Poprawiona fizyka koszykówki w lobby 3D i kompletne testy wszystkich 20 map oraz 21 narzędzi.
- Usprawniony test multiplayera trzech klientów, w tym wejście do drugiej wyprawy bez rozdzielenia ekipy.

Wersja przeznaczona do aktualizacji w bibliotece Zone Hub. Publikacja wymaga przejścia testów pakietu Windows i zgodności z usługą online.

## Zmiany techniczne 0.1.16

- Przebudowany pakiet Windows zawiera aktualny most komunikacyjny Zone Hub, zgodny z uruchamianiem przez systemowe Wine i Wine z Flathuba.
- Aktualizacja jest dostarczana przez bibliotekę Zone Hub i nie wymaga ponownej instalacji launchera.

## Status wydania

Paczka Windows jest publikowana automatycznie przez GitHub Actions wyłącznie po przejściu testów multiplayer, renderowania 3D, instalacji oraz aktualizacji z Zone Hub.

Aktualizacja obejmuje wyłącznie grę Zone Haunt w bibliotece Zone Hub; nie zastępuje launchera ani plików innych gier.
