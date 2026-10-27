/* Desktop integration only. The game's maps, modes, items and gameplay are preserved. */
'use strict';
(() => {
  let loadingUser = null;
  let loadedUser = null;
  let pendingLoad = null;
  const ownerKey = 'sz2-cloud-owner';
  const readOwner = () => { try { return localStorage.getItem(ownerKey); } catch { return null; } };
  const setOwner = id => { try { localStorage.setItem(ownerKey, id); } catch {} };

  // A fresh desktop profile must read the cloud save before it is allowed to upload.
  cloudLoad = async function () {
    if (!sb || !SBU) {
      clearTimeout(CL.h); loadedUser = null; CL.uid = null; CL.db = null;
      CL.msg = sb ? 'Log in to enable cloud save.' : CL.msg;
      if (T === 'prof') tab('prof');
      return;
    }
    const userId = SBU.id;
    if (loadingUser === userId && pendingLoad) return pendingLoad;
    loadingUser = userId;
    loadedUser = null;
    clearTimeout(CL.h);
    pendingLoad = (async () => {
      CL.uid = userId; CL.nm = SBU.email; CL.db = 1;
      try {
        const result = await sb.from('saves').select('json').eq('user_id', userId).maybeSingle();
        if (result.error) throw result.error;
        if (!SBU || SBU.id !== userId) return;
        const raw = result.data?.json;
        const saved = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
        if (saved) {
          if (!saved.profiles || typeof saved.profiles !== 'object' || !Object.keys(saved.profiles).length) {
            throw new Error('The cloud save is invalid. Nothing was overwritten.');
          }
          if(readOwner()===userId&&saved.zhEpoch&&saved.zhEpoch!==DB.zhEpoch)window.SzHubInventory?.apply(saved);
          if (readOwner() !== userId || (saved.ts || 0) > (DB.ts || 0)) {
            // Preserve the previous local profile for recovery before changing accounts.
            try { localStorage.setItem('sz2-before-cloud', JSON.stringify(DB)); } catch {}
            DB = saved;
            if (!DB.profiles[DB.cur]) DB.cur = Object.keys(DB.profiles)[0];
            try { localStorage.setItem('sz2', JSON.stringify(DB)); } catch {}
            CL.msg = 'Loaded your cloud save.';
          } else CL.msg = 'Cloud save is in sync.';
        } else if (readOwner() && readOwner() !== userId) {
          // A new account must not inherit the other account's local inventory.
          const name = String(SBU.user_metadata?.nickname || 'Player').replace(/[<>&"']/g, '').trim().slice(0, 14) || 'Player';
          DB = { profiles: { [name]: mk(name) }, cur: name };
          try { localStorage.setItem('sz2', JSON.stringify(DB)); } catch {}
          CL.msg = 'Cloud save enabled.';
        } else {
          if (SBU.user_metadata?.nickname && DB.cur === 'Player' && Object.keys(DB.profiles).length === 1) {
            const name = String(SBU.user_metadata.nickname).replace(/[<>&"']/g, '').trim().slice(0, 14) || 'Player';
            DB.profiles[name] = { ...DB.profiles.Player, name }; if (name !== 'Player') delete DB.profiles.Player; DB.cur = name;
          }
          CL.msg = 'Cloud save enabled.';
        }
        setOwner(userId);
        loadedUser = userId;
        if (!saved || (DB.ts || 0) > (saved.ts || 0)) cloudPush(1);
      } catch (error) { CL.msg = 'Cloud error: ' + (error.message || error); }
      finally {
        if (loadingUser === userId) { loadingUser = null; pendingLoad = null; }
        tab(T); hdr();
      }
    })();
    return pendingLoad;
  };

  async function flushAccount() {
    clearTimeout(CL.h);
    try { localStorage.setItem('sz2', JSON.stringify(DB)); } catch {}
    if (!sb || !SBU || loadedUser !== SBU.id || readOwner() !== SBU.id) return false;
    const userId = SBU.id;
    const value = JSON.parse(JSON.stringify(DB));
    try {
      const result = await sb.from('saves').upsert({ user_id: userId, json: value, updated_at: new Date().toISOString() });
      if (result.error) throw result.error;
      CL.msg = 'Cloud saved ' + new Date().toLocaleTimeString();
      lbPush();
      return true;
    } catch (error) {if(await window.SzHubInventory?.recover(error))return flushAccount();CL.msg='Cloud save failed: '+(error.message||error);return false;}
  }
  async function flush() {
    if(window.szCloudEconomyLocked?.())return false;
    window.szCloudPending=window.szCloudPending||new Set();
    const task=flushAccount();window.szCloudPending.add(task);
    try{return await task;}finally{window.szCloudPending.delete(task);}
  }
  cloudPush = function (now) {
    if(window.szCloudEconomyLocked?.())return;
    if (!sb || !SBU || loadedUser !== SBU.id || readOwner() !== SBU.id) return;
    clearTimeout(CL.h);
    CL.h = setTimeout(flush, now ? 0 : 2500);
  };
  window.szDesktopFlush = flush;
  window.szDesktopCloudReady = () => !!SBU && loadedUser === SBU.id;

  const bar = document.createElement('div');
  bar.id = 'desktop-toolbar';
  const style = document.createElement('style');
  style.textContent = '#desktop-toolbar{position:fixed;right:242px;top:8px;z-index:280;display:flex;gap:6px}#desktop-toolbar button{font:11px system-ui;padding:6px 10px;background:#101820e8;color:#c8d2df;border:1px solid #ffffff25;letter-spacing:.2px;text-transform:none}body:has(#game:not([hidden])) #desktop-toolbar{display:none}@media(max-width:1050px){#desktop-toolbar{right:195px}}';
  document.head.appendChild(style);
  const fullscreen = document.createElement('button');
  fullscreen.textContent = 'Pełny ekran · F11';
  fullscreen.onclick = () => window.strikeZoneDesktop?.fullscreen();
  const launcher = document.createElement('button');
  launcher.textContent = 'Launcher';
  launcher.title = 'Powrót do launchera: Ctrl + Shift + L';
  launcher.onclick = () => window.strikeZoneDesktop?.launcher();
  bar.append(fullscreen, launcher);
  document.body.appendChild(bar);
})();
