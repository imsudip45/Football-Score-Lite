// Football Graphics Renderer
// Complete broadcast graphics package for football/soccer

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
const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

// Color utilities
const hexToNumber = (hex) => {
  if (!hex) return 0x000000
  return parseInt(hex.replace('#', ''), 16)
}

const darken = (hex, amount = 0.2) => {
  const num = hexToNumber(hex)
  const r = Math.max(0, ((num >> 16) & 255) * (1 - amount))
  const g = Math.max(0, ((num >> 8) & 255) * (1 - amount))
  const b = Math.max(0, (num & 255) * (1 - amount))
  return (r << 16) | (g << 8) | b
}

// Graphics state
let state = {
  scoreBug: { visible: false, homeTeam: { name: 'Home', shortName: 'HOM', score: 0, color: '#c8102e' }, awayTeam: { name: 'Away', shortName: 'AWY', score: 0, color: '#004d98' }, timer: { minutes: 0, seconds: 0, period: '1st' }, possession: null, leagueName: 'LIVE' },
  lowerThird: { visible: false, title: '', subtitle: '', teamColor: '#c8102e' },
  ticker: { visible: false, items: [], scrollSpeed: 80 },
  breakingBanner: { visible: false, text: '' },
  goal: { visible: false, playerName: '', playerNumber: '', goalTime: '', teamColor: '#c8102e', isOwnGoal: false, isPenalty: false },
  card: { visible: false, playerName: '', playerNumber: '', cardType: 'yellow', cardTime: '', teamColor: '#c8102e' },
  substitution: { visible: false, playerIn: '', playerOut: '', numberIn: '', numberOut: '', teamColor: '#c8102e' },
  vsGraphic: { visible: false, homeTeam: { name: 'Home', color: '#c8102e' }, awayTeam: { name: 'Away', color: '#004d98' }, matchInfo: '', venue: '', competition: '', competitionLogo: '' },
  nameplate: { visible: false, playerName: '', position: '', number: '', teamColor: '#c8102e' },
  // Formation/Lineup graphic
  lineup: { 
    visible: false, 
    team: 'home', // 'home' or 'away'
    teamName: 'Team', 
    teamColor: '#c8102e', 
    formation: '4-3-3',
    players: [], // Array of { number, name, position: {x, y}, photo }
    subs: [], // Array of { number, name }
    coach: ''
  },
}

// Container references
let containers = {}
let tickerContent = null
let tickerWidth = 0
let tickerScrollX = 0
let breakingPulseTime = 0


// ============================================
// INITIALIZATION
// ============================================

async function init() {
  const container = document.getElementById('app')
  if (!container) return console.error('[Graphics] App element not found')

  container.innerHTML = ''
  console.log('[Graphics] Initializing PixiJS...')

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
  Object.assign(app.canvas.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'block' })

  // Responsive scaling
  const resize = () => {
    const scale = Math.min(container.clientWidth / CANVAS_WIDTH, container.clientHeight / CANVAS_HEIGHT)
    app.stage.scale.set(scale)
    app.stage.position.set((container.clientWidth - CANVAS_WIDTH * scale) / 2, (container.clientHeight - CANVAS_HEIGHT * scale) / 2)
  }
  resize()
  window.addEventListener('resize', resize)

  // Create all containers
  const graphicTypes = ['ticker', 'lowerThird', 'breakingBanner', 'scoreBug', 'goal', 'card', 'substitution', 'vsGraphic', 'nameplate', 'lineup']
  graphicTypes.forEach(type => {
    containers[type] = new PIXI.Container()
    containers[type].alpha = 0
    app.stage.addChild(containers[type])
  })

  // Animation loop
  app.ticker.add((ticker) => {
    animateTicker(ticker.deltaTime)
    animateBreaking(ticker.deltaTime)
  })

  console.log('[Graphics] Initialized')
  connectWebSocket()
}

// ============================================
// MAIN SCORE BUG (Main_Score style)
// Based on football-graphics-generation/graphics/08-live-score-bug.js
// ============================================

