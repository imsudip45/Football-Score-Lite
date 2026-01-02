import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useGraphicsStore } from '@/lib/graphics-store'
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store'
import type { TickerItem } from '@/lib/types'

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080'
  const host = window.location.hostname
  if (!host || host === 'localhost' || host === '127.0.0.1') return 'ws://localhost:8080'
  return `ws://${host}:8080`
}
const MAX_OUTBOUND_BYTES = 5 * 1024 * 1024 // 5MB limit for base64 images
const MAX_RECONNECT_ATTEMPTS = 50
const MAX_QUEUE_SIZE = 100

// WS payload sanitizers:
// - Player photos are often stored as base64 `data:` URLs and can easily exceed the WS size limit.
// - Team/league logos are fewer; we keep them unless they are extremely large.
const stripLargeDataUrl = (value?: string, maxChars = 300_000): string => {
  if (!value) return ''
  if (!value.startsWith('data:')) return value
  return value.length <= maxChars ? value : ''
}

const stripPlayerPhotoForWs = (value?: string): string | undefined => {
  if (!value) return undefined
  // Never send base64 player photos over WS (too heavy, and re-sent frequently).
  if (value.startsWith('data:')) return undefined
  // zip:// is an internal export format and isn't resolvable by the renderer.
  if (value.startsWith('zip://')) return undefined
  return value
}

// Commentator sync can include full match objects; strip any embedded base64 to avoid huge WS frames.
const sanitizeForCommentatorSync = <T,>(value: T): T => {
  if (!value) return value
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => {
        if (typeof v === 'string') {
          if (v.startsWith('data:')) return ''
          if (v.startsWith('zip://')) return ''
          // Extra safety: drop extremely large strings
          if (v.length > 300_000) return ''
        }
        return v
      }),
    )
  } catch {
    return value
  }
}

// Customization sync for renderer:
// - Prefer keeping `app-assets://...` URLs (small + production-safe)
// - Allow *small* data URLs (legacy) but clamp them to avoid oversized WS frames
const sanitizeCustomizationForWs = <T,>(value: T): T => {
  if (!value) return value
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => {
        if (typeof v === 'string') {
          if (v.startsWith('zip://')) return ''
          if (v.startsWith('data:')) return stripLargeDataUrl(v, 300_000)
          if (v.length > 300_000) return ''
        }
        return v
      }),
    )
  } catch {
    return value
  }
}

interface WebSocketMessage {
  type: string
  graphic?: any
  payload?: any
  matchState?: any
  timestamp?: number
  seq?: number
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageQueueRef = useRef<WebSocketMessage[]>([])
  const backoffRef = useRef<number>(1000)
  const reconnectAttemptsRef = useRef<number>(0)
  const seqRef = useRef<number>(1)
  const mountedRef = useRef<boolean>(true)
  
  const {
    currentMatch,
    wsConnected,
    setWsConnected,
    matchTime,
    timerRunning,
    possession,
    setLastSyncTime,
    goalData,
    cardData,
    subData,
    nameplateData,
    lineupData,
  } = useAppStore()

  const {
    scoreBugVisible,
    lowerThirdVisible,
    tickerVisible,
    breakingBannerVisible,
    goalVisible,
    cardVisible,
    substitutionVisible,
    vsGraphicVisible,
    nameplateVisible,
    lineupVisible,
    matchStatsLowerThirdVisible,
    matchStatsFullScreenVisible,
    matchOfficialsVisible,
    activePreset,
  } = useGraphicsStore()

  // IMPORTANT: customization is persisted to localStorage, which does NOT sync across file:// pages in production.
  // We include a sanitized snapshot in WS state so the renderer always receives the latest customization.
  const customizationState = useGraphicsCustomizationStore()

  const {
    activeLowerThird,
    tickerItems,
    breakingBanner,
  } = useAppStore()

  // Send message with queuing and size limits
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const envelope: WebSocketMessage = {
      ...message,
      seq: message.seq ?? seqRef.current++,
      timestamp: message.timestamp ?? Date.now(),
    }
    
    const serialized = JSON.stringify(envelope)
    if (serialized.length > MAX_OUTBOUND_BYTES) {
      console.warn(`[WebSocket] Message too large (${(serialized.length / 1024 / 1024).toFixed(2)}MB), skipping`)
      return
    }
    
