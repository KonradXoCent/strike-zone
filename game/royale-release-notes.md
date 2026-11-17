Zone Royale 0.1.11

- Rozbudowana Frontier Island: 14 miejscówek zamiast 6. Nowe lokacje to Zachodnia Zajezdnia, Osada nad Kanałem, Posterunek Rzeczny, Giełda Portowa, Zakład Miedziowy, Kamieniołom Czerwonej Skały, Obozowisko Szeptów i Południowe Obserwatorium.
- Łącznie 26 budynków z dostępnymi wnętrzami oraz 32 dodatkowe osłony. Nowe punkty lądowania mają łupy, skrzynie z zaopatrzeniem i własny wygląd. Sześć dotychczasowych vanów odrodzenia pozostaje dostępnych.
- Zachowane formaty solo/duo/trio/squad, ranking, dobieranie ekipy, boty, strefy, trzy bronie i kilof oraz karty odrodzenia.
- Kolejka oddziela różne wersje wyspy, a lobby informuje o konieczności aktualizacji u członków ekipy. Trwające mecze starszej wersji zachowują własne reguły i geometrię.

Zmiany techniczne 0.1.11:
- Pakiet Windows obsługuje uwierzytelniony kanał loopback TCP z Zone Hub. Handoff sesji nie używa standardowych uchwytów stdin/stdout, które mogą być niedostępne dla okienkowych procesów Windows w Wine.
- Kanał jest ograniczony do 127.0.0.1 i korzysta z jednorazowego, losowego potwierdzenia; token konta nie trafia do argumentów procesu.
- Aktualizacja jest dostępna w bibliotece Zone Hub bez ponownego instalowania platformy. Cała ekipa powinna zaktualizować Zone Royale przed wspólną grą.
