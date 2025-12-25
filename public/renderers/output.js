// Clean PixiJS Graphics Renderer
// Inspired by redcast-broadcast-controller style2

const WS_URL = 'ws://localhost:8080'
const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

let ws = null
let app = null

// Easing functions
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// Color utility
const hexToNumber = (hex) => {
  if (!hex) return 0x000000
  return parseInt(hex.replace('#', ''), 16)
}

// Graphics state
let state = {
  scoreBug: {
    visible: false,
    homeTeam: { name: 'Home', shortName: 'HOM', score: 0, color: '#14b8a6' },
    awayTeam: { name: 'Away', shortName: 'AWY', score: 0, color: '#dc2626' },
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

// Container references
let scoreBugContainer = null
let lowerThirdContainer = null
let tickerContainer = null
let tickerContent = null
let breakingContainer = null
let breakingRedBar = null

// Animation state
let tickerWidth = 0
let tickerScrollX = 0
let breakingPulseTime = 0


// ============================================
// INITIALIZATION
// ============================================

async function init() {
  const container = document.getElementById('app')
  if (!container) {
    console.error('[Output] App element not found')
    return
  }

  container.innerHTML = ''
  console.log('[Output] Initializing PixiJS...')

  app = new PIXI.Application()
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: 0x111827,
    backgroundAlpha: 1,
    antialias: true,
    resolution: 2,
    powerPreference: 'high-performance',
  })

  container.appendChild(app.canvas)
  Object.assign(app.canvas.style, {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    display: 'block',
  })

  const resize = () => {
    const scale = Math.min(container.clientWidth / CANVAS_WIDTH, container.clientHeight / CANVAS_HEIGHT)
    const offsetX = (container.clientWidth - CANVAS_WIDTH * scale) / 2
    const offsetY = (container.clientHeight - CANVAS_HEIGHT * scale) / 2
    app.stage.scale.set(scale)
    app.stage.position.set(offsetX, offsetY)
  }
  resize()
  window.addEventListener('resize', resize)

  createScoreBug()
  createLowerThird()
  createTicker()
  createBreakingBanner()

  app.ticker.add((ticker) => {
    animateTicker(ticker.deltaTime)
    animateBreaking(ticker.deltaTime)
  })

  console.log('[Output] PixiJS initialized')
  connectWebSocket()
}

// ============================================
// SCORE BUG
// ============================================

function createScoreBug() {
  scoreBugContainer = new PIXI.Container()
  scoreBugContainer.alpha = 0
  scoreBugContainer.y = -100
  app.stage.addChild(scoreBugContainer)
}

