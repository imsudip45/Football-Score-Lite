'use client'

import React, { useMemo } from 'react'
import type { MatchEvent, Match } from '@/lib/types'
import { formatEventTime } from '@/lib/utils'

interface CommentatorEventsProps {
  events: MatchEvent[]
  match: Match
  maxEvents: number
  highlightDuration: number
  timeFormat: 'MM:SS' | "MM'"
  theme?: 'light' | 'dark'
}

/**
 * CommentatorEvents Component
 * 
 * Displays recent match events in reverse chronological order (newest first).
 * 
 * Requirements:
 * - 4.1: Display the most recent events in reverse chronological order
 * - 4.2: Add new events to the top of the feed
 * - 4.3: Display event type, time, team, and player name for each event
 * - 4.4: Use color coding to distinguish event types (goals, cards, subs)
 * - 4.5: Highlight events from the last N seconds with a visual indicator
 */
export function CommentatorEvents({
  events,
  match,
  maxEvents,
  highlightDuration,
  timeFormat,
  theme = 'dark',
}: CommentatorEventsProps) {
  // Get recent events in reverse chronological order (Requirements 4.1, 4.2)
  const recentEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxEvents)
  }, [events, maxEvents])

  // Check if event is recent (for highlighting) (Requirements 4.5)
  const isRecentEvent = (event: MatchEvent): boolean => {
    const eventTime = new Date(event.timestamp).getTime()
    const now = Date.now()
    const ageInSeconds = (now - eventTime) / 1000
    return ageInSeconds < highlightDuration
  }

  // Get event icon and color based on type (Requirements 4.4)
  const getEventStyle = (eventType: MatchEvent['type']) => {
    const isLight = theme === 'light'
    
    switch (eventType) {
      case 'goal':
      case 'penalty-goal':
        return {
          icon: '⚽',
          color: isLight ? 'text-green-600' : 'text-green-400',
          bgColor: isLight ? 'bg-green-100' : 'bg-green-900/30',
          borderColor: isLight ? 'border-green-400' : 'border-green-500/50',
        }
      case 'own-goal':
        return {
          icon: '⚽',
          color: isLight ? 'text-orange-600' : 'text-orange-400',
          bgColor: isLight ? 'bg-orange-100' : 'bg-orange-900/30',
          borderColor: isLight ? 'border-orange-400' : 'border-orange-500/50',
        }
      case 'penalty-miss':
        return {
          icon: '❌',
          color: isLight ? 'text-red-600' : 'text-red-400',
          bgColor: isLight ? 'bg-red-100' : 'bg-red-900/30',
          borderColor: isLight ? 'border-red-400' : 'border-red-500/50',
        }
      case 'yellow':
        return {
          icon: '🟨',
          color: isLight ? 'text-yellow-600' : 'text-yellow-400',
          bgColor: isLight ? 'bg-yellow-100' : 'bg-yellow-900/30',
          borderColor: isLight ? 'border-yellow-400' : 'border-yellow-500/50',
        }
      case 'red':
      case 'second-yellow':
        return {
          icon: '🟥',
          color: isLight ? 'text-red-600' : 'text-red-400',
          bgColor: isLight ? 'bg-red-100' : 'bg-red-900/30',
          borderColor: isLight ? 'border-red-400' : 'border-red-500/50',
        }
      case 'sub':
        return {
          icon: '🔄',
          color: isLight ? 'text-blue-600' : 'text-blue-400',
          bgColor: isLight ? 'bg-blue-100' : 'bg-blue-900/30',
          borderColor: isLight ? 'border-blue-400' : 'border-blue-500/50',
        }
      case 'kickoff':
        return {
          icon: '⚡',
          color: isLight ? 'text-gray-600' : 'text-gray-400',
          bgColor: isLight ? 'bg-gray-100' : 'bg-gray-900/30',
          borderColor: isLight ? 'border-gray-400' : 'border-gray-500/50',
        }
      case 'halftime':
      case 'fulltime':
        return {
          icon: '⏱️',
          color: isLight ? 'text-purple-600' : 'text-purple-400',
          bgColor: isLight ? 'bg-purple-100' : 'bg-purple-900/30',
          borderColor: isLight ? 'border-purple-400' : 'border-purple-500/50',
        }
      case 'added-time':
        return {
          icon: '⏰',
          color: isLight ? 'text-amber-600' : 'text-amber-400',
          bgColor: isLight ? 'bg-amber-100' : 'bg-amber-900/30',
          borderColor: isLight ? 'border-amber-400' : 'border-amber-500/50',
        }
      default:
        return {
          icon: '📋',
          color: isLight ? 'text-gray-600' : 'text-gray-400',
          bgColor: isLight ? 'bg-gray-100' : 'bg-gray-900/30',
          borderColor: isLight ? 'border-gray-400' : 'border-gray-500/50',
        }
    }
  }

  // Format event type for display (Requirements 4.3)
  const formatEventType = (eventType: MatchEvent['type']): string => {
    const typeMap: Record<MatchEvent['type'], string> = {
      'goal': 'GOAL',
      'own-goal': 'OWN GOAL',
      'penalty-goal': 'PENALTY GOAL',
      'penalty-miss': 'PENALTY MISS',
      'yellow': 'YELLOW CARD',
      'red': 'RED CARD',
      'second-yellow': 'SECOND YELLOW',
      'sub': 'SUBSTITUTION',
      'kickoff': 'KICK OFF',
      'halftime': 'HALF TIME',
      'fulltime': 'FULL TIME',
      'added-time': 'ADDED TIME',
    }
    return typeMap[eventType] || eventType.toUpperCase()
  }

  // Get team name for display (Requirements 4.3)
  const getTeamName = (team: 'home' | 'away'): string => {
    return team === 'home' ? match.homeTeam.shortName : match.awayTeam.shortName
  }

  return (
    <div className={`rounded-lg shadow-xl p-4 sm:p-6 border ${
      theme === 'light'
        ? 'bg-white border-gray-300'
        : 'bg-gray-800 border-gray-700'
    }`}>
      <h2 className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 ${
        theme === 'light' ? 'text-gray-900' : 'text-white'
      }`}>Recent Events</h2>
      
      {recentEvents.length === 0 ? (
        <p className={`text-center py-6 sm:py-8 text-sm sm:text-base ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>No events yet</p>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {recentEvents.map((event) => {
            const style = getEventStyle(event.type)
            const isRecent = isRecentEvent(event)
            
            return (
              <div
                key={event.id}
                className={`
                  relative p-3 sm:p-4 rounded-lg border-l-4 transition-all duration-300
                  ${style.bgColor} ${style.borderColor}
                  ${isRecent ? `ring-2 shadow-lg ${theme === 'light' ? 'ring-gray-400' : 'ring-white/20'}` : ''}
                `}
              >
                {/* Recent event indicator (Requirements 4.5) */}
                {isRecent && (
                  <div className="absolute top-2 right-2">
                    <span className="flex h-2 w-2 sm:h-3 sm:w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        theme === 'light' ? 'bg-gray-900' : 'bg-white'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 ${
                        theme === 'light' ? 'bg-gray-900' : 'bg-white'
                      }`}></span>
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-2 sm:gap-4">
                  {/* Event Icon (Requirements 4.4) */}
                  <div className="text-2xl sm:text-3xl flex-shrink-0">
                    {style.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Time and Event Type (Requirements 4.3) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1 sm:mb-2">
                      <span className={`text-lg sm:text-xl font-mono font-bold ${style.color}`}>
                        {formatEventTime(event, timeFormat)}
                      </span>
                      <span className={`text-base sm:text-lg font-semibold ${
                        theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                        {formatEventType(event.type)}
                      </span>
                    </div>

                    {/* Team Name (Requirements 4.3) */}
                    <div className={`text-sm sm:text-base mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                      {getTeamName(event.team)}
                    </div>

                    {/* Player Information (Requirements 4.3) */}
                    {event.player && (
                      <div className={`text-base sm:text-lg font-medium ${
                        theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                        #{event.player.number} {event.player.name}
                      </div>
                    )}

                    {/* Second Player (for substitutions) */}
                    {event.secondPlayer && event.type === 'sub' && (
                      <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 text-sm sm:text-base ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        <span>#{event.player?.number} {event.player?.name}</span>
                        <span className={`hidden sm:inline ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-500'
                        }`}>→</span>
                        <span className={`sm:hidden ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-500'
                        }`}>↓</span>
                        <span>#{event.secondPlayer.number} {event.secondPlayer.name}</span>
                      </div>
                    )}

                    {/* Additional Note */}
                    {event.note && (
                      <div className={`mt-2 text-xs sm:text-sm italic ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {event.note}
                      </div>
                    )}

                    {/* Stoppage Time Indicator */}
                    {event.stoppageMinute !== undefined && (
                      <div className={`mt-1 text-xs sm:text-sm ${
                        theme === 'light' ? 'text-amber-600' : 'text-amber-400'
                      }`}>
                        +{event.stoppageMinute}' (Stoppage Time)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
