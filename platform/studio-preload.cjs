'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('zoneStudioCloud',{catalog:(action,args={})=>ipcRenderer.invoke('studio:catalog',action,args)});
