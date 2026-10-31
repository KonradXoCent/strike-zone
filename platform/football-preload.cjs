'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('zoneFootballDesktop',{
 bootstrap:()=>ipcRenderer.invoke('football:bootstrap'),
 close:()=>ipcRenderer.invoke('football:close'),
 fullscreen:()=>ipcRenderer.invoke('football:fullscreen'),
 onSession:callback=>{const fn=(_event,value)=>callback(value);ipcRenderer.on('football:session',fn);return()=>ipcRenderer.removeListener('football:session',fn);}
});
