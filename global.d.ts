export {}

declare global {
  interface Window {
    electronAPI?: {
      file: {
        save: (path: string, data: string) => Promise<{ success: boolean; error?: string }>
        load: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>
        select: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
        saveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      }
      renderer: {
        open: (type: string, url?: string) => Promise<{ success: boolean; id?: number }>
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

