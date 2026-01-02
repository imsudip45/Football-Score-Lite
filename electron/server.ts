import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { readFile } from 'fs/promises'
import { join, extname, normalize, sep } from 'path'
import { existsSync } from 'fs'
import { networkInterfaces } from 'os'

// Get local IP address for network access
export function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    const netList = nets[name]
    if (!netList) continue
    for (const net of netList) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

// MIME types for serving static files
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

function sanitizeRelativePath(relPath: string): string {
  const cleaned = relPath.replace(/^([/\\])+/, '')
  const norm = normalize(cleaned)
  if (norm.startsWith('..' + sep) || norm === '..' || norm.includes('..' + sep)) {
    throw new Error('Invalid asset path')
  }
  return norm
}

let staticFilesPath: string = ''

export function setStaticFilesPath(path: string) {
  staticFilesPath = path
  console.log('[HTTP] Static files path set to:', staticFilesPath)
}

export interface GraphicsState {
  scoreBug: {
    visible: boolean
    homeTeam: {
      name: string
      shortName: string
      score: number
      color: string
      secondaryColor?: string
      logo?: string
      yellowCards?: number
      redCards?: number
    }
    awayTeam: {
      name: string
      shortName: string
      score: number
      color: string
      secondaryColor?: string
      logo?: string
      yellowCards?: number
      redCards?: number
    }
    timer: { minutes: number; seconds: number; period: string; extra?: number }
    possession: 'home' | 'away' | null
  }
  lowerThird: {
    visible: boolean
    title: string
    subtitle?: string
    teamColor?: string
  }
  ticker: {
    visible: boolean
    items: Array<{ id: string; primary: string; secondary?: string }>
    scrollSpeed: number
  }
  breakingBanner: {
    visible: boolean
    text: string
  }
  // Football-specific graphics
  goal: {
    visible: boolean
    playerName: string
    playerNumber: string
    goalTime: string
    teamColor: string
    teamLogo?: string
    isOwnGoal: boolean
    isPenalty: boolean
    team?: 'home' | 'away'
    tournamentColor?: string
    homeColors?: { primary: string; secondary: string }
    awayColors?: { primary: string; secondary: string }
  }
  card: {
    visible: boolean
    playerName: string
    playerNumber: string
    cardType: 'yellow' | 'red'
    cardTime: string
    teamColor: string
    teamLogo?: string
    team?: 'home' | 'away'
    homeColors?: { primary: string; secondary: string }
    awayColors?: { primary: string; secondary: string }
  }
  substitution: {
    visible: boolean
    playerIn: string
    playerOut: string
    numberIn: string
    numberOut: string
    teamColor: string
    teamLogo?: string
    team?: 'home' | 'away'
    homeColors?: { primary: string; secondary: string }
    awayColors?: { primary: string; secondary: string }
  }
  vsGraphic: {
    visible: boolean
    homeTeam: { name: string; color: string; logo?: string }
    awayTeam: { name: string; color: string; logo?: string }
    matchInfo: string
    venue: string
    competition: string
    competitionLogo?: string
  }
  nameplate: {
    visible: boolean
    playerName: string
    position: string
    number: string
    teamColor: string
    teamLogo?: string
    team?: 'home' | 'away' | 'neutral'
    homeColors?: { primary: string; secondary: string }
    awayColors?: { primary: string; secondary: string }
  }
  lineup: {
    visible: boolean
    team: 'home' | 'away'
    teamName: string
    teamColor: string
    teamLogo?: string
    tournamentShortName?: string
    tournamentLogo?: string
    tournamentColor?: string
    formation: string
    players: Array<{ name: string; number: string; position?: string }>
    subs: Array<{ name: string; number: string }>
    coach: string
  }
}

