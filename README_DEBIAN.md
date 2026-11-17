# Zone Hub for Debian

This branch adds a native amd64 Debian package for the Zone Hub 0.1.27 release.

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

Strike Zone 2D, Zone Royale and Zone Haunt are currently distributed as Windows game packages. This branch starts those packages through Wine. Zone Football, Zone Zombie and Zone Studio are bundled with the Electron Hub and run through the native Linux Electron runtime.

Wine is recommended by the package. When it is not installed, the Hub reports that Wine is required; install it with:

```bash
sudo apt install wine
```

The Linux build uses the independent `zonehub-debian-v*` update channel and Linux metadata file `zonehub-linux.yml`. It does not replace the existing Windows installer or Windows update channel.

## Scope

- Debian amd64 package; this is not an ARM build.
- Existing Supabase accounts, wallet, catalog and cloud pack management are unchanged.
- The first Linux release is based on the public Zone Hub 0.1.27 / Zone Football 0.6.1 source.
- Wine compatibility of the Windows-only game packages must be confirmed on the target Debian machine; Windows packages are not native Linux builds.
