# Warsztat społecznościowy

Nowa wersja klienta obsługuje zgłoszenia map i skinów, moderację oraz wspólny katalog
zatwierdzonych projektów. Katalog aktualizuje się przez Supabase REST; nie wymaga
działającego WebSocket ani nowego instalatora po każdym zatwierdzeniu projektu.
Gracze muszą jednak najpierw otrzymać klienta zawierającego tę funkcję.

## Przepływ gracza i właściciela

1. Autor przygotowuje projekt w lokalnym edytorze i wybiera „Wyślij do oceny”.
2. Wysłana kopia jest niezmienna. Autor widzi własne zgłoszenie i jego status.
3. Właściciel otwiera Moderację, ogląda projekt i może przetestować mapę z botami.
4. Zatwierdzenie atomowo publikuje wersję; odrzucenie wymaga wiadomości dla autora.
5. Autor może poprawić szkic i przesłać kolejną wersję. Publikacja aktualizacji
   zachowuje identyfikator projektu, dodając nowy identyfikator wydania i numer wersji.

Test zgłoszenia nie daje nagród i nie publikuje projektu. Katalog zawiera wyłącznie
zatwierdzone wydania. Właściciel może wycofać pozycję z katalogu; wyposażony skin
znika po odświeżeniu, także gdy jego rysunek pozostaje w pamięci klienta.

## Baza

Projekt: `mvzlqpccmjslxdajjbfw`. Wdrożono migracje:

- `20261017172626 community_workshop`
- `20261017173831 community_workshop_limits`
- `20261017184015 community_forge_case`

`database/workshop.sql` oraz `database/community-case.sql` opisują schemat dla nowej instalacji. Nie należy
uruchamiać całego pliku ponownie na już skonfigurowanym projekcie. Istniejące
`saves`, `friends`, `leaderboard` i `servers` zachowują schemat. Zakup skrzynki
aktualizuje wyłącznie portfel bieżącego profilu w istniejącym zapisie konta.

| Obiekt | Dostęp klienta |
| --- | --- |
| `sz_workshop_admins` | Tylko odczyt własnego wpisu, bez możliwości nadania sobie roli |
| `sz_workshop_submissions` | Autor widzi swoje kopie; moderator widzi kolejkę; nowe kopie tylko jako oczekujące |
| `sz_workshop_items` | Odczyt aktywnych pozycji, bez publicznego dostępu do identyfikatora właściciela |
| `sz_workshop_releases` | Odczyt niezmiennych zatwierdzonych wydań aktywnych pozycji |
| `sz_workshop_catalog` | Widok `security_invoker` z metadanymi najnowszych wydań |
| `sz_workshop_private.owner_invite` | Brak dostępu klienta; wyłącznie obsługa jednorazowego kodu po stronie serwera |

Publiczne RPC są `security_invoker`. Operacje uprzywilejowane mają implementacje
w nieeksponowanym schemacie, ze stałym `search_path`, jawną kontrolą `auth.uid()`
i listy moderatorów. Sfałszowanie lokalnej flagi admina lub metadanych użytkownika
nie pozwala zatwierdzić zgłoszenia. Klient używa dotychczasowego klucza publicznego.

Właściciel ma już rolę przypisaną bezpośrednio do UUID wskazanego konta.
Nie ma przycisku ani formularza kodu właściciela. Wcześniejszy jednorazowy kod
został unieważniony w bazie. Mechanizm początkowej aktywacji pozostaje w schemacie,
ale nie jest potrzebny do korzystania z panelu ani dostępny w interfejsie gry.

Zgłoszenia mają limit 10 oczekujących i 10 wysłanych w ciągu 24 godzin na konto.
Blokada transakcyjna chroni limit przed równoległym wysyłaniem. Dane projektu
przechodzą walidację także w PostgreSQL: typy, kolory, pędzel, limity elementów,
rozmiar danych i przejścia mapy z rozmiarem postaci. Maksymalny rozmiar to 250 KB.

## Rozgrywka i skiny

Szkice używają lokalnego slotu testowego. Zatwierdzone mapy otrzymują osobne sloty,
ale przez sieć identyfikowane są po UUID wydania. Dołączający gracz pobiera wydanie
z zatwierdzonego katalogu, a nie dowolny payload przesłany przez hosta.
Poprzednie zatwierdzone wersje są dostępne podczas trwających na nich meczów.
Nowe mapy warsztatowe są nierankingowe i obsługują TDM, CTF oraz rozbrajanie bomby.

Zatwierdzone skiny trafiają do Community Forge Case. Minimum zakupu to 5 różnych
aktywnych projektów skinów; rewizje, oczekujące zgłoszenia i mapy nie zwiększają
licznika. Cena to 2500$ z gry, bez klucza. Pula jest dynamiczna, obejmuje najnowszą
zatwierdzoną wersję każdego projektu, z równą szansą na każdy projekt i 10% szans
na StatTrak. Już kupioną skrzynkę można otworzyć przy mniejszej niepustej puli;
przy pustej puli pozostaje w posiadaniu gracza.

`database/community-case.sql` dodaje tabele `sz_workshop_cases` i
`sz_workshop_owned_skins`. Obie mają RLS i wyłącznie odczyt własnych rekordów;
klient nie może dopisać sobie skrzynki, podmienić nagrody ani nadać StatTrak.
Zakup działa przez publiczne RPC `security_invoker` z prywatną implementacją.
Sprawdza konto, próg, bieżący profil, timestamp i stan portfela; blokuje zapis
konta i atomowo odejmuje cenę oraz tworzy skrzynkę. UUID żądania jest kluczem
idempotencji. Ponowienie nie pobiera ceny drugi raz. Klient kończy wcześniejsze
zapisy chmury, wysyła aktualny zapis i wstrzymuje kolejne na czas operacji.

