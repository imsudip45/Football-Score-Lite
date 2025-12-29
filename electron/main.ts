import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join, normalize, sep } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { startWebSocketServer, startHttpServer } from './server'

// Allow `app-assets://...` URLs to be used for loading local userData assets (images).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app-assets', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let rendererWindows: Map<string, BrowserWindow> = new Map()

const WS_PORT = 8080
const HTTP_PORT = 3000

function getAssetsDir(): string {
  return join(app.getPath('userData'), 'assets')
}

function sanitizeRelativePath(relPath: string): string {
  // Normalize and prevent path traversal. Return a safe relative path using OS separators.
  const cleaned = relPath.replace(/^([/\\])+/, '')
  const norm = normalize(cleaned)
  if (norm.startsWith('..' + sep) || norm === '..' || norm.includes('..' + sep)) {
    throw new Error('Invalid asset path')
  }
  return norm
}

// Get the correct path for static files in production
function getAppPath(): string {
  if (isDev) {
    return join(__dirname, '..')
  }
  // In production, app.getAppPath() returns the path to the app's root
  // which is inside the asar archive
  return app.getAppPath()
}

// Create renderer windows for graphics output
function createRendererWindow(type: string, url: string) {
  const existing = rendererWindows.get(type)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: `Renderer: ${type}`,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000',
    show: false,
    frame: true,
    alwaysOnTop: false,
  })

  window.loadURL(url)
  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('closed', () => {
    rendererWindows.delete(type)
  })

  rendererWindows.set(type, window)
  return window
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    title: 'Football Score Lite',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Enable better rendering for dropdowns and overlays
      enableBlinkFeatures: 'CSSColorSchemeUARendering',
      // Ensure proper event handling for overlays and dropdowns
      webSecurity: false, // Allow loading local files
      offscreen: false,
    },
    backgroundColor: '#0d1117',
    show: false,
    // Ensure proper layering for dropdowns
    transparent: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    // In production, load the static export from the app root
    const appPath = getAppPath()
    const indexPath = join(appPath, 'out', 'index.html')
    console.log('[Electron] App path:', appPath)
    console.log('[Electron] Loading static file:', indexPath)
    console.log('[Electron] File exists:', existsSync(indexPath))
    mainWindow.loadFile(indexPath)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[MainWindow] Failed to load:', errorCode, errorDescription, validatedURL)
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[MainWindow] Renderer process gone:', details.reason)
  })
}

// IPC Handlers
function setupIpcHandlers() {
  // File operations
  ipcMain.handle('file:save', async (_event, path: string, data: string) => {
    try {
      const dir = join(path, '..')
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(path, data, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Asset operations (binary-safe) for images stored in userData/assets
  ipcMain.handle('assets:writeDataUrl', async (_event, relPath: string, dataUrl: string) => {
    try {
      const safeRel = sanitizeRelativePath(relPath)
      const assetsDir = getAssetsDir()
      const absPath = join(assetsDir, safeRel)
      const dir = join(absPath, '..')
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || '')
      if (!match) {
        return { success: false, error: 'Invalid data URL' }
      }
      const base64 = match[2]
      const buf = Buffer.from(base64, 'base64')
      await writeFile(absPath, buf)

      const urlPath = safeRel.split(sep).join('/')
      return { success: true, url: `app-assets:///${urlPath}` }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('assets:readBase64', async (_event, relPath: string) => {
    try {
      const safeRel = sanitizeRelativePath(relPath)
      const absPath = join(getAssetsDir(), safeRel)
      const buf = await readFile(absPath)
      return { success: true, base64: buf.toString('base64') }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('file:load', async (_event, path: string) => {
    try {
      const data = await readFile(path, 'utf-8')
      return { success: true, data }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('file:select', async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, options)
    return result
  })

  ipcMain.handle('file:save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(mainWindow!, options)
    return result
  })

  // Renderer window management
  ipcMain.handle('renderer:open', (_event, type: string, url?: string) => {
    const appPath = getAppPath()
    // Legacy Pixi renderers were removed; use the unified React renderer route instead.
    // If a custom URL is provided, keep honoring it for flexibility.
    const rendererUrl = url || (isDev
      ? `http://localhost:3000/renderer`
      : `file://${join(appPath, 'out', 'renderer', 'index.html')}`)
    const window = createRendererWindow(type, rendererUrl)
    return { success: true, id: window.id }
  })

  ipcMain.handle('renderer:close', (_event, type: string) => {
    const window = rendererWindows.get(type)
    if (window && !window.isDestroyed()) {
      window.close()
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('renderer:list', () => {
    return Array.from(rendererWindows.keys())
  })

  // App info
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:get-path', (_event, name: 'userData' | 'documents' | 'downloads') => {
    return app.getPath(name)
  })
}

app.whenReady().then(() => {
  try {
    // Register protocol for userData assets
    protocol.registerFileProtocol('app-assets', (request, callback) => {
      try {
        const url = new URL(request.url)
        // Support both:
        // - app-assets:///images/foo.png  -> host: "" , pathname: "/images/foo.png"
        // - app-assets://images/foo.png  -> host: "images", pathname: "/foo.png"
        const rawRel = url.host ? `${url.host}${url.pathname || ''}` : (url.pathname || '')
        const rel = decodeURIComponent(rawRel).replace(/^\/+/, '')
        const safeRel = sanitizeRelativePath(rel)
        const absPath = join(getAssetsDir(), safeRel)
        callback({ path: absPath })
      } catch (_e) {
        // Fail closed
        callback({ error: -6 }) // net::ERR_FILE_NOT_FOUND
      }
    })

    // Start WebSocket server
    startWebSocketServer(WS_PORT)
    console.log('[Electron] WebSocket server started on port', WS_PORT)

    // Start HTTP server to serve static files (renderer pages)
    // Only in production - in dev, Next.js dev server handles this
    if (!isDev) {
      const staticPath = join(getAppPath(), 'out')
      startHttpServer(HTTP_PORT, staticPath)
      console.log('[Electron] HTTP server started on port', HTTP_PORT)
    }

    // Create main window
    createMainWindow()
    console.log('[Electron] Main window created')

    // Setup IPC handlers
    setupIpcHandlers()
    console.log('[Electron] IPC handlers registered')

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  } catch (error) {
    console.error('[Electron] Error during initialization:', error)
  }
})

app.on('ready', () => {
  console.log('[Electron] App ready')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Close all renderer windows
  rendererWindows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.close()
    }
  })
})

