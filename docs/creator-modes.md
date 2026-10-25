# Edytor według trybu

Przed nową mapą gracz wybiera TDM, tryb bombowy, CTF, football, zombie lub prophunt. Ostatnie trzy mają kontekstowe narzędzia i walidację, bez niepotrzebnych bombsite’ów. Zapisane projekty zachowują tryb.

Football ma stałe bramki, edytowalne spawny drużyn i geometrię boiska. Projekt 1536×1024 jest przeliczany na arenę 1280×832; kolizje i wygląd przeszkód korzystają z tej samej mapy. Zombie ma spawny ludzi i zombie. Prop Hunt pozwala rozstawiać 11 typów propów, wymaga minimum 24 przedmiotów, dwóch typów i dziesięciu dostępnych kryjówek dla botów.

Tryby są zachowane przy zgłoszeniu, moderacji i publikacji map Warsztatu. Migracja 20261025004758_workshop_mode_specific_creator rozszerza istniejącą walidację i ograniczenia trybów. Została zastosowana do połączonego projektu Supabase. Nie tworzy zgłoszeń ani ocen w imieniu użytkowników.

Trzy mapy Dominacji mają teraz 2304×1536, punkty oddalone o 512 jednostek oraz przesłony rozdzielające sektory.

Walidacja: 213 testów jednostkowych/bazy; edytor, zapis/odczyt, undo/redo, szablony i testy z botami; nowe zatwierdzone mapy w dwóch klientach przez kod lobby i listę serwerów z lokalnym transportem Phoenix; regresja istniejących map Warsztatu i piłki. To nie jest pomiar publicznego połączenia internetowego.
