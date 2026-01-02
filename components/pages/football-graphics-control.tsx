"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { useGraphicsStore } from "@/lib/graphics-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraphicsGroupBox } from "@/components/graphics-group-box"
import { formatEventTime } from "@/lib/utils"

import {
  Wifi, WifiOff, Play, Square, Check, ExternalLink, Copy,
  Tv, Target, ArrowLeftRight, CreditCard, Trophy, User, LayoutGrid, BarChart3,
  Radio, ListTodo, Zap, CheckCircle2, Circle, AlertCircle
} from "lucide-react"
import { getFormation } from "@/lib/formations"
import type { FormationType, Player } from "@/lib/types"
import { toast } from "sonner"
import * as db from "@/lib/database"

// Helper to get player's card status
function getPlayerCardStatus(playerId: string, events: { type: string; player?: { id: string } }[]) {
  let yellowCards = 0
  let hasRed = false
  
  for (const event of events) {
    if (event.player?.id === playerId) {
      if (event.type === 'yellow') yellowCards++
      if (event.type === 'red' || event.type === 'second-yellow') hasRed = true
    }
  }
  
  return { yellowCards, hasRed, isSentOff: hasRed || yellowCards >= 2 }
}

// Helper to check if player is substituted out
function isPlayerSubstitutedOut(playerId: string, events: { type: string; player?: { id: string } }[]) {
  return events.some(e => e.type === 'sub' && e.player?.id === playerId)
}

// Helper to get current playing 11 (accounting for subs and red cards)
function getCurrentPlaying11(
  lineup: { player: Player; position: number }[],
  bench: { player: Player; position: number }[],
  events: { type: string; team: string; player?: { id: string }; secondPlayer?: { id: string } }[],
  team: 'home' | 'away'
) {
  const teamEvents = events.filter(e => e.team === team)
  const currentPlayers: Player[] = []
  
  for (const lp of lineup) {
    const status = getPlayerCardStatus(lp.player.id, teamEvents)
    const isSubbedOut = isPlayerSubstitutedOut(lp.player.id, teamEvents)
    
    if (!status.isSentOff && !isSubbedOut) {
      currentPlayers.push(lp.player)
    }
  }
  
  for (const event of teamEvents) {
    if (event.type === 'sub' && event.secondPlayer) {
      const subPlayer = bench.find(bp => bp.player.id === event.secondPlayer?.id)?.player
      if (subPlayer) {
        const subStatus = getPlayerCardStatus(subPlayer.id, teamEvents)
        if (!subStatus.isSentOff) {
          currentPlayers.push(subPlayer)
        }
      }
    }
  }
  
  return currentPlayers
}

// GraphicsGroupBox component is now imported from @/components/graphics-group-box

