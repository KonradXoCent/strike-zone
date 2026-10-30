# Zone Haunt and the Zone Hub style shop

Zone Haunt 0.1.6 is an original 2.5D cooperative investigation beta with twelve locations, fourteen entities and nine evidence types. Up to four investigators share one host simulation. The host chooses zero to three support bots, limited by the remaining crew slots. The game costs 500 Zone Coins in Zone Hub 0.1.13; existing library owners keep their license.

## Garage and equipment

Creating a lobby opens a playable garage. WASD moves, Space picks up the basketball, and holding/releasing the left mouse button throws it. Movement and the ballistic ball are shared with the crew. E near a station opens its board, shop or friend terminal. The top buttons provide the same actions.

The planning board chooses the map, difficulty and bot count. Guests ready up after configuration or supply changes. Map unlocks use the host's Haunt level, so a lower-level friend can accompany the host. Level is 1 + floor(Haunt XP / 250); this progression remains independent of other games.

| Map | Size | Host level |
| --- | --- | --- |
| Willow Cottage | Small | 1 |
| Harvest Eve House | Small / Halloween | 1 |
| Pinewood House | Small | 2 |
| Marsh Chapel | Small | 3 |
| Bramble Farm | Medium | 4 |
| Ironvale Workshop | Medium | 5 |
| Blackthorn Lodge | Medium | 6 |
| Alder Clinic | Medium | 7 |
| Crow Road Motel | Large | 8 |
| Grayhaven Manor | Large | 9 |
| Bellweather School | Very large | 10 |
| Ravenhill Asylum | Very large | 12 |

The board orders maps by grid area. The expanded school includes separate women's and men's restrooms. Breakers are in deeper accessible rooms. Harvest Eve House remains available at level 1 without a seasonal expiry.

Every new contract includes one complimentary team item of all fifteen equipment types, shared once by the crew rather than multiplied per member. The basic kit waits in the van even after a wipe and does not use RP or ZC. Personal stashes and selected contributions contain additional units only; previously owned items are retained as extras. Each owner still receives a one-time 1K Research Points (RP; PB in Polish) balance. Correct identification, evidence, photos and bones earn RP; platform playtime still earns ZC. Buy extras before departure, store up to eight of each and select up to two of a type and sixteen extra units. Players and bots carry four items. Garage reserves remain safe; a total wipe or abandoned contract loses only deployed extras. If anyone survives, those extras return. An ongoing contract keeps its original frozen supplies when the kit migration is applied.

Purchases use server prices and replayable receipt IDs. The same result cannot pay or recover gear twice. A new contract row transfers the returning crew back to one shared garage without reusing an old result or action.

## Investigation controls and difficulty

- WASD movement, left Shift sprint, mouse aiming, F carried flashlight.
- E at the van opens the equipment rack, cameras, activity monitor and photo album. Start with empty hands; keys 1–4 and the wheel select carried equipment.
- Left mouse / R uses or places equipment. Books, cameras, projectors, salt and crucifixes can be put on valid floors, corridors or outside, including the wrong room. Placement does not reveal the haunted room.
- The spirit radio opens a question menu and may stay silent. E interacts with doors, room switches, the breaker, bones, equipment and closets. J opens the journal. The leader selects a conclusion and ends the contract at the van.
- Bots take available thermometers, EMF readers, UV lights or recorders from the start, staggered by two seconds. They inspect different public rooms for 12–20 seconds, report actual observations at a limited rate, return tools and may deploy a book/camera/projector only after multiple checks and an observed lead. They do not know the secret room or confirm journal evidence. Human observation remains necessary. Z orders take priority; a tool already carried by a bot can also be requested from the van rack. During hunts bots seek shelter, and low-composure bots recover in the van.
- Room cameras use panoramic north-up framing that fits the complete room. Corridor lenses remain directional. The feed renders doors, investigators and every placed tool, including writing books and crucifixes; actual walls and closed doors occlude the image.
- Evidence has delayed observation windows and depends on equipment, conditions and human observation. Temperature cools gradually; EMF and freezing require sustained readings. Entity-specific patience and seeded variation make some cases slower. A placed camera does not immediately confirm orbs. The Deceiver has three genuine types and one imitated extra.
- Up to four investigators share one safe closet during hunts. Nearby floor equipment does not override the hide interaction. Bots react with a delay and seek actual available closets. Corridors remain dangerous. If all humans die, surviving bots attempt to evacuate.
- Setup periods are 90/60/35 seconds for Calm/Standard/Nightmare. Nightmare has up to 55-second hunts, faster composure loss and pursuit. Entity speeds differ.