function renderScoreBug() {
  const c = containers.scoreBug
  c.removeChildren()
  const s = state.scoreBug
  if (!s.visible) { c.alpha = 0; return }

  // Position: top-left area
  c.position.set(50, 40)

  // League logo area (white box)
  const leagueBox = new PIXI.Graphics()
  leagueBox.roundRect(15, 5, 80, 45, 3)
  leagueBox.fill({ color: 0xffffff })
  c.addChild(leagueBox)

  // League text
  const leagueText = new PIXI.Text({
    text: s.leagueName || 'LIVE',
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 20, 
      fontWeight: '900', 
      fontStyle: 'italic',
      fill: 0xff5a5a 
    }
  })
  leagueText.anchor.set(0.5, 0.5)
  leagueText.position.set(55, 27)
  c.addChild(leagueText)

  // Home team logo box
  const homeLogoBox = new PIXI.Graphics()
  homeLogoBox.rect(100, 5, 50, 45)
  homeLogoBox.fill({ color: hexToNumber(s.homeTeam.color) })
  c.addChild(homeLogoBox)

  // Home logo inner circle
  const homeLogoInner = new PIXI.Graphics()
  homeLogoInner.circle(125, 27, 18)
  homeLogoInner.fill({ color: 0xffffff })
  c.addChild(homeLogoInner)
  const homeLogoCenter = new PIXI.Graphics()
  homeLogoCenter.circle(125, 27, 15)
  homeLogoCenter.fill({ color: hexToNumber(s.homeTeam.color) })
  c.addChild(homeLogoCenter)

  // Home team name box (white)
  const homeNameBox = new PIXI.Graphics()
  homeNameBox.rect(150, 5, 80, 45)
  homeNameBox.fill({ color: 0xffffff })
  c.addChild(homeNameBox)

  // Home team underline (accent color)
  const homeUnderline = new PIXI.Graphics()
  homeUnderline.rect(150, 45, 80, 5)
  homeUnderline.fill({ color: hexToNumber(s.homeTeam.color) })
  c.addChild(homeUnderline)

  // Home team name
  const homeNameText = new PIXI.Text({
    text: s.homeTeam.shortName,
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  homeNameText.anchor.set(0.5, 0.5)
  homeNameText.position.set(190, 25)
  c.addChild(homeNameText)

  // Scores box (white)
  const scoresBox = new PIXI.Graphics()
  scoresBox.rect(230, 5, 80, 45)
  scoresBox.fill({ color: 0xffffff })
  c.addChild(scoresBox)

  // Home score
  const homeScore = new PIXI.Text({
    text: String(s.homeTeam.score),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 28, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  homeScore.anchor.set(0.5, 0.5)
  homeScore.position.set(250, 27)
  c.addChild(homeScore)

  // Away score
  const awayScore = new PIXI.Text({
    text: String(s.awayTeam.score),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 28, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  awayScore.anchor.set(0.5, 0.5)
  awayScore.position.set(290, 27)
  c.addChild(awayScore)

  // Away team name box (white)
  const awayNameBox = new PIXI.Graphics()
  awayNameBox.rect(310, 5, 80, 45)
  awayNameBox.fill({ color: 0xffffff })
  c.addChild(awayNameBox)

  // Away team underline
  const awayUnderline = new PIXI.Graphics()
  awayUnderline.rect(310, 45, 80, 5)
  awayUnderline.fill({ color: hexToNumber(s.awayTeam.color) })
  c.addChild(awayUnderline)

  // Away team name
  const awayNameText = new PIXI.Text({
    text: s.awayTeam.shortName,
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  awayNameText.anchor.set(0.5, 0.5)
  awayNameText.position.set(350, 25)
  c.addChild(awayNameText)

  // Away team logo box (white)
  const awayLogoBox = new PIXI.Graphics()
  awayLogoBox.rect(390, 5, 50, 45)
  awayLogoBox.fill({ color: 0xffffff })
  c.addChild(awayLogoBox)

  // Away logo inner
  const awayLogoInner = new PIXI.Graphics()
  awayLogoInner.circle(415, 27, 18)
  awayLogoInner.fill({ color: hexToNumber(s.awayTeam.color) })
  c.addChild(awayLogoInner)

  // Time box (accent color)
  const timeBox = new PIXI.Graphics()
  timeBox.rect(445, 5, 90, 45)
  timeBox.fill({ color: 0xff5a5a })
  c.addChild(timeBox)

  // Time text
  const mins = String(s.timer.minutes).padStart(2, '0')
  const secs = String(s.timer.seconds).padStart(2, '0')
  const timeText = new PIXI.Text({
    text: `${mins}:${secs}`,
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 26, 
      fontWeight: '900', 
      fill: 0xffffff 
    }
  })
  timeText.anchor.set(0.5, 0.5)
  timeText.position.set(490, 27)
  c.addChild(timeText)

  // Period indicator (if not 1st half)
  if (s.timer.period && s.timer.period !== '1st') {
    const periodText = new PIXI.Text({
      text: s.timer.period,
      style: { 
        fontFamily: 'Arial', 
        fontSize: 14, 
        fill: 0x1a1a1a 
      }
    })
    periodText.anchor.set(0, 0.5)
    periodText.position.set(545, 27)
    c.addChild(periodText)
  }
}


// ============================================
// NAMEPLATE / LOWER THIRD (name_Plate style)
// Based on football-graphics-generation/graphics/09-name-plate.js
// ============================================

function renderNameplate() {
  const c = containers.nameplate
  c.removeChildren()
  const s = state.nameplate
  if (!s.visible || !s.playerName) { c.alpha = 0; return }

  // Dimensions matching reference (500x100)
  const width = 500, height = 85
  c.position.set(60, CANVAS_HEIGHT - height - 120)

  // Team logo area with chevron pattern
  const logoArea = new PIXI.Graphics()
  logoArea.rect(15, 5, 80, 65)
  logoArea.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoArea)

  // Chevron pattern
  const chevrons = new PIXI.Graphics()
  for (let i = 0; i < 4; i++) {
    chevrons.moveTo(15, 5 + i * 20)
    chevrons.lineTo(55, 15 + i * 20)
    chevrons.lineTo(15, 25 + i * 20)
  }
  chevrons.stroke({ color: darken(s.teamColor, 0.2), width: 1, alpha: 0.3 })
  c.addChild(chevrons)

  // Team logo placeholder
  const logoOuter = new PIXI.Graphics()
  logoOuter.circle(55, 37, 25)
  logoOuter.fill({ color: 0xffffff })
  c.addChild(logoOuter)

  const logoInner = new PIXI.Graphics()
  logoInner.circle(55, 37, 21)
  logoInner.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoInner)

  // Name panel (gray background)
  const namePanel = new PIXI.Graphics()
  namePanel.rect(95, 5, 380, 35)
  namePanel.fill({ color: 0xdddddd })
  c.addChild(namePanel)

  // Name text (with number if provided)
  const displayName = s.number ? `${s.number}. ${s.playerName}` : s.playerName
  const nameText = new PIXI.Text({
    text: displayName.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 24, 
      fontWeight: '900', 
      fill: hexToNumber(s.teamColor) 
    }
  })
  nameText.anchor.set(0, 0.5)
  nameText.position.set(110, 22)
  c.addChild(nameText)

  // Role/Position panel (team color background)
  const rolePanel = new PIXI.Graphics()
  rolePanel.rect(95, 40, 380, 30)
  rolePanel.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(rolePanel)

  // Role text
  const roleText = new PIXI.Text({
    text: s.position || '',
    style: { 
      fontFamily: 'Arial', 
      fontSize: 16, 
      fill: 0xffffff 
    }
  })
  roleText.anchor.set(0, 0.5)
  roleText.position.set(110, 55)
  c.addChild(roleText)
}

// ============================================
// GOAL GRAPHIC (Goal style)
// Based on football-graphics-generation/graphics/04-goal-scorer.js
// ============================================

function renderGoal() {
  const c = containers.goal
  c.removeChildren()
  const s = state.goal
  if (!s.visible) { c.alpha = 0; return }

  // Dimensions matching reference (450x60)
  const width = 450, height = 60
  // Position: bottom-left area
  c.position.set(60, CANVAS_HEIGHT - height - 200)

  // Team logo area
  const logoArea = new PIXI.Graphics()
  logoArea.rect(10, 10, 50, 40)
  logoArea.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoArea)

  // Mini logo
  const logoOuter = new PIXI.Graphics()
  logoOuter.circle(35, 30, 15)
  logoOuter.fill({ color: 0xffffff })
  c.addChild(logoOuter)

  const logoInner = new PIXI.Graphics()
  logoInner.circle(35, 30, 12)
  logoInner.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoInner)

  // Main panel with team color
  const panel = new PIXI.Graphics()
  panel.rect(60, 10, 380, 40)
  panel.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(panel)

  // Goal scorer text with number
  const playerNumber = s.playerNumber || ''
  const displayName = playerNumber ? `${playerNumber}. ${s.playerName}` : s.playerName
  const goalLabel = s.isOwnGoal ? '(OG) ' : s.isPenalty ? '(PEN) ' : ''
  const text = new PIXI.Text({
    text: `${goalLabel}${displayName.toUpperCase()}`,
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0xffffff 
    }
  })
  text.anchor.set(0, 0.5)
  text.position.set(80, 30)
  c.addChild(text)

  // Goal time (if provided)
  if (s.goalTime) {
    const timeText = new PIXI.Text({
      text: s.goalTime,
      style: { 
        fontFamily: 'Arial', 
        fontSize: 16, 
        fill: 0xffffff,
        alpha: 0.8
      }
    })
    timeText.anchor.set(1, 0.5)
    timeText.position.set(420, 30)
    c.addChild(timeText)
  }
}

