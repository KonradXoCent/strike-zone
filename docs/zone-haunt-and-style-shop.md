# Zone Haunt and the Zone Hub style shop

Zone Haunt is an original 2.5D cooperative investigation beta, inspired by the ghost-hunting genre. It is not a complete recreation of Phasmophobia. Version 0.1.1 has seven different locations, fourteen entities and nine evidence types. Up to four investigators share one host simulation; empty slots can be filled with investigative bots.

- WASD movement, left Shift sprint, mouse aiming, F flashlight.
- E at the van opens the equipment rack, cameras, activity monitor and photo album. Start with empty hands. Players and bots can carry four items; keys 1–4 and the wheel select carried equipment. F toggles a carried flashlight.
- Left mouse / R uses or places equipment. The spirit radio opens a question menu. E interacts with doors, room switches, the breaker, bones, equipment and closets. J opens the journal. Z gives orders to bots.
- J opens the evidence journal. Select a conclusion and return to the van; the leader ends the job.
- Closed occupied closets are safe during hunts. Bots find real closets and investigate rooms with the same evidence tools as players.
- Original procedural hunt music, footsteps, radio interference, entity whispers, equipment, evidence, doors and debrief sounds are synthesized locally.
- Simulation uses its own timer so hiding the host's window does not stop the session. Rendering is separate, with cached room scenery and interpolated remote actors.
- Authentication is inherited from Zone Hub. Tokens remain in renderer memory. Settings and results are isolated from the other games. Signed-in solo runs create a private one-person contract and can save progression; browser previews run as offline practice.
- Lobby and result RPCs use the caller's Auth identity. Private Realtime topics bind state writes to the leader and input writes to the corresponding participant. A bounded RPC fallback remains available if Realtime is unavailable. Results are once per frozen roster member; this is peer-hosted co-op, not a dedicated authoritative server.

Strike Zone 2D no longer offers BR in mode selection, inventory, cases, tips or achievements. Existing BR possessions are retained for Zone Royale. MVP music and gloves remain in Strike.

The style shop has six paid bundles (Halloween, Aurora, Mirage, Nebula, Ocean depths and Sakura) and six frames (Halloween, Ember, Ice crystal, Royal laurel, Neon circuit and Forest guard). Existing free themes remain. Each bundle unlocks a platform theme and profile background, equipped separately. Server catalog prices, ownership checks and a once-only purchase protect every SKU. Avatar frames appear on profiles, the account avatar and mutual friend rows.

The market stocks 240 bot listings per game while retaining the existing purchase budget. Strike offers draw from its larger item pool; Royale has several differently priced seller offers for each of its smaller cosmetic catalog. Pagination still uses actual server results, 24 per page, and filters can produce fewer pages.

Apply `database/zone-hub-cosmetics.sql` after the existing account schema, then `database/zone-haunt.sql`. Refresh the market function with `database/zone-hub-market-stock.sql`. The Haunt catalog row starts unpublished; enable it only after its Windows package has been verified and released. Published assets must not be replaced. The new Royale application icon intentionally requires a full game package once; subsequent compatible updates use the small content package.

Validation includes entity/evidence, map connectivity, hiding safety, bot routes, SQL authorization and once-only results, purchases and equip scopes, actual populated market pages, native PL/EN UI, three SDK clients through a SQL-authorized private broker, guest leave behavior and direct Zone Hub SSO. Release checks also install and verify all three Windows packages.

## Artwork sources

Original key art was generated with the built-in image generator and encoded as WebP inside `assets/royale-cover.svg` and `assets/haunt-cover.svg`, keeping existing self-contained asset paths. Application emblems and the style shop use repo-native SVG artwork. No assets from commercial games are distributed.

Royale prompt: premium original stylized 2.5D Battle Royale island cover; pine forests, desert settlement, blue river and bridge, a distant closing storm and parachutes; two original investigators/adventurers in teal and orange utility outfits on the right with a lowered stylized rifle and pickaxe. Sunset rim light, navy/turquoise/amber palette, quiet darker left third for interface copy. No text, logos, commercial characters or watermark.

Haunt prompt: original cooperative 2.5D paranormal game cover; abandoned country house in rainy pine woods at night, investigation van and two adult investigators on the right with flashlights and an EMF meter. Cool fog, navy/teal scene, warm amber van light and subtle eerie lime highlights. Quiet dark left third for menu copy; suspense without gore. No text, borrowed logos, commercial characters or watermark.


## Zone Haunt 0.1.1

The zero-second debrief on a second contract was caused by replaying the previous extraction action. Enter/leave now clear command counters, result dialogs, local input, old snapshots and channels. Async reward completion is bound to its original contract. Native checks complete a contract, return, select a new map/difficulty and start again, including three actual SDK clients.

Maps have separate dimensions and wall grids: Pinewood House, Alder Clinic, Ironvale Workshop, Willow Cottage, Blackthorn Lodge, Bellweather School and Marsh Chapel. Room-specific switches and a shared breaker control lighting; entities can cut the power. Outside line of sight stays dark. The flashlight and UV beam stop at walls and closed doors. The van does not show the entity's world position; a placed camera only shows its physical view. Static scenery remains cached.

Twelve rack items compete for four inventory slots: flashlight, EMF, thermometer, UV flashlight, spirit radio, writing book, video camera, laser projector, crucifix, salt, audio recorder and photo camera. A crucifix can prevent two nearby hunt starts and does not cancel an ongoing hunt. Cameras are placed in the building, then watched from the van. Salt and resonance add two evidence types. The Deceiver has three genuine evidence types and one additional imitated type; its journal candidate remains possible with four readings.

Photos award 50 for the ghost, 25 for the bone and 20 per revealed UV trace (at most two). Collecting the bone adds 25. A target pays once per contract. Team rewards use a separate Haunt balance, never the Strike/Royale wallets. The server freezes recipients, deduplicates photo targets, limits the payout, requires at least 30 seconds and stores each participant's result once. Photo image previews are local to the photographer; shared records contain only metadata.

Bots physically fetch/deliver equipment, test temperatures, set up cameras/crucifixes, repair power and regroup. They report measured readings and prioritize real closets during hunts. Corridors are now dangerous, too. Nightmare has 18 seconds of preparation, up to 55-second hunts, faster composure loss and pursuit; entities have distinct base speeds. Spirit replies use local speech synthesis when a suitable installed voice is available, with procedural radio interference and visible text. Ambient sound, EMF beeps, doors, switches, equipment, shutter and hunt music are generated locally.

The match protocol is 2; old and new lobbies cannot be mixed. Existing 0.1.0 progression remains available. Release `haunt-v0.1.1` updates only the game through the existing Zone Hub library and preserves the runtime when compatible. No new Hub installer is required.
