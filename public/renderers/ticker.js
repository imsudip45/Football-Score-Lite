import * as PIXI from 'pixi.js'
import { initPixiApp, CANVAS_WIDTH, CANVAS_HEIGHT } from './utils.js'

const WS_URL = `ws://localhost:8080`
let ws = null
let renderer = null

let graphicsState = {
  ticker: {
    visible: false,
    items: [],
    scrollSpeed: 80,
  },
}

class TickerRenderer {
  constructor(container) {
    this.container = container
    this.app = null
    this.resizeHandler = null
    this.tickerContainer = new PIXI.Container()
    this.tickerContent = new PIXI.Container()
    this.tickerWidth = 0
  }

  async init() {
    const { app, resizeHandler } = await initPixiApp(this.container)
    this.app = app
    this.resizeHandler = resizeHandler
    this.app.stage.addChild(this.tickerContainer)
    this.tickerContainer.addChild(this.tickerContent)

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
    this.tickerContainer.removeChildren()
    this.tickerContent.removeChildren()

    if (!state.visible || !state.items || state.items.length === 0) {
      this.tickerContainer.visible = false
      return
    }

    this.tickerContainer.visible = true

    const height = 48
    const width = CANVAS_WIDTH
    const y = CANVAS_HEIGHT - height

    this.tickerContainer.position.set(0, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, width, height)
    bg.fill({ color: 0x000000, alpha: 0.90 })
    this.tickerContainer.addChild(bg)

    // Label background
    const labelW = 100
    const labelBg = new PIXI.Graphics()
    labelBg.rect(0, 0, labelW, height)
    labelBg.fill({ color: 0x2563eb })
    this.tickerContainer.addChild(labelBg)

    const labelText = new PIXI.Text({
      text: 'UPDATE',
      style: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '800',
        fill: 'white'
      }
    })
    labelText.anchor.set(0.5)
    labelText.position.set(labelW / 2, height / 2)
    this.tickerContainer.addChild(labelText)

    // Mask for scrolling content
    const mask = new PIXI.Graphics()
    mask.rect(labelW, 0, width - labelW, height)
    mask.fill(0xffffff)
    this.tickerContainer.addChild(mask)

    this.tickerContent.mask = mask
    this.tickerContent.position.set(width, height / 2)
    this.tickerContainer.addChild(this.tickerContent)

    // Build ticker items
    let currentX = 0
    state.items.forEach((item) => {
      if (currentX > 0) {
        const bullet = new PIXI.Text({
          text: '•',
          style: {
            fontFamily: 'Inter',
            fontSize: 18,
            fill: 0x6b7280
          }
        })
        bullet.anchor.set(0, 0.5)
        bullet.position.set(currentX, 0)
        this.tickerContent.addChild(bullet)
        currentX += 30
      }

      const primary = new PIXI.Text({
        text: item.primary,
        style: {
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: '700',
          fill: 'white'
        }
      })
      primary.anchor.set(0, 0.5)
      primary.position.set(currentX, 0)
      this.tickerContent.addChild(primary)
      currentX += primary.width + 10

      if (item.secondary) {
        const secondary = new PIXI.Text({
          text: item.secondary,
          style: {
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: '400',
            fill: 0xcccccc
          }
        })
        secondary.anchor.set(0, 0.5)
        secondary.position.set(currentX, 0)
        this.tickerContent.addChild(secondary)
        currentX += secondary.width
      }

      currentX += 60
    })

    this.tickerWidth = currentX
    this.tickerContent.scrollSpeed = state.scrollSpeed / 60
  }

  animate(delta) {
    if (this.tickerContainer.visible && this.tickerContent) {
      const speed = this.tickerContent.scrollSpeed || 2
      this.tickerContent.x -= speed * delta

      if (this.tickerContent.x < -this.tickerWidth) {
        this.tickerContent.x = CANVAS_WIDTH
      }
    }
  }
}

async function init() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  renderer = new TickerRenderer(appElement)
  await renderer.init()
  renderer.update(graphicsState.ticker)
  connectWebSocket()
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[Ticker] WebSocket connected')
    ws.send(JSON.stringify({ type: 'ping' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state') {
        graphicsState = data.data
        if (renderer) {
          renderer.update(graphicsState.ticker)
        }
      }
    } catch (error) {
      console.error('[Ticker] Error:', error)
    }
  }

  ws.onerror = (error) => console.error('[Ticker] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[Ticker] Reconnecting...')
    setTimeout(connectWebSocket, 3000)
  }
}

window.addEventListener('resize', () => {
  if (renderer) {
    renderer.resize()
  }
})

init()