// ============================================
// CARD GRAPHIC (cards style - matching reference exactly)
// Position: TOP-LEFT area
// Based on football-graphics-generation/graphics/03-yellow-card.js
// ============================================

function renderCard() {
  const c = containers.card
  c.removeChildren()
  const s = state.card
  if (!s.visible) { c.alpha = 0; return }

  // Dimensions matching reference image (550x120)
  const width = 550, height = 120
  // Position: TOP-LEFT area
  c.position.set(50, 120)

  // Team logo area with chevron pattern
  const logoArea = new PIXI.Graphics()
  logoArea.rect(15, 15, 80, 85)
  logoArea.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoArea)

  // Chevron pattern on logo area
  const chevrons = new PIXI.Graphics()
  for (let i = 0; i < 5; i++) {
    chevrons.moveTo(15, 15 + i * 20)
    chevrons.lineTo(55, 35 + i * 20)
    chevrons.lineTo(15, 55 + i * 20)
  }
  chevrons.stroke({ color: darken(s.teamColor, 0.2), width: 1, alpha: 0.3 })
  c.addChild(chevrons)

  // Logo placeholder circle
  const logoOuter = new PIXI.Graphics()
  logoOuter.circle(55, 57, 30)
  logoOuter.fill({ color: 0xffffff })
  c.addChild(logoOuter)

  const logoInner = new PIXI.Graphics()
  logoInner.circle(55, 57, 25)
  logoInner.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoInner)

  // Card graphic (tilted)
  const cardColor = s.cardType === 'red' ? 0xdc2626 : 0xfbbf24
  const cardIcon = new PIXI.Graphics()
  cardIcon.roundRect(0, 0, 50, 70, 5)
  cardIcon.fill({ color: cardColor })
  cardIcon.position.set(115, 25)
  cardIcon.rotation = -0.3
  c.addChild(cardIcon)

  // Card type panel (gray background)
  const typePanel = new PIXI.Graphics()
  typePanel.rect(175, 15, 350, 40)
  typePanel.fill({ color: 0xcccccc })
  c.addChild(typePanel)

  // Card type text
  const cardLabel = s.cardType === 'red' ? 'RED CARD' : 'YELLOW CARD'
  const typeText = new PIXI.Text({
    text: cardLabel,
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  typeText.anchor.set(0.5, 0.5)
  typeText.position.set(350, 35)
  c.addChild(typeText)

  // Player panel (lighter gray)
  const playerPanel = new PIXI.Graphics()
  playerPanel.rect(175, 55, 350, 40)
  playerPanel.fill({ color: 0xdddddd })
  c.addChild(playerPanel)

  // Player number + name text
  const playerNumber = s.playerNumber || ''
  const displayName = playerNumber ? `${playerNumber}. ${s.playerName}` : s.playerName
  const playerText = new PIXI.Text({
    text: displayName.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 24, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  playerText.anchor.set(0.5, 0.5)
  playerText.position.set(350, 75)
  c.addChild(playerText)

  // Bottom accent line (two colors)
  const bottomLineLeft = new PIXI.Graphics()
  bottomLineLeft.rect(175, 95, 175, 5)
  bottomLineLeft.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(bottomLineLeft)

  const bottomLineRight = new PIXI.Graphics()
  bottomLineRight.rect(350, 95, 175, 5)
  bottomLineRight.fill({ color: 0x004d98 })
  c.addChild(bottomLineRight)
}


// ============================================
// SUBSTITUTION GRAPHIC (Sub style)
// Based on football-graphics-generation/graphics/02-substitution.js
// ============================================

function renderSubstitution() {
  const c = containers.substitution
  c.removeChildren()
  const s = state.substitution
  if (!s.visible) { c.alpha = 0; return }

  // Dimensions matching reference (600x120)
  const width = 600, height = 120
  c.position.set(60, CANVAS_HEIGHT - height - 180)

  // Arrows container
  // Up arrow (red - player going out)
  const upArrow = new PIXI.Graphics()
  upArrow.moveTo(30, 25)
  upArrow.lineTo(45, 50)
  upArrow.lineTo(15, 50)
  upArrow.closePath()
  upArrow.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(upArrow)

  // Down arrow (green - player coming in)
  const downArrow = new PIXI.Graphics()
  downArrow.moveTo(15, 55)
  downArrow.lineTo(45, 55)
  downArrow.lineTo(30, 80)
  downArrow.closePath()
  downArrow.fill({ color: 0x00a651 })
  c.addChild(downArrow)

  // Team logo area with chevron pattern
  const logoArea = new PIXI.Graphics()
  logoArea.rect(60, 15, 80, 85)
  logoArea.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoArea)

  // Chevron pattern
  const chevrons = new PIXI.Graphics()
  for (let i = 0; i < 5; i++) {
    chevrons.moveTo(60, 15 + i * 20)
    chevrons.lineTo(100, 35 + i * 20)
    chevrons.lineTo(60, 55 + i * 20)
  }
  chevrons.stroke({ color: darken(s.teamColor, 0.2), width: 1, alpha: 0.3 })
  c.addChild(chevrons)

  // Logo placeholder
  const logoOuter = new PIXI.Graphics()
  logoOuter.circle(100, 57, 30)
  logoOuter.fill({ color: 0xffffff })
  c.addChild(logoOuter)

  const logoInner = new PIXI.Graphics()
  logoInner.circle(100, 57, 25)
  logoInner.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoInner)

  // Player OUT panel (top - gray)
  const outPanel = new PIXI.Graphics()
  outPanel.rect(140, 15, 350, 40)
  outPanel.fill({ color: 0xcccccc })
  c.addChild(outPanel)

  // Player OUT text
  const outText = new PIXI.Text({
    text: `${s.numberOut || ''}. ${s.playerOut}`.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  outText.position.set(155, 25)
  c.addChild(outText)

  // Player IN panel (bottom - lighter gray)
  const inPanel = new PIXI.Graphics()
  inPanel.rect(140, 55, 350, 40)
  inPanel.fill({ color: 0xdddddd })
  c.addChild(inPanel)

  // Player IN text
  const inText = new PIXI.Text({
    text: `${s.numberIn || ''}. ${s.playerIn}`.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 22, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  inText.position.set(155, 65)
  c.addChild(inText)

  // Bottom accent line (two colors)
  const bottomLineLeft = new PIXI.Graphics()
  bottomLineLeft.rect(140, 95, 175, 5)
  bottomLineLeft.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(bottomLineLeft)

  const bottomLineRight = new PIXI.Graphics()
  bottomLineRight.rect(315, 95, 175, 5)
  bottomLineRight.fill({ color: 0x004d98 })
  c.addChild(bottomLineRight)
}

// ============================================
// VS / PRE-MATCH GRAPHIC (VS style)
// Based on football-graphics-generation/graphics/07-versus-screen.js
// ============================================

function renderVSGraphic() {
  const c = containers.vsGraphic
  c.removeChildren()
  const s = state.vsGraphic
  if (!s.visible) { c.alpha = 0; return }

  // Full screen graphic
  c.position.set(0, 0)

  // Background
  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  bg.fill({ color: 0x1a1a1a })
  c.addChild(bg)

  // Left side (Home team) with chevron pattern
  const leftBg = new PIXI.Graphics()
  leftBg.rect(40, 0, 900, CANVAS_HEIGHT)
  leftBg.fill({ color: hexToNumber(s.homeTeam.color) })
  c.addChild(leftBg)

  // Chevron pattern for home
  const homeChevrons = new PIXI.Graphics()
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 12; j++) {
      const x = 40 + j * 80
      const y = i * 80
      homeChevrons.moveTo(x, y)
      homeChevrons.lineTo(x + 40, y + 40)
      homeChevrons.lineTo(x, y + 80)
    }
  }
  homeChevrons.stroke({ color: darken(s.homeTeam.color, 0.2), width: 2, alpha: 0.2 })
  c.addChild(homeChevrons)

  // Right side (Away team) with chevron pattern
  const rightBg = new PIXI.Graphics()
  rightBg.rect(980, 0, 900, CANVAS_HEIGHT)
  rightBg.fill({ color: hexToNumber(s.awayTeam.color) })
  c.addChild(rightBg)

  // Chevron pattern for away
  const awayChevrons = new PIXI.Graphics()
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 12; j++) {
      const x = 980 + j * 80
      const y = i * 80
      awayChevrons.moveTo(x, y)
      awayChevrons.lineTo(x + 40, y + 40)
      awayChevrons.lineTo(x, y + 80)
    }
  }
  awayChevrons.stroke({ color: darken(s.awayTeam.color, 0.2), width: 2, alpha: 0.2 })
  c.addChild(awayChevrons)

  // Left edge bar
  const leftEdge = new PIXI.Graphics()
  leftEdge.rect(0, 0, 40, CANVAS_HEIGHT)
  leftEdge.fill({ color: 0x1a1a1a })
  c.addChild(leftEdge)

  // Right edge bar
  const rightEdge = new PIXI.Graphics()
  rightEdge.rect(1880, 0, 40, CANVAS_HEIGHT)
  rightEdge.fill({ color: 0x1a1a1a })
  c.addChild(rightEdge)

  // Home team logo (large circle)
  const homeLogo = new PIXI.Graphics()
  homeLogo.circle(480, 450, 200)
  homeLogo.fill({ color: 0xfcb434 })
  homeLogo.stroke({ color: 0x1a1a1a, width: 15 })
  c.addChild(homeLogo)

  const homeLogoInner = new PIXI.Graphics()
  homeLogoInner.circle(480, 450, 150)
  homeLogoInner.fill({ color: hexToNumber(s.homeTeam.color) })
  c.addChild(homeLogoInner)

  // Away team logo (large circle)
  const awayLogo = new PIXI.Graphics()
  awayLogo.circle(1440, 450, 180)
  awayLogo.fill({ color: 0xffffff })
  awayLogo.stroke({ color: 0xfcb434, width: 8 })
  c.addChild(awayLogo)

  const awayLogoInner = new PIXI.Graphics()
  awayLogoInner.circle(1440, 450, 140)
  awayLogoInner.stroke({ color: hexToNumber(s.awayTeam.color), width: 5 })
  c.addChild(awayLogoInner)

  // VS badge (star shape)
  const vsBadge = new PIXI.Graphics()
  const points = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 80 : 50
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    points.push(960 + Math.cos(angle) * radius)
    points.push(450 + Math.sin(angle) * radius)
  }
  vsBadge.poly(points)
  vsBadge.fill({ color: 0xffffff })
  c.addChild(vsBadge)

  // VS text
  const vsText = new PIXI.Text({
    text: 'VS',
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 36, 
      fontWeight: '900', 
      fill: 0x1a1a1a 
    }
  })
  vsText.anchor.set(0.5)
  vsText.position.set(960, 440)
  c.addChild(vsText)

  // Match info below VS
  if (s.matchInfo) {
    const matchText = new PIXI.Text({
      text: s.matchInfo,
      style: { 
        fontFamily: 'Arial', 
        fontSize: 14, 
        fill: 0x666666 
      }
    })
    matchText.anchor.set(0.5)
    matchText.position.set(960, 490)
    c.addChild(matchText)
  }

  // Home team name
  const homeText = new PIXI.Text({
    text: s.homeTeam.name.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 56, 
      fontWeight: '900', 
      fill: 0xffffff 
    }
  })
  homeText.anchor.set(0.5)
  homeText.position.set(480, 750)
  c.addChild(homeText)

  // Away team name
  const awayText = new PIXI.Text({
    text: s.awayTeam.name.toUpperCase(),
    style: { 
      fontFamily: 'Arial Black, Arial', 
      fontSize: 56, 
      fontWeight: '900', 
      fill: 0xffffff 
    }
  })
  awayText.anchor.set(0.5)
  awayText.position.set(1440, 750)
  c.addChild(awayText)

  // Competition name at top
  if (s.competition) {
    const compText = new PIXI.Text({
      text: s.competition.toUpperCase(),
      style: { 
        fontFamily: 'Arial', 
        fontSize: 24, 
        fill: 0xffffff,
        letterSpacing: 4
      }
    })
    compText.anchor.set(0.5)
    compText.position.set(960, 100)
    c.addChild(compText)
  }

  // Venue at bottom
  if (s.venue) {
    const venueText = new PIXI.Text({
      text: s.venue,
      style: { 
        fontFamily: 'Arial', 
        fontSize: 18, 
        fill: 0x888888 
      }
    })
    venueText.anchor.set(0.5)
    venueText.position.set(960, CANVAS_HEIGHT - 80)
    c.addChild(venueText)
  }
}


