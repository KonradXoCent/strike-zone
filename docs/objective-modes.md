# Dominacja, Napad i Przetrwanie falowe

Trzy tryby mają dziewięć osobnych aren, własne HUD-y, kolumny wyników i PL/EN. Wybór trybu otwiera głosowanie na jego trzy mapy. Lobby i lista serwerów korzystają z tych samych map.

| Tryb | Mapy | Zasady |
|---|---|---|
| Dominacja | dom_forest_outpost, dom_desert_ruins, dom_freight_yard | Punkty A/B/C. Przejęcie trwa 6 s przez jedną osobę, przewaga liczebna przyspiesza je do 3×. Obecność obu drużyn zatrzymuje postęp. Każdy utrzymany punkt daje 1 punkt co 2 s. Limit 250 punktów lub 7 minut. Zabójstwa nie podbijają wyniku drużyny. |
| Napad | heist_city_bank, heist_harbor, heist_sand_fort | T kradną trzy torby ze skarbca CT. Podniesienie przez bliskość: 1 s; ewakuacja w strefie T: 3 s bez obrońcy w strefie. Noszący łup porusza się z prędkością 82%. Śmierć upuszcza torbę. CT odzyskuje ją w 2 s; porzucona wraca sama po 30 s. T wygrywa po trzech dostarczeniach, CT po 6 minutach. Odrodzenia po 5 s. |
| Przetrwanie falowe | survival_frozen_station, survival_reactor, survival_swamp_camp | Kooperacja do 5 ludzi w CT, pozostałe miejsca wypełniają boty. T to wyłącznie przeciwnicy sterowani przez hosta. 10 fal; od 8 do 26 przeciwników na falę, najwyżej 5 jednocześnie. Rosną HP, pancerz i uzbrojenie. Zakupy przed pierwszą falą i między falami pod B. Polegli wracają między falami; śmierć całej drużyny kończy mecz. |

Dominacja i Napad zapewniają karabin, pistolet, pancerz i granaty przy odrodzeniu; sklepu nie można używać w tych trybach. Istniejące skiny i liczniki zabójstw używają dotychczasowej ścieżki broni. Wspólna symulacja obsługuje strzały, granaty, kolizje i nawigację. Ogień sojuszniczy jest wyłączony w trzech nowych trybach.

Boty przemieszczają się do celów również podczas kontaktu z przeciwnikiem, zachowując kierunek celowania niezależny od ruchu. W Napadzie uciekają z torbą, eskortują noszącego i odzyskują łup po stronie obrońców. W Przetrwaniu współpracujący bot broni pozycji, a przeciwnicy szukają dojścia do ocalałych.

Host oblicza wszystkie przejęcia, łup, odrodzenia, fale i wyniki. Snapshot przenosi wyłącznie stan hosta i statystyki celu; klient nie może narzucić punktów ani ukończenia fali. Nagroda za zakończenie meczu jest naliczana raz, a obserwator jej nie otrzymuje. Pozostaje blokada ręcznej zmiany drużyny w meczu. Nie ma zmian schematu ani zapisów administracyjnych w bazie.

Mapy instalują się w stabilnych slotach 22–30, po istniejących arenach i Halloween. Rezerwacja edytora zaczyna się od 31; starsze identyfikatory map nie zmieniają się. Geometrię i materiały wypieka dotychczasowy renderer, a nie osobny silnik. Dodatkowy HUD odświeża się co 100 ms.

Walidacja: 206 testów jednostkowych/bazy, drożność celów na wszystkich dziewięciu mapach, symulacje botów na dziewięciu arenach, przejęcie/spór/neutralizacja, przenoszenie/upuszczenie/odzyskanie/ewakuacja, 10 fal i zakupy między nimi, pojedyncze nagrody oraz obserwatorzy. Dwa klienty z dostarczonym SDK sprawdzają nowe tryby przez kod lobby i listę serwerów z lokalnym transportem Phoenix, odrzucenie fałszywego snapshotu oraz blokadę drużyn. HUD i tabela są sprawdzone w PL/EN na ekranach 1440, 800 i 400 px. To nie jest pomiar publicznego łącza internetowego.

Zmiany są w podglądzie testowym, bez nowego publicznego wydania.
