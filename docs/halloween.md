# Halloween 2026

The event appears above Multiplayer Lobby. It runs through 30 November 2026, 23:59:59 Europe/Warsaw (exclusive end: 2026-11-30T23:00:00Z). The menu theme ends automatically. Existing items and player trades remain available afterwards.

## Candy progression

- 2 candies per complete minute of live, unpaused play, across supported game modes.
- 12 candies for completing a match or 18 for winning, after at least 60 seconds of participation. Each match result is recorded once.
- Daily quests: play 10 minutes (30), complete 2 matches (25), win once (20), get 15 eliminations (20).
- Event milestones: play 60 minutes (100), complete 10 matches (100), win 10 matches (150).
- Daily quests reset at midnight in Europe/Warsaw, including the October DST change.

## Cases and exclusive content

| Case | Candies | Contents |
| --- | ---: | --- |
| Pumpkin Cache | 60 | 8 Halloween weapon finishes |
| Reaper's Vault | 240 | 4 weapon finishes, 4 knives and 2 gloves |
| Haunted Music Box | 35 | 5 original MVP music kits |

All case probabilities appear in the contents dialog and match the weighted rewards. Reaper's Vault has a combined 6% knife/glove chance. Weapon and knife rolls have a separate 10% StatTrak chance; music and gloves never do.

Content uses original cached Canvas artwork and synthesized MVP music. It is excluded from regular cases, random normal drops, bot-market listings, bot sales/swaps, contracts and upgrader inputs/outputs. All event content supports player trades, including the new MVP music kits.

## Save and compatibility

Progression, ownership, and equipped event items live in the existing account profile JSON under `halloween2026`. Legacy inventories and loadouts never receive unknown event IDs, so the older public client can still load an account used in the test build. The new client overlays these items into the existing inventory, filters and team loadout UI. No database migration or new Supabase service is required.

Purchases and quest claims use the existing guarded profile transaction: a local-storage failure rolls back the entire mutation. Candy is debited and ownership stored before the case animation starts. A pending presentation can be recovered after reload without another debit or reward. Account changes discard session tracking and prevent another profile's interrupted presentation from being shown.

## Validation

Pure data tests cover dates, Warsaw day boundaries, rewards, probabilities, duplicate requests, expiry and legacy save compatibility. The isolated Electron smoke test covers the responsive PL/EN panel, active/paused Football play, rewards, save rollback, case opening, inventory equipment, StatTrak, original glove and MVP assets, forbidden sources, reload recovery and event expiry. Existing two-client SDK trade and multiplayer suites exercise event knives, gloves and music ownership transfers and synchronized held cosmetics. The full Windows feature checks run against the standalone source and build a downloadable HTML preview.
