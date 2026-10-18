# Strike Zone 2D

Gra na Windows z launcherem, kontem Supabase i obowiązkowymi aktualizacjami.

**[Pobierz aktualne wydanie](https://github.com/KonradXoCent/strike-zone/releases/latest)**

Wersja **1.5.0**: zainstaluj `StrikeZone-Setup-1.5.0.exe` lub zaktualizuj wersję
1.0.1, 1.1.0, 1.2.0, 1.3.0, 1.4.0 lub 1.4.1 przez launcher — razem z samym launcherem.

Nowości 1.5.0: wyszukiwanie skinów i filtry typów broni, ze wszystkimi modelami
noży w jednej kategorii. Odświeżona przepustka, lobby z drużynami i kodem
zaproszenia, osobne ikony trybów, podglądy układów map oraz pełne tłumaczenia
nagłówków wyboru trybu i głosowania PL/EN.

Wersja 1.4.1 wprowadza wspólne logo złotej tarczy Z w launcherze, grze i ikonach
Windows. Wszystkie warianty korzystają z tego samego obrazu na przezroczystym tle.

Nowości 1.4.0: wspólny język PL/EN, motywy Nocny / Leśny / Piaskowy,
prywatne wiadomości i grupy do 16 osób, historia dla osób offline oraz
powiadomienia w launcherze i grze. Znajomi mają zdjęcia, nicki, status i przycisk
Trade; wymiana wymaga aktywnego połączenia obu graczy. Poprawiono też wspólne
mecze lobby, serwery i synchronizację bomby.

Mapy Warsztatu zapisują tryb autora i działają z botami oraz w lobby.
Mają liczniki zagrań i odwracalne polubienia. Popularne mapy trafiają automatycznie
do głównej puli własnego trybu; domyślnie wymagają 50 zagrań i 10 polubień,
z jednym miejscem na tryb. Właściciel ustawia progi w Moderacji i ma nielimitowane
zgłoszenia map oraz skinów. Pozostali gracze zachowują limit 10 oczekujących
i 10 wysłanych w ciągu 24 godzin.

W przygotowywanej aktualizacji Moderacja pozwala również od razu zatwierdzić mapę
i dodać ją do głównej puli jej trybu bez progów społeczności. Właściciel może
wyłączać mapy z puli, podmieniać przypięte wersje oraz wycofywać skiny ze skrzynki
bez odbierania zdobytych egzemplarzy. Boty uczestniczące w meczu losowo oceniają
mapy, a ich statystyki są podpisane osobno. `npm run test:moderation` sprawdza ten
przepływ w grze, a `npm run test:locale` kontroluje 70 ekranów PL/EN.

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
z Supabase wskazanego w `game-source/index.html`. Migracje w `supabase/migrations/`
dodają publiczne awatary, Warsztat i wiadomości, bez zastępowania istniejących kont
ani zapisów gry. Szczegóły: [docs/community-workshop.md](docs/community-workshop.md)
i [docs/settings-chat-network.md](docs/settings-chat-network.md).

GitHub Actions buduje wydanie, instaluje wcześniejszą publiczną 1.2.0 i sprawdza
aktualizację do 1.5.0, zachowanie danych, logowanie, rejestrację, profil, wspólną
sesję gry oraz wyjście przez Escape. Raport `update-smoke-report.json` jest
w wydaniu. Testy kont używają odizolowanych odpowiedzi HTTP, bez zmian prawdziwych kont.

Szczegóły budowania i kolejnych wydań: [README_PL.md](README_PL.md).
