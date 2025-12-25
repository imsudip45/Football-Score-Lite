const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const { WebSocketServer } = require("ws")

// --- File persistence ---
const DATA_DIR = path.join(app.getPath("userData"), "localmatch-pro")
const DATA_FILE = path.join(DATA_DIR, "state.json")

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

const readState = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8")
    return JSON.parse(raw)?.state || null
  } catch (err) {
    return null
  }
}

const writeState = (state) => {
  try {
    ensureDataDir()
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      state,
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), "utf-8")
    return true
  } catch (err) {
    console.error("Failed to write state:", err)
    return false
  }
}

// --- WebSocket broadcast server ---
const WS_PORT = Number(process.env.WS_PORT || 18080)
let wss = null

const startWebSocketServer = () => {
  wss = new WebSocketServer({ port: WS_PORT })

  wss.on("connection", (socket) => {
    socket.isAlive = true
    socket.on("pong", () => {
      socket.isAlive = true
    })

    socket.send(JSON.stringify({ type: "hello", role: "controller", time: Date.now() }))

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString())
        if (message.type === "state:update") {
          broadcast({ type: "state:update", state: message.state, time: Date.now() })
        }
      } catch (err) {
        console.warn("WS message parse error", err)
      }
    })
  })

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) return socket.terminate()
      socket.isAlive = false
      socket.ping()
    })
  }, 10000)

  wss.on("close", () => clearInterval(interval))

  console.log(`WebSocket server listening on ws://localhost:${WS_PORT}`)
}

const broadcast = (payload) => {
  if (!wss) return
  const data = JSON.stringify(payload)
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data)
    }
  })
}

// --- Electron window ---
let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "Football Score Pro Lite",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const startUrl = process.env.ELECTRON_START_URL || "http://localhost:3000"
  mainWindow.loadURL(startUrl)

  if (process.env.NODE_ENV !== "production") {
    mainWindow.webContents.openDevTools({ mode: "detach" })
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// --- IPC handlers ---
ipcMain.handle("store:load", () => readState())
ipcMain.handle("store:save", (_event, state) => {
  writeState(state)
  broadcast({ type: "state:update", state, time: Date.now() })
  return true
})

ipcMain.handle("ws:broadcast", (_event, payload) => {
  broadcast({ ...payload, time: Date.now() })
  return true
})

ipcMain.handle("ws:url", () => `ws://localhost:${WS_PORT}`)

// --- Lifecycle ---
app.whenReady().then(() => {
  ensureDataDir()
  startWebSocketServer()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