// Default state - matches controller defaults
const defaultState: GraphicsState = {
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
  goal: {
    visible: false,
    playerName: '',
    playerNumber: '',
    goalTime: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    isOwnGoal: false,
    isPenalty: false,
    team: 'home',
  },
  card: {
    visible: false,
    playerName: '',
    playerNumber: '',
    cardType: 'yellow',
    cardTime: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    team: 'home',
  },
  substitution: {
    visible: false,
    playerIn: '',
    playerOut: '',
    numberIn: '',
    numberOut: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    team: 'home',
  },
  vsGraphic: {
    visible: false,
    homeTeam: { name: 'Home', color: '#A50044', logo: '' },
    awayTeam: { name: 'Away', color: '#00529F', logo: '' },
    matchInfo: '',
    venue: '',
    competition: '',
    competitionLogo: '',
  },
  nameplate: {
    visible: false,
    playerName: '',
    position: '',
    number: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    team: 'home',
  },
  lineup: {
    visible: false,
    team: 'home',
    teamName: '',
    teamColor: '#14b8a6',
    teamLogo: '',
    tournamentShortName: 'NSL',
    tournamentLogo: '',
    tournamentColor: '#EF3E42',
    formation: '4-3-3',
    players: [],
    subs: [],
    coach: '',
  },
}

let currentState: GraphicsState = JSON.parse(JSON.stringify(defaultState)) // Deep clone

// Match state for commentator clients (separate from graphics state)
interface CommentatorMatchState {
  currentMatch: any | null
  matchTime: number
  timerRunning: boolean
}

let commentatorMatchState: CommentatorMatchState = {
  currentMatch: null,
  matchTime: 0,
  timerRunning: false,
}

// Track commentator clients separately
const commentatorClients: Set<WebSocket> = new Set()

// Maximum message size (align with controller outbound cap)
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024

// Sanitize update payload to prevent oversized messages
function sanitizeUpdatePayload(payload: any): any | null {
  if (!payload || typeof payload !== 'object') return null
  
  // Remove any potential large data (images, base64, etc.)
  const sanitized = JSON.parse(JSON.stringify(payload))
  
  // Check size
  const serialized = JSON.stringify(sanitized)
  if (serialized.length > MAX_MESSAGE_BYTES) {
    console.warn('[WebSocket] Update payload too large, rejecting')
    return null
  }
  
  return sanitized
}

const clients: Set<WebSocket> = new Set()

export function startWebSocketServer(port: number) {
  // Bind to 0.0.0.0 to accept connections from any network interface
  const wss = new WebSocketServer({ port, host: '0.0.0.0' })

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws)
    console.log(`[WebSocket] Client connected. Total clients: ${clients.size}`)

    // Send current state immediately on connection
    ws.send(JSON.stringify({ type: 'state', data: currentState }))
    console.log(`[WebSocket] Sent initial state to client. Total clients: ${clients.size}`)

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString())
        handleMessage(data, ws)
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      commentatorClients.delete(ws) // Also remove from commentator clients
      console.log(`[WebSocket] Client disconnected. Total clients: ${clients.size}, Commentator clients: ${commentatorClients.size}`)
    })

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error)
      clients.delete(ws)
      commentatorClients.delete(ws) // Also remove from commentator clients
    })
  })

  console.log(`[WebSocket] Server started on ws://0.0.0.0:${port} (accessible from network)`)
  return wss
}

