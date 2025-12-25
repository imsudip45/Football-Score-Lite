"use client"

import { useEffect, useState } from "react"
import { getTournamentFixtures, type FixtureListItem } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Check, 
  Radio, 
  Users, 
  Calendar, 
  MapPin 
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Props for the TournamentFixtureList component
 * Requirements: 3.1 - Display list of fixtures for a tournament
 */
export interface TournamentFixtureListProps {
  /** The tournament ID to load fixtures for */
  tournamentId: string
  /** Callback when a fixture is selected */
  onSelectFixture: (matchId: string) => void
  /** Callback when create fixture button is clicked */
  onCreateFixture: () => void
  /** Optional key to trigger refresh (increment to reload fixtures) */
  refreshKey?: number
}

/**
 * Formats a date for display in fixture list
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Dec 18, 2025 • 15:00")
 */
export function formatFixtureDate(date: Date): string {
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${dateStr} • ${timeStr}`
}

/**
 * Status badge configuration for each fixture status
 */
const statusConfig: Record<
  FixtureListItem["status"],
  { label: string; className: string; icon?: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
  ready: {
    label: "Ready",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <Check className="h-3 w-3" />,
  },
  live: {
    label: "Live",
    className: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
    icon: <Radio className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  abandoned: {
    label: "Abandoned",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
}

/**
 * Renders a status badge for a fixture
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function FixtureStatusBadge({ 
  status, 
  homeScore, 
  awayScore 
}: { 
  status: FixtureListItem["status"]
  homeScore?: number
  awayScore?: number
}) {
  const config = statusConfig[status]
  
  // For completed matches, show the final score
  if (status === "completed" && homeScore !== undefined && awayScore !== undefined) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1", config.className)}
      >
        {homeScore} - {awayScore}
      </Badge>
    )
  }
  
  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", config.className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}

/**
 * Renders a lineup indicator showing if lineups are configured
 * Requirements: 3.3
 */
export function LineupIndicator({ hasLineups }: { hasLineups: boolean }) {
  if (!hasLineups) return null
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Users className="h-3 w-3" />
      <span>Lineups set</span>
    </div>
  )
}

/**
 * Loading skeleton for fixture list
 */
function FixtureListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
            <div className="flex items-center gap-4">
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Single fixture list item component
 * Requirements: 3.2, 3.4
 */
function FixtureListItem({
  fixture,
  onSelect,
}: {
  fixture: FixtureListItem
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-card p-4 text-left transition-colors",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
        fixture.status === "live" && "border-red-500/50 bg-red-500/5"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex flex-1 items-center gap-3">
          {fixture.homeTeam.logo ? (
            <img
              src={fixture.homeTeam.logo}
              alt={fixture.homeTeam.name}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
              {fixture.homeTeam.shortName?.charAt(0) || fixture.homeTeam.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium">{fixture.homeTeam.name}</div>
            <div className="text-xs text-muted-foreground">
              {fixture.homeTeam.shortName}
            </div>
          </div>
        </div>

        {/* Center Info */}
        <div className="flex flex-col items-center gap-1">
          <FixtureStatusBadge 
            status={fixture.status} 
            homeScore={fixture.homeScore}
            awayScore={fixture.awayScore}
          />
          <div className="text-xs text-muted-foreground">vs</div>
        </div>

        {/* Away Team */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="text-right">
            <div className="font-medium">{fixture.awayTeam.name}</div>
            <div className="text-xs text-muted-foreground">
              {fixture.awayTeam.shortName}
            </div>
          </div>
          {fixture.awayTeam.logo ? (
            <img
              src={fixture.awayTeam.logo}
              alt={fixture.awayTeam.name}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
              {fixture.awayTeam.shortName?.charAt(0) || fixture.awayTeam.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatFixtureDate(fixture.kickoff)}</span>
          </div>
          {fixture.venue && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{fixture.venue}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {fixture.round && (
            <span className="rounded bg-muted px-2 py-0.5">{fixture.round}</span>
          )}
          <LineupIndicator hasLineups={fixture.hasLineups} />
        </div>
      </div>
    </button>
  )
}

/**
 * TournamentFixtureList - Displays all fixtures for a selected tournament
 * 
 * Requirements:
 * - 3.1: Display list of all fixtures for a tournament
 * - 3.2: Show home team, away team, date/time, venue, and match status
 * - 3.3: Indicate which fixtures have lineups configured
 * - 3.4: Load match into current state when clicked
 * - 5.1: Provide option to create new fixture
 * - 6.1-6.5: Show status badges (Draft, Ready, Live, Completed, Abandoned)
 */
export function TournamentFixtureList({
  tournamentId,
  onSelectFixture,
  onCreateFixture,
  refreshKey = 0,
}: TournamentFixtureListProps) {
  const [fixtures, setFixtures] = useState<FixtureListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load fixtures on mount, when tournamentId changes, or when refreshKey changes
  // Requirements: 3.1, 5.4 (refresh after creation)
  useEffect(() => {
    async function loadFixtures() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getTournamentFixtures(tournamentId)
        setFixtures(data)
      } catch (err) {
        console.error("Failed to load fixtures:", err)
        setError("Failed to load fixtures. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (tournamentId) {
      loadFixtures()
    }
  }, [tournamentId, refreshKey])

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <FixtureListSkeleton />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            setIsLoading(true)
            getTournamentFixtures(tournamentId)
              .then(setFixtures)
              .catch(() => setError("Failed to load fixtures"))
              .finally(() => setIsLoading(false))
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Fixture button - Requirements: 5.1 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Fixtures ({fixtures.length})
        </h3>
        <Button onClick={onCreateFixture} size="sm">
          <Plus className="h-4 w-4" />
          Add Fixture
        </Button>
      </div>

      {/* Fixture List */}
      {fixtures.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No fixtures yet</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onCreateFixture}
          >
            <Plus className="h-4 w-4" />
            Create First Fixture
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {fixtures.map((fixture) => (
            <FixtureListItem
              key={fixture.id}
              fixture={fixture}
              onSelect={() => onSelectFixture(fixture.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Export components and utilities for testing
export { FixtureListSkeleton, FixtureListItem as FixtureListItemComponent }
