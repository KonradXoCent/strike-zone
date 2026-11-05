'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('zoneFootballDesktop',{
 bootstrap:()=>ipcRenderer.invoke('football:bootstrap'),
 club:(action,args={})=>ipcRenderer.invoke('football:club',{action,args}),
 close:()=>ipcRenderer.invoke('football:close'),
 anthemSource:()=>ipcRenderer.invoke('football:anthem-source'),fullscreen:()=>ipcRenderer.invoke('football:fullscreen'),
 onSession:callback=>{const fn=(_event,value)=>callback(value);ipcRenderer.on('football:session',fn);return()=>ipcRenderer.removeListener('football:session',fn);}
});