// ============================================
// LINEUP / FORMATION GRAPHIC (Playing_11 style)
// Full-screen starting lineup display
// ============================================

function renderLineup() {
  const c = containers.lineup
  c.removeChildren()
  const s = state.lineup
  if (!s.visible) { c.alpha = 0; return }

  // Full screen graphic
  c.position.set(0, 0)

  // Main background (white)
  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  bg.fill({ color: 0xffffff })
  c.addChild(bg)

  // Left panel with team color and chevron pattern
  const leftPanel = new PIXI.Graphics()
  leftPanel.rect(0, 0, 280, CANVAS_HEIGHT)
  leftPanel.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(leftPanel)

  // Chevron pattern on left panel
  const chevrons = new PIXI.Graphics()
  for (let i = 0; i < 15; i++) {
    chevrons.moveTo(0, i * 80)
    chevrons.lineTo(140, i * 80 + 40)
    chevrons.lineTo(0, i * 80 + 80)
  }
  chevrons.stroke({ color: darken(s.teamColor, 0.15), width: 2, alpha: 0.3 })
  c.addChild(chevrons)

  // Team name
  const teamText = new PIXI.Text({
    text: s.teamName.toUpperCase(),
    style: { fontFamily: 'Arial Black, Arial', fontSize: 38, fontWeight: '900', fill: 0xffffff, fontStyle: 'italic' }
  })
  teamText.position.set(30, 180)
  c.addChild(teamText)

  // "STARTING LINEUP" text
  const lineupText = new PIXI.Text({
    text: 'STARTING LINEUP',
    style: { fontFamily: 'Arial Black, Arial', fontSize: 32, fontWeight: '900', fill: 0xffffff }
  })
  lineupText.position.set(30, 230)
  c.addChild(lineupText)

  // Team logo placeholder
  const logoOuter = new PIXI.Graphics()
  logoOuter.circle(140, 480, 90)
  logoOuter.fill({ color: 0xffffff })
  c.addChild(logoOuter)
  const logoInner = new PIXI.Graphics()
  logoInner.circle(140, 480, 80)
  logoInner.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(logoInner)

  // Pitch area (center)
  const pitchBg = new PIXI.Graphics()
  pitchBg.rect(280, 0, 920, CANVAS_HEIGHT)
  pitchBg.fill({ color: 0xf5f5f5 })
  c.addChild(pitchBg)

  // Pitch chevron pattern
  const pitchChevrons = new PIXI.Graphics()
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 12; j++) {
      const x = 280 + j * 80
      const y = i * 80
      pitchChevrons.moveTo(x, y)
      pitchChevrons.lineTo(x + 40, y + 40)
      pitchChevrons.lineTo(x, y + 80)
    }
  }
  pitchChevrons.stroke({ color: 0xe0e0e0, width: 1, alpha: 0.5 })
  c.addChild(pitchChevrons)

  // Pitch markings
  const pitchLines = new PIXI.Graphics()
  pitchLines.circle(740, 50, 50) // Center circle
  pitchLines.stroke({ color: 0x888888, width: 2, alpha: 0.5 })
  pitchLines.rect(580, 900, 320, 180) // Penalty area
  pitchLines.stroke({ color: 0x888888, width: 2, alpha: 0.5 })
  c.addChild(pitchLines)

  // Draw player cards
  if (s.players && s.players.length > 0) {
    s.players.forEach((player, index) => {
      const card = drawPlayerCard(player, s.teamColor, index)
      card.position.set(280 + (player.position?.x || 50) * 9.2 - 70, (player.position?.y || 50) * 10)
      c.addChild(card)
    })
  }

  // Right info panel
  const rightPanel = new PIXI.Graphics()
  rightPanel.rect(1200, 0, 720, CANVAS_HEIGHT)
  rightPanel.fill({ color: 0xffffff })
  c.addChild(rightPanel)

  // Coach section
  if (s.coach) {
    const coachLabel = new PIXI.Text({
      text: 'HEAD COACH',
      style: { fontFamily: 'Arial', fontSize: 14, fill: 0x888888 }
    })
    coachLabel.position.set(1250, 100)
    c.addChild(coachLabel)

    const coachName = new PIXI.Text({
      text: s.coach.toUpperCase(),
      style: { fontFamily: 'Arial Black, Arial', fontSize: 28, fontWeight: '900', fill: 0x1a1a1a }
    })
    coachName.position.set(1250, 125)
    c.addChild(coachName)
  }

  // Formation display
  const formationText = new PIXI.Text({
    text: s.formation || '4-3-3',
    style: { fontFamily: 'Arial Black, Arial', fontSize: 64, fontWeight: '900', fill: 0x1a1a1a }
  })
  formationText.position.set(1250, 180)
  c.addChild(formationText)

  // Subs section
  if (s.subs && s.subs.length > 0) {
    const subsLabel = new PIXI.Text({
      text: 'SUBSTITUTES',
      style: { fontFamily: 'Arial Black, Arial', fontSize: 16, fontWeight: '900', fill: 0x888888, fontStyle: 'italic' }
    })
    subsLabel.position.set(1250, 280)
    c.addChild(subsLabel)

    s.subs.forEach((sub, i) => {
      const subText = new PIXI.Text({
        text: `${sub.number || ''} ${sub.name || ''}`.toUpperCase(),
        style: { fontFamily: 'Arial Black, Arial', fontSize: 18, fontWeight: 'bold', fill: 0x1a1a1a }
      })
      subText.position.set(1250, 310 + i * 28)
      c.addChild(subText)
    })
  }
}

