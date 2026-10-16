'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('strikeZoneDesktop', {
  launcher: () => ipcRenderer.invoke('game:launcher'),
  fullscreen: () => ipcRenderer.invoke('game:fullscreen'),
  session: () => ipcRenderer.invoke('game:session'),
  profile: value => ipcRenderer.invoke('game:profile', value),
  onSession: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('game:session', listener); return () => ipcRenderer.removeListener('game:session', listener); }
});
