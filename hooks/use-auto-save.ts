"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useAppStore } from "@/lib/store"
import { saveMatchState } from "@/lib/database"
import { 
  withRetry, 
  classifyDatabaseError, 
  RetryTracker,
  getUserFriendlyErrorMessage,
  isQuotaExceededError,
  type DatabaseError 
} from "@/lib/database-error-handler"
import { toast } from "sonner"
import type { Match } from "@/lib/types"

/**
 * Auto-save configuration options
 */
export interface AutoSaveConfig {
  /** Interval in milliseconds between auto-saves (default: 3000ms) */
  interval: number
  /** Whether auto-save is enabled */
  enabled: boolean
  /** Callback when save fails after all retries */
  onSaveError?: (error: DatabaseError) => void
}

/**
 * Return type for the useAutoSave hook
 */
export interface AutoSaveResult {
  /** Timestamp of the last successful save */
  lastSaved: Date | null
  /** Whether a save operation is currently in progress */
  isSaving: boolean
  /** Function to trigger an immediate save */
  saveNow: () => Promise<void>
  /** Current consecutive failure count */
  failureCount: number
  /** Last error that occurred */
  lastError: DatabaseError | null
}

/**
 * Default configuration for auto-save
 */
const DEFAULT_CONFIG: AutoSaveConfig = {
  interval: 3000, // 3 seconds as per Requirements 1.1
  enabled: true,
}

/**
 * Debounce delay for rapid events (Requirements 1.2)
 * If multiple events occur within this window, they are batched into a single save
 */
const DEBOUNCE_DELAY = 100 // 100ms

/**
 * Number of failures before showing a warning toast
 * Requirements: 12.1 - Show toast warning after 3 failures
 */
const FAILURE_WARNING_THRESHOLD = 3

/**
 * useAutoSave Hook
 * 
 * Implements automatic persistence of match state to IndexedDB.
 * - Saves every 3 seconds when timer is running and match status is 'live' (Requirements 1.1)
 * - Triggers immediate saves on critical events (goals, cards, subs, period changes) (Requirements 1.2, 1.3, 1.4)
 * - Debounces rapid events to prevent database thrashing (Requirements 1.2)
 * - Retries failed saves with exponential backoff (Requirements 12.1)
 * - Shows toast warning after 3 consecutive failures (Requirements 12.1)
 * 
 * @param config - Configuration options for auto-save behavior
 * @returns Object containing lastSaved timestamp, isSaving state, and saveNow function
 */
