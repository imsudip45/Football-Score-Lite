import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  file: {
    save: (path: string, data: string) => ipcRenderer.invoke('file:save', path, data),
    load: (path: string) => ipcRenderer.invoke('file:load', path),
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

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: 'userData' | 'documents' | 'downloads') => ipcRenderer.invoke('app:get-path', name),
  },
})

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      file: {
        save: (path: string, data: string) => Promise<{ success: boolean; error?: string }>
        load: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>
        select: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
        saveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      }
      assets: {
        writeDataUrl: (relPath: string, dataUrl: string) => Promise<{ success: boolean; url?: string; error?: string }>
        readBase64: (relPath: string) => Promise<{ success: boolean; base64?: string; error?: string }>
      }
      renderer: {
        open: (type: string, url: string) => Promise<{ success: boolean; id?: number }>
        close: (type: string) => Promise<{ success: boolean }>
        list: () => Promise<string[]>
      }
      app: {
        getVersion: () => Promise<string>
        getPath: (name: 'userData' | 'documents' | 'downloads') => Promise<string>
      }
    }
  }
}

