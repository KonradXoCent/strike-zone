# Zone Royale beta 0.1.0

Zone Royale is a separate free game in Zone Hub, built on the existing Strike Zone 2D Battle Royale simulation and 2.5D renderer. It deliberately shares the account, saved wallet and owned cosmetics with Strike Zone. It does not duplicate inventory items or grant missing cosmetics.

The new lobby has a character platform, three island choices, party slots, a room code, guest readiness and a host start gate. Solo matches fill the remaining 35 slots with bots. Multiplayer uses the existing host-authoritative simulation and Supabase Realtime SDK; BR rooms have a separate `zr-` namespace. Plane travel, parachutes, weapon and grenade loot, healing, armor, destructible loot crates, airdrops and the closing storm come from the complete existing BR engine. The Locker lists only owned outfits and parachutes. Weapon skins use the existing inventory and loadout rules.

The platform downloads/verifies/installs this game independently from Strike Zone. Its update channel is `royale-vX.Y.Z`, with `zonehub-royale-manifest.json` and `ZoneRoyale.exe`. This beta is bundled in the platform installer so it can be installed without publishing a game release. Future standalone releases must include the manifest and its referenced ZIP.

Zone Hub passes the verified session through the existing authenticated Windows named pipe (anonymous pipe on other platforms). Zone Royale opens directly into its game window. Tokens are not command-line arguments, environment variables or browser persistent storage. Only one managed game can run at once, avoiding conflicting saves to the shared account. Closing Zone Royale returns to the platform.

## Validation

- `npm run prepare:game && npm run test:royale` runs two native Electron renderers with the shipped Supabase SDK and an isolated Phoenix transport: three islands, bots, owned-only cosmetics, shared session, remote landing/movement/loot and return to the same lobby.
- `npm run test:platform-ui` checks password recovery, both library games, friends, private/public inventories, two-client atomic trades and secure account handoff into both games.
- `node scripts/zone-hub-install-smoke.cjs --bundled` installs and opens each actual bundled ASAR archive inside Electron after packaging. Ordinary Node tests cannot reproduce Electron's ASAR filesystem interception.

`node scripts/zone-hub-install-smoke.cjs --bundled --live-feed` optionally repeats the full temporary installation against the real public GitHub release feed, without accessing any player account. The normal CI fixture stays deterministic. Public release lists have a separate bounded size allowance from small package manifests.

These are controlled integration checks, not a measurement of Internet latency or a large-player load test. This is an unpublished beta; the existing live Strike Zone release remains unchanged.


## Frontier expansion — 0.1.9

Frontier Island now contains fourteen named landing areas, 26 reachable buildings and 32 extra cover props. Eight smaller sites join the six original districts: Westbank Depot, Canal Village, Rivergate Outpost, Harbor Exchange, Copperworks, Redstone Quarry, Whisper Camp and Southwatch Observatory. Extra sites have themed scenery and two supply caches; original districts keep four. Six original reboot vans remain. World dimensions stay 4096 × 3072 and scenery uses the existing cached canvas renderer.

Apply `database/zone-royale-frontier.sql` after the existing ranked queue upgrade. Matchmaking remains protocol 5 and stores a separate immutable `world_revision`: older clients default to 1, new clients request 2. Waiting pools and party joins partition by revision as well as mode/ranked/map. Existing running matches and progression rules are retained. Party presence and start/snapshot handshakes reject mismatched island versions before shared play. All formats, fill settings, cards, van revivals and ranks remain unchanged.

The standalone Royale release workflow tests geometry and PostgreSQL, actual two-/three-client matches, all squad formats, ownership/appearance, SSO, Windows package installation and a content-only update before publication. Zone Hub itself does not need a new installer.
