"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"
import type {
  Match,
  NavigationPage,
  GraphicRenderer,
  TickerItem,
  Team,
  Official,
  MatchEvent,
  BreakingBanner,
  LowerThirdPreset,
  MatchPreset,
  AppSettings,
  Asset,
  LineupPlayer,
  SportType,
} from "./types"
import { getSportConfig } from "./sport-config"

interface HistoryState {
  match: Match | null
  events: MatchEvent[]
}

interface AppState {
  sportType: SportType | null
  setSportType: (sport: SportType) => void
  getSportConfig: () => ReturnType<typeof getSportConfig>

  // Navigation
  currentPage: NavigationPage
  sidebarCollapsed: boolean
  setCurrentPage: (page: NavigationPage) => void
  toggleSidebar: () => void

  // Match state
  currentMatch: Match | null
  setCurrentMatch: (match: Match | null) => void
  updateMatch: (updates: Partial<Match>) => void
  createNewMatch: () => void

  // Timer
  timerRunning: boolean
  matchTime: number
  setTimerRunning: (running: boolean) => void
  setMatchTime: (time: number) => void

  // Teams
  teams: Team[]
  addTeam: (team: Team) => void
  updateTeam: (id: string, updates: Partial<Team>) => void
  deleteTeam: (id: string) => void

  // Officials
  officials: Official[]
  addOfficial: (official: Official) => void
  updateOfficial: (id: string, updates: Partial<Official>) => void
  assignOfficialToMatch: (officialId: string, role: Official["role"], officialData?: Official) => void
  removeOfficialFromMatch: (role: Official["role"]) => void

  // Graphics
  renderers: GraphicRenderer[]
  updateRenderer: (id: string, updates: Partial<GraphicRenderer>) => void

  // Ticker
  tickerItems: TickerItem[]
  addTickerItem: (item: TickerItem) => void
  updateTickerItem: (id: string, updates: Partial<TickerItem>) => void
  removeTickerItem: (id: string) => void
  reorderTickerItems: (items: TickerItem[]) => void

  // Breaking Banner
  breakingBanner: BreakingBanner | null
  setBreakingBanner: (banner: BreakingBanner | null) => void
  toggleBreakingBanner: (active: boolean) => void

  // Lower Thirds
  activeLowerThird: LowerThirdPreset | null
  setActiveLowerThird: (preset: LowerThirdPreset | null) => void
  pushLowerThird: () => void
  clearLowerThird: () => void

  // Events
  addEvent: (event: MatchEvent) => void
  removeEvent: (id: string) => void
  updateEvent: (id: string, updates: Partial<MatchEvent>) => void

