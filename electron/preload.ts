import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations - paths are relative to userData directory for security
  file: {
    save: (relPath: string, data: string) => ipcRenderer.invoke('file:save', relPath, data),
    load: (relPath: string) => ipcRenderer.invoke('file:load', relPath),
    select: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('file:select', options),
    saveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('file:save-dialog', options),
  },

  // Assets (binary-safe) stored under userData/assets and served via app-assets://
  assets: {
    writeDataUrl: (relPath: string, dataUrl: string) => ipcRenderer.invoke('assets:writeDataUrl', relPath, dataUrl),
    readBase64: (relPath: string) => ipcRenderer.invoke('assets:readBase64', relPath),
  },

  // Renderer window management
  renderer: {
    open: (type: string, url: string) => ipcRenderer.invoke('renderer:open', type, url),
    close: (type: string) => ipcRenderer.invoke('renderer:close', type),
    list: () => ipcRenderer.invoke('renderer:list'),
  },

  commentator: {
    open: (url: string) => ipcRenderer.invoke('commentator:open', url),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: 'userData' | 'documents' | 'downloads') => ipcRenderer.invoke('app:get-path', name),
  },

  // Network info (LAN sharing)
  network: {
    getInfo: () => ipcRenderer.invoke('network:get-info') as Promise<{ ip: string; port: number }>,
  },
})

// Type definitions are in global.d.ts

