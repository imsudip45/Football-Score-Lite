'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Match, MatchEvent } from '@/lib/types'
import { useCommentatorStore } from '@/lib/commentator-store'
import { formatEventTime } from '@/lib/utils'

// Dynamically determine WebSocket URL based on current host
const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8080'
  const host = window.location.hostname || 'localhost'
  return `ws://${host}:8080`
}

const RECONNECT_INTERVAL = 3000

export default function CommentatorPage() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null)
  const [matchTime, setMatchTime] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  
  const { timeFormat } = useCommentatorStore()
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const lastUpdateRef = useRef(Date.now())

  // WebSocket connection
  useEffect(() => {
    mountedRef.current = true
    const WS_URL = getWsUrl()

    function connect() {
      if (!mountedRef.current) return
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return
      }

      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return }
          setConnectionStatus('connected')
          lastUpdateRef.current = Date.now()
          ws.send(JSON.stringify({ type: 'register', client: 'commentator' }))
          ws.send(JSON.stringify({ type: 'REQUEST_STATE' }))
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          try {
            const data = JSON.parse(event.data)
            lastUpdateRef.current = Date.now()
            
            if (data.type === 'PING') {
              ws.send(JSON.stringify({ type: 'PONG' }))
            } else if (data.type === 'MATCH_STATE') {
              if (data.data) {
                setCurrentMatch(data.data.currentMatch || null)
                setMatchTime(data.data.matchTime || 0)
                setTimerRunning(data.data.timerRunning || false)
              }
            }
          } catch (error) {
            console.error('[Commentator] Error parsing message:', error)
          }
        }

        ws.onerror = () => { if (mountedRef.current) setConnectionStatus('error') }
        ws.onclose = () => {
          if (mountedRef.current) {
            setConnectionStatus('disconnected')
            wsRef.current = null
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) { setConnectionStatus('connecting'); connect() }
            }, RECONNECT_INTERVAL)
          }
        }
      } catch (error) {
        if (mountedRef.current) {
          setConnectionStatus('error')
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) { setConnectionStatus('connecting'); connect() }
          }, RECONNECT_INTERVAL)
        }
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const handleRetry = useCallback(() => {
    setConnectionStatus('connecting')
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    const WS_URL = getWsUrl()
    setTimeout(() => {
      if (mountedRef.current && !wsRef.current) {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws
        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return }
          setConnectionStatus('connected')
          lastUpdateRef.current = Date.now()
          ws.send(JSON.stringify({ type: 'register', client: 'commentator' }))
          ws.send(JSON.stringify({ type: 'REQUEST_STATE' }))
        }
        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          try {
            const data = JSON.parse(event.data)
            lastUpdateRef.current = Date.now()
            if (data.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }))
            else if (data.type === 'MATCH_STATE' && data.data) {
              setCurrentMatch(data.data.currentMatch || null)
              setMatchTime(data.data.matchTime || 0)
              setTimerRunning(data.data.timerRunning || false)
            }
          } catch (error) { console.error('[Commentator] Error:', error) }
        }
        ws.onerror = () => { if (mountedRef.current) setConnectionStatus('error') }
        ws.onclose = () => { if (mountedRef.current) { setConnectionStatus('disconnected'); wsRef.current = null } }
      }
    }, 100)
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get events by type
  const getEventsByType = useMemo(() => {
    if (!currentMatch?.events) return { goals: { home: [], away: [] }, subs: { home: [], away: [] }, cards: { home: [], away: [] } }
    
    const goals = { home: [] as MatchEvent[], away: [] as MatchEvent[] }
    const subs = { home: [] as MatchEvent[], away: [] as MatchEvent[] }
    const cards = { home: [] as MatchEvent[], away: [] as MatchEvent[] }
    
    currentMatch.events.forEach(e => {
      if (e.type === 'goal' || e.type === 'penalty-goal' || e.type === 'own-goal') {
        goals[e.team].push(e)
      } else if (e.type === 'sub') {
        subs[e.team].push(e)
      } else if (e.type === 'yellow' || e.type === 'red' || e.type === 'second-yellow') {
        cards[e.team].push(e)
      }
    })
    
    return { goals, subs, cards }
  }, [currentMatch?.events])

  // Calculate team stats
  const teamStats = useMemo(() => {
    if (!currentMatch?.events) return null
    
    const homeYellows = getEventsByType.cards.home.filter(e => e.type === 'yellow').length
    const awayYellows = getEventsByType.cards.away.filter(e => e.type === 'yellow').length
    const homeReds = getEventsByType.cards.home.filter(e => e.type === 'red' || e.type === 'second-yellow').length
    const awayReds = getEventsByType.cards.away.filter(e => e.type === 'red' || e.type === 'second-yellow').length
    
    return {
      shots: { home: currentMatch.homeShots || 0, away: currentMatch.awayShots || 0 },
      shotsOnTarget: { home: currentMatch.homeShotsOnTarget || 0, away: currentMatch.awayShotsOnTarget || 0 },
      possession: { home: currentMatch.homePossession || 50, away: currentMatch.awayPossession || 50 },
      passes: { home: 0, away: 0 },
      passAccuracy: { home: 0, away: 0 },
      fouls: { home: currentMatch.homeFouls || 0, away: currentMatch.awayFouls || 0 },
      yellowCards: { home: homeYellows, away: awayYellows },
      redCards: { home: homeReds, away: awayReds },
      offsides: { home: currentMatch.homeOffsides || 0, away: currentMatch.awayOffsides || 0 },
      corners: { home: currentMatch.homeCorners || 0, away: currentMatch.awayCorners || 0 },
    }
  }, [currentMatch, getEventsByType])

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'connected' && 'Waiting for match data...'}
            {connectionStatus === 'disconnected' && 'Reconnecting...'}
            {connectionStatus === 'error' && (
              <div>
                <p>Connection Error</p>
                <button onClick={handleRetry} className="mt-4 px-4 py-2 bg-blue-600 rounded">Retry</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const homeColor = currentMatch.homeTeam.primaryColor || '#FFD700'
  const homeSecondaryColor = currentMatch.homeTeam.secondaryColor || homeColor
  const awayColor = currentMatch.awayTeam.primaryColor || '#DC143C'
  const awaySecondaryColor = currentMatch.awayTeam.secondaryColor || awayColor

  // Fixed colors for commentator panel indicators
  const homeIndicatorColor = '#c0022b' // Dark red for home team
  const awayIndicatorColor = '#EAB308' // Yellow for away team

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      {/* Header - Team Names, Scores and Timer */}
      <div className="flex items-center justify-between mb-1 px-4 pt-2">
        {/* Home Team Name */}
        <div className="flex-1">
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            {currentMatch.homeTeam.name}
          </h1>
        </div>
        
        {/* Home Score */}
        <div className="flex-shrink-0 pl-2 pr-8">
          <div className="text-7xl font-black text-white">
            {currentMatch.homeScore}
          </div>
        </div>
        
        {/* Timer */}
        <div className="flex-shrink-0 text-center px-8">
          <div className="text-6xl font-black font-mono tracking-tight text-white">
            {formatTime(matchTime)}
            {currentMatch.stoppageTime > 0 && currentMatch.extraTimeVisible && (
              <sup className="text-2xl ml-2 text-yellow-400 font-bold">+{currentMatch.stoppageTime}</sup>
            )}
          </div>
        </div>
        
        {/* Away Score */}
        <div className="flex-shrink-0 pl-8 pr-2">
          <div className="text-7xl font-black text-white">
            {currentMatch.awayScore}
          </div>
        </div>
        
        {/* Away Team Name */}
        <div className="flex-1 text-right">
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            {currentMatch.awayTeam.name}
          </h1>
        </div>
      </div>

      {/* Team Color Bars */}
      <div className="flex mb-3 px-4">
        <div className="flex-1 h-3 mr-2 overflow-hidden flex">
          <div className="flex-1" style={{ backgroundColor: homeColor }} />
          <div className="flex-1" style={{ backgroundColor: homeSecondaryColor }} />
        </div>
        <div className="flex-1 h-3 ml-2 overflow-hidden flex">
          <div className="flex-1" style={{ backgroundColor: awayColor }} />
          <div className="flex-1" style={{ backgroundColor: awaySecondaryColor }} />
        </div>
      </div>

      {/* Combined Lineups and Goal Scorers Section */}
      <div className="flex">
        {/* HOME TEAM - Lineups (Yellow) + Goal Scorers (Blue) */}
        <div className="flex-1 flex">
          {/* Home Lineup - Yellow */}
          <div className="flex-1 p-3 bg-yellow-500">
            <div className="text-lg text-black/70 mb-2 border-b border-black/20 pb-1 font-semibold italic">Lineups</div>
            <div className="space-y-0.5">
              {currentMatch.homeLineup.slice(0, 11).map((lp) => (
                <div key={lp.player.id} className="text-lg text-black">
                  <span className="font-medium">{lp.player.name}</span>
                  <span className="font-mono font-bold ml-1">({lp.player.number})</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Home Goal Scorers - Blue (columns: Player | Time - time on edge) */}
          <div className="flex-1 p-3 bg-blue-800">
            <div className="text-lg text-white/70 mb-2 border-b border-white/20 pb-1 font-semibold italic">Goal Scorer</div>
            <div className="space-y-0.5">
              {getEventsByType.goals.home.length === 0 ? (
                <div className="text-white/50 text-lg italic">No goals</div>
              ) : (
                getEventsByType.goals.home.map((e) => (
                  <div key={e.id} className="flex justify-between items-center text-lg text-white">
                    <span className="font-medium flex-1">{e.player?.name} <span className="font-mono">({e.player?.number})</span>
                      {e.type === 'penalty-goal' && <span className="text-white/60 ml-1">(P)</span>}
                      {e.type === 'own-goal' && <span className="text-red-300 ml-1">(OG)</span>}
                    </span>
                    <span className="font-mono text-white/80 ml-2">{formatEventTime(e, timeFormat)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Center Stats */}
        <div className="w-[380px] bg-[#252525] p-4">
          <div className="flex items-center justify-center gap-2 mb-3 border-b border-gray-600 pb-2">
            <span className="text-sm text-gray-400 font-semibold uppercase tracking-wider">TEAM STATS</span>
          </div>
          
          {teamStats && (
            <div className="space-y-2.5">
              <StatRow label="Shots" home={teamStats.shots.home} away={teamStats.shots.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Shots on target" home={teamStats.shotsOnTarget.home} away={teamStats.shotsOnTarget.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Fouls" home={teamStats.fouls.home} away={teamStats.fouls.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Yellow cards" home={teamStats.yellowCards.home} away={teamStats.yellowCards.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Red cards" home={teamStats.redCards.home} away={teamStats.redCards.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Offsides" home={teamStats.offsides.home} away={teamStats.offsides.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
              <StatRow label="Corners" home={teamStats.corners.home} away={teamStats.corners.away} homeColor={homeIndicatorColor} awayColor={awayIndicatorColor} />
            </div>
          )}
        </div>
        
        {/* AWAY TEAM - Goal Scorers (Blue) + Lineups (Yellow) */}
        <div className="flex-1 flex">
          {/* Away Goal Scorers - Blue */}
          <div className="flex-1 p-3 bg-blue-800">
            <div className="text-lg text-white/70 mb-2 border-b border-white/20 pb-1 font-semibold italic">Goal Scorer</div>
            <div className="space-y-0.5">
              {getEventsByType.goals.away.length === 0 ? (
                <div className="text-white/50 text-lg italic">No goals</div>
              ) : (
                getEventsByType.goals.away.map((e) => (
                  <div key={e.id} className="flex justify-between items-center text-lg text-white">
                    <span className="font-medium flex-1">{e.player?.name} <span className="font-mono">({e.player?.number})</span>
                      {e.type === 'penalty-goal' && <span className="text-white/60 ml-1">(P)</span>}
                      {e.type === 'own-goal' && <span className="text-red-300 ml-1">(OG)</span>}
                    </span>
                    <span className="font-mono text-white/80 ml-2">{formatEventTime(e, timeFormat)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Away Lineup - Yellow */}
          <div className="flex-1 p-3 bg-yellow-500">
            <div className="text-lg text-black/70 mb-2 border-b border-black/20 pb-1 font-semibold italic">Lineups</div>
            <div className="space-y-0.5">
              {currentMatch.awayLineup.slice(0, 11).map((lp) => (
                <div key={lp.player.id} className="text-lg text-black">
                  <span className="font-medium">{lp.player.name}</span>
                  <span className="font-mono font-bold ml-1">({lp.player.number})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Substitutions Row - Unified Background */}
      <div className="bg-[#252525] flex">
        {/* Home Subs */}
        <div className="flex-1 p-3">
          <div className="flex gap-4">
            {/* OUT Column */}
            <div className="flex-1">
              <div className="text-base text-red-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">OUT</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.home.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1">-</div>
                ) : (
                  getEventsByType.subs.home.map(e => (
                    <div key={`out-${e.id}`} className="text-base py-1">
                      <span className="text-white font-medium whitespace-nowrap">{e.player?.name} <span className="font-mono">({e.player?.number})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Time Column */}
            <div className="w-16">
              <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase text-center">Time</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.home.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1 text-center">-</div>
                ) : (
                  getEventsByType.subs.home.map(e => (
                    <div key={`time-${e.id}`} className="text-base py-1 text-center">
                      <span className="text-white font-mono">{formatEventTime(e, timeFormat)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* IN Column */}
            <div className="flex-1">
              <div className="text-base text-green-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">IN</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.home.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1">-</div>
                ) : (
                  getEventsByType.subs.home.map(e => (
                    <div key={`in-${e.id}`} className="text-base py-1">
                      <span className="text-white font-medium whitespace-nowrap">{e.secondPlayer?.name} <span className="font-mono">({e.secondPlayer?.number})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Action Column */}
            <div className="w-24">
              <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase text-center">Action</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.home.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1 text-center">-</div>
                ) : (
                  getEventsByType.subs.home.map(e => (
                    <div key={`action-${e.id}`} className="text-base py-1 text-center">
                      <button className="bg-gray-700 text-gray-400 px-2 py-1 rounded text-xs whitespace-nowrap">Coming Soon</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Away Subs - Action column on LEFT */}
        <div className="flex-1 p-3 border-l border-gray-700">
          <div className="flex gap-4">
            {/* Action Column - LEFTMOST for Away */}
            <div className="w-24">
              <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase text-center">Action</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.away.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1 text-center">-</div>
                ) : (
                  getEventsByType.subs.away.map(e => (
                    <div key={`action-${e.id}`} className="text-base py-1 text-center">
                      <button className="bg-gray-700 text-gray-400 px-2 py-1 rounded text-xs whitespace-nowrap">Coming Soon</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* OUT Column */}
            <div className="flex-1">
              <div className="text-base text-red-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">OUT</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.away.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1">-</div>
                ) : (
                  getEventsByType.subs.away.map(e => (
                    <div key={`out-${e.id}`} className="text-base py-1">
                      <span className="text-white font-medium whitespace-nowrap">{e.player?.name} <span className="font-mono">({e.player?.number})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Time Column */}
            <div className="w-16">
              <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase text-center">Time</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.away.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1 text-center">-</div>
                ) : (
                  getEventsByType.subs.away.map(e => (
                    <div key={`time-${e.id}`} className="text-base py-1 text-center">
                      <span className="text-white font-mono">{formatEventTime(e, timeFormat)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* IN Column */}
            <div className="flex-1">
              <div className="text-base text-green-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">IN</div>
              <div className="divide-y divide-gray-600">
                {getEventsByType.subs.away.length === 0 ? (
                  <div className="text-gray-600 text-base italic py-1">-</div>
                ) : (
                  getEventsByType.subs.away.map(e => (
                    <div key={`in-${e.id}`} className="text-base py-1">
                      <span className="text-white font-medium whitespace-nowrap">{e.secondPlayer?.name} <span className="font-mono">({e.secondPlayer?.number})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Row - Distinct Background */}
      <div className="bg-[#1e2a38] flex">
        {/* Home Cards */}
        <div className="flex-1 p-3">
          <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">CARDS</div>
          <div className="divide-y divide-gray-600">
            {getEventsByType.cards.home.length === 0 ? (
              <div className="text-gray-600 text-base italic py-1">No cards</div>
            ) : (
              getEventsByType.cards.home.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-base py-1">
                  <div className={`w-4 h-5 rounded-sm flex-shrink-0 ${e.type === 'yellow' ? 'bg-yellow-400' : e.type === 'second-yellow' ? 'bg-gradient-to-r from-yellow-400 to-red-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-white flex-1">
                    {e.player?.name} <span className="font-mono">({e.player?.number})</span>
                  </span>
                  <span className="text-gray-400 font-mono">{formatEventTime(e, timeFormat)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Away Cards */}
        <div className="flex-1 p-3 border-l border-gray-700">
          <div className="text-base text-gray-400 mb-2 border-b border-gray-600 pb-1 font-semibold uppercase">CARDS</div>
          <div className="divide-y divide-gray-600">
            {getEventsByType.cards.away.length === 0 ? (
              <div className="text-gray-600 text-base italic py-1">No cards</div>
            ) : (
              getEventsByType.cards.away.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-base py-1">
                  <div className={`w-4 h-5 rounded-sm flex-shrink-0 ${e.type === 'yellow' ? 'bg-yellow-400' : e.type === 'second-yellow' ? 'bg-gradient-to-r from-yellow-400 to-red-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-white flex-1">
                    {e.player?.name} <span className="font-mono">({e.player?.number})</span>
                  </span>
                  <span className="text-gray-400 font-mono">{formatEventTime(e, timeFormat)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Match Info Footer */}
      <div className="py-2 text-center text-xs text-gray-500">
        {currentMatch.competition} • {currentMatch.round} • {currentMatch.venue}
      </div>
    </div>
  )
}

// Stat Row Component with visual bar
function StatRow({ 
  label, 
  home, 
  away, 
  homeColor, 
  awayColor 
}: { 
  label: string
  home: number | string
  away: number | string
  homeColor: string
  awayColor: string
}) {
  // Calculate percentages for visual bar (if numeric)
  const homeNum = typeof home === 'number' ? home : parseInt(String(home)) || 0
  const awayNum = typeof away === 'number' ? away : parseInt(String(away)) || 0
  const total = homeNum + awayNum || 1
  const homePercent = (homeNum / total) * 100
  const awayPercent = (awayNum / total) * 100

  return (
    <div className="flex items-center py-1">
      <div 
        className="w-12 h-7 flex items-center justify-center rounded-sm text-white text-sm font-bold"
        style={{ backgroundColor: homeColor }}
      >
        {home}
      </div>
      <div className="flex-1 mx-3">
        <div className="text-center text-gray-400 text-xs mb-0.5 font-medium">{label}</div>
        <div className="flex h-1.5 bg-gray-700 rounded overflow-hidden">
          <div style={{ width: `${homePercent}%`, backgroundColor: homeColor }} />
          <div style={{ width: `${awayPercent}%`, backgroundColor: awayColor }} />
        </div>
      </div>
      <div 
        className="w-12 h-7 flex items-center justify-center rounded-sm text-white text-sm font-bold"
        style={{ backgroundColor: awayColor }}
      >
        {away}
      </div>
    </div>
  )
}