    console.log(`[WebSocket] Sending message: ${(serialized.length / 1024).toFixed(1)}KB`)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(serialized)
    } else {
      // Queue message if not connected
      console.log('[WebSocket] Queuing message (not connected)')
      messageQueueRef.current.push(envelope)
      if (messageQueueRef.current.length > MAX_QUEUE_SIZE) {
        messageQueueRef.current.shift() // Drop oldest
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return
      
      // Don't reconnect if already connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      // Stop if max attempts reached
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('[WebSocket] Max reconnection attempts reached. Please refresh the page.')
        return
      }

      try {
        const ws = new WebSocket(getWsUrl())
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) {
            ws.close()
            return
          }
          console.log('[WebSocket] Connected')
          setWsConnected(true)
          backoffRef.current = 1000 // Reset backoff
          reconnectAttemptsRef.current = 0 // Reset attempts

          // Send any queued messages
          if (messageQueueRef.current.length > 0) {
            console.log('[WebSocket] Sending queued messages:', messageQueueRef.current.length)
            messageQueueRef.current.forEach((msg) => {
              ws.send(JSON.stringify(msg))
            })
            messageQueueRef.current = []
          }

          // Request current state from server
          ws.send(JSON.stringify({ type: 'REQUEST_STATE' }))
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'state') {
              // Server sent current state - could update local state if needed
              console.log('[WebSocket] Received state from server')
            } else if (data.type === 'pong') {
              // Heartbeat response
            } else if (data.type === 'PING') {
              // Respond to ping
              ws.send(JSON.stringify({ type: 'PONG' }))
            } else if (data.type === 'error') {
              // Server reported an error
              console.error('[WebSocket] Server error:', data.message || 'Unknown error')
            }
          } catch (error) {
            // Log parsing errors with more context
            console.error('[WebSocket] Error parsing message:', error)
            console.error('[WebSocket] Raw message data:', typeof event.data === 'string' ? event.data.substring(0, 200) : 'non-string data')
            // Don't crash - continue processing other messages
          }
        }

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          if (mountedRef.current) {
            setWsConnected(false)
          }
        }

        ws.onclose = (event) => {
          console.log('[WebSocket] Disconnected', event.code, event.reason || '')
          if (mountedRef.current) {
            setWsConnected(false)
            wsRef.current = null

            // Exponential backoff reconnection
            if (mountedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current++
              const delay = Math.min(backoffRef.current, 30000) // Max 30s
              backoffRef.current = Math.min(backoffRef.current * 2, 30000)
              
              console.log(`[WebSocket] Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)
              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) connect()
              }, delay)
            }
          }
        }
      } catch (error) {
        console.error('[WebSocket] Connection error:', error)
        if (mountedRef.current) {
          setWsConnected(false)
          // Retry with backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++
            const delay = Math.min(backoffRef.current, 30000)
            backoffRef.current = Math.min(backoffRef.current * 2, 30000)
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) connect()
            }, delay)
          }
        }
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [setWsConnected])

  // Sync graphics state to WebSocket server
  useEffect(() => {
    // Only sync when WebSocket is connected
    if (!wsConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[WebSocket] Not connected, skipping sync. wsConnected:', wsConnected)
      return
    }

    const lowerThirdTitle = activeLowerThird?.title || ''
    const lowerThirdSubtitle = activeLowerThird?.subtitle || ''
    const breakingText = breakingBanner?.text || ''
    const tickerItemsData = tickerItems.map((item: TickerItem) => ({
      id: item.id,
      primary: item.primary,
      secondary: item.secondary,
    }))

    // Default values when no match is loaded
    const homeTeam = currentMatch?.homeTeam || { name: 'Home', shortName: 'HOM', primaryColor: '#A50044', secondaryColor: '#A50044', logo: '' }
    const awayTeam = currentMatch?.awayTeam || { name: 'Away', shortName: 'AWY', primaryColor: '#00529F', secondaryColor: '#00529F', logo: '' }
    const homeScore = currentMatch?.homeScore ?? 0
    const awayScore = currentMatch?.awayScore ?? 0

    const events = currentMatch?.events || []
    const yellowFor = (team: 'home' | 'away') =>
      events.filter((e: any) => e.team === team && e.type === 'yellow').length
    const redFor = (team: 'home' | 'away') =>
      events.filter((e: any) => e.team === team && (e.type === 'red' || e.type === 'second-yellow')).length

    const state = {
      scoreBug: {
        visible: scoreBugVisible,
        leagueName: currentMatch?.competitionShortName || 
          (currentMatch?.competition ? 
            (currentMatch.competition.length <= 5 ? currentMatch.competition : 
             currentMatch.competition.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)) 
            : 'NSL'),
        leagueShortName: currentMatch?.competitionShortName || 
          (currentMatch?.competition ? 
            (currentMatch.competition.length <= 5 ? currentMatch.competition : 
             currentMatch.competition.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)) 
            : 'NSL'),
        leagueLogo: stripLargeDataUrl(currentMatch?.competitionLogo || ''),
        leagueColor: currentMatch?.tournamentColor || '#EF3E42',
        homeTeam: {
          name: homeTeam.name,
          shortName: homeTeam.shortName,
          score: homeScore,
          color: homeTeam.primaryColor,
          secondaryColor: homeTeam.secondaryColor || homeTeam.primaryColor,
          logo: stripLargeDataUrl(homeTeam.logo || ''),
          yellowCards: yellowFor('home'),
          redCards: redFor('home'),
        },
        awayTeam: {
          name: awayTeam.name,
          shortName: awayTeam.shortName,
          score: awayScore,
          color: awayTeam.primaryColor,
          secondaryColor: awayTeam.secondaryColor || awayTeam.primaryColor,
          logo: stripLargeDataUrl(awayTeam.logo || ''),
          yellowCards: yellowFor('away'),
          redCards: redFor('away'),
        },
        timer: {
          minutes: Math.floor(matchTime / 60),
          seconds: matchTime % 60,
          period: currentMatch?.period || 'pre',
          extra: currentMatch?.extraTimeVisible ? (currentMatch?.stoppageTime ?? 0) : 0,
        },
        penalties: {
          home: currentMatch?.homePenaltyScore || 0,
          away: currentMatch?.awayPenaltyScore || 0,
        },
        possession,
      },
      lowerThird: {
        visible: lowerThirdVisible,
        title: lowerThirdTitle,
        subtitle: lowerThirdSubtitle,
        teamColor: homeTeam.primaryColor,
      },
      ticker: {
        visible: tickerVisible,
        items: tickerItemsData,
        scrollSpeed: 80,
      },
      breakingBanner: {
        visible: breakingBannerVisible,
        text: breakingText,
      },
      // Football-specific graphics
      // Use team logo directly from match data based on which team the event is for (like scorebug)
      goal: {
        visible: goalVisible,
        playerName: goalData?.playerName || '',
        playerNumber: goalData?.playerNumber || '',
        goalTime: goalData?.goalTime || '',
        teamColor: goalData?.team === 'away' ? awayTeam.primaryColor : homeTeam.primaryColor,
        teamLogo: stripLargeDataUrl(goalData?.team === 'away' ? (awayTeam.logo || '') : (homeTeam.logo || '')),
        isOwnGoal: goalData?.isOwnGoal || false,
        isPenalty: goalData?.isPenalty || false,
        team: goalData?.team || 'home',
        tournamentColor: currentMatch?.tournamentColor || '#EF3E42',
        // Pass all team colors for proper customization resolution
        homeColors: { primary: homeTeam.primaryColor, secondary: homeTeam.secondaryColor || homeTeam.primaryColor },
        awayColors: { primary: awayTeam.primaryColor, secondary: awayTeam.secondaryColor || awayTeam.primaryColor },
      },
      card: {
        visible: cardVisible,
        playerName: cardData?.playerName || '',
        playerNumber: cardData?.playerNumber || '',
        cardType: cardData?.cardType || 'yellow',
        cardTime: cardData?.cardTime || '',
        teamColor: cardData?.team === 'away' ? awayTeam.primaryColor : homeTeam.primaryColor,
        teamLogo: stripLargeDataUrl(cardData?.team === 'away' ? (awayTeam.logo || '') : (homeTeam.logo || '')),
        team: cardData?.team || 'home',
        // Pass all team colors for proper customization resolution
        homeColors: { primary: homeTeam.primaryColor, secondary: homeTeam.secondaryColor || homeTeam.primaryColor },
        awayColors: { primary: awayTeam.primaryColor, secondary: awayTeam.secondaryColor || awayTeam.primaryColor },
      },
      substitution: {
        visible: substitutionVisible,
        playerIn: subData?.playerIn || '',
        playerOut: subData?.playerOut || '',
        numberIn: subData?.numberIn || '',
        numberOut: subData?.numberOut || '',
        teamColor: subData?.team === 'away' ? awayTeam.primaryColor : homeTeam.primaryColor,
        team: subData?.team || 'home',
        teamLogo: stripLargeDataUrl(subData?.team === 'away' ? (awayTeam.logo || '') : (homeTeam.logo || '')),
        // Pass all team colors for proper customization resolution
        homeColors: { primary: homeTeam.primaryColor, secondary: homeTeam.secondaryColor || homeTeam.primaryColor },
        awayColors: { primary: awayTeam.primaryColor, secondary: awayTeam.secondaryColor || awayTeam.primaryColor },
      },
      vsGraphic: {
        visible: vsGraphicVisible,
        variant: currentMatch?.period === 'ht' ? 'halftime' : currentMatch?.period === 'ft' ? 'fulltime' : 'vs',
        homeTeam: {
          name: homeTeam.name,
          color: homeTeam.primaryColor,
          secondaryColor: homeTeam.secondaryColor || homeTeam.primaryColor,
          logo: stripLargeDataUrl(homeTeam.logo || ''),
          score: homeScore,
        },
        awayTeam: {
          name: awayTeam.name,
          color: awayTeam.primaryColor,
          secondaryColor: awayTeam.secondaryColor || awayTeam.primaryColor,
          logo: stripLargeDataUrl(awayTeam.logo || ''),
          score: awayScore,
        },
        matchInfo: currentMatch?.round || (currentMatch?.matchDay ? `Match Day ${currentMatch.matchDay}` : ''),
        venue: currentMatch?.venue || '',
        competition: currentMatch?.competition || '',
        competitionLogo: stripLargeDataUrl(currentMatch?.competitionLogo || ''),
        tournamentColor: currentMatch?.tournamentColor || '',
      },
      nameplate: {
        visible: nameplateVisible,
        playerName: nameplateData?.playerName || '',
        position: nameplateData?.position || '',
        number: nameplateData?.number || '',
        teamColor: nameplateData?.team === 'away' 
          ? awayTeam.primaryColor 
          : nameplateData?.team === 'neutral' 
            ? '#6366f1' // Neutral purple for officials
            : homeTeam.primaryColor,
        teamLogo: nameplateData?.team === 'away' 
          ? stripLargeDataUrl(awayTeam.logo || '') 
          : nameplateData?.team === 'neutral'
            ? stripLargeDataUrl(currentMatch?.competitionLogo || '') // Use competition logo for officials
            : stripLargeDataUrl(homeTeam.logo || ''),
        team: nameplateData?.team || 'home',
        // Fallback text when no logo available (competition short name)
        logoFallbackText: nameplateData?.team === 'neutral' && !currentMatch?.competitionLogo 
          ? (currentMatch?.competition?.substring(0, 3).toUpperCase() || 'OFF')
          : '',
        // Pass all team colors for proper customization resolution
        homeColors: { primary: homeTeam.primaryColor, secondary: homeTeam.secondaryColor || homeTeam.primaryColor },
        awayColors: { primary: awayTeam.primaryColor, secondary: awayTeam.secondaryColor || awayTeam.primaryColor },
      },
      lineup: {
        visible: lineupVisible,
        team: lineupData?.team || 'home',
        teamName: lineupData?.teamName || homeTeam.name,
        teamColor: lineupData?.teamColor || homeTeam.primaryColor,
        teamSecondaryColor: lineupData?.team === 'away' 
          ? (awayTeam.secondaryColor || awayTeam.primaryColor)
          : (homeTeam.secondaryColor || homeTeam.primaryColor),
        teamLogo: stripLargeDataUrl(lineupData?.teamLogo || (lineupData?.team === 'away' ? awayTeam.logo : homeTeam.logo) || ''),
        tournamentShortName: currentMatch?.competitionShortName || 
          (currentMatch?.competition ? 
            (currentMatch.competition.length <= 5 ? currentMatch.competition : 
             currentMatch.competition.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)) 
            : 'NSL'),
        tournamentLogo: stripLargeDataUrl(currentMatch?.competitionLogo || ''),
        tournamentColor: currentMatch?.tournamentColor || '#EF3E42',
        formation: lineupData?.formation || '4-3-3',
        players: (lineupData?.players || []).map(p => ({
          number: p.number,
          name: p.name,
          shortName: p.shortName,
          position: p.position,
          photo: stripPlayerPhotoForWs(p.photo),
        })),
        subs: lineupData?.subs || [],
        coach: lineupData?.coach || '',
      },
      matchStatsLowerThird: {
        visible: matchStatsLowerThirdVisible,
        homeTeam: {
          name: homeTeam.name,
          logo: stripLargeDataUrl(homeTeam.logo),
          color: homeTeam.primaryColor,
          secondaryColor: homeTeam.secondaryColor || homeTeam.primaryColor,
          score: currentMatch?.homeScore || 0,
          scorers: currentMatch?.events
            .filter(e => (e.type === 'goal' || e.type === 'penalty-goal') && e.team === 'home' && e.player)
            .map(e => `${e.player!.number}. ${e.player!.name} ${e.minute}'`) || [],
        },
        awayTeam: {
          name: awayTeam.name,
          logo: stripLargeDataUrl(awayTeam.logo),
          color: awayTeam.primaryColor,
          secondaryColor: awayTeam.secondaryColor || awayTeam.primaryColor,
          score: currentMatch?.awayScore || 0,
          scorers: currentMatch?.events
            .filter(e => (e.type === 'goal' || e.type === 'penalty-goal') && e.team === 'away' && e.player)
            .map(e => `${e.player!.number}. ${e.player!.name} ${e.minute}'`) || [],
        },
        leagueName: currentMatch?.competition || 'LEAGUE',
        leagueShortName: currentMatch?.competitionShortName || 
          (currentMatch?.competition ? 
            (currentMatch.competition.length <= 5 ? currentMatch.competition : 
             currentMatch.competition.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)) 
            : 'NSL'),
        leagueLogo: stripLargeDataUrl(currentMatch?.competitionLogo || ''),
        leagueColor: currentMatch?.tournamentColor || '#EF3E42',
        matchDay: currentMatch?.round || 'MATCH DAY',
        showScorers: 'both',
        timer: {
          minutes: Math.floor(matchTime / 60),
          seconds: matchTime % 60,
          isRunning: timerRunning,
          period: currentMatch?.period || 'pre',
        },
      },
      matchStatsFullScreen: {
        visible: matchStatsFullScreenVisible,
        homeTeam: {
          name: homeTeam.name,
          logo: stripLargeDataUrl(homeTeam.logo),
          color: homeTeam.primaryColor,
          secondaryColor: homeTeam.secondaryColor || homeTeam.primaryColor,
        },
        awayTeam: {
          name: awayTeam.name,
          logo: stripLargeDataUrl(awayTeam.logo),
          color: awayTeam.primaryColor,
          secondaryColor: awayTeam.secondaryColor || awayTeam.primaryColor,
        },
        stats: (() => {
          const events = currentMatch?.events || []
          const yellowFor = (team: 'home' | 'away') =>
            events.filter((e: any) => e.team === team && (e.type === 'yellow' || e.type === 'second-yellow')).length
          const redFor = (team: 'home' | 'away') =>
            events.filter((e: any) => e.team === team && (e.type === 'red' || e.type === 'second-yellow')).length

          return {
            shots: { home: currentMatch?.homeShots || 0, away: currentMatch?.awayShots || 0 },
            shotsOnTarget: { home: currentMatch?.homeShotsOnTarget || 0, away: currentMatch?.awayShotsOnTarget || 0 },
            fouls: { home: currentMatch?.homeFouls || 0, away: currentMatch?.awayFouls || 0 },
            yellowCards: { home: yellowFor('home'), away: yellowFor('away') },
            redCards: { home: redFor('home'), away: redFor('away') },
            offsides: { home: currentMatch?.homeOffsides || 0, away: currentMatch?.awayOffsides || 0 },
            corners: { home: currentMatch?.homeCorners || 0, away: currentMatch?.awayCorners || 0 },
          }
        })(),
      },
      matchOfficials: {
        visible: matchOfficialsVisible,
        // Always send 4 rows (Ref/AR1/AR2/4th). If a role isn't assigned yet, show TBD.
        officials: (() => {
          const roleDisplayMap: Record<string, string> = {
            referee: 'REFEREE',
            ar1: 'ASSISTANT REFEREE 1',
            ar2: 'ASSISTANT REFEREE 2',
            fourth: '4TH OFFICIAL',
          }

          const assigned = currentMatch?.officials || []
          const getByRole = (role: string) => assigned.find((o) => o.role === role)

          const orderedRoles = ['referee', 'ar1', 'ar2', 'fourth'] as const
          return orderedRoles.map((role) => ({
            role: roleDisplayMap[role],
            name: getByRole(role)?.name || 'TBD',
          }))
        })(),
        // Use same logic as scorebug for league name
        leagueName: currentMatch?.competitionShortName || 
          (currentMatch?.competition ? 
            (currentMatch.competition.length <= 5 ? currentMatch.competition : 
             currentMatch.competition.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)) 
            : 'NSL'),
        leagueLogo: currentMatch?.competitionLogo || '',
        tournamentColor: currentMatch?.tournamentColor || '#EF3E42', // Use tournament color if available
      },
      // Renderer-only: customization snapshot (no functions, no huge strings)
      customization: sanitizeCustomizationForWs(customizationState),
    }

    // Send state update via WebSocket (using sendMessage for queuing)
    sendMessage({
      type: 'update',
      graphic: state,
    })
    console.log('[WebSocket] Sent state update:', {
      scoreBug: state.scoreBug.visible,
      goal: state.goal.visible,
      goalTeam: state.goal.team,
      goalTeamLogo: state.goal.teamLogo,
      card: state.card.visible,
      cardTeam: state.card.team,
      cardTeamLogo: state.card.teamLogo,
      sub: state.substitution.visible,
      subTeam: state.substitution.team,
      subTeamLogo: state.substitution.teamLogo,
      nameplate: state.nameplate.visible,
      nameplateTeam: state.nameplate.team,
      vs: state.vsGraphic.visible,
      lineup: state.lineup.visible,
      homeTeam: state.scoreBug.homeTeam.shortName,
      awayTeam: state.scoreBug.awayTeam.shortName,
      homeLogo: state.scoreBug.homeTeam.logo ? 'yes' : 'no',
      awayLogo: state.scoreBug.awayTeam.logo ? 'yes' : 'no',
    })
    setLastSyncTime(new Date())
  }, [
    wsConnected, // Important: re-sync when WebSocket connects
    currentMatch?.id,
    currentMatch?.homeTeam?.name,
    currentMatch?.homeTeam?.shortName,
    currentMatch?.homeTeam?.primaryColor,
    currentMatch?.homeTeam?.logo,
    currentMatch?.awayTeam?.name,
    currentMatch?.awayTeam?.shortName,
    currentMatch?.awayTeam?.primaryColor,
    currentMatch?.awayTeam?.logo,
    currentMatch?.homeScore,
    currentMatch?.awayScore,
    currentMatch?.competition,
    currentMatch?.venue,
    currentMatch?.round,
    currentMatch?.matchDay,
    currentMatch?.homeFormation,
    currentMatch?.awayFormation,
    currentMatch?.stoppageTime,
    currentMatch?.extraTimeVisible,
    currentMatch?.period,
    currentMatch?.homePenaltyScore,
    currentMatch?.awayPenaltyScore,
    scoreBugVisible,
    lowerThirdVisible,
    tickerVisible,
    breakingBannerVisible,
    goalVisible,
    cardVisible,
    substitutionVisible,
    vsGraphicVisible,
    nameplateVisible,
    matchTime,
    possession,
    activeLowerThird?.id,
    activeLowerThird?.title,
    activeLowerThird?.subtitle,
    JSON.stringify(tickerItems),
    breakingBanner?.id,
    breakingBanner?.text,
    activePreset?.id,
    goalData,
    cardData,
    subData,
    nameplateData,
    lineupData,
    lineupVisible,
    matchStatsLowerThirdVisible,
    matchStatsFullScreenVisible,
    matchOfficialsVisible,
    currentMatch?.officials,
    currentMatch?.competitionLogo,
    currentMatch?.tournamentColor,
    currentMatch?.updatedAt,
    customizationState, // Ensure customization changes trigger WS updates (required for production file:// renderer)
    setLastSyncTime,
    sendMessage,
  ])

  // Sync match state to WebSocket server for commentator clients
  // This sends the full match data so commentator window can display it
  // even though it's on a different origin (http://localhost:3000 vs file://)
  useEffect(() => {
    if (!wsConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    // Send match state for commentator clients
    sendMessage({
      type: 'COMMENTATOR_SYNC',
      matchState: {
        currentMatch: sanitizeForCommentatorSync(currentMatch),
        matchTime: matchTime,
        timerRunning: timerRunning,
      },
    })
    console.log('[WebSocket] Sent commentator sync:', {
      hasMatch: !!currentMatch,
      matchTime,
      timerRunning,
    })
  }, [
    wsConnected,
    currentMatch,
    matchTime,
    timerRunning,
    sendMessage,
  ])
}

