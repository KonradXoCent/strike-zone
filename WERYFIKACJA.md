# Weryfikacja 1.0.1

Lokalnie przechodzi 16 testów automatycznych synchronizacji i aktualizatora.
Obejmują blokadę gry przed sprawdzeniem wersji, po wykryciu aktualizacji,
po błędzie sieci i przy uszkodzonej konfiguracji. Weryfikują również instalację
po pobraniu oraz odczyt chmury przed pierwszym zapisem nowej instalacji.

Pełny test instalacji i aktualizacji Windows wykonuje workflow w repozytorium.
Jego wynik jest dołączany do wydania jako update-smoke-report.json.
Stanem rozstrzygającym jest status w tym raporcie i wynik workflow.

Nie testuje się logowania na prawdziwe konto ani nie modyfikuje bazy Supabase.
Załączony HTML jest identyczny z poprzednią wersją; zmiany dotyczą launchera.