// Helper function to draw a player card for lineup
function drawPlayerCard(player, teamColor, index) {
  const card = new PIXI.Container()

  // Card background
  const bg = new PIXI.Graphics()
  bg.rect(0, 0, 130, 120)
  bg.fill({ color: hexToNumber(teamColor) })
  card.addChild(bg)

  // Player image area
  const imgBg = new PIXI.Graphics()
  imgBg.rect(5, 5, 80, 90)
  imgBg.fill({ color: darken(teamColor, 0.1) })
  card.addChild(imgBg)

  // Player silhouette (placeholder)
  const silhouette = new PIXI.Graphics()
  silhouette.circle(45, 35, 22)
  silhouette.fill({ color: 0x004d98, alpha: 0.6 })
  silhouette.rect(25, 55, 40, 35)
  silhouette.fill({ color: 0x004d98, alpha: 0.6 })
  card.addChild(silhouette)

  // Number background
  const numBg = new PIXI.Graphics()
  numBg.rect(5, 95, 30, 20)
  numBg.fill({ color: 0x1a1a1a })
  card.addChild(numBg)

  // Player number
  const numText = new PIXI.Text({
    text: String(player.number || index + 1),
    style: { fontFamily: 'Arial Black, Arial', fontSize: 12, fontWeight: '900', fill: 0xffffff }
  })
  numText.anchor.set(0.5)
  numText.position.set(20, 105)
  card.addChild(numText)

  // Player name
  const nameText = new PIXI.Text({
    text: (player.name || 'PLAYER').toUpperCase().slice(0, 12),
    style: { fontFamily: 'Arial Black, Arial', fontSize: 11, fontWeight: 'bold', fill: 0xffffff }
  })
  nameText.position.set(40, 100)
  card.addChild(nameText)

  return card
}


