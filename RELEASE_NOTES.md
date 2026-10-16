Strike Zone 2D 1.1.0 — konto w launcherze

- Logowanie istniejącym kontem gry i rejestracja bezpośrednio w launcherze.
- Obsługa potwierdzenia adresu e-mail przy rejestracji.
- Awatar, nick i przycisk wylogowania w launcherze.
- Jedna sesja konta: gra uruchamia się na koncie zalogowanym w launcherze.
- Usunięte oddzielne przyciski logowania, rejestracji i wylogowania z gry.
- Sesja launchera zapisywana z szyfrowaniem systemu Windows; hasło nie jest zapisywane.
- Mniejszy launcher dopasowany do obszaru roboczego ekranu i układ na małe okna.
- Escape w menu głównym: potwierdzenie zamknięcia gry i powrotu do launchera.
- Zielone „Nie” po lewej, czerwone „Tak” po prawej; zapis postępu przed zamknięciem.
- Escape podczas meczu nadal otwiera pauzę.

Konta, zapis gry i dotychczasowy projekt Supabase pozostają zgodne. Nowe konta
w tym projekcie wymagają potwierdzenia adresu e-mail przed pierwszym logowaniem.
Nick i awatar nadal można zmieniać w zakładce Profile w grze.

Posiadacze wersji 1.0.1 otrzymają wymaganą aktualizację w launcherze.
Nowa instalacja: StrikeZone-Setup-1.1.0.exe.
Raport testu aktualizacji 1.0.1 → 1.1.0 na Windows: update-smoke-report.json.
Test logowania używa odizolowanych odpowiedzi Supabase i nie zmienia prawdziwych kont.
