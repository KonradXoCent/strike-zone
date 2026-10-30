# Zone Hub 0.1.7 and Zone Royale 0.1.4

Royale is branded before the first body element is parsed. The generated entry replaces the splash, icon and loading art, initializes its profile proxy in the head and reads `royaleSt` instead of Strike's `st`. `profile.royale.progress` is the local presentation cache; account statistics and rank are stored in `zone_royale_private.progression`.

The queue uses protocol 5 and separates ranked/casual matches in every lookup. Party readiness includes that selection. A roster is frozen on launch, so leaving/rejoining cannot remove a participant from a completed result. Only the recorded host may submit a bounded full-roster result, once per match. Casual matches advance Royale achievements without changing RP. Result processing keeps Strike's leaderboard untouched. Match simulation is still peer-hosted; this is not a dedicated authoritative anti-cheat server.

RP starts at 0. Each ranked match costs 20 RP, grants 100/60/25 for first/top-three/top-ten team placement, 10 per elimination (up to 15), and 1 per survival minute (up to 20). Points cannot fall below 0. Bronze, Silver, Gold, Platinum, Diamond, Storm Master and Island Legend start at 0/250/700/1400/2400/3600/5000 RP. Twelve BR-specific achievements cover eliminations, wins, survival, cards, reboots and rank.

`zone_game_save` takes a row lock and merges only the selected game's fields, preserving the other game's settings/progression and checking the inventory epoch explicitly. Native preferences already have separate application directories; Hub language broadcasts no longer overwrite a saved game language. A cloud load reapplies the selected game's zoom.

Zone Hub account settings edit nickname/avatar through an authenticated RPC. Existing profile keys remain stable for trades; identity changes have their own epoch and reach running games. Password recovery reuses the configured Supabase email template and recovery page. Cosmetic purchases are server-priced at 500 Strike coins, idempotent and recorded separately from game inventories. A Halloween bundle unlocks both profile and platform styling. Existing local free themes survive the upgrade until an account chooses a cloud theme.

Showcases allow six owned inventory items across the two games or an owned library game. Server reads remove items no longer owned and enforce inventory privacy for visitors. Profile achievements are grouped by game and platform pins accept unlocked badges from either game.

## Database order

On the existing production schema, apply `zone-royale-ranked-upgrade.sql` (or the complete idempotent `zone-royale-matchmaking.sql`), `zone-royale-progression.sql`, `zone-game-save.sql`, then `zone-hub-account.sql`. Existing tables and account items are retained. Production used the same statements split into smaller migrations, with the public account router enabled last.

## Validation

SQL tests exercise privacy, ownership, one-time purchases, invalid ranks/results, duplicate reports, unchanged Strike stats, stale inventory epochs and alternating saves from both games. Native tests cover first-frame branding, settings/zoom persistence, three clients sharing a ranked match, server-recorded results, avatar cropping, nickname/recovery UI, both showcase types, theme purchase/equipping, trade/market/chat regressions and three desktop sizes. Windows packaging and the installed Hub self-updater remain required release gates.