// ============================================
// LOWER THIRD (L3_Score style)
// ============================================

function renderLowerThird() {
  const c = containers.lowerThird
  c.removeChildren()
  const s = state.lowerThird
  if (!s.visible || !s.title) { c.alpha = 0; return }

  const width = 450, height = 85
  c.position.set(50, CANVAS_HEIGHT - height - 140)

  // Background
  const bg = new PIXI.Graphics()
  bg.roundRect(0, 0, width, height, 8)
  bg.fill({ color: 0x0a0a0a, alpha: 0.95 })
  c.addChild(bg)

  // Team color bar
  const bar = new PIXI.Graphics()
  bar.roundRect(0, 0, 8, height, 8)
  bar.fill({ color: hexToNumber(s.teamColor) })
  c.addChild(bar)

  // Title
  const titleText = new PIXI.Text({
    text: s.title.toUpperCase(),
    style: { fontFamily: 'Inter', fontSize: 26, fontWeight: '700', fill: 'white' }
  })
  titleText.position.set(24, 18)
  c.addChild(titleText)

  // Subtitle
  if (s.subtitle) {
    const subText = new PIXI.Text({
      text: s.subtitle,
      style: { fontFamily: 'Inter', fontSize: 16, fontWeight: '400', fill: '#aaaaaa' }
    })
    subText.position.set(24, 52)
    c.addChild(subText)
  }
}

