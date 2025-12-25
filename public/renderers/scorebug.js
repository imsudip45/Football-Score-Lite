import * as PIXI from 'pixi.js'
import { initPixiApp, CANVAS_WIDTH, CANVAS_HEIGHT, hexToNumber } from './utils.js'

const WS_URL = `ws://localhost:8080`
let ws = null
let renderer = null

let graphicsState = {
  scoreBug: {
    visible: false,
    homeTeam: { name: 'Home', shortName: 'H', score: 0, color: '#14b8a6' },
    awayTeam: { name: 'Away', shortName: 'A', score: 0, color: '#dc2626' },
    timer: { minutes: 0, seconds: 0, period: '1st' },
    possession: null,
  },
}

class ScoreBugRenderer {
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

    if (!state.visible) {
      this.graphicContainer.visible = false
      return
    }

    this.graphicContainer.visible = true

    const width = 420
    const height = 60
    const x = (CANVAS_WIDTH - width) / 2
    const y = CANVAS_HEIGHT * 0.05

    this.graphicContainer.position.set(x, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, width, height, 8)
    bg.fill({ color: 0x000000, alpha: 0.85 })
    this.graphicContainer.addChild(bg)

    // Home team background
    const homeBg = new PIXI.Graphics()
    homeBg.moveTo(8, 0)
    homeBg.lineTo(120, 0)
    homeBg.lineTo(120, height)
    homeBg.lineTo(8, height)
    homeBg.arcTo(0, height, 0, height - 8, 8)
    homeBg.lineTo(0, 8)
    homeBg.arcTo(0, 0, 8, 0, 8)
    homeBg.fill({ color: hexToNumber(state.homeTeam.color) })
    this.graphicContainer.addChild(homeBg)

    // Away team background
    const awayBg = new PIXI.Graphics()
    awayBg.moveTo(width - 120, 0)
    awayBg.lineTo(width - 8, 0)
    awayBg.arcTo(width, 0, width, 8, 8)
    awayBg.lineTo(width, height - 8)
    awayBg.arcTo(width, height, width - 8, height, 8)
    awayBg.lineTo(width - 120, height)
    awayBg.lineTo(width - 120, 0)
    awayBg.fill({ color: hexToNumber(state.awayTeam.color) })
    this.graphicContainer.addChild(awayBg)

    // Team names
    const homeText = new PIXI.Text({
      text: state.homeTeam.shortName,
      style: {
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: '700',
        fill: 'white'
      }
    })
    homeText.anchor.set(0.5)
    homeText.position.set(60, height / 2)
    this.graphicContainer.addChild(homeText)

    const awayText = new PIXI.Text({
      text: state.awayTeam.shortName,
      style: {
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: '700',
        fill: 'white'
      }
    })
    awayText.anchor.set(0.5)
    awayText.position.set(width - 60, height / 2)
    this.graphicContainer.addChild(awayText)

    // Score
    const scoreString = `${state.homeTeam.score} - ${state.awayTeam.score}`
    const scoreText = new PIXI.Text({
      text: scoreString,
      style: {
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: '800',
        fill: 'white',
        letterSpacing: 2
      }
    })
    scoreText.anchor.set(0.5)
    scoreText.position.set(width / 2, height / 2)
    this.graphicContainer.addChild(scoreText)

    // Timer
    const timerW = 100
    const timerH = 26
    const timerX = (width - timerW) / 2
    const timerY = height

    const timerBg = new PIXI.Graphics()
    timerBg.roundRect(0, 0, timerW, timerH, 4)
    timerBg.fill({ color: 0x000000, alpha: 0.9 })
    timerBg.position.set(timerX, timerY)
    this.graphicContainer.addChild(timerBg)

    const timeString = `${state.timer.minutes.toString().padStart(2, '0')}:${state.timer.seconds.toString().padStart(2, '0')}`
    const timerText = new PIXI.Text({
      text: `${state.timer.period}  ${timeString}`,
      style: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '600',
        fill: '#ffdddd'
      }
    })
    timerText.anchor.set(0.5)
    timerText.position.set(timerX + timerW / 2, timerY + timerH / 2)
    this.graphicContainer.addChild(timerText)

    // Possession indicator
    if (state.possession === 'home') {
      const dot = new PIXI.Graphics()
      dot.circle(0, 0, 4)
      dot.fill(0xffffff)
      dot.position.set(110, height / 2)
      this.graphicContainer.addChild(dot)
    } else if (state.possession === 'away') {
      const dot = new PIXI.Graphics()
      dot.circle(0, 0, 4)
      dot.fill(0xffffff)
      dot.position.set(width - 110, height / 2)
      this.graphicContainer.addChild(dot)
    }
  }
}

async function init() {
  const appElement = document.getElementById('app')
  if (!appElement) return

  renderer = new ScoreBugRenderer(appElement)
  await renderer.init()
  renderer.update(graphicsState.scoreBug)
  connectWebSocket()
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[ScoreBug] WebSocket connected')
    ws.send(JSON.stringify({ type: 'ping' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state') {
        graphicsState = data.data
        if (renderer) {
          renderer.update(graphicsState.scoreBug)
        }
      }
    } catch (error) {
      console.error('[ScoreBug] Error:', error)
    }
  }

  ws.onerror = (error) => console.error('[ScoreBug] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[ScoreBug] Reconnecting...')
    setTimeout(connectWebSocket, 3000)
  }
}

window.addEventListener('resize', () => {
  if (renderer) {
    renderer.resize()
  }
})

init()
