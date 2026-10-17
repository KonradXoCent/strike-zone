'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('strikeZone', {
  getState: () => ipcRenderer.invoke('launcher:state'),
  getPreferences: () => ipcRenderer.invoke('launcher:preferences'),
  setPreferences: value => ipcRenderer.invoke('launcher:preferences-set', value),
  getChat: () => ipcRenderer.invoke('launcher:chat-state'),
  chat: (action, args) => ipcRenderer.invoke('launcher:chat', action, args),
  chatFocused: () => ipcRenderer.invoke('launcher:chat-focused'),
  onChat: callback => { const fn = (_event, value) => callback(value); ipcRenderer.on('social:state', fn); return () => ipcRenderer.removeListener('social:state', fn); },
  onPreferences: callback => { const fn = (_event, value) => callback(value); ipcRenderer.on('preferences:state', fn); return () => ipcRenderer.removeListener('preferences:state', fn); },
  refreshFriends: () => ipcRenderer.invoke('launcher:friends-refresh'),
  play: () => ipcRenderer.invoke('launcher:play'),
  login: input => ipcRenderer.invoke('launcher:login', input),
  register: input => ipcRenderer.invoke('launcher:register', input),
  logout: () => ipcRenderer.invoke('launcher:logout'),
  check: () => ipcRenderer.invoke('launcher:check'),
  download: () => ipcRenderer.invoke('launcher:download'),
  install: () => ipcRenderer.invoke('launcher:install'),
  minimize: () => ipcRenderer.invoke('launcher:minimize'),
  quit: () => ipcRenderer.invoke('launcher:quit'),
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('launcher:state', listener);
    return () => ipcRenderer.removeListener('launcher:state', listener);
  }
});
