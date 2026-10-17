# Strike Zone 2D

Gra na Windows z launcherem, kontem Supabase i obowiązkowymi aktualizacjami.

**[Pobierz aktualne wydanie](https://github.com/KonradXoCent/strike-zone/releases/latest)**

Wersja **1.2.0**: zainstaluj `StrikeZone-Setup-1.2.0.exe` lub zaktualizuj wersję
1.0.1 lub 1.1.0 przez launcher.

Nowe modele i skiny noży, widoczne rękawiczki, Kill Cam, kontrakty, upgrader,
ulepszony Overwatch i Battle Royale oraz nowe animacje skrzynek i ekrany map.
Szczegóły: [RELEASE_NOTES.md](RELEASE_NOTES.md).

Zaloguj się w launcherze na swoje dotychczasowe konto gry lub wybierz rejestrację.
Nowe konto wymaga potwierdzenia adresu e-mail. W launcherze zobaczysz swój nick,
awatar oraz przycisk wylogowania. Gra otworzy się na tym samym koncie.

Launcher dopasowuje rozmiar do ekranu. W menu gry klawisz Escape pyta o zamknięcie
gry i powrót do launchera: zielone „Nie” po lewej, czerwone „Tak” po prawej.
Podczas meczu Escape nadal włącza pauzę.

Dane lokalne pozostają w `%APPDATA%\StrikeZone2D`. Sesja konta jest szyfrowana
przez system Windows. Hasło nie jest zapisywane. Konta i chmura korzystają
z Supabase wskazanego w `game-source/index.html`; bez migracji bazy.

GitHub Actions buduje wydanie, instaluje wcześniejszą publiczną 1.1.0 i sprawdza
aktualizację do 1.2.0, zachowanie danych, logowanie, rejestrację, profil, wspólną
sesję gry oraz wyjście przez Escape. Raport `update-smoke-report.json` jest
w wydaniu. Testy kont używają odizolowanych odpowiedzi HTTP, bez zmian prawdziwych kont.

Szczegóły budowania i kolejnych wydań: [README_PL.md](README_PL.md).
