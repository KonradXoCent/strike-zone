# Blokada drużyn i kompaktowy interfejs meczu

Wybór CT/T/obserwatora odbywa się przed meczem. Po rozpoczęciu meczu przyciski zmiany drużyny są ukryte, API lokalne odmawia zmiany, a host odrzuca wiadomości `team` i próbę przejścia aktywnego gracza na obserwatora przez `hello`. Automatyczna infekcja, konwersja znalezionego propa i rotacja ról między rundami pozostają zasadami symulacji, a nie ręczną zmianą drużyny.

Boty Prop Hunt oceniają anonimowe, rzeczywiście widoczne obserwacje. Pojedynczy przedmiot innego typu przy grupie co najmniej dwóch zgodnych przedmiotów zwiększa priorytet sprawdzenia. Pasujący prop nie otrzymuje tej premii. Podejrzenie nie jest dowodem: bot czeka, przestrzega zasięgu, widoczności, amunicji i kary za trafienie dekoracji. Ocena nie czyta identyfikatorów graczy ani ukrytych obiektów. Pozostają reakcje na zauważony ruch oraz normalne losowe kontrole.

`shared/match-presentation.js/.css` zastępują duże tablice canvas kompaktową tabelą DOM. Prop Hunt zachowuje anonimowość współukrywających się, role i statystyki łapania. Zombie ma osobną paletę i nazwy drużyn. CTF pokazuje zdobyte flagi; DM/BR mają wspólną listę z przewijaniem. Piłka i minigry zachowują tabelę `SzArcadeUI` oraz autorytatywne gole, asysty, podania i obrony, ze zmniejszonym układem. Killfeed ma maksymalnie cztery wpisy, respektuje ustawienie widoczności i działa także u obserwatora. Odświeżanie DOM ograniczono do 10 Hz, a nie każdej klatki.

Walidacja:

- `npm test`: 201 testów.
- `npm run test:match-presentation`: 17 trybów, blokada drużyn, PL/EN, 1440/800/400 px, limity feedu, anonimowość i opóźniona kontrola nieruchomego nietypowego propa.
- `node scripts/prop-hunt-smoke.cjs`: symulacje botów na trzech mapach, kolizje, widoczność, przemiany i wyniki.
- `node scripts/spectator-smoke.cjs`: obserwatorzy, wszystkie tryby, brak nagród i odmowa zmiany drużyny.
- `node scripts/arcade-presentation-smoke.cjs`: HUD, wyniki i replaye piłki, minigier i zombie.
- `node scripts/network-smoke.cjs`: dwa klienty z dostarczonym SDK, lokalny transport Phoenix, 17 trybów przez kod lobby i 17 przez listę serwerów. Konta, baza i zapisy produkcyjne nie są modyfikowane. Nie jest to pomiar opóźnień przez publiczny Internet.

To zmiany do testowego podglądu, bez publikacji nowego wydania i bez zmian schematu bazy.
