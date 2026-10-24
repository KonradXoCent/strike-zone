# Agents and case contents

The Agent Case contains ten original character cosmetics: five CT and five T agents. Each team has one agent in each of the five rarity tiers. Tier probabilities are 45/28/16/8/3%, split equally between CT and T, so the individual probabilities are 22.5/14/8/4/1.5%. The case costs $5000 and its matching key $1500 in game currency.

Opening uses the existing transactional case presentation. One matching case and key are consumed and one agent is saved before animation starts; recovering an unfinished presentation never grants another item. Agents have no StatTrak variant. They are stored under `profile.agents = {items, eq: {CT, T}}` in the existing account JSON, leaving weapon inventories and the legacy BR cosmetics intact. This feature adds no tables, changes no authentication or RLS policy, and requires no database migration. It follows the existing ordinary-case profile-save model.

Inventory has an Agents category with CT/T filters, duplicates, owned-item equip buttons and reversible default appearances. The weapon loadout portrait also links to this category. Only owned agents matching the requested team can be equipped. New profiles receive no free agent. Agent models use the same body footprint and held-weapon/glove poses; they do not change health, movement or hitboxes. Infected Zombie Mode characters retain their zombie rendering.

Original uniform palettes and helmet, hood, scarf, bandana, beret, mask and visor details appear both in the front-view portrait and in the top-down match model. Match rendering caches the static body artwork. Cosmetic IDs are allowlisted per team in transport, and full snapshots replicate the selected appearance. Football replay rosters retain the recorded agent rather than using the current profile's selection.

Ordinary case prices are now three times their previous prices. Their key prices are unchanged. Community Forge retains its server-managed price, and Halloween candy prices are unchanged. Agent cosmetics are a separate collection and do not enter the existing weapon market, contracts, upgrader or item-trade selectors.

Ordinary weapon, knife, BR, glove, music and agent content dialogs use a bounded grid with internal scrolling and an accessible close button. The chat trigger hides while these dialogs are open so it cannot cover Close. Escape closes the dialog. The same sizing is applied after the asynchronous Community Forge contents load.

## Validation

- `tests/agents-data.test.cjs`: catalogue/odds, ownership/team restrictions, one-time reward, missing funds/resources, invalid randomness, save roundtrip and transport allowlists.
- `npm run test:agents`: actual purchases and opening/recovery, owned equipment, separate local profiles, ten visually distinct match models, both languages and dialogs at 1920×1080, 900×600, 400×760 and 680×480.
- `npm run test:preview`: the real SDK writes and reloads the agent reward and CT equipment through the existing authenticated save route; an owner-scoped SQL read confirms the JSON. This uses isolated HTTP/Postgres fixtures, without changing production accounts.
- `npm run test:network`: both lobby-code and server-list entry replicate host/guest agents and change the visible agent on a team switch. It uses actual SDK clients with isolated transport.
- Windows feature checks build a standalone HTML preview and isolated `1.5.4-test.5` installer. Public publishing remains a separate operation.
