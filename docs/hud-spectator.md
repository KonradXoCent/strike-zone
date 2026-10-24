# HUD i obserwatorzy

Interfejs meczu ma pasek zdrowia i pancerza, pieniądze, broń, amunicję,
granaty, wynik, czas i stan drużyn. W **Ustawienia → Kolor HUD** można wybrać
jeden z siedmiu kolorów albo własny kolor. Wybór zapisuje się w ustawieniach.

Przed meczem dostępne są CT, T i **Obserwator**. Rolę można też zmienić w
menu pauzy; w lobby znajduje się osobna lista obserwatorów. Boty pozostają
w CT/T i wypełniają wszystkie miejsca w symulacji. Obserwator nigdy nie jest
obiektem gracza na mapie. Zasady liczebności właściwe dla trybu pozostają:
np. retake ma 7 aktywnych zawodników, Prop Hunt zaczyna od 3/7, a BR ma 36.

Sterowanie obserwatorem:

| Sterowanie | Działanie |
| --- | --- |
| ← / →, LPM / PPM, spacja | Poprzedni / następny żywy zawodnik obu drużyn |
| Kliknięcie zawodnika w składzie | Obserwowanie tej osoby |
| 1–9, 0 | Wybór pierwszych dziesięciu miejsc składu |
| X | Włączenie / wyłączenie X-ray |
| M | Podgląd całej mapy / powrót do śledzenia zawodnika |
| Tab | Tabela wyników |
| Escape | Menu pauzy, zmiana drużyny lub powrót do menu |

Panel obserwatora pokazuje pełną minimapę, składy, HP, pancerz, broń,
pieniądze i K/D/A. Na dole są dane śledzonego zawodnika. X-ray pokazuje
oznaczenia zawodników mimo ścian i dymu. Po wyłączeniu X-ray kamera śledząca
respektuje zasłonięcie zawodników. Podgląd całej mapy i minimapa pokazują
wszystkie żywe osoby. X-ray nie jest dostępny dla aktywnego gracza.

W sieci host przechowuje obserwatorów osobno od aktorów i potwierdza rolę
w migawce. Obserwator nie zajmuje miejsca bota, nie wysyła sterowania,
nie kupuje ani nie głosuje na minigrę. Host odrzuca takie komendy. Zmiana
do CT/T przejmuje dostępnego bota bez leczenia, odradzania lub dodatkowego
miejsca. Dołączenie nie nalicza wcześniejszych zabójstw tego bota do konta.
Pasywne oglądanie nie przyznaje pieniędzy, XP, misji ani cukierków.

Sprawdzenie: `npm run test:spectator`, `npm run test:network`, `npm test`
i `npm run check:ui`. Test sieci używa dwóch klientów Electron, dostarczanego
SDK Supabase i lokalnego transportu Phoenix. Dane produkcyjnych kont i baz
nie są zmieniane. Wydajność i opóźnienia na rzeczywistych łączach zależą
od połączenia graczy i hosta.
