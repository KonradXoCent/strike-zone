# Strike Zone 2D — owner map editor

The verified owner can open **Workshop → Main map pool** and edit the existing
native layouts. Authorization uses the authenticated account and
`sz_core_map_owners`, rather than a nickname or owner code.

Select and drag walls, covers, windows, spawns and bombsites. Delete removes an
obstacle; required objectives can be moved. Undo/redo, drafts, JSON export/import
and bot tests preserve native geometry. Bot tests award no account progress.

- **Release new revision** updates the selected map in its current pools.
- **Release as new map** opens the name and compatible-mode selector. The new
  map has its own stable ID and revision history; the source keeps its layout.

Definitions and revisions refresh before the normal loading screen, through
Realtime notifications and periodic refresh. Running matches retain their
frozen revisions. Lobby starts carry validated geometry and copy definitions;
snapshots carry revision references and compact barrier HP. Minigame transitions
send the matching definition before snapshots, including custom stadiums.

Wooden boards and metal vents block actors, shots and grenades while intact.
Actual shots, knives and HE explosions damage them; wood can burn. Breaking
updates collision and bot navigation. Bots can open a sealed route. Barriers
reset next round. A vent over a window retains the underlying sill.

Wood and metal have distinct synthesized sounds with spatial attenuation,
panning and the existing mute/SFX controls. Repeated snapshots and late joins
do not replay historical sounds; round resets are silent.

2.5D appearance preserves the top-down gameplay and collision footprint.
Static detail uses cached canvas rendering; F8 compares the appearance.
The game's name remains **Strike Zone 2D**.

The four `20261026` owner-map migrations were applied to the configured project
before release. Fresh projects need the same RLS, grants and publication setup.
No service key is bundled. Map creation is atomic and supports request retries.

`npm run test:core-maps` uses portable canvas/DOM logic checks, isolated accounts
and an in-memory packet bus. It covers all 34 native layouts and their copies,
edits, publication, frozen revisions, cold joins, minigame transitions, bot
state, destruction, distinct audio graphs and refresh before loading. It makes
no writes to live accounts or the public map catalog.
