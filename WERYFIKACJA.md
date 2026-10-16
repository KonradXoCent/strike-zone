# Weryfikacja 1.1.0

Testy jednostkowe: konta i komunikaty logowania, potwierdzenie e-maila, weryfikacja
sesji z serwerem, szyfrowane przechowywanie tokenów, rozmiar okna, synchronizacja
zapisu i wymagane aktualizacje.

Lokalny test Electron: pełny formularz konta, istniejący nick i awatar, ta sama
sesja w grze, odczyt zapisu, brak osobnych przycisków konta w grze, wylogowanie,
rejestracja, izolacja dwóch kont, Escape oraz układ 900, 760 i 680 px.

Test Windows zainstalowanego wydania: publiczna aktualizacja 1.0.1 do 1.1.0 oraz
te same scenariusze konta i wyjścia. Wynik workflow i status w raporcie
update-smoke-report.json stanowią końcowy wynik testu Windows.

Prawdziwy Supabase: potwierdzono HTTP 200 endpointów health i settings,
włączony e-mail, dostępną rejestrację i wymagane potwierdzenie e-maila.
Nie tworzono kont testowych w produkcji, nie odczytywano danych graczy
ani nie wykonywano migracji bazy. Test konta jest odizolowany od produkcji.