Photos have base bonuses of 50 for the ghost, 25 for the bone and 20 per revealed UV trace, at most two. Collecting the bone adds 25. A target pays once. Correct identification, observed evidence, difficulty and map size determine the final RP/XP payout; a total wipe pays no RP. Photo previews stay local to the photographer; shared records contain metadata.

Entities can switch room lights, cut power, open and close unoccupied doors, manifest, whisper, knock and make footsteps or scraping noises. Distance and walls attenuate positioned events. Original procedural hunt music, EMF beeps, radio interference, equipment, shutter and debrief sounds are generated locally. Speech uses an installed PL/EN voice when available, with visible text and procedural sound alongside it.

## Field sensors, possessions and challenges

The motion sensor, REM-POD and toy car join the twelve existing tools; one of every type is free for each contract. Extra units cost 140, 170 and 65 RP respectively. Placed devices can be recovered with E, respect the four-slot inventory and appear on room cameras.

A motion sensor is green in standby and red for three seconds after the ghost enters its actual 70-unit range with line of sight. It beeps, counts trips and relays readings to the van. A REM-POD uses the same measured level 1–5 while carried or placed, with five colored lights and an increasingly intense tone. Floor units remain audible and visible without opening the van; a nearby HUD readout is also available. Van telemetry relays their lights and levels. Only a real EMF evidence window can produce level 5; lower levels indicate activity. Humans must observe level 5 continuously for three seconds, or five with hard evidence. Bots do not confirm it for the journal. A toy car can be pushed forward or backward during a nearby ghost event and collides with real walls/furniture; this is activity, not a tenth evidence type.

Each map spawns exactly one deterministic random possession in a reachable room, independent of the secret ghost identity. E opens its controls; possession limits belong to the crew. Mirror previews reveal the current haunted room for seven seconds. A second look shatters it and starts a cursed hunt. Ouija accepts location, age, intent and name questions; one person speaks at a time. Closing the board says goodbye and pauses its cumulative timer, but does not reset it. Twenty total conversation seconds break the board and force a hunt. Tarot has ten shuffled, single-use cards: Death/hunt, Tower/power cut, Sun/+20 composure, Moon/−20, Devil/manifestation, Wheel/room change, Hermit/30-second normal-hunt delay, Star/+10 team composure, Magician/power restoration and Hanged One/whispers and activity. Death preserves the remaining cards for after the hunt. Cursed hunts bypass crucifixes and provide six seconds to escape before pursuit can kill.

The journal lists all three canonical evidence types on each ghost's reference card. Models are cosmetic and independent of ghost identity: child, woodsman with an axe, veiled widow, elderly man, nurse and shadow. Hidden entities stay invisible in the van except through an actual camera view or an explicit mirror vision. Hunt audio uses overlapping detuned drones, bowed tones and breath textures rather than a repeating melody.

The host chooses shared challenges before departure. Changing them resets guest readiness; their list is frozen in the contract and included in snapshots. A correct conclusion after at least 30 seconds, with at least one crew survivor, earns a separate RP bonus; failed or wiped contracts receive none. The server recomputes it from stored challenge IDs and bounded base rewards, ignores client reward amounts and credits one ledger receipt per roster member. ZC is unaffected.

| Challenge | Extra RP | Effect |
| --- | ---: | --- |
| No flashlight | 25% | Disables normal flashlights, including bots; UV remains available |
| No power | 25% | Breaker, room lights and power-restoring cards remain off |
| Hard evidence | 30% | Later, shorter proof windows and longer sustained measurements |
| Roaming entity | 25% | Room changes roughly every 65–105 seconds rather than 300–480 |
| Frequent hunts | 35% | Shorter setup and half the normal cooldown |
| No sanity monitor | 15% | Removes composure readings from the van and HUD |
| No activity monitor | 15% | Disconnects the activity graph; field sensors remain usable |

