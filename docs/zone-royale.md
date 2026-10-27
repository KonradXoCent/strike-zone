# Zone Royale beta 0.1.0

Zone Royale is a separate free game in Zone Hub, built on the existing Strike Zone 2D Battle Royale simulation and 2.5D renderer. It deliberately shares the account, saved wallet and owned cosmetics with Strike Zone. It does not duplicate inventory items or grant missing cosmetics.

The new lobby has a character platform, three island choices, party slots, a room code, guest readiness and a host start gate. Solo matches fill the remaining 35 slots with bots. Multiplayer uses the existing host-authoritative simulation and Supabase Realtime SDK; BR rooms have a separate `zr-` namespace. Plane travel, parachutes, weapon and grenade loot, healing, armor, destructible loot crates, airdrops and the closing storm come from the complete existing BR engine. The Locker lists only owned outfits and parachutes. Weapon skins use the existing inventory and loadout rules.

The platform downloads/verifies/installs this game independently from Strike Zone. Its update channel is `royale-vX.Y.Z`, with `zonehub-royale-manifest.json` and `ZoneRoyale.exe`. This beta is bundled in the platform installer so it can be installed without publishing a game release. Future standalone releases must include the manifest and its referenced ZIP.

Zone Hub passes the verified session through the existing authenticated Windows named pipe (anonymous pipe on other platforms). Zone Royale opens directly into its game window. Tokens are not command-line arguments, environment variables or browser persistent storage. Only one managed game can run at once, avoiding conflicting saves to the shared account. Closing Zone Royale returns to the platform.

## Validation

- `npm run prepare:game && npm run test:royale` runs two native Electron renderers with the shipped Supabase SDK and an isolated Phoenix transport: three islands, bots, owned-only cosmetics, shared session, remote landing/movement/loot and return to the same lobby.
- `npm run test:platform-ui` checks password recovery, both library games, friends, private/public inventories, two-client atomic trades and secure account handoff into both games.
- `node scripts/zone-hub-install-smoke.cjs --bundled` installs and opens each actual bundled ASAR archive inside Electron after packaging. Ordinary Node tests cannot reproduce Electron's ASAR filesystem interception.

These are controlled integration checks, not a measurement of Internet latency or a large-player load test. This is an unpublished beta; the existing live Strike Zone release remains unchanged.
