# Hide and Seek

The test build adds a non-ranked, host-authoritative hide-and-seek mode with
three original arenas: `hs_warehouse`, `hs_garden`, and `hs_motel`.

Each of six rounds starts with 30 seconds of hiding time. Seekers stay in place
with their world view and movement sounds blocked. Searching lasts up to 150
seconds. Seekers catch opponents through close, unobstructed contact or a
left-click tag. Hiders have a 2.5-second dash with a 16-second cooldown. Every
25 seconds, the remaining hiders create approximate area cues. Roles alternate
each round while team membership and team scores remain fixed.

The match ends after six rounds, including a possible draw. Tags do not count
as weapon kills, combat deaths or StatTrak kills. The usual completed-match
reward is awarded once. Caught players spectate their own team until the next
round. Shopping, grenades, firearm damage and combat Kill Cam are disabled.

## Maps and perception

`shared/hide-seek-maps.js` reserves its three IDs before Workshop allocation.
Creator previews and online Workshop releases therefore keep separate slots.
The normal map pools exclude these arenas. All walls, covers, navigation and
visibility use the same grid. Actor-clearance flood tests verify that every
hiding point and every walkable room connects.

Hiding bots use authored-arena cover points and escape from visible threats.
Searching bots patrol distributed routes, observe opponents in line of sight,
and investigate approximate sound cues. Their short-lived memories store copied
coordinates rather than references to hidden opponents. Setup blindness also
applies to bot perception. There is no search target chosen from hidden enemy
coordinates. Pathfinding and map textures reuse the existing caches.

## Multiplayer and extension

The host owns movement validation, captures, clocks, scores, role changes and
respawns. Snapshots add the round/role state, area cues and dash/catch counters.
Clients send the existing movement and action inputs, and cannot buy a weapon
or submit an authoritative mode state. Late joins receive the active round.
Both public-server joins and lobby-code joins use the same session.

The arena's `covers` and `hidePoints`, separate role state and mode-specific
renderer provide the starting point for a later Prop Hunt implementation.
This build uses player characters; disguises are a subsequent feature.

## Validation

- `npm test`: arena connectivity with actor clearance, alongside existing tests.
- `npm run test:hide-seek`: setup freeze and blindness, capture line of sight,
  observation memory, role swaps, dash, pause, bot movement, all arena renders,
  six-round completion, one match reward and unchanged inventory/StatTrak.
- `npm run test:network`: two actual SDK clients, both entry routes, host-owned
  captures, role changes, respawns, and rejected weapon/state messages.
- `npm run test:locale`: both languages, mode selection, dedicated loading
  screens, HUD and scoreboard, alongside the rest of the interface.
