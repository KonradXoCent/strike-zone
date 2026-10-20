# Kody bonusowe

Pole **Kod bonusowy** znajduje się w panelu Halloween na stronie Graj i w zakładce Profil. Wymaga zalogowanego konta oraz połączenia z chmurą. Pierwszy kod to **HALLOWEEN**: 80 cukierków, raz na konto, do końca wydarzenia (30 listopada 2026, godz. 23:59 czasu polskiego).

## Dodawanie kodu bez nowej wersji gry

Otwórz [Supabase Table Editor](https://supabase.com/dashboard/project/mvzlqpccmjslxdajjbfw/editor), wybierz schemat `public`, tabelę `bonus_codes` i dodaj wiersz:

| Pole | Znaczenie | Przykład |
| --- | --- | --- |
| `code` | Nazwa, 3–40 liter ASCII, cyfr, myślników lub podkreśleń; wielkość liter nie ma znaczenia. | `DYNIA120` |
| `reward_candies` | Liczba cukierków. | `120` |
| `active` | Włączenie lub wyłączenie kodu. | `true` |
| `starts_at` | Moment uruchomienia. Domyślnie teraz. | pozostaw domyślną wartość |
| `expires_at` | Koniec dostępności; puste oznacza brak limitu daty. | `2026-11-30 23:00:00+00` |
| `max_redemptions` | Opcjonalny łączny limit kont. Puste oznacza brak limitu. | `100` lub puste |

Pola `id`, `normalized_code`, `used_count` i `created_at` uzupełnia baza. Nie zmieniaj ich ręcznie. Nowy wiersz działa przy następnym wpisaniu kodu w grze — nie ma listy kodów zaszytej w kliencie. Cukierki dotyczą wydarzenia Halloween 2026; jego skrzynki zamykają się z końcem wydarzenia, więc ustawiaj odpowiednią datę ważności kodów.

Przykład dla SQL Editor:

```sql
insert into public.bonus_codes(code,reward_candies,expires_at)
values ('DYNIA120',120,'2026-11-30 23:00:00+00');
```

Aby wycofać kod, ustaw `active=false`. Historia znajduje się w `bonus_code_redemptions`: konto, profil, nazwa kodu, przyznana nagroda i czas odbioru. Zmiana nazwy kodu nie resetuje historii jego użycia.

## Zapis i dostęp

Transakcja blokuje definicję kodu i zapis konta, sprawdza uprawnienia, datę, limit i aktualność zapisu, następnie jednocześnie aktualizuje cukierki i dodaje unikalny dowód odbioru. Każdy kod działa raz na konto Supabase, niezależnie od liczby lokalnych profili. Ponowne wysłanie prośby zwraca zapisany wynik bez kolejnej nagrody.

Klient czeka na wcześniejsze zapisy i blokuje zmiany ekonomii podczas odbioru. Prośba jest zachowana lokalnie przed wywołaniem RPC. Po zerwaniu połączenia lub przeładowaniu klient ponawia tę samą prośbę, pobiera cały autoryzowany zapis konta i dopiero wtedy odblokowuje grę. Błąd zapisu bazy wycofuje także dowód odbioru i licznik użyć.

Tabele mają RLS. Gracz nie może odczytywać katalogu kodów, dodawać nagród ani edytować historii. Własną historię może odczytać po zalogowaniu. Publiczne RPC jest `SECURITY INVOKER`; prywatna funkcja ma stały pusty `search_path`, sprawdza `auth.uid()` i nie przyjmuje identyfikatora innego konta. Klient używa istniejącego klucza publishable, bez klucza serwisowego.

## Testy

`tests/bonus-codes.test.cjs` sprawdza odbiór, powtórzenia, RLS, daty, limit, błędny profil, nieaktualny zapis i wycofanie transakcji przy błędzie zapisu. `scripts/seasonal-smoke.cjs` łączy prawdziwe SDK z izolowaną bazą PostgreSQL, sprawdza formularz, dodanie kodu bez aktualizacji i odzyskanie odpowiedzi po przeładowaniu. Nie modyfikuje prawdziwych zapisów graczy.
