'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('strikeZone', {
  getState: () => ipcRenderer.invoke('launcher:state'),
  play: () => ipcRenderer.invoke('launcher:play'),
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
