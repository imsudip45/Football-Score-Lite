import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MatchEvent, Match } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats event time according to the specified format
 * @param event - The match event containing minute and second
 * @param format - The desired format: 'MM:SS' or "MM'"
 * @returns Formatted time string
 * 
 * Requirements: 1.4, 11.1, 11.2
 */
export function formatEventTime(
  event: MatchEvent,
  format: 'MM:SS' | "MM'"
): string {
  // Handle edge case: missing second field for old events (backward compatibility)
  const second = event.second ?? 0
  
  if (format === 'MM:SS') {
    // Format as MM:SS with zero-padding
    const mins = event.minute.toString().padStart(2, '0')
    const secs = second.toString().padStart(2, '0')
    return `${mins}:${secs}`
  } else {
    // Format as MM' (minute with apostrophe)
    return `${event.minute}'`
  }
}

/**
 * Exports match data as a formatted text summary
 * 
 * Requirements:
 * - 10.2: Generate text summary of match
 * - 10.3: Include all events with timestamps
 * - 10.4: Include final statistics
 * - 10.5: Format for readability
 * 
 * @param match - The match to export
 * @param matchTime - Current match time in seconds
 * @returns Formatted text summary of the match
 */
export function exportMatchData(match: Match, matchTime: number): string {
  const lines: string[] = []
  
  // Header (Requirements 10.2)
  lines.push('=' .repeat(80))
  lines.push('MATCH SUMMARY')
  lines.push('=' .repeat(80))
  lines.push('')
  
  // Match Information (Requirements 10.2)
  lines.push(`Competition: ${match.competition}`)
  lines.push(`Round: ${match.round}`)
  lines.push(`Venue: ${match.venue}`)
  lines.push(`Date: ${new Date(match.kickoff).toLocaleString()}`)
  lines.push('')
  
  // Teams and Score (Requirements 10.2)
  lines.push('-'.repeat(80))
  lines.push(`${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`)
  lines.push('-'.repeat(80))
  lines.push('')
  
  // Match Status
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
  
  const mins = Math.floor(matchTime / 60)
  const secs = matchTime % 60
  lines.push(`Status: ${formatPeriod(match.period)}`)
  lines.push(`Match Time: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
  lines.push('')
  
  // Match Statistics (Requirements 10.4)
  lines.push('MATCH STATISTICS')
  lines.push('-'.repeat(80))
  
  // Calculate statistics from events
  const homeGoals = match.events.filter(
    e => e.team === 'home' && (e.type === 'goal' || e.type === 'penalty-goal')
  ).length
  
  const awayGoals = match.events.filter(
    e => e.team === 'away' && (e.type === 'goal' || e.type === 'penalty-goal')
  ).length
  
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
  
  // Format statistics table (Requirements 10.5)
  const statLine = (label: string, homeVal: number | string, awayVal: number | string) => {
    const labelWidth = 20
    const valueWidth = 10
    return `${label.padEnd(labelWidth)}${String(homeVal).padStart(valueWidth)}${String(awayVal).padStart(valueWidth)}`
  }
  
  lines.push(statLine('', match.homeTeam.shortName, match.awayTeam.shortName))
  lines.push(statLine('Goals', homeGoals, awayGoals))
  lines.push(statLine('Fouls', match.homeFouls || 0, match.awayFouls || 0))
  lines.push(statLine('Yellow Cards', homeYellowCards, awayYellowCards))
  lines.push(statLine('Red Cards', homeRedCards, awayRedCards))
  lines.push(statLine('Substitutions', homeSubstitutions, awaySubstitutions))
  lines.push('')
  
  // Match Events (Requirements 10.3)
  lines.push('MATCH EVENTS')
  lines.push('-'.repeat(80))
  
  if (match.events.length === 0) {
    lines.push('No events recorded')
  } else {
    // Sort events chronologically (oldest first for match report)
    const sortedEvents = [...match.events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    sortedEvents.forEach(event => {
      // Format time (Requirements 10.3)
      const timeStr = formatEventTime(event, 'MM:SS')
      
      // Format event type
      const formatEventType = (type: MatchEvent['type']): string => {
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
        return typeMap[type] || type.toUpperCase()
      }
      
      // Get team name
      const teamName = event.team === 'home' ? match.homeTeam.shortName : match.awayTeam.shortName
      
      // Build event line (Requirements 10.5)
      let eventLine = `${timeStr.padEnd(8)} ${formatEventType(event.type).padEnd(20)} ${teamName.padEnd(15)}`
      
      // Add player information
      if (event.player) {
        eventLine += ` #${event.player.number} ${event.player.name}`
      }
      
      lines.push(eventLine)
      
      // Add second player for substitutions
      if (event.secondPlayer && event.type === 'sub') {
        lines.push(`${' '.repeat(8)} ${'→'.padEnd(20)} ${' '.repeat(15)} #${event.secondPlayer.number} ${event.secondPlayer.name}`)
      }
      
      // Add note if present
      if (event.note) {
        lines.push(`${' '.repeat(8)} Note: ${event.note}`)
      }
      
      // Add stoppage time indicator
      if (event.stoppageMinute !== undefined) {
        lines.push(`${' '.repeat(8)} (Stoppage Time: +${event.stoppageMinute}')`)
      }
    })
  }
  
  lines.push('')
  
  // Match Officials
  if (match.officials && match.officials.length > 0) {
    lines.push('MATCH OFFICIALS')
    lines.push('-'.repeat(80))
    
    const referee = match.officials.find(o => o.role === 'referee')
    const ar1 = match.officials.find(o => o.role === 'ar1')
    const ar2 = match.officials.find(o => o.role === 'ar2')
    const fourth = match.officials.find(o => o.role === 'fourth')
    
    if (referee) lines.push(`Referee:           ${referee.name}`)
    if (ar1) lines.push(`Assistant Ref 1:   ${ar1.name}`)
    if (ar2) lines.push(`Assistant Ref 2:   ${ar2.name}`)
    if (fourth) lines.push(`Fourth Official:   ${fourth.name}`)
    
    lines.push('')
  }
  
  // Lineups
  lines.push('STARTING LINEUPS')
  lines.push('-'.repeat(80))
  
  // Home Team Lineup
  lines.push(`${match.homeTeam.name} (${match.homeFormation || 'N/A'})`)
  if (match.homeLineup && match.homeLineup.length > 0) {
    match.homeLineup.forEach(lp => {
      const captainMark = lp.player.isCaptain ? ' (C)' : ''
      lines.push(`  #${lp.player.number.toString().padStart(2)} ${lp.player.name}${captainMark}`)
    })
  } else {
    lines.push('  No lineup configured')
  }
  lines.push('')
  
  // Away Team Lineup
  lines.push(`${match.awayTeam.name} (${match.awayFormation || 'N/A'})`)
  if (match.awayLineup && match.awayLineup.length > 0) {
    match.awayLineup.forEach(lp => {
      const captainMark = lp.player.isCaptain ? ' (C)' : ''
      lines.push(`  #${lp.player.number.toString().padStart(2)} ${lp.player.name}${captainMark}`)
    })
  } else {
    lines.push('  No lineup configured')
  }
  lines.push('')
  
  // Footer
  lines.push('=' .repeat(80))
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push(`Export from LocalMatch Pro`)
  lines.push('=' .repeat(80))
  
  return lines.join('\n')
}
