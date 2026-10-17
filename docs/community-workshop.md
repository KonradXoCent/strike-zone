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

`database/workshop.sql` opisuje aktualny schemat dla nowej instalacji. Nie należy
uruchamiać całego pliku ponownie na już skonfigurowanym projekcie. Istniejące
`saves`, `friends`, `leaderboard` i `servers` nie zostały zmienione.

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

Zgłoszenia mają limit 5 oczekujących i 10 wysłanych w ciągu 24 godzin na konto.
Blokada transakcyjna chroni limit przed równoległym wysyłaniem. Dane projektu
przechodzą walidację także w PostgreSQL: typy, kolory, pędzel, limity elementów,
rozmiar danych i przejścia mapy z rozmiarem postaci. Maksymalny rozmiar to 250 KB.

## Rozgrywka i skiny

Szkice używają lokalnego slotu testowego. Zatwierdzone mapy otrzymują osobne sloty,
ale przez sieć identyfikowane są po UUID wydania. Dołączający gracz pobiera wydanie
z zatwierdzonego katalogu, a nie dowolny payload przesłany przez hosta.
Poprzednie zatwierdzone wersje są dostępne podczas trwających na nich meczów.
Nowe mapy warsztatowe są nierankingowe i obsługują TDM, CTF oraz rozbrajanie bomby.

Skin społecznościowy jest osobnym wyglądem, poza `P().skins` i wyceną przedmiotów.
Wyposażenie oraz licznik zabójstw zapisują się w zwykłym zapisie konta.
Przez sieć przesyłane są tylko identyfikatory zatwierdzonych wydań; rysunki są
pobierane i walidowane po stronie odbiorcy. Lokalny szkic nie staje się przez to
publiczny. Wyposażenie skina z ekwipunku lub lokalnego szkicu usuwa poprzedni
wygląd społecznościowy dla tej broni.

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

## Walidacja

- `npm test`: 78 testów, w tym kontrola uprawnień w rzeczywistym PostgreSQL/WASM
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
- Live REST i gotowy samodzielny HTML: publiczny katalog odpowiada; anonim nie
  odczytuje zgłoszeń ani ról. HTML ma osadzony SDK i formularz logowania; anonimowe
  przeglądanie katalogu nie wysyła zapisów konta ani zgłoszeń.
  Nie utworzono testowych kont ani nie opublikowano testowych projektów w produkcji.

Sprawdzenie Supabase Advisors nie zgłasza problemów dotyczących nowych obiektów
Warsztatu. Pozostałe alerty projektu dotyczą funkcji platformowej `rls_auto_enable`
oraz wyłączonej ochrony haseł z wycieków; nie zmieniano ich w tej funkcji:
[uprawnienia funkcji](https://supabase.com/docs/guides/database/functions#function-privileges),
[ochrona haseł](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
