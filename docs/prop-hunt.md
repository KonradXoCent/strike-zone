# Prop Hunt

Prop Hunt is a separate, non-ranked variant of Hide and Seek. Both modes keep
the three dedicated arenas and the existing six-round schedule: 30 seconds to
hide, up to 150 seconds to hunt, alternating roles and an approximate area cue
every 25 seconds. The ordinary Hide and Seek mode remains selectable.

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
models are hidden. Teammates can identify their own hiders.

Hunters use a pistol, **left click** to fire and **R** to reload. A magazine
holds 12 shots and reloading takes 1.4 seconds, with automatic reload when
empty. Four 25-damage hits catch a full-health hider. Hitting ordinary scenery
costs 5 HP; shooting a wall or missing does not. If every hunter runs out of
health, the hiders win. Shopping, grenades, contact catches, combat Kill Cam
and firearm damage from other systems are disabled in this mode.

Movement uses a conservative circular clearance around the actual form.
Shots intersect the form's rotated rectangle, circle or ellipse. Walls and
intervening props block shots. A deterministic set of solid scenery objects
is checked for connected navigation with the largest form before placement;
the normal arena grids and Workshop allocation are not modified.

## Bots and multiplayer

Hiding bots choose spaces beside themed scenery, match its form and orientation,
and decide whether to flee based on visible hunters and recent damage.
Hunter perception supplies only anonymous form, position and angle samples.
Bots compare visible observations for movement, react after a delay, investigate
area cues and occasionally check stationary scenery. They remember copied
positions after an observed hit. They have no target selector using hidden
player coordinates or an observation flag identifying which object is a player.

The host owns forms, cooldowns, locked angles, hit decisions, ammunition, HP,
scores and respawns. Client inputs request actions; form names and health
supplied by a client are ignored. Snapshots synchronize these fields and
existing lobby/session checks authenticate their source. Scenery is generated
identically on both clients. Late joiners inherit the live slot's state.

Catches use the mode scoreboard and do not count toward weapon kills, deaths
or StatTrak. The completed-match reward is granted once. Disguises grant no
inventory items. No database migration is needed.

## Verification

- `npm test`: bounded form geometry, oriented ray intersections, deterministic
  scenery, five available forms per arena and connected routes for the largest
  form, plus existing tests.
- `npm run test:prop-hunt`: transformation and rotation inputs, collision,
  blind setup, wall-blocked shots, actual damage, scenery penalties, anonymous
  observations, full bot simulations and a single match reward.
- `npm run test:network`: two SDK clients, lobby and server joins, client
  transformation/rotation/fire, host hits and penalties, role changes, ignored
  forged form/HP fields, and one reward for repeated final snapshots.
- `npm run test:locale`: both languages, including the new HUD and scoreboard.

Sprites and per-arena scenery/navigation are cached. Simulated tick timings
and screenshots are diagnostics; headless software-renderer measurements
are not a guarantee of FPS on a player's computer.
