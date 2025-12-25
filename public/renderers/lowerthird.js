import * as PIXI from 'pixi.js'
import { initPixiApp, CANVAS_WIDTH, CANVAS_HEIGHT, hexToNumber } from './utils.js'

const WS_URL = `ws://localhost:8080`
let ws = null
let renderer = null

let graphicsState = {
  lowerThird: {
    visible: false,
    title: '',
    subtitle: '',
    teamColor: '#14b8a6',
  },
}

class LowerThirdRenderer {
  constructor(container) {
    this.container = container
    this.app = null
    this.resizeHandler = null
    this.graphicContainer = new PIXI.Container()
  }

  async init() {
    const { app, resizeHandler } = await initPixiApp(this.container)
    this.app = app
    this.resizeHandler = resizeHandler
    this.app.stage.addChild(this.graphicContainer)
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

    if (!state.visible || !state.title) {
      this.graphicContainer.visible = false
      return
    }

    this.graphicContainer.visible = true

    const width = 400
    const height = 80
    const x = 50
    const y = CANVAS_HEIGHT - height - (CANVAS_HEIGHT * 0.15)

    this.graphicContainer.position.set(x, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, width, height, 6)
    bg.fill({ color: 0x000000, alpha: 0.95 })
    this.graphicContainer.addChild(bg)

    // Color bar
    const barRect = new PIXI.Graphics()
    barRect.roundRect(0, 0, 6, height, 0)
    barRect.fill({ color: hexToNumber(state.teamColor) })
    
    const mask = new PIXI.Graphics()
    mask.roundRect(0, 0, width, height, 6)
    mask.fill(0xffffff)
    
    this.graphicContainer.addChild(mask)
    barRect.mask = mask
    this.graphicContainer.addChild(barRect)

    // Title
    const title = new PIXI.Text({
      text: state.title.toUpperCase(),
      style: {
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: '700',
        fill: 'white'
      }
    })
    title.position.set(24, 18)
    this.graphicContainer.addChild(title)

    // Subtitle
    if (state.subtitle) {
      const subtitle = new PIXI.Text({
        text: state.subtitle,
        style: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: '400',
          fill: 'white',
          alpha: 0.8
        }
      })
      subtitle.position.set(24, 48)
      this.graphicContainer.addChild(subtitle)
    }
  }
}

async function init() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  renderer = new LowerThirdRenderer(appElement)
  await renderer.init()
  renderer.update(graphicsState.lowerThird)
  connectWebSocket()
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[LowerThird] WebSocket connected')
    ws.send(JSON.stringify({ type: 'ping' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state') {
        graphicsState = data.data
        if (renderer) {
          renderer.update(graphicsState.lowerThird)
        }
      }
    } catch (error) {
      console.error('[LowerThird] Error:', error)
    }
  }

  ws.onerror = (error) => console.error('[LowerThird] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[LowerThird] Reconnecting...')
    setTimeout(connectWebSocket, 3000)
  }
}

window.addEventListener('resize', () => {
  if (renderer) {
    renderer.resize()
  }
})

init()
