"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Calendar, MapPin, Trophy, Users } from "lucide-react"
import { toast } from "sonner"
import type { Team, Match } from "@/lib/types"
import * as db from "@/lib/database"

/**
 * Props for the FixtureCreationDialog component
 * Requirements: 5.1, 5.2, 5.3
 */
export interface FixtureCreationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** The tournament ID to associate the fixture with */
  tournamentId: string
  /** Tournament name for display */
  tournamentName: string
  /** Callback when fixture is created successfully */
  onFixtureCreated: (matchId: string) => void
}

/**
 * Form data for fixture creation
 */
interface FixtureFormData {
  homeTeamId: string
  awayTeamId: string
  kickoffDate: string
  kickoffTime: string
  venue: string
  round: string
}

/**
 * Initial form state
 */
const initialFormData: FixtureFormData = {
  homeTeamId: "",
  awayTeamId: "",
  kickoffDate: new Date().toISOString().split("T")[0],
  kickoffTime: "15:00",
  venue: "",
  round: "",
}

/**
 * Round options for fixture creation
 */
const roundOptions = [
  "Matchday 1",
  "Matchday 2",
  "Matchday 3",
  "Group Stage",
  "Round of 16",
  "Quarter-Final",
  "Semi-Final",
  "Third Place",
  "Final",
]


/**
 * FixtureCreationDialog - Dialog for creating new fixtures in a tournament
 * 
 * Requirements:
 * - 5.1: Provide option to create new fixture when viewing tournament fixtures
 * - 5.2: Allow selecting home and away teams from tournament's team list
 * - 5.3: Allow setting date, time, venue, and round information
 * - 5.4: Save fixture to IndexedDB with status 'draft'
 * - 5.5: Associate fixture with selected tournament
 */