// ============================================
// TICKER
// ============================================

function renderTicker() {
  const c = containers.ticker
  c.removeChildren()
  const s = state.ticker
  if (!s.visible || !s.items?.length) { c.alpha = 0; return }

  const height = 50
  c.position.set(0, CANVAS_HEIGHT - height)

  // Background
  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, height)
  bg.fill({ color: 0x0a0a0a, alpha: 0.92 })
  c.addChild(bg)

  // Label
  const labelW = 110
  const labelBg = new PIXI.Graphics()
  labelBg.rect(0, 0, labelW, height)
  labelBg.fill({ color: 0x2563eb })
  c.addChild(labelBg)

  const labelText = new PIXI.Text({
    text: 'LIVE',
    style: { fontFamily: 'Inter', fontSize: 16, fontWeight: '800', fill: 'white', letterSpacing: 2 }
  })
  labelText.anchor.set(0.5)
  labelText.position.set(labelW / 2, height / 2)
  c.addChild(labelText)

  // Mask for scrolling
  const mask = new PIXI.Graphics()
  mask.rect(labelW, 0, CANVAS_WIDTH - labelW, height)
  mask.fill(0xffffff)
  c.addChild(mask)

  // Scroll content
  tickerContent = new PIXI.Container()
  tickerContent.mask = mask
  tickerContent.position.set(CANVAS_WIDTH, height / 2)
  c.addChild(tickerContent)

  // Build items
  let xPos = 0
  s.items.forEach((item, i) => {
    if (i > 0) {
      const bullet = new PIXI.Text({ text: ' • ', style: { fontFamily: 'Inter', fontSize: 18, fill: '#555555' } })
      bullet.anchor.set(0, 0.5)
      bullet.position.set(xPos, 0)
      tickerContent.addChild(bullet)
      xPos += bullet.width
    }
    const primary = new PIXI.Text({ text: item.primary, style: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', fill: 'white' } })
    primary.anchor.set(0, 0.5)
    primary.position.set(xPos, 0)
    tickerContent.addChild(primary)
    xPos += primary.width + 8
    if (item.secondary) {
      const secondary = new PIXI.Text({ text: item.secondary, style: { fontFamily: 'Inter', fontSize: 18, fontWeight: '400', fill: '#999999' } })
      secondary.anchor.set(0, 0.5)
      secondary.position.set(xPos, 0)
      tickerContent.addChild(secondary)
      xPos += secondary.width
    }
    xPos += 50
  })
  tickerWidth = xPos
  tickerScrollX = CANVAS_WIDTH
}

function animateTicker(delta) {
  if (!state.ticker.visible || !tickerContent || tickerWidth === 0) return
  const speed = (state.ticker.scrollSpeed || 80) / 60
  tickerScrollX -= speed * delta
  if (tickerScrollX < -tickerWidth) tickerScrollX = CANVAS_WIDTH
  tickerContent.x = Math.round(tickerScrollX)
}

// ============================================
// BREAKING BANNER
// ============================================

function renderBreaking() {
  const c = containers.breakingBanner
  c.removeChildren()
  const s = state.breakingBanner
  if (!s.visible || !s.text) { c.alpha = 0; return }

  const height = 60
  c.position.set(0, CANVAS_HEIGHT - height - 50)

  // Background
  const bg = new PIXI.Graphics()
  bg.rect(0, 0, CANVAS_WIDTH, height)
  bg.fill({ color: 0x0a0a0a, alpha: 0.95 })
  c.addChild(bg)

  // Red bar
  const redW = 180
  const redBar = new PIXI.Graphics()
  redBar.rect(0, 0, redW, height)
  redBar.fill({ color: 0xdc2626 })
  c.addChild(redBar)
  containers.breakingRedBar = redBar

  // Label
  const label = new PIXI.Text({
    text: 'BREAKING',
    style: { fontFamily: 'Inter', fontSize: 22, fontWeight: '800', fill: 'white', letterSpacing: 2 }
  })
  label.anchor.set(0.5)
  label.position.set(redW / 2, height / 2)
  c.addChild(label)

  // Text
  const text = new PIXI.Text({
    text: s.text.toUpperCase(),
    style: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700', fill: 'white' }
  })
  text.anchor.set(0, 0.5)
  text.position.set(redW + 30, height / 2)
  c.addChild(text)
}

function animateBreaking(delta) {
  if (!state.breakingBanner.visible || !containers.breakingRedBar) return
  breakingPulseTime += delta * 0.1
  containers.breakingRedBar.alpha = 0.8 + Math.sin(breakingPulseTime) * 0.2
}


// ============================================
// ANIMATIONS
// ============================================

function animateShow(container, type = 'slide-down') {
  let progress = 0
  const startY = container.y
  const startX = container.x
  const startAlpha = 0

  const animate = () => {
    progress += 0.04
    const t = Math.min(progress, 1)
    const eased = easeOutBack(t)

    container.alpha = t

    switch (type) {
      case 'slide-down':
        container.y = startY - 50 + 50 * eased
        break
      case 'slide-up':
        container.y = startY + 50 - 50 * eased
        break
      case 'slide-left':
        container.x = startX - 100 + 100 * eased
        break
      case 'scale':
        container.scale.set(0.5 + 0.5 * eased)
        break
    }

    if (t >= 1) app.ticker.remove(animate)
  }
  app.ticker.add(animate)
}

function animateHide(container, type = 'slide-up') {
  let progress = 0
  const startY = container.y
  const startX = container.x

  const animate = () => {
    progress += 0.05
    const t = Math.min(progress, 1)
    const eased = easeOutCubic(t)

    container.alpha = 1 - t

    switch (type) {
      case 'slide-up':
        container.y = startY - 50 * eased
        break
      case 'slide-down':
        container.y = startY + 50 * eased
        break
      case 'slide-left':
        container.x = startX - 100 * eased
        break
      case 'scale':
        container.scale.set(1 - 0.5 * eased)
        break
    }

    if (t >= 1) {
      app.ticker.remove(animate)
      container.alpha = 0
    }
  }
  app.ticker.add(animate)
}

// ============================================
// STATE UPDATE
// ============================================

function updateState(newState) {
  const prev = { ...state }
  state = { ...state, ...newState }

  console.log('[Graphics] State updated:', Object.keys(newState).filter(k => newState[k]?.visible !== undefined).map(k => `${k}:${newState[k]?.visible}`).join(', '))

  // Score Bug
  if (state.scoreBug?.visible !== prev.scoreBug?.visible) {
    if (state.scoreBug.visible) { renderScoreBug(); animateShow(containers.scoreBug, 'slide-down') }
    else animateHide(containers.scoreBug, 'slide-up')
  } else if (state.scoreBug?.visible) renderScoreBug()

  // Lower Third
  if (state.lowerThird?.visible !== prev.lowerThird?.visible) {
    if (state.lowerThird.visible) { renderLowerThird(); animateShow(containers.lowerThird, 'slide-left') }
    else animateHide(containers.lowerThird, 'slide-left')
  } else if (state.lowerThird?.visible) renderLowerThird()

  // Ticker
  if (state.ticker?.visible !== prev.ticker?.visible) {
    if (state.ticker.visible) { renderTicker(); animateShow(containers.ticker, 'slide-up') }
    else animateHide(containers.ticker, 'slide-down')
  } else if (state.ticker?.visible) renderTicker()

  // Breaking
  if (state.breakingBanner?.visible !== prev.breakingBanner?.visible) {
    if (state.breakingBanner.visible) { renderBreaking(); animateShow(containers.breakingBanner, 'slide-up') }
    else animateHide(containers.breakingBanner, 'slide-down')
  } else if (state.breakingBanner?.visible) renderBreaking()

  // Goal
  if (state.goal?.visible !== prev.goal?.visible) {
    if (state.goal.visible) { renderGoal(); animateShow(containers.goal, 'scale') }
    else animateHide(containers.goal, 'scale')
  } else if (state.goal?.visible) renderGoal()

  // Card
  if (state.card?.visible !== prev.card?.visible) {
    if (state.card.visible) { renderCard(); animateShow(containers.card, 'slide-left') }
    else animateHide(containers.card, 'slide-left')
  } else if (state.card?.visible) renderCard()

  // Substitution
  if (state.substitution?.visible !== prev.substitution?.visible) {
    if (state.substitution.visible) { renderSubstitution(); animateShow(containers.substitution, 'slide-left') }
    else animateHide(containers.substitution, 'slide-left')
  } else if (state.substitution?.visible) renderSubstitution()

  // VS Graphic
  if (state.vsGraphic?.visible !== prev.vsGraphic?.visible) {
    if (state.vsGraphic.visible) { renderVSGraphic(); animateShow(containers.vsGraphic, 'scale') }
    else animateHide(containers.vsGraphic, 'scale')
  } else if (state.vsGraphic?.visible) renderVSGraphic()

  // Nameplate
  if (state.nameplate?.visible !== prev.nameplate?.visible) {
    if (state.nameplate.visible) { renderNameplate(); animateShow(containers.nameplate, 'slide-left') }
    else animateHide(containers.nameplate, 'slide-left')
  } else if (state.nameplate?.visible) renderNameplate()

  // Lineup
  if (state.lineup?.visible !== prev.lineup?.visible) {
    if (state.lineup.visible) { renderLineup(); animateShow(containers.lineup, 'scale') }
    else animateHide(containers.lineup, 'scale')
  } else if (state.lineup?.visible) renderLineup()
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket() {
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[Graphics] WebSocket connected')
    ws.send(JSON.stringify({ type: 'REQUEST_STATE' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'state' && data.data) updateState(data.data)
    } catch (e) {
      console.error('[Graphics] Parse error:', e)
    }
  }

  ws.onerror = (e) => console.error('[Graphics] WebSocket error:', e)
  ws.onclose = () => {
    console.log('[Graphics] Reconnecting in 3s...')
    setTimeout(connectWebSocket, 3000)
  }
}

// Start - wait for PIXI to load
function waitForPixi() {
  if (typeof PIXI !== 'undefined') {
    console.log('[Graphics] PIXI loaded, initializing...')
    init()
  } else {
    console.log('[Graphics] Waiting for PIXI...')
    setTimeout(waitForPixi, 100)
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForPixi)
} else {
  waitForPixi()
}
