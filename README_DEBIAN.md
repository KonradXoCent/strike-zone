# Zone Hub for Debian

This branch builds a native amd64 Debian package for Zone Hub 0.1.30.

## Build

```bash
npm ci --no-audit --no-fund
node scripts/ensure-generated.cjs
npm run prepare:game
node scripts/build-platform-linux.cjs
```

The build writes `dist-linux/zonehub.deb` and `dist-linux/zonehub-linux.yml`.

## Install

After the release artifact has been published:

```bash
sudo apt install ./zonehub.deb
```

Strike Zone 2D, Zone Royale and Zone Haunt are Windows game packages launched through system Wine or the Flathub Wine app (`org.winehq.Wine`). The Linux launcher sends the account session over a one-shot authenticated TCP channel bound only to `127.0.0.1`; the session token is not placed in process arguments or environment variables. For Flathub Wine, Zone Hub grants network access for this loopback channel and read-only access only to the selected game's version directory. It does not grant access to the whole home directory.

To install the Flathub version:

```bash
flatpak install flathub org.winehq.Wine
```

Zone Football, Zone Zombie and Zone Studio are bundled with the Electron Hub and run through the native Linux Electron runtime.

The Linux build uses the independent `zonehub-debian-v*` update channel and Linux metadata file `zonehub-linux.yml`. It does not replace the existing Windows installer or Windows update channel.

## Scope

- Debian amd64 package; this is not an ARM build.
- Existing Supabase accounts, wallet, catalog and cloud pack management are unchanged.
- Zone Hub 0.1.30 includes the Wine GUI IPC handoff fix. The Windows game packages receive matching content-only updates.
- Wine compatibility of the Windows-only game packages must be confirmed on the target Debian machine; Windows packages are not native Linux builds.
