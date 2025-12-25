#!/usr/bin/env tsx
/**
 * Migration Script: Add seconds field to existing events
 * 
 * This script migrates all existing MatchEvent objects in the database
 * to include a 'second' field (defaulting to 0 for old events).
 * 
 * Usage:
 *   npm run migrate:events-seconds
 * 
 * Or directly with tsx:
 *   npx tsx scripts/migrate-events-seconds.ts
 */

import { migrateEventsAddSeconds, validateEventsHaveSeconds } from "../lib/migrations/add-seconds-to-events"

async function main() {
  console.log("=".repeat(60))
  console.log("Event Seconds Field Migration")
  console.log("=".repeat(60))
  console.log()

  // Step 1: Validate current state
  console.log("Step 1: Validating current database state...")
  const preValidation = await validateEventsHaveSeconds()
  
  console.log(`  Total events found: ${preValidation.totalEvents}`)
  console.log(`  Events without 'second' field: ${preValidation.eventsWithoutSeconds}`)
  
  if (preValidation.eventsWithoutSeconds === 0) {
    console.log()
    console.log("✓ All events already have the 'second' field. No migration needed.")
    console.log()
    return
  }

  console.log(`  Matches with issues: ${preValidation.matchesWithIssues.length}`)
  console.log()

  // Step 2: Run migration
  console.log("Step 2: Running migration...")
  const result = await migrateEventsAddSeconds()

  if (result.success) {
    console.log(`  ✓ Migration completed successfully`)
    console.log(`  Matches processed: ${result.matchesProcessed}`)
    console.log(`  Events updated: ${result.eventsUpdated}`)
  } else {
    console.log(`  ✗ Migration completed with errors`)
    console.log(`  Matches processed: ${result.matchesProcessed}`)
    console.log(`  Events updated: ${result.eventsUpdated}`)
    console.log(`  Errors: ${result.errors.length}`)
    result.errors.forEach((error, i) => {
      console.log(`    ${i + 1}. ${error}`)
    })
  }
  console.log()

  // Step 3: Validate post-migration
  console.log("Step 3: Validating migration results...")
  const postValidation = await validateEventsHaveSeconds()
  
  console.log(`  Total events found: ${postValidation.totalEvents}`)
  console.log(`  Events without 'second' field: ${postValidation.eventsWithoutSeconds}`)
  
  if (postValidation.valid) {
    console.log()
    console.log("✓ Migration validation passed! All events now have the 'second' field.")
  } else {
    console.log()
    console.log("✗ Migration validation failed. Some events still missing 'second' field.")
    console.log(`  Matches with issues: ${postValidation.matchesWithIssues.join(", ")}`)
  }
  
  console.log()
  console.log("=".repeat(60))
  console.log("Migration Complete")
  console.log("=".repeat(60))
}

// Run the migration
main().catch((error) => {
  console.error("Fatal error running migration:", error)
  process.exit(1)
})