function handleMessage(data: any, ws: WebSocket) {
  switch (data.type) {
    case 'register':
      // Track commentator clients separately for match state broadcasts
      if (data.client === 'commentator') {
        commentatorClients.add(ws)
        console.log(`[WebSocket] Commentator client registered. Total commentator clients: ${commentatorClients.size}`)
        // Send current match state to newly registered commentator
        if (commentatorMatchState.currentMatch) {
          ws.send(JSON.stringify({ 
            type: 'MATCH_STATE', 
            data: commentatorMatchState 
          }))
          console.log('[WebSocket] Sent match state to new commentator client')
        }
      }
      break

    case 'update':
      // Update state and broadcast to all clients
      if (data.graphic) {
        const sanitized = sanitizeUpdatePayload(data.graphic)
        if (sanitized) {
          currentState = { ...currentState, ...sanitized }

          // Normalize/infer team fields for event graphics.
          // Some clients historically omitted `team` and relied on colors/logos; if `team` is missing/invalid
          // the renderer defaults to "home", which looks like the wrong side animating.
          const normalizeTeam = (t: any): 'home' | 'away' | undefined => {
            if (t === 'home' || t === 'away') return t
            if (typeof t === 'string') {
              const s = t.toLowerCase().trim()
              if (s === 'home') return 'home'
              if (s === 'away') return 'away'
            }
            return undefined
          }

          const inferTeam = (teamColor?: any, teamLogo?: any): 'home' | 'away' | undefined => {
            const home = currentState?.scoreBug?.homeTeam
            const away = currentState?.scoreBug?.awayTeam
            const logo = typeof teamLogo === 'string' ? teamLogo : ''
            const color = typeof teamColor === 'string' ? teamColor : ''

            if (logo && away?.logo && logo === away.logo) return 'away'
            if (logo && home?.logo && logo === home.logo) return 'home'

            if (color && away?.color && color.toLowerCase() === away.color.toLowerCase()) return 'away'
            if (color && home?.color && color.toLowerCase() === home.color.toLowerCase()) return 'home'

            return undefined
          }

          if (currentState.card) {
            const normalized = normalizeTeam((currentState as any).card.team)
            ;(currentState as any).card.team =
              normalized ?? inferTeam((currentState as any).card.teamColor, (currentState as any).card.teamLogo) ?? 'home'
          }
          if (currentState.goal) {
            const normalized = normalizeTeam((currentState as any).goal.team)
            ;(currentState as any).goal.team =
              normalized ?? inferTeam((currentState as any).goal.teamColor, (currentState as any).goal.teamLogo) ?? 'home'
          }
          if (currentState.substitution) {
            const normalized = normalizeTeam((currentState as any).substitution.team)
            ;(currentState as any).substitution.team =
              normalized ?? inferTeam((currentState as any).substitution.teamColor, (currentState as any).substitution.teamLogo) ?? 'home'
          }
          if ((currentState as any).nameplate) {
            const normalized = normalizeTeam((currentState as any).nameplate.team)
            ;(currentState as any).nameplate.team =
              normalized ?? inferTeam((currentState as any).nameplate.teamColor, (currentState as any).nameplate.teamLogo) ?? 'home'
          }

          console.log('[WebSocket] State updated:', {
            scoreBug: currentState.scoreBug?.visible,
            lowerThird: currentState.lowerThird?.visible,
            goal: currentState.goal?.visible,
            card: currentState.card?.visible,
            sub: currentState.substitution?.visible,
            vs: currentState.vsGraphic?.visible,
            lineup: currentState.lineup?.visible,
            cardTeam: (currentState as any).card?.team,
          })
          broadcast({ type: 'state', data: currentState })
        }
      }
      break

    case 'REQUEST_STATE':
      // Send current state to requesting client
      ws.send(JSON.stringify({ type: 'state', data: currentState }))
      // Also send match state if this is a commentator client
      if (commentatorClients.has(ws) && commentatorMatchState.currentMatch) {
        ws.send(JSON.stringify({ type: 'MATCH_STATE', data: commentatorMatchState }))
      }
      break

    case 'COMMENTATOR_SYNC':
      // Receive match state from main app and broadcast to commentator clients
      if (data.matchState) {
        commentatorMatchState = {
          currentMatch: data.matchState.currentMatch || null,
          matchTime: data.matchState.matchTime || 0,
          timerRunning: data.matchState.timerRunning || false,
        }
        console.log('[WebSocket] Received match state for commentator:', {
          hasMatch: !!commentatorMatchState.currentMatch,
          matchTime: commentatorMatchState.matchTime,
          timerRunning: commentatorMatchState.timerRunning,
        })
        // Broadcast to all commentator clients
        broadcastToCommentators({ type: 'MATCH_STATE', data: commentatorMatchState })
      }
      break

    case 'ping':
    case 'PING':
    case 'hello':
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    case 'state:update':
      // Handle state:update from broadcast-sync hook
      if (data.state) {
        const { graphicsVisibility, currentMatch, goalData, cardData, subData, nameplateData, lineupData, timer, tickerItems } = data.state
        
        // Update visibility states
        if (graphicsVisibility) {
          currentState.scoreBug.visible = graphicsVisibility.scoreBugVisible ?? false
          currentState.lowerThird.visible = graphicsVisibility.lowerThirdVisible ?? false
          currentState.ticker.visible = graphicsVisibility.tickerVisible ?? false
          currentState.breakingBanner.visible = graphicsVisibility.breakingBannerVisible ?? false
          currentState.goal.visible = graphicsVisibility.goalVisible ?? false
          currentState.card.visible = graphicsVisibility.cardVisible ?? false
          currentState.substitution.visible = graphicsVisibility.substitutionVisible ?? false
          currentState.vsGraphic.visible = graphicsVisibility.vsGraphicVisible ?? false
          currentState.nameplate.visible = graphicsVisibility.nameplateVisible ?? false
          currentState.lineup.visible = graphicsVisibility.lineupVisible ?? false
        }
        
        // Update match data for score bug and VS graphic
        if (currentMatch) {
          const countCards = (team: 'home' | 'away') => {
            const events = (currentMatch.events || []).filter((e: any) => e.team === team);
            const yellowCards = events.filter((e: any) => e.type === 'yellow').length
            const redCards = events.filter((e: any) => e.type === 'red' || e.type === 'second-yellow').length
            return { yellowCards, redCards };
          };

          const homeCardCounts = countCards('home');
          const awayCardCounts = countCards('away');

          currentState.scoreBug.homeTeam = {
            name: currentMatch.homeTeam?.name || 'Home',
            shortName: currentMatch.homeTeam?.shortName || 'HOM',
            score: currentMatch.homeScore ?? 0,
            color: currentMatch.homeTeam?.primaryColor || '#A50044',
            secondaryColor: currentMatch.homeTeam?.secondaryColor || currentMatch.homeTeam?.primaryColor || '#A50044',
            logo: currentMatch.homeTeam?.logo || '',
            yellowCards: homeCardCounts.yellowCards,
            redCards: homeCardCounts.redCards,
          }
          currentState.scoreBug.awayTeam = {
            name: currentMatch.awayTeam?.name || 'Away',
            shortName: currentMatch.awayTeam?.shortName || 'AWY',
            score: currentMatch.awayScore ?? 0,
            color: currentMatch.awayTeam?.primaryColor || '#00529F',
            secondaryColor: currentMatch.awayTeam?.secondaryColor || currentMatch.awayTeam?.primaryColor || '#00529F',
            logo: currentMatch.awayTeam?.logo || '',
            yellowCards: awayCardCounts.yellowCards,
            redCards: awayCardCounts.redCards,
          }
          
          // Update VS graphic with match data
          currentState.vsGraphic.homeTeam = {
            name: currentMatch.homeTeam?.name || 'Home',
            color: currentMatch.homeTeam?.primaryColor || '#A50044',
            logo: currentMatch.homeTeam?.logo || '',
          }
          currentState.vsGraphic.awayTeam = {
            name: currentMatch.awayTeam?.name || 'Away',
            color: currentMatch.awayTeam?.primaryColor || '#00529F',
            logo: currentMatch.awayTeam?.logo || '',
          }
          currentState.vsGraphic.matchInfo = currentMatch.competition || ''
          currentState.vsGraphic.venue = currentMatch.venue || ''
          currentState.vsGraphic.competition = currentMatch.competition || ''
          currentState.vsGraphic.competitionLogo = currentMatch.competitionLogo || ''
        }
        
        // Update timer
        if (timer) {
          currentState.scoreBug.timer = {
            minutes: timer.minutes ?? 0,
            seconds: timer.seconds ?? 0,
            period: currentMatch?.period || '1st',
            extra: currentMatch?.stoppageTime ?? 0,
          }
        }
        
        // Update goal data
        if (goalData) {
          currentState.goal = {
            ...currentState.goal,
            playerName: goalData.playerName || '',
            playerNumber: goalData.playerNumber || '',
            goalTime: goalData.goalTime || '',
            teamColor: goalData.teamColor || '#14b8a6',
            teamLogo: goalData.teamLogo || '',
            isOwnGoal: goalData.isOwnGoal ?? false,
            isPenalty: goalData.isPenalty ?? false,
            team: goalData.team || currentState.goal.team || 'home',
            tournamentColor: goalData.tournamentColor || currentState.goal.tournamentColor,
            homeColors: goalData.homeColors || currentState.goal.homeColors,
            awayColors: goalData.awayColors || currentState.goal.awayColors,
          }
        }
        
        // Update card data
        if (cardData) {
          currentState.card = {
            ...currentState.card,
            playerName: cardData.playerName || '',
            playerNumber: cardData.playerNumber || '',
            cardType: cardData.cardType || 'yellow',
            cardTime: cardData.cardTime || '',
            teamColor: cardData.teamColor || '#14b8a6',
            teamLogo: cardData.teamLogo || '',
            team: cardData.team || currentState.card.team || 'home',
            homeColors: cardData.homeColors || currentState.card.homeColors,
            awayColors: cardData.awayColors || currentState.card.awayColors,
          }
        }
        
        // Update substitution data
        if (subData) {
          currentState.substitution = {
            ...currentState.substitution,
            playerIn: subData.playerIn || '',
            playerOut: subData.playerOut || '',
            numberIn: subData.numberIn || '',
            numberOut: subData.numberOut || '',
            teamColor: subData.teamColor || '#14b8a6',
            teamLogo: subData.teamLogo || '',
            team: subData.team || currentState.substitution.team || 'home',
            homeColors: subData.homeColors || currentState.substitution.homeColors,
            awayColors: subData.awayColors || currentState.substitution.awayColors,
          }
        }
        
        // Update nameplate data
        if (nameplateData) {
          currentState.nameplate = {
            ...currentState.nameplate,
            playerName: nameplateData.playerName || '',
            position: nameplateData.position || '',
            number: nameplateData.number || '',
            teamColor: nameplateData.teamColor || '#14b8a6',
            teamLogo: nameplateData.teamLogo || '',
            team: nameplateData.team || currentState.nameplate.team || 'home',
            homeColors: nameplateData.homeColors || currentState.nameplate.homeColors,
            awayColors: nameplateData.awayColors || currentState.nameplate.awayColors,
          }
        }
        
        // Update lineup data
        if (lineupData) {
          currentState.lineup = {
            ...currentState.lineup,
            team: lineupData.team || 'home',
            teamName: lineupData.teamName || '',
            teamColor: lineupData.teamColor || '#14b8a6',
            teamLogo: lineupData.teamLogo || '',
            tournamentShortName: lineupData.tournamentShortName || currentState.lineup.tournamentShortName || '',
            tournamentLogo: lineupData.tournamentLogo || currentState.lineup.tournamentLogo || '',
            tournamentColor: lineupData.tournamentColor || currentState.lineup.tournamentColor || '',
            formation: lineupData.formation || '4-3-3',
            players: lineupData.players || [],
            subs: lineupData.subs || [],
            coach: lineupData.coach || '',
          }
        }
        
        // Update ticker items
        if (tickerItems) {
          currentState.ticker.items = tickerItems.map((item: any) => ({
            id: item.id,
            primary: item.primary,
            secondary: item.secondary,
          }))
        }
        
        broadcast({ type: 'state', data: currentState })
      }
      break

    default:
      // Ignore unknown message types
      break
  }
}

