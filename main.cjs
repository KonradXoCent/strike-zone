'use strict';
const { app, BrowserWindow, Menu, ipcMain, protocol, net, session, safeStorage, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { resolveAsset } = require('./core/protocol.cjs');
const { loadConfig } = require('./core/config.cjs');
const { UpdateController } = require('./core/updater.cjs');
const { AccountController } = require('./core/account.cjs');
const { FriendsController } = require('./core/friends.cjs');
const { Controller: SocialController } = require('./shared/social.js');
const { preferences } = require('./core/preferences.cjs');
const { createAuthStorage } = require('./core/auth-storage.cjs');
const { launcherBounds } = require('./core/window-size.cjs');
const platformManaged=process.argv.includes('--zonehub-managed');
const platformBridge=platformManaged?new(require('./core/platform-bridge.cjs').PlatformBridge)():null;
if(require('./package.json').platformOnly===true&&!platformManaged)app.exit(1);
const desktopTest = require('./package.json').desktopTest === true;
const royaleStandalone=require('./package.json').brStandalone===true;
const productName=royaleStandalone?'Zone Royale':'Strike Zone 2D';

app.setName(productName);
app.setAppUserModelId((royaleStandalone?'pl.konradxocent.zoneroyale':'pl.konradxocent.strikezone.desktop') + (platformManaged?'.zonehub':desktopTest?'.test':''));
// Keep this path and the strikezone://app origin unchanged between releases.
app.setPath('userData', path.join(app.getPath('appData'), royaleStandalone?'ZoneRoyale-Managed':platformManaged?'StrikeZone2D-Managed':desktopTest?'StrikeZone2D-Test':'StrikeZone2D'));
protocol.registerSchemesAsPrivileged([{ scheme: 'strikezone', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true
} }]);

let launcher = null;
let game = null;
let controller = null;
let account = null;
let friends = null;
let social = null;
let prefs = null;
let closingGame = null;
let backend = { phase: 'checking' };
let configError = false;
const root = __dirname;
const LAUNCHER_URL = 'strikezone://app/launcher/index.html';
const GAME_URL = 'strikezone://app/game/'+(royaleStandalone?'royale.html':'index.html');
const gameSource = fs.readFileSync(path.join(root, 'game/index.html'), 'utf8');
const supabaseUrl = gameSource.match(/const SB_URL='(https:\/\/[a-z0-9]+\.supabase\.co)'/)?.[1];
const supabaseKey = gameSource.match(/SB_KEY='([^']+)'/)?.[1];

