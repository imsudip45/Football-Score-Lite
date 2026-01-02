// Core data types for LocalMatch Pro

export type SportType = "football" | "futsal"

export interface SportConfig {
  type: SportType
  name: string
  icon: string
  minLineupSize: number
  maxLineupSize: number
  defaultPeriodLength: number
  periods: number
  extraTimePeriodLength: number
  positions: string[]
}

// ============================================
// TOURNAMENT / COMPETITION
// ============================================

export type TournamentType = "league" | "cup" | "friendly" | "tournament"

export interface Tournament {
  id: string
  name: string
  shortName: string
  type: TournamentType
  season: string
  logo?: string
  color?: string // Tournament/league brand color for graphics
  country?: string
  startDate?: Date
  endDate?: Date
  teams: string[] // Team IDs
  matches: string[] // Match IDs
  createdAt: Date
  updatedAt: Date
}

// ============================================
// FORMATION
// ============================================

export type FormationType = 
  | "4-4-2" | "4-3-3" | "4-2-3-1" | "4-1-4-1" | "4-5-1"
  | "3-5-2" | "3-4-3" | "5-3-2" | "5-4-1"
  | "4-4-1-1" | "4-3-2-1" | "3-4-2-1" | "4-1-2-1-2" | "3-3-4"
  // Futsal formations
  | "1-2-1" | "2-2" | "1-1-2" | "3-1"

export interface FormationPosition {
  id: string
  x: number // 0-100 percentage
  y: number // 0-100 percentage
  role: string // e.g., "GK", "CB", "LB", "CM", etc.
}

export interface Formation {
  id: string
  name: FormationType
  positions: FormationPosition[]
  sport: SportType
}

// ============================================
// TEAM & PLAYER (Enhanced)
// ============================================

export interface Team {
  id: string
  name: string
  shortName: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  players: Player[]
  defaultFormation?: FormationType
  coach?: string
  tournamentId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Player {
  id: string
  name: string
  shortName?: string // Optional short name for graphics (e.g., "MESSI" instead of "Lionel Messi")
  number: number
  position: "GK" | "DEF" | "MID" | "FWD" | "PIVOT" | "FIXO" | "ALA"
  isCaptain?: boolean
  isKeeper?: boolean
  // Enhanced fields
  photo?: string
  nationality?: string
  dateOfBirth?: Date
  height?: number
  weight?: number
  preferredFoot?: "left" | "right" | "both"
}

// ============================================
// OFFICIALS (Enhanced)
// ============================================

export interface Official {
  id: string
  name: string
  role: "referee" | "ar1" | "ar2" | "fourth"
  badge?: string
  contact?: string
  // Enhanced fields
  photo?: string
  nationality?: string
  tournamentId?: string
}

export interface Match {
  id: string
  tournamentId?: string
  tournamentColor?: string // Tournament brand color for graphics
  competition: string
  competitionShortName?: string
  competitionLogo?: string
  round: string
  matchDay?: number
  venue: string
  kickoff: Date
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  homeFouls: number
  awayFouls: number
  // Extended match stats
  homeShots: number
  awayShots: number
  homeShotsOnTarget: number
  awayShotsOnTarget: number
  homePossession: number
  awayPossession: number
  homeOffsides: number
  awayOffsides: number
  homeCorners: number
  awayCorners: number
  period: "pre" | "1st" | "ht" | "2nd" | "ft" | "et1" | "etht" | "et2" | "aet" | "pen"
  periodLength: number
  stoppageTime: number
  extraTimeVisible: boolean
  kickoffTeam?: "home" | "away" | null
  extraTimeEnabled: boolean
  penaltiesEnabled: boolean
  penalties: PenaltyKick[]
  homePenaltyScore: number
  awayPenaltyScore: number
  homeLineup: LineupPlayer[]
  awayLineup: LineupPlayer[]
  homeBench: LineupPlayer[]
  awayBench: LineupPlayer[]
  homeFormation?: FormationType
  awayFormation?: FormationType
  officials: Official[]
  events: MatchEvent[]
  status: "draft" | "live" | "completed" | "abandoned"
  createdAt?: Date
  updatedAt?: Date
  // Match persistence fields (Requirements 1.5, 7.1-7.7)
  matchTime?: number // Timer position in seconds
  timerRunning?: boolean // Whether timer was running at save time
  possession?: "home" | "away" | null // Current possession indicator
}

export interface LineupPlayer {
  player: Player
  position: number
}

export interface PenaltyKick {
  id: string
  team: "home" | "away"
  playerNumber?: string
  playerName?: string
  scored: boolean
  order: number
}

export interface MatchEvent {
  id: string
  type:
    | "goal"
    | "own-goal"
    | "penalty-goal"
    | "penalty-miss"
    | "yellow"
    | "red"
    | "second-yellow"
    | "sub"
    | "kickoff"
    | "halftime"
    | "fulltime"
    | "added-time"
  team: "home" | "away"
  minute: number
  second: number // Seconds component (0-59) for precise event timing
  stoppageMinute?: number
  player?: Player
  secondPlayer?: Player
  note?: string
  timestamp: Date
}

export interface GraphicRenderer {
  id: string
  name: string
  type: "scorebug" | "lowerthird" | "ticker" | "breaking" | "preview"
  status: "online" | "offline" | "armed"
  resolution: "720p" | "1080p"
  lastPayload?: string
  url: string
}

export interface TickerItem {
  id: string
  primary: string
  secondary?: string
  priority: number
}

export interface BreakingBanner {
  id: string
  text: string
  active: boolean
}

export interface Asset {
  id: string
  type: "logo" | "overlay" | "sponsor"
  name: string
  url: string
  colors?: string[]
}

export interface LowerThirdPreset {
  id: string
  type: "coach" | "motm" | "referee" | "custom"
  title: string
  subtitle?: string
  teamId?: string
}

export interface MatchPreset {
  id: string
  name: string
  competition: string
  round: string
  venue: string
  periodLength: number
  stoppageTime: number
  extraTimeVisible: boolean
  extraTimeEnabled: boolean
  penaltiesEnabled: boolean
}

export interface AppSettings {
  storagePath: string
  autosaveInterval: number
  obsHost: string
  obsPort: number
  autoReconnect: boolean
  language: string
  highContrastMode: boolean
  timeFormat: 'MM:SS' | "MM'" // Event time display format (Requirements 11.5)
}

export type NavigationPage =
  | "tournaments"
  | "teams"
  | "fixtures"
  | "lineup-setup"
  | "live-control"
  | "football-graphics"
  | "graphics"
  | "graphics-customization"
  | "graphics-output"
  | "assets"
  | "settings"

// ============================================
// CSV IMPORT TYPES
// ============================================

export interface PlayerCSVRow {
  number: number
  name: string
  position: string
  nationality?: string
  photo?: string
  dateOfBirth?: string
  height?: number
  weight?: number
}

export interface OfficialCSVRow {
  name: string
  role: string
  nationality?: string
  photo?: string
  badge?: string
}
