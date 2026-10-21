# Kody bonusowe

Pole **Kod bonusowy** jest w zakładce Profil oraz w panelu Halloween na stronie Graj. Wymaga zalogowanego konta i połączenia z chmurą. Każdy kod działa raz na konto Supabase, niezależnie od liczby profili.

**Tylko `HALLOWEEN` daje cukierki**: obecnie 80, do końca wydarzenia, czyli 30 listopada 2026 o 23:59 czasu polskiego. Pozostałe kody dają pieniądze, wybraną skrzynkę albo wybrany klucz. Baza blokuje utworzenie innego kodu na cukierki.

## Dodawanie kodu bez aktualizacji gry

Otwórz [Supabase Table Editor](https://supabase.com/dashboard/project/mvzlqpccmjslxdajjbfw/editor), wybierz schemat `public`, tabelę `bonus_codes` i dodaj wiersz:

| Pole | Znaczenie | Przykład |
| --- | --- | --- |
| `code` | 3–40 liter ASCII, cyfr, myślników lub podkreśleń; wielkość liter nie ma znaczenia. | `WELCOME2500` |
| `reward_type` | `money` — pieniądze, `case` — skrzynka, `key` — klucz. `candies` jest zarezerwowane dla `HALLOWEEN`. | `money` |
| `reward_amount` | Liczba dolarów albo liczba skrzynek/kluczy, od 1 do 1 000 000. | `2500` |
| `reward_item` | Dla `case` i `key`: identyfikator z tabeli poniżej. Dla pieniędzy i cukierków pozostaw `NULL`. | `alpha` |
| `active` | Włączenie lub wyłączenie kodu. | `true` |
| `starts_at` | Moment uruchomienia, domyślnie teraz. | pozostaw domyślną wartość |
| `expires_at` | Koniec dostępności; puste oznacza brak daty końcowej. | `2026-12-31 23:00:00+00` lub puste |
| `max_redemptions` | Opcjonalny łączny limit kont. | `100` lub puste |

Pola `id`, `normalized_code`, `used_count` i `created_at` uzupełnia baza. Nie zmieniaj ich ręcznie. Nowy kod działa przy następnym wpisaniu go w grze, bez wydawania nowej wersji.

### Typy skrzynek i kluczy

Każdy identyfikator działa zarówno z `case`, jak i `key`. Klucz pasuje do skrzynki o tym samym identyfikatorze.

| `reward_item` | Skrzynka |
| --- | --- |
| `alpha` | Alpha Case |
| `spectrum` | Spectrum Case |
| `dragon` | Dragon Case |
| `chroma` | Chroma Case |
| `prisma` | Prisma Case |
| `riptide` | Riptide Case |
| `gloves` | Glove Case |
| `music` | MVP Music Box |
| `drop` | BR Drop Crate |
| `supply` | BR Supply Crate |

Nagrody trafiają do portfela albo odpowiednich liczników w zwykłym ekwipunku. Skrzynki wydarzenia i serwerowe Community Forge Case mają osobne systemy otwierania i nie występują na tej liście.

Przykłady dla SQL Editor — uruchom tylko te, które chcesz udostępnić:

```sql
-- 2500 dolarów
insert into public.bonus_codes(code,reward_type,reward_amount)
values ('WELCOME2500','money',2500)
on conflict (normalized_code) do nothing;

-- 2 skrzynki Alpha
insert into public.bonus_codes(code,reward_type,reward_amount,reward_item)
values ('ALPHACASE','case',2,'alpha')
on conflict (normalized_code) do nothing;

-- 1 klucz do Glove Case
insert into public.bonus_codes(code,reward_type,reward_amount,reward_item)
values ('GLOVEKEY','key',1,'gloves')
on conflict (normalized_code) do nothing;
```

Jeśli kod o tej nazwie już istnieje, przykłady nie zmieniają jego ustawień. Istniejący kod edytuj w Table Editor. Nie używaj starego pola `reward_candies` — aktualne pola nagród to `reward_type`, `reward_amount` i `reward_item`.

Aby wycofać kod, ustaw `active=false`. Historia znajduje się w `bonus_code_redemptions`: konto, profil, nazwa kodu, typ, ilość, identyfikator przedmiotu i czas odbioru. Edycja kodu lub nagrody nie resetuje historii: konto, które już go wykorzystało, nie otrzyma ponownej nagrody.

## Zapis i dostęp

Transakcja blokuje definicję kodu i zapis konta, sprawdza datę, limit i aktualność zapisu, następnie jednocześnie przyznaje nagrodę, zapisuje dowód odbioru i zwiększa licznik użyć. Powtórzenie prośby zwraca aktualny zapis oraz pierwotny dowód odbioru, bez kolejnej nagrody. Błąd zapisu wycofuje całą operację.

Klient czeka na wcześniejsze zapisy i blokuje zmiany ekonomii podczas odbioru. Prośba jest zachowana lokalnie przed RPC. Po zerwaniu połączenia lub przeładowaniu klient ponawia ją, pobiera autoryzowany zapis konta i dopiero wtedy odblokowuje grę.

Tabele mają RLS. Gracz nie może czytać katalogu kodów, dopisywać nagród ani edytować historii. Może odczytać tylko własną historię. Publiczne RPC jest `SECURITY INVOKER`; prywatna funkcja ma pusty `search_path`, sprawdza `auth.uid()` i nie przyjmuje identyfikatora innego konta. Klient używa klucza publishable, bez klucza serwisowego.

Migracja `bonus_reward_types` zachowuje istniejące kody, zapisy i historię. Zastępuje pole `reward_candies` polami `reward_type`, `reward_amount` oraz `reward_item`.

## Testy

`tests/bonus-codes.test.cjs` sprawdza cztery typy nagród, ograniczenie cukierków, poprawność przedmiotów, migrację starej historii, powtórzenia, RLS, daty, limity, nieaktualny zapis i wycofanie błędnej transakcji. `scripts/seasonal-smoke.cjs` łączy prawdziwe SDK z izolowaną bazą PostgreSQL i sprawdza formularz PL/EN, nagrody dodane bez zmiany klienta oraz odzyskanie odpowiedzi po przeładowaniu. Testy nie zmieniają prawdziwych zapisów graczy.
