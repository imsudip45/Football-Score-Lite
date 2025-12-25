// Standalone WebSocket server for development without Electron
// Run with: node server.js

const { WebSocketServer, WebSocket } = require('ws')

const WS_PORT = 8080

// Default state
let currentState = {
  scoreBug: {
    visible: false,
    homeTeam: { name: 'Home', shortName: 'HOM', score: 0, color: '#A50044', logo: '' },
    awayTeam: { name: 'Away', shortName: 'AWY', score: 0, color: '#00529F', logo: '' },
    timer: { minutes: 0, seconds: 0, period: '1st', extra: 0 },
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
  // Football-specific graphics
  goal: {
    visible: false,
    playerName: '',
    playerNumber: '',
    goalTime: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    isOwnGoal: false,
    isPenalty: false,
  },
  card: {
    visible: false,
    playerName: '',
    playerNumber: '',
    cardType: 'yellow',
    cardTime: '',
    teamColor: '#14b8a6',
    teamLogo: '',
  },
  substitution: {
    visible: false,
    playerIn: '',
    playerOut: '',
    numberIn: '',
    numberOut: '',
    teamColor: '#14b8a6',
    teamLogo: '',
  },
  vsGraphic: {
    visible: false,
    homeTeam: { name: 'Home', color: '#A50044', logo: '' },
    awayTeam: { name: 'Away', color: '#00529F', logo: '' },
    matchInfo: '',
    venue: '',
    competition: '',
  },
  nameplate: {
    visible: false,
    playerName: '',
    position: '',
    number: '',
    teamColor: '#14b8a6',
    teamLogo: '',
  },
  lineup: {
    visible: false,
    team: 'home',
    teamName: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    formation: '4-3-3',
    players: [],
    subs: [],
    coach: '',
  },
}

const clients = new Set()

const wss = new WebSocketServer({ port: WS_PORT, host: '0.0.0.0' })

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`[WebSocket] Client connected. Total: ${clients.size}`)

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'state', data: currentState }))

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      handleMessage(data, ws)
    } catch (error) {
      console.error('[WebSocket] Parse error:', error.message)
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`[WebSocket] Client disconnected. Total: ${clients.size}`)
  })

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error.message)
    clients.delete(ws)
  })
})

function handleMessage(data, ws) {
  switch (data.type) {
    case 'update':
      if (data.graphic) {
        currentState = { ...currentState, ...data.graphic }
        console.log('[WebSocket] State updated:', {
          scoreBug: currentState.scoreBug?.visible,
          lowerThird: currentState.lowerThird?.visible,
          ticker: currentState.ticker?.visible,
          breaking: currentState.breakingBanner?.visible,
          goal: currentState.goal?.visible,
          card: currentState.card?.visible,
          sub: currentState.substitution?.visible,
          vs: currentState.vsGraphic?.visible,
          nameplate: currentState.nameplate?.visible,
          lineup: currentState.lineup?.visible,

        })
        broadcast({ type: 'state', data: currentState })
      }
      break

    case 'REQUEST_STATE':
      ws.send(JSON.stringify({ type: 'state', data: currentState }))
      break

    case 'ping':
    case 'PING':
    case 'hello':
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    case 'state:update':
      // Handle state:update from broadcast-sync hook
      if (data.state) {
        const { graphicsVisibility, currentMatch } = data.state
        if (graphicsVisibility) {
          currentState.scoreBug.visible = graphicsVisibility.scoreBugVisible
          currentState.lowerThird.visible = graphicsVisibility.lowerThirdVisible
          currentState.ticker.visible = graphicsVisibility.tickerVisible
          currentState.breakingBanner.visible = graphicsVisibility.breakingBannerVisible
        }
        if (currentMatch) {
          currentState.scoreBug.homeTeam = {
            name: currentMatch.homeTeam?.name || 'Home',
            shortName: currentMatch.homeTeam?.shortName || 'HOM',
            score: currentMatch.homeScore || 0,
            color: currentMatch.homeTeam?.primaryColor || '#14b8a6',
          }
          currentState.scoreBug.awayTeam = {
            name: currentMatch.awayTeam?.name || 'Away',
            shortName: currentMatch.awayTeam?.shortName || 'AWY',
            score: currentMatch.awayScore || 0,
            color: currentMatch.awayTeam?.primaryColor || '#dc2626',
          }
        }
        broadcast({ type: 'state', data: currentState })
      }
      break

    default:
      // Ignore unknown message types
      break
  }
}

function broadcast(message) {
  const data = JSON.stringify(message)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

console.log(`[WebSocket] Server started on ws://0.0.0.0:${WS_PORT} (accessible from network)`)
console.log('[WebSocket] Waiting for connections...')
