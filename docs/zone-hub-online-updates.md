# Zone Hub online updates

From 0.1.2, the platform's NSIS installer contains the platform alone. Strike Zone and Zone Royale are separate verified ZIP downloads. Game versions, game installations and user data live outside the platform installation directory. The platform's app ID and `ZoneHub` user-data path stay unchanged.

An installed 0.1.1 already understands the `zonehub-vX.Y.Z` channel. Publishing the tested 0.1.2 installer, blockmap and `zonehub.yml` enables its existing update screen; users do not need to download another installer in a browser. The Windows integration check installs the original 0.1.1, signs in to an isolated account, downloads the actual new installer through electron-updater and verifies the silent update preserves login, preferences and installed-game files.

The authenticated home RPC returns published `zh_games` rows. The platform refreshes them every 15 seconds and registers new validated game definitions while running. Existing runtimes are retained; source changes wait until their download/game is idle. The server's existing read-only RLS policy remains in place: players cannot publish or alter game installation definitions.

To add a future game, publish a protocol-1 managed executable ZIP and a manifest in the same trusted GitHub repository. Add its row with title, descriptions, tags, free/published flags and `package_config`:

```json
{"protocol":1,"executable":"MyGame.exe","manifestName":"my-game-manifest.json","releasePrefix":"my-game-v"}
```

The manifest is the same schema used by the existing games (`schema`, `game`, `version`, `bytes`, `sha256`, `executable`, `url`). The game ID must match the catalog row. Optional `coverImage` is an inline PNG/JPEG/WebP data URI up to 400,000 characters; unconfigured titles use a built-in generic cover. No platform rebuild is needed for additional games or new game versions using this protocol.

Platform updates use `zonehub-v`; game releases use their own validated prefixes. The release job publishes game assets before making the platform update available and never replaces differing assets in an already-public release. Game downloads verify SHA256, archive CRCs and safe paths, and preserve the previous installation if an update fails.

`zonehub-beta.yml` runs focused Windows checks on the feature branch. Publication is enabled only for a final commit whose message begins `release: Zone Hub beta `. Other pushes test and build without publishing. Existing standalone Strike Zone EXEs and `latest.yml` are not replaced by this beta workflow.
