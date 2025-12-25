const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  loadState: () => ipcRenderer.invoke("store:load"),
  saveState: (state) => ipcRenderer.invoke("store:save", state),
  broadcast: (payload) => ipcRenderer.invoke("ws:broadcast", payload),
  getWsUrl: () => ipcRenderer.invoke("ws:url"),
})

