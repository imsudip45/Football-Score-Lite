'use client'

import React from 'react'
import Image from 'next/image'
import type { Official } from '@/lib/types'

interface CommentatorOfficialsProps {
  officials: Official[]
}

/**
 * CommentatorOfficials Component
 * 
 * Displays match officials with their names and roles clearly labeled.
 * 
 * Requirements:
 * - 7.1: Display the referee's name
 * - 7.2: Display assistant referees' names
 * - 7.3: Display the fourth official's name
 * - 7.4: Display VAR officials if assigned
 * - 7.5: Show official roles clearly labeled
 */
export function CommentatorOfficials({ officials }: CommentatorOfficialsProps) {
  // Get officials by role (Requirements 7.1, 7.2, 7.3, 7.4)
  const referee = officials.find(o => o.role === 'referee')
  const assistantRef1 = officials.find(o => o.role === 'ar1')
  const assistantRef2 = officials.find(o => o.role === 'ar2')
  const fourthOfficial = officials.find(o => o.role === 'fourth')

  // Format role name for display (Requirements 7.5)
  const formatRole = (role: Official['role']): string => {
    const roleMap: Record<Official['role'], string> = {
      'referee': 'Referee',
      'ar1': 'Assistant Referee 1',
      'ar2': 'Assistant Referee 2',
      'fourth': 'Fourth Official',
    }
    return roleMap[role] || role
  }

  // Render a single official row (Requirements 7.5)
  const renderOfficial = (official: Official | undefined, defaultLabel: string) => {
    if (!official) {
      return (
        <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg bg-gray-700/30">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-gray-400 uppercase mb-1">
              {defaultLabel}
            </div>
            <div className="text-sm sm:text-base text-gray-500 italic">
              Not assigned
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
        {/* Official Photo */}
        {official.photo ? (
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-600">
            <Image
              src={official.photo}
              alt={official.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 border-2 border-gray-500">
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
        )}

        {/* Official Information */}
        <div className="flex-1 min-w-0">
          {/* Role Label (Requirements 7.5) */}
          <div className="text-xs sm:text-sm font-semibold text-gray-400 uppercase mb-1">
            {formatRole(official.role)}
          </div>
          
          {/* Official Name */}
          <div className="text-base sm:text-lg font-medium text-white truncate">
            {official.name}
          </div>

          {/* Additional Information */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1">
            {/* Nationality */}
            {official.nationality && (
              <span className="text-xs sm:text-sm text-gray-400">
                {official.nationality}
              </span>
            )}
            
            {/* Badge */}
            {official.badge && (
              <>
                {official.nationality && (
                  <span className="text-gray-600">•</span>
                )}
                <span className="text-xs sm:text-sm text-gray-400">
                  {official.badge}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 border border-gray-700">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-white">Match Officials</h2>

      {officials.length === 0 ? (
        <p className="text-gray-400 text-center py-6 sm:py-8 text-sm sm:text-base">No officials assigned</p>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {/* Referee (Requirements 7.1) */}
          {renderOfficial(referee, 'Referee')}

          {/* Assistant Referee 1 (Requirements 7.2) */}
          {renderOfficial(assistantRef1, 'Assistant Referee 1')}

          {/* Assistant Referee 2 (Requirements 7.2) */}
          {renderOfficial(assistantRef2, 'Assistant Referee 2')}

          {/* Fourth Official (Requirements 7.3) */}
          {renderOfficial(fourthOfficial, 'Fourth Official')}

          {/* Note: VAR officials (Requirements 7.4) would be added here when the role is added to the Official type */}
        </div>
      )}
    </div>
  )
}
