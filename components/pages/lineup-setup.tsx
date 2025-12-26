"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, ChevronRight, ChevronLeft, Check, AlertCircle, 
  UserPlus, UserMinus, Star, Loader2, ArrowRight, Save, Gamepad2
} from "lucide-react"
import { toast } from "sonner"
import type { Team, Player, LineupPlayer, Match, FormationType, Official } from "@/lib/types"
import * as db from "@/lib/database"
import { getFormationNames } from "@/lib/formations"

export function LineupSetup() {
  const { 
    currentMatch, 
    updateMatch, 
    setCurrentMatch,
    setCurrentPage,
    sportType,
    getSportConfig,
    completeWorkflowStep,
    selectedTournamentId,
    setSelectedTournament
  } = useAppStore()

  const sportConfig = getSportConfig()
  const maxLineup = sportConfig.maxLineupSize
  const maxSubs = sportType === 'futsal' ? 9 : 7

  const [fixtures, setFixtures] = useState<Match[]>([])
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>(currentMatch?.id || "")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"home" | "away">("home")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Officials (assign 4 required roles during match setup)
  const [availableOfficials, setAvailableOfficials] = useState<Official[]>([])
  const [matchOfficials, setMatchOfficials] = useState<Official[]>([])

  // Lineup states - players selected for starting 11 and subs
  const [homeLineup, setHomeLineup] = useState<Player[]>([])
  const [homeSubs, setHomeSubs] = useState<Player[]>([])
  const [awayLineup, setAwayLineup] = useState<Player[]>([])
  const [awaySubs, setAwaySubs] = useState<Player[]>([])

  // Formation states
  const [homeFormation, setHomeFormation] = useState<FormationType | "">("")
  const [awayFormation, setAwayFormation] = useState<FormationType | "">("")

  // Get available formations for current sport
  const availableFormations = getFormationNames(sportType || 'football')

  // Debounce timer ref for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get selected fixture
  const selectedFixture = fixtures.find(f => f.id === selectedFixtureId)
  const homeTeam = selectedFixture?.homeTeam
  const awayTeam = selectedFixture?.awayTeam

  // Load fixtures on mount
  useEffect(() => {
    loadFixtures()
  }, [selectedTournamentId])

  // Load available officials for the selected tournament
  useEffect(() => {
    loadOfficials()
  }, [selectedTournamentId])

  // Initialize lineups when fixture is selected
  useEffect(() => {
    if (selectedFixture) {
      // Set as current match
      setCurrentMatch(selectedFixture)
      
      // Initialize lineups from fixture data
      setHomeLineup(selectedFixture.homeLineup?.map(lp => lp.player) || [])
      setHomeSubs(selectedFixture.homeBench?.map(lp => lp.player) || [])
      setAwayLineup(selectedFixture.awayLineup?.map(lp => lp.player) || [])
      setAwaySubs(selectedFixture.awayBench?.map(lp => lp.player) || [])
      
      // Initialize formations from fixture data
      setHomeFormation(selectedFixture.homeFormation || "")
      setAwayFormation(selectedFixture.awayFormation || "")

      // Initialize officials from fixture data
      setMatchOfficials(selectedFixture.officials || [])
    }
  }, [selectedFixtureId, selectedFixture])

  const loadFixtures = async () => {
    setLoading(true)
    try {
      // First get tournaments to ensure we have a selected one
      const dbTournaments = await db.getTournaments()
      let tournamentId = selectedTournamentId
      
      // Auto-select latest tournament if none selected
      if (dbTournaments.length > 0 && !selectedTournamentId) {
        tournamentId = dbTournaments[0].id
        setSelectedTournament(tournamentId)
      }
      
      const dbMatches = await db.getMatches(tournamentId || undefined)
      // Only show draft fixtures (not started yet)
      const draftFixtures = dbMatches.filter(m => m.status === 'draft')
      setFixtures(draftFixtures)
      
      // Auto-select current match if it exists in fixtures
      if (currentMatch && draftFixtures.find(f => f.id === currentMatch.id)) {
        setSelectedFixtureId(currentMatch.id)
      } else if (draftFixtures.length === 1) {
        // Auto-select if only one fixture
        setSelectedFixtureId(draftFixtures[0].id)
      }
    } catch (error) {
      console.error("Error loading fixtures:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadOfficials = async () => {
    try {
      const dbOfficials = await db.getOfficials(selectedTournamentId || undefined)
      setAvailableOfficials(dbOfficials)
    } catch (error) {
      console.error("Error loading officials:", error)
      setAvailableOfficials([])
    }
  }

  // Auto-save lineup changes to database
  const saveLineupToDatabase = useCallback(async () => {
    if (!selectedFixture || !homeTeam || !awayTeam) return

    setIsSaving(true)
    try {
      // Convert to LineupPlayer format
      const homeLineupFormatted: LineupPlayer[] = homeLineup.map((p, i) => ({ player: p, position: i + 1 }))
      const homeBenchFormatted: LineupPlayer[] = homeSubs.map((p, i) => ({ player: p, position: i + maxLineup + 1 }))
      const awayLineupFormatted: LineupPlayer[] = awayLineup.map((p, i) => ({ player: p, position: i + 1 }))
      const awayBenchFormatted: LineupPlayer[] = awaySubs.map((p, i) => ({ player: p, position: i + maxLineup + 1 }))

      // Check if lineups are complete - keep status as draft until match starts
      const newStatus = selectedFixture.status || 'draft'

      // Save to database
      await db.saveMatchState({
        ...selectedFixture,
        homeLineup: homeLineupFormatted,
        homeBench: homeBenchFormatted,
        awayLineup: awayLineupFormatted,
        awayBench: awayBenchFormatted,
        homeFormation: homeFormation || undefined,
        awayFormation: awayFormation || undefined,
        officials: matchOfficials,
        status: newStatus,
      } as Match)

      // Update store
      updateMatch({
        homeLineup: homeLineupFormatted,
        homeBench: homeBenchFormatted,
        awayLineup: awayLineupFormatted,
        awayBench: awayBenchFormatted,
        homeFormation: homeFormation || undefined,
        awayFormation: awayFormation || undefined,
        officials: matchOfficials,
        status: newStatus,
      })

      setLastSaved(new Date())
    } catch (error) {
      console.error("Error auto-saving lineup:", error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedFixture, homeTeam, awayTeam, homeLineup, homeSubs, awayLineup, awaySubs, homeFormation, awayFormation, matchOfficials, maxLineup, updateMatch])

  // Debounced auto-save function
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveLineupToDatabase()
    }, 500)
  }, [saveLineupToDatabase])

  // Trigger auto-save when lineup changes
  useEffect(() => {
    if (selectedFixture && (homeLineup.length > 0 || awayLineup.length > 0 || homeFormation || awayFormation || matchOfficials.length > 0)) {
      triggerAutoSave()
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [homeLineup, homeSubs, awayLineup, awaySubs, homeFormation, awayFormation, matchOfficials, triggerAutoSave, selectedFixture])

  const roleLabels: Record<Official["role"], string> = {
    referee: "Referee",
    ar1: "Assistant Referee 1",
    ar2: "Assistant Referee 2",
    fourth: "4th Official",
  }

  const getAssignedOfficial = (role: Official["role"]) => matchOfficials.find((o) => o.role === role)

  const handleAssignOfficial = (role: Official["role"], officialId: string) => {
    const base = availableOfficials.find((o) => o.id === officialId)
    if (!base) return

    // Remove any previous assignment for this role, then set the new one.
    const next: Official[] = [
      ...matchOfficials.filter((o) => o.role !== role),
      { ...base, role },
    ]

    setMatchOfficials(next)
    updateMatch({ officials: next })
    triggerAutoSave()
  }

  const handleClearOfficial = (role: Official["role"]) => {
    const next = matchOfficials.filter((o) => o.role !== role)
    setMatchOfficials(next)
    updateMatch({ officials: next })
    triggerAutoSave()
  }

  // Get available players (not in lineup or subs)
  const getAvailablePlayers = (team: Team | undefined, lineup: Player[], subs: Player[]) => {
    if (!team) return []
    const selectedIds = new Set([...lineup.map(p => p.id), ...subs.map(p => p.id)])
    return team.players.filter(p => !selectedIds.has(p.id))
  }

  const homeAvailable = getAvailablePlayers(homeTeam, homeLineup, homeSubs)
  const awayAvailable = getAvailablePlayers(awayTeam, awayLineup, awaySubs)

  // Add player to lineup
  const addToLineup = (player: Player, side: "home" | "away") => {
    const team = side === "home" ? homeTeam : awayTeam
    const currentLineup = side === "home" ? homeLineup : awayLineup
    const currentSubs = side === "home" ? homeSubs : awaySubs
    
    if (currentLineup.length >= maxLineup) {
      toast.error(`Maximum ${maxLineup} players in starting lineup`)
      return
    }

    const newLineup = [...currentLineup, player]
    
    // Check if lineup is now full - auto-move remaining available to subs
    if (newLineup.length === maxLineup && team) {
      const selectedIds = new Set([...newLineup.map(p => p.id), ...currentSubs.map(p => p.id)])
      const remainingAvailable = team.players.filter(p => !selectedIds.has(p.id))
      
      if (remainingAvailable.length > 0) {
        const toAddToSubs = remainingAvailable.slice(0, maxSubs - currentSubs.length)
        if (side === "home") {
          setHomeLineup(newLineup)
          setHomeSubs(prev => [...prev, ...toAddToSubs])
        } else {
          setAwayLineup(newLineup)
          setAwaySubs(prev => [...prev, ...toAddToSubs])
        }
        if (toAddToSubs.length > 0) {
          toast.success(`Lineup complete! ${toAddToSubs.length} remaining players added to substitutes`)
        }
        return
      }
    }

    if (side === "home") {
      setHomeLineup(newLineup)
    } else {
      setAwayLineup(newLineup)
    }
  }

  // Add player to subs
  const addToSubs = (player: Player, side: "home" | "away") => {
    if (side === "home") {
      if (homeSubs.length >= maxSubs) {
        toast.error(`Maximum ${maxSubs} substitutes allowed`)
        return
      }
      setHomeSubs(prev => [...prev, player])
    } else {
      if (awaySubs.length >= maxSubs) {
        toast.error(`Maximum ${maxSubs} substitutes allowed`)
        return
      }
      setAwaySubs(prev => [...prev, player])
    }
  }

  // Remove from lineup - moves player to subs
  const removeFromLineup = (playerId: string, side: "home" | "away") => {
    const lineup = side === "home" ? homeLineup : awayLineup
    const player = lineup.find(p => p.id === playerId)
    
    if (!player) return
    
    if (side === "home") {
      setHomeLineup(prev => prev.filter(p => p.id !== playerId))
      setHomeSubs(prev => [...prev, player])
    } else {
      setAwayLineup(prev => prev.filter(p => p.id !== playerId))
      setAwaySubs(prev => [...prev, player])
    }
  }

  // Remove from subs
  const removeFromSubs = (playerId: string, side: "home" | "away") => {
    if (side === "home") {
      setHomeSubs(prev => prev.filter(p => p.id !== playerId))
    } else {
      setAwaySubs(prev => prev.filter(p => p.id !== playerId))
    }
  }

  // Move from subs to lineup
  const moveToLineup = (playerId: string, side: "home" | "away") => {
    const lineup = side === "home" ? homeLineup : awayLineup
    const subs = side === "home" ? homeSubs : awaySubs
    const player = subs.find(p => p.id === playerId)
    
    if (!player) return
    if (lineup.length >= maxLineup) {
      toast.error(`Maximum ${maxLineup} players in starting lineup`)
      return
    }

    removeFromSubs(playerId, side)
    if (side === "home") {
      setHomeLineup(prev => [...prev, player])
    } else {
      setAwayLineup(prev => [...prev, player])
    }
  }

  // Toggle captain
  const toggleCaptain = (playerId: string, side: "home" | "away") => {
    if (side === "home") {
      setHomeLineup(prev => prev.map(p => ({
        ...p,
        isCaptain: p.id === playerId ? !p.isCaptain : false
      })))
    } else {
      setAwayLineup(prev => prev.map(p => ({
        ...p,
        isCaptain: p.id === playerId ? !p.isCaptain : false
      })))
    }
  }

  // Auto-fill lineup with first N players
  const autoFillLineup = (side: "home" | "away") => {
    const team = side === "home" ? homeTeam : awayTeam
    if (!team) return

    const available = side === "home" ? homeAvailable : awayAvailable
    const currentLineup = side === "home" ? homeLineup : awayLineup
    const currentSubs = side === "home" ? homeSubs : awaySubs
    const needed = maxLineup - currentLineup.length

    if (needed <= 0) {
      toast.info("Lineup is already full")
      return
    }

    const toAddToLineup = available.slice(0, needed)
    const remainingForSubs = available.slice(needed, needed + (maxSubs - currentSubs.length))
    
    if (side === "home") {
      setHomeLineup(prev => [...prev, ...toAddToLineup])
      if (remainingForSubs.length > 0) {
        setHomeSubs(prev => [...prev, ...remainingForSubs])
      }
    } else {
      setAwayLineup(prev => [...prev, ...toAddToLineup])
      if (remainingForSubs.length > 0) {
        setAwaySubs(prev => [...prev, ...remainingForSubs])
      }
    }
    
    toast.success(`Added ${toAddToLineup.length} to lineup${remainingForSubs.length > 0 ? `, ${remainingForSubs.length} to subs` : ''}`)
  }

  const handleContinueToLiveControl = () => {
    if (!selectedFixture) {
      toast.error("Please select a fixture first")
      return
    }
    if (homeLineup.length < maxLineup) {
      toast.error(`Home team needs ${maxLineup} players in starting lineup`)
      return
    }
    if (awayLineup.length < maxLineup) {
      toast.error(`Away team needs ${maxLineup} players in starting lineup`)
      return
    }

    completeWorkflowStep('lineupsConfigured')
    toast.success("Match setup complete! Ready to start match")
    setCurrentPage("live-control")
  }

  const renderTeamSetup = (side: "home" | "away") => {
    const team = side === "home" ? homeTeam : awayTeam
    const lineup = side === "home" ? homeLineup : awayLineup
    const subs = side === "home" ? homeSubs : awaySubs
    const available = side === "home" ? homeAvailable : awayAvailable
    const formation = side === "home" ? homeFormation : awayFormation
    const setFormation = side === "home" ? setHomeFormation : setAwayFormation

    if (!team) {
      return (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Select a fixture to set up the lineup</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {/* Team Header with Formation and Auto-fill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logo ? (
              <img src={team.logo} alt="" className="h-8 w-8 rounded object-contain bg-white p-0.5" />
            ) : (
              <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: team.primaryColor }}>
                {team.shortName.slice(0, 2)}
              </div>
            )}
            <span className="font-medium">{team.name}</span>
            <span className="text-sm text-muted-foreground">({team.players.length} players)</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Formation Select */}
            <Select value={formation} onValueChange={(v) => setFormation(v as FormationType)}>
              <SelectTrigger className="w-[140px] bg-secondary">
                <SelectValue placeholder="Formation" />
              </SelectTrigger>
              <SelectContent>
                {availableFormations.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => autoFillLineup(side)}>
              Auto-fill
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Available Players */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Available ({available.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                  {available.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">All players assigned</p>
                  ) : (
                    available.map(player => (
                      <div key={player.id} className="flex items-center gap-3 p-3 rounded bg-secondary/50 group">
                        {player.photo ? (
                          <img src={player.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {player.number}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.position} • #{player.number}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => addToLineup(player, side)}
                            disabled={lineup.length >= maxLineup}
                          >
                            <UserPlus className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => addToSubs(player, side)}
                            disabled={subs.length >= maxSubs}
                          >
                            <ChevronRight className="h-4 w-4 text-blue-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Starting Lineup */}
          <Card className="glass-card border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="text-green-500">Starting {maxLineup}</span>
                <Badge variant={lineup.length === maxLineup ? "default" : "secondary"}>
                  {lineup.length}/{maxLineup}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                  {lineup.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Add players from available list</p>
                  ) : (
                    lineup.map((player, idx) => (
                      <div key={player.id} className="flex items-center gap-3 p-3 rounded bg-green-500/10 group">
                        <span className="text-sm font-mono text-muted-foreground w-5">{idx + 1}</span>
                        {player.photo ? (
                          <img src={player.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {player.number}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1">
                            {player.name}
                            {player.isCaptain && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">{player.position} • #{player.number}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => toggleCaptain(player.id, side)}
                            title="Toggle Captain"
                          >
                            <Star className={`h-4 w-4 ${player.isCaptain ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => removeFromLineup(player.id, side)}
                            title="Move to Subs"
                          >
                            <ChevronRight className="h-4 w-4 text-blue-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Substitutes */}
          <Card className="glass-card border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="text-blue-500">Substitutes</span>
                <Badge variant="secondary">{subs.length}/{maxSubs}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                  {subs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Add substitutes</p>
                  ) : (
                    subs.map(player => (
                      <div key={player.id} className="flex items-center gap-3 p-3 rounded bg-blue-500/10 group">
                        {player.photo ? (
                          <img src={player.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {player.number}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.position} • #{player.number}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => moveToLineup(player.id, side)}
                            title="Move to Starting"
                          >
                            <ChevronLeft className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => removeFromSubs(player.id, side)}
                            title="Remove"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fixtures.length === 0) {
    return (
      <div className="mt-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gamepad2 className="h-6 w-6" /> Match Setup
          </h1>
          <p className="text-sm text-muted-foreground">Select a fixture and configure lineups</p>
        </div>
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Fixtures Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a fixture first to set up match lineups.
            </p>
            <Button onClick={() => setCurrentPage("fixtures")}>
              <Gamepad2 className="h-4 w-4 mr-2" />
              Go to Fixtures
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="h-6 w-6" /> Match Setup
            </h1>
            <Badge variant="outline" className={sportType === 'football' ? 'text-green-500 border-green-500' : 'text-orange-500 border-orange-500'}>
              {sportConfig.name} ({maxLineup}v{maxLineup})
            </Badge>
            {/* Auto-save indicator */}
            {isSaving ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </Badge>
            ) : lastSaved ? (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <Save className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">Select a fixture and configure starting lineups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentPage("fixtures")}>
            Back
          </Button>
          <Button onClick={handleContinueToLiveControl} disabled={!selectedFixture || homeLineup.length < maxLineup || awayLineup.length < maxLineup}>
            <Check className="h-4 w-4 mr-2" />
            Continue to Live Control
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Fixture Selection */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Fixture</label>
              <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId}>
                <SelectTrigger className="bg-secondary">
                  {selectedFixture ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {selectedFixture.homeTeam?.logo ? (
                          <img src={selectedFixture.homeTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                        ) : (
                          <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: selectedFixture.homeTeam?.primaryColor }}>
                            {selectedFixture.homeTeam?.shortName?.slice(0, 2)}
                          </div>
                        )}
                        <span>{selectedFixture.homeTeam?.name}</span>
                      </div>
                      <span className="text-muted-foreground">vs</span>
                      <div className="flex items-center gap-2">
                        {selectedFixture.awayTeam?.logo ? (
                          <img src={selectedFixture.awayTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                        ) : (
                          <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: selectedFixture.awayTeam?.primaryColor }}>
                            {selectedFixture.awayTeam?.shortName?.slice(0, 2)}
                          </div>
                        )}
                        <span>{selectedFixture.awayTeam?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a fixture...</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {fixtures.map((fixture) => (
                      <SelectItem key={fixture.id} value={fixture.id}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {fixture.homeTeam?.logo ? (
                              <img src={fixture.homeTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                            ) : (
                              <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: fixture.homeTeam?.primaryColor }}>
                                {fixture.homeTeam?.shortName?.slice(0, 2)}
                              </div>
                            )}
                            <span>{fixture.homeTeam?.name}</span>
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className="flex items-center gap-2">
                            {fixture.awayTeam?.logo ? (
                              <img src={fixture.awayTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                            ) : (
                              <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: fixture.awayTeam?.primaryColor }}>
                                {fixture.awayTeam?.shortName?.slice(0, 2)}
                              </div>
                            )}
                            <span>{fixture.awayTeam?.name}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Officials Selection (4 required roles) */}
      {selectedFixture && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Match Officials</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  "referee",
                  "ar1",
                  "ar2",
                  "fourth",
                ] as const
              ).map((role) => {
                const assigned = getAssignedOfficial(role)
                const usedIds = new Set(matchOfficials.filter((o) => o.role !== role).map((o) => o.id))

                return (
                  <div key={role} className="space-y-1">
                    <label className="text-sm font-medium block">{roleLabels[role]}</label>
                    <div className="flex gap-2">
                      <Select
                        value={assigned?.id || ""}
                        onValueChange={(id) => handleAssignOfficial(role, id)}
                      >
                        <SelectTrigger className="bg-secondary flex-1">
                          <SelectValue placeholder="Select official..." />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-[220px]">
                            {availableOfficials.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No officials found. Add officials in the Officials page.
                              </div>
                            ) : (
                              availableOfficials
                                .filter((o) => !usedIds.has(o.id))
                                .map((o) => (
                                  <SelectItem key={o.id} value={o.id}>
                                    {o.name}
                                  </SelectItem>
                                ))
                            )}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleClearOfficial(role)}
                        disabled={!assigned}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Tabs - only show if fixture is selected */}
      {selectedFixture && (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "home" | "away")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="home" className="gap-2">
                {homeTeam && (
                  homeTeam.logo ? (
                    <img src={homeTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                  ) : (
                    <div className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: homeTeam.primaryColor }}>
                      {homeTeam.shortName.slice(0, 2)}
                    </div>
                  )
                )}
                Home Team
                {homeLineup.length === maxLineup && <Check className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="away" className="gap-2">
                {awayTeam && (
                  awayTeam.logo ? (
                    <img src={awayTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" />
                  ) : (
                    <div className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: awayTeam.primaryColor }}>
                      {awayTeam.shortName.slice(0, 2)}
                    </div>
                  )
                )}
                Away Team
                {awayLineup.length === maxLineup && <Check className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="home" className="mt-4">
              {renderTeamSetup("home")}
            </TabsContent>

            <TabsContent value="away" className="mt-4">
              {renderTeamSetup("away")}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
