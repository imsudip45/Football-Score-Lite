"use client"

import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatEventTime } from "@/lib/utils"
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Target,
  RefreshCw,
  Square,
  Clock,
  Monitor,
  Undo2,
  Redo2,
  ChevronRight,
  ChevronLeft,
  Zap,
  Type,
  Trash2,
  User,
  Users,
  Trophy,
  Gavel,
  AlertCircle,
  Settings,
  Tv,
  LayoutGrid,
  Save,
  Loader2,
  ExternalLink,
  Copy,
  Globe,
} from "lucide-react"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { EventModal } from "@/components/event-modal"
import { toast } from "sonner"
import { useGraphicsStore } from "@/lib/graphics-store"
import { GraphicsGroupBox } from "@/components/graphics-group-box"
import { GraphicTriggerButton } from "@/components/graphics-trigger-button"
import type { MatchEvent, LowerThirdPreset, FormationType } from "@/lib/types"
import { getFormation } from "@/lib/formations"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { completeMatch } from "@/lib/database"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CheckCircle2, ListChecks, Trophy as TrophyIcon, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
export function LiveControl() {
  const {
    currentMatch,
    updateMatch,
    timerRunning,
    setTimerRunning,
    matchTime,
    setMatchTime,
    possession,
    setPossession,
    undo,
    redo,
    history,
    historyIndex,
    activeLowerThird,
    setActiveLowerThird,
    pushLowerThird,
    clearLowerThird,
    removeEvent,
    setLastPushedGraphic,
    setCurrentPage,
    sportType,
    getSportConfig,
    breakingBanner,
    setBreakingBanner,
    toggleBreakingBanner,
    workflowProgress,
    setLineupData,
    wsConnected,
    setGoalData,
    setCardData,
    setSubData,
    nameplateData,
    setNameplateData,
    settings,
  } = useAppStore()

  const sportConfig = getSportConfig()
  
  // Helper to get correct asset path for Electron
  const getAssetPath = (path: string) => {
    if (typeof window !== 'undefined') {
      // In Electron production, files are loaded from file:// protocol
      // The base URL will be something like: file:///C:/path/to/app/out/index.html
      // We need to construct paths relative to the current page
      const currentUrl = window.location.href
      
      // If we're on a file:// protocol (Electron production)
      if (currentUrl.startsWith('file://')) {
        // Get the directory of the current HTML file
        const baseDir = currentUrl.substring(0, currentUrl.lastIndexOf('/'))
        return `${baseDir}/${path}`
      }
      
      // For development or web (http://localhost:3000)
      return `/${path}`
    }
    return `/${path}`
  }
  
  // Auto-save hook - saves match state every 3 seconds when timer is running and match is live
  // Requirements: 1.1 - Auto-save every 3 seconds during live broadcasting
  const { lastSaved, isSaving, saveNow } = useAutoSave({
    interval: 3000, // 3 seconds as per Requirements 1.1
    enabled: currentMatch?.status === 'live',
  })
  
  // Get graphics store state with error handling
  // Error Handling: Handle invalid graphics store state (default to false, log error)
  const graphicsState = useGraphicsStore()
  
  // Safe accessor for graphics visibility state - defaults to false on invalid state
  const safeGetVisibility = useCallback((key: string): boolean => {
    try {
      const value = (graphicsState as unknown as Record<string, unknown>)[key]
      if (typeof value !== 'boolean') {
        if (value !== undefined) {
          console.error(`[LiveControl] Invalid graphics store state for ${key}: expected boolean, got ${typeof value}`)
        }
        return false
      }
      return value
    } catch (error) {
      console.error(`[LiveControl] Error accessing graphics store state for ${key}:`, error)
      return false
    }
  }, [graphicsState])
  
  // Extract graphics state with safe defaults
  const scoreBugVisible = safeGetVisibility('scoreBugVisible')
  const matchStatsLowerThirdVisible = safeGetVisibility('matchStatsLowerThirdVisible')
  const matchStatsFullScreenVisible = safeGetVisibility('matchStatsFullScreenVisible')
  const vsGraphicVisible = safeGetVisibility('vsGraphicVisible')
  const lineupVisible = safeGetVisibility('lineupVisible')
  const lineupTeam = (graphicsState as unknown as Record<string, unknown>).lineupTeam as 'home' | 'away' | null
  const matchOfficialsVisible = safeGetVisibility('matchOfficialsVisible')
  
  const { 
    toggleScoreBug, 
    toggleMatchStatsLowerThird, 
    toggleMatchStatsFullScreen,
    toggleVSGraphic,
    toggleLineup,
    toggleMatchOfficials,
  } = graphicsState

  // Check if lineups are configured
  if (!workflowProgress.lineupsConfigured || !currentMatch) {
    return (
      <div className="mt-4 space-y-4">
        <Card className="glass-card border-warning/30 bg-warning/5">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Lineups Not Configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please complete lineup setup before starting the match
                </p>
              </div>
              <Button onClick={() => setCurrentPage("lineup-setup")}>
                Go to Lineup Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if match is properly configured
  const isMatchConfigured = currentMatch && 
    currentMatch.homeTeam?.id !== "home-placeholder" && 
    currentMatch.awayTeam?.id !== "away-placeholder" &&
    currentMatch.competition

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState<MatchEvent["type"]>("goal")
  const [capturedMatchTime, setCapturedMatchTime] = useState(0)
  
  // Time edit modal state
  const [timeEditOpen, setTimeEditOpen] = useState(false)
  const [editMins, setEditMins] = useState(0)
  const [editSecs, setEditSecs] = useState(0)
  
  // Match completion state - Requirements: 8.1, 8.2, 8.3
  const [endMatchConfirmOpen, setEndMatchConfirmOpen] = useState(false)
  const [matchCompletedDialogOpen, setMatchCompletedDialogOpen] = useState(false)
  const [completionPeriod, setCompletionPeriod] = useState<string>("")

  // Events timeline dialog state
  const [eventsTimelineOpen, setEventsTimelineOpen] = useState(false)

  // Track shown events for pending indicators
  // Requirements: 5.1, 5.2, 5.3, 5.4 - Event-driven graphics highlighting
  const [shownEventIds, setShownEventIds] = useState<Set<string>>(new Set())
  
  // Nameplate configuration state
  const [nameplateTeam, setNameplateTeam] = useState<'home' | 'away' | 'neutral'>('home')
  
  // Pending goal state - tracks which team scored when score is increased
  const [pendingGoalTeam, setPendingGoalTeam] = useState<'home' | 'away' | null>(null)
  
  // Network URL state for commentator access
  const [commentatorNetworkUrl, setCommentatorNetworkUrl] = useState<string>('')
  const [rendererNetworkUrl, setRendererNetworkUrl] = useState<string>('')
  
  // Commentator window reference - Requirements: 8.2, 8.3
  const commentatorWindowRef = useRef<Window | null>(null)
  
  // Fetch network info on mount
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        // Prefer Electron IPC (works even when app runs at localhost in dev)
        if (window.electronAPI?.network?.getInfo) {
          const info = await window.electronAPI.network.getInfo()
          const base = `http://${info.ip}:${info.port}`
          setCommentatorNetworkUrl(`${base}/commentator`)
          setRendererNetworkUrl(`${base}/renderer`)
          return
        }

        // Fallback: try existing API (if present)
        const response = await fetch('http://localhost:3000/api/network-info')
        if (response.ok) {
          const data = await response.json()
          if (data?.commentatorUrl) setCommentatorNetworkUrl(data.commentatorUrl)
          if (data?.rendererUrl) setRendererNetworkUrl(data.rendererUrl)
          return
        }
      } catch (error) {
        // Fallback: use current hostname if it's already a LAN hostname/IP
        const hostname = window.location.hostname
        const port = window.location.port || '3000'
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          setCommentatorNetworkUrl(`http://${hostname}:${port}/commentator`)
          setRendererNetworkUrl(`http://${hostname}:${port}/renderer`)
        }
      }
    }
    fetchNetworkInfo()
  }, [])
  
  /**
   * Open commentator output window with proper window management
   * Requirements: 2.3, 8.1, 8.2, 8.3
   * Handles both development (http://localhost:3000) and production (Electron) environments
   */
  const handleOpenCommentatorOutput = useCallback(() => {
    // Check if window is already open and still valid
    if (commentatorWindowRef.current && !commentatorWindowRef.current.closed) {
      // Focus existing window
      commentatorWindowRef.current.focus()
      toast.info('Commentator window already open')
      return
    }
    
    // Always open via localhost inside the app.
    // The Copy button still provides the LAN URL for other devices.
    const commentatorUrl = 'http://localhost:3000/commentator'

    // In Electron, open as a real BrowserWindow so we can maximize reliably.
    if (window.electronAPI?.commentator?.open) {
      window.electronAPI.commentator.open(commentatorUrl).catch((error) => {
        console.error('[LiveControl] Failed to open commentator window:', error)
        toast.error('Failed to open commentator window')
      })
      return
    }
    
    // Open new window maximized (requested UX).
    // Use screen size as initial features, then best-effort move/resize after open.
    const w = typeof window !== 'undefined' ? window.screen?.availWidth : 1280
    const h = typeof window !== 'undefined' ? window.screen?.availHeight : 720
    const windowFeatures = [
      `width=${w || 1280}`,
      `height=${h || 720}`,
      'left=0',
      'top=0',
      'resizable=yes',
      'scrollbars=yes',
      'toolbar=no',
      'menubar=no',
      'location=no',
      'status=yes'
    ].join(',')
    
    const newWindow = window.open(
      commentatorUrl,
      'commentator',
      windowFeatures
    )
    
    if (newWindow) {
      commentatorWindowRef.current = newWindow
      toast.success('Commentator output opened')

      // Best-effort maximize (some browsers may restrict this; Electron allows it).
      try {
        const sw = window.screen?.availWidth
        const sh = window.screen?.availHeight
        if (typeof sw === 'number' && typeof sh === 'number') {
          newWindow.moveTo(0, 0)
          newWindow.resizeTo(sw, sh)
        }
      } catch {
        // ignore
      }
      
      // Handle window close events - Requirements: 8.3
      const checkWindowClosed = setInterval(() => {
        if (commentatorWindowRef.current?.closed) {
          clearInterval(checkWindowClosed)
          commentatorWindowRef.current = null
          console.log('[LiveControl] Commentator window closed')
        }
      }, 1000)
    } else {
      toast.error('Failed to open commentator window. Please check popup blocker.')
    }
  }, [])

  const openMaximizedWindow = useCallback((url: string, name: string, fallback: { w: number; h: number }) => {
    const w = typeof window !== 'undefined' ? window.screen?.availWidth : fallback.w
    const h = typeof window !== 'undefined' ? window.screen?.availHeight : fallback.h
    const features = [
      `width=${w || fallback.w}`,
      `height=${h || fallback.h}`,
      'left=0',
      'top=0',
      'resizable=yes',
      'scrollbars=yes',
      'toolbar=no',
      'menubar=no',
      'location=no',
      'status=yes'
    ].join(',')

    const newWindow = window.open(url, name, features)
    if (!newWindow) return null

    try {
      const sw = window.screen?.availWidth
      const sh = window.screen?.availHeight
      if (typeof sw === 'number' && typeof sh === 'number') {
        newWindow.moveTo(0, 0)
        newWindow.resizeTo(sw, sh)
      }
    } catch {
      // ignore
    }
    return newWindow
  }, [])
  
  // Cleanup commentator window on unmount
  useEffect(() => {
    return () => {
      if (commentatorWindowRef.current && !commentatorWindowRef.current.closed) {
        // Don't close the window on unmount - let it stay open independently
        // Just clear the reference
        commentatorWindowRef.current = null
      }
    }
  }, [])

  // Get graphics store state for Events group with safe defaults
  // Error Handling: Handle invalid graphics store state (default to false, log error)
  const goalVisible = safeGetVisibility('goalVisible')
  const cardVisible = safeGetVisibility('cardVisible')
  const substitutionVisible = safeGetVisibility('substitutionVisible')
  const nameplateVisible = safeGetVisibility('nameplateVisible')
  
  const {
    toggleGoal,
    toggleCard,
    toggleSubstitution,
    toggleNameplate,
  } = graphicsState

  // Compute pending event flags with error handling for malformed event data
  // Requirements: 5.1, 5.2, 5.3, 5.4 - Highlight buttons when events are pending
  // Error Handling: Handle malformed event data (skip event, log warning)
  const pendingEvents = useMemo(() => {
    if (!currentMatch?.events) return { goals: [], cards: [], subs: [] }
    
    // Helper to validate event data
    const isValidEvent = (event: unknown): event is MatchEvent => {
      if (!event || typeof event !== 'object') {
        console.warn('[LiveControl] Skipping malformed event: event is not an object', event)
        return false
      }
      const e = event as Record<string, unknown>
      if (!e.id || typeof e.id !== 'string') {
        console.warn('[LiveControl] Skipping malformed event: missing or invalid id', event)
        return false
      }
      if (!e.type || typeof e.type !== 'string') {
        console.warn('[LiveControl] Skipping malformed event: missing or invalid type', event)
        return false
      }
      return true
    }
    
    const validEvents = currentMatch.events.filter(isValidEvent)
    
    const goals = validEvents.filter(
      e => (e.type === 'goal' || e.type === 'penalty-goal' || e.type === 'own-goal') && !shownEventIds.has(e.id)
    )
    const cards = validEvents.filter(
      e => (e.type === 'yellow' || e.type === 'red' || e.type === 'second-yellow') && !shownEventIds.has(e.id)
    )
    const subs = validEvents.filter(
      e => e.type === 'sub' && !shownEventIds.has(e.id)
    )
    
    return { goals, cards, subs }
  }, [currentMatch?.events, shownEventIds])

  const hasPendingGoal = pendingEvents.goals.length > 0
  const hasPendingCard = pendingEvents.cards.length > 0
  const hasPendingSub = pendingEvents.subs.length > 0

  // Mark events as shown when their graphic is displayed
  // Requirements: 5.5 - Remove highlight when graphic is shown
  const markEventsAsShown = (eventType: 'goal' | 'card' | 'sub') => {
    const eventsToMark = eventType === 'goal' ? pendingEvents.goals :
                         eventType === 'card' ? pendingEvents.cards :
                         pendingEvents.subs
    
    if (eventsToMark.length > 0) {
      setShownEventIds(prev => {
        const newSet = new Set(prev)
        eventsToMark.forEach(e => newSet.add(e.id))
        return newSet
      })
    }
  }

  // Hide all graphics for fullscreen graphics like lineup, VS, officials
  // When showing fullscreen graphics, ALL other graphics must be hidden first
  const hideAllGraphicsForFullscreen = useCallback(() => {
    const anyVisible = scoreBugVisible || goalVisible || cardVisible || substitutionVisible || 
                       nameplateVisible || matchStatsLowerThirdVisible || matchStatsFullScreenVisible || vsGraphicVisible || 
                       lineupVisible || matchOfficialsVisible
    
    // Hide everything - use handleScoreBugToggle for proper extra time handling
    if (scoreBugVisible) {
      if (currentMatch?.extraTimeVisible) {
        updateMatch({ extraTimeVisible: false })
        setTimeout(() => toggleScoreBug(false), 500)
      } else {
        toggleScoreBug(false)
      }
    }
    if (goalVisible) toggleGoal(false)
    if (cardVisible) toggleCard(false)
    if (substitutionVisible) toggleSubstitution(false)
    if (nameplateVisible) toggleNameplate(false)
    if (matchStatsLowerThirdVisible) toggleMatchStatsLowerThird(false)
    if (matchStatsFullScreenVisible) toggleMatchStatsFullScreen(false)
    if (vsGraphicVisible) toggleVSGraphic(false)
    if (lineupVisible) toggleLineup(false)
    if (matchOfficialsVisible) toggleMatchOfficials(false)
    
    return anyVisible
  }, [scoreBugVisible, goalVisible, cardVisible, substitutionVisible, nameplateVisible, 
      matchStatsLowerThirdVisible, matchStatsFullScreenVisible, vsGraphicVisible, lineupVisible, matchOfficialsVisible,
      currentMatch?.extraTimeVisible, updateMatch,
      toggleScoreBug, toggleGoal, toggleCard, toggleSubstitution, toggleNameplate, 
      toggleMatchStatsLowerThird, toggleMatchStatsFullScreen, toggleVSGraphic, toggleLineup, toggleMatchOfficials])

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

  // Hide event graphics only (for mutual exclusion within Events group)
  const hideEventGraphics = useCallback(() => {
    if (goalVisible) toggleGoal(false)
    if (cardVisible) toggleCard(false)
    if (substitutionVisible) toggleSubstitution(false)
    if (nameplateVisible) toggleNameplate(false)
    if (matchOfficialsVisible) toggleMatchOfficials(false)
  }, [goalVisible, cardVisible, substitutionVisible, nameplateVisible, matchOfficialsVisible,
      toggleGoal, toggleCard, toggleSubstitution, toggleNameplate, toggleMatchOfficials])

  // Show graphic for a specific event from the timeline
  // Triggers the appropriate graphic (Goal, Card, Sub) based on event type
  const showEventGraphic = useCallback((event: MatchEvent) => {
    if (!wsConnected) {
      toast.error("WebSocket disconnected - cannot show graphics")
      return
    }

    // Hide other event graphics first (mutual exclusion)
    hideEventGraphics()

    if (event.type === 'goal' || event.type === 'penalty-goal' || event.type === 'own-goal') {
      if (event.player) {
        setGoalData({
          playerName: event.player.name,
          playerNumber: String(event.player.number),
          goalTime: formatEventTime(event, settings.timeFormat),
          isPenalty: event.type === 'penalty-goal',
          isOwnGoal: event.type === 'own-goal',
          team: event.team as 'home' | 'away'
        })
        setTimeout(() => {
          toggleGoal(true)
          setLastPushedGraphic("Goal")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success("GOAL graphic shown")
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
          team: event.team as 'home' | 'away'
        })
        setTimeout(() => {
          toggleCard(true)
          setLastPushedGraphic(cardType === 'red' ? "Red Card" : "Yellow Card")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success(`${cardType.toUpperCase()} CARD shown`)
        }, 100)
      }
    } else if (event.type === 'sub') {
      if (event.player && event.secondPlayer) {
        setSubData({
          playerOut: event.player.name,
          numberOut: String(event.player.number),
          playerIn: event.secondPlayer.name,
          numberIn: String(event.secondPlayer.number),
          team: event.team as 'home' | 'away'
        })
        setTimeout(() => {
          toggleSubstitution(true)
          setLastPushedGraphic("Substitution")
          setShownEventIds(prev => new Set([...prev, event.id]))
          toast.success("Substitution graphic shown")
        }, 100)
      }
    }
  }, [wsConnected, hideEventGraphics, setGoalData, setCardData, setSubData, toggleGoal, toggleCard, toggleSubstitution, setLastPushedGraphic])

  // Show VS graphic with proper fullscreen handling
  const showVSGraphic = useCallback((show: boolean) => {
    if (show) {
      // Hide ALL graphics first, then show VS after animation
      const hadVisibleGraphics = hideAllGraphicsForFullscreen()
      const delay = hadVisibleGraphics ? 1200 : 100
      setTimeout(() => {
        toggleVSGraphic(true)
        toast.success("VS Screen shown")
      }, delay)
    } else {
      toggleVSGraphic(false)
    }
  }, [hideAllGraphicsForFullscreen, toggleVSGraphic])

  // Show Match Stats Fullscreen with proper fullscreen handling
  const showMatchStatsFullScreen = useCallback((show: boolean) => {
    if (show) {
      const hadVisibleGraphics = hideAllGraphicsForFullscreen()
      const delay = hadVisibleGraphics ? 1200 : 100
      setTimeout(() => {
        toggleMatchStatsFullScreen(true)
        toast.success("Match Stats (Summary) shown")
      }, delay)
    } else {
      toggleMatchStatsFullScreen(false)
    }
  }, [hideAllGraphicsForFullscreen, toggleMatchStatsFullScreen])

  // Show Match Officials with proper fullscreen handling
  const showMatchOfficials = useCallback((show: boolean) => {
    if (show) {
      // Hide ALL graphics first, then show officials after animation
      const hadVisibleGraphics = hideAllGraphicsForFullscreen()
      const delay = hadVisibleGraphics ? 1200 : 100
      setTimeout(() => {
        toggleMatchOfficials(true)
        toast.success("Match Officials shown")
      }, delay)
    } else {
      toggleMatchOfficials(false)
    }
  }, [hideAllGraphicsForFullscreen, toggleMatchOfficials])

  // Show lineup graphic for a specific team
  // Requirements: 1.2, 1.3, 2.1, 2.3, 4.2 - Team Info graphics group
  const showLineup = useCallback((team: 'home' | 'away') => {
    if (!currentMatch) return toast.error("No match loaded")
    
    // Hide ALL graphics first, then show lineup after they animate out
    const hadVisibleGraphics = hideAllGraphicsForFullscreen()
    const delay = hadVisibleGraphics ? 1200 : 100 // Wait for out animation if graphics were visible
    
    const selectedTeamData = team === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam
    const formation = (team === 'home' ? currentMatch.homeFormation : currentMatch.awayFormation) || selectedTeamData.defaultFormation || '4-3-3'
    const lineup = team === 'home' ? currentMatch.homeLineup : currentMatch.awayLineup
    const bench = team === 'home' ? currentMatch.homeBench : currentMatch.awayBench
    
    const formationData = getFormation(formation as FormationType, sportType || 'football')
    
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
    
    setTimeout(() => {
      toggleLineup(true, team)
      toast.success(`${selectedTeamData.name} lineup shown`)
    }, delay)
  }, [currentMatch, sportType, hideAllGraphicsForFullscreen, setLineupData, toggleLineup])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => {
        setMatchTime(matchTime + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, matchTime, setMatchTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getPeriodFromTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const periodLength = currentMatch?.periodLength || sportConfig.defaultPeriodLength
    if (mins < periodLength) return "1st"
    if (mins < periodLength * 2) return "2nd"
    if (mins < periodLength * 2 + sportConfig.extraTimePeriodLength) return "ET1"
    if (mins < periodLength * 2 + sportConfig.extraTimePeriodLength * 2) return "ET2"
    return "FT"
  }

  const handleEventPadClick = (type: MatchEvent["type"]) => {
    setSelectedEventType(type)
    setCapturedMatchTime(matchTime) // Capture the current match time when button is clicked
    setEventModalOpen(true)
  }

  const handleLowerThirdSelect = (type: LowerThirdPreset["type"]) => {
    let preset: LowerThirdPreset | null = null

    switch (type) {
      case "coach":
        preset = {
          id: `lt-${Date.now()}`,
          type: "coach",
          title: "Head Coach",
          subtitle: currentMatch?.homeTeam.name,
        }
        break
      case "motm":
        preset = {
          id: `lt-${Date.now()}`,
          type: "motm",
          title: "Man of the Match",
          subtitle: "To be announced",
        }
        break
      case "referee":
        const ref = currentMatch?.officials.find((o) => o.role === "referee")
        preset = {
          id: `lt-${Date.now()}`,
          type: "referee",
          title: ref?.name || "Match Referee",
          subtitle: ref?.badge,
        }
        break
    }

    setActiveLowerThird(preset)
  }

  const handlePushLowerThird = () => {
    if (activeLowerThird) {
      pushLowerThird()
      // Also toggle visibility in graphics store
      const { toggleLowerThird } = useGraphicsStore.getState()
      toggleLowerThird(true)
      toast.success("Lower third pushed to live")
    }
  }

  const handleClearLowerThird = () => {
    clearLowerThird()
    const { toggleLowerThird } = useGraphicsStore.getState()
    toggleLowerThird(false)
    toast.success("Lower third cleared")
  }

  const handleScoreChange = (team: "home" | "away", delta: number) => {
    const key = team === "home" ? "homeScore" : "awayScore"
    const currentScore = currentMatch?.[key] || 0
    const newScore = Math.max(0, currentScore + delta)
    updateMatch({ [key]: newScore })

    if (delta > 0) {
      // Set pending goal team when score increases - Goal button will be enabled
      setPendingGoalTeam(team)
      setCapturedMatchTime(matchTime) // Capture time when goal is scored
      setLastPushedGraphic(
        `Goal! ${team === "home" ? currentMatch?.homeTeam.shortName : currentMatch?.awayTeam.shortName}`,
      )
      toast.success(`Goal for ${team === "home" ? currentMatch?.homeTeam.name : currentMatch?.awayTeam.name}! Click Goal button to add details.`)
    } else if (delta < 0) {
      // Clear pending goal if user decrements the same team's score
      if (pendingGoalTeam === team) {
        setPendingGoalTeam(null)
        toast.info('Goal cancelled')
      }
    }
  }

  const eventPads = [
    { id: "goal", label: "Goal", icon: Target, imagePath: "icons/goal.png", color: "bg-slate-700 hover:bg-slate-600 text-white" },
    {
      id: "sub",
      label: "Substitution",
      icon: RefreshCw,
      imagePath: "icons/subs.png",
      color: "bg-slate-700 hover:bg-slate-600 text-white",
    },
    {
      id: "yellow",
      label: "Yellow Card",
      icon: Square,
      color: "bg-slate-700 hover:bg-slate-600 text-white",
      iconColor: "fill-current",
    },
    {
      id: "red",
      label: "Red Card",
      icon: Square,
      color: "bg-slate-700 hover:bg-slate-600 text-white",
      iconColor: "fill-current",
    },
  ]

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Show setup prompt if match not configured
  if (!isMatchConfigured) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Live Control</h1>
            <p className="text-sm text-muted-foreground">Match broadcast control panel</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Match Configured</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              You need to set up a match before you can use the live control panel. 
              Go to Match Setup to configure teams, competition details, and match settings.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setCurrentPage("lineup-setup")}>
                <Settings className="h-4 w-4 mr-2" />
                Go to Match Setup
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage("teams")}>
                Manage Teams
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sportConfig.name}</p>
              <p className="text-xs text-muted-foreground">Sport Mode</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sportConfig.maxLineupSize}v{sportConfig.maxLineupSize}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sportConfig.defaultPeriodLength} min</p>
              <p className="text-xs text-muted-foreground">Half Length</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Calculate quick stats
  const homeGoals = currentMatch?.events.filter(e => e.team === 'home' && (e.type === 'goal' || e.type === 'penalty-goal')).length || 0
  const awayGoals = currentMatch?.events.filter(e => e.team === 'away' && (e.type === 'goal' || e.type === 'penalty-goal')).length || 0
  const homeYellows = currentMatch?.events.filter(e => e.team === 'home' && e.type === 'yellow').length || 0
  const awayYellows = currentMatch?.events.filter(e => e.team === 'away' && e.type === 'yellow').length || 0
  const homeReds = currentMatch?.events.filter(e => e.team === 'home' && (e.type === 'red' || e.type === 'second-yellow')).length || 0
  const awayReds = currentMatch?.events.filter(e => e.team === 'away' && (e.type === 'red' || e.type === 'second-yellow')).length || 0
  const totalSubs = currentMatch?.events.filter(e => e.type === 'sub').length || 0

  // Smart period transitions with timer auto-set
  const periodConfig = {
    'pre': { label: 'PRE', startTime: 0, next: '1st' },
    '1st': { label: '1ST', startTime: 0, next: 'ht' },
    'ht': { label: 'HT', startTime: null, next: '2nd' },
    '2nd': { label: '2ND', startTime: 45 * 60, next: 'ft' },
    'ft': { label: 'FT', startTime: null, next: 'et1' },
    'et1': { label: 'ET1', startTime: 90 * 60, next: 'etht' },
    'etht': { label: 'ET-HT', startTime: null, next: 'et2' },
    'et2': { label: 'ET2', startTime: 105 * 60, next: 'aet' },
    'aet': { label: 'AET', startTime: null, next: 'pen' },
    'pen': { label: 'PEN', startTime: null, next: null },
  } as const

  const handlePeriodTransition = (action: 'end' | 'start', targetPeriod?: string) => {
    const current = currentMatch?.period || 'pre'
    const { toggleVSGraphic } = useGraphicsStore.getState()
    
    if (action === 'end') {
      // End current period
      setTimerRunning(false)
      const nextPeriod = periodConfig[current as keyof typeof periodConfig]?.next
      if (nextPeriod) {
        updateMatch({ period: nextPeriod as typeof currentMatch.period, stoppageTime: 0, extraTimeVisible: false })
        toast.success(`${periodConfig[current as keyof typeof periodConfig]?.label} ended`)
      }
    } else if (action === 'start' && targetPeriod) {
      // Start specific period - hide VS graphic when starting new period
      toggleVSGraphic(false)
      const config = periodConfig[targetPeriod as keyof typeof periodConfig]
      if (config?.startTime !== null) {
        setMatchTime(config.startTime)
        updateMatch({ period: targetPeriod as typeof currentMatch.period, stoppageTime: 0, extraTimeVisible: false })
        setTimerRunning(true)
        if (!scoreBugVisible) {
          toggleScoreBug(true)
        }
        toast.success(`${config.label} started`)
      }
    }
  }

  const handlePeriodChange = (period: typeof currentMatch.period) => {
    updateMatch({ period })
    toast.success(`Period changed to ${period.toUpperCase()}`)
  }

  /**
   * Handle match completion flow
   * Requirements: 8.1, 8.2, 8.3 - End match with confirmation, update status, save final score
   * @param period - The period at which the match is being ended (ft, aet, pen)
   */
  const handleEndMatchClick = (period: string) => {
    setCompletionPeriod(period)
    setEndMatchConfirmOpen(true)
  }

  /**
   * Confirm and complete the match
   * Requirements: 8.2, 8.3 - Call completeMatch() with final score, update status to 'completed', stop auto-save
   */
  const handleConfirmEndMatch = async () => {
    if (!currentMatch) return
    
    try {
      // Stop timer first
      setTimerRunning(false)
      
      // Call completeMatch() to update database - Requirements: 8.2, 8.3
      // This also stops auto-save since status changes from 'live' to 'completed'
      await completeMatch(currentMatch.id, {
        home: currentMatch.homeScore,
        away: currentMatch.awayScore,
      })
      
      // Update local state
      updateMatch({ status: 'completed' })
      
      // Close confirmation dialog and show completion dialog
      setEndMatchConfirmOpen(false)
      setMatchCompletedDialogOpen(true)
      
      // Show success toast
      const periodLabel = completionPeriod === 'ft' ? 'Full Time' : 
                          completionPeriod === 'aet' ? 'After Extra Time' : 
                          completionPeriod === 'pen' ? 'After Penalties' : 'Match'
      toast.success(`Match completed at ${periodLabel}`)
    } catch (error) {
      console.error('[LiveControl] Failed to complete match:', error)
      toast.error('Failed to complete match. Please try again.')
    }
  }

  // Show message if teams aren't set yet
  if (!currentMatch.homeTeam || !currentMatch.awayTeam) {
    return (
      <div className="mt-4 space-y-4">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-bold mb-2">No Teams Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please go to Match Setup and select both home and away teams before using Live Control.
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
    <div className="mt-0 space-y-2">
      {/* Page header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">Live Control</h1>
          <p className="text-xs text-muted-foreground">
            {currentMatch.competition} {currentMatch.round ? `• ${currentMatch.round}` : ''} • {currentMatch.venue || "No venue set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={wsConnected ? 'text-green-500' : 'text-red-500'}>
              {wsConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Events Timeline Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 bg-transparent"
            onClick={() => setEventsTimelineOpen(true)}
          >
            <ListChecks className="h-4 w-4" />
            Events ({currentMatch?.events?.length || 0})
          </Button>
          
          {/* Copy Renderer Link */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 bg-transparent"
            onClick={() => {
              const url = rendererNetworkUrl || 'http://localhost:3000/renderer'
              navigator.clipboard.writeText(url)
              toast.success(`Copied: ${url}`)
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Copy Link
          </Button>
          
          {/* Open Renderer Window */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 bg-transparent"
            onClick={() => {
              // In Electron, open as a real BrowserWindow so we can maximize reliably.
              if (window.electronAPI?.renderer?.open) {
                window.electronAPI.renderer.open('main', 'http://localhost:3000/renderer').catch((error) => {
                  console.error('[LiveControl] Failed to open renderer window:', error)
                  toast.error('Failed to open renderer window')
                })
                return
              }

              openMaximizedWindow('http://localhost:3000/renderer', 'renderer', { w: 1920, h: 1080 })
            }}
          >
            <Monitor className="h-4 w-4" />
            Open Renderer
          </Button>
          
          {/* Open Commentator Output Window - Requirements: 2.3, 8.1 */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 bg-transparent"
            onClick={handleOpenCommentatorOutput}
          >
            <Tv className="h-4 w-4" />
            Commentator
          </Button>
          
          {/* Network URL for Commentator - Copy to clipboard */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 bg-transparent text-blue-400 hover:text-blue-300 border-blue-500/50"
            onClick={() => {
              const port = window.location.port || '3000'
              const url = commentatorNetworkUrl || `http://${window.location.hostname}:${port}/commentator`
              navigator.clipboard.writeText(url).then(() => {
                toast.success(`Copied: ${url}`)
              }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea')
                textArea.value = url
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
                toast.success(`Copied: ${url}`)
              })
            }}
            title={commentatorNetworkUrl ? `Copy: ${commentatorNetworkUrl}` : "Copy commentator URL for network access"}
          >
            <Globe className="h-4 w-4" />
            <Copy className="h-3 w-3" />
          </Button>
          
          {/* Auto-save indicator - Requirements: 1.1 */}
          {currentMatch?.status === 'live' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">
                    Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </>
              ) : null}
            </div>
          )}
          <Badge variant="outline" className={sportType === 'football' ? 'text-green-500 border-green-500' : 'text-orange-500 border-orange-500'}>
            {sportConfig.name}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1 bg-transparent" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1 bg-transparent" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
            onClick={() => {
              if (confirm('Are you sure you want to reset this match? This will clear all events, reset the score to 0-0, and set the timer to 0.')) {
                setTimerRunning(false)
                setMatchTime(0)
                updateMatch({ 
                  homeScore: 0, 
                  awayScore: 0, 
                  homeShotsOnTarget: 0,
                  awayShotsOnTarget: 0,
                  homeFouls: 0,
                  awayFouls: 0,
                  homeOffsides: 0,
                  awayOffsides: 0,
                  homeCorners: 0,
                  awayCorners: 0,
                  period: 'pre', 
                  status: 'draft',
                  events: [],
                  stoppageTime: 0
                })
                toast.success('Match Reset')
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left Column - Event Pads */}
        <div className="flex-[2] space-y-3">
          {/* Score Bug Controller */}
          <Card className="glass-card relative">
            {/* Period indicator in top right */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {/* Period Flow Indicator */}
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                {(['1st', 'ht', '2nd', 'ft'] as const).map((p, i) => (
                  <div key={p} className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentMatch?.period === p 
                          ? 'bg-primary animate-pulse' 
                          : ['1st', 'ht', '2nd', 'ft', 'et1', 'etht', 'et2', 'aet', 'pen'].indexOf(currentMatch?.period || 'pre') > ['1st', 'ht', '2nd', 'ft'].indexOf(p)
                            ? 'bg-green-500'
                            : 'bg-muted-foreground/30'
                      }`}
                      title={p.toUpperCase()}
                    />
                    {i < 3 && <div className="w-3 h-0.5 bg-muted-foreground/30 mx-0.5" />}
                  </div>
                ))}
                {currentMatch?.extraTimeEnabled && (
                  <>
                    <div className="w-3 h-0.5 bg-muted-foreground/30 mx-0.5" />
                    {(['et1', 'etht', 'et2', 'aet'] as const).map((p, i) => (
                      <div key={p} className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full transition-colors ${
                            currentMatch?.period === p 
                              ? 'bg-orange-500 animate-pulse' 
                              : ['et1', 'etht', 'et2', 'aet', 'pen'].indexOf(currentMatch?.period || 'pre') > ['et1', 'etht', 'et2', 'aet'].indexOf(p)
                                ? 'bg-orange-500'
                                : 'bg-muted-foreground/30'
                          }`}
                          title={p.toUpperCase()}
                        />
                        {i < 3 && <div className="w-2 h-0.5 bg-muted-foreground/30 mx-0.5" />}
                      </div>
                    ))}
                  </>
                )}
                {currentMatch?.penaltiesEnabled && (
                  <>
                    <div className="w-3 h-0.5 bg-muted-foreground/30 mx-0.5" />
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentMatch?.period === 'pen' 
                          ? 'bg-red-500 animate-pulse' 
                          : 'bg-muted-foreground/30'
                      }`}
                      title="PEN"
                    />
                  </>
                )}
              </div>
              {/* Current Period Badge */}
              <Badge variant="outline" className="text-sm px-3 py-0.5">
                {periodConfig[currentMatch?.period as keyof typeof periodConfig]?.label || 'PRE-MATCH'}
              </Badge>
            </div>
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-2">
                {/* Home Team */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex flex-col items-center gap-1">
                    {currentMatch?.homeTeam?.logo ? (
                      <img src={currentMatch.homeTeam.logo} alt={currentMatch.homeTeam.name} className="h-44 w-44 rounded-xl object-contain bg-white p-1" />
                    ) : (
                      <div
                        className="flex h-44 w-44 items-center justify-center rounded-xl text-xl font-bold text-white text-center p-2"
                        style={{ backgroundColor: currentMatch?.homeTeam.primaryColor }}
                      >
                        {currentMatch?.homeTeam.name}
                      </div>
                    )}
                    <p className="font-semibold text-base text-center">{currentMatch?.homeTeam.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-transparent"
                      onClick={() => handleScoreChange("home", -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center text-5xl font-bold tabular-nums">
                      {currentMatch?.homeScore || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-transparent"
                      onClick={() => handleScoreChange("home", 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Timer & Period */}
                <div className="flex flex-col items-center gap-1">
                  
                  {/* Kickoff Team Selector */}
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                    <span className="text-sm text-muted-foreground px-2">KICKOFF</span>
                    <button
                      className={`px-4 py-1.5 text-base font-medium rounded transition-colors ${
                        currentMatch?.kickoffTeam === 'home' 
                          ? 'text-white' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      style={currentMatch?.kickoffTeam === 'home' ? { backgroundColor: currentMatch?.homeTeam.primaryColor } : {}}
                      onClick={() => updateMatch({ kickoffTeam: 'home' })}
                    >
                      {currentMatch?.homeTeam.shortName}
                    </button>
                    <button
                      className={`px-4 py-1.5 text-base font-medium rounded transition-colors ${
                        currentMatch?.kickoffTeam === 'away' 
                          ? 'text-white' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      style={currentMatch?.kickoffTeam === 'away' ? { backgroundColor: currentMatch?.awayTeam.primaryColor } : {}}
                      onClick={() => updateMatch({ kickoffTeam: 'away' })}
                    >
                      {currentMatch?.awayTeam.shortName}
                    </button>
                  </div>
                  
                  {/* Timer Display with Edit Button and Reset */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        setTimerRunning(false)
                        setMatchTime(0)
                      }}
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                    <span className="text-6xl font-bold tabular-nums">
                      {String(Math.floor(matchTime / 60)).padStart(2, '0')}:{String(matchTime % 60).padStart(2, '0')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        setEditMins(Math.floor(matchTime / 60))
                        setEditSecs(matchTime % 60)
                        setTimeEditOpen(true)
                      }}
                    >
                      <Clock className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Stoppage Time Controls */}
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="text-sm text-muted-foreground leading-tight">Stoppage<br/>Time</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateMatch({ stoppageTime: Math.max(0, (currentMatch?.stoppageTime || 0) - 1) })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={currentMatch?.stoppageTime || 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(15, parseInt(e.target.value) || 0))
                        updateMatch({ stoppageTime: val })
                      }}
                      className="w-10 text-center text-xl font-bold tabular-nums bg-transparent border-none focus:outline-none [appearance:textfield]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateMatch({ stoppageTime: Math.min(15, (currentMatch?.stoppageTime || 0) + 1) })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">min</span>
                    <Button
                      variant={currentMatch?.extraTimeVisible ? "destructive" : "default"}
                      size="default"
                      className="h-9 text-sm px-4"
                      onClick={() => {
                        if (currentMatch?.extraTimeVisible) {
                          updateMatch({ extraTimeVisible: false })
                          toast.success('Extra time hidden')
                        } else {
                          updateMatch({ extraTimeVisible: true })
                          toast.success(`Extra time shown (+${currentMatch?.stoppageTime || 0} min)`)
                        }
                      }}
                    >
                      {currentMatch?.extraTimeVisible ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  
                  {/* Period Transition Buttons */}
                  <div className="flex gap-2 flex-wrap justify-center">
                    {/* Pre-match: Start 1st Half */}
                    {currentMatch?.period === 'pre' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-green-600 hover:bg-green-700"
                        disabled={!currentMatch?.kickoffTeam}
                        onClick={() => {
                          updateMatch({ period: '1st', status: 'live' })
                          setMatchTime(0)
                          setTimerRunning(true)
                          // Show L3 graphics first, then scorebug after animation
                          if (!matchStatsLowerThirdVisible) {
                            toggleMatchStatsLowerThird(true)
                          }
                          setTimeout(() => {
                            toggleMatchStatsLowerThird(false)
                            setTimeout(() => {
                              if (!scoreBugVisible) {
                                toggleScoreBug(true)
                              }
                            }, 3500)
                          }, 5000)
                          toast.success('1st Half started')
                        }}
                      >
                        Start 1st Half
                      </Button>
                    )}
                    
                    {/* 1st Half: End 1st Half */}
                    {currentMatch?.period === '1st' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handlePeriodTransition('end')}
                      >
                        End 1st Half
                      </Button>
                    )}
                    
                    {/* Half Time: Start 2nd Half */}
                    {currentMatch?.period === 'ht' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-green-600 hover:bg-green-700"
                        onClick={() => handlePeriodTransition('start', '2nd')}
                      >
                        Start 2nd Half
                      </Button>
                    )}
                    
                    {/* 2nd Half: End 2nd Half -> FT */}
                    {currentMatch?.period === '2nd' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
                        onClick={() => handlePeriodTransition('end')}
                      >
                        End 2nd Half
                      </Button>
                    )}
                    
                    {/* Full Time: Multiple options based on match settings */}
                    {currentMatch?.period === 'ft' && (
                      <>
                        {/* Option to end match at FT - Requirements: 8.1 */}
                        <Button
                          size="sm"
                          className="h-9 text-sm bg-slate-600 hover:bg-slate-700"
                          onClick={() => handleEndMatchClick('ft')}
                        >
                          End Match
                        </Button>
                        {/* Option to start ET if enabled */}
                        {currentMatch?.extraTimeEnabled && (
                          <Button
                            size="sm"
                            className="h-9 text-sm bg-orange-600 hover:bg-orange-700"
                            onClick={() => handlePeriodTransition('start', 'et1')}
                          >
                            Start ET
                          </Button>
                        )}
                        {/* Option to go directly to penalties if enabled */}
                        {currentMatch?.penaltiesEnabled && (
                          <Button
                            size="sm"
                            className="h-9 text-sm bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              updateMatch({ period: 'pen' })
                              setTimerRunning(false)
                              toast.success('Penalty Shootout started')
                            }}
                          >
                            Start Penalties
                          </Button>
                        )}
                      </>
                    )}
                    
                    {/* ET1: End ET1 */}
                    {currentMatch?.period === 'et1' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handlePeriodTransition('end')}
                      >
                        End ET 1st Half
                      </Button>
                    )}
                    
                    {/* ET Half Time: Start ET2 */}
                    {currentMatch?.period === 'etht' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-orange-600 hover:bg-orange-700"
                        onClick={() => handlePeriodTransition('start', 'et2')}
                      >
                        Start ET 2nd Half
                      </Button>
                    )}
                    
                    {/* ET2: End Extra Time -> AET */}
                    {currentMatch?.period === 'et2' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
                        onClick={() => handlePeriodTransition('end')}
                      >
                        End ET 2nd Half
                      </Button>
                    )}
                    
                    {/* AET: Multiple options */}
                    {currentMatch?.period === 'aet' && (
                      <>
                        {/* Option to end match at AET - Requirements: 8.1 */}
                        <Button
                          size="sm"
                          className="h-9 text-sm bg-slate-600 hover:bg-slate-700"
                          onClick={() => handleEndMatchClick('aet')}
                        >
                          End Match
                        </Button>
                        {/* Option to start penalties if enabled */}
                        {currentMatch?.penaltiesEnabled && (
                          <Button
                            size="sm"
                            className="h-9 text-sm bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              updateMatch({ period: 'pen' })
                              setTimerRunning(false)
                              toast.success('Penalty Shootout started')
                            }}
                          >
                            Start Penalties
                          </Button>
                        )}
                      </>
                    )}
                    
                    {/* Penalties: End Match - Requirements: 8.1 */}
                    {currentMatch?.period === 'pen' && (
                      <Button
                        size="sm"
                        className="h-9 text-sm bg-slate-600 hover:bg-slate-700"
                        onClick={() => handleEndMatchClick('pen')}
                      >
                        End Match
                      </Button>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex flex-col items-center gap-1">
                    {currentMatch?.awayTeam?.logo ? (
                      <img src={currentMatch.awayTeam.logo} alt={currentMatch.awayTeam.name} className="h-44 w-44 rounded-xl object-contain bg-white p-1" />
                    ) : (
                      <div
                        className="flex h-44 w-44 items-center justify-center rounded-xl text-xl font-bold text-white text-center p-2"
                        style={{ backgroundColor: currentMatch?.awayTeam.primaryColor }}
                      >
                        {currentMatch?.awayTeam.name}
                      </div>
                    )}
                    <p className="font-semibold text-base text-center">{currentMatch?.awayTeam.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-transparent"
                      onClick={() => handleScoreChange("away", -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center text-5xl font-bold tabular-nums">
                      {currentMatch?.awayScore || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-transparent"
                      onClick={() => handleScoreChange("away", 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Penalty Shootout UI - Only show during penalty period */}
          {currentMatch?.period === 'pen' && (
            <Card className="glass-card border-red-500/50">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-red-500">Penalty Shootout</CardTitle>
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    {currentMatch?.homePenaltyScore || 0} - {currentMatch?.awayPenaltyScore || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-3">
                {/* Penalty indicators */}
                <div className="flex justify-between items-center">
                  {/* Home penalties */}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{currentMatch?.homeTeam.shortName}</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => {
                        const pen = currentMatch?.penalties?.filter(p => p.team === 'home')[i]
                        return (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              pen?.scored ? 'bg-green-500 text-white' : 
                              pen && !pen.scored ? 'bg-red-500 text-white' : 
                              'bg-muted'
                            }`}
                          >
                            {pen?.scored ? '✓' : pen && !pen.scored ? '✗' : (i + 1)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Away penalties */}
                  <div className="flex-1 text-right">
                    <p className="text-xs text-muted-foreground mb-1">{currentMatch?.awayTeam.shortName}</p>
                    <div className="flex gap-1 justify-end">
                      {[...Array(5)].map((_, i) => {
                        const pen = currentMatch?.penalties?.filter(p => p.team === 'away')[i]
                        return (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              pen?.scored ? 'bg-green-500 text-white' : 
                              pen && !pen.scored ? 'bg-red-500 text-white' : 
                              'bg-muted'
                            }`}
                          >
                            {pen?.scored ? '✓' : pen && !pen.scored ? '✗' : (i + 1)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Penalty action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-center text-muted-foreground">{currentMatch?.homeTeam.shortName}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-xs"
                        onClick={() => {
                          const newPen = {
                            id: `pen-${Date.now()}`,
                            team: 'home' as const,
                            scored: true,
                            order: (currentMatch?.penalties?.length || 0) + 1
                          }
                          updateMatch({ 
                            penalties: [...(currentMatch?.penalties || []), newPen],
                            homePenaltyScore: (currentMatch?.homePenaltyScore || 0) + 1
                          })
                          toast.success(`${currentMatch?.homeTeam.shortName} SCORED!`)
                        }}
                      >
                        Scored
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-xs"
                        onClick={() => {
                          const newPen = {
                            id: `pen-${Date.now()}`,
                            team: 'home' as const,
                            scored: false,
                            order: (currentMatch?.penalties?.length || 0) + 1
                          }
                          updateMatch({ 
                            penalties: [...(currentMatch?.penalties || []), newPen]
                          })
                          toast.error(`${currentMatch?.homeTeam.shortName} missed`)
                        }}
                      >
                        Missed
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-center text-muted-foreground">{currentMatch?.awayTeam.shortName}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-xs"
                        onClick={() => {
                          const newPen = {
                            id: `pen-${Date.now()}`,
                            team: 'away' as const,
                            scored: true,
                            order: (currentMatch?.penalties?.length || 0) + 1
                          }
                          updateMatch({ 
                            penalties: [...(currentMatch?.penalties || []), newPen],
                            awayPenaltyScore: (currentMatch?.awayPenaltyScore || 0) + 1
                          })
                          toast.success(`${currentMatch?.awayTeam.shortName} SCORED!`)
                        }}
                      >
                        Scored
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-xs"
                        onClick={() => {
                          const newPen = {
                            id: `pen-${Date.now()}`,
                            team: 'away' as const,
                            scored: false,
                            order: (currentMatch?.penalties?.length || 0) + 1
                          }
                          updateMatch({ 
                            penalties: [...(currentMatch?.penalties || []), newPen]
                          })
                          toast.error(`${currentMatch?.awayTeam.shortName} missed`)
                        }}
                      >
                        Missed
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Undo last penalty */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={!currentMatch?.penalties?.length}
                  onClick={() => {
                    const pens = [...(currentMatch?.penalties || [])]
                    const lastPen = pens.pop()
                    if (lastPen) {
                      const updates: any = { penalties: pens }
                      if (lastPen.team === 'home' && lastPen.scored) {
                        updates.homePenaltyScore = Math.max(0, (currentMatch?.homePenaltyScore || 0) - 1)
                      } else if (lastPen.team === 'away' && lastPen.scored) {
                        updates.awayPenaltyScore = Math.max(0, (currentMatch?.awayPenaltyScore || 0) - 1)
                      }
                      updateMatch(updates)
                      toast.success('Last penalty undone')
                    }
                  }}
                >
                  Undo Last Penalty
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Event Pads Grid */}
          <div className="grid grid-cols-4 gap-2">
            {eventPads.map((pad) => {
              const Icon = pad.icon
              const isGoalButton = pad.id === 'goal'
              const isGoalDisabled = isGoalButton && !pendingGoalTeam
              
              return (
                <Button
                  key={pad.id}
                  className={`h-20 flex items-center justify-start gap-4 px-4 ${pad.color} ${
                    isGoalButton && pendingGoalTeam 
                      ? 'ring-2 ring-green-500 bg-green-700 hover:bg-green-600' 
                      : ''
                  } ${isGoalDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isGoalDisabled}
                  onClick={() => {
                    if (isGoalButton && pendingGoalTeam) {
                      // Open goal modal with pending team pre-selected
                      setSelectedEventType('goal')
                      setEventModalOpen(true)
                    } else if (!isGoalButton) {
                      handleEventPadClick(pad.id as MatchEvent["type"])
                    }
                  }}
                >
                  {pad.imagePath ? (
                    <img src={getAssetPath(pad.imagePath)} alt={pad.label} className="h-10 w-10 object-contain flex-shrink-0" />
                  ) : pad.id === 'yellow' ? (
                    <div className="h-10 w-7 bg-yellow-400 flex-shrink-0 transform rotate-12" />
                  ) : pad.id === 'red' ? (
                    <div className="h-10 w-7 bg-red-600 flex-shrink-0 transform rotate-12" />
                  ) : Icon ? (
                    <Icon className={`h-8 w-8 flex-shrink-0 ${pad.iconColor || ""}`} />
                  ) : null}
                  <span className="text-lg font-semibold">
                    {isGoalButton && pendingGoalTeam 
                      ? `Goal (${pendingGoalTeam === 'home' ? currentMatch?.homeTeam.shortName : currentMatch?.awayTeam.shortName})`
                      : pad.label
                    }
                  </span>
                </Button>
              )
            })}
          </div>

          {/* Match Stats Control Panel - Compact version */}
          <div className="bg-gray-100 rounded-lg p-2 space-y-0.5 border border-gray-300">
            {/* Header Row */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
              <span>{currentMatch?.homeTeam.name || 'HOME'}</span>
              <span></span>
              <span>{currentMatch?.awayTeam.name || 'AWAY'}</span>
            </div>

            {/* Shots */}
            <StatControlRow
              label="Shots"
              homeValue={currentMatch?.homeShots || 0}
              awayValue={currentMatch?.awayShots || 0}
              onHomeChange={(delta) => updateMatch({ homeShots: Math.max(0, (currentMatch?.homeShots || 0) + delta) })}
              onAwayChange={(delta) => updateMatch({ awayShots: Math.max(0, (currentMatch?.awayShots || 0) + delta) })}
            />

            {/* Shots on Target */}
            <StatControlRow
              label="On Target"
              homeValue={currentMatch?.homeShotsOnTarget || 0}
              awayValue={currentMatch?.awayShotsOnTarget || 0}
              onHomeChange={(delta) => updateMatch({ homeShotsOnTarget: Math.max(0, (currentMatch?.homeShotsOnTarget || 0) + delta) })}
              onAwayChange={(delta) => updateMatch({ awayShotsOnTarget: Math.max(0, (currentMatch?.awayShotsOnTarget || 0) + delta) })}
            />

            {/* Fouls */}
            <StatControlRow
              label="Fouls"
              homeValue={currentMatch?.homeFouls || 0}
              awayValue={currentMatch?.awayFouls || 0}
              onHomeChange={(delta) => {
                const minFouls = homeYellows + homeReds
                const newVal = (currentMatch?.homeFouls || 0) + delta
                if (newVal >= minFouls) updateMatch({ homeFouls: newVal })
              }}
              onAwayChange={(delta) => {
                const minFouls = awayYellows + awayReds
                const newVal = (currentMatch?.awayFouls || 0) + delta
                if (newVal >= minFouls) updateMatch({ awayFouls: newVal })
              }}
            />

            {/* Yellow Cards - Read only from events */}
            <StatControlRow label="Yellow Cards" homeValue={homeYellows} awayValue={awayYellows} readOnly labelColor="bg-yellow-500 text-black" />

            {/* Red Cards - Read only from events */}
            <StatControlRow label="Red Cards" homeValue={homeReds} awayValue={awayReds} readOnly labelColor="bg-red-500 text-white" />

            {/* Offsides */}
            <StatControlRow
              label="Offsides"
              homeValue={currentMatch?.homeOffsides || 0}
              awayValue={currentMatch?.awayOffsides || 0}
              onHomeChange={(delta) => updateMatch({ homeOffsides: Math.max(0, (currentMatch?.homeOffsides || 0) + delta) })}
              onAwayChange={(delta) => updateMatch({ awayOffsides: Math.max(0, (currentMatch?.awayOffsides || 0) + delta) })}
            />

            {/* Corners */}
            <StatControlRow
              label="Corners"
              homeValue={currentMatch?.homeCorners || 0}
              awayValue={currentMatch?.awayCorners || 0}
              onHomeChange={(delta) => updateMatch({ homeCorners: Math.max(0, (currentMatch?.homeCorners || 0) + delta) })}
              onAwayChange={(delta) => updateMatch({ awayCorners: Math.max(0, (currentMatch?.awayCorners || 0) + delta) })}
            />
          </div>

          {/* Breaking Banner - Moved below stats */}
          <Card className="glass-card">
            <CardHeader className="pb-2 pt-2">
              <CardTitle className="text-sm text-red-500">Breaking Banner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-2">
              <input
                type="text"
                placeholder="Enter breaking news text..."
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md"
                value={breakingBanner?.text || ''}
                onChange={(e) => setBreakingBanner({ id: 'breaking-1', text: e.target.value, active: breakingBanner?.active || false })}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white h-8"
                  onClick={() => {
                    if (breakingBanner?.text) {
                      toggleBreakingBanner(true)
                      const { toggleBreakingBanner: toggleBB } = useGraphicsStore.getState()
                      toggleBB(true)
                      toast.success('Breaking banner pushed')
                    }
                  }}
                  disabled={!breakingBanner?.text}
                >
                  Push Breaking
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 bg-transparent h-8" 
                  onClick={() => {
                    toggleBreakingBanner(false)
                    const { toggleBreakingBanner: toggleBB } = useGraphicsStore.getState()
                    toggleBB(false)
                    toast.success('Breaking banner cleared')
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Graphics Quick Control, Match Summary & Timeline */}
        {/* Requirements: 7.2, 7.4 - Responsive layout adjustments */}
        <div className="flex-1 space-y-3 lg:space-y-4">
          {/* Graphics Quick Control Section - Large toggle buttons matching event pad size
              Green = Online/Active, Red = Offline/Inactive */}
          <Card className="glass-card py-3 gap-1">
            <CardHeader className="px-3 pb-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <img src="./graphics_control.svg" alt="Graphics Control" className="h-5 w-5 object-contain" />
                Graphics Control
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0 px-3 space-y-2">
              {/* Main Graphics - Score Bug & Lower Third */}
              <div className="rounded-xl bg-secondary/50 divide-y divide-border/30">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Score Bug</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${scoreBugVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => handleScoreBugToggle(!scoreBugVisible)}
                  >
                    {scoreBugVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Lower Third Graphics</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${matchStatsLowerThirdVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => toggleMatchStatsLowerThird(!matchStatsLowerThirdVisible)}
                  >
                    {matchStatsLowerThirdVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Event Graphics */}
              <div className="rounded-xl bg-secondary/50 divide-y divide-border/30">
                <div className={`flex items-center justify-between px-4 py-2 ${hasPendingGoal ? 'ring-2 ring-amber-500 ring-inset animate-pulse' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Goal</span>
                    {hasPendingGoal && <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 text-amber-500 border-amber-500/50">{pendingEvents.goals.length}</Badge>}
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${goalVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (goalVisible) {
                        toggleGoal(false)
                      } else {
                        hideEventGraphics()
                        setTimeout(() => {
                          toggleGoal(true)
                          markEventsAsShown('goal')
                        }, 100)
                      }
                    }}
                  >
                    {goalVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className={`flex items-center justify-between px-4 py-2 ${hasPendingCard ? 'ring-2 ring-amber-500 ring-inset animate-pulse' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Square className="h-5 w-5 text-muted-foreground fill-current" />
                    <span className="text-base font-medium">Card</span>
                    {hasPendingCard && <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 text-amber-500 border-amber-500/50">{pendingEvents.cards.length}</Badge>}
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${cardVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (cardVisible) {
                        toggleCard(false)
                      } else {
                        hideEventGraphics()
                        // Never show an "empty" card overlay.
                        // Prefer showing the most recent pending card event; otherwise open the modal to collect details.
                        const latestCardEvent = pendingEvents.cards[pendingEvents.cards.length - 1]
                        if (latestCardEvent) {
                        setTimeout(() => {
                            showEventGraphic(latestCardEvent)
                          markEventsAsShown('card')
                        }, 100)
                        } else {
                          // Open card modal (defaults to yellow) so operator selects player + team.
                          setSelectedEventType('yellow')
                          setCapturedMatchTime(matchTime)
                          setEventModalOpen(true)
                        }
                      }
                    }}
                  >
                    {cardVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className={`flex items-center justify-between px-4 py-2 ${hasPendingSub ? 'ring-2 ring-amber-500 ring-inset animate-pulse' : ''}`}>
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Substitution</span>
                    {hasPendingSub && <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 text-amber-500 border-amber-500/50">{pendingEvents.subs.length}</Badge>}
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${substitutionVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (substitutionVisible) {
                        toggleSubstitution(false)
                      } else {
                        hideEventGraphics()
                        setTimeout(() => {
                          toggleSubstitution(true)
                          markEventsAsShown('sub')
                        }, 100)
                      }
                    }}
                  >
                    {substitutionVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                {/* Match Officials */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Gavel className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Match Officials</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${matchOfficialsVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (matchOfficialsVisible) {
                        toggleMatchOfficials(false)
                      } else {
                        hideEventGraphics()
                        setTimeout(() => toggleMatchOfficials(true), 100)
                      }
                    }}
                  >
                    {matchOfficialsVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Fullscreen Graphics */}
              <div className="rounded-xl bg-secondary/50 divide-y divide-border/30">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Tv className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">VS Screen</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${vsGraphicVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => vsGraphicVisible ? toggleVSGraphic(false) : showVSGraphic(true)}
                  >
                    {vsGraphicVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Match Stats (Summary)</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${matchStatsFullScreenVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => matchStatsFullScreenVisible ? toggleMatchStatsFullScreen(false) : showMatchStatsFullScreen(true)}
                  >
                    {matchStatsFullScreenVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" style={{ color: currentMatch?.homeTeam?.primaryColor || undefined }} />
                    <span className="text-base font-medium">Home Lineup</span>
                    <span className="text-xs text-muted-foreground">({currentMatch?.homeTeam?.shortName})</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${lineupVisible && lineupTeam === 'home' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (lineupVisible && lineupTeam === 'home') {
                        toggleLineup(false)
                      } else if (lineupVisible && lineupTeam === 'away') {
                        toggleLineup(false)
                        setTimeout(() => showLineup('home'), 1200)
                      } else {
                        showLineup('home')
                      }
                    }}
                  >
                    {lineupVisible && lineupTeam === 'home' ? 'ON' : 'OFF'}
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" style={{ color: currentMatch?.awayTeam?.primaryColor || undefined }} />
                    <span className="text-base font-medium">Away Lineup</span>
                    <span className="text-xs text-muted-foreground">({currentMatch?.awayTeam?.shortName})</span>
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${lineupVisible && lineupTeam === 'away' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (lineupVisible && lineupTeam === 'away') {
                        toggleLineup(false)
                      } else if (lineupVisible && lineupTeam === 'home') {
                        toggleLineup(false)
                        setTimeout(() => showLineup('away'), 1200)
                      } else {
                        showLineup('away')
                      }
                    }}
                  >
                    {lineupVisible && lineupTeam === 'away' ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Nameplate Graphics */}
              <div className="rounded-xl bg-secondary/50 overflow-hidden">
                {/* Header row with toggle */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base font-medium">Nameplate</span>
                    {nameplateData?.playerName && (
                      <span className="text-xs text-muted-foreground">({nameplateData.playerName})</span>
                    )}
                  </div>
                  <Button
                    size="lg"
                    disabled={!wsConnected}
                    className={`h-10 px-5 text-sm font-semibold ${nameplateVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => {
                      if (nameplateVisible) {
                        toggleNameplate(false)
                      } else if (nameplateData?.playerName) {
                        hideEventGraphics()
                        setNameplateData({ team: nameplateTeam })
                        setTimeout(() => toggleNameplate(true), 100)
                      } else {
                        toast.error("Enter name first")
                      }
                    }}
                  >
                    {nameplateVisible ? 'ON' : 'OFF'}
                  </Button>
                </div>
                
                {/* Configuration panel */}
                <div className="px-4 pb-3 pt-2 border-t border-border/30 space-y-2">
                  {/* Team selector */}
                  <div className="flex gap-1">
                    <button
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                        nameplateTeam === 'home' 
                          ? 'text-white' 
                          : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                      }`}
                      style={nameplateTeam === 'home' ? { backgroundColor: currentMatch?.homeTeam?.primaryColor } : {}}
                      onClick={() => setNameplateTeam('home')}
                    >
                      {currentMatch?.homeTeam?.shortName || 'Home'}
                    </button>
                    <button
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                        nameplateTeam === 'away' 
                          ? 'text-white' 
                          : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                      }`}
                      style={nameplateTeam === 'away' ? { backgroundColor: currentMatch?.awayTeam?.primaryColor } : {}}
                      onClick={() => setNameplateTeam('away')}
                    >
                      {currentMatch?.awayTeam?.shortName || 'Away'}
                    </button>
                    <button
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                        nameplateTeam === 'neutral' 
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setNameplateTeam('neutral')}
                    >
                      Officials
                    </button>
                  </div>
                  
                  {/* Quick select dropdown */}
                  <Select
                    onValueChange={(value) => {
                      if (value.startsWith('player-')) {
                        const team = value.includes('-home-') ? 'home' : 'away'
                        const playerId = value.split('-').slice(2).join('-')
                        const lineup = team === 'home' ? currentMatch?.homeLineup : currentMatch?.awayLineup
                        const bench = team === 'home' ? currentMatch?.homeBench : currentMatch?.awayBench
                        const allPlayers = [...(lineup || []), ...(bench || [])]
                        const player = allPlayers.find(p => p.player.id === playerId)
                        if (player) {
                          setNameplateData({ 
                            playerName: player.player.name, 
                            number: String(player.player.number), 
                            position: player.player.position || '',
                            team: team
                          })
                          setNameplateTeam(team)
                        }
                      } else if (value.startsWith('coach-')) {
                        const team = value === 'coach-home' ? 'home' : 'away'
                        const teamData = team === 'home' ? currentMatch?.homeTeam : currentMatch?.awayTeam
                        setNameplateData({ 
                          playerName: teamData?.coach || 'Head Coach', 
                          number: '', 
                          position: 'Head Coach',
                          team: team
                        })
                        setNameplateTeam(team)
                      } else if (value.startsWith('official-')) {
                        const role = value.replace('official-', '')
                        const official = currentMatch?.officials?.find(o => o.role === role)
                        if (official) {
                          const roleLabels: Record<string, string> = {
                            referee: 'Referee',
                            ar1: 'Assistant Referee 1',
                            ar2: 'Assistant Referee 2',
                            fourth: 'Fourth Official',
                            var: 'VAR',
                            avar: 'Assistant VAR'
                          }
                          setNameplateData({ 
                            playerName: official.name, 
                            number: '', 
                            position: roleLabels[role] || role,
                            team: 'neutral'
                          })
                          setNameplateTeam('neutral')
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 bg-secondary/80 text-sm">
                      <SelectValue placeholder="Quick select person..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show Home Team Players & Coach when Home is selected */}
                      {nameplateTeam === 'home' && (
                        <>
                          <SelectItem value="header-home" disabled className="font-semibold text-xs opacity-60">
                            {currentMatch?.homeTeam?.name} Players
                          </SelectItem>
                          {[...(currentMatch?.homeLineup || []), ...(currentMatch?.homeBench || [])].map((lp) => (
                            <SelectItem key={`player-home-${lp.player.id}`} value={`player-home-${lp.player.id}`}>
                              #{lp.player.number} {lp.player.name}
                            </SelectItem>
                          ))}
                          {currentMatch?.homeTeam?.coach && (
                            <SelectItem value="coach-home">
                              🎯 {currentMatch.homeTeam.coach} (Coach)
                            </SelectItem>
                          )}
                        </>
                      )}
                      
                      {/* Show Away Team Players & Coach when Away is selected */}
                      {nameplateTeam === 'away' && (
                        <>
                          <SelectItem value="header-away" disabled className="font-semibold text-xs opacity-60">
                            {currentMatch?.awayTeam?.name} Players
                          </SelectItem>
                          {[...(currentMatch?.awayLineup || []), ...(currentMatch?.awayBench || [])].map((lp) => (
                            <SelectItem key={`player-away-${lp.player.id}`} value={`player-away-${lp.player.id}`}>
                              #{lp.player.number} {lp.player.name}
                            </SelectItem>
                          ))}
                          {currentMatch?.awayTeam?.coach && (
                            <SelectItem value="coach-away">
                              🎯 {currentMatch.awayTeam.coach} (Coach)
                            </SelectItem>
                          )}
                        </>
                      )}
                      
                      {/* Show Match Officials when Officials is selected */}
                      {nameplateTeam === 'neutral' && currentMatch?.officials && currentMatch.officials.length > 0 && (
                        <>
                          <SelectItem value="header-officials" disabled className="font-semibold text-xs opacity-60">
                            Match Officials
                          </SelectItem>
                          {currentMatch.officials.map((official) => (
                            <SelectItem key={`official-${official.role}`} value={`official-${official.role}`}>
                              ⚖️ {official.name} ({official.role})
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Manual entry fields */}
                  <div className="flex gap-1">
                    <Input 
                      placeholder="#" 
                      value={nameplateData?.number || ''} 
                      onChange={(e) => setNameplateData({ number: e.target.value })} 
                      className="h-8 w-14 text-center text-sm bg-secondary/80" 
                    />
                    <Input 
                      placeholder="Name" 
                      value={nameplateData?.playerName || ''} 
                      onChange={(e) => setNameplateData({ playerName: e.target.value })} 
                      className="h-8 flex-1 text-sm bg-secondary/80" 
                    />
                  </div>
                  <Input 
                    placeholder="Position / Role" 
                    value={nameplateData?.position || ''} 
                    onChange={(e) => setNameplateData({ position: e.target.value })} 
                    className="h-8 text-sm bg-secondary/80" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal 
        open={eventModalOpen} 
        onOpenChange={(open) => {
          setEventModalOpen(open)
          // Clear pending goal when modal closes
          if (!open && selectedEventType === 'goal') {
            setPendingGoalTeam(null)
          }
        }} 
        eventType={selectedEventType}
        capturedMatchTime={capturedMatchTime}
        preSelectedTeam={selectedEventType === 'goal' ? pendingGoalTeam : undefined}
      />
      
      {/* Time Edit Dialog */}
      <Dialog open={timeEditOpen} onOpenChange={setTimeEditOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Edit Match Time</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={editMins}
              onChange={(e) => {
                const val = Math.max(0, Math.min(120, parseInt(e.target.value) || 0))
                setEditMins(val)
              }}
              className="w-24 text-center text-4xl font-bold tabular-nums bg-input border border-border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield]"
            />
            <span className="text-4xl font-bold">:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={String(editSecs).padStart(2, '0')}
              onChange={(e) => {
                const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                setEditSecs(val)
              }}
              className="w-20 text-center text-4xl font-bold tabular-nums bg-input border border-border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setMatchTime(editMins * 60 + editSecs)
              setTimeEditOpen(false)
              toast.success(`Time updated to ${String(editMins).padStart(2, '0')}:${String(editSecs).padStart(2, '0')}`)
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Match Confirmation Dialog - Requirements: 8.1 */}
      <ConfirmDialog
        open={endMatchConfirmOpen}
        onOpenChange={setEndMatchConfirmOpen}
        title="End Match?"
        description={`Are you sure you want to end this match? The final score will be ${currentMatch?.homeTeam?.shortName || 'Home'} ${currentMatch?.homeScore || 0} - ${currentMatch?.awayScore || 0} ${currentMatch?.awayTeam?.shortName || 'Away'}. This action cannot be undone.`}
        onConfirm={handleConfirmEndMatch}
        confirmText="End Match"
        destructive={false}
      />

      {/* Match Completed Dialog - Requirements: 8.2, 8.3 */}
      <Dialog open={matchCompletedDialogOpen} onOpenChange={setMatchCompletedDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <DialogTitle>Match Completed</DialogTitle>
                <DialogDescription>
                  {completionPeriod === 'ft' ? 'Full Time' : 
                   completionPeriod === 'aet' ? 'After Extra Time' : 
                   completionPeriod === 'pen' ? 'After Penalties' : 'Match Ended'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Final Score Display */}
          <div className="py-4">
            <div className="flex items-center justify-center gap-4 bg-secondary/50 rounded-lg p-4">
              <div className="text-center">
                {currentMatch?.homeTeam?.logo ? (
                  <img src={currentMatch.homeTeam.logo} alt={currentMatch.homeTeam.name} className="h-12 w-12 mx-auto rounded-lg object-contain bg-white p-1 mb-2" />
                ) : (
                  <div
                    className="h-12 w-12 mx-auto rounded-lg flex items-center justify-center text-sm font-bold text-white mb-2"
                    style={{ backgroundColor: currentMatch?.homeTeam?.primaryColor }}
                  >
                    {currentMatch?.homeTeam?.shortName}
                  </div>
                )}
                <p className="text-sm font-medium">{currentMatch?.homeTeam?.shortName}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold tabular-nums">
                  {currentMatch?.homeScore || 0} - {currentMatch?.awayScore || 0}
                </p>
                {completionPeriod === 'pen' && currentMatch?.homePenaltyScore !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    ({currentMatch.homePenaltyScore} - {currentMatch.awayPenaltyScore} pen)
                  </p>
                )}
              </div>
              <div className="text-center">
                {currentMatch?.awayTeam?.logo ? (
                  <img src={currentMatch.awayTeam.logo} alt={currentMatch.awayTeam.name} className="h-12 w-12 mx-auto rounded-lg object-contain bg-white p-1 mb-2" />
                ) : (
                  <div
                    className="h-12 w-12 mx-auto rounded-lg flex items-center justify-center text-sm font-bold text-white mb-2"
                    style={{ backgroundColor: currentMatch?.awayTeam?.primaryColor }}
                  >
                    {currentMatch?.awayTeam?.shortName}
                  </div>
                )}
                <p className="text-sm font-medium">{currentMatch?.awayTeam?.shortName}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Option to return to fixture list - Requirements: 8.2 */}
            <Button
              className="flex-1 gap-2"
              onClick={() => {
                setMatchCompletedDialogOpen(false)
                setCurrentPage('fixtures')
              }}
            >
              <ListChecks className="h-4 w-4" />
              Back to Fixtures
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Events Timeline Dialog */}
      <Dialog open={eventsTimelineOpen} onOpenChange={setEventsTimelineOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Events Timeline
            </DialogTitle>
            <DialogDescription>
              View all match events. Toggle graphics or remove events.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {currentMatch?.events && currentMatch.events.length > 0 ? (
              <div className="space-y-2">
                {currentMatch.events
                  .sort((a, b) => b.minute - a.minute) // Most recent first
                  .map((event) => {
                    const isGoal = event.type === 'goal' || event.type === 'penalty-goal' || event.type === 'own-goal'
                    const isCard = event.type === 'yellow' || event.type === 'red' || event.type === 'second-yellow'
                    const isSub = event.type === 'sub'
                    
                    // Check if this event's graphic is currently showing
                    const isGraphicShowing = 
                      (isGoal && goalVisible) ||
                      (isCard && cardVisible) ||
                      (isSub && substitutionVisible)
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        {/* Event Icon */}
                        <div className="flex-shrink-0">
                          {isGoal && <Target className="h-5 w-5 text-green-500" />}
                          {event.type === 'yellow' && <div className="h-6 w-4 bg-yellow-400 transform rotate-12" />}
                          {(event.type === 'red' || event.type === 'second-yellow') && <div className="h-6 w-4 bg-red-600 transform rotate-12" />}
                          {isSub && <RefreshCw className="h-5 w-5 text-blue-500" />}
                        </div>
                        
                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{formatEventTime(event, settings.timeFormat)}</span>
                            <span className="text-sm font-medium">
                              {event.team === 'home' ? currentMatch.homeTeam.shortName : currentMatch.awayTeam.shortName}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {event.player?.name}
                            {isSub && event.secondPlayer && ` → ${event.secondPlayer.name}`}
                            {event.type === 'penalty-goal' && ' (Penalty)'}
                            {event.type === 'own-goal' && ' (Own Goal)'}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {/* ON/OFF Toggle Button */}
                          {(isGoal || isCard || isSub) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 px-3 font-semibold ${
                                isGraphicShowing 
                                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                  : 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                              }`}
                              onClick={() => {
                                if (isGraphicShowing) {
                                  // Turn OFF
                                  if (isGoal) toggleGoal(false)
                                  if (isCard) toggleCard(false)
                                  if (isSub) toggleSubstitution(false)
                                  toast.success('Graphic hidden')
                                } else {
                                  // Turn ON
                                  showEventGraphic(event)
                                  toast.success('Graphic shown')
                                }
                              }}
                            >
                              {isGraphicShowing ? 'ON' : 'OFF'}
                            </Button>
                          )}
                          
                          {/* Remove Event Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`Remove this ${event.type} event?`)) {
                                removeEvent(event.id)
                                toast.success('Event removed')
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events recorded yet</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventsTimelineOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Stat Control Row Component for Match Stats panel - Compact version
function StatControlRow({
  label,
  homeValue,
  awayValue,
  onHomeChange,
  onAwayChange,
  readOnly = false,
  labelColor,
  suffix = '',
}: {
  label: string
  homeValue: number
  awayValue: number
  onHomeChange?: (delta: number) => void
  onAwayChange?: (delta: number) => void
  readOnly?: boolean
  labelColor?: string
  suffix?: string
}) {
  return (
    <div className="grid grid-cols-3 gap-1 items-center py-1">
      {/* Home Team Controls */}
      <div className="flex items-center justify-center gap-1">
        {!readOnly && onHomeChange && (
          <button
            className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded text-xl font-bold border border-gray-300"
            onClick={() => onHomeChange(-1)}
            disabled={homeValue <= 0}
          >
            ‹
          </button>
        )}
        <span className="w-12 text-center text-lg font-bold tabular-nums bg-white rounded px-2 py-1 border border-gray-300 text-gray-800">
          {homeValue}{suffix}
        </span>
        {!readOnly && onHomeChange && (
          <button
            className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded text-xl font-bold border border-gray-300"
            onClick={() => onHomeChange(1)}
          >
            ›
          </button>
        )}
      </div>

      {/* Label */}
      <div className={`text-center text-sm font-medium px-2 py-1 rounded ${labelColor || 'text-gray-700'}`}>
        {label}
      </div>

      {/* Away Team Controls */}
      <div className="flex items-center justify-center gap-1">
        {!readOnly && onAwayChange && (
          <button
            className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded text-xl font-bold border border-gray-300"
            onClick={() => onAwayChange(-1)}
            disabled={awayValue <= 0}
          >
            ‹
          </button>
        )}
        <span className="w-12 text-center text-lg font-bold tabular-nums bg-white rounded px-2 py-1 border border-gray-300 text-gray-800">
          {awayValue}{suffix}
        </span>
        {!readOnly && onAwayChange && (
          <button
            className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded text-xl font-bold border border-gray-300"
            onClick={() => onAwayChange(1)}
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}