Otwieranie blokuje wiersz posiadanej skrzynki. Nagroda jest losowana w bazie,
ma osobny UUID i kopię niezmiennego zatwierdzonego projektu. Kolejne otwarcie tej
samej skrzynki zwraca ten sam egzemplarz. Ponowienie animacji nie daje kolejnego
przedmiotu ani statystyki otwarcia. Nagrody są widoczne w osobnej kolekcji skinów
społecznościowych w zakładce Weapon skins i nie są częścią ekonomii sprzedaży,
wymian, kontraktów czy upgradera.

Wyposażenie wymaga własnego egzemplarza odczytanego z bazy; stare darmowe wpisy
loadoutu nie działają. Dotyczy to także własnych szkiców: można je oglądać
w edytorze, zapisywać i zgłaszać, lecz nie zakładać bez zdobycia przedmiotu.
StatTrak liczy zabójstwa osobno dla UUID egzemplarza i zapisuje licznik wraz
z kontem. Zwykłe warianty nie naliczają StatTrak. Przez sieć wysyłane są UUID
przedmiotu oraz wydania; odbiorca weryfikuje pojedynczy egzemplarz przez RPC
`sz_workshop_skin_proof`, porównuje właściciela z uczestnikiem lobby i pobiera
zatwierdzone wydanie. Pełne ekwipunki pozostają prywatne. Cache i budżet 40 nowych
weryfikacji na minutę ograniczają liczbę odczytów. Wycofany projekt nie może być
wyposażony, ale zdobyty egzemplarz pozostaje w kolekcji.

Samodzielny HTML ma tę samą ochronę odczytu konta przed zapisem co klient desktopowy.
Pierwsze zalogowanie odczytuje zapis z chmury, nawet gdy lokalny profil ma nowszy
timestamp. Błąd odczytu blokuje wysyłanie danych, a zmiana konta nie przenosi
ekwipunku poprzedniego użytkownika.

`scripts/prepare-preview.cjs` tworzy samodzielny HTML z lokalnie osadzonym SDK
i modułem `preview-account.js`. Formularz logowania oraz widoczny pasek sesji
występują wyłącznie w tym pliku testowym. Po zalogowaniu właściciel przechodzi
bezpośrednio do Moderacji, a zwykły gracz do Moich zgłoszeń. Hasło znika z pola
po próbie logowania. Publiczny klient otrzymuje sesję z launchera i nie dołącza
modułu testowego. Żaden nick, e-mail, UUID właściciela ani kod dostępu nie jest
wpisany w kliencie jako reguła nadawania uprawnień.

Start podglądu nie zależy od odpowiedzi `/auth/v1/health`: klient powstaje
natychmiast po wykonaniu modułów. SDK jest zwykłym skryptem osadzonym w HTML,
z jawnym fallbackiem publicPath w przypiętej paczce UMD dla opcjonalnych chunków;
nie używa adresu skryptu `data:`. Operacje sieciowe przerywa AbortController
po 12 sekundach. Formularz odblokowuje się po błędzie i pozwala ponowić próbę.
Odczyty bazy w reakcji na zmianę sesji są odroczone poza callback Auth.

## Walidacja

- `npm test`: 88 testów, w tym kontrola uprawnień w rzeczywistym PostgreSQL/WASM
  (PGlite), nie tylko w atrapach odpowiedzi HTTP.
- `npm run test:creator`: edytory, zapis, import/eksport, nowe noże i StatTrak.
- `npm run test:community`: trzy odizolowane konta, rola właściciela, prywatność
  zgłoszenia, test mapy, zatwierdzenie, odrzucenie, poprawka, publikacja do innego
  gracza, renderowanie skina i prawdziwe zabójstwo StatTrak. Dwa klienty dołączają
  do tej samej zatwierdzonej mapy pod różnymi lokalnymi numerami i widzą swoje skiny.
- `npm run test:gameplay`: dotychczasowe 14 trybów, sieć, mapy, CTF i ekonomia.
- `npm run maps:check`, `npm run prepare:game`: zgodność map i paczki gry.
- `npm run test:preview`: rzeczywisty osadzony SDK, testowe odpowiedzi Auth oraz
  REST z regułami PostgreSQL; błędne hasło, poprawne logowanie, odczyt przed zapisem,
  zgłoszenie mapy, moderacja bez kodu, publikacja do autora i zmiana konta.
  Osobny klient desktopowy otrzymuje sesję z mostka launchera i nie pokazuje
  formularza logowania ani modułu podglądu. Test nie kontaktuje się z produkcją.
  Dodatkowo blokuje skrypty `data:` przez CSP i zwraca błąd health endpointu;
  brak odpowiedzi żądania Auth prowadzi do przerwania, a awaria sieci do ponowienia
  bez przeładowania strony. Obejmuje próg 4/5 i 5/5, zakup z portfela, animację,
  własny egzemplarz, wyposażenie oraz odczyt po przeładowaniu.
- Live REST i gotowy samodzielny HTML: publiczny katalog odpowiada; anonim nie
  odczytuje zgłoszeń ani ról. HTML ma osadzony SDK i formularz logowania; anonimowe
  przeglądanie katalogu nie wysyła zapisów konta ani zgłoszeń.
  Nie utworzono testowych kont ani nie opublikowano testowych projektów w produkcji.

Sprawdzenie Supabase Advisors nie zgłasza problemów dotyczących nowych obiektów
Warsztatu. Pozostałe alerty projektu dotyczą funkcji platformowej `rls_auto_enable`
oraz wyłączonej ochrony haseł z wycieków; nie zmieniano ich w tej funkcji:
[uprawnienia funkcji](https://supabase.com/docs/guides/database/functions#function-privileges),
[ochrona haseł](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
