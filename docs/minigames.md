# Minigames

The non-ranked Minigames card replaces ordinary Hide and Seek in the public
selector. Prop Hunt stays separate. Selecting Minigames opens a ten-second
shared vote with four cards; a player can change their single vote. Bots vote
once. Ties are resolved randomly by the host. Lobby guests cannot start a
separate local session.

| Minigame | Arena | Rules |
| --- | --- | --- |
| Grenade dodgeball | `mg_dodgeyard` | 5v5, 100 seconds. Players stay on their own half; HE grenades fly over the central fence. Eliminate the other team. A timeout compares survivors, then health. |
| Bomb tag | `mg_bombtag` | Free for all, 13-second fuse. Touch another player to pass the bomb without resetting the fuse. A short transfer lock prevents immediate tag-back. The explosion eliminates its carrier; the last survivor wins. |
| Snowball fight | `mg_snowfield` | 5v5, first to 15 eliminations or 100 seconds. Snowballs deal 34 damage and briefly slow; eliminated players respawn after three seconds. |
| Football | `mg_stadium` | Dedicated stadium, 5v5, first to ten goals, with no time limit. Left click kicks toward the cursor using the original strength and reach. The ball rolls freely and rebounds from players; bots pass, intercept and keep goal. |

WASD moves and E gives a short dash/sprint. Minigames use compact HUD panels,
a Tab scoreboard, their own equipment and original cached Canvas arenas.
Normal shopping, guns, combat damage, cheats and StatTrak progression are
disabled. The grenade arena restricts both host movement and client prediction
to each team's half; projectiles can cross the fence. Snowballs use swept hit
checks against walls and players. Ball physics uses small substeps, friction,
pitch boundaries and goal-line crossings.

After a five-second result screen, a five-second animated roulette selects
another minigame from a shuffle bag. The current game is excluded. The next
arena starts automatically after a three-second warmup, keeping the roster,
connections and session ID. A completed minigame grants the existing match
reward once (150 win / 100 draw / 75 loss). Repeated result snapshots do not
grant another reward, and joining only for a result grants none.

The host owns ballots, fuse transfers, damage, eliminations, scores, ball
physics, results and the roulette choice. Clients send movement, aim, action
and vote requests using the existing authenticated room/session transport.
Client-supplied scores, health and minigame choices cannot alter host state.
Snapshots include the arena, phase, projectiles, effects, ball, fuse, votes and
per-player points. No database migration is required.

## Standalone football

The separate **Football / Piłka nożna** card uses the same stadium, 5v5 bots,
physics and ten-goal rule. It skips the minigame ballot and starts after a
three-second warmup. Football has no match timeout in either mode: the third
and ninth goals resume play, and only the tenth goal ends the match. The
standalone result stays on screen with a menu button instead of entering
minigame roulette. Lobby and server creation expose this mode and the stadium.
Host authority and one-time participant rewards are shared with Minigames;
late joiners arriving only for a result see it without receiving a reward.

At kickoff and after every goal, each designated goalkeeper spawns in the
centre of their own goal area. Bots track and deflect incoming shots, then
pass to teammates instead of running back from an outfield spawn. These roles
are included in host snapshots and survive the replacement of a bot by a guest.

The ball rolls freely, with friction and rebounds from players. Touching it
never grants possession or attaches it to a player. The original kick is
restored: left click aims directly from the player toward the cursor, with
820 px/s strength, 52 px reach, a 0.35-second player cooldown and a 0.45-second
ball kick cooldown. Right click does not trigger a different football action.
Drag is again 0.65, with the original 900 px/s physics cap, so a kick can travel
the length of an unobstructed pitch. Kick strength no longer depends on target
distance, pass/shot intent or proximity to a teammate, and aiming has no
automatic lead or ball repositioning. Players can still intercept or deflect
a released ball; the kicker has a short contact grace period to avoid blocking
their own kick.

Bots consider both local and remote human teammates when choosing a pass.
An open human has additional priority, including safe short backpasses. A
blocked lane still rules out the pass. Bots retain support runs, close-range
shots and goalkeeper positioning. Per-player movement speed no longer depends
on the ball.

The host resolves ball movement, contact, shots, goalkeeper roles and goals.
Guests predict a freely rolling ball and reconcile its position and velocity
to host snapshots. Submitted ownership and keeper flags cannot override
the host's decisions.

## Verification

- `npm test`: arena geometry, extreme centre-bound inputs, swept snowball hits,
  goal crossings, restored full-pitch kick range, ball friction and non-repeating choices,
  plus existing tests.
- `npm run test:minigames`: actual mode-card entry and loading, lobby guest gate,
  shared voting, blocked centre, HE hits, fuse transfers, snowball respawn,
  goalkeeper spawn/reset and deflections, independent ball motion, passes,
  loose reception, interceptions, original kick strength/reach/cooldowns and local/remote human backpasses, third/ninth/tenth goals, no timeout, standalone
  results, one reward, uninterrupted roulette and full seeded bot matches.
- `npm run test:network`: two SDK clients in lobby and server sessions; voting,
  guest movement independent of the ball, actual shooting, bot passes to the
  guest and synchronized goalkeeper roles, rejected forged ownership, synchronized goal/results, repeated result
  snapshots, new arena mounting and the central movement restriction.
- `npm run test:locale`: PL/EN votes, warmups, live HUDs, scoreboards, results and
  roulette for all four games.

Software-renderer simulation timings are diagnostics rather than an FPS
guarantee for players' hardware.
