# Zone Hub beta

Zone Hub is a separate Windows application. Strike Zone 2D retains its existing launcher, account, game data and standalone distribution. Version 0.1.0 is a test build; this branch does not publish a platform or game release.

## Player flow

1. Check the `zonehub-v…` application release channel before initializing the account session. Required updates show download and restart actions. Connection failures show Retry.
2. Sign in with the existing Strike Zone email and password, or register an account.
3. Add the free Strike Zone game to the cloud library and install its verified game package.
4. Check the game's latest published version before each launch. Mandatory updates block Play.
5. Start the existing Strike Zone launcher. An anonymous pipe passes the verified account session; the launcher and game need no second sign-in. The parent refreshes the session, while child clients keep it in memory.

The managed game has an isolated desktop storage path, so the ordinary installed launcher and its updater retain their existing behavior. Installing game updates replaces only the managed game package. Profiles and cloud saves are retained by uninstalling the game.

## Social and inventory

Profiles, bio, comments, game achievements and platform levels use `public.zone_hub`. Friends use the existing consent-based `sz_friends` protocol. Platform XP is computed from owned games (100 XP) and actual saved achievements (50 XP); each level costs 250 XP.

Profile visibility and inventory visibility are separate: public, mutual friends, or private. Inventory defaults to private. The server checks privacy before returning inventory, including direct API calls. Gallery art and item names are generated from the current game with `node scripts/hub-items.cjs`. Workshop-owned skins are listed as non-tradable, matching their existing ownership model.

A platform trade requires both players online in Zone Hub and a mutual friendship. Each side selects one owned item. Both confirm the same offer revision; editing an item clears confirmations. Offers expire after 15 minutes, can be cancelled and are visible only to participants. The server checks ownership again and changes both saves in one transaction. Duplicates and StatTrak counters are handled per the game's current ID-based inventory model. An inventory epoch prevents a stale game save from restoring an item that was traded. The updated game reconciles authoritative inventory changes while preserving match statistics.

No paid checkout, payment processor, third-party title or invented game is included in this first beta. Additional games need their real distributable package and a game adapter before publication.

## Build and verify

- `npm ci`
- `npm test` and `npm run check:ui`
- `npm run prepare:game && npm run test:platform-ui` exercises real desktop sign-in, public/private inventories, two clients trading against PostgreSQL rules, and game handoff over inherited pipes.
- `npm run dist:platform` builds `dist-platform/ZoneHub-Beta-0.1.0.exe`, including a seed game package for testing before the new game release is public.
- Database source: `database/zone-hub.sql`, `zone-hub-achievements.sql`, `zone-hub-community.sql`, and `zone-hub-items.sql`.

## Release channels

The normal game release pipeline additionally builds `StrikeZone-Platform-VERSION.zip` and `zonehub-game-manifest.json`. The manifest pins its byte length and SHA-256. Downloaded ZIPs reject path traversal, duplicate Windows filenames, symlinks, oversized extraction and invalid CRCs. Extraction happens in staging before committing the installed-version pointer; a failed update keeps the earlier installation.

Platform releases have a separate version in `platform/package.json` and tags `zonehub-vVERSION`. After approving a tested platform build, explicitly run `node scripts/publish-platform.cjs`; it uploads the NSIS installer, blockmap and `zonehub.yml` under that tag. Ordinary game releases do not change the platform application version. Never publish a beta build just to refresh the game.
