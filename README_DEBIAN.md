# Zone Hub for Debian

This branch adds a native amd64 Debian package for Zone Hub 0.1.29.

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

Strike Zone 2D, Zone Royale and Zone Haunt are currently distributed as Windows game packages. On Linux, the launcher starts them with either system Wine or the Flathub Wine app (`org.winehq.Wine`). If both are installed, system Wine is preferred. For Flatpak Wine, Zone Hub grants read-only access only to the selected game's version directory; it does not grant access to the whole home directory.

To install the Flathub version:

```bash
flatpak install flathub org.winehq.Wine
```

Zone Football, Zone Zombie and Zone Studio are bundled with the Electron Hub and run through the native Linux Electron runtime.

The Linux build uses the independent `zonehub-debian-v*` update channel and Linux metadata file `zonehub-linux.yml`. It does not replace the existing Windows installer or Windows update channel.

## Scope

- Debian amd64 package; this is not an ARM build.
- Existing Supabase accounts, wallet, catalog and cloud pack management are unchanged.
- The Linux 0.1.28 release includes Zone Hub 0.1.27 / Zone Football 0.6.1 content with Linux launcher fixes for system and Flathub Wine.
- Wine compatibility of the Windows-only game packages must be confirmed on the target Debian machine; Windows packages are not native Linux builds.