  // History (Undo/Redo)
  history: HistoryState[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Lineups
  updateLineup: (team: "home" | "away", lineup: LineupPlayer[]) => void
  updateBench: (team: "home" | "away", bench: LineupPlayer[]) => void
  promoteFromBench: (team: "home" | "away", playerId: string) => void
  demoteToBench: (team: "home" | "away", playerId: string) => void
  updatePlayerNumber: (teamId: string, playerId: string, number: number) => void
  toggleCaptain: (teamId: string, playerId: string) => void

  // Presets
  matchPresets: MatchPreset[]
  saveMatchPreset: (preset: MatchPreset) => void
  loadMatchPreset: (id: string) => void
  deleteMatchPreset: (id: string) => void

  // Assets
  assets: Asset[]
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void

  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void

  // WebSocket status
  wsConnected: boolean
  setWsConnected: (connected: boolean) => void

  // Possession
  possession: "home" | "away" | null
  setPossession: (team: "home" | "away" | null) => void

  // Sync status
  lastSyncTime: Date | null
  lastPushedGraphic: string | null
  setLastSyncTime: (time: Date) => void
  setLastPushedGraphic: (graphic: string) => void

  // Football Graphics Data
  goalData: { playerName: string; playerNumber: string; goalTime: string; isOwnGoal: boolean; isPenalty: boolean; teamColor: string; teamLogo?: string; team?: 'home' | 'away'; tournamentColor?: string }
  cardData: { playerName: string; playerNumber: string; cardType: 'yellow' | 'red'; cardTime: string; teamColor: string; teamLogo?: string; team?: 'home' | 'away' }
  subData: { playerIn: string; playerOut: string; numberIn: string; numberOut: string; teamColor: string; teamLogo?: string; team?: 'home' | 'away' }
  nameplateData: { playerName: string; position: string; number: string; teamColor: string; teamLogo?: string; team?: 'home' | 'away' | 'neutral' }
  lineupData: { team: 'home' | 'away'; teamName: string; teamColor: string; teamLogo?: string; formation: string; players: Array<{ number: number; name: string; shortName?: string; position: { x: number; y: number }; photo?: string }>; subs: Array<{ num: number; name: string }>; coach: string }
  setGoalData: (data: Partial<AppState['goalData']>) => void
  setCardData: (data: Partial<AppState['cardData']>) => void
  setSubData: (data: Partial<AppState['subData']>) => void
  setNameplateData: (data: Partial<AppState['nameplateData']>) => void
  setLineupData: (data: Partial<AppState['lineupData']>) => void

  // Workflow Progress
  workflowProgress: {
    tournamentSelected: boolean
    fixtureCreated: boolean
    matchSetupCompleted: boolean
    officialsAssigned: boolean
    lineupsConfigured: boolean
  }
  selectedTournamentId: string | null
  setSelectedTournament: (id: string | null) => void
  completeWorkflowStep: (step: keyof AppState['workflowProgress']) => void
  resetWorkflow: () => void
  canAccessPage: (page: NavigationPage) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sportType: null,
      setSportType: (sport) => {
        const config = getSportConfig(sport)
        set({ sportType: sport })
        // Update current match period length based on sport
        const { currentMatch } = get()
        if (currentMatch) {
          set({
            currentMatch: {
              ...currentMatch,
              periodLength: config.defaultPeriodLength,
            },
          })
        }
      },
      getSportConfig: () => {
        const { sportType } = get()
        return getSportConfig(sportType || "football")
      },

      // Navigation
      currentPage: "tournaments",
      sidebarCollapsed: false,
      setCurrentPage: (page) => set({ currentPage: page }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Match state
      currentMatch: null,
      setCurrentMatch: (match) => set({ currentMatch: match }),
      updateMatch: (updates) => {
        const { currentMatch } = get()
        if (!currentMatch) return
        const updatedMatch = { ...currentMatch, ...updates, updatedAt: new Date() }
        set({ currentMatch: updatedMatch })
        // Auto-save score and period changes to database
        if (typeof window !== 'undefined' && (updates.homeScore !== undefined || updates.awayScore !== undefined || updates.period !== undefined || updates.status !== undefined)) {
          import('./database').then(({ updateMatch: dbUpdateMatch }) => {
            dbUpdateMatch(currentMatch.id, updates).catch((error) => {
              console.error('[Store] Failed to save match update:', error)
              toast.error('Failed to save changes', {
                description: 'Your changes may not be persisted. Please try again.',
                duration: 5000,
              })
            })
          }).catch((error) => {
            console.error('[Store] Failed to load database module:', error)
          })
        }
      },
      createNewMatch: () => {
        const { teams, sportType } = get()
        const config = getSportConfig(sportType || "football")
        const newMatch: Match = {
          id: `match-${Date.now()}`,
          competition: "",
          round: "",
          venue: "",
          kickoff: new Date(),
          homeTeam: teams[0],
          awayTeam: teams[1],
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
          periodLength: config.defaultPeriodLength, // Use sport-specific default
          stoppageTime: 0,
          extraTimeVisible: false,
          kickoffTeam: null,
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
          status: "draft",
        }
        set({ currentMatch: newMatch })
      },

      // Timer
      timerRunning: false,
      matchTime: 0,
      setTimerRunning: (running) => {
        set({ timerRunning: running })

        if (!running) return

        const { currentMatch, updateMatch } = get()
        if (!currentMatch) return

        // Recovery modal relies on status === 'live'.
        // If the user starts the timer from a draft/ready state, ensure the match is marked live.
        if (
          currentMatch.status !== "live" &&
          currentMatch.status !== "completed" &&
          currentMatch.status !== "abandoned"
        ) {
          updateMatch({ status: "live" })
        }
      },
      setMatchTime: (time) => set({ matchTime: time }),

      // Teams
      teams: [],
      addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),
      updateTeam: (id, updates) =>
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTeam: (id) =>
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== id),
        })),

      // Officials
      officials: [],
      addOfficial: (official) => set((state) => ({ officials: [...state.officials, official] })),
      updateOfficial: (id, updates) =>
        set((state) => ({
          officials: state.officials.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),
      assignOfficialToMatch: (officialId, role, officialData?: Official) => {
        const { officials, currentMatch } = get()
        // First try to find in store, then use provided data
        let official = officials.find((o) => o.id === officialId)
        if (!official && officialData) {
          official = officialData
        }
        if (!official || !currentMatch) return

        const updatedOfficials = currentMatch.officials.filter((o) => o.role !== role)
        updatedOfficials.push({ ...official, role })

        set({
          currentMatch: { ...currentMatch, officials: updatedOfficials },
        })
      },
      removeOfficialFromMatch: (role) => {
        const { currentMatch } = get()
        if (!currentMatch) return

        set({
          currentMatch: {
            ...currentMatch,
            officials: currentMatch.officials.filter((o) => o.role !== role),
          },
        })
      },

      // Graphics
      renderers: [],
      updateRenderer: (id, updates) =>
        set((state) => ({
          renderers: state.renderers.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      // Ticker
      tickerItems: [],
      addTickerItem: (item) => set((state) => ({ tickerItems: [...state.tickerItems, item] })),
      updateTickerItem: (id, updates) =>
        set((state) => ({
          tickerItems: state.tickerItems.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTickerItem: (id) => set((state) => ({ tickerItems: state.tickerItems.filter((t) => t.id !== id) })),
      reorderTickerItems: (items) => set({ tickerItems: items }),

      // Breaking Banner
      breakingBanner: null,
      setBreakingBanner: (banner) => set({ breakingBanner: banner }),
      toggleBreakingBanner: (active) =>
        set((state) => ({
          breakingBanner: state.breakingBanner ? { ...state.breakingBanner, active } : null,
        })),

      // Lower Thirds
      activeLowerThird: null,
      setActiveLowerThird: (preset) => set({ activeLowerThird: preset }),
      pushLowerThird: () => {
        const { activeLowerThird, setLastPushedGraphic } = get()
        if (activeLowerThird) {
          setLastPushedGraphic(`Lower Third: ${activeLowerThird.title}`)
        }
      },
      clearLowerThird: () => set({ activeLowerThird: null }),

      // Events
      addEvent: (event) => {
        const { currentMatch, pushHistory } = get()
        if (!currentMatch) return
        pushHistory()
        const updatedMatch = {
          ...currentMatch,
          events: [...currentMatch.events, event],
          updatedAt: new Date(),
        }
        set({ currentMatch: updatedMatch })
        // Auto-save to database
        if (typeof window !== 'undefined') {
          import('./database').then(({ updateMatch }) => {
            updateMatch(currentMatch.id, { events: updatedMatch.events }).catch((error) => {
              console.error('[Store] Failed to save event:', error)
              toast.error('Failed to save event', {
                description: 'The event was recorded locally but may not be persisted.',
                duration: 5000,
              })
            })
          }).catch((error) => {
            console.error('[Store] Failed to load database module:', error)
          })
        }
      },
      removeEvent: (id) => {
        const { currentMatch, pushHistory } = get()
        if (!currentMatch) return
        pushHistory()
        
        // Find the event being removed to potentially adjust score
        const eventToRemove = currentMatch.events.find(e => e.id === id)
        let scoreUpdates: Partial<Match> = {}
        
        if (eventToRemove) {
          // Reverse score changes for goal events
          if (eventToRemove.type === 'goal' || eventToRemove.type === 'penalty-goal') {
            const scoreKey = eventToRemove.team === 'home' ? 'homeScore' : 'awayScore'
            scoreUpdates = { [scoreKey]: Math.max(0, (currentMatch[scoreKey] || 0) - 1) }
          } else if (eventToRemove.type === 'own-goal') {
            const scoreKey = eventToRemove.team === 'home' ? 'awayScore' : 'homeScore'
            scoreUpdates = { [scoreKey]: Math.max(0, (currentMatch[scoreKey] || 0) - 1) }
          }
        }
        
        const updatedMatch = {
          ...currentMatch,
          ...scoreUpdates,
          events: currentMatch.events.filter((e) => e.id !== id),
          updatedAt: new Date(),
        }
        set({ currentMatch: updatedMatch })
        // Auto-save to database
        if (typeof window !== 'undefined') {
          import('./database').then(({ updateMatch }) => {
            updateMatch(currentMatch.id, { 
              events: updatedMatch.events,
              ...scoreUpdates
            }).catch((error) => {
              console.error('[Store] Failed to save event removal:', error)
              toast.error('Failed to save changes', {
                description: 'The event was removed locally but may not be persisted.',
                duration: 5000,
              })
            })
          }).catch((error) => {
            console.error('[Store] Failed to load database module:', error)
          })
        }
      },
      updateEvent: (id, updates) => {
        const { currentMatch } = get()
        if (!currentMatch) return
        const updatedMatch = {
          ...currentMatch,
          events: currentMatch.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          updatedAt: new Date(),
        }
        set({ currentMatch: updatedMatch })
        // Auto-save to database
        if (typeof window !== 'undefined') {
          import('./database').then(({ updateMatch }) => {
            updateMatch(currentMatch.id, { events: updatedMatch.events }).catch((error) => {
              console.error('[Store] Failed to save event update:', error)
              toast.error('Failed to save changes', {
                description: 'The event was updated locally but may not be persisted.',
                duration: 5000,
              })
            })
          }).catch((error) => {
            console.error('[Store] Failed to load database module:', error)
          })
        }
      },

      // History
      history: [],
      historyIndex: -1,
      pushHistory: () => {
        const { currentMatch, history, historyIndex } = get()
        if (!currentMatch) return

        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({
          match: { ...currentMatch },
          events: [...currentMatch.events],
        })

        // Keep max 50 history items
        if (newHistory.length > 50) newHistory.shift()

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
      },
      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex <= 0) return

        const newIndex = historyIndex - 1
        const prevState = history[newIndex]

        set({
          currentMatch: prevState.match,
          historyIndex: newIndex,
        })
      },
      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex >= history.length - 1) return

        const newIndex = historyIndex + 1
        const nextState = history[newIndex]

        set({
          currentMatch: nextState.match,
          historyIndex: newIndex,
        })
      },

      // Lineups
      updateLineup: (team, lineup) => {
        const { currentMatch } = get()
        if (!currentMatch) return
        set({
          currentMatch: {
            ...currentMatch,
            [team === "home" ? "homeLineup" : "awayLineup"]: lineup,
          },
        })
      },
      updateBench: (team, bench) => {
        const { currentMatch } = get()
        if (!currentMatch) return
        set({
          currentMatch: {
            ...currentMatch,
            [team === "home" ? "homeBench" : "awayBench"]: bench,
          },
        })
      },
      promoteFromBench: (team, playerId) => {
        const { currentMatch, sportType } = get()
        if (!currentMatch) return

        const config = getSportConfig(sportType || "football")
        const benchKey = team === "home" ? "homeBench" : "awayBench"
        const lineupKey = team === "home" ? "homeLineup" : "awayLineup"
        const bench = currentMatch[benchKey]
        const lineup = currentMatch[lineupKey]

        const playerIndex = bench.findIndex((p) => p.player.id === playerId)
        if (playerIndex === -1 || lineup.length >= config.maxLineupSize) return

        const [player] = bench.splice(playerIndex, 1)
        lineup.push({ ...player, position: lineup.length + 1 })

        set({
          currentMatch: {
            ...currentMatch,
            [benchKey]: [...bench],
            [lineupKey]: [...lineup],
          },
        })
      },
      demoteToBench: (team, playerId) => {
        const { currentMatch } = get()
        if (!currentMatch) return

        const benchKey = team === "home" ? "homeBench" : "awayBench"
        const lineupKey = team === "home" ? "homeLineup" : "awayLineup"
        const bench = currentMatch[benchKey]
        const lineup = currentMatch[lineupKey]

        const playerIndex = lineup.findIndex((p) => p.player.id === playerId)
        if (playerIndex === -1) return

        const [player] = lineup.splice(playerIndex, 1)
        bench.push({ ...player, position: bench.length + 12 })

        set({
          currentMatch: {
            ...currentMatch,
            [benchKey]: [...bench],
            [lineupKey]: [...lineup],
          },
        })
      },
      updatePlayerNumber: (teamId, playerId, number) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  players: team.players.map((p) => (p.id === playerId ? { ...p, number } : p)),
                }
              : team,
          ),
        }))
      },
      toggleCaptain: (teamId, playerId) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  players: team.players.map((p) => ({
                    ...p,
                    isCaptain: p.id === playerId ? !p.isCaptain : false,
                  })),
                }
              : team,
          ),
        }))
      },

      // Presets
      matchPresets: [],
      saveMatchPreset: (preset) => set((state) => ({ matchPresets: [...state.matchPresets, preset] })),
      loadMatchPreset: (id) => {
        const { matchPresets, currentMatch } = get()
        const preset = matchPresets.find((p) => p.id === id)
        if (!preset || !currentMatch) return

        set({
          currentMatch: {
            ...currentMatch,
            competition: preset.competition,
            round: preset.round,
            venue: preset.venue,
            periodLength: preset.periodLength,
            stoppageTime: preset.stoppageTime,
            extraTimeEnabled: preset.extraTimeEnabled,
            penaltiesEnabled: preset.penaltiesEnabled,
          },
        })
      },
      deleteMatchPreset: (id) =>
        set((state) => ({
          matchPresets: state.matchPresets.filter((p) => p.id !== id),
        })),

      // Assets
      assets: [],
      addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      deleteAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
        })),

      // Settings
      settings: {
        storagePath: "", // Will be set by Electron's app.getPath('userData') at runtime
        autosaveInterval: 30,
        obsHost: "localhost",
        obsPort: 3001,
        autoReconnect: true,
        language: "en",
        highContrastMode: false,
        timeFormat: "MM'", // Default to MM' for backward compatibility (Requirements 11.5)
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      // WebSocket status
      wsConnected: true,
      setWsConnected: (connected) => set({ wsConnected: connected }),

      // Possession
      possession: null,
      setPossession: (team) => set({ possession: team }),

      // Sync status
      lastSyncTime: null,
      lastPushedGraphic: null,
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setLastPushedGraphic: (graphic) => set({ lastPushedGraphic: graphic, lastSyncTime: new Date() }),

      // Football Graphics Data
      goalData: { playerName: '', playerNumber: '', goalTime: '', isOwnGoal: false, isPenalty: false, teamColor: '#c8102e', teamLogo: '', team: 'home' },
      cardData: { playerName: '', playerNumber: '', cardType: 'yellow', cardTime: '', teamColor: '#c8102e', teamLogo: '', team: 'home' },
      subData: { playerIn: '', playerOut: '', numberIn: '', numberOut: '', teamColor: '#c8102e', teamLogo: '', team: 'home' },
      nameplateData: { playerName: '', position: '', number: '', teamColor: '#c8102e', teamLogo: '', team: 'home' },
      lineupData: { team: 'home', teamName: '', teamColor: '#c8102e', formation: '4-3-3', players: [], subs: [], coach: '' },
      setGoalData: (data) => set((state) => ({ goalData: { ...state.goalData, ...data } })),
      setCardData: (data) => set((state) => ({ cardData: { ...state.cardData, ...data } })),
      setSubData: (data) => set((state) => ({ subData: { ...state.subData, ...data } })),
      setNameplateData: (data) => set((state) => ({ nameplateData: { ...state.nameplateData, ...data } })),
      setLineupData: (data) => set((state) => ({ lineupData: { ...state.lineupData, ...data } })),

      // Workflow Progress
      workflowProgress: {
        tournamentSelected: false,
        fixtureCreated: false,
        matchSetupCompleted: false,
        officialsAssigned: false,
        lineupsConfigured: false,
      },
      selectedTournamentId: null,
      setSelectedTournament: (id) => set({ 
        selectedTournamentId: id,
        workflowProgress: { 
          tournamentSelected: !!id,
          fixtureCreated: false,
          matchSetupCompleted: false,
          officialsAssigned: false,
          lineupsConfigured: false,
        }
      }),
      completeWorkflowStep: (step) => set((state) => ({
        workflowProgress: { ...state.workflowProgress, [step]: true }
      })),
      resetWorkflow: () => set({
        workflowProgress: {
          tournamentSelected: false,
          fixtureCreated: false,
          matchSetupCompleted: false,
          officialsAssigned: false,
          lineupsConfigured: false,
        },
        selectedTournamentId: null,
      }),
      canAccessPage: (page) => {
        const { workflowProgress } = get()
        
        // Always accessible pages
        if (['dashboard', 'tournaments', 'teams', 'settings', 'assets'].includes(page)) {
          return true
        }
        
        // Workflow-dependent pages
        if (page === 'fixtures') return workflowProgress.tournamentSelected
        if (page === 'lineup-setup') return workflowProgress.fixtureCreated
        if (page === 'live-control' || page === 'graphics-output' || page === 'football-graphics') {
          return workflowProgress.lineupsConfigured
        }
        
        return true // Default allow
      },
    }),
    {
      name: "localmatch-pro-storage",
      partialize: (state) => ({
        sportType: state.sportType, // Persist sport type
        currentMatch: state.currentMatch, // Persist current match with team data
        teams: state.teams,
        officials: state.officials,
        matchPresets: state.matchPresets,
        assets: state.assets,
        settings: state.settings,
        tickerItems: state.tickerItems,
        matchTime: state.matchTime, // Persist match time
        workflowProgress: state.workflowProgress, // Persist workflow progress
        selectedTournamentId: state.selectedTournamentId,
      }),
    },
  ),
)
