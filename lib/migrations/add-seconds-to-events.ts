/**
 * Migration: Add seconds field to existing events
 * 
 * This migration ensures all existing MatchEvent objects in the database
 * have a 'second' field. Events created before this field was added will
 * default to second: 0.
 * 
 * Requirements: 1.3 - Store both minute and second values for events
 */

import Dexie from "dexie"
import type { MatchEvent } from "../types"

interface DBMatch {
  id: string
  events: string
  updatedAt: string
}

/**
 * Run the migration to add seconds field to all events
 * @returns Object with migration statistics
 */
export async function migrateEventsAddSeconds(): Promise<{
  success: boolean
  matchesProcessed: number
  eventsUpdated: number
  errors: string[]
}> {
  const errors: string[] = []
  let matchesProcessed = 0
  let eventsUpdated = 0

  try {
    // Open the database
    const db = new Dexie("LocalMatchProDB")
    db.version(3).stores({
      matches: "id, tournamentId, homeTeamId, awayTeamId, kickoff, status, lastAutoSave",
    })

    // Get all matches
    const matches = await db.table<DBMatch>("matches").toArray()
    
    console.log(`[Migration] Found ${matches.length} matches to process`)

    // Process each match
    for (const match of matches) {
      try {
        // Parse events JSON
        const events: MatchEvent[] = JSON.parse(match.events || "[]")
        
        if (events.length === 0) {
          continue // Skip matches with no events
        }

        let updated = false

        // Check each event and add second field if missing
        for (const event of events) {
          if (event.second === undefined) {
            event.second = 0 // Default to 0 for existing events
            updated = true
            eventsUpdated++
          }
        }

        // If any events were updated, save back to database
        if (updated) {
          await db.table("matches").update(match.id, {
            events: JSON.stringify(events),
            updatedAt: new Date().toISOString(),
          })
          matchesProcessed++
        }
      } catch (error) {
        const errorMsg = `Error processing match ${match.id}: ${error}`
        console.error(`[Migration] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log(`[Migration] Complete: ${matchesProcessed} matches updated, ${eventsUpdated} events migrated`)

    return {
      success: errors.length === 0,
      matchesProcessed,
      eventsUpdated,
      errors,
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`
    console.error(`[Migration] ${errorMsg}`)
    errors.push(errorMsg)
    
    return {
      success: false,
      matchesProcessed,
      eventsUpdated,
      errors,
    }
  }
}

/**
 * Validate that all events have the seconds field
 * @returns Validation result with any issues found
 */
export async function validateEventsHaveSeconds(): Promise<{
  valid: boolean
  totalEvents: number
  eventsWithoutSeconds: number
  matchesWithIssues: string[]
}> {
  const matchesWithIssues: string[] = []
  let totalEvents = 0
  let eventsWithoutSeconds = 0

  try {
    // Open the database
    const db = new Dexie("LocalMatchProDB")
    db.version(3).stores({
      matches: "id, tournamentId, homeTeamId, awayTeamId, kickoff, status, lastAutoSave",
    })

    // Get all matches
    const matches = await db.table<DBMatch>("matches").toArray()

    // Check each match
    for (const match of matches) {
      try {
        const events: MatchEvent[] = JSON.parse(match.events || "[]")
        
        for (const event of events) {
          totalEvents++
          if (event.second === undefined) {
            eventsWithoutSeconds++
            if (!matchesWithIssues.includes(match.id)) {
              matchesWithIssues.push(match.id)
            }
          }
        }
      } catch (error) {
        console.error(`[Validation] Error parsing events for match ${match.id}:`, error)
        matchesWithIssues.push(match.id)
      }
    }

    return {
      valid: eventsWithoutSeconds === 0,
      totalEvents,
      eventsWithoutSeconds,
      matchesWithIssues,
    }
  } catch (error) {
    console.error("[Validation] Failed:", error)
    return {
      valid: false,
      totalEvents,
      eventsWithoutSeconds,
      matchesWithIssues,
    }
  }
}