function snapshot() {
  const user = account.snapshot();
  return { update: controller.snapshot(), account: user, friends: friends.snapshot(user.authenticated ? user.user.id : null), preferences: prefs.get(), backend, configError, gameRunning: !!game,platformManaged };
}
function broadcast() {
  if (launcher && !launcher.isDestroyed()) launcher.webContents.send('launcher:state', snapshot());
}
function trusted(event, url) {
  if (!event.senderFrame || event.senderFrame.url !== url) throw new Error('Odmowa dostępu.');
  const expected = url === LAUNCHER_URL ? launcher : game;
  if (!expected || event.sender !== expected.webContents) throw new Error('Odmowa dostępu.');
}
async function checkBackend() {
  backend = { phase: 'checking' }; broadcast();
  try {
    if (!supabaseUrl) throw new Error('No backend');
    const response = await net.fetch(supabaseUrl + '/auth/v1/health', { signal: AbortSignal.timeout(8000) });
    backend = { phase: response.status < 500 ? 'online' : 'offline' };
    await response.body?.cancel();
  } catch { backend = { phase: 'offline' }; }
  broadcast();
}
function protectWindow(win, expectedUrl) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== expectedUrl) event.preventDefault(); });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
}
function showManagedWindow(win) {
  const reveal=()=>{if(win.isDestroyed())return;if(win.isMinimized())win.restore();win.show();win.focus();if(platformManaged&&win.isVisible())platformBridge.send('ready',{userId:account.snapshot().user.id});};
  reveal();setTimeout(reveal,100);
}
function createLauncher() {
  launcher = new BrowserWindow({ ...launcherBounds(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea),
    title: 'Strike Zone 2D — Launcher', titleBarStyle: 'hidden', backgroundColor: '#101418',
    icon: path.join(root,royaleStandalone?'assets/royale-icon.png':'assets/icon.png'), show: false,
    webPreferences: { preload: path.join(root, 'preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  protectWindow(launcher, LAUNCHER_URL);
  launcher.once('ready-to-show', () => {if(!royaleStandalone)showManagedWindow(launcher);});
  launcher.webContents.on('did-finish-load', () => { broadcast(); checkBackend(); controller.check(); });
  launcher.on('closed', () => { launcher = null; if (game) closeGame().finally(() => app.quit()); });
  launcher.loadURL(LAUNCHER_URL);
}
async function openGame() {
  if (game) { game.focus(); return snapshot(); }
  // Enforce the gate in the main process too, including direct IPC calls.
  await controller.check();
  if (!controller.canPlay()) return snapshot();
  if (!await account.validate()) return snapshot();
  if (!account.snapshot().authenticated || account.busy) return snapshot();
  if (game) { game.focus(); return snapshot(); }
  const startFullscreen = prefs.get().fullscreen;
  game = new BrowserWindow({ width: 1440, height: 900, minWidth: 960, minHeight: 640,
    fullscreen: startFullscreen,
    title: productName, backgroundColor: '#10141b', autoHideMenuBar: true,
    icon: path.join(root,royaleStandalone?'assets/royale-icon.png':'assets/icon.png'), show: false,
    webPreferences: { preload: path.join(root, 'game-preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false,
      backgroundThrottling: false }
  });
  const win = game;
  friends.setGameRunning(true);platformBridge?.send('game',{running:true});
  protectWindow(win, GAME_URL);
  win.once('ready-to-show', () => { if (startFullscreen) win.setFullScreen(true); else win.maximize(); showManagedWindow(win); launcher?.hide(); broadcast(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if (input.control && input.shift && input.key.toLowerCase() === 'l') { event.preventDefault(); closeGame(); }
  });
  win.on('close', event => { if (!win.__mayClose) { event.preventDefault(); closeGame(); } });
  win.on('closed', () => { game = null;platformBridge?.send('game',{running:false});friends.setGameRunning(false); friends.refresh();if(platformManaged||royaleStandalone){app.quit();return;}launcher?.show();launcher?.focus();broadcast();controller.check(); });
  win.webContents.on('did-fail-load',()=>platformBridge?.send('failed',{code:'HUB_WINDOW'}));
  win.webContents.on('render-process-gone',()=>platformBridge?.send('failed',{code:'HUB_WINDOW'}));
  win.loadURL(GAME_URL);
  broadcast();
  return snapshot();
}
async function closeGame() {
  if (!game) return;
  if (closingGame) return closingGame;
  const win = game;
  closingGame = (async () => {
    try {
      await Promise.race([
        win.webContents.executeJavaScript('window.szDesktopFlush ? window.szDesktopFlush() : false'),
        new Promise(resolve => setTimeout(resolve, 4500))
      ]);
    } catch { /* The game's own local save remains in its persistent profile. */ }
    if (!win.isDestroyed()) { win.__mayClose = true; win.close(); }
  })();
  try { await closingGame; } finally { closingGame = null; }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const win = game || launcher; if (win?.isMinimized()) win.restore(); win?.show(); win?.focus(); });
  app.whenReady().then(async () => {
    let config;
    try { config = loadConfig([path.join(root, 'updates.json')]); }
    catch { config = { enabled: false, required: true }; configError = true; }
    if (desktopTest||platformManaged) { config = { enabled: false, required: false }; configError = false; }
    controller = new UpdateController({ updater: require('electron-updater').autoUpdater,
      config, version: app.getVersion(), packaged: app.isPackaged });
    const client = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseKey, {
      auth: { storage:platformManaged?undefined:createAuthStorage(path.join(app.getPath('userData'),'account-session.json'),safeStorage),
        storageKey: 'strikezone-desktop-account', persistSession:!platformManaged,autoRefreshToken:!platformManaged, detectSessionInUrl: false },
      global: { fetch: (url, options) => net.fetch(url, { ...options, signal: options?.signal || AbortSignal.timeout(15000) }) }
    });
    account = new AccountController(client);
    friends = new FriendsController(client);
    fs.mkdirSync(app.getPath('userData'),{recursive:true});
    prefs = preferences(path.join(app.getPath('userData'), 'desktop-preferences.json'));
    social = new SocialController(client);
    const toBoth = (channel, value) => { for (const win of [launcher, game]) if (win && !win.isDestroyed()) win.webContents.send(channel, value); };
    social.subscribe(value => toBoth('social:state', value));
    friends.on('state', () => { const user = account.snapshot(); toBoth('friends:state', friends.snapshot(user.authenticated ? user.user.id : null)); });
    friends.on('state', broadcast);
    account.on('state', () => {
      broadcast();
      // Auth callbacks hold the SDK lock; subscribe outside that callback.
      setTimeout(() => { friends.setAccount(account.snapshot()); social.setAccount(account.snapshot()); }, 0);
    });
    account.on('session', value => {
      if (!game || game.isDestroyed()) return;
      if (value) game.webContents.send('game:session', value);
      else closeGame();
    });
    controller.on('state', broadcast);
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      callback(contents === game?.webContents && ['fullscreen', 'pointerLock'].includes(permission));
    });
    const connect = supabaseUrl ? `${supabaseUrl} ${supabaseUrl.replace('https:', 'wss:')}` : '';
    protocol.handle('strikezone', async request => {
      const file = resolveAsset(root, request.url);
      if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
      try {
        const response = await net.fetch(pathToFileURL(file).href);
        const headers = new Headers(response.headers);
        const isGame = new URL(request.url).pathname.startsWith('/game/');
        headers.set('Content-Security-Policy', isGame
          ? `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' ${connect}; object-src 'none'; base-uri 'none'; frame-src 'none'`
          : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'");
        headers.set('Cache-Control', 'no-store');
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
      } catch { return new Response('Not found', { status: 404 }); }
    });
    ipcMain.handle('launcher:state', event => { trusted(event, LAUNCHER_URL); return snapshot(); });
    ipcMain.handle('launcher:friends-refresh', async event => { trusted(event, LAUNCHER_URL); await friends.refresh(); return snapshot(); });
    ipcMain.handle('launcher:friend-action', async (event, action, args) => { trusted(event, LAUNCHER_URL); await friends.command(action, args); return snapshot(); });
    ipcMain.handle('launcher:play', event => { trusted(event, LAUNCHER_URL); return openGame(); });
    ipcMain.handle('launcher:login', async (event, input) => { trusted(event, LAUNCHER_URL); if(!game&&!platformManaged)await account.credentials('signin',input); return snapshot(); });
    ipcMain.handle('launcher:register', async (event, input) => { trusted(event, LAUNCHER_URL); if(!game&&!platformManaged)await account.credentials('signup',input); return snapshot(); });
    ipcMain.handle('launcher:logout', async event => { trusted(event, LAUNCHER_URL); await closeGame();if(platformManaged){platformBridge.send('logout-request');app.quit();}else await account.signOut();return snapshot(); });
    ipcMain.handle('launcher:check', async event => { trusted(event, LAUNCHER_URL); checkBackend(); await controller.check(); return snapshot(); });
    ipcMain.handle('launcher:download', async event => { trusted(event, LAUNCHER_URL); if (!game) await controller.download(); return snapshot(); });
    ipcMain.handle('launcher:install', event => { trusted(event, LAUNCHER_URL); if (!game) controller.install(); return snapshot(); });
    ipcMain.handle('launcher:minimize', event => { trusted(event, LAUNCHER_URL); launcher.minimize(); });
    ipcMain.handle('launcher:quit', event => { trusted(event, LAUNCHER_URL); app.quit(); });
    ipcMain.handle('game:launcher', event => { trusted(event, GAME_URL); closeGame(); });
    ipcMain.handle('game:fullscreen', event => { trusted(event, GAME_URL); game.setFullScreen(!game.isFullScreen()); });
    ipcMain.handle('game:session', event => { trusted(event, GAME_URL); return account.gameSession(); });
    ipcMain.handle('game:profile', (event, profile) => { trusted(event, GAME_URL); if (profile && typeof profile === 'object') account.updateProfile(profile); });
    for (const [prefix, url] of [['launcher', LAUNCHER_URL], ['game', GAME_URL]]) {
      ipcMain.handle(prefix + ':preferences', event => { trusted(event, url); return prefs.get(); });
      ipcMain.handle(prefix + ':preferences-set', (event, value) => { trusted(event, url); const next = prefs.set(value); toBoth('preferences:state', next); broadcast(); return next; });
      ipcMain.handle(prefix + ':chat-state', event => { trusted(event, url); return social.snapshot(); });
      ipcMain.handle(prefix + ':chat', (event, action, args) => { trusted(event, url); return social.command(action, args); });
      ipcMain.handle(prefix + ':chat-focused', event => { trusted(event, url); return (url === GAME_URL ? game : launcher)?.isFocused() === true; });
      ipcMain.handle(prefix + ':friends', event => { trusted(event, url); const user = account.snapshot(); return friends.snapshot(user.authenticated ? user.user.id : null); });
    }
    if(platformManaged){
      const apply=async value=>{const old=account.snapshot().user?.id,r=await client.auth.setSession({access_token:value.access_token,refresh_token:value.refresh_token});if(r.error||!r.data?.session||old&&r.data.session.user.id!==old)throw Error('HUB_HANDOFF');await account.accept(r.data.session);if(value.preferences)prefs.set({language:value.preferences.language==='en'?'en':'pl',fullscreen:value.preferences.fullscreen===true});if(!account.snapshot().authenticated)throw Error('HUB_HANDOFF');};
      await apply(await platformBridge.first());platformBridge.on('session',v=>apply(v).catch(()=>closeGame().finally(()=>app.quit())));
      platformBridge.on('inventory',()=>{if(game&&!game.isDestroyed())game.webContents.send('game:inventory');});
      platformBridge.on('preferences',p=>{const next=prefs.set({language:p.language==='en'?'en':'pl',fullscreen:p.fullscreen===true});if(game&&!game.isDestroyed())game.setFullScreen(next.fullscreen);toBoth('preferences:state',next);broadcast();});
      platformBridge.on('logout',()=>closeGame().finally(()=>app.quit()));platformBridge.on('disconnect',()=>closeGame().finally(()=>app.quit()));
    }
    if(platformManaged)await openGame();else{createLauncher();account.init();if(royaleStandalone)await openGame();}
    setInterval(() => { if (!game && launcher?.isVisible()) controller.check(); }, 120000).unref();
  }).catch(() => { app.exit(1); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { friends?.dispose(); social?.dispose(); });
}
