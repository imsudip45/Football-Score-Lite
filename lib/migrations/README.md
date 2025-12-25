# Database Migrations

This directory contains database migration scripts for LocalMatch Pro.

## Available Migrations

### Add Seconds to Events (add-seconds-to-events.ts)

**Purpose:** Adds a `second` field to all existing MatchEvent objects in the database.

**Background:** The event timing system was enhanced to capture both minutes and seconds when events occur. This migration ensures backward compatibility by adding a default `second: 0` value to all events that were created before this field was added.

**Requirements:** Implements Requirement 1.3 - Store both minute and second values for events

**How to Run:**

```bash
# Using npm script (recommended)
npm run migrate:events-seconds

# Or using pnpm
pnpm migrate:events-seconds

# Or directly with tsx
npx tsx scripts/migrate-events-seconds.ts
```

**What it does:**

1. Scans all matches in the database
2. Parses the events JSON for each match
3. Adds `second: 0` to any events missing this field
4. Saves the updated events back to the database
5. Validates that all events now have the `second` field

**Safety:**

- Non-destructive: Only adds missing fields, doesn't modify existing data
- Validates before and after migration
- Reports detailed statistics and any errors
- Can be run multiple times safely (idempotent)

**Output Example:**

```
============================================================
Event Seconds Field Migration
============================================================

Step 1: Validating current database state...
  Total events found: 45
  Events without 'second' field: 45
  Matches with issues: 3

Step 2: Running migration...
  ✓ Migration completed successfully
  Matches processed: 3
  Events updated: 45

Step 3: Validating migration results...
  Total events found: 45
  Events without 'second' field: 0

✓ Migration validation passed! All events now have the 'second' field.

============================================================
Migration Complete
============================================================
```

## Creating New Migrations

When creating a new migration:

1. Create a new file in `lib/migrations/` with a descriptive name
2. Export a main migration function that returns a result object with:
   - `success: boolean`
   - Statistics about what was migrated
   - `errors: string[]` for any issues encountered
3. Export a validation function to verify the migration
4. Create a script in `scripts/` to run the migration
5. Add a script command to `package.json`
6. Document the migration in this README

## Migration Best Practices

- **Idempotent:** Migrations should be safe to run multiple times
- **Non-destructive:** Preserve existing data whenever possible
- **Validated:** Include pre and post-migration validation
- **Logged:** Provide clear console output about what's happening
- **Reversible:** Consider providing a rollback function if needed
- **Tested:** Test migrations on sample data before running on production
