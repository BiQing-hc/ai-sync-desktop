const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiSync", {
  getPlatforms: () => ipcRenderer.invoke("get-platforms"),
  getSource: () => ipcRenderer.invoke("get-source"),
  runSync: (opts) => ipcRenderer.invoke("run-sync", opts),
  getStatus: () => ipcRenderer.invoke("get-status"),
  getSyncHistory: () => ipcRenderer.invoke("get-sync-history"),
  setSource: (id) => ipcRenderer.invoke("set-source", id),
  onTriggerSync: (cb) => ipcRenderer.on("trigger-sync", cb),
  onRefreshPlatforms: (cb) => ipcRenderer.on("refresh-platforms", cb)
});
