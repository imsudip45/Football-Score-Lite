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

