/**
 * Database Error Handler
 * 
 * Provides error handling utilities for IndexedDB operations including:
 * - Retry logic with configurable attempts and delays
 * - Storage quota detection
 * - Match data validation
 * - Error classification and user-friendly messages
 * 
 * Requirements: Error Handling (12.1, 12.2, 12.3)
 */

import type { Match } from "./types"

/**
 * Error types for database operations
 */
export type DatabaseErrorType = 
  | "write_failure"
  | "quota_exceeded"
  | "corrupted_data"
  | "network_error"
  | "unknown"

/**
 * Structured database error with type and context
 */
export interface DatabaseError {
  type: DatabaseErrorType
  message: string
  originalError?: Error
  retryable: boolean
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Delay between retries in milliseconds */
  retryDelay: number
  /** Callback when retry is attempted */
  onRetry?: (attempt: number, error: DatabaseError) => void
  /** Callback when all retries exhausted */
  onMaxRetriesExceeded?: (error: DatabaseError) => void
}

/**
 * Default retry configuration
 * - 3 attempts total (1 initial + 2 retries)
 * - 1 second delay between retries
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  retryDelay: 1000,
}

/**
 * Classifies an error into a DatabaseErrorType
 * @param error - The error to classify
 * @returns Classified DatabaseError with type and metadata
 */
export function classifyDatabaseError(error: unknown): DatabaseError {
  if (!(error instanceof Error)) {
    return {
      type: "unknown",
      message: "An unknown error occurred",
      retryable: true,
    }
  }

  const errorMessage = error.message.toLowerCase()
  const errorName = error.name.toLowerCase()

  // Check for quota exceeded errors
  if (
    errorMessage.includes("quota") ||
    errorMessage.includes("storage") ||
    errorName.includes("quotaexceedederror") ||
    errorMessage.includes("disk") ||
    errorMessage.includes("full")
  ) {
    return {
      type: "quota_exceeded",
      message: "Storage quota exceeded. Please clear old match data to continue.",
      originalError: error,
      retryable: false,
    }
  }

  // Check for network/connection errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("offline")
  ) {
    return {
      type: "network_error",
      message: "Database connection error. Will retry automatically.",
      originalError: error,
      retryable: true,
    }
  }

  // Check for data corruption errors
  if (
    errorMessage.includes("corrupt") ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("parse") ||
    errorMessage.includes("json")
  ) {
    return {
      type: "corrupted_data",
      message: "Match data appears to be corrupted.",
      originalError: error,
      retryable: false,
    }
  }

  // Default to write failure (retryable)
  return {
    type: "write_failure",
    message: "Failed to save match data. Will retry automatically.",
    originalError: error,
    retryable: true,
  }
}

/**
 * Executes a database operation with retry logic
 * Requirements: 12.1 - Retry after 1 second, show toast warning after 3 failures
 * 
 * @param operation - The async database operation to execute
 * @param config - Retry configuration
 * @returns Result of the operation or throws after max retries
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, retryDelay, onRetry, onMaxRetriesExceeded } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError: DatabaseError | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyDatabaseError(error)

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        throw lastError
      }

      // If not the last attempt, wait and retry
      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    onMaxRetriesExceeded?.(lastError)
    throw lastError
  }

  // Should never reach here, but TypeScript needs this
  throw new Error("Unexpected error in retry logic")
}

/**
 * Required fields for a valid match
 */
const REQUIRED_MATCH_FIELDS: (keyof Match)[] = [
  "id",
  "homeTeam",
  "awayTeam",
  "homeScore",
  "awayScore",
  "period",
  "status",
]

/**
 * Validation result for match data
 */
export interface MatchValidationResult {
  isValid: boolean
  missingFields: string[]
  corruptedFields: string[]
  warnings: string[]
}

/**
 * Validates match data for completeness and integrity
 * Requirements: 12.2 - Validate match data on load
 * 
 * @param match - The match data to validate
 * @returns Validation result with details about any issues
 */
