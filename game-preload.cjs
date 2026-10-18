'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('strikeZoneDesktop', {
  getPreferences: () => ipcRenderer.invoke('game:preferences'),
  setPreferences: value => ipcRenderer.invoke('game:preferences-set', value),
  getChat: () => ipcRenderer.invoke('game:chat-state'),
  chat: (action, args) => ipcRenderer.invoke('game:chat', action, args),
  chatFocused: () => ipcRenderer.invoke('game:chat-focused'),
  getFriends: () => ipcRenderer.invoke('game:friends'),
  onChat: callback => { const fn = (_event, value) => callback(value); ipcRenderer.on('social:state', fn); return () => ipcRenderer.removeListener('social:state', fn); },
  onPreferences: callback => { const fn = (_event, value) => callback(value); ipcRenderer.on('preferences:state', fn); return () => ipcRenderer.removeListener('preferences:state', fn); },
  onFriends: callback => { const fn = (_event, value) => callback(value); ipcRenderer.on('friends:state', fn); return () => ipcRenderer.removeListener('friends:state', fn); },
  launcher: () => ipcRenderer.invoke('game:launcher'),
  fullscreen: () => ipcRenderer.invoke('game:fullscreen'),
  session: () => ipcRenderer.invoke('game:session'),
  profile: value => ipcRenderer.invoke('game:profile', value),
  onSession: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('game:session', listener); return () => ipcRenderer.removeListener('game:session', listener); }
});