function renderScoreBug() {
  scoreBugContainer.removeChildren()
  const s = state.scoreBug
  const width = 420
  const height = 60
  const x = (CANVAS_WIDTH - width) / 2
  scoreBugContainer.x = x

  const bg = new PIXI.Graphics()
  bg.roundRect(0, 0, width, height, 8)
  bg.fill({ color: 0x000000, alpha: 0.9 })
  scoreBugContainer.addChild(bg)

  const homeBg = new PIXI.Graphics()
  homeBg.moveTo(8, 0)
  homeBg.lineTo(120, 0)
  homeBg.lineTo(120, height)
  homeBg.lineTo(8, height)
  homeBg.arcTo(0, height, 0, height - 8, 8)
  homeBg.lineTo(0, 8)
  homeBg.arcTo(0, 0, 8, 0, 8)
  homeBg.fill({ color: hexToNumber(s.homeTeam.color) })
  scoreBugContainer.addChild(homeBg)

  const awayBg = new PIXI.Graphics()
  awayBg.moveTo(width - 120, 0)
  awayBg.lineTo(width - 8, 0)
  awayBg.arcTo(width, 0, width, 8, 8)
  awayBg.lineTo(width, height - 8)
  awayBg.arcTo(width, height, width - 8, height, 8)
  awayBg.lineTo(width - 120, height)
  awayBg.fill({ color: hexToNumber(s.awayTeam.color) })
  scoreBugContainer.addChild(awayBg)

  const textStyle = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: '700', fill: 'white' }

  const homeText = new PIXI.Text({ text: s.homeTeam.shortName, style: textStyle })
  homeText.anchor.set(0.5)
  homeText.position.set(60, height / 2)
  scoreBugContainer.addChild(homeText)

  const awayText = new PIXI.Text({ text: s.awayTeam.shortName, style: textStyle })
  awayText.anchor.set(0.5)
  awayText.position.set(width - 60, height / 2)
  scoreBugContainer.addChild(awayText)

  const scoreText = new PIXI.Text({
    text: s.homeTeam.score + ' - ' + s.awayTeam.score,
    style: { ...textStyle, fontSize: 32, letterSpacing: 2 },
  })
  scoreText.anchor.set(0.5)
  scoreText.position.set(width / 2, height / 2 - 2)
  scoreBugContainer.addChild(scoreText)

  const timerW = 100, timerH = 26
  const timerX = (width - timerW) / 2, timerY = height

  const timerBg = new PIXI.Graphics()
  timerBg.roundRect(0, 0, timerW, timerH, 4)
  timerBg.fill({ color: 0x000000, alpha: 0.95 })
  timerBg.position.set(timerX, timerY)
  scoreBugContainer.addChild(timerBg)

  const mins = String(s.timer.minutes).padStart(2, '0')
  const secs = String(s.timer.seconds).padStart(2, '0')
  const timerText = new PIXI.Text({
    text: s.timer.period + '  ' + mins + ':' + secs,
    style: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', fill: '#cccccc' },
  })
  timerText.anchor.set(0.5)
  timerText.position.set(timerX + timerW / 2, timerY + timerH / 2)
  scoreBugContainer.addChild(timerText)

  if (s.possession === 'home' || s.possession === 'away') {
    const dot = new PIXI.Graphics()
    dot.circle(0, 0, 4)
    dot.fill(0xffffff)
    dot.position.set(s.possession === 'home' ? 110 : width - 110, height / 2)
    scoreBugContainer.addChild(dot)
  }
}

function animateScoreBug(show) {
  const targetY = show ? CANVAS_HEIGHT * 0.05 : -100
  let progress = 0
  const animate = () => {
    progress += 0.04
    const t = Math.min(progress, 1)
    const eased = show ? easeOutBack(t) : easeOutCubic(t)
    scoreBugContainer.y = show ? -100 + (targetY + 100) * eased : CANVAS_HEIGHT * 0.05 - (CANVAS_HEIGHT * 0.05 + 100) * eased
    scoreBugContainer.alpha = show ? t : 1 - t
    if (t >= 1) app.ticker.remove(animate)
  }
  app.ticker.add(animate)
}


// ============================================
// LOWER THIRD
// ============================================

function createLowerThird() {
  lowerThirdContainer = new PIXI.Container()
  lowerThirdContainer.alpha = 0
  lowerThirdContainer.x = -400
  app.stage.addChild(lowerThirdContainer)
}

function renderLowerThird() {
  lowerThirdContainer.removeChildren()
  const s = state.lowerThird
  const width = 400, height = 80
  const y = CANVAS_HEIGHT - height - 150
  lowerThirdContainer.y = y

  const bg = new PIXI.Graphics()
  bg.roundRect(0, 0, width, height, 6)
  bg.fill({ color: 0x000000, alpha: 0.95 })
  lowerThirdContainer.addChild(bg)

  const bar = new PIXI.Graphics()
  bar.rect(0, 0, 6, height)
  bar.fill({ color: hexToNumber(s.teamColor) })
  lowerThirdContainer.addChild(bar)

  if (s.title) {
    const title = new PIXI.Text({
      text: s.title.toUpperCase(),
      style: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700', fill: 'white' },
    })
    title.position.set(24, 18)
    lowerThirdContainer.addChild(title)
  }

  if (s.subtitle) {
    const subtitle = new PIXI.Text({
      text: s.subtitle,
      style: { fontFamily: 'Inter', fontSize: 16, fontWeight: '400', fill: '#aaaaaa' },
    })
    subtitle.position.set(24, 48)
    lowerThirdContainer.addChild(subtitle)
  }
}

function animateLowerThird(show) {
  const targetX = show ? 50 : -400
  let progress = 0
  const animate = () => {
    progress += 0.04
    const t = Math.min(progress, 1)
    const eased = show ? easeOutBack(t) : easeOutCubic(t)
    lowerThirdContainer.x = show ? -400 + 450 * eased : 50 - 450 * eased
    lowerThirdContainer.alpha = show ? t : 1 - t
    if (t >= 1) app.ticker.remove(animate)
  }
  app.ticker.add(animate)
}

