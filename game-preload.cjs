'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('strikeZoneDesktop', {
  launcher: () => ipcRenderer.invoke('game:launcher'),
  fullscreen: () => ipcRenderer.invoke('game:fullscreen')
});
