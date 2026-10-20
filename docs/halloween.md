# Halloween 2026

The event appears above Multiplayer Lobby. It runs through 30 November 2026, 23:59:59 Europe/Warsaw (exclusive end: 2026-11-30T23:00:00Z). The menu theme ends automatically. Existing items and player trades remain available afterwards.

## Seasonal Zombie Mode arena

`zm_hallows_end` is an original 1280 × 832 cemetery with a three-entrance ruined chapel, four crypts, gravestone covers, pumpkins and cobwebs. Its collision grid and bot navigation use the same geometry. Decorative detail is baked into the static map canvas.

The arena appears only in Zombie Mode, including map votes, multiplayer lobbies and server creation. It follows the exact event deadline and is removed from new selections on expiry; an already running match can finish. Its index is reserved before local and Workshop map slots so an expiry never changes map IDs. Clients reject a new expired-map start rather than loading a different arena from their host.

## Candy progression

- 2 candies per complete minute of live, unpaused play, across supported game modes.
- Zombie Mode and every Minigames variant (grenades, bomb tag, snowballs and football) use these rewards for both host and guests. Round-based match endings and Deathmatch also notify the event completion handler, in addition to the shared match-end function. A toast confirms candies earned during play.
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

The home card has seasonal inline SVG pumpkins, a moon, bats and a cobweb, with a warm orange/purple background. The decorations are static, ignore pointer input, stay within the card and shrink on small screens. They appear only on the Play home screen while the event is active and are removed when it ends.

The desktop launcher uses the same original drawings, a dated Halloween badge and warm highlights. They share the game's event schedule, shrink for compact windows and preserve the selected Night, Forest or Sand preference. Authentication, update controls and friend presence badges remain accessible; ending the event removes the seasonal treatment automatically.

## Save and compatibility

Progression, ownership, and equipped event items live in the existing account profile JSON under `halloween2026`. Legacy inventories and loadouts never receive unknown event IDs, so the older public client can still load an account used in the test build. The new client overlays these items into the existing inventory, filters and team loadout UI. No database migration or new Supabase service is required.

Purchases and quest claims use the existing guarded profile transaction: a local-storage failure rolls back the entire mutation. Candy is debited and ownership stored before the case animation starts. A pending presentation can be recovered after reload without another debit or reward. Account changes discard session tracking and prevent another profile's interrupted presentation from being shown.

## Validation

Pure data tests cover dates, Warsaw day boundaries, rewards, probabilities, duplicate requests, expiry and legacy save compatibility. The isolated Electron smoke test covers the responsive PL/EN panel, active/paused Football play, rewards, save rollback, case opening, inventory equipment, StatTrak, original glove and MVP assets, forbidden sources, reload recovery and event expiry. Existing two-client SDK trade and multiplayer suites exercise event knives, gloves and music ownership transfers and synchronized held cosmetics. The full Windows feature checks run against the standalone source and build a downloadable HTML preview.

The seasonal extension also checks connected cemetery routes with actor clearance, all five Zombie/Minigames reward paths and exact map expiry. Two-client SDK scenarios run through lobby codes and server listings, including host/guest candy progression, shared results, duplicate-result protection, Prop Hunt conversion and round resets, all minigames, football goals and the ten-goal finish.

Overwatch now pays up to ten correct, sufficiently watched verdicts per day. A GUI check submits eleven watched demos and confirms that only ten receive money/XP.
