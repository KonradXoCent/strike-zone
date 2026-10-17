# Match, bot and map repairs

Lobby matches now use one host simulation for all modes. Guests send inputs, purchases and actions; the host broadcasts player state, score, flags, world objects, cosmetics and a unique match session. A new map starts a new session. Stale snapshots and messages from another match are ignored. A disconnected guest waits for the host instead of starting a separate game.

Presence reconnects after channel errors and tracks whether the player is in a match. An unsynced connection displays a connection status rather than declaring all friends offline.

Respawns clear fire, delayed grenades, damage history and navigation state. Armor absorbs only as much damage as the armor remaining. Living fractional health displays at least 1 HP. The kill cam uses the same damage calculation and receives bot death summaries on guests.

The inventory, market and upgrader use the same item value. Knife models, finishes, gloves and StatTrak have explicit premiums. Old market listings are repriced; purchases use the current value. Buying and selling have the same reference price, without a random spread. Sale and swap transactions save before showing success and reject missing items.

CTF bots rotate attack, escort and defense duties. Carriers return to their own base and recover a dropped own flag when necessary. Steering and pair separation use stable directions. Shared reverse path fields replace repeated searches across the entire map.

## Map adaptation

Dust II, Ancient, Mirage, Inferno, Overpass and Nuke have new collision masks; Aztec and Anubis use IDs 12 and 13. Existing BR and zombie IDs stay unchanged. The viewport fills its window at 65–100% zoom, and the renderer copies only the visible part of the cached map.

The seven current-map floor plans were traced from the extracted game-depot radar files in [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons/tree/main/images/radars), with metadata from its [radar overview configurations](https://github.com/MurkyYT/cs2-map-icons/tree/main/data/radar_info). The game contains compact collision data, not those radar textures. Doorways, stairs and gray site floors are reconstructed for a 2D collision model. Aztec is an authored approximation of the classic ruins, bridge and water routes. Nuke's lower B site is translated into a separate area connected by ramp/secret routes. These are playable 2D adaptations, not exact 3D CS2 collision maps.

Spawn positions were moved away from the sites. All eight bomb maps have walkable routes from both spawns to both sites. Testing verifies reachability; competitive balance still needs matches with human teams.

## Validation

- `npm test`: launcher, account isolation, cloud persistence and updater unit tests.
- `npm run prepare:game`: packages the single source file and the pinned Supabase client.
- `npm run test:gameplay`: two isolated Electron clients using an in-memory Realtime transport; all 14 modes, authoritative movement/death/score, live TDM purchases, map/session changes, BR landing/cover, presence reconnect after channel/heartbeat failures and safe stale-channel cleanup, remote bot kill cam, fractional health, respawn cleanup, shared prices, all 14 map previews/navigation and CTF capture/return cycles against stationary defenders across eight maps and 32 deterministic seeds. It never authenticates or writes to the live Supabase project.
- The desktop account integration harness also passed existing-account login, case persistence, logout, second-account isolation and Escape behavior.

A separate connection check reached Supabase Auth health (HTTP 200), but WebSocket Realtime subscriptions timed out from the build environment. Live Internet multiplayer and presence therefore remain unverified on the actual service. No production schema, account, RLS policy or release was changed.

A short single-window 1914×1076 software-rendering check at 65% zoom measured approximately 51 FPS before and 57 FPS after on Mirage. This is an environment comparison, not a hardware performance guarantee. Static map creation is separate from steady-state frame drawing.