export function FootballGraphicsControl() {
  const { 
    currentMatch, wsConnected, matchTime, timerRunning, setTimerRunning, setMatchTime,
    setLastPushedGraphic, goalData, cardData, subData, nameplateData,
    setGoalData, setCardData, setSubData, setNameplateData, setLineupData, setCurrentPage,
    settings, updateMatch
  } = useAppStore()

  const {
    scoreBugVisible, goalVisible, cardVisible, substitutionVisible, vsGraphicVisible, nameplateVisible, lineupVisible, matchStatsLowerThirdVisible, matchStatsFullScreenVisible,
    toggleScoreBug, toggleGoal, toggleCard, toggleSubstitution, toggleVSGraphic, toggleNameplate, toggleLineup, toggleMatchStatsLowerThird, toggleMatchStatsFullScreen,
  } = useGraphicsStore()

  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shownEventIds, setShownEventIds] = useState<Set<string>>(new Set())

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home')
  const [subTeam, setSubTeam] = useState<'home' | 'away'>('home')
  const [goalTeam, setGoalTeam] = useState<'home' | 'away'>('home')
  // Use store-backed team selection so the WS payload always matches the UI selection
  const cardTeam = (cardData?.team || 'home') as 'home' | 'away'
  const [nameplateTeam, setNameplateTeam] = useState<'home' | 'away'>('home')

  // Sync coach data from database on mount
  useEffect(() => {
    const syncCoachData = async () => {
      if (!currentMatch?.homeTeam?.id || !currentMatch?.awayTeam?.id) return
      
      try {
        const teams = await db.getTeams()
        const homeTeamFromDb = teams.find(t => t.id === currentMatch.homeTeam.id)
        const awayTeamFromDb = teams.find(t => t.id === currentMatch.awayTeam.id)
        
        // Update coach if it exists in database but not in current match
        if (homeTeamFromDb?.coach && !currentMatch.homeTeam.coach) {
          useAppStore.getState().updateMatch({
            homeTeam: { ...currentMatch.homeTeam, coach: homeTeamFromDb.coach }
          })
        }
        if (awayTeamFromDb?.coach && !currentMatch.awayTeam.coach) {
          useAppStore.getState().updateMatch({
            awayTeam: { ...currentMatch.awayTeam, coach: awayTeamFromDb.coach }
          })
        }
      } catch (error) {
        console.error('Error syncing coach data:', error)
      }
    }
    
    syncCoachData()
  }, [currentMatch?.homeTeam?.id, currentMatch?.awayTeam?.id])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (timerRunning) {
      interval = setInterval(() => {
        setMatchTime(matchTime + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, matchTime, setMatchTime])

  // Get current playing players for each team
  const homePlaying11 = useMemo(() => {
    if (!currentMatch) return []
    return getCurrentPlaying11(currentMatch.homeLineup, currentMatch.homeBench, currentMatch.events, 'home')
  }, [currentMatch])

  const awayPlaying11 = useMemo(() => {
    if (!currentMatch) return []
    return getCurrentPlaying11(currentMatch.awayLineup, currentMatch.awayBench, currentMatch.events, 'away')
  }, [currentMatch])

  // Get available subs for each team
  const homeAvailableSubs = useMemo(() => {
    if (!currentMatch) return []
    const usedSubIds = currentMatch.events
      .filter(e => e.type === 'sub' && e.team === 'home' && e.secondPlayer)
      .map(e => e.secondPlayer!.id)
    return currentMatch.homeBench.filter(bp => !usedSubIds.includes(bp.player.id))
  }, [currentMatch])

  const awayAvailableSubs = useMemo(() => {
    if (!currentMatch) return []
    const usedSubIds = currentMatch.events
      .filter(e => e.type === 'sub' && e.team === 'away' && e.secondPlayer)
      .map(e => e.secondPlayer!.id)
    return currentMatch.awayBench.filter(bp => !usedSubIds.includes(bp.player.id))
  }, [currentMatch])

  const homeSubsUsed = currentMatch?.events.filter(e => e.type === 'sub' && e.team === 'home').length || 0
  const awaySubsUsed = currentMatch?.events.filter(e => e.type === 'sub' && e.team === 'away').length || 0

  const outputUrl = typeof window !== "undefined" ? `${window.location.origin}/renderer` : ""
  const controlUrl = typeof window !== "undefined" ? `${window.location.origin}/graphics-control` : ""

  const copyUrl = () => {
    navigator.clipboard.writeText(outputUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Renderer URL copied")
  }

  const openOutput = () => window.open(outputUrl, "GraphicsRenderer", "width=1920,height=1080")
  const openControlWindow = () => window.open(controlUrl, "GraphicsControl", "width=800,height=900")

  const takeToBlack = () => {
    // Handle extra time animation before hiding score bug
    if (scoreBugVisible && currentMatch?.extraTimeVisible) {
      updateMatch({ extraTimeVisible: false })
      setTimeout(() => toggleScoreBug(false), 500)
    } else {
      toggleScoreBug(false)
    }
    toggleGoal(false)
    toggleCard(false)
    toggleSubstitution(false)
    toggleVSGraphic(false)
    toggleNameplate(false)
    toggleLineup(false)
    toggleMatchStatsLowerThird(false)
    toggleMatchStatsFullScreen(false)
    toast.info("All graphics off")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Mutual exclusion: turn off other graphics in the same group before showing new one
  const hideEventGraphics = useCallback(() => {
    toggleGoal(false)
    toggleCard(false)
    toggleSubstitution(false)
    toggleNameplate(false)
  }, [toggleGoal, toggleCard, toggleSubstitution, toggleNameplate])

  const hideLowerThirdGraphics = useCallback(() => {
    toggleMatchStatsLowerThird(false)
  }, [toggleMatchStatsLowerThird])

  // Custom handler for score bug toggle that handles extra time animation
  const handleScoreBugToggle = useCallback((visible: boolean) => {
    if (!visible && currentMatch?.extraTimeVisible) {
      // First hide extra time, wait for animation, then hide score bug
      updateMatch({ extraTimeVisible: false })
      setTimeout(() => {
        toggleScoreBug(false)
      }, 500) // Wait for extra time out animation
    } else {
      toggleScoreBug(visible)
    }
  }, [currentMatch?.extraTimeVisible, updateMatch, toggleScoreBug])

  // Hide ALL graphics before showing fullscreen - returns true if any were visible
  const hideAllGraphicsForFullscreen = useCallback(() => {
    const anyVisible = scoreBugVisible || goalVisible || cardVisible || substitutionVisible || 
                       nameplateVisible || matchStatsLowerThirdVisible || matchStatsFullScreenVisible || vsGraphicVisible || lineupVisible
    
    // Hide everything - handle extra time for score bug
    if (scoreBugVisible) {
      if (currentMatch?.extraTimeVisible) {
        updateMatch({ extraTimeVisible: false })
        setTimeout(() => toggleScoreBug(false), 500)
      } else {
        toggleScoreBug(false)
      }
    }
    toggleGoal(false)
    toggleCard(false)
    toggleSubstitution(false)
    toggleNameplate(false)
    toggleMatchStatsLowerThird(false)
    toggleMatchStatsFullScreen(false)
    toggleVSGraphic(false)
    toggleLineup(false)
    
    return anyVisible
    }, [scoreBugVisible, goalVisible, cardVisible, substitutionVisible, nameplateVisible, 
      matchStatsLowerThirdVisible, matchStatsFullScreenVisible, vsGraphicVisible, lineupVisible,
      currentMatch?.extraTimeVisible, updateMatch,
      toggleScoreBug, toggleGoal, toggleCard, toggleSubstitution, toggleNameplate, 
      toggleMatchStatsLowerThird, toggleMatchStatsFullScreen, toggleVSGraphic, toggleLineup])

  // Get active graphics for each group
  const eventGroupActive = useMemo(() => {
    const active: string[] = []
    if (goalVisible) active.push('Goal')
    if (cardVisible) active.push('Card')
    if (substitutionVisible) active.push('Sub')
    if (nameplateVisible) active.push('Name')
    return active
  }, [goalVisible, cardVisible, substitutionVisible, nameplateVisible])

  const scorebugGroupActive = useMemo(() => {
    const active: string[] = []
    if (scoreBugVisible) active.push('Score')
    return active
  }, [scoreBugVisible])

  const lowerThirdGroupActive = useMemo(() => {
    const active: string[] = []
    if (matchStatsLowerThirdVisible) active.push('Stats')
    return active
  }, [matchStatsLowerThirdVisible])

  const fullscreenGroupActive = useMemo(() => {
    const active: string[] = []
    if (vsGraphicVisible) active.push('VS')
    if (lineupVisible) active.push('Lineup')
    if (matchStatsFullScreenVisible) active.push('Stats')
    return active
  }, [vsGraphicVisible, lineupVisible, matchStatsFullScreenVisible])

  // Event Queue - events that need graphics shown
  const eventQueue = useMemo(() => {
    if (!currentMatch) return []
    const graphicEvents = ['goal', 'own-goal', 'penalty-goal', 'yellow', 'red', 'second-yellow', 'sub']
    return currentMatch.events
      .filter(e => graphicEvents.includes(e.type))
      .map(e => ({
        ...e,
        isShown: shownEventIds.has(e.id)
      }))
      .reverse() // Most recent first
  }, [currentMatch, shownEventIds])

  const pendingEvents = eventQueue.filter(e => !e.isShown)
  const shownEvents = eventQueue.filter(e => e.isShown)
  
  // Get the next pending event (first in queue that hasn't been shown)
  const nextPendingEvent = pendingEvents[0] || null
  
  // Check if a specific graphic type has pending events
  const hasPendingGoal = pendingEvents.some(e => e.type === 'goal' || e.type === 'penalty-goal' || e.type === 'own-goal')
  const hasPendingCard = pendingEvents.some(e => e.type === 'yellow' || e.type === 'red' || e.type === 'second-yellow')
  const hasPendingSub = pendingEvents.some(e => e.type === 'sub')

  // Show graphic from queue and mark as shown
  const showFromQueue = useCallback((event: typeof eventQueue[0]) => {
    if (!currentMatch) return
    
    hideEventGraphics()
    
    if (event.type === 'goal' || event.type === 'penalty-goal' || event.type === 'own-goal') {
      if (event.player) {
        setGoalData({
          playerName: event.player.name,
          playerNumber: String(event.player.number),
          goalTime: formatEventTime(event, settings.timeFormat),
          isPenalty: event.type === 'penalty-goal',
          isOwnGoal: event.type === 'own-goal',
          team: event.team
        })
        setTimeout(() => {
          toggleGoal(true)
          setLastPushedGraphic("Goal")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success("GOAL graphic shown")
          setTimeout(() => toggleGoal(false), 5000)
        }, 100)
      }
    } else if (event.type === 'yellow' || event.type === 'red' || event.type === 'second-yellow') {
      if (event.player) {
        const cardType = event.type === 'yellow' ? 'yellow' : 'red'
        setCardData({
          playerName: event.player.name,
          playerNumber: String(event.player.number),
          cardTime: formatEventTime(event, settings.timeFormat),
          cardType: cardType as 'yellow' | 'red',
          team: event.team
        })
        setTimeout(() => {
          toggleCard(true)
          setLastPushedGraphic(cardType === 'red' ? "Red Card" : "Yellow Card")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success(`${cardType.toUpperCase()} CARD shown`)
          setTimeout(() => toggleCard(false), 4000)
        }, 100)
      }
    } else if (event.type === 'sub') {
      if (event.player && event.secondPlayer) {
        setSubData({
          playerOut: event.player.name,
          numberOut: String(event.player.number),
          playerIn: event.secondPlayer.name,
          numberIn: String(event.secondPlayer.number),
          team: event.team
        })
        setTimeout(() => {
          toggleSubstitution(true)
          setLastPushedGraphic("Substitution")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success("Substitution graphic shown")
          setTimeout(() => toggleSubstitution(false), 5000)
        }, 100)
      }
    }
  }, [currentMatch, hideEventGraphics, setGoalData, setCardData, setSubData, toggleGoal, toggleCard, toggleSubstitution, setLastPushedGraphic, settings.timeFormat])

  // Mark event as shown without displaying graphic
  const markAsShown = useCallback((eventId: string) => {
    setShownEventIds(prev => new Set([...prev, eventId]))
  }, [])

  // Clear all shown status
  const clearShownStatus = useCallback(() => {
    setShownEventIds(new Set())
  }, [])

  // Auto-fill and show functions with mutual exclusion
  const fillFromLastGoal = () => {
    const lastGoal = currentMatch?.events.filter(e => e.type === 'goal' || e.type === 'penalty-goal' || e.type === 'own-goal').pop()
    if (lastGoal?.player) {
      hideEventGraphics()
      setGoalData({
        playerName: lastGoal.player.name,
        playerNumber: String(lastGoal.player.number),
        goalTime: formatEventTime(lastGoal, settings.timeFormat),
        isPenalty: lastGoal.type === 'penalty-goal',
        isOwnGoal: lastGoal.type === 'own-goal',
        team: lastGoal.team as 'home' | 'away'
      })
      setTimeout(() => {
        toggleGoal(true)
        setLastPushedGraphic("Goal")
        toast.success("GOAL graphic shown")
        setTimeout(() => toggleGoal(false), 5000)
      }, 100)
    } else {
      toast.error("No goal events found")
    }
  }

  const fillFromLastCard = () => {
    const lastCard = currentMatch?.events.filter(e => e.type === 'yellow' || e.type === 'red' || e.type === 'second-yellow').pop()
    if (lastCard?.player) {
      hideEventGraphics()
      const cardType = lastCard.type === 'yellow' ? 'yellow' : 'red'
      setCardData({
        playerName: lastCard.player.name,
        playerNumber: String(lastCard.player.number),
        cardTime: formatEventTime(lastCard, settings.timeFormat),
        cardType: cardType as 'yellow' | 'red',
        team: lastCard.team as 'home' | 'away'
      })
      setTimeout(() => {
        toggleCard(true)
        setLastPushedGraphic(cardType === 'red' ? "Red Card" : "Yellow Card")
        toast.success(`${cardType.toUpperCase()} CARD shown`)
        setTimeout(() => toggleCard(false), 4000)
      }, 100)
    } else {
      toast.error("No card events found")
    }
  }

  const fillFromLastSub = () => {
    const lastSub = currentMatch?.events.filter(e => e.type === 'sub').pop()
    if (lastSub?.player && lastSub?.secondPlayer) {
      hideEventGraphics()
      setSubData({
        playerOut: lastSub.player.name,
        numberOut: String(lastSub.player.number),
        playerIn: lastSub.secondPlayer.name,
        numberIn: String(lastSub.secondPlayer.number),
        team: lastSub.team as 'home' | 'away'
      })
      setTimeout(() => {
        toggleSubstitution(true)
        setLastPushedGraphic("Substitution")
        toast.success("Substitution graphic shown")
        setTimeout(() => toggleSubstitution(false), 5000)
      }, 100)
    } else {
      toast.error("No substitution events found")
    }
  }

  const showGoal = () => {
    if (!goalData?.playerName) return toast.error("Enter player name")
    hideEventGraphics()
    setGoalData({ ...goalData, team: goalTeam })
    setTimeout(() => {
      toggleGoal(true)
      setLastPushedGraphic("Goal")
      toast.success("GOAL graphic shown")
      setTimeout(() => toggleGoal(false), 5000)
    }, 100)
  }

  const showCard = () => {
    if (!cardData?.playerName) return toast.error("Enter player name")
    hideEventGraphics()
    // Read team at click-time from the store (Zustand updates are synchronous),
    // so clicking "Away" then immediately "Show" can't accidentally send stale "home".
    const teamNow = (useAppStore.getState().cardData.team || 'home') as 'home' | 'away'
    setCardData({ team: teamNow })
    setTimeout(() => {
      toggleCard(true)
      setLastPushedGraphic((cardData?.cardType || 'yellow') === "red" ? "Red Card" : "Yellow Card")
      toast.success(`${(cardData?.cardType || 'yellow').toUpperCase()} CARD shown`)
      setTimeout(() => toggleCard(false), 4000)
    }, 100)
  }

  const showSub = () => {
    if (!subData?.playerIn || !subData?.playerOut) return toast.error("Enter both players")
    hideEventGraphics()
    setSubData({ ...subData, team: subTeam })
    setTimeout(() => {
      toggleSubstitution(true)
      setLastPushedGraphic("Substitution")
      toast.success("Substitution shown")
      setTimeout(() => toggleSubstitution(false), 5000)
    }, 100)
  }

  const showNameplate = () => {
    if (!nameplateData?.playerName) return toast.error("Enter player name")
    hideEventGraphics()
    setNameplateData({ team: nameplateTeam })
    setTimeout(() => {
      toggleNameplate(true)
      setLastPushedGraphic("Nameplate")
      toast.success("Nameplate shown")
    }, 100)
  }

  const showLineup = (team: 'home' | 'away') => {
    if (!currentMatch) return toast.error("No match loaded")
    
    // Hide ALL graphics first, then show lineup after they animate out
    const hadVisibleGraphics = hideAllGraphicsForFullscreen()
    const delay = hadVisibleGraphics ? 1200 : 100 // Wait for out animation if graphics were visible
    
    const selectedTeamData = team === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam
    const formation = (team === 'home' ? currentMatch.homeFormation : currentMatch.awayFormation) || selectedTeamData.defaultFormation || '4-3-3'
    const lineup = team === 'home' ? currentMatch.homeLineup : currentMatch.awayLineup
    const bench = team === 'home' ? currentMatch.homeBench : currentMatch.awayBench
    

    

    
    const formationData = getFormation(formation as FormationType, 'football')
    
    const players = lineup.slice(0, 11).map((lp, i) => ({
      number: lp.player.number,
      name: lp.player.name,
      shortName: lp.player.shortName,
      position: formationData?.positions[i] || { x: 50, y: 50 },
      photo: lp.player.photo
    }))
    
    const subs = bench.slice(0, 7).map(bp => ({
      num: bp.player.number,
      name: bp.player.name
    }))
    

    
    setLineupData({
      team,
      teamName: selectedTeamData.name,
      teamColor: selectedTeamData.primaryColor,
      teamLogo: selectedTeamData.logo,
      formation,
      players,
      subs,
      coach: selectedTeamData.coach || ''
    })
    
    if (hadVisibleGraphics) {
      toast.info("Hiding existing graphics...")
    }
    
    setTimeout(() => {
      // Pass the team so the graphics store tracks which lineup is active (used by some UI logic)
      toggleLineup(true, team)
      setLastPushedGraphic(`${selectedTeamData.name} Lineup`)
      toast.success(`${selectedTeamData.name} lineup shown`)
    }, delay)
  }

  const showVS = (variant: 'vs' | 'ht' | 'ft') => {
    if (!currentMatch) return
    
    // Hide ALL graphics first, then show VS after they animate out
    const hadVisibleGraphics = hideAllGraphicsForFullscreen()
    const delay = hadVisibleGraphics ? 1200 : 100 // Wait for out animation if graphics were visible
    
    const periodMap: Record<string, 'pre' | 'ht' | 'ft'> = { vs: 'pre', ht: 'ht', ft: 'ft' }
    useAppStore.getState().updateMatch({ period: periodMap[variant] })
    
    if (hadVisibleGraphics) {
      toast.info("Hiding existing graphics...")
    }
    
    setTimeout(() => {
      toggleVSGraphic(true)
      const labels = { vs: 'VS', ht: 'Half Time', ft: 'Full Time' }
      toast.success(`${labels[variant]} graphic shown`)
    }, delay)
  }

  const showMatchStatsFullScreen = () => {
    if (!currentMatch) return
    const hadVisibleGraphics = hideAllGraphicsForFullscreen()
    const delay = hadVisibleGraphics ? 1200 : 100

    if (hadVisibleGraphics) {
      toast.info("Hiding existing graphics...")
    }

    setTimeout(() => {
      toggleMatchStatsFullScreen(true)
      setLastPushedGraphic("Match Stats (Fullscreen)")
      toast.success("Match Stats shown")
    }, delay)
  }

  const showMatchStats = () => {
    hideLowerThirdGraphics()
    setTimeout(() => {
      toggleMatchStatsLowerThird(true)
      setLastPushedGraphic("Lower Third Graphics")
      toast.success("Lower Third Graphics shown")
    }, 100)
  }

  const recentEvents = currentMatch?.events.slice(-5).reverse() || []

  // Prevent hydration mismatch - show loading until client is ready
  if (!mounted) {
    return (
      <div className="mt-4 flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading graphics control...</p>
        </div>
      </div>
    )
  }

  // Show message if teams aren't set yet
  if (!currentMatch || !currentMatch.homeTeam || !currentMatch.awayTeam) {
    return (
      <div className="mt-4 space-y-4">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-bold mb-2">No Teams Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please go to Match Setup and select both home and away teams before using Graphics Control.
            </p>
            <Button onClick={() => setCurrentPage("lineup-setup")}>
              Go to Match Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {/* WebSocket Warning */}
      {!wsConnected && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">WebSocket Not Connected</p>
            <p className="text-xs text-muted-foreground mt-1">Run <code className="bg-secondary px-1 rounded">pnpm dev:full</code> and open Renderer</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between bg-gradient-to-r from-secondary/50 to-transparent rounded-xl p-4 border border-border/50">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Graphics Control
              {pendingEvents.length > 0 && (
                <Badge className="bg-amber-500 text-[10px] animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {pendingEvents.length} pending
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentMatch && currentMatch.homeTeam && currentMatch.awayTeam ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{currentMatch.homeTeam.shortName}</span>
                  <span className="text-primary font-bold">{currentMatch.homeScore} - {currentMatch.awayScore}</span>
                  <span className="font-medium">{currentMatch.awayTeam.shortName}</span>
                </span>
              ) : 'No match loaded'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${wsConnected ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {wsConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-500">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-500">OFFLINE</span>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={copyUrl} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'URL'}
          </Button>
          <Button variant="outline" size="sm" onClick={openOutput} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Renderer
          </Button>
          <Button variant="outline" size="sm" onClick={openControlWindow} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Pop Out
          </Button>
          <Button variant="destructive" size="sm" onClick={takeToBlack} className="gap-1.5 shadow-lg shadow-red-500/20">
            <Square className="h-3.5 w-3.5 fill-current" /> All Off
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Score & Timer */}
        <div className="col-span-3 space-y-4">
          {/* Score Bug Group */}
          <GraphicsGroupBox 
            title="Score Bug" 
            borderColor="#22c55e" 
            activeGraphics={scorebugGroupActive}
            icon={<Tv className="h-4 w-4 text-green-500" />}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Show/Hide</span>
              <Switch checked={scoreBugVisible} onCheckedChange={handleScoreBugToggle} />
            </div>
            {currentMatch && currentMatch.homeTeam && currentMatch.awayTeam ? (
              <div className="flex items-center justify-between">
                <div className="text-center">
                  {currentMatch.homeTeam.logo ? (
                    <img src={currentMatch.homeTeam.logo} className="h-10 w-10 mx-auto mb-1 object-contain" alt="" />
                  ) : (
                    <div className="h-10 w-10 mx-auto mb-1 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }}>
                      {currentMatch.homeTeam.shortName}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">{currentMatch.homeTeam.shortName}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums">{currentMatch.homeScore} - {currentMatch.awayScore}</p>
                  <p className="text-sm font-mono text-muted-foreground">{mounted ? formatTime(matchTime) : '00:00'}</p>
                </div>
                <div className="text-center">
                  {currentMatch.awayTeam.logo ? (
                    <img src={currentMatch.awayTeam.logo} className="h-10 w-10 mx-auto mb-1 object-contain" alt="" />
                  ) : (
                    <div className="h-10 w-10 mx-auto mb-1 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }}>
                      {currentMatch.awayTeam.shortName}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">{currentMatch.awayTeam.shortName}</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-xs">No match loaded</p>
            )}
          </GraphicsGroupBox>

          {/* Event Queue */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <ListTodo className="h-3 w-3 text-amber-500" /> EVENT QUEUE
                  {pendingEvents.length > 0 && (
                    <Badge className="bg-amber-500 text-[9px] animate-pulse">{pendingEvents.length} pending</Badge>
                  )}
                </CardTitle>
                {shownEventIds.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2" onClick={clearShownStatus}>
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <ScrollArea className="h-36">
                {eventQueue.length > 0 ? (
                  <div className="space-y-1.5">
                    {eventQueue.map((event) => {
                      const isPending = !event.isShown
                      const eventIcon = event.type.includes('goal') ? '⚽' : 
                                       event.type.includes('yellow') ? '🟨' : 
                                       event.type.includes('red') || event.type === 'second-yellow' ? '🟥' : 
                                       event.type === 'sub' ? '🔄' : '📋'
                      const bgColor = isPending ? 
                        (event.type.includes('goal') ? 'bg-green-500/10 border-green-500/30' :
                         event.type.includes('yellow') ? 'bg-yellow-500/10 border-yellow-500/30' :
                         event.type.includes('red') || event.type === 'second-yellow' ? 'bg-red-500/10 border-red-500/30' :
                         'bg-blue-500/10 border-blue-500/30') : 'bg-secondary/30 border-border'
                      
                      return (
                        <div key={event.id} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${bgColor} transition-all`}>
                          <span className="text-sm">{eventIcon}</span>
                          <span className="font-mono text-muted-foreground w-8">{formatEventTime(event, settings.timeFormat)}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{event.player?.name}</span>
                            {event.type === 'sub' && event.secondPlayer && (
                              <span className="text-[10px] text-muted-foreground">↔ {event.secondPlayer.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isPending ? (
                              <>
                                <Button 
                                  size="sm" 
                                  className="h-6 text-[10px] px-2 bg-amber-500 hover:bg-amber-600"
                                  onClick={() => showFromQueue(event)}
                                >
                                  <Zap className="h-3 w-3 mr-1" /> Show
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => markAsShown(event.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Circle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No events in queue</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Events from Match Control appear here</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* All Active Graphics Summary */}
          <Card className="border-primary/30">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <Radio className="h-3 w-3 text-primary" /> LIVE GRAPHICS
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex flex-wrap gap-1.5">
                {scoreBugVisible && <Badge className="text-[10px] bg-green-500 shadow-sm shadow-green-500/50">Score Bug</Badge>}
                {vsGraphicVisible && <Badge className="text-[10px] bg-violet-500 shadow-sm shadow-violet-500/50">VS</Badge>}
                {lineupVisible && <Badge className="text-[10px] bg-indigo-500 shadow-sm shadow-indigo-500/50">Lineup</Badge>}
                {matchStatsLowerThirdVisible && <Badge className="text-[10px] bg-cyan-500 shadow-sm shadow-cyan-500/50">Lower Third</Badge>}
                {matchStatsFullScreenVisible && <Badge className="text-[10px] bg-violet-500 shadow-sm shadow-violet-500/50">Stats FS</Badge>}
                {goalVisible && <Badge className="text-[10px] bg-green-600 shadow-sm shadow-green-600/50 animate-pulse">Goal</Badge>}
                {cardVisible && <Badge className={`text-[10px] shadow-sm animate-pulse ${cardData?.cardType === 'red' ? 'bg-red-600 shadow-red-600/50' : 'bg-yellow-500 text-black shadow-yellow-500/50'}`}>Card</Badge>}
                {substitutionVisible && <Badge className="text-[10px] bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse">Sub</Badge>}
                {nameplateVisible && <Badge className="text-[10px] bg-purple-500 shadow-sm shadow-purple-500/50">Nameplate</Badge>}
                {!scoreBugVisible && !vsGraphicVisible && !lineupVisible && !goalVisible && !cardVisible && !substitutionVisible && !nameplateVisible && !matchStatsLowerThirdVisible && !matchStatsFullScreenVisible && (
                  <span className="text-xs text-muted-foreground italic">All graphics off</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Center Column - Event Graphics Group */}
        <div className="col-span-5 space-y-4">
          <GraphicsGroupBox 
            title="Event Graphics" 
            borderColor="#f59e0b" 
            activeGraphics={eventGroupActive}
            icon={<Target className="h-4 w-4 text-amber-500" />}
          >
            <p className="text-[10px] text-muted-foreground mb-3">Only one event graphic can be shown at a time</p>
            
            {/* Goal */}
            <div className={`border rounded-lg p-3 mb-3 bg-green-500/5 border-green-500/20 ${hasPendingGoal ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-background animate-pulse' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Target className={`h-3 w-3 text-green-500 ${hasPendingGoal ? 'animate-bounce' : ''}`} /> Goal
                  {hasPendingGoal && <Badge className="text-[9px] bg-green-500 animate-pulse ml-1">QUEUE</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  {hasPendingGoal && (
                    <Button size="sm" className="h-5 text-[10px] px-2 bg-green-500 hover:bg-green-600" onClick={() => {
                      const goalEvent = pendingEvents.find(e => e.type === 'goal' || e.type === 'penalty-goal' || e.type === 'own-goal')
                      if (goalEvent) showFromQueue(goalEvent)
                    }}>
                      <Zap className="h-3 w-3 mr-1" /> Show Queue
                    </Button>
                  )}
                  {goalVisible && <Badge className="text-[9px] bg-green-500">LIVE</Badge>}
                </div>
              </div>
              {currentMatch && (
                <>
                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant={goalTeam === 'home' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setGoalTeam('home')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }} />
                      {currentMatch.homeTeam.shortName}
                    </Button>
                    <Button size="sm" variant={goalTeam === 'away' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setGoalTeam('away')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }} />
                      {currentMatch.awayTeam.shortName}
                    </Button>
                  </div>
                  <div className="mb-2">
                    <Select onValueChange={(id) => {
                      const players = goalTeam === 'home' ? homePlaying11 : awayPlaying11
                      const player = players.find(p => p.id === id)
                      if (player) {
                        setGoalData({ playerName: player.name, playerNumber: String(player.number) })
                      }
                    }}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select player from lineup" /></SelectTrigger>
                      <SelectContent>
                        {(goalTeam === 'home' ? homePlaying11 : awayPlaying11).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">#{p.number} {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex gap-1 mb-2">
                <Input placeholder="#" value={goalData?.playerNumber || ''} onChange={(e) => setGoalData({ playerNumber: e.target.value })} className="h-7 text-xs w-12" />
                <Input placeholder="Player name" value={goalData?.playerName || ''} onChange={(e) => setGoalData({ playerName: e.target.value })} className="h-7 text-xs flex-1" />
                <Input placeholder="Time" value={goalData?.goalTime || ''} onChange={(e) => setGoalData({ goalTime: e.target.value })} className="h-7 text-xs w-14" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-[10px]">
                    <input type="checkbox" checked={goalData?.isPenalty || false} onChange={(e) => setGoalData({ isPenalty: e.target.checked })} className="rounded h-3 w-3" />
                    Pen
                  </label>
                  <label className="flex items-center gap-1 text-[10px]">
                    <input type="checkbox" checked={goalData?.isOwnGoal || false} onChange={(e) => setGoalData({ isOwnGoal: e.target.checked })} className="rounded h-3 w-3" />
                    OG
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-6 text-xs" onClick={showGoal} disabled={goalVisible}>
                    <Play className="h-3 w-3 mr-1" /> Show
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => toggleGoal(false)} disabled={!goalVisible}>
                    <Square className="h-3 w-3 mr-1" /> Hide
                  </Button>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className={`border rounded-lg p-3 mb-3 bg-yellow-500/5 border-yellow-500/20 ${hasPendingCard ? 'ring-2 ring-yellow-500 ring-offset-1 ring-offset-background animate-pulse' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <CreditCard className={`h-3 w-3 text-yellow-500 ${hasPendingCard ? 'animate-bounce' : ''}`} /> Card
                  {hasPendingCard && <Badge className="text-[9px] bg-yellow-500 text-black animate-pulse ml-1">QUEUE</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  {hasPendingCard && (
                    <Button size="sm" className="h-5 text-[10px] px-2 bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => {
                      const cardEvent = pendingEvents.find(e => e.type === 'yellow' || e.type === 'red' || e.type === 'second-yellow')
                      if (cardEvent) showFromQueue(cardEvent)
                    }}>
                      <Zap className="h-3 w-3 mr-1" /> Show Queue
                    </Button>
                  )}
                  {cardVisible && <Badge className={`text-[9px] ${cardData?.cardType === 'red' ? 'bg-red-500' : 'bg-yellow-500 text-black'}`}>LIVE</Badge>}
                </div>
              </div>
              {currentMatch && (
                <>
                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant={cardTeam === 'home' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setCardData({ team: 'home' })}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }} />
                      {currentMatch.homeTeam.shortName}
                    </Button>
                    <Button size="sm" variant={cardTeam === 'away' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setCardData({ team: 'away' })}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }} />
                      {currentMatch.awayTeam.shortName}
                    </Button>
                  </div>
                  <div className="mb-2">
                    <Select onValueChange={(id) => {
                      const players = cardTeam === 'home' ? homePlaying11 : awayPlaying11
                      const player = players.find(p => p.id === id)
                      if (player) {
                        setCardData({ playerName: player.name, playerNumber: String(player.number) })
                      }
                    }}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select player from lineup" /></SelectTrigger>
                      <SelectContent>
                        {(cardTeam === 'home' ? homePlaying11 : awayPlaying11).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">#{p.number} {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex gap-1 mb-2">
                <Input placeholder="#" value={cardData?.playerNumber || ''} onChange={(e) => setCardData({ playerNumber: e.target.value })} className="h-7 text-xs w-12" />
                <Input placeholder="Player name" value={cardData?.playerName || ''} onChange={(e) => setCardData({ playerName: e.target.value })} className="h-7 text-xs flex-1" />
                <Select value={cardData?.cardType || 'yellow'} onValueChange={(v) => setCardData({ cardType: v as "yellow" | "red" })}>
                  <SelectTrigger className="h-7 text-xs w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Input placeholder="Time" value={cardData?.cardTime || ''} onChange={(e) => setCardData({ cardTime: e.target.value })} className="h-7 text-xs w-16" />
                <div className="flex gap-1">
                  <Button size="sm" className={`h-6 text-xs ${(cardData?.cardType || 'yellow') === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}`} onClick={showCard} disabled={cardVisible}>
                    <Play className="h-3 w-3 mr-1" /> Show
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => toggleCard(false)} disabled={!cardVisible}>
                    <Square className="h-3 w-3 mr-1" /> Hide
                  </Button>
                </div>
              </div>
            </div>

            {/* Substitution */}
            <div className={`border rounded-lg p-3 mb-3 bg-blue-500/5 border-blue-500/20 ${hasPendingSub ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-background animate-pulse' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <ArrowLeftRight className={`h-3 w-3 text-blue-500 ${hasPendingSub ? 'animate-bounce' : ''}`} /> Substitution
                  {hasPendingSub && <Badge className="text-[9px] bg-blue-500 animate-pulse ml-1">QUEUE</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  {hasPendingSub && (
                    <Button size="sm" className="h-5 text-[10px] px-2 bg-blue-500 hover:bg-blue-600" onClick={() => {
                      const subEvent = pendingEvents.find(e => e.type === 'sub')
                      if (subEvent) showFromQueue(subEvent)
                    }}>
                      <Zap className="h-3 w-3 mr-1" /> Show Queue
                    </Button>
                  )}
                  {substitutionVisible && <Badge className="text-[9px] bg-blue-500">LIVE</Badge>}
                </div>
              </div>
              {currentMatch ? (
                <>
                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant={subTeam === 'home' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setSubTeam('home')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }} />
                      {currentMatch.homeTeam.shortName}
                      <span className="text-[8px] opacity-70">({homeSubsUsed}/5)</span>
                    </Button>
                    <Button size="sm" variant={subTeam === 'away' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setSubTeam('away')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }} />
                      {currentMatch.awayTeam.shortName}
                      <span className="text-[8px] opacity-70">({awaySubsUsed}/5)</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-red-400 font-medium mb-1">OUT</p>
                      <Select onValueChange={(id) => {
                        const players = subTeam === 'home' ? homePlaying11 : awayPlaying11
                        const player = players.find(p => p.id === id)
                        setSubData({ ...subData, playerOut: player?.name || '', numberOut: String(player?.number || '') })
                      }}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select player" /></SelectTrigger>
                        <SelectContent>
                          {(subTeam === 'home' ? homePlaying11 : awayPlaying11).map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">#{p.number} {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[9px] text-green-400 font-medium mb-1">IN</p>
                      <Select onValueChange={(id) => {
                        const subs = subTeam === 'home' ? homeAvailableSubs : awayAvailableSubs
                        const sub = subs.find(bp => bp.player.id === id)
                        setSubData({ ...subData, playerIn: sub?.player.name || '', numberIn: String(sub?.player.number || '') })
                      }}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select sub" /></SelectTrigger>
                        <SelectContent>
                          {(subTeam === 'home' ? homeAvailableSubs : awayAvailableSubs).map(bp => (
                            <SelectItem key={bp.player.id} value={bp.player.id} className="text-xs">#{bp.player.number} {bp.player.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-1 items-center">
                    <span className="text-red-500 text-[10px] w-6">OUT</span>
                    <Input placeholder="#" value={subData?.numberOut || ''} onChange={(e) => setSubData({ numberOut: e.target.value })} className="h-7 text-xs w-10" />
                    <Input placeholder="Player Out" value={subData?.playerOut || ''} onChange={(e) => setSubData({ playerOut: e.target.value })} className="h-7 text-xs flex-1" />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-green-500 text-[10px] w-6">IN</span>
                    <Input placeholder="#" value={subData?.numberIn || ''} onChange={(e) => setSubData({ numberIn: e.target.value })} className="h-7 text-xs w-10" />
                    <Input placeholder="Player In" value={subData?.playerIn || ''} onChange={(e) => setSubData({ playerIn: e.target.value })} className="h-7 text-xs flex-1" />
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-2 gap-1">
                <Button size="sm" className="h-6 text-xs" onClick={showSub} disabled={substitutionVisible}>
                  <Play className="h-3 w-3 mr-1" /> Show
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => toggleSubstitution(false)} disabled={!substitutionVisible}>
                  <Square className="h-3 w-3 mr-1" /> Hide
                </Button>
              </div>
            </div>

            {/* Nameplate */}
            <div className="border rounded-lg p-3 bg-purple-500/5 border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <User className="h-3 w-3 text-purple-500" /> Nameplate
                </span>
                {nameplateVisible && <Badge className="text-[9px] bg-purple-500">LIVE</Badge>}
              </div>
              {currentMatch && (
                <>
                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant={nameplateTeam === 'home' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setNameplateTeam('home')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }} />
                      {currentMatch.homeTeam.shortName}
                    </Button>
                    <Button size="sm" variant={nameplateTeam === 'away' ? 'default' : 'outline'} className="h-6 flex-1 text-[10px] gap-1" onClick={() => setNameplateTeam('away')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }} />
                      {currentMatch.awayTeam.shortName}
                    </Button>
                  </div>
                  <div className="mb-2">
                    <Select onValueChange={(id) => {
                      const players = nameplateTeam === 'home' ? homePlaying11 : awayPlaying11
                      const player = players.find(p => p.id === id)
                      if (player) {
                        setNameplateData({ playerName: player.name, number: String(player.number), position: player.position || '' })
                      }
                    }}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select player from lineup" /></SelectTrigger>
                      <SelectContent>
                        {(nameplateTeam === 'home' ? homePlaying11 : awayPlaying11).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">#{p.number} {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex gap-1 mb-2">
                <Input placeholder="#" value={nameplateData?.number || ''} onChange={(e) => setNameplateData({ number: e.target.value })} className="h-7 text-xs w-12" />
                <Input placeholder="Player name" value={nameplateData?.playerName || ''} onChange={(e) => setNameplateData({ playerName: e.target.value })} className="h-7 text-xs flex-1" />
              </div>
              <div className="flex gap-1">
                <Input placeholder="Position / Role" value={nameplateData?.position || ''} onChange={(e) => setNameplateData({ position: e.target.value })} className="h-7 text-xs flex-1" />
                <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={showNameplate} disabled={nameplateVisible}>
                  <Play className="h-3 w-3 mr-1" /> Show
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleNameplate(false)} disabled={!nameplateVisible}>
                  <Square className="h-3 w-3 mr-1" /> Hide
                </Button>
              </div>
            </div>
          </GraphicsGroupBox>
        </div>


        {/* Right Column - Fullscreen & Lower Third Groups */}
        <div className="col-span-4 space-y-4">
          {/* Fullscreen Graphics Group */}
          <GraphicsGroupBox 
            title="Fullscreen Graphics" 
            borderColor="#8b5cf6" 
            activeGraphics={fullscreenGroupActive}
            icon={<Trophy className="h-4 w-4 text-violet-500" />}
          >
            <p className="text-[10px] text-muted-foreground mb-3">Only one fullscreen graphic can be shown at a time</p>
            
            {/* VS / HT / FT */}
            <div className="border rounded-lg p-3 mb-3 bg-violet-500/5 border-violet-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">VS / Half Time / Full Time</span>
                {vsGraphicVisible && <Badge className="text-[9px] bg-violet-500">LIVE</Badge>}
              </div>
              {currentMatch && currentMatch.homeTeam && currentMatch.awayTeam ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="text-center">
                      {currentMatch.homeTeam.logo ? (
                        <img src={currentMatch.homeTeam.logo} className="h-8 w-8 mx-auto object-contain" alt="" />
                      ) : (
                        <div className="h-8 w-8 mx-auto rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }}>
                          {currentMatch.homeTeam.shortName}
                        </div>
                      )}
                    </div>
                    <span className="text-xl font-bold">{currentMatch.homeScore} - {currentMatch.awayScore}</span>
                    <div className="text-center">
                      {currentMatch.awayTeam.logo ? (
                        <img src={currentMatch.awayTeam.logo} className="h-8 w-8 mx-auto object-contain" alt="" />
                      ) : (
                        <div className="h-8 w-8 mx-auto rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }}>
                          {currentMatch.awayTeam.shortName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => showVS('vs')} disabled={vsGraphicVisible}>VS</Button>
                    <Button size="sm" className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700" onClick={() => showVS('ht')} disabled={vsGraphicVisible}>Half Time</Button>
                    <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => showVS('ft')} disabled={vsGraphicVisible}>Full Time</Button>
                  </div>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => toggleVSGraphic(false)} disabled={!vsGraphicVisible}>
                    <Square className="h-3 w-3 mr-1" /> Hide
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">No match loaded</p>
              )}
            </div>


            {/* Match Stats (Fullscreen) */}
            <div className="border rounded-lg p-3 mb-3 bg-violet-500/5 border-violet-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Match Stats</span>
                <div className="flex items-center gap-2">
                  {matchStatsFullScreenVisible && <Badge className="text-[9px] bg-violet-500">LIVE</Badge>}
                  <Switch
                    checked={matchStatsFullScreenVisible}
                    onCheckedChange={(checked) => {
                      if (checked) showMatchStatsFullScreen()
                      else toggleMatchStatsFullScreen(false)
                    }}
                  />
                </div>
              </div>
              {currentMatch ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-sm font-medium">{currentMatch.homeTeam.shortName}</span>
                    <span className="text-lg font-bold">vs</span>
                    <span className="text-sm font-medium">{currentMatch.awayTeam.shortName}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-700"
                      onClick={showMatchStatsFullScreen}
                      disabled={matchStatsFullScreenVisible}
                    >
                      <Play className="h-3 w-3 mr-1" /> Show
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => toggleMatchStatsFullScreen(false)}
                      disabled={!matchStatsFullScreenVisible}
                    >
                      <Square className="h-3 w-3 mr-1" /> Hide
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">No match loaded</p>
              )}
            </div>

            {/* Lineup */}
            <div className="border rounded-lg p-3 bg-indigo-500/5 border-indigo-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <LayoutGrid className="h-3 w-3 text-indigo-500" /> Lineup
                </span>
                {lineupVisible && <Badge className="text-[9px] bg-indigo-500">LIVE</Badge>}
              </div>
              {currentMatch ? (
                <>
                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant={selectedTeam === 'home' ? 'default' : 'outline'} className="h-7 flex-1 text-[10px] gap-1" onClick={() => setSelectedTeam('home')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.homeTeam.primaryColor }} />
                      {currentMatch.homeTeam.shortName}
                    </Button>
                    <Button size="sm" variant={selectedTeam === 'away' ? 'default' : 'outline'} className="h-7 flex-1 text-[10px] gap-1" onClick={() => setSelectedTeam('away')}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMatch.awayTeam.primaryColor }} />
                      {currentMatch.awayTeam.shortName}
                    </Button>
                  </div>
                  <Input 
                    placeholder="Head Coach name" 
                    value={(selectedTeam === 'home' ? currentMatch.homeTeam.coach : currentMatch.awayTeam.coach) || ''} 
                    onChange={(e) => {
                      const teamKey = selectedTeam === 'home' ? 'homeTeam' : 'awayTeam'
                      useAppStore.getState().updateMatch({
                        [teamKey]: { ...currentMatch[teamKey], coach: e.target.value }
                      })
                    }}
                    className="h-7 text-xs mb-2"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 h-7 text-xs" style={{ backgroundColor: selectedTeam === 'home' ? currentMatch.homeTeam.primaryColor : currentMatch.awayTeam.primaryColor }}
                      onClick={() => showLineup(selectedTeam)} disabled={lineupVisible}>
                      <Play className="h-3 w-3 mr-1" /> Show Lineup
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleLineup(false)} disabled={!lineupVisible}>
                      <Square className="h-3 w-3 mr-1" /> Hide
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">No match loaded</p>
              )}
            </div>
          </GraphicsGroupBox>

            {/* Lower Third Graphics Group */}
          <GraphicsGroupBox 
            title="Lower Third Graphics" 
            borderColor="#06b6d4" 
            activeGraphics={lowerThirdGroupActive}
            icon={<BarChart3 className="h-4 w-4 text-cyan-500" />}
          >
            <div className="border rounded-lg p-3 bg-cyan-500/5 border-cyan-500/20">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Lower Third Graphics</span>
                <div className="flex items-center gap-2">
                  {matchStatsLowerThirdVisible && <Badge className="text-[9px] bg-cyan-500">LIVE</Badge>}
                  <Switch checked={matchStatsLowerThirdVisible} onCheckedChange={toggleMatchStatsLowerThird} />
                </div>
              </div>
              {currentMatch ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-sm font-medium">{currentMatch.homeTeam.shortName}</span>
                    <span className="text-lg font-bold">{currentMatch.homeScore} - {currentMatch.awayScore}</span>
                    <span className="text-sm font-medium">{currentMatch.awayTeam.shortName}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-700" 
                      onClick={showMatchStats}
                      disabled={matchStatsLowerThirdVisible}
                    >
                      <Play className="h-3 w-3 mr-1" /> Show
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 text-xs" 
                      onClick={() => toggleMatchStatsLowerThird(false)}
                      disabled={!matchStatsLowerThirdVisible}
                    >
                      <Square className="h-3 w-3 mr-1" /> Hide
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">No match loaded</p>
              )}
            </div>
          </GraphicsGroupBox>

        </div>
      </div>
    </div>
  )
}