function broadcast(message: object) {
  const data = JSON.stringify(message)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// Broadcast only to commentator clients
function broadcastToCommentators(message: object) {
  const data = JSON.stringify(message)
  commentatorClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

export function updateGraphicsState(updates: Partial<GraphicsState>) {
  currentState = { ...currentState, ...updates }
  broadcast({ type: 'state', data: currentState })
}

export function getCurrentState(): GraphicsState {
  return currentState
}



// HTTP Server for serving static files (renderer pages)
export function startHttpServer(port: number, staticPath: string) {
  setStaticFilesPath(staticPath)
  
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      let url = req.url || '/'
      
      // Remove query strings
      url = url.split('?')[0]
      
      // Handle root path
      if (url === '/') {
        url = '/index.html'
      }
      
      // API endpoint to get local IP for network access
      if (url === '/api/network-info') {
        const localIP = getLocalIP()
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ 
          ip: localIP, 
          commentatorUrl: `http://${localIP}:${port}/commentator`,
          wsUrl: `ws://${localIP}:8080`
        }))
        return
      }
      
      // Handle /renderer paths
      if (url === '/renderer' || url === '/renderer/') {
        url = '/renderer.html'
      }
      
      // Handle /commentator path - serve the commentator page
      // Next.js static export creates commentator.html in the out folder
      if (url === '/commentator' || url === '/commentator/') {
        url = '/commentator.html'
      }
      
      // Construct file path
      const filePath = join(staticFilesPath, url)
      
      // Security: prevent directory traversal
      if (!filePath.startsWith(staticFilesPath)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      
      // Check if file exists
      if (!existsSync(filePath)) {
        // Try with .html extension for clean URLs
        const htmlPath = filePath + '.html'
        if (existsSync(htmlPath)) {
          const content = await readFile(htmlPath)
          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(content)
          return
        }
        
        // For Next.js app router pages, check in subdirectory
        // e.g., /commentator -> /commentator/index.html
        const indexPath = join(filePath, 'index.html')
        if (existsSync(indexPath)) {
          const content = await readFile(indexPath)
          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(content)
          return
        }
        
        console.log('[HTTP] 404:', url, '- tried:', filePath, htmlPath, indexPath)
        res.writeHead(404)
        res.end('Not Found')
        return
      }
      
      // Read and serve file
      const content = await readFile(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
      
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
      })
      res.end(content)
      
    } catch (error) {
      console.error('[HTTP] Error:', error)
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  })
  
  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP()
    console.log(`[HTTP] Server started on http://0.0.0.0:${port} (accessible from network)`)
    console.log(`[HTTP] Local IP: ${localIP}`)
    console.log(`[HTTP] Renderer available at http://${localIP}:${port}/renderer`)
    console.log(`[HTTP] Commentator available at http://${localIP}:${port}/commentator`)
  })
  
  return server
}

