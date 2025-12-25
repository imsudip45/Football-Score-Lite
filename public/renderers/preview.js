import * as PIXI from 'pixi.js'
import { initPixiApp, CANVAS_WIDTH, CANVAS_HEIGHT, hexToNumber, animateShowHide, easeOutCubic, easeOutBack } from './utils.js'

const WS_URL = `ws://localhost:8080`
let ws = null
let pixiManager = null

// Graphics state
let graphicsState = {
  scoreBug: {
    visible: false,
    homeTeam: { name: 'Home', shortName: 'H', score: 0, color: '#14b8a6' },
    awayTeam: { name: 'Away', shortName: 'A', score: 0, color: '#dc2626' },
    timer: { minutes: 0, seconds: 0, period: '1st' },
    possession: null,
  },
  lowerThird: {
    visible: false,
    title: '',
    subtitle: '',
    teamColor: '#14b8a6',
  },
  ticker: {
    visible: false,
    items: [],
    scrollSpeed: 80,
  },
  breakingBanner: {
    visible: false,
    text: '',
  },
}

// Main Graphics Manager
class GraphicsManager {
  constructor(container) {
    this.container = container
    this.app = null
    this.resizeHandler = null
    
    // Graphic containers
    this.scoreBugContainer = new PIXI.Container()
    this.lowerThirdContainer = new PIXI.Container()
    this.tickerContainer = new PIXI.Container()
    this.tickerContent = new PIXI.Container()
    this.breakingContainer = new PIXI.Container()
    
    // Animation state
    this.tickerWidth = 0
    this.breakingPulseTime = 0
    this.breakingRedBar = null
  }

  async init() {
    const { app, resizeHandler } = await initPixiApp(this.container)
    this.app = app
    this.resizeHandler = resizeHandler

    // Add containers to stage
    this.app.stage.addChild(this.tickerContainer)
    this.app.stage.addChild(this.lowerThirdContainer)
    this.app.stage.addChild(this.breakingContainer)
    this.app.stage.addChild(this.scoreBugContainer)

    // Setup animation loops
    if (this.app.ticker) {
      this.app.ticker.add((ticker) => {
        this.animateTicker(ticker.deltaTime)
        this.animateBreaking(ticker.deltaTime)
      })
    }
  }

  resize() {
    if (this.resizeHandler) {
      this.resizeHandler()
    }
  }

  update(state) {
    if (!state || !this.app || !this.app.renderer) {
      console.warn('[Preview] Update called but app not ready:', { state: !!state, app: !!this.app, renderer: !!this.app?.renderer })
      return
    }

    console.log('[Preview] Updating graphics with state:', {
      scoreBug: state.scoreBug?.visible,
      lowerThird: state.lowerThird?.visible,
      ticker: state.ticker?.visible,
      breaking: state.breakingBanner?.visible
    })

    if (state.scoreBug) this.renderScoreBug(state.scoreBug)
    if (state.lowerThird) this.renderLowerThird(state.lowerThird)
    if (state.ticker) this.renderTicker(state.ticker)
    if (state.breakingBanner) this.renderBreaking(state.breakingBanner)
  }

  // ============================================
  // SCORE BUG
  // ============================================

  renderScoreBug(state) {
    this.scoreBugContainer.removeChildren()

    if (!state.visible) {
      this.scoreBugContainer.visible = false
      console.log('[Preview] ScoreBug not visible')
      return
    }

    console.log('[Preview] Rendering ScoreBug:', state)
    this.scoreBugContainer.visible = true

    const width = 420
    const height = 60
    const x = (CANVAS_WIDTH - width) / 2
    const y = CANVAS_HEIGHT * 0.05

    this.scoreBugContainer.position.set(x, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, width, height, 8)
    bg.fill({ color: 0x000000, alpha: 0.85 })
    this.scoreBugContainer.addChild(bg)

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
    this.scoreBugContainer.addChild(homeBg)

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
    this.scoreBugContainer.addChild(awayBg)

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
    this.scoreBugContainer.addChild(homeText)

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
    this.scoreBugContainer.addChild(awayText)

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
    this.scoreBugContainer.addChild(scoreText)

    // Timer
    const timerW = 100
    const timerH = 26
    const timerX = (width - timerW) / 2
    const timerY = height

    const timerBg = new PIXI.Graphics()
    timerBg.roundRect(0, 0, timerW, timerH, 4)
    timerBg.fill({ color: 0x000000, alpha: 0.9 })
    timerBg.position.set(timerX, timerY)
    this.scoreBugContainer.addChild(timerBg)

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
    this.scoreBugContainer.addChild(timerText)

    // Possession indicator
    if (state.possession === 'home') {
      const dot = new PIXI.Graphics()
      dot.circle(0, 0, 4)
      dot.fill(0xffffff)
      dot.position.set(110, height / 2)
      this.scoreBugContainer.addChild(dot)
    } else if (state.possession === 'away') {
      const dot = new PIXI.Graphics()
      dot.circle(0, 0, 4)
      dot.fill(0xffffff)
      dot.position.set(width - 110, height / 2)
      this.scoreBugContainer.addChild(dot)
    }
  }

  // ============================================
  // LOWER THIRD
  // ============================================

