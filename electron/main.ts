import { app, BrowserWindow, ipcMain, dialog, protocol, session, net } from 'electron'
import { join, normalize, sep } from 'path'
import { pathToFileURL } from 'url'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { startWebSocketServer, startHttpServer, startAssetsServer, getLocalIP } from './server'

// Allow `app-assets://...` URLs to be used for loading local userData assets (images).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app-assets', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let rendererWindows: Map<string, BrowserWindow> = new Map()
let commentatorWindow: BrowserWindow | null = null

const WS_PORT = 8080
const HTTP_PORT = 3000
const ASSETS_HTTP_PORT = 3002

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

function createCommentatorWindow(url: string) {
  if (commentatorWindow && !commentatorWindow.isDestroyed()) {
    commentatorWindow.focus()
    return commentatorWindow
  }

  commentatorWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Commentator',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,
    resizable: true,
  })

  commentatorWindow.setMenuBarVisibility(false)
  commentatorWindow.loadURL(url)

  commentatorWindow.once('ready-to-show', () => {
    commentatorWindow?.maximize()
    commentatorWindow?.show()
  })

  commentatorWindow.on('closed', () => {
    commentatorWindow = null
  })

  return commentatorWindow
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
    useContentSize: true,
    title: `Renderer: ${type}`,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000',
    show: false,
    // Use a normal framed window so "maximize" is visibly distinct from fullscreen on Windows.
    frame: true,
    autoHideMenuBar: true,
    // Requested UX: open maximized. Keep it resizable/maximizable for that.
    // Note: for OBS browser-source capture, users typically use the /renderer URL,
    // so maximizing this preview window is fine.
    resizable: true,
    fullscreen: false,
    kiosk: false,
    fullscreenable: false,
    alwaysOnTop: false,
  })

  window.setMenuBarVisibility(false)

  window.loadURL(url)

  let beforeInputHooked = false

  const enforceRendererView = () => {
    try {
      // Keep the capture surface deterministic.
      // Fullscreen/maximize can change device scale behavior; always force zoom back to 1.
      // (setZoomLevel(0) is "100%"; factor is also set for safety.)
      ;(window.webContents as any).setZoomLevel?.(0)
      window.webContents.setZoomFactor(1)
      ;(window.webContents as any).setVisualZoomLevelLimits?.(1, 1)?.catch?.(() => {})

      // Prevent Ctrl+wheel / Ctrl+0 etc from changing zoom.
      // (Some Chromium paths can still adjust zoom even with visual limits.)
      if (!beforeInputHooked) {
        beforeInputHooked = true
        window.webContents.on('before-input-event', (event, input) => {
          const isZoomKey =
            (input.control || input.meta) &&
            (input.key === '+' || input.key === '-' || input.key === '=' || input.key === '0')
          const isZoomWheel = (input.control || input.meta) && input.type === 'mouseWheel'
          if (isZoomKey || isZoomWheel) {
            event.preventDefault()
          }
        })
      }

      // When not fullscreen/maximized, keep a true 1920x1080 content area.
      // If the window is maximized, don't fight the OS sizing.
      if (!window.isFullScreen() && !window.isMaximized()) {
        window.setContentSize(1920, 1080)
      }
    } catch {
      // ignore
    }
  }

  // Ensure consistent layout scaling (prevents intermittent clipping that can change after DevTools toggles).
  window.webContents.on('did-finish-load', () => {
    enforceRendererView()
  })

  // Fullscreen (F11 / HTML fullscreen) can cause zoom/device-scale changes → clipping.
  window.on('enter-full-screen', enforceRendererView)
  window.on('leave-full-screen', enforceRendererView)
  window.on('maximize', enforceRendererView)
  window.on('unmaximize', enforceRendererView)
  window.on('resize', enforceRendererView)
  window.webContents.on('enter-html-full-screen', enforceRendererView)
  window.webContents.on('leave-html-full-screen', enforceRendererView)

  window.once('ready-to-show', () => {
    // Ensure we don't end up in fullscreen/kiosk (some GPUs/shortcuts can toggle it).
    try {
      window.setKiosk(false)
      window.setFullScreen(false)
    } catch {
      // ignore
    }
    window.maximize()
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
      offscreen: false,
    },
    backgroundColor: '#0d1117',
    show: false,
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

  // Ensure consistent layout scaling (prevents intermittent clipping that can change after DevTools toggles).
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      mainWindow?.webContents.setZoomFactor(1)
      ;(mainWindow?.webContents as any)?.setVisualZoomLevelLimits?.(1, 1)?.catch?.(() => {})
    } catch {
      // ignore
    }
  })

  mainWindow.once('ready-to-show', () => {
    // Always start maximized (requested UX)
    mainWindow?.maximize()
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
  // File operations - restricted to userData directory for security
  ipcMain.handle('file:save', async (_event, relPath: string, data: string) => {
    try {
      const safePath = join(app.getPath('userData'), sanitizeRelativePath(relPath))
      const dir = join(safePath, '..')
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(safePath, data, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('file:load', async (_event, relPath: string) => {
    try {
      const safePath = join(app.getPath('userData'), sanitizeRelativePath(relPath))
      const data = await readFile(safePath, 'utf-8')
      return { success: true, data }
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

  ipcMain.handle('commentator:open', (_event, url?: string) => {
    const commentatorUrl = url || 'http://localhost:3000/commentator'
    const window = createCommentatorWindow(commentatorUrl)
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

  ipcMain.handle('network:get-info', () => {
    return {
      ip: getLocalIP(),
      port: 3000,
    }
  })
}

app.whenReady().then(() => {
  try {
    // Set Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            isDev
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws://localhost:* http://localhost:*; img-src 'self' data: blob: app-assets: https: http:; font-src 'self' data:; connect-src 'self' ws: http: https:"
              : "default-src 'self' 'unsafe-inline' data: blob: file:; img-src 'self' data: blob: app-assets: file: http:; font-src 'self' data: file:; connect-src 'self' ws: http:"
          ]
        }
      })
    })

    // Register protocol for userData assets
    // protocol.handle replaces the deprecated registerFileProtocol API
    protocol.handle('app-assets', (request) => {
      try {
        const url = new URL(request.url)
        // Support both:
        // - app-assets:///images/foo.png  -> host: "" , pathname: "/images/foo.png"
        // - app-assets://images/foo.png  -> host: "images", pathname: "/foo.png"
        const rawRel = url.host ? `${url.host}${url.pathname || ''}` : (url.pathname || '')
        // Standard schemes get a trailing slash when the path is empty
        // (app-assets:///a.png arrives as app-assets://a.png/), so trim both ends.
        const rel = decodeURIComponent(rawRel).replace(/^\/+/, '').replace(/\/+$/, '')
        const safeRel = sanitizeRelativePath(rel)
        const absPath = join(getAssetsDir(), safeRel)
        return net.fetch(pathToFileURL(absPath).toString())
      } catch (_e) {
        // Fail closed
        return new Response('Not found', { status: 404 })
      }
    })

    // Start WebSocket server
    startWebSocketServer(WS_PORT)
    console.log('[Electron] WebSocket server started on port', WS_PORT)

    // Start an assets server so external browsers can load userData assets.
    // (Electron itself can use app-assets://, but normal browsers cannot.)
    startAssetsServer(ASSETS_HTTP_PORT, getAssetsDir())
    console.log('[Electron] Assets server started on port', ASSETS_HTTP_PORT)

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

