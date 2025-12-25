'use client'

import React from 'react'
import type { Match } from '@/lib/types'

interface CommentatorHeaderProps {
  match: Match
  matchTime: number
  timerRunning: boolean
  theme?: 'light' | 'dark'
}

/**
 * CommentatorHeader Component
 * 
 * Displays match overview information at the top of the commentator output.
 * 
 * Requirements:
 * - 3.1: Display both team names and logos
 * - 3.2: Display the current score prominently
 * - 3.3: Display the current match time in MM:SS format
 * - 3.4: Display the current period (1st Half, 2nd Half, ET, etc.)
 * - 3.5: Display the competition name and round
 * - 3.6: Display the venue name
 */
export function CommentatorHeader({ match, matchTime, timerRunning, theme = 'dark' }: CommentatorHeaderProps) {
  // Format match time as MM:SS (Requirements 3.3)
  const formatMatchTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Format period display (Requirements 3.4)
  const formatPeriod = (period: Match['period']): string => {
    const periodMap: Record<Match['period'], string> = {
      'pre': 'Pre-Match',
      '1st': '1st Half',
      'ht': 'Half Time',
      '2nd': '2nd Half',
      'ft': 'Full Time',
      'et1': 'Extra Time 1st Half',
      'etht': 'Extra Time Half Time',
      'et2': 'Extra Time 2nd Half',
      'aet': 'After Extra Time',
      'pen': 'Penalties',
    }
    return periodMap[period] || period
  }

  return (
    <div className={`rounded-lg shadow-xl p-4 sm:p-6 lg:p-8 border ${
      theme === 'light'
        ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
        : 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700'
    }`}>
      {/* Team Names, Logos, and Score (Requirements 3.1, 3.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-center mb-4 sm:mb-6">
        {/* Home Team */}
        <div className="flex flex-col items-center text-center order-1 lg:order-1">
          {match.homeTeam.logo ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3">
              <img
                src={match.homeTeam.logo}
                alt={`${match.homeTeam.name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3 rounded-full flex items-center justify-center text-xl sm:text-2xl lg:text-3xl font-bold text-white"
              style={{ backgroundColor: match.homeTeam.primaryColor }}
            >
              {match.homeTeam.shortName.substring(0, 3).toUpperCase()}
            </div>
          )}
          <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>{match.homeTeam.name}</h2>
          <p className={`text-sm sm:text-base lg:text-lg ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>{match.homeTeam.shortName}</p>
        </div>

        {/* Score (Requirements 3.2) */}
        <div className="text-center order-3 lg:order-2">
          <div className={`text-4xl sm:text-5xl lg:text-7xl font-bold mb-1 sm:mb-2 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            {match.homeScore} - {match.awayScore}
          </div>
          {/* Match Time and Period (Requirements 3.3, 3.4) */}
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-xl sm:text-2xl lg:text-3xl font-mono font-semibold ${
                theme === 'light' ? 'text-green-600' : 'text-green-400'
              }`}>
                {formatMatchTime(matchTime)}
              </span>
              {timerRunning && (
                <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <p className={`text-base sm:text-lg lg:text-xl font-medium ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {formatPeriod(match.period)}
            </p>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center text-center order-2 lg:order-3">
          {match.awayTeam.logo ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3">
              <img
                src={match.awayTeam.logo}
                alt={`${match.awayTeam.name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3 rounded-full flex items-center justify-center text-xl sm:text-2xl lg:text-3xl font-bold text-white"
              style={{ backgroundColor: match.awayTeam.primaryColor }}
            >
              {match.awayTeam.shortName.substring(0, 3).toUpperCase()}
            </div>
          )}
          <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>{match.awayTeam.name}</h2>
          <p className={`text-sm sm:text-base lg:text-lg ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>{match.awayTeam.shortName}</p>
        </div>
      </div>

      {/* Competition, Round, and Venue (Requirements 3.5, 3.6) */}
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-6 border-t pt-3 sm:pt-4 text-sm sm:text-base ${
        theme === 'light'
          ? 'text-gray-700 border-gray-300'
          : 'text-gray-300 border-gray-700'
      }`}>
        {/* Competition Logo */}
        {match.competitionLogo && (
          <div className="w-6 h-6 sm:w-8 sm:h-8">
            <img
              src={match.competitionLogo}
              alt="Competition logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        
        {/* Competition Name */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-semibold">
            {match.competitionShortName || match.competition}
          </span>
        </div>

        {/* Separator */}
        <span className={`hidden sm:inline ${
          theme === 'light' ? 'text-gray-400' : 'text-gray-500'
        }`}>•</span>

        {/* Round */}
        <span className="text-base sm:text-lg">{match.round}</span>

        {/* Separator */}
        <span className={`hidden sm:inline ${
          theme === 'light' ? 'text-gray-400' : 'text-gray-500'
        }`}>•</span>

        {/* Venue */}
        <div className="flex items-center gap-2">
          <svg 
            className={`w-4 h-4 sm:w-5 sm:h-5 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
          <span className="text-base sm:text-lg">{match.venue}</span>
        </div>
      </div>
    </div>
  )
}