// HTTP Server for serving userData assets to normal browsers.
// Electron renderer can load `app-assets://...` directly, but external browsers cannot.
// This server exposes them as: http://<host>:<port>/app-assets/<relpath>
export function startAssetsServer(port: number, assetsPath: string) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      let url = req.url || '/'
      url = url.split('?')[0]

      if (!url.startsWith('/app-assets/')) {
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
        res.end('Not Found')
        return
      }

      const rel = decodeURIComponent(url.replace('/app-assets/', ''))
      const safeRel = sanitizeRelativePath(rel)
      const filePath = join(assetsPath, safeRel)

      if (!filePath.startsWith(assetsPath)) {
        res.writeHead(403, { 'Access-Control-Allow-Origin': '*' })
        res.end('Forbidden')
        return
      }

      if (!existsSync(filePath)) {
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
        res.end('Not Found')
        return
      }

      const content = await readFile(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream'

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
      })
      res.end(content)
    } catch (error) {
      console.error('[ASSETS] Error:', error)
      res.writeHead(500, { 'Access-Control-Allow-Origin': '*' })
      res.end('Internal Server Error')
    }
  })

  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP()
    console.log(`[ASSETS] Server started on http://0.0.0.0:${port} (accessible from network)`) 
    console.log(`[ASSETS] Local IP: ${localIP}`)
  })

  return server
}