Bonuses add: all seven yield +170% of the base RP payout. Device feedback and cursed-item interactions remain available with monitor challenges. Forced room changes move the entity through the map instead of teleporting it, and the old room warms gradually.

## Accounts, friends and deployment

Mutual Zone Hub friends who own Haunt can be invited from the garage. Invitations have accept/decline actions in the game and platform. Accepting in Zone Hub requires an installed, current game; an already running Haunt refreshes its room, or the platform starts it directly on the same account. Expired, full or already-running lobbies reject new joins.

Tokens remain in renderer memory. Settings and results stay separate from the other games. Signed-in solo investigations save account progression; browser previews are offline practice. The simulation uses its own timer, cached scenery and interpolated remote actors.

Apply `database/zone-haunt.sql` and `database/zone-wallet.sql` before `database/haunt-progression.sql`, then `database/haunt-research.sql` then `database/haunt-operations.sql` and finally `database/haunt-fieldwork.sql`. The research add-on tags legacy ZC results, prevents future RP results from entering a lazy ZC import, refunds prior ZC equipment orders once and seeds RP once. Purchases from an outdated equipment client are rejected until it updates. The add-on retains legacy protocol 1/2 calls and retains protocol 3 for existing contracts and introduces protocol 4 for cursed possessions, sensors and frozen shared challenges. The installed Hub 0.1.13 can accept a protocol 4 invitation using its existing protocol 3 request, then launch the updated game. Old and new lobby protocols cannot mix. Do not reapply an older RPC router migration after these add-ons without reapplying them in order.

Displayed balances, prices and rewards use the common K/M/B/T formatter; stored integers and numeric purchase inputs remain exact.

Private Realtime topics bind state writes to the host and input writes to their participant; an RPC fallback remains. Results are once per frozen roster member with bounded payouts. This is peer-hosted co-op, without an independent authoritative gameplay server.

Compatible game updates replace the small content package through the Zone Hub library. Zone Hub 0.1.13 supplies the paid-game confirmation and platform invitations. Existing game installations, licenses, progress and settings remain available. Published assets are immutable.

## Zone Hub style shop and market

The shop has six theme/background bundles and twelve avatar frames. Each bundle equips its platform theme and profile background separately. Prices, ownership and once-only purchases are server-checked. Frames appear on profiles, the account avatar and friend rows. All purchases use shared ZC.

The market stocks 240 bot listings per game, retains the purchase budget, and uses server pagination of 24 results per page. Strike and Royale inventories and item catalogs remain separate. Strike no longer exposes BR content; previous BR possessions remain with Zone Royale.

Validation covers map connectivity, free equipment placement, delayed evidence, bot support, hiding, gear recovery/loss, replay protection, server prices, map levels, mutual-friend invitations, private sender permissions, three SDK clients in one garage and consecutive contracts, native PL/EN screens, smaller windows and direct Zone Hub SSO. Release checks install actual Windows packages and verify content updates and platform self-updates.

## Artwork sources

Original key art was generated with the built-in image generator and encoded as WebP inside `assets/royale-cover.svg` and `assets/haunt-cover.svg`, keeping existing self-contained asset paths. Application emblems and the style shop use repo-native SVG artwork. No assets from commercial games are distributed.

Royale prompt: premium original stylized 2.5D Battle Royale island cover; pine forests, desert settlement, blue river and bridge, a distant closing storm and parachutes; two original investigators/adventurers in teal and orange utility outfits on the right with a lowered stylized rifle and pickaxe. Sunset rim light, navy/turquoise/amber palette, quiet darker left third for interface copy. No text, logos, commercial characters or watermark.

Haunt prompt: original cooperative 2.5D paranormal game cover; abandoned country house in rainy pine woods at night, investigation van and two adult investigators on the right with flashlights and an EMF meter. Cool fog, navy/teal scene, warm amber van light and subtle eerie lime highlights. Quiet dark left third for menu copy; suspense without gore. No text, borrowed logos, commercial characters or watermark.
