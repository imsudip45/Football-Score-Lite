'use client'

import React, { useMemo } from 'react'
import type { Match, MatchEvent } from '@/lib/types'

interface CommentatorStatsProps {
  match: Match
}

/**
 * CommentatorStats Component
 * 
 * Displays key match statistics calculated from match events.
 * Updates in real-time as events occur.
 * 
 * Requirements:
 * - 6.1: Display total goals for each team
 * - 6.2: Display fouls count for each team
 * - 6.3: Display yellow cards count for each team
 * - 6.4: Display red cards count for each team
 * - 6.5: Display substitutions made vs remaining for each team
 * - 6.6: Update statistics in real-time as events occur
 */
export function CommentatorStats({ match }: CommentatorStatsProps) {
  // Calculate statistics from events (Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6)
  const stats = useMemo(() => {
    const homeGoals = match.events.filter(
      e => e.team === 'home' && (e.type === 'goal' || e.type === 'penalty-goal')
    ).length
    
    const awayGoals = match.events.filter(
      e => e.team === 'away' && (e.type === 'goal' || e.type === 'penalty-goal')
    ).length
    
    // Note: Fouls are tracked separately in match.homeFouls and match.awayFouls
    const homeFouls = match.homeFouls || 0
    const awayFouls = match.awayFouls || 0
    
    const homeYellowCards = match.events.filter(
      e => e.team === 'home' && e.type === 'yellow'
    ).length
    
    const awayYellowCards = match.events.filter(
      e => e.team === 'away' && e.type === 'yellow'
    ).length
    
    const homeRedCards = match.events.filter(
      e => e.team === 'home' && (e.type === 'red' || e.type === 'second-yellow')
    ).length
    
    const awayRedCards = match.events.filter(
      e => e.team === 'away' && (e.type === 'red' || e.type === 'second-yellow')
    ).length
    
    const homeSubstitutions = match.events.filter(
      e => e.team === 'home' && e.type === 'sub'
    ).length
    
    const awaySubstitutions = match.events.filter(
      e => e.team === 'away' && e.type === 'sub'
    ).length
    
    // Maximum substitutions allowed (typically 5 in modern football)
    const maxSubstitutions = 5
    
    return {
      homeGoals,
      awayGoals,
      homeFouls,
      awayFouls,
      homeYellowCards,
      awayYellowCards,
      homeRedCards,
      awayRedCards,
      homeSubstitutions,
      awaySubstitutions,
      maxSubstitutions,
    }
  }, [match.events, match.homeFouls, match.awayFouls])

  // Render a stat row with visual comparison bars
  const renderStatRow = (
    label: string,
    homeValue: number,
    awayValue: number,
    color: string,
    showMax?: { home: number; away: number }
  ) => {
    const total = homeValue + awayValue
    const homePercentage = total > 0 ? (homeValue / total) * 100 : 50
    const awayPercentage = total > 0 ? (awayValue / total) * 100 : 50

    return (
      <div className="space-y-1.5 sm:space-y-2">
        {/* Label */}
        <div className="text-xs sm:text-sm font-semibold text-gray-400 uppercase">
          {label}
        </div>

        {/* Values and Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Home Value */}
          <div className="w-12 sm:w-16 text-right">
            <span className="text-lg sm:text-2xl font-bold text-white">
              {homeValue}
              {showMax && <span className="text-xs sm:text-base text-gray-400">/{showMax.home}</span>}
            </span>
          </div>

          {/* Visual Bar */}
          <div className="flex-1 h-6 sm:h-8 bg-gray-700 rounded-full overflow-hidden flex">
            {/* Home Bar */}
            <div
              className="h-full transition-all duration-500 flex items-center justify-start px-2 sm:px-3"
              style={{
                width: `${homePercentage}%`,
                backgroundColor: match.homeTeam.primaryColor,
                minWidth: homeValue > 0 ? '10%' : '0%',
              }}
            >
              {homeValue > 0 && (
                <span className="text-xs font-bold text-white">
                  {homeValue}
                </span>
              )}
            </div>

            {/* Away Bar */}
            <div
              className="h-full transition-all duration-500 flex items-center justify-end px-2 sm:px-3"
              style={{
                width: `${awayPercentage}%`,
                backgroundColor: match.awayTeam.primaryColor,
                minWidth: awayValue > 0 ? '10%' : '0%',
              }}
            >
              {awayValue > 0 && (
                <span className="text-xs font-bold text-white">
                  {awayValue}
                </span>
              )}
            </div>
          </div>

          {/* Away Value */}
          <div className="w-12 sm:w-16 text-left">
            <span className="text-lg sm:text-2xl font-bold text-white">
              {awayValue}
              {showMax && <span className="text-xs sm:text-base text-gray-400">/{showMax.away}</span>}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 border border-gray-700">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-white">Match Statistics</h2>

      <div className="space-y-4 sm:space-y-6">
        {/* Goals (Requirements 6.1) */}
        {renderStatRow('Goals', stats.homeGoals, stats.awayGoals, 'green')}

        {/* Fouls (Requirements 6.2) */}
        {renderStatRow('Fouls', stats.homeFouls, stats.awayFouls, 'orange')}

        {/* Yellow Cards (Requirements 6.3) */}
        {renderStatRow('Yellow Cards', stats.homeYellowCards, stats.awayYellowCards, 'yellow')}

        {/* Red Cards (Requirements 6.4) */}
        {renderStatRow('Red Cards', stats.homeRedCards, stats.awayRedCards, 'red')}

        {/* Substitutions (Requirements 6.5) */}
        {renderStatRow(
          'Substitutions',
          stats.homeSubstitutions,
          stats.awaySubstitutions,
          'blue',
          {
            home: stats.maxSubstitutions,
            away: stats.maxSubstitutions,
          }
        )}
      </div>
    </div>
  )
}