export function useAutoSave(config: Partial<AutoSaveConfig> = {}): AutoSaveResult {
  const { interval, enabled, onSaveError } = { ...DEFAULT_CONFIG, ...config }
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [failureCount, setFailureCount] = useState(0)
  const [lastError, setLastError] = useState<DatabaseError | null>(null)
  
  // Refs for tracking state without causing re-renders
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastEventsLengthRef = useRef<number>(0)
  const lastScoreRef = useRef<{ home: number; away: number }>({ home: 0, away: 0 })
  const lastPeriodRef = useRef<string>("")
  const retryTrackerRef = useRef(new RetryTracker())
  const warningShownRef = useRef(false)
  
  // Get store state
  const currentMatch = useAppStore((state) => state.currentMatch)
  const timerRunning = useAppStore((state) => state.timerRunning)
  const matchTime = useAppStore((state) => state.matchTime)
  const possession = useAppStore((state) => state.possession)

  /**
   * Core save function that persists match state to IndexedDB
   * Includes timer state and possession for complete recovery
   * Requirements: 12.1 - Retry after 1 second, show toast warning after 3 failures
   */
  const performSave = useCallback(async () => {
    if (!currentMatch || currentMatch.status !== "live") {
      return
    }

    setIsSaving(true)
    try {
      // Create match state with current timer and control state
      const matchState: Match = {
        ...currentMatch,
        matchTime,
        timerRunning,
        possession,
      }
      
      // Use retry logic for database writes (Requirements 12.1)
      await withRetry(
        () => saveMatchState(matchState),
        {
          maxAttempts: 3,
          retryDelay: 1000, // 1 second as per requirements
          onRetry: (attempt, error) => {
            console.warn(`[useAutoSave] Retry attempt ${attempt} after error:`, error.message)
          },
          onMaxRetriesExceeded: (error) => {
            // Track consecutive failures
            const failures = retryTrackerRef.current.recordFailure()
            setFailureCount(failures)
            setLastError(error)
            
            // Show warning toast after 3 failures (Requirements 12.1)
            if (failures >= FAILURE_WARNING_THRESHOLD && !warningShownRef.current) {
              warningShownRef.current = true
              
              // Special handling for quota exceeded (Requirements 12.3)
              if (error.type === "quota_exceeded") {
                toast.error("Storage full", {
                  description: "Go to Settings > Storage Management to clear old matches.",
                  duration: 10000,
                })
              } else {
                toast.warning("Auto-save failing", {
                  description: getUserFriendlyErrorMessage(error),
                  duration: 5000,
                })
              }
            }
            
            // Call error callback if provided
            onSaveError?.(error)
          },
        }
      )
      
      // Success - reset failure tracking
      retryTrackerRef.current.reset()
      setFailureCount(0)
      setLastError(null)
      warningShownRef.current = false
      setLastSaved(new Date())
    } catch (error) {
      // Error already handled in onMaxRetriesExceeded
      // Continue with in-memory state (Requirements 12.1)
      console.error("[useAutoSave] Failed to save match state after retries:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentMatch, matchTime, timerRunning, possession, onSaveError])

  /**
   * Debounced save function for handling rapid events
   * Batches multiple events within DEBOUNCE_DELAY into a single save
   */
  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      performSave()
      debounceTimeoutRef.current = null
    }, DEBOUNCE_DELAY)
  }, [performSave])

  /**
   * Public function to trigger an immediate save
   * Bypasses debouncing for user-initiated saves
   */
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    
    await performSave()
  }, [performSave])

  /**
   * Effect: Interval-based auto-save (Requirements 1.1)
   * Saves every 3 seconds when timer is running and match is live
   */
  useEffect(() => {
    if (!enabled || !currentMatch || currentMatch.status !== "live") {
      // Clear interval if conditions not met
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Only run interval when timer is running
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        performSave()
      }, interval)
    } else {
      // Clear interval when timer pauses
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, currentMatch?.status, timerRunning, interval, performSave])

  /**
   * Effect: Immediate save on event additions (Requirements 1.2)
   * Triggers debounced save when events array length changes
   */
  useEffect(() => {
    if (!enabled || !currentMatch || currentMatch.status !== "live") {
      return
    }

    const currentEventsLength = currentMatch.events?.length ?? 0
    
    // Check if events were added (not just initial load)
    if (lastEventsLengthRef.current > 0 && currentEventsLength > lastEventsLengthRef.current) {
      debouncedSave()
    }
    
    lastEventsLengthRef.current = currentEventsLength
  }, [enabled, currentMatch?.status, currentMatch?.events?.length, debouncedSave])

  /**
   * Effect: Immediate save on score changes (Requirements 1.3)
   * Triggers debounced save when home or away score changes
   */
  useEffect(() => {
    if (!enabled || !currentMatch || currentMatch.status !== "live") {
      return
    }

    const currentScore = {
      home: currentMatch.homeScore ?? 0,
      away: currentMatch.awayScore ?? 0,
    }
    
    // Check if score changed (not just initial load)
    if (
      (lastScoreRef.current.home !== 0 || lastScoreRef.current.away !== 0) &&
      (currentScore.home !== lastScoreRef.current.home || 
       currentScore.away !== lastScoreRef.current.away)
    ) {
      debouncedSave()
    }
    
    lastScoreRef.current = currentScore
  }, [enabled, currentMatch?.status, currentMatch?.homeScore, currentMatch?.awayScore, debouncedSave])

  /**
   * Effect: Immediate save on period changes (Requirements 1.4)
   * Triggers debounced save when match period changes
   */
  useEffect(() => {
    if (!enabled || !currentMatch || currentMatch.status !== "live") {
      return
    }

    const currentPeriod = currentMatch.period ?? ""
    
    // Check if period changed (not just initial load)
    if (lastPeriodRef.current !== "" && currentPeriod !== lastPeriodRef.current) {
      debouncedSave()
    }
    
    lastPeriodRef.current = currentPeriod
  }, [enabled, currentMatch?.status, currentMatch?.period, debouncedSave])

  /**
   * Cleanup effect: Clear all timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    lastSaved,
    isSaving,
    saveNow,
    failureCount,
    lastError,
  }
}
