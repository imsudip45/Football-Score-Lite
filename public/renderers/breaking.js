import * as PIXI from 'pixi.js'
import { initPixiApp, CANVAS_WIDTH, CANVAS_HEIGHT } from './utils.js'

const WS_URL = `ws://localhost:8080`
let ws = null
let renderer = null

let graphicsState = {
  breakingBanner: {
    visible: false,
    text: '',
  },
}

class BreakingRenderer {
  constructor(container) {
    this.container = container
    this.app = null
    this.resizeHandler = null
    this.graphicContainer = new PIXI.Container()
    this.breakingRedBar = null
    this.pulseTime = 0
  }

  async init() {
    const { app, resizeHandler } = await initPixiApp(this.container)
    this.app = app
    this.resizeHandler = resizeHandler
    this.app.stage.addChild(this.graphicContainer)

    // Setup animation loop
    if (this.app.ticker) {
      this.app.ticker.add((ticker) => {
        this.animate(ticker.deltaTime)
      })
    }
  }

  resize() {
    if (this.resizeHandler) {
      this.resizeHandler()
    }
  }

  update(state) {
    if (!state || !this.app || !this.app.renderer) return
    this.render(state)
  }

  render(state) {
    this.graphicContainer.removeChildren()

    if (!state.visible || !state.text) {
      this.graphicContainer.visible = false
      return
    }

    this.graphicContainer.visible = true

    const height = 56
    const width = CANVAS_WIDTH
    const y = CANVAS_HEIGHT - height - 48

    this.graphicContainer.position.set(0, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, width, height)
    bg.fill({ color: 0x000000, alpha: 0.95 })
    this.graphicContainer.addChild(bg)

    // Red bar
    const redW = 160
    this.breakingRedBar = new PIXI.Graphics()
    this.breakingRedBar.rect(0, 0, redW, height)
    this.breakingRedBar.fill({ color: 0xdc2626 })
    this.graphicContainer.addChild(this.breakingRedBar)

    // Breaking label
    const breakingLabel = new PIXI.Text({
      text: 'BREAKING',
      style: {
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: '800',
        fill: 'white',
        letterSpacing: 1
      }
    })
    breakingLabel.anchor.set(0.5)
    breakingLabel.position.set(redW / 2, height / 2)
    this.graphicContainer.addChild(breakingLabel)

    // Breaking text
    const text = new PIXI.Text({
      text: state.text.toUpperCase(),
      style: {
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: '700',
        fill: 'white'
      }
    })
    text.anchor.set(0, 0.5)
    text.position.set(redW + 24, height / 2)
    this.graphicContainer.addChild(text)
  }

  animate(delta) {
    if (this.graphicContainer.visible && this.breakingRedBar) {
      this.pulseTime += delta * 0.1
      const alpha = 0.8 + Math.sin(this.pulseTime) * 0.2
      this.breakingRedBar.alpha = alpha
    }
  }
}

async function init() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  renderer = new BreakingRenderer(appElement)
  await renderer.init()
  renderer.update(graphicsState.breakingBanner)
  connectWebSocket()
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[Breaking] WebSocket connected')
    ws.send(JSON.stringify({ type: 'ping' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state') {
        graphicsState = data.data
        if (renderer) {
          renderer.update(graphicsState.breakingBanner)
        }
      }
    } catch (error) {
      console.error('[Breaking] Error:', error)
    }
  }

  ws.onerror = (error) => console.error('[Breaking] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[Breaking] Reconnecting...')
    setTimeout(connectWebSocket, 3000)
  }
}

window.addEventListener('resize', () => {
  if (renderer) {
    renderer.resize()
  }
})

init()
