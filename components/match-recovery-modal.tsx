"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Match } from "@/lib/types"
import { AlertTriangle, Play, Trash2 } from "lucide-react"

import type { MatchValidationResult } from "@/lib/database-error-handler"

/**
 * Props for the MatchRecoveryModal component
 * Requirements: 2.2 - Display modal dialog prompting user to resume
 * Requirements: 12.2 - Show warning if data is incomplete
 */
interface MatchRecoveryModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** The interrupted match data to display */
  match: Match
  /** Callback when user clicks Resume Match */
  onResume: () => void
  /** Callback when user clicks Discard */
  onDiscard: () => void
  /** Validation result for the match data - Requirements 12.2 */
  validation?: MatchValidationResult | null
}

/**
 * Formats seconds into MM:SS format
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "45:30")
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * Maps period codes to human-readable labels
 * @param period - The period code from match state
 * @returns Human-readable period label
 */
function getPeriodLabel(period: Match["period"]): string {
  const labels: Record<Match["period"], string> = {
    pre: "Pre-Match",
    "1st": "1st Half",
    ht: "Half Time",
    "2nd": "2nd Half",
    ft: "Full Time",
    et1: "Extra Time 1st",
    etht: "ET Half Time",
    et2: "Extra Time 2nd",
    aet: "After Extra Time",
    pen: "Penalties",
  }
  return labels[period] || period
}


/**
 * MatchRecoveryModal - Displays when an interrupted match is detected on app startup
 * 
 * Requirements:
 * - 2.2: Display modal dialog prompting user to resume
 * - 2.3: Show match details (teams, score, timer position, period)
 * - 2.4: Resume Match button loads match state and navigates to Live Control
 * - 2.5: Discard button marks match as abandoned
 * - 12.2: Show warning if data is incomplete, offer to discard corrupted match
 */
export function MatchRecoveryModal({
  open,
  onOpenChange,
  match,
  onResume,
  onDiscard,
  validation,
}: MatchRecoveryModalProps) {
  const timerPosition = match.matchTime || 0
  
  // Check if match data is corrupted - Requirements 12.2
  const isCorrupted = validation && !validation.isValid
  const hasWarnings = validation && validation.warnings.length > 0
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border sm:max-w-[500px]" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-foreground">Match Recovery</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {isCorrupted 
              ? "An interrupted match was detected but some data appears to be corrupted. You may want to discard this match."
              : "An interrupted match was detected. Would you like to resume where you left off?"
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Corruption Warning - Requirements 12.2 */}
        {isCorrupted && validation && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <div className="font-medium text-destructive">Data Issues Detected:</div>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {validation.missingFields.length > 0 && (
                <li>Missing fields: {validation.missingFields.join(", ")}</li>
              )}
              {validation.corruptedFields.length > 0 && (
                <li>Corrupted fields: {validation.corruptedFields.join(", ")}</li>
              )}
            </ul>
          </div>
        )}
        
        {/* Warnings (non-critical) */}
        {hasWarnings && !isCorrupted && validation && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <div className="font-medium text-amber-600">Warnings:</div>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Match Details - Requirements 2.3 */}
        <div className="space-y-4 py-4">
          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
            {/* Home Team */}
            <div className="flex flex-1 flex-col items-center gap-2">
              {match.homeTeam.logo ? (
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {match.homeTeam.shortName?.charAt(0) || match.homeTeam.name.charAt(0)}
                </div>
              )}
              <span className="text-center text-sm font-medium">
                {match.homeTeam.shortName || match.homeTeam.name}
              </span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold tabular-nums">
                {match.homeScore} - {match.awayScore}
              </div>
              <div className="text-xs text-muted-foreground">
                {getPeriodLabel(match.period)}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-col items-center gap-2">
              {match.awayTeam.logo ? (
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {match.awayTeam.shortName?.charAt(0) || match.awayTeam.name.charAt(0)}
                </div>
              )}
              <span className="text-center text-sm font-medium">
                {match.awayTeam.shortName || match.awayTeam.name}
              </span>
            </div>
          </div>

          {/* Timer Position */}
          <div className="flex items-center justify-center gap-2 text-lg">
            <span className="text-muted-foreground">Timer:</span>
            <span className="font-mono font-semibold">{formatTime(timerPosition)}</span>
          </div>

          {/* Competition and Venue */}
          <div className="space-y-1 text-center text-sm text-muted-foreground">
            {match.competition && (
              <div>{match.competition}{match.round ? ` • ${match.round}` : ""}</div>
            )}
            {match.venue && <div>{match.venue}</div>}
          </div>
        </div>

        {/* Action Buttons - Requirements 2.4, 2.5, 12.2 */}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant={isCorrupted ? "default" : "outline"}
            onClick={onDiscard}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Discard Match
          </Button>
          {!isCorrupted && (
            <Button
              onClick={onResume}
              className="w-full sm:w-auto"
            >
              <Play className="h-4 w-4" />
              Resume Match
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export utility functions for testing
export { formatTime, getPeriodLabel }
