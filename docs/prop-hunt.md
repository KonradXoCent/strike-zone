# Prop Hunt

Prop Hunt is a separate, non-ranked variant of Hide and Seek. Both modes keep
the three dedicated arenas and the six-round schedule: 30 seconds to hide, up
to 150 seconds to hunt and an approximate area cue every 25 seconds. Prop Hunt
starts each round with three hunters and seven hiders. Initial hunter slots
rotate across the roster between rounds; conversion does not change that order.
The ordinary Hide and Seek card has been replaced by Minigames; its shared
round engine is retained for Prop Hunt and compatibility.

## Forms and controls

| Arena | Forms |
| --- | --- |
| `hs_warehouse` | Crate, barrel, tire, toolbox, pallet |
| `hs_garden` | Plant pot, rock, bush, crate, barrel |
| `hs_motel` | Chair, suitcase, bin, plant pot, crate |

Hiders start disguised. Point at nearby scenery and press **R** to copy it;
the server checks the source object, distance, visibility, three-second cooldown
and available space. **F** locks or unlocks the disguise's rotation. **E** is
the existing dash. Changing form preserves current health. Forms use the same
cached original Canvas sprites as normal scenery; enemy names and player
models are hidden. Only the local hider has a 'You' label. Other hiders'
names are absent above props and anonymized on a hiding player's scoreboard.

Hunters use a pistol, **left click** to fire and **R** to reload. A magazine
holds 12 shots and reloading takes 1.4 seconds, with automatic reload when
empty. Four 25-damage hits catch a full-health hider. A caught hider immediately
becomes a hunter with 100 HP, a loaded pistol, no disguise and a short 0.6-second
weapon delay. Their identity, controls and connection stay in the same slot.
Converted bots receive a fresh hunter brain without previous hiding memory.
The round continues until the last hider is found, time expires or all hunters
lose their health. The next round resets to 3/7 rather than carrying conversions
forward. Hitting ordinary scenery
costs 5 HP; shooting a wall or missing does not. If every hunter runs out of
health, the hiders win. Shopping, grenades, contact catches, combat Kill Cam
and firearm damage from other systems are disabled in this mode.

Hiding players have no visibility fog: scenery and actors remain visible through
walls and beyond the hunter sight radius within the camera view. Hunter
visibility and bot perception extend to 760 world pixels (previously 500),
with walls still blocking sight. Static scenery no longer disappears behind
other props; intervening props still obscure disguised players. Pistol range
remains 500. During play, two compact 44-pixel HUD panels replace the large
instruction panels. The full scoreboard is available on Tab, and mouse capture
help is a small button in the corner.

Movement uses the locked form's oriented footprint, with conservative rectangular
clearance for an elliptical rock. Rotation and transformation cannot clip a
wall, scenery or another actor. Navigation still reserves clearance for the
largest form.
Shots intersect the form's rotated rectangle, circle or ellipse. Walls and
intervening props block shots. The warehouse has 125 scenery objects, the garden
92 and the motel 99 (previously 26, 25 and 28). Per-arena storage rows, pavilion decorations and room furniture are authored
against specific wall faces, with a two-pixel visual gap. Solid scenery uses its
oriented sides for movement collision. The complete layout is checked for
connected navigation with the largest form before placement;
the normal arena grids and Workshop allocation are not modified.

## Bots and multiplayer

Hiding bots reserve distinct, wall-backed empty places in the scenery rows:
23 places in the warehouse and 24 in each other arena. Each has an accessible
approach, matching source prop and exact stopping position. All places can be
filled simultaneously without disconnecting the navigation grid. Bots copy the
intended form and orientation before entering the place, lock rotation and stop
flush with the same two-pixel gap as scenery. They retry another place if blocked.
A settled bot stays still when a hunter passes; a visible threat and actual
damage can trigger flight. There is no radial-ring or open-corridor fallback.
Hunter perception supplies only anonymous form, position and angle samples.
Bots first match unchanged scenery and require two consecutive movement samples,
so newly visible identical props do not count as movement. They react after a
delay, investigate area cues and check stationary scenery every 7–12 seconds
while above 35 HP. A wrong prop is not deliberately checked again that round.
They remember copied
positions after an observed hit. They have no target selector using hidden
player coordinates or an observation flag identifying which object is a player.

The host owns forms, cooldowns, locked angles, hit decisions, ammunition, HP,
scores and respawns. Client inputs request actions; form names and health
supplied by a client are ignored. Snapshots synchronize these fields and
existing lobby/session checks authenticate their source. Scenery is generated
identically on both clients. Late joiners inherit the live slot's state.

Catches use the mode scoreboard and do not count toward weapon kills, deaths
or StatTrak. Role scores count hunter/hider round wins; individual round wins
use the role assigned at the beginning of that round. Being caught and changing
sides does not award a win. The final result and reward use the local player's
individual round wins, synchronized by the host. The completed-match reward is granted once. Disguises grant no
inventory items. No database migration is needed.

## Verification

- `npm test`: bounded form geometry, oriented ray intersections and footprints,
  anonymous movement matching, deterministic dense scenery, five available forms
  per arena, accessible hiding places and connected routes for the largest
  form, plus existing tests.
- `npm run test:prop-hunt`: transformation and rotation inputs, collision,
  blind setup, wall-blocked shots, actual damage, scenery penalties, anonymous
  observations, full bot simulations, distinct matched hiding places reached
  before the hunt, staying disguised near a hunter and a single match reward.
- `npm run test:network`: two SDK clients, lobby and server joins, client
  transformation (including scenery IDs above 99), rotation/fire, live conversion and shooting by the
  newly converted remote player, reset to 3/7, personal round wins, ignored
  forged form/HP fields, and one reward for repeated final snapshots.
- `npm run test:locale`: both languages, including the new HUD and scoreboard.

Sprites and per-arena scenery/navigation are cached. Simulated tick timings
and screenshots are diagnostics; headless software-renderer measurements
are not a guarantee of FPS on a player's computer.
