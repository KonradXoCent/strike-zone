# Arcade HUD, football scoreboards and goal replays

The match HUD now covers grenade dodgeball, bomb tag, snowball and Zombie Mode. Football uses exactly the same HUD in the arcade rotation and its standalone mode. All added labels have Polish and English translations, and the panels adapt to small windows and the existing HUD scale setting.

Zombie Mode shows the surviving humans, infected players and round timer. Human players see their class, health, armor, current weapon and ammunition, freeze grenades and supplies or builder controls. Infected players see their class, health, claw damage, attack cooldown, freezing and respawn state. These panels also follow the selected spectator target.

## Football statistics

Holding Tab opens two team tables with goals, assists, completed passes and goalkeeper saves. Own goals are indicated below the player's name and never increase that player's goal count. The same table is used at the end of a standalone football match. Other minigames show mode-specific hits, throws, eliminations or bomb transfers.

The host credits a goal to the last player touching the ball, except that a passive deflection off the defending goalkeeper preserves the opposing scorer and any assist. A deliberate goalkeeper kick can still be an own goal. An assist requires an uninterrupted touch by another teammate in the preceding ten seconds. Passes count only when a teammate receives the ball. Statistics survive respawns and reset at the start of the next minigame. Existing football kick strength, free-ball behavior and the ten-goal target remain unchanged.

## Goal replays

`arcade-rules.js` keeps a bounded position history at 10 Hz for the last 3.5 seconds. A goal freezes a copy with the ball, player positions, names, teams and scorer. `football-replay.js` renders this recording with its own camera, a ball trail, scorer/assist labels and a progress bar. Space or the Skip button dismisses the replay locally; the shared goal pause does not change. The tenth goal is also replayed before returning to the result table.

Playback does not run game physics, change player positions, award goals again or write profile statistics. It stores no video files. In multiplayer, the host sends one validated clip per goal; ordinary snapshots carry only the replay descriptor. A late or missing clip can be requested from the host with a per-peer rate limit. Clients accept clips only from the current host and matching match/round, and a forged client clip cannot alter the host's state.

## Validation

- Unit tests cover scorer/assist and own-goal rules, bounded immutable history, packet validation and angle interpolation.
- `npm run test:arcade-ui` checks both languages, 400/900/1440 px windows, HUD scales, real Tab input, actual pass/goal attribution, replay isolation and skipping, and the final goal with a single reward.
- `npm run test:network` checks lobby-code and server-list entry with two actual Supabase SDK clients against an isolated local transport. The football checks verify remote goal attribution, clip delivery and recovery, scoreboard synchronization and rejected replay forgery. This validates client integration; it does not measure production Internet latency.
- Existing minigame tests exercise complete bot matches and unchanged kicking physics. Windows CI runs the full regression suite and builds the isolated `1.5.3-test.4` launcher and standalone HTML preview.

No database migration or public release is required for these changes.
