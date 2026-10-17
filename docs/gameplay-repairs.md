# Match, bot and map repairs

Lobby matches now use one host simulation for all modes. Guests send inputs, purchases and actions; the host broadcasts player state, score, flags, world objects, cosmetics and a unique match session. A new map starts a new session. Stale snapshots and messages from another match are ignored. A disconnected guest waits for the host instead of starting a separate game.

Presence reconnects after channel errors and tracks whether the player is in a match. An unsynced connection displays a connection status rather than declaring all friends offline.

Respawns clear fire, delayed grenades, damage history and navigation state. Armor absorbs only as much damage as the armor remaining. Living fractional health displays at least 1 HP. The kill cam uses the same damage calculation and receives bot death summaries on guests.

The inventory, market and upgrader use the same item value. Knife models, finishes, gloves and StatTrak have explicit premiums. Old market listings are repriced; purchases use the current value. Buying and selling have the same reference price, without a random spread. Sale and swap transactions save before showing success and reject missing items.

CTF bots rotate attack, escort and defense duties. Carriers return to their own base and recover a dropped own flag when necessary. Steering and pair separation use stable directions. Shared reverse path fields replace repeated searches across the entire map.

## Map adaptation

Dust II, Ancient, Mirage, Inferno, Overpass and Nuke have new collision masks; Aztec and Anubis use IDs 12 and 13. Existing BR and zombie IDs stay unchanged. The viewport fills its window at 65–100% zoom, and the renderer copies only the visible part of the cached map.

The seven current-map floor plans were traced from the extracted game-depot radar files in [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons/tree/main/images/radars), with metadata from its [radar overview configurations](https://github.com/MurkyYT/cs2-map-icons/tree/main/data/radar_info). The game contains compact collision data, not those radar textures. Doorways, stairs and gray site floors are reconstructed for a 2D collision model. Aztec is an authored approximation of the classic ruins, bridge and water routes. Nuke's lower B site is translated into a separate area connected by ramp/secret routes. These are playable 2D adaptations, not exact 3D CS2 collision maps.

### Review corrections: passages and physical cover

Mirage and Overpass now use explicit polygon floor plans rather than color-derived floor classification. Mirage has a continuous wall between apartments and short, the west apartment balcony exit, the distinct B-short arch entrance, a ramp-to-A opening, palace pillars, and physical site cover including the van, bench, default/triple/firebox stacks and ticket booth. Overpass restores connector stairs and the monster approach, puts B around its actual pillar/platform, and separates toilets, water and the long route with retaining walls.

Dust II, Ancient, Inferno and Anubis retain their traced perimeter masks with explicit reconstruction of gray site/stair floor patches and named cover from their radars. Nuke has an explicit upper floor plan with lobby/hut divisions, ramp and silos; its lower floor remains shifted below the upper level. Classic Aztec retains its authored footprint and gains stone cover. This is a closer 2D adaptation, **not an exact copy of every CS2 wall, prop, elevation or collision surface**. The source radars are overview images, not full collision meshes. Overlapping levels, jump-only windows, climbable props, curved surfaces and the classic Aztec reference still differ.

`maps/topology.json` records editable floor/wall polygons, named wood/metal/stone/vehicle covers, spawn/site coordinates, checks and baseline masks for maps receiving local repairs. `npm run maps:compile` deterministically embeds all geometry and cover into `game-source/index.html`; no extra asset is needed at runtime. `npm run maps:check` rejects stale embedded data. Covers share the same collision/navigation mask as their rendered silhouette. Their artwork is drawn into the existing static map cache, not reconstructed every frame. The grid resolution and world size remain 192×192 and 2400×2400.

Both spawns can reach both sites on all eight bomb maps. Regression checks also require local passage paths around the marked areas and a solid apartments/short divider; a long detour across the entire map cannot satisfy those passage tests. Competitive balance and fidelity of every remaining prop still need human playtesting.

### Mirage windows and doorway review

The market's west doorway is now an actual opening to B. Its north window and the mid sniper window use grid type 3: actors and navigation treat the sill as solid; line of sight, fog rays, bullets and thrown grenades pass through it. Opaque walls and covers retain their previous blocking behavior. Window rectangles also feed the existing window-shot indicator. The low sill has a distinct, transparent static rendering, and the Overwatch trace uses the same sight rule.

The two separated apartments strips are joined into one solid wall mass, with no walkable slot between them. Palace now has a connected divider and one narrow balcony exit. The compiler applies named door cuts after wall construction and retains the windows as movement barriers in the embedded mask.

Runtime regression tests place actors on both sides of each window: movement blocks in both directions, both actors can see each other, fog rays continue, a real AK shot damages the target, and frag/smoke/flash/molotov trajectories cross the opening. Replacing the sill with an ordinary wall is a negative control: view, shots and fog rays block and the grenade bounces. Separate checks walk an actor through the market door and palace exit, and verify the repaired wall joins.

## Validation

- `npm test`: launcher, account isolation, cloud persistence, updater, and 23 map topology checks.
- `npm run prepare:game`: packages the single source file and the pinned Supabase client.
- `npm run test:gameplay`: two isolated Electron clients using an in-memory Realtime transport; all 14 modes, authoritative movement/death/score, live TDM purchases, map/session changes, BR landing/cover, presence reconnect after channel/heartbeat failures and safe stale-channel cleanup, remote bot kill cam, fractional health, respawn cleanup, shared prices, all 14 map previews/navigation actual Mirage window collision/visibility/shooting/grenade behavior, doorway movement, and CTF capture/return cycles against stationary defenders across eight maps and 32 deterministic seeds. It never authenticates or writes to the live Supabase project.
- The desktop account integration harness also passed existing-account login, case persistence, logout, second-account isolation and Escape behavior.

A separate connection check reached Supabase Auth health (HTTP 200), but WebSocket Realtime subscriptions timed out from the build environment. Live Internet multiplayer and presence therefore remain unverified on the actual service. No production schema, account, RLS policy or release was changed.

A short single-window 1914×1076 software-rendering check at 65% zoom measured approximately 51 FPS before and 57 FPS after on Mirage. This is an environment comparison, not a hardware performance guarantee. Static map creation is separate from steady-state frame drawing.