export function FixtureCreationDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  onFixtureCreated,
}: FixtureCreationDialogProps) {
  const [formData, setFormData] = useState<FixtureFormData>(initialFormData)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FixtureFormData, string>>>({})

  // Load teams for the tournament when dialog opens
  // Requirements: 5.2 - Teams from tournament's team list
  useEffect(() => {
    if (open && tournamentId) {
      loadTeams()
    }
  }, [open, tournamentId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData)
      setErrors({})
    }
  }, [open])

  const loadTeams = async () => {
    setIsLoading(true)
    try {
      // Load teams associated with the tournament
      const tournamentTeams = await db.getTeams(tournamentId)
      if (tournamentTeams.length > 0) {
        setTeams(tournamentTeams)
      } else {
        // Fallback to all teams if no tournament-specific teams
        const allTeams = await db.getTeams()
        setTeams(allTeams)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
      toast.error("Failed to load teams")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormField = <K extends keyof FixtureFormData>(
    field: K,
    value: FixtureFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FixtureFormData, string>> = {}

    if (!formData.homeTeamId) {
      newErrors.homeTeamId = "Home team is required"
    }
    if (!formData.awayTeamId) {
      newErrors.awayTeamId = "Away team is required"
    }
    if (formData.homeTeamId && formData.homeTeamId === formData.awayTeamId) {
      newErrors.awayTeamId = "Away team must be different from home team"
    }
    if (!formData.kickoffDate) {
      newErrors.kickoffDate = "Date is required"
    }
    if (!formData.kickoffTime) {
      newErrors.kickoffTime = "Time is required"
    }
    if (!formData.venue.trim()) {
      newErrors.venue = "Venue is required"
    }
    if (!formData.round) {
      newErrors.round = "Round is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle fixture creation
   * Requirements: 5.4, 5.5
   */
  const handleCreate = async () => {
    if (!validate()) {
      toast.error("Please fix the validation errors")
      return
    }

    setIsSaving(true)
    try {
      const homeTeam = teams.find((t) => t.id === formData.homeTeamId)
      const awayTeam = teams.find((t) => t.id === formData.awayTeamId)

      if (!homeTeam || !awayTeam) {
        toast.error("Selected teams not found")
        return
      }

      // Create kickoff date from date and time inputs
      const kickoff = new Date(`${formData.kickoffDate}T${formData.kickoffTime}:00`)

      // Generate unique match ID
      const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create match object with status 'draft' (Requirements 5.4)
      const match: Match = {
        id: matchId,
        tournamentId: tournamentId, // Requirements 5.5 - Associate with tournament
        competition: tournamentName,
        round: formData.round,
        venue: formData.venue,
        kickoff,
        homeTeam,
        awayTeam,
        homeScore: 0,
        awayScore: 0,
        homeFouls: 0,
        awayFouls: 0,
        homeShots: 0,
        awayShots: 0,
        homeShotsOnTarget: 0,
        awayShotsOnTarget: 0,
        homePossession: 50,
        awayPossession: 50,
        homeOffsides: 0,
        awayOffsides: 0,
        homeCorners: 0,
        awayCorners: 0,
        period: "pre",
        periodLength: 45,
        stoppageTime: 0,
        extraTimeVisible: false,
        extraTimeEnabled: false,
        penaltiesEnabled: false,
        penalties: [],
        homePenaltyScore: 0,
        awayPenaltyScore: 0,
        homeLineup: [],
        awayLineup: [],
        homeBench: [],
        awayBench: [],
        officials: [],
        events: [],
        status: "draft", // Requirements 5.4 - Status 'draft'
      }

      // Save to database (Requirements 5.4)
      await db.createMatch(match)

      toast.success("Fixture created successfully")
      onFixtureCreated(matchId)
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating fixture:", error)
      toast.error("Failed to create fixture")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Create New Fixture
          </DialogTitle>
          <DialogDescription>
            Add a new fixture to {tournamentName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading teams...</span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Team Selection - Requirements 5.2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Home Team */}
              <div className="space-y-2">
                <Label htmlFor="homeTeam" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Home Team
                </Label>
                <Select
                  value={formData.homeTeamId}
                  onValueChange={(val) => updateFormField("homeTeamId", val)}
                >
                  <SelectTrigger
                    id="homeTeam"
                    className={errors.homeTeamId ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="h-4 w-4 object-contain"
                            />
                          ) : (
                            <div
                              className="h-4 w-4 rounded"
                              style={{ backgroundColor: team.primaryColor }}
                            />
                          )}
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.homeTeamId && (
                  <p className="text-xs text-destructive">{errors.homeTeamId}</p>
                )}
              </div>

              {/* Away Team */}
              <div className="space-y-2">
                <Label htmlFor="awayTeam" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Away Team
                </Label>
                <Select
                  value={formData.awayTeamId}
                  onValueChange={(val) => updateFormField("awayTeamId", val)}
                >
                  <SelectTrigger
                    id="awayTeam"
                    className={errors.awayTeamId ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((t) => t.id !== formData.homeTeamId)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.logo ? (
                              <img
                                src={team.logo}
                                alt={team.name}
                                className="h-4 w-4 object-contain"
                              />
                            ) : (
                              <div
                                className="h-4 w-4 rounded"
                                style={{ backgroundColor: team.primaryColor }}
                              />
                            )}
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.awayTeamId && (
                  <p className="text-xs text-destructive">{errors.awayTeamId}</p>
                )}
              </div>
            </div>

            {/* Date and Time - Requirements 5.3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kickoffDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date
                </Label>
                <Input
                  id="kickoffDate"
                  type="date"
                  value={formData.kickoffDate}
                  onChange={(e) => updateFormField("kickoffDate", e.target.value)}
                  className={errors.kickoffDate ? "border-destructive" : ""}
                />
                {errors.kickoffDate && (
                  <p className="text-xs text-destructive">{errors.kickoffDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kickoffTime">Time</Label>
                <Input
                  id="kickoffTime"
                  type="time"
                  value={formData.kickoffTime}
                  onChange={(e) => updateFormField("kickoffTime", e.target.value)}
                  className={errors.kickoffTime ? "border-destructive" : ""}
                />
                {errors.kickoffTime && (
                  <p className="text-xs text-destructive">{errors.kickoffTime}</p>
                )}
              </div>
            </div>

            {/* Venue - Requirements 5.3 */}
            <div className="space-y-2">
              <Label htmlFor="venue" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Venue
              </Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => updateFormField("venue", e.target.value)}
                placeholder="e.g. Stadium Name"
                className={errors.venue ? "border-destructive" : ""}
              />
              {errors.venue && (
                <p className="text-xs text-destructive">{errors.venue}</p>
              )}
            </div>

            {/* Round - Requirements 5.3 */}
            <div className="space-y-2">
              <Label htmlFor="round">Round</Label>
              <Select
                value={formData.round}
                onValueChange={(val) => updateFormField("round", val)}
              >
                <SelectTrigger
                  id="round"
                  className={errors.round ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {roundOptions.map((round) => (
                    <SelectItem key={round} value={round}>
                      {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.round && (
                <p className="text-xs text-destructive">{errors.round}</p>
              )}
            </div>

            {teams.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No teams found. Please add teams to the tournament first.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSaving || isLoading || teams.length < 2}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Fixture"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export for testing
export { roundOptions, initialFormData }
export type { FixtureFormData }
