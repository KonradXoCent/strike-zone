# Zone Haunt and the Zone Hub style shop

Zone Haunt is an original 2.5D cooperative investigation beta, inspired by the ghost-hunting genre. It is not a complete recreation of Phasmophobia. Three locations, eight entities and seven evidence types form the first playable release. Up to four investigators share one host simulation; empty slots can be filled with investigative bots.

- WASD movement, left Shift sprint, mouse aiming, F flashlight.
- Keys 1–7 or the wheel select EMF, thermometer, UV, spirit radio, writing book, video camera and laser projector.
- Left mouse / R uses or places equipment. E interacts with doors, breaker and closets; near the van it opens the journal.
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
