# Strike Zone 2D

Gra na Windows z launcherem, kontem Supabase i obowiązkowymi aktualizacjami.

**[Pobierz aktualne wydanie](https://github.com/KonradXoCent/strike-zone/releases/latest)**

Wersja **1.3.0**: zainstaluj `StrikeZone-Setup-1.3.0.exe` lub zaktualizuj wersję
1.0.1, 1.1.0 lub 1.2.0 przez launcher — razem z samym launcherem.

Nowe modele i skiny noży, widoczne rękawiczki, Kill Cam, kontrakty, upgrader,
ulepszony Overwatch i Battle Royale oraz nowe animacje skrzynek i ekrany map.
Szczegóły: [RELEASE_NOTES.md](RELEASE_NOTES.md).

Zaloguj się w launcherze na swoje dotychczasowe konto gry lub wybierz rejestrację.
Nowe konto wymaga potwierdzenia adresu e-mail. W launcherze zobaczysz swój nick,
awatar oraz przycisk wylogowania. Gra otworzy się na tym samym koncie.

Launcher ma nowy panel konta i znajomych: okrągłe awatary,
zielone kropki online, szare offline, wyszukiwarkę oraz informację o meczu,
lobby lub launcherze. Lista jest wspólna z grą. Przy problemach z połączeniem
status jest oznaczany jako sprawdzany. `npm run dist:win:test` buduje osobny
instalator testowy w `dist-test/`, bez publikowania wydania.

Launcher dopasowuje rozmiar do ekranu. W menu gry klawisz Escape pyta o zamknięcie
gry i powrót do launchera: zielone „Nie” po lewej, czerwone „Tak” po prawej.
Podczas meczu Escape nadal włącza pauzę.

Dane lokalne pozostają w `%APPDATA%\StrikeZone2D`. Sesja konta jest szyfrowana
przez system Windows. Hasło nie jest zapisywane. Konta i chmura korzystają
z Supabase wskazanego w `game-source/index.html`. Migracja w `supabase/migrations/`
dodaje opcjonalny publiczny awatar do rankingu i ustawia limity Warsztatu 10/10;
nie zmienia kont ani zapisów gry.

GitHub Actions buduje wydanie, instaluje wcześniejszą publiczną 1.2.0 i sprawdza
aktualizację do 1.3.0, zachowanie danych, logowanie, rejestrację, profil, wspólną
sesję gry oraz wyjście przez Escape. Raport `update-smoke-report.json` jest
w wydaniu. Testy kont używają odizolowanych odpowiedzi HTTP, bez zmian prawdziwych kont.

Szczegóły budowania i kolejnych wydań: [README_PL.md](README_PL.md).