// ============================================
// TICKER
// ============================================

function createTicker() {
  tickerContainer = new PIXI.Container()
  tickerContainer.alpha = 0
  tickerContainer.y = CANVAS_HEIGHT + 50
  app.stage.addChild(tickerContainer)
  tickerContent = new PIXI.Container()
}

function renderTicker() {
  tickerContainer.removeChildren()
  const s = state.ticker
  const height = 48
  tickerContainer.y = CANVAS_HEIGHT - height

  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, height)
  bg.fill({ color: 0x000000, alpha: 0.9 })
  tickerContainer.addChild(bg)

  const labelW = 100
  const labelBg = new PIXI.Graphics()
  labelBg.rect(0, 0, labelW, height)
  labelBg.fill({ color: 0x2563eb })
  tickerContainer.addChild(labelBg)

  const labelText = new PIXI.Text({
    text: 'UPDATE',
    style: { fontFamily: 'Inter', fontSize: 14, fontWeight: '800', fill: 'white' },
  })
  labelText.anchor.set(0.5)
  labelText.position.set(labelW / 2, height / 2)
  tickerContainer.addChild(labelText)

  const mask = new PIXI.Graphics()
  mask.rect(labelW, 0, CANVAS_WIDTH - labelW, height)
  mask.fill(0xffffff)
  tickerContainer.addChild(mask)

  tickerContent = new PIXI.Container()
  tickerContent.mask = mask
  tickerContent.position.set(CANVAS_WIDTH, height / 2)
  tickerContainer.addChild(tickerContent)

  let xPos = 0
  const textStyle = { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', fill: 'white' }
  const secondaryStyle = { fontFamily: 'Inter', fontSize: 18, fontWeight: '400', fill: '#cccccc' }

  if (s.items && s.items.length > 0) {
    s.items.forEach((item, i) => {
      if (i > 0) {
        const bullet = new PIXI.Text({ text: ' • ', style: { ...textStyle, fill: '#666666' } })
        bullet.anchor.set(0, 0.5)
        bullet.position.set(xPos, 0)
        tickerContent.addChild(bullet)
        xPos += bullet.width
      }
      const primary = new PIXI.Text({ text: item.primary, style: textStyle })
      primary.anchor.set(0, 0.5)
      primary.position.set(xPos, 0)
      tickerContent.addChild(primary)
      xPos += primary.width + 10
      if (item.secondary) {
        const secondary = new PIXI.Text({ text: item.secondary, style: secondaryStyle })
        secondary.anchor.set(0, 0.5)
        secondary.position.set(xPos, 0)
        tickerContent.addChild(secondary)
        xPos += secondary.width
      }
      xPos += 60
    })
  }
  tickerWidth = xPos || CANVAS_WIDTH
  tickerScrollX = CANVAS_WIDTH
}

function animateTicker(delta) {
  if (!state.ticker.visible || !tickerContent || tickerWidth === 0) return
  const speed = (state.ticker.scrollSpeed || 80) / 60
  tickerScrollX -= speed * delta
  if (tickerScrollX < -tickerWidth) tickerScrollX = CANVAS_WIDTH
  tickerContent.x = Math.round(tickerScrollX)
}

function animateTickerShow(show) {
  const targetY = show ? CANVAS_HEIGHT - 48 : CANVAS_HEIGHT + 50
  let progress = 0
  const animate = () => {
    progress += 0.05
    const t = Math.min(progress, 1)
    const eased = easeOutCubic(t)
    tickerContainer.y = show ? CANVAS_HEIGHT + 50 - 98 * eased : CANVAS_HEIGHT - 48 + 98 * eased
    tickerContainer.alpha = show ? t : 1 - t
    if (t >= 1) app.ticker.remove(animate)
  }
  app.ticker.add(animate)
}


// ============================================
// BREAKING BANNER
// ============================================

function createBreakingBanner() {
  breakingContainer = new PIXI.Container()
  breakingContainer.alpha = 0
  breakingContainer.y = CANVAS_HEIGHT + 60
  app.stage.addChild(breakingContainer)
}

