# Map materials

The new map appearance uses original procedural textures inspired by top-down
shooters: sandstone, plaster, brick, stone/moss, concrete, metal and wood, with
sand, paving, asphalt, tile, grass, dirt and snow floors. Built-in maps retain
their established color palettes. Workshop maps follow the author's Desert,
Industrial or Forest theme. No external image download is needed.

`shared/map-materials.js` is embedded into the standalone HTML by
`scripts/embed-shared.cjs`. It replaces the floor/wall pattern painters and grid
appearance while delegating to the original renderer for Simple appearance.
The PL/EN setting is available in both the main settings and pause settings and
is persisted with the existing device preferences.

## Rendering and memory

- Static materials, wall caps, bevels and contact shadows are baked into the
  existing `SCV` canvas when that cache is built. Its dimensions and the normal
  frame's existing cropped `drawImage(SCV, ...)` call are unchanged.
- No additional full-map layer, shader, animated shadow, texture generation or
  edge scan is added to steady frame rendering. Dynamic wall decorations use
  small lazily cached sprites; special Battle Royale covers retain their shapes.
- Reusable material tiles are 96 or 128 pixels square. The FIFO cache holds at
  most 64 tiles (at most 4 MiB of raw pixels, excluding browser overhead).
  Sprite keys are weak references to wall objects, so abandoned maps are not
  retained by the sprite cache.
- Texture randomness uses its own deterministic generator. It does not consume
  the random stream used for combat, rewards or bot decisions.
- Grid data, navigation, wall rectangles, covers, windows, stairs, sites and
  spawns are read only. The two-cell wall cap stays inside solid cells; transparent
  windows and walkable passages retain their existing behavior.

## Validation

`npm run test:materials` uses an isolated Electron profile without production
network writes. It checks all 14 built-in maps, all three workshop themes and
matches with bots; compares geometry before/after baking; verifies that warm
frames do not rebuild the map, tiles or dynamic sprites; and checks PL/EN,
fallback selection and persistence through reload.

With `SZ_MATERIALS_OUTPUT` set, it saves a JSON report and diagnostic images.
The render comparison uses the median of nine alternating batches of twelve
real `draw()` calls and a canvas readback to flush raster work. GPU acceleration
is disabled. These are **software render costs, not measured player FPS**;
real hardware should be checked separately. Map-cache build time is recorded
apart from the steady frame comparison. The benchmark does not assert a noisy
cross-machine timing threshold; cache invariants are enforced instead.

The existing gameplay checks additionally exercise actual window shots,
grenades and collision, map passages, Nuke transfers, bot navigation, CTF and
shared multiplayer sessions.
