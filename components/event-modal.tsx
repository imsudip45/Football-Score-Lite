"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAppStore } from "@/lib/store"
import { useGraphicsStore } from "@/lib/graphics-store"
import { toast } from "sonner"
import type { MatchEvent } from "@/lib/types"
import { formatEventTime } from "@/lib/utils"
import { Plus, X } from "lucide-react"

interface SubstitutionPair {
  id: string
  playerOffId: string
  playerOnId: string
}

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventType: MatchEvent["type"]
  capturedMatchTime?: number // Time captured when event button was clicked
  preSelectedTeam?: 'home' | 'away' | null // Pre-selected team for goal events
}

export function EventModal({ open, onOpenChange, eventType, capturedMatchTime, preSelectedTeam }: EventModalProps) {
  const { currentMatch, addEvent, matchTime, updateMatch, setGoalData, setCardData, setSubData, settings } = useAppStore()
  const { toggleGoal, toggleCard, toggleSubstitution } = useGraphicsStore()
  const [team, setTeam] = useState<"home" | "away">(preSelectedTeam || "home")
  const [playerId, setPlayerId] = useState<string>("")
  const [secondPlayerId, setSecondPlayerId] = useState<string>("")
  const [note, setNote] = useState("")
  const [addedMinutes, setAddedMinutes] = useState(0)
  
  // Multiple substitutions support
  const [substitutions, setSubstitutions] = useState<SubstitutionPair[]>([
    { id: '1', playerOffId: '', playerOnId: '' }
  ])

  // Update team when preSelectedTeam changes (for goal events)
  useEffect(() => {
    if (preSelectedTeam) {
      setTeam(preSelectedTeam)
    }
  }, [preSelectedTeam, open])
  
  // Reset substitutions when modal opens
  useEffect(() => {
    if (open && eventType === 'sub') {
      setSubstitutions([{ id: '1', playerOffId: '', playerOnId: '' }])
    }
  }, [open, eventType])

  // Use captured time if provided, otherwise use current matchTime
  const timeToUse = capturedMatchTime !== undefined ? capturedMatchTime : matchTime
  const minute = Math.floor(timeToUse / 60)
  const second = timeToUse % 60
  const selectedTeam = team === "home" ? currentMatch?.homeTeam : currentMatch?.awayTeam
  const players = selectedTeam?.players || []
  
  // For substitutions, get lineup and bench players
  const lineupPlayers = team === "home" 
    ? currentMatch?.homeLineup?.map(lp => lp.player) || []
    : currentMatch?.awayLineup?.map(lp => lp.player) || []
  const benchPlayers = team === "home"
    ? currentMatch?.homeBench?.map(lp => lp.player) || []
    : currentMatch?.awayBench?.map(lp => lp.player) || []

  const handleSubmit = () => {
    // Validate match exists
    if (!currentMatch) {
      toast.error("No match loaded")
      return
    }
    
    const player = players.find((p) => p.id === playerId)
    const secondPlayer = players.find((p) => p.id === secondPlayerId)
    
    const event: MatchEvent = {
      id: `event-${Date.now()}`,
      type: eventType,
      team,
      minute,
      second,
      player,
      secondPlayer,
      note: note || undefined,
      stoppageMinute: eventType === "added-time" ? addedMinutes : undefined,
      timestamp: new Date(),
    }

    addEvent(event)
    
    // Update score and show graphics for goal events
    // Note: Score is already updated via spinner, so we only update status and show graphics
    if (eventType === "goal" || eventType === "penalty-goal") {
      if (!player) {
        toast.error("Select a player for the goal")
        return
      }
      // Only update status (score already incremented via spinner)
      updateMatch({ status: 'live' })
      
      // Set goal data and show graphic
      setGoalData({
        playerName: player.name || '',
        playerNumber: String(player.number || ''),
        goalTime: formatEventTime(event, settings.timeFormat),
        isPenalty: eventType === "penalty-goal",
        isOwnGoal: false,
        teamColor: selectedTeam?.primaryColor || '#c8102e',
        team,
      })
      toggleGoal(true)
      setTimeout(() => toggleGoal(false), 5000) // Auto-hide after 5s
      
      toast.success(`Goal! ${player.name || 'Unknown'} - ${selectedTeam?.shortName || 'Team'}`)
    } else if (eventType === "own-goal") {
      if (!player) {
        toast.error("Select a player for the own goal")
        return
      }
      // Own goal adds to the opposing team - this still needs score update
      const scoreKey = team === "home" ? "awayScore" : "homeScore"
      const currentScore = currentMatch[scoreKey] || 0
      updateMatch({ [scoreKey]: currentScore + 1, status: 'live' })
      
      // Set goal data and show graphic
      setGoalData({
        playerName: player.name || '',
        playerNumber: String(player.number || ''),
        goalTime: formatEventTime(event, settings.timeFormat),
        isPenalty: false,
        isOwnGoal: true,
        teamColor: selectedTeam?.primaryColor || '#c8102e',
        team,
      })
      toggleGoal(true)
      setTimeout(() => toggleGoal(false), 5000)
      
      toast.success(`Own Goal by ${player.name || 'Unknown'}`)
    } else if (eventType === "penalty-miss") {
      // Penalty miss - no score change, just record the event
      toast.info(`Penalty Missed - ${player?.name || 'Unknown'}`)
    } else if (eventType === "yellow") {
      if (!player) {
        toast.error("Select a player for the card")
        return
      }
      // Auto-increment fouls when card is given
      const foulsKey = team === "home" ? "homeFouls" : "awayFouls"
      const currentFouls = currentMatch[foulsKey] || 0
      updateMatch({ [foulsKey]: currentFouls + 1 })
      
      // Set card data and show graphic
      setCardData({
        playerName: player.name || '',
        playerNumber: String(player.number || ''),
        cardTime: formatEventTime(event, settings.timeFormat),
        cardType: 'yellow',
        teamColor: selectedTeam?.primaryColor || '#c8102e',
        team,
      })
      toggleCard(true)
      setTimeout(() => toggleCard(false), 4000)
      
      toast.success(`Yellow Card - ${player.name || 'Unknown'}`)
    } else if (eventType === "red" || eventType === "second-yellow") {
      if (!player) {
        toast.error("Select a player for the card")
        return
      }
      // Auto-increment fouls when card is given
      const foulsKey = team === "home" ? "homeFouls" : "awayFouls"
      const currentFouls = currentMatch[foulsKey] || 0
      updateMatch({ [foulsKey]: currentFouls + 1 })
      
      // Set card data and show graphic
      setCardData({
        playerName: player.name || '',
        playerNumber: String(player.number || ''),
        cardTime: formatEventTime(event, settings.timeFormat),
        cardType: 'red',
        teamColor: selectedTeam?.primaryColor || '#c8102e',
        team,
      })
      toggleCard(true)
      setTimeout(() => toggleCard(false), 4000)
      
      toast.success(`${eventType === 'second-yellow' ? 'Second Yellow (Red)' : 'Red Card'} - ${player.name || 'Unknown'}`)
    } else if (eventType === "sub") {
      // Validate match exists for substitution
      if (!currentMatch) {
        toast.error("No match loaded")
        return
      }
      // Handle multiple substitutions
      const lineupKey = team === "home" ? "homeLineup" : "awayLineup"
      const benchKey = team === "home" ? "homeBench" : "awayBench"
      let currentLineup = [...(currentMatch[lineupKey] || [])]
      let currentBench = [...(currentMatch[benchKey] || [])]
      
      // Process each substitution
      for (const sub of substitutions) {
        if (!sub.playerOffId || !sub.playerOnId) continue
        
        const playerOff = players.find((p) => p.id === sub.playerOffId)
        const playerOn = players.find((p) => p.id === sub.playerOnId)
        
        if (playerOff && playerOn) {
          // Create event for this substitution
          const subEvent: MatchEvent = {
            id: `event-${Date.now()}-${sub.id}`,
            type: 'sub',
            team,
            minute,
            second,
            player: playerOff,
            secondPlayer: playerOn,
            timestamp: new Date(),
          }
          addEvent(subEvent)
          
          // Find and swap players
          const lineupIndex = currentLineup.findIndex(lp => lp.player.id === playerOff.id)
          const benchIndex = currentBench.findIndex(lp => lp.player.id === playerOn.id)
          
          if (lineupIndex !== -1 && benchIndex !== -1) {
            const playerOffPosition = currentLineup[lineupIndex].position
            // Move player off to bench
            currentBench.push({ player: playerOff, position: currentBench.length + 12 })
            currentLineup.splice(lineupIndex, 1)
            // Move player on to lineup
            currentLineup.push({ player: playerOn, position: playerOffPosition })
            currentBench.splice(benchIndex, 1)
          }
          
          // Show graphic for first substitution only
          if (sub === substitutions[0]) {
            setSubData({
              playerOut: playerOff?.name || '',
              numberOut: String(playerOff?.number || ''),
              playerIn: playerOn?.name || '',
              numberIn: String(playerOn?.number || ''),
              teamColor: selectedTeam?.primaryColor || '#c8102e',
              team,
            })
            toggleSubstitution(true)
            setTimeout(() => toggleSubstitution(false), 5000)
          }
          
          toast.success(`Substitution: ${playerOn?.name} ON, ${playerOff?.name} OFF`)
        }
      }
      
      // Update lineup and bench
      updateMatch({
        [lineupKey]: currentLineup,
        [benchKey]: currentBench
      })
    } else if (eventType === "kickoff") {
      const period = currentMatch?.period
      updateMatch({ status: 'live', period: period === 'pre' ? '1st' : period === 'ht' ? '2nd' : period })
      toast.success('Match Started!')
    } else if (eventType === "halftime") {
      updateMatch({ period: 'ht' })
      toast.info('Half Time')
    } else if (eventType === "fulltime") {
      updateMatch({ period: 'ft', status: 'completed' })
      toast.success('Full Time!')
    } else if (eventType === "added-time") {
      updateMatch({ stoppageTime: addedMinutes })
      toast.info(`${addedMinutes} minutes added time`)
    }
    
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setTeam("home")
    setPlayerId("")
    setSecondPlayerId("")
    setNote("")
    setAddedMinutes(0)
    setSubstitutions([{ id: '1', playerOffId: '', playerOnId: '' }])
  }

  const getTitle = () => {
    switch (eventType) {
      case "goal":
        return "Record Goal"
      case "own-goal":
        return "Record Own Goal"
      case "penalty-goal":
        return "Penalty Goal"
      case "penalty-miss":
        return "Penalty Missed"
      case "yellow":
        return "Yellow Card"
      case "red":
        return "Red Card"
      case "second-yellow":
        return "Second Yellow Card"
      case "sub":
        return "Substitution"
      case "kickoff":
        return "Kick Off"
      case "halftime":
        return "Half Time"
      case "fulltime":
        return "Full Time"
      case "added-time":
        return "Added Time"
      default:
        return "Add Event"
    }
  }

  const needsPlayer = ["goal", "own-goal", "penalty-goal", "penalty-miss", "yellow", "red", "second-yellow", "sub"].includes(eventType)
  const needsSecondPlayer = eventType === "sub"
  const needsAddedTime = eventType === "added-time"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Time display in MM:SS format */}
          <div className="flex items-center justify-center rounded-lg bg-secondary p-3">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {minute.toString().padStart(2, '0')}:{second.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Team selector */}
          <div className="space-y-2">
            <Label>Team</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={team === "home" ? "default" : "outline"}
                className={team === "home" ? "bg-primary text-primary-foreground" : "bg-transparent"}
                onClick={() => setTeam("home")}
              >
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentMatch?.homeTeam.primaryColor }}
                />
                {currentMatch?.homeTeam.shortName}
              </Button>
              <Button
                type="button"
                variant={team === "away" ? "default" : "outline"}
                className={team === "away" ? "bg-primary text-primary-foreground" : "bg-transparent"}
                onClick={() => setTeam("away")}
              >
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentMatch?.awayTeam.primaryColor }}
                />
                {currentMatch?.awayTeam.shortName}
              </Button>
            </div>
          </div>

          {/* Player selector */}
          {needsPlayer && eventType !== "sub" && (
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <span className="font-mono mr-2">{player.number}</span>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Multiple substitutions UI */}
          {eventType === "sub" && (
            <div className="space-y-3">
              {substitutions.map((sub, index) => {
                // Get available players (exclude already selected ones)
                const selectedOffIds = substitutions.filter(s => s.id !== sub.id).map(s => s.playerOffId).filter(Boolean)
                const selectedOnIds = substitutions.filter(s => s.id !== sub.id).map(s => s.playerOnId).filter(Boolean)
                const availableLineup = lineupPlayers.filter(p => !selectedOffIds.includes(p.id))
                const availableBench = benchPlayers.filter(p => !selectedOnIds.includes(p.id))
                
                return (
                  <div key={sub.id} className="p-3 bg-secondary/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Substitution {index + 1}</span>
                      {substitutions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => setSubstitutions(prev => prev.filter(s => s.id !== sub.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Player Off</Label>
                        <Select 
                          value={sub.playerOffId} 
                          onValueChange={(value) => {
                            setSubstitutions(prev => prev.map(s => 
                              s.id === sub.id ? { ...s, playerOffId: value } : s
                            ))
                          }}
                        >
                          <SelectTrigger className="bg-input h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLineup.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                <span className="font-mono mr-1">{player.number}</span>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Player On</Label>
                        <Select 
                          value={sub.playerOnId} 
                          onValueChange={(value) => {
                            setSubstitutions(prev => prev.map(s => 
                              s.id === sub.id ? { ...s, playerOnId: value } : s
                            ))
                          }}
                        >
                          <SelectTrigger className="bg-input h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBench.length > 0 ? availableBench.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                <span className="font-mono mr-1">{player.number}</span>
                                {player.name}
                              </SelectItem>
                            )) : (
                              <SelectItem value="no-bench" disabled>No players</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Add more substitution button */}
              {substitutions.length < 5 && benchPlayers.length > substitutions.length && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent border-dashed"
                  onClick={() => setSubstitutions(prev => [...prev, { 
                    id: String(Date.now()), 
                    playerOffId: '', 
                    playerOnId: '' 
                  }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Substitution
                </Button>
              )}
              
              {benchPlayers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">No bench players available.</p>
              )}
            </div>
          )}

          {/* Added time input */}
          {needsAddedTime && (
            <div className="space-y-2">
              <Label>Minutes to Add</Label>
              <Input
                type="number"
                min={0}
                max={15}
                value={addedMinutes}
                onChange={(e) => setAddedMinutes(Number.parseInt(e.target.value) || 0)}
                className="bg-input"
              />
            </div>
          )}

          {/* Note - not shown for substitutions */}
          {eventType !== "sub" && (
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="bg-input resize-none"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Add Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