  renderLowerThird(state) {
    this.lowerThirdContainer.removeChildren()

    if (!state.visible || !state.title) {
      this.lowerThirdContainer.visible = false
      console.log('[Preview] LowerThird not visible or no title:', { visible: state.visible, title: state.title })
      return
    }

    console.log('[Preview] Rendering LowerThird:', state)
    this.lowerThirdContainer.visible = true

    const width = 400
    const height = 80
    const x = 50
    const y = CANVAS_HEIGHT - height - (CANVAS_HEIGHT * 0.15)

    this.lowerThirdContainer.position.set(x, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, width, height, 6)
    bg.fill({ color: 0x000000, alpha: 0.95 })
    this.lowerThirdContainer.addChild(bg)

    // Color bar
    const barRect = new PIXI.Graphics()
    barRect.roundRect(0, 0, 6, height, 0)
    barRect.fill({ color: hexToNumber(state.teamColor) })
    
    const mask = new PIXI.Graphics()
    mask.roundRect(0, 0, width, height, 6)
    mask.fill(0xffffff)
    
    this.lowerThirdContainer.addChild(mask)
    barRect.mask = mask
    this.lowerThirdContainer.addChild(barRect)

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
    this.lowerThirdContainer.addChild(title)

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
      this.lowerThirdContainer.addChild(subtitle)
    }
  }

  // ============================================
  // TICKER
  // ============================================

  renderTicker(state) {
    this.tickerContainer.removeChildren()
    this.tickerContent.removeChildren()

    if (!state.visible || !state.items || state.items.length === 0) {
      this.tickerContainer.visible = false
      console.log('[Preview] Ticker not visible or no items:', { visible: state.visible, itemsCount: state.items?.length })
      return
    }

    console.log('[Preview] Rendering Ticker:', { visible: state.visible, itemsCount: state.items.length })
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

  animateTicker(delta) {
    if (this.tickerContainer.visible && this.tickerContent) {
      const speed = this.tickerContent.scrollSpeed || 2
      this.tickerContent.x -= speed * delta

      if (this.tickerContent.x < -this.tickerWidth) {
        this.tickerContent.x = CANVAS_WIDTH
      }
    }
  }

  // ============================================
  // BREAKING BANNER
  // ============================================

  renderBreaking(state) {
    this.breakingContainer.removeChildren()

    if (!state.visible || !state.text) {
      this.breakingContainer.visible = false
      console.log('[Preview] Breaking not visible or no text:', { visible: state.visible, text: state.text })
      return
    }

    console.log('[Preview] Rendering Breaking:', state)
    this.breakingContainer.visible = true

    const height = 56
    const width = CANVAS_WIDTH
    const y = CANVAS_HEIGHT - height - 48

    this.breakingContainer.position.set(0, y)

    // Background
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, width, height)
    bg.fill({ color: 0x000000, alpha: 0.95 })
    this.breakingContainer.addChild(bg)

    // Red bar
    const redW = 160
    this.breakingRedBar = new PIXI.Graphics()
    this.breakingRedBar.rect(0, 0, redW, height)
    this.breakingRedBar.fill({ color: 0xdc2626 })
    this.breakingContainer.addChild(this.breakingRedBar)

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
    this.breakingContainer.addChild(breakingLabel)

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
    this.breakingContainer.addChild(text)
  }

  animateBreaking(delta) {
    if (this.breakingContainer.visible && this.breakingRedBar) {
      this.breakingPulseTime += delta * 0.1
      const alpha = 0.8 + Math.sin(this.breakingPulseTime) * 0.2
      this.breakingRedBar.alpha = alpha
    }
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  const appElement = document.getElementById('app')
  if (!appElement) {
    console.error('[Preview] App element not found')
    return
  }

  console.log('[Preview] Initializing graphics manager...')
  pixiManager = new GraphicsManager(appElement)
  await pixiManager.init()
  console.log('[Preview] Graphics manager initialized')
  
  // Show a test graphic on initial load to verify rendering works
  const testState = {
    ...graphicsState,
    scoreBug: {
      ...graphicsState.scoreBug,
      visible: true,
      homeTeam: { name: 'Home Team', shortName: 'HOM', score: 0, color: '#14b8a6' },
      awayTeam: { name: 'Away Team', shortName: 'AWY', score: 0, color: '#dc2626' },
      timer: { minutes: 0, seconds: 0, period: '1st' },
    }
  }
  
  console.log('[Preview] Performing initial render with test state')
  pixiManager.update(testState)
  
  // Connect to WebSocket for live updates
  connectWebSocket()
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[Preview] WebSocket connected')
    ws.send(JSON.stringify({ type: 'ping' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('[Preview] Received WebSocket message:', data.type, data)
      if (data.type === 'state') {
        graphicsState = data.data
        console.log('[Preview] Updated graphicsState:', graphicsState)
        if (pixiManager) {
          pixiManager.update(graphicsState)
        } else {
          console.warn('[Preview] pixiManager not ready yet')
        }
      }
    } catch (error) {
      console.error('[Preview] Error:', error)
    }
  }

  ws.onerror = (error) => console.error('[Preview] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[Preview] Reconnecting...')
    setTimeout(connectWebSocket, 3000)
  }
}

window.addEventListener('resize', () => {
  if (pixiManager) {
    pixiManager.resize()
  }
})

init()