function renderBreakingBanner() {
  breakingContainer.removeChildren()
  const s = state.breakingBanner
  const height = 56
  const y = CANVAS_HEIGHT - height - 48
  breakingContainer.y = y

  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, height)
  bg.fill({ color: 0x000000, alpha: 0.95 })
  breakingContainer.addChild(bg)

  const redW = 160
  breakingRedBar = new PIXI.Graphics()
  breakingRedBar.rect(0, 0, redW, height)
  breakingRedBar.fill({ color: 0xdc2626 })
  breakingContainer.addChild(breakingRedBar)

  const label = new PIXI.Text({
    text: 'BREAKING',
    style: { fontFamily: 'Inter', fontSize: 20, fontWeight: '800', fill: 'white', letterSpacing: 1 },
  })
  label.anchor.set(0.5)
  label.position.set(redW / 2, height / 2)
  breakingContainer.addChild(label)

  if (s.text) {
    const text = new PIXI.Text({
      text: s.text.toUpperCase(),
      style: { fontFamily: 'Inter', fontSize: 20, fontWeight: '700', fill: 'white' },
    })
    text.anchor.set(0, 0.5)
    text.position.set(redW + 24, height / 2)
    breakingContainer.addChild(text)
  }
}

function animateBreaking(delta) {
  if (!state.breakingBanner.visible || !breakingRedBar) return
  breakingPulseTime += delta * 0.1
  const alpha = 0.8 + Math.sin(breakingPulseTime) * 0.2
  breakingRedBar.alpha = alpha
}

function animateBreakingShow(show) {
  const targetY = show ? CANVAS_HEIGHT - 56 - 48 : CANVAS_HEIGHT + 60
  let progress = 0
  const animate = () => {
    progress += 0.05
    const t = Math.min(progress, 1)
    const eased = easeOutCubic(t)
    breakingContainer.y = show
      ? CANVAS_HEIGHT + 60 - (CANVAS_HEIGHT + 60 - targetY) * eased
      : targetY + (CANVAS_HEIGHT + 60 - targetY) * eased
    breakingContainer.alpha = show ? t : 1 - t
    if (t >= 1) app.ticker.remove(animate)
  }
  app.ticker.add(animate)
}

// ============================================
// STATE UPDATE
// ============================================

function updateState(newState) {
  const prevState = { ...state }
  state = newState

  console.log('[Output] State updated:', {
    scoreBug: state.scoreBug.visible,
    lowerThird: state.lowerThird.visible,
    ticker: state.ticker.visible,
    breaking: state.breakingBanner.visible,
  })

  // Score Bug
  if (state.scoreBug.visible !== prevState.scoreBug?.visible) {
    if (state.scoreBug.visible) {
      renderScoreBug()
      animateScoreBug(true)
    } else {
      animateScoreBug(false)
    }
  } else if (state.scoreBug.visible) {
    renderScoreBug()
  }

  // Lower Third
  if (state.lowerThird.visible !== prevState.lowerThird?.visible) {
    if (state.lowerThird.visible) {
      renderLowerThird()
      animateLowerThird(true)
    } else {
      animateLowerThird(false)
    }
  } else if (state.lowerThird.visible) {
    renderLowerThird()
  }

  // Ticker
  if (state.ticker.visible !== prevState.ticker?.visible) {
    if (state.ticker.visible) {
      renderTicker()
      animateTickerShow(true)
    } else {
      animateTickerShow(false)
    }
  } else if (state.ticker.visible) {
    renderTicker()
  }

  // Breaking Banner
  if (state.breakingBanner.visible !== prevState.breakingBanner?.visible) {
    if (state.breakingBanner.visible) {
      renderBreakingBanner()
      animateBreakingShow(true)
    } else {
      animateBreakingShow(false)
    }
  } else if (state.breakingBanner.visible) {
    renderBreakingBanner()
  }
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[Output] WebSocket connected')
    ws.send(JSON.stringify({ type: 'REQUEST_STATE' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state' && data.data) {
        updateState(data.data)
      }
    } catch (error) {
      console.error('[Output] Parse error:', error)
    }
  }

  ws.onerror = (error) => console.error('[Output] WebSocket error:', error)
  ws.onclose = () => {
    console.log('[Output] Reconnecting in 3s...')
    setTimeout(connectWebSocket, 3000)
  }
}

// Start when PIXI is loaded
if (typeof PIXI !== 'undefined') {
  init()
} else {
  console.error('[Output] PIXI not loaded')
}