export function validateMatchData(match: unknown): MatchValidationResult {
  const result: MatchValidationResult = {
    isValid: true,
    missingFields: [],
    corruptedFields: [],
    warnings: [],
  }

  // Check if match is an object
  if (!match || typeof match !== "object") {
    result.isValid = false
    result.missingFields.push("match object")
    return result
  }

  const matchObj = match as Record<string, unknown>

  // Check required fields
  for (const field of REQUIRED_MATCH_FIELDS) {
    if (matchObj[field] === undefined || matchObj[field] === null) {
      result.isValid = false
      result.missingFields.push(field)
    }
  }

  // Validate team objects
  if (matchObj.homeTeam) {
    const homeTeamValidation = validateTeamData(matchObj.homeTeam)
    if (!homeTeamValidation.isValid) {
      result.isValid = false
      result.corruptedFields.push(`homeTeam: ${homeTeamValidation.issues.join(", ")}`)
    }
  }

  if (matchObj.awayTeam) {
    const awayTeamValidation = validateTeamData(matchObj.awayTeam)
    if (!awayTeamValidation.isValid) {
      result.isValid = false
      result.corruptedFields.push(`awayTeam: ${awayTeamValidation.issues.join(", ")}`)
    }
  }

  // Validate scores are numbers
  if (typeof matchObj.homeScore !== "number" || matchObj.homeScore < 0) {
    result.corruptedFields.push("homeScore")
    result.isValid = false
  }
  if (typeof matchObj.awayScore !== "number" || matchObj.awayScore < 0) {
    result.corruptedFields.push("awayScore")
    result.isValid = false
  }

  // Validate period is valid
  const validPeriods = ["pre", "1st", "ht", "2nd", "ft", "et1", "etht", "et2", "aet", "pen"]
  if (!validPeriods.includes(matchObj.period as string)) {
    result.corruptedFields.push("period")
    result.isValid = false
  }

  // Validate status is valid
  const validStatuses = ["draft", "live", "completed", "abandoned"]
  if (!validStatuses.includes(matchObj.status as string)) {
    result.corruptedFields.push("status")
    result.isValid = false
  }

  // Validate arrays (non-critical - add warnings)
  if (matchObj.events && !Array.isArray(matchObj.events)) {
    result.warnings.push("events is not an array")
  }
  if (matchObj.homeLineup && !Array.isArray(matchObj.homeLineup)) {
    result.warnings.push("homeLineup is not an array")
  }
  if (matchObj.awayLineup && !Array.isArray(matchObj.awayLineup)) {
    result.warnings.push("awayLineup is not an array")
  }

  // Validate matchTime if present
  if (matchObj.matchTime !== undefined && typeof matchObj.matchTime !== "number") {
    result.warnings.push("matchTime is not a number")
  }

  return result
}

/**
 * Validates team data structure
 */
function validateTeamData(team: unknown): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!team || typeof team !== "object") {
    return { isValid: false, issues: ["not an object"] }
  }

  const teamObj = team as Record<string, unknown>

  if (!teamObj.id || typeof teamObj.id !== "string") {
    issues.push("missing or invalid id")
  }
  if (!teamObj.name || typeof teamObj.name !== "string") {
    issues.push("missing or invalid name")
  }

  return { isValid: issues.length === 0, issues }
}

/**
 * Checks if the error is a storage quota exceeded error
 * Requirements: 12.3 - Detect quota error
 * 
 * @param error - The error to check
 * @returns True if the error is a quota exceeded error
 */
export function isQuotaExceededError(error: unknown): boolean {
  const classified = classifyDatabaseError(error)
  return classified.type === "quota_exceeded"
}

/**
 * Gets a user-friendly error message for display
 * 
 * @param error - The database error
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: DatabaseError): string {
  switch (error.type) {
    case "quota_exceeded":
      return "Storage is full. Please go to Settings to clear old match data."
    case "corrupted_data":
      return "Match data is corrupted. You may need to discard this match."
    case "write_failure":
      return "Failed to save match data. Your changes may not be saved."
    case "network_error":
      return "Database connection issue. Retrying..."
    default:
      return "An unexpected error occurred."
  }
}

/**
 * State tracker for retry attempts (used by auto-save hook)
 */
export class RetryTracker {
  private failureCount = 0
  private lastFailureTime: Date | null = null

  /**
   * Records a failure and returns the current failure count
   */
  recordFailure(): number {
    this.failureCount++
    this.lastFailureTime = new Date()
    return this.failureCount
  }

  /**
   * Resets the failure count (call on successful save)
   */
  reset(): void {
    this.failureCount = 0
    this.lastFailureTime = null
  }

  /**
   * Gets the current failure count
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Checks if we've exceeded the warning threshold
   */
  shouldShowWarning(threshold = 3): boolean {
    return this.failureCount >= threshold
  }
}
