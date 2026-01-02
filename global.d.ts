export {}

declare global {
  interface Window {
    electronAPI?: {
      file: {
        // Note: paths are relative to userData directory for security
        save: (relPath: string, data: string) => Promise<{ success: boolean; error?: string }>
        load: (relPath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        select: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
        saveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      }
      assets: {
        writeDataUrl: (relPath: string, dataUrl: string) => Promise<{ success: boolean; url?: string; error?: string }>
        readBase64: (relPath: string) => Promise<{ success: boolean; base64?: string; error?: string }>
      }
      renderer: {
        open: (type: string, url?: string) => Promise<{ success: boolean; id?: number }>
        close: (type: string) => Promise<{ success: boolean }>
        list: () => Promise<string[]>
      }

      commentator: {
        open: (url: string) => Promise<{ success: boolean; id?: number }>
      }
      app: {
        getVersion: () => Promise<string>
        getPath: (name: 'userData' | 'documents' | 'downloads') => Promise<string>
      }

      network: {
        getInfo: () => Promise<{ ip: string; port: number }>
      }
    }
  }
}

