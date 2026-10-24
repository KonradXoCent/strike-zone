# Launcher, friendship requests and mode HUD

Football displays a blue/orange scoreboard with the ten-goal target, elapsed time,
the current player role, ball proximity and kick/sprint readiness. Prop Hunt shows
the round clock, remaining hiders and seekers, role, health and the actual morph,
rotation-lock and dash cooldowns, or ammunition and hit/shot counts for hunters.
Native phase announcements, setup blindness, round results and spectator controls
remain active. Both interfaces use the saved HUD accent and scale.

Launcher Settings has a persisted **Start the game in fullscreen** checkbox.
It controls the next native game window. F11 still toggles the current window.
Existing preferences migrate with fullscreen disabled. The night, forest and sand
themes share legible controls while retaining distinct backgrounds and palettes.
Seasonal lantern lights and embers are confined to decorative, noninteractive
layers and expire with the existing Halloween event.

The launcher first shows a branded startup cover. The game uses the same tactical
artwork while loading its actual authenticated cloud save. A failed read still
blocks uploads and exposes Retry and Return to launcher. The old account-loading
wording is replaced by a game-themed screen; account synchronization remains real.

## Friends

Apply `supabase/migrations/20261024000155_friend_requests.sql` to the existing
project. `database/friends.sql` is the identical canonical source. Existing friend
rows are preserved. New writes go through `sz_friends(action,args)`:

- `request`: exact case-insensitive nickname lookup; ambiguous names are rejected.
- `list`: authenticated user's incoming/outgoing pending requests, including offline
  deliveries. No account emails or authentication tokens are returned.
- `accept`: recipient only; both friend rows are written in one transaction.
- `decline` / `cancel`: recipient / sender only.
- `remove`: removes both directions and closes any existing request.

RLS restricts request reads to their participants. The API wrapper uses invoker
rights; the guarded definer implementation resides in a nonexposed private schema.
Stable ordered transaction locks serialize simultaneous requests and acceptance.
Repeated acceptance is idempotent. Invitation creation is bounded to 24 per hour
and 100 outstanding invitations, and repeats after a closed request have a one-minute
cooldown. Both clients refresh persistent requests every eight seconds.

## Test builds

`node scripts/build.cjs --test --test-revision=4` produces a separate Windows Test
app, shortcut and local session directory. It uses real Supabase accounts but has
no public update gate, so an unpublished preview is playable without replacing the
stable application. The regular release build retains mandatory updates.

## Validation

- `npm test`: database permissions, recipient consent, replay, ambiguous nicknames,
  old one-way rows, limits and preferences.
- `npm run test:launcher-social`: real SDK through isolated HTTP/Postgres fixtures,
  invitation in launcher and acceptance in game, theme layouts, persisted fullscreen,
  account-loading failure/retry and preservation of the cloud inventory. Real native
  fullscreen state is asserted on Windows; headless Linux has no window manager.
- `npm run test:modes-hud`: live mode values, both Prop Hunt roles, PL/EN, 1440×900,
  900×600 and 400×760, HUD scale 70/100/130% and screenshot inspection.
- Existing Prop Hunt, spectator, launcher, network and translation regressions.

## Artwork

`assets/loading-scene.webp` is an optimized project copy of artwork generated with
the built-in image generation tool. It follows the user's flat polygonal operator
reference and the game's `drawChar` / `drawBody` CT and T palettes. The standalone
HTML embeds this same image; it does not fetch an external asset.

Final prompt: widescreen flat 2D polygonal tactical courtyard with thin dark outlines,
muted sandy walls, crates and arches; two dark navy CT operators with helmets and
pale-blue visors holding M4 rifles on the left; two olive-clad T characters with
black berets, beige faces and muted blue vests holding AK rifles on the right;
front/three-quarter full-body view, open dark center for the actual game logo and
loading UI, restrained evening atmosphere, no text, logo, watermark or seasonal props.
