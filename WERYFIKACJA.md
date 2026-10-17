# Weryfikacja 1.2.0

Testy jednostkowe: konta i komunikaty logowania, potwierdzenie e-maila, weryfikacja
sesji z serwerem, szyfrowane przechowywanie tokenów, rozmiar okna, synchronizacja
zapisu i wymagane aktualizacje.

Testy zaakceptowanego podglądu obejmowały wszystkie 12 map, nowe skiny,
kontrakty i upgrader z zapisem wyniku, Kill Cam, Overwatch, Battle Royale,
animacje skrzynek, 36 lokalnych wymian nowych noży oraz chwyty broni i widoczność rękawiczek.

Lokalny test Electron: pełny formularz konta, istniejący nick i awatar, ta sama
sesja w grze, odczyt zapisu, brak osobnych przycisków konta w grze, wylogowanie,
rejestracja, izolacja dwóch kont, Escape oraz układ 900, 760 i 680 px.
Wersja produkcyjna zachowuje posiadany ekwipunek, odmawia wyposażenia
nieposiadanego skina i zapisuje wynik otwarcia skrzynki oraz zoom w zapisie konta.

Test Windows zainstalowanego wydania: publiczna aktualizacja 1.1.0 do 1.2.0 oraz
te same scenariusze konta i wyjścia. Wynik workflow i status w raporcie
update-smoke-report.json stanowią końcowy wynik testu Windows.

Prawdziwy Supabase: potwierdzono HTTP 200 endpointów health i settings,
włączony e-mail, dostępną rejestrację i wymagane potwierdzenie e-maila.
Nie tworzono kont testowych w produkcji, nie odczytywano danych graczy
ani nie wykonywano migracji bazy. Test konta jest odizolowany od produkcji.
