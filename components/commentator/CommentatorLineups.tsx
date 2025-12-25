'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import type { Match, LineupPlayer, Player } from '@/lib/types'

interface CommentatorLineupsProps {
  match: Match
  showBench: boolean
}

/**
 * CommentatorLineups Component
 * 
 * Displays both team lineups side by side with player numbers, names, and formations.
 * Updates in real-time when substitutions occur.
 * 
 * Requirements:
 * - 5.1: Display starting lineups for both teams
 * - 5.2: Show player numbers and names
 * - 5.3: Indicate the team captain with a visual marker
 * - 5.4: Show the formation for each team
 * - 5.5: Display substitutes on the bench
 * - 5.6: Update the lineup display immediately when a substitution occurs
 */
export function CommentatorLineups({ match, showBench }: CommentatorLineupsProps) {
  // Get active lineups (Requirements 5.1, 5.6)
  const homeLineup = useMemo(() => match.homeLineup || [], [match.homeLineup])
  const awayLineup = useMemo(() => match.awayLineup || [], [match.awayLineup])
  
  // Get bench players (Requirements 5.5)
  const homeBench = useMemo(() => match.homeBench || [], [match.homeBench])
  const awayBench = useMemo(() => match.awayBench || [], [match.awayBench])

  // Sort lineup by position number
  const sortedHomeLineup = useMemo(() => 
    [...homeLineup].sort((a, b) => a.position - b.position),
    [homeLineup]
  )
  
  const sortedAwayLineup = useMemo(() => 
    [...awayLineup].sort((a, b) => a.position - b.position),
    [awayLineup]
  )

  // Sort bench by position number
  const sortedHomeBench = useMemo(() => 
    [...homeBench].sort((a, b) => a.position - b.position),
    [homeBench]
  )
  
  const sortedAwayBench = useMemo(() => 
    [...awayBench].sort((a, b) => a.position - b.position),
    [awayBench]
  )

  // Render a single player row (Requirements 5.2, 5.3)
  const renderPlayer = (lineupPlayer: LineupPlayer, teamColor: string) => {
    const player = lineupPlayer.player
    
    return (
      <div
        key={player.id}
        className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
      >
        {/* Player Photo */}
        {player.photo ? (
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-600">
            <Image
              src={player.photo}
              alt={player.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 border-2"
            style={{ 
              backgroundColor: teamColor,
              borderColor: teamColor,
            }}
          >
            {player.number}
          </div>
        )}

        {/* Player Number and Name (Requirements 5.2) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg font-bold text-white">
              {player.number}
            </span>
            <span className="text-sm sm:text-base text-gray-200 truncate">
              {player.shortName || player.name}
            </span>
            {/* Captain Indicator (Requirements 5.3) */}
            {player.isCaptain && (
              <span 
                className="text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: teamColor,
                  color: 'white',
                }}
                title="Captain"
              >
                C
              </span>
            )}
          </div>
          {/* Position */}
          <div className="text-xs text-gray-400">
            {player.position}
          </div>
        </div>
      </div>
    )
  }

  // Render team lineup section
  const renderTeamLineup = (
    teamName: string,
    teamColor: string,
    formation: string | undefined,
    lineup: LineupPlayer[],
    bench: LineupPlayer[]
  ) => {
    return (
      <div className="flex-1 min-w-0">
        {/* Team Header (Requirements 5.1, 5.4) */}
        <div 
          className="p-3 sm:p-4 rounded-t-lg border-b-4"
          style={{ 
            backgroundColor: `${teamColor}20`,
            borderBottomColor: teamColor,
          }}
        >
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
            {teamName}
          </h3>
          {/* Formation Display (Requirements 5.4) */}
          {formation && (
            <p className="text-xs sm:text-sm text-gray-300 font-medium">
              Formation: {formation}
            </p>
          )}
        </div>

        {/* Starting Lineup (Requirements 5.1, 5.2, 5.3) */}
        <div className="p-3 sm:p-4 space-y-1">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase mb-2">
            Starting XI
          </h4>
          {lineup.length === 0 ? (
            <p className="text-gray-500 text-xs sm:text-sm py-4 text-center">
              No lineup configured
            </p>
          ) : (
            <div className="space-y-1">
              {lineup.map((lp) => renderPlayer(lp, teamColor))}
            </div>
          )}
        </div>

        {/* Bench (Requirements 5.5) */}
        {showBench && bench.length > 0 && (
          <div className="p-3 sm:p-4 pt-0 space-y-1 border-t border-gray-700">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase mb-2">
              Substitutes
            </h4>
            <div className="space-y-1">
              {bench.map((lp) => renderPlayer(lp, teamColor))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Team Lineups</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Home Team Lineup */}
        {renderTeamLineup(
          match.homeTeam.name,
          match.homeTeam.primaryColor,
          match.homeFormation,
          sortedHomeLineup,
          sortedHomeBench
        )}

        {/* Away Team Lineup */}
        {renderTeamLineup(
          match.awayTeam.name,
          match.awayTeam.primaryColor,
          match.awayFormation,
          sortedAwayLineup,
          sortedAwayBench
        )}
      </div>
    </div>
  )
}
