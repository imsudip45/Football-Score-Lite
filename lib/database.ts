// IndexedDB Database Layer using Dexie
// This provides persistent local storage for tournaments, teams, players, etc.

import Dexie, { type Table } from "dexie"
import type { Tournament, Team, Player, Official, Match } from "./types"

// Database schema interfaces
interface DBTournament {
  id: string
  name: string
  shortName: string
  type: string
  season: string
  logo?: string
  color?: string // Tournament brand color for graphics
  country?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

interface DBTeam {
  id: string
  tournamentId?: string
  name: string
  shortName: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  defaultFormation?: string
  coach?: string
  createdAt: string
  updatedAt: string
}

interface DBPlayer {
  id: string
  teamId: string
  name: string
  shortName?: string
  number: number
  position: string
  isCaptain: boolean
  isKeeper: boolean
  photo?: string
  nationality?: string
  dateOfBirth?: string
  height?: number
  weight?: number
  preferredFoot?: string
  createdAt: string
}

interface DBOfficial {
  id: string
  name: string
  role: string
  badge?: string
  contact?: string
  photo?: string
  nationality?: string
  tournamentId?: string
  createdAt: string
}

interface DBMatch {
  id: string
  tournamentId?: string
  competition: string
  round: string
  matchDay?: number
  venue: string
  kickoff: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  period: string
  periodLength: number
  stoppageTime: number
  extraTimeVisible: boolean
  extraTimeEnabled: boolean
  penaltiesEnabled: boolean
  homeFormation?: string
  awayFormation?: string
  homeLineup: string
  awayLineup: string
  homeBench: string
  awayBench: string
  officials: string
  events: string
  status: string
  createdAt: string
  updatedAt: string
  // New fields for match persistence and recovery (Requirements 1.5, 7.1-7.7)
  matchTime?: number // Timer position in seconds
  timerRunning?: boolean // Whether timer was running at save time
  possession?: string | null // Current possession indicator ('home' | 'away' | null)
  kickoffTeam?: string | null // Selected kickoff team ('home' | 'away' | null)
  lastAutoSave?: string // Timestamp of last auto-save
  penalties?: string // JSON string of penalty kicks
  homePenaltyScore?: number
  awayPenaltyScore?: number
}


// Dexie Database class
class LocalMatchDB extends Dexie {
  tournaments!: Table<DBTournament>
  teams!: Table<DBTeam>
  players!: Table<DBPlayer>
  officials!: Table<DBOfficial>
  matches!: Table<DBMatch>

  constructor() {
    super("LocalMatchProDB")
    
    // Version 1: Initial schema
    this.version(1).stores({
      tournaments: "id, name, type, season, createdAt",
      teams: "id, tournamentId, name, shortName, createdAt",
      players: "id, teamId, name, number, position",
      officials: "id, name, role",
      matches: "id, tournamentId, homeTeamId, awayTeamId, kickoff, status",
    })
    
    // Version 2: Add match persistence fields (Requirements 1.5, 7.1-7.7)
    // New fields: matchTime, timerRunning, possession, kickoffTeam, lastAutoSave, penalties, homePenaltyScore, awayPenaltyScore
    this.version(2).stores({
      tournaments: "id, name, type, season, createdAt",
      teams: "id, tournamentId, name, shortName, createdAt",
      players: "id, teamId, name, number, position",
      officials: "id, name, role",
      matches: "id, tournamentId, homeTeamId, awayTeamId, kickoff, status, lastAutoSave",
    })

    // Version 3: Add tournamentId index for officials
    this.version(3).stores({
      tournaments: "id, name, type, season, createdAt",
      teams: "id, tournamentId, name, shortName, createdAt",
      players: "id, teamId, name, number, position",
      officials: "id, name, role, tournamentId",
      matches: "id, tournamentId, homeTeamId, awayTeamId, kickoff, status, lastAutoSave",
    })
  }
}

// Singleton database instance
let db: LocalMatchDB | null = null

function getDB(): LocalMatchDB {
  if (typeof window === "undefined") {
    throw new Error("Database can only be used on the client")
  }
  if (!db) {
    db = new LocalMatchDB()
  }
  return db
}

// ============================================
// TOURNAMENT OPERATIONS
// ============================================

export async function createTournament(
  tournament: Omit<Tournament, "createdAt" | "updatedAt" | "teams" | "matches">
): Promise<Tournament> {
  const database = getDB()
  const now = new Date().toISOString()

  const dbTournament: DBTournament = {
    id: tournament.id,
    name: tournament.name,
    shortName: tournament.shortName,
    type: tournament.type,
    season: tournament.season,
    logo: tournament.logo,
    color: tournament.color,
    country: tournament.country,
    startDate: tournament.startDate?.toISOString(),
    endDate: tournament.endDate?.toISOString(),
    createdAt: now,
    updatedAt: now,
  }

  await database.tournaments.add(dbTournament)
  return { ...tournament, teams: [], matches: [], createdAt: new Date(now), updatedAt: new Date(now) }
}

export async function getTournaments(): Promise<Tournament[]> {
  const database = getDB()
  const tournaments = await database.tournaments.orderBy("createdAt").reverse().toArray()

  const result: Tournament[] = []
  for (const t of tournaments) {
    // Get team IDs for this tournament
    const teamIds = (await database.teams.where("tournamentId").equals(t.id).toArray()).map((team) => team.id)
    // Get match IDs for this tournament
    const matchIds = (await database.matches.where("tournamentId").equals(t.id).toArray()).map((match) => match.id)
    
    result.push({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      type: t.type as Tournament["type"],
      season: t.season,
      logo: t.logo,
      color: t.color,
      country: t.country,
      startDate: t.startDate ? new Date(t.startDate) : undefined,
      endDate: t.endDate ? new Date(t.endDate) : undefined,
      teams: teamIds,
      matches: matchIds,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })
  }
  
  return result
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const database = getDB()
  const t = await database.tournaments.get(id)
  if (!t) return null

  const teamIds = (await database.teams.where("tournamentId").equals(id).toArray()).map((team) => team.id)
  const matchIds = (await database.matches.where("tournamentId").equals(id).toArray()).map((match) => match.id)

  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    type: t.type as Tournament["type"],
    season: t.season,
    logo: t.logo,
    color: t.color,
    country: t.country,
    startDate: t.startDate ? new Date(t.startDate) : undefined,
    endDate: t.endDate ? new Date(t.endDate) : undefined,
    teams: teamIds,
    matches: matchIds,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  }
}

export async function updateTournament(id: string, updates: Partial<Tournament>): Promise<void> {
  const database = getDB()
  const updateData: Partial<DBTournament> = { updatedAt: new Date().toISOString() }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.shortName !== undefined) updateData.shortName = updates.shortName
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.season !== undefined) updateData.season = updates.season
  if (updates.logo !== undefined) updateData.logo = updates.logo
  if (updates.color !== undefined) updateData.color = updates.color
  if (updates.country !== undefined) updateData.country = updates.country

  await database.tournaments.update(id, updateData)
}

export async function deleteTournament(id: string): Promise<void> {
  const database = getDB()
  await database.tournaments.delete(id)
}


// ============================================
// TEAM OPERATIONS
// ============================================

export async function createTeam(
  team: Omit<Team, "players" | "createdAt" | "updatedAt">,
  tournamentId?: string
): Promise<Team> {
  const database = getDB()
  const now = new Date().toISOString()

  const dbTeam: DBTeam = {
    id: team.id,
    tournamentId,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    defaultFormation: team.defaultFormation,
    coach: team.coach,
    createdAt: now,
    updatedAt: now,
  }

  await database.teams.add(dbTeam)
  return { ...team, players: [], createdAt: new Date(now), updatedAt: new Date(now) }
}

export async function getTeams(tournamentId?: string): Promise<Team[]> {
  const database = getDB()
  let teams: DBTeam[]

  if (tournamentId) {
    teams = await database.teams.where("tournamentId").equals(tournamentId).sortBy("name")
  } else {
    teams = await database.teams.orderBy("name").toArray()
  }

  const result: Team[] = []
  for (const t of teams) {
    const players = await database.players.where("teamId").equals(t.id).sortBy("number")
    result.push({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logo: t.logo,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      defaultFormation: t.defaultFormation as Team["defaultFormation"],
      coach: t.coach,
      tournamentId: t.tournamentId,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        number: p.number,
        position: p.position as Player["position"],
        isCaptain: p.isCaptain,
        isKeeper: p.isKeeper,
        photo: p.photo,
        nationality: p.nationality,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
        height: p.height,
        weight: p.weight,
        preferredFoot: p.preferredFoot as Player["preferredFoot"],
      })),
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })
  }

  return result
}

export async function getTeam(id: string): Promise<Team | null> {
  const database = getDB()
  const t = await database.teams.get(id)
  if (!t) return null

  const players = await database.players.where("teamId").equals(id).sortBy("number")

  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logo: t.logo,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    defaultFormation: t.defaultFormation as Team["defaultFormation"],
    coach: t.coach,
    tournamentId: t.tournamentId,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      number: p.number,
      position: p.position as Player["position"],
      isCaptain: p.isCaptain,
      isKeeper: p.isKeeper,
      photo: p.photo,
      nationality: p.nationality,
    })),
  }
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<void> {
  const database = getDB()
  const updateData: Partial<DBTeam> = { updatedAt: new Date().toISOString() }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.shortName !== undefined) updateData.shortName = updates.shortName
  if (updates.logo !== undefined) updateData.logo = updates.logo
  if (updates.primaryColor !== undefined) updateData.primaryColor = updates.primaryColor
  if (updates.secondaryColor !== undefined) updateData.secondaryColor = updates.secondaryColor
  if (updates.defaultFormation !== undefined) updateData.defaultFormation = updates.defaultFormation
  if (updates.coach !== undefined) updateData.coach = updates.coach

  await database.teams.update(id, updateData)
}

export async function deleteTeam(id: string): Promise<void> {
  const database = getDB()
  await database.players.where("teamId").equals(id).delete()
  await database.teams.delete(id)
}


// ============================================
// PLAYER OPERATIONS
// ============================================

export async function addPlayer(teamId: string, player: Player): Promise<void> {
  const database = getDB()

  const dbPlayer: DBPlayer = {
    id: player.id,
    teamId,
    name: player.name,
    shortName: player.shortName,
    number: player.number,
    position: player.position,
    isCaptain: player.isCaptain || false,
    isKeeper: player.isKeeper || false,
    photo: player.photo,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth?.toISOString(),
    height: player.height,
    weight: player.weight,
    preferredFoot: player.preferredFoot,
    createdAt: new Date().toISOString(),
  }

  await database.players.add(dbPlayer)
}

export async function addPlayersFromCSV(teamId: string, players: Player[]): Promise<number> {
  const database = getDB()
  let count = 0

  for (const player of players) {
    try {
      const dbPlayer: DBPlayer = {
        id: player.id,
        teamId,
        name: player.name,
        shortName: player.shortName,
        number: player.number,
        position: player.position,
        isCaptain: player.isCaptain || false,
        isKeeper: player.isKeeper || false,
        photo: player.photo,
        nationality: player.nationality,
        dateOfBirth: player.dateOfBirth?.toISOString(),
        height: player.height,
        weight: player.weight,
        preferredFoot: player.preferredFoot,
        createdAt: new Date().toISOString(),
      }
      // Use put() instead of add() to upsert (update if exists, insert if not)
      await database.players.put(dbPlayer)
      count++
    } catch (e) {
      console.error("Error adding player:", player.name, e)
    }
  }

  return count
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const database = getDB()
  const updateData: Partial<DBPlayer> = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.shortName !== undefined) updateData.shortName = updates.shortName
  if (updates.number !== undefined) updateData.number = updates.number
  if (updates.position !== undefined) updateData.position = updates.position
  if (updates.isCaptain !== undefined) updateData.isCaptain = updates.isCaptain
  if (updates.isKeeper !== undefined) updateData.isKeeper = updates.isKeeper
  if (updates.photo !== undefined) updateData.photo = updates.photo
  if (updates.nationality !== undefined) updateData.nationality = updates.nationality

  await database.players.update(id, updateData)
}

export async function deletePlayer(id: string): Promise<void> {
  const database = getDB()
  await database.players.delete(id)
}

export async function deleteAllPlayersFromTeam(teamId: string): Promise<void> {
  const database = getDB()
  await database.players.where("teamId").equals(teamId).delete()
}

// ============================================
// OFFICIAL OPERATIONS
// ============================================

export async function createOfficial(official: Official): Promise<void> {
  const database = getDB()

  const dbOfficial: DBOfficial = {
    id: official.id,
    name: official.name,
    role: official.role,
    badge: official.badge,
    contact: official.contact,
    photo: official.photo,
    nationality: official.nationality,
    tournamentId: official.tournamentId,
    createdAt: new Date().toISOString(),
  }

  await database.officials.add(dbOfficial)
}

export async function getOfficials(tournamentId?: string): Promise<Official[]> {
  const database = getDB()
  let officials: DBOfficial[]

  if (tournamentId) {
    // Include "global" officials (no tournamentId) as well, so officials created/imported
    // without a tournament selection don't appear to "disappear" when a tournament is selected.
    //
    // NOTE: IndexedDB keys cannot be `undefined`, and attempting to query undefined/null via
    // IDBKeyRange will throw. So we query the selected tournament via index, and fetch the
    // "global" ones via a filter, then merge.
    const [scoped, global] = await Promise.all([
      database.officials.where("tournamentId").equals(tournamentId).toArray(),
      database.officials.filter((o) => !o.tournamentId).toArray(),
    ])

    const mergedById = new Map<string, DBOfficial>()
    for (const o of [...scoped, ...global]) mergedById.set(o.id, o)
    officials = Array.from(mergedById.values()).sort((a, b) => a.name.localeCompare(b.name))
  } else {
    officials = await database.officials.orderBy("name").toArray()
  }

  return officials.map((o) => ({
    id: o.id,
    name: o.name,
    role: o.role as Official["role"],
    badge: o.badge,
    contact: o.contact,
    photo: o.photo,
    nationality: o.nationality,
    tournamentId: o.tournamentId,
  }))
}

export async function addOfficialsFromCSV(officials: Official[]): Promise<number> {
  const database = getDB()
  let count = 0

  for (const official of officials) {
    try {
      const dbOfficial: DBOfficial = {
        id: official.id,
        name: official.name,
        role: official.role,
        badge: official.badge,
        contact: official.contact,
        photo: official.photo,
        nationality: official.nationality,
        createdAt: new Date().toISOString(),
      }
      await database.officials.add(dbOfficial)
      count++
    } catch (e) {
      console.error("Error adding official:", official.name, e)
    }
  }

  return count
}

export async function deleteOfficial(id: string): Promise<void> {
  const database = getDB()
  await database.officials.delete(id)
}

export async function updateOfficial(id: string, updates: Partial<Official>): Promise<void> {
  const database = getDB()
  const existing = await database.officials.get(id)
  if (existing) {
    await database.officials.put({
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
    })
  }
}


// ============================================
// MATCH OPERATIONS
// ============================================

export async function createMatch(match: Match): Promise<void> {
  const database = getDB()
  const now = new Date().toISOString()
  
  // Ensure kickoff is a Date object (might be string from localStorage)
  const kickoffDate = match.kickoff instanceof Date ? match.kickoff : new Date(match.kickoff)

  const dbMatch: DBMatch = {
    id: match.id,
    tournamentId: match.tournamentId,
    competition: match.competition,
    round: match.round,
    matchDay: match.matchDay,
    venue: match.venue,
    kickoff: kickoffDate.toISOString(),
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    period: match.period,
    periodLength: match.periodLength,
    stoppageTime: match.stoppageTime,
    extraTimeVisible: match.extraTimeVisible || false,
    extraTimeEnabled: match.extraTimeEnabled,
    penaltiesEnabled: match.penaltiesEnabled,
    homeFormation: match.homeFormation,
    awayFormation: match.awayFormation,
    homeLineup: JSON.stringify(match.homeLineup),
    awayLineup: JSON.stringify(match.awayLineup),
    homeBench: JSON.stringify(match.homeBench),
    awayBench: JSON.stringify(match.awayBench),
    officials: JSON.stringify(match.officials),
    events: JSON.stringify(match.events),
    status: match.status,
    createdAt: now,
    updatedAt: now,
    // New persistence fields (Requirements 1.5, 7.1-7.7)
    matchTime: 0,
    timerRunning: false,
    possession: match.kickoffTeam || null,
    kickoffTeam: match.kickoffTeam || null,
    lastAutoSave: now,
    penalties: JSON.stringify(match.penalties || []),
    homePenaltyScore: match.homePenaltyScore || 0,
    awayPenaltyScore: match.awayPenaltyScore || 0,
  }

  // Use put() instead of add() to handle duplicate IDs gracefully (upsert)
  await database.matches.put(dbMatch)
}

/**
 * Normalize events to ensure all have required fields
 * Adds default 'second: 0' to events that don't have it (for backward compatibility)
 * Requirements: 1.3 - Ensure all events have minute and second values
 */
function normalizeEvents(events: any[]): any[] {
  return events.map(event => ({
    ...event,
    second: event.second !== undefined ? event.second : 0,
  }))
}

export async function getMatches(tournamentId?: string): Promise<Match[]> {
  const database = getDB()
  let dbMatches: DBMatch[]

  if (tournamentId) {
    dbMatches = await database.matches.where("tournamentId").equals(tournamentId).reverse().sortBy("kickoff")
  } else {
    dbMatches = await database.matches.orderBy("kickoff").reverse().toArray()
  }

  const matches: Match[] = []
  for (const m of dbMatches) {
    const homeTeam = await getTeam(m.homeTeamId)
    const awayTeam = await getTeam(m.awayTeamId)
    if (!homeTeam || !awayTeam) continue

    // Look up tournament color and logo if match has a tournament
    let tournamentColor: string | undefined
    let competitionLogo: string | undefined
    if (m.tournamentId) {
      const tournament = await database.tournaments.get(m.tournamentId)
      tournamentColor = tournament?.color
      competitionLogo = tournament?.logo
    }

    // Parse events and normalize to ensure 'second' field exists
    const rawEvents = JSON.parse(m.events || "[]")
    const normalizedEvents = normalizeEvents(rawEvents)

    matches.push({
      id: m.id,
      tournamentId: m.tournamentId,
      tournamentColor,
      competitionLogo,
      competition: m.competition,
      round: m.round,
      matchDay: m.matchDay,
      venue: m.venue,
      kickoff: new Date(m.kickoff),
      homeTeam,
      awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      period: m.period as Match["period"],
      periodLength: m.periodLength,
      stoppageTime: m.stoppageTime,
      extraTimeVisible: m.extraTimeVisible || false,
      extraTimeEnabled: m.extraTimeEnabled,
      penaltiesEnabled: m.penaltiesEnabled,
      kickoffTeam: (m.kickoffTeam as Match["kickoffTeam"]) || null,
      homeFormation: m.homeFormation as Match["homeFormation"],
      awayFormation: m.awayFormation as Match["awayFormation"],
      homeLineup: JSON.parse(m.homeLineup || "[]"),
      awayLineup: JSON.parse(m.awayLineup || "[]"),
      homeBench: JSON.parse(m.homeBench || "[]"),
      awayBench: JSON.parse(m.awayBench || "[]"),
      officials: JSON.parse(m.officials || "[]"),
      events: normalizedEvents,
      penalties: JSON.parse(m.penalties || "[]"),
      homePenaltyScore: m.homePenaltyScore || 0,
      awayPenaltyScore: m.awayPenaltyScore || 0,
      status: m.status as Match["status"],
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })
  }

  return matches
}

export async function updateMatch(id: string, updates: Partial<Match>): Promise<void> {
  const database = getDB()
  const updateData: Partial<DBMatch> = { updatedAt: new Date().toISOString() }

  if (updates.homeScore !== undefined) updateData.homeScore = updates.homeScore
  if (updates.awayScore !== undefined) updateData.awayScore = updates.awayScore
  if (updates.period !== undefined) updateData.period = updates.period
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.homeFormation !== undefined) updateData.homeFormation = updates.homeFormation
  if (updates.awayFormation !== undefined) updateData.awayFormation = updates.awayFormation
  if (updates.homeLineup !== undefined) updateData.homeLineup = JSON.stringify(updates.homeLineup)
  if (updates.awayLineup !== undefined) updateData.awayLineup = JSON.stringify(updates.awayLineup)
  if (updates.homeBench !== undefined) updateData.homeBench = JSON.stringify(updates.homeBench)
  if (updates.awayBench !== undefined) updateData.awayBench = JSON.stringify(updates.awayBench)
  if (updates.officials !== undefined) updateData.officials = JSON.stringify(updates.officials)
  if (updates.events !== undefined) updateData.events = JSON.stringify(updates.events)

  await database.matches.update(id, updateData)
}

export async function deleteMatch(id: string): Promise<void> {
  const database = getDB()
  await database.matches.delete(id)
}

// ============================================
// MATCH PERSISTENCE & RECOVERY OPERATIONS
// ============================================

/**
 * Get all matches with 'live' status (for recovery detection)
 * Requirements: 2.1
 */
export async function getInterruptedMatches(): Promise<Match[]> {
  const database = getDB()
  const dbMatches = await database.matches.where("status").equals("live").toArray()

  const matches: Match[] = []
  for (const m of dbMatches) {
    const homeTeam = await getTeam(m.homeTeamId)
    const awayTeam = await getTeam(m.awayTeamId)
    if (!homeTeam || !awayTeam) continue

    // Look up tournament color and logo if match has a tournament
    let tournamentColor: string | undefined
    let competitionLogo: string | undefined
    if (m.tournamentId) {
      const tournament = await database.tournaments.get(m.tournamentId)
      tournamentColor = tournament?.color
      competitionLogo = tournament?.logo
    }

    // Parse events and normalize to ensure 'second' field exists
    const rawEvents = JSON.parse(m.events || "[]")
    const normalizedEvents = normalizeEvents(rawEvents)

    matches.push({
      id: m.id,
      tournamentId: m.tournamentId,
      tournamentColor,
      competitionLogo,
      competition: m.competition,
      round: m.round,
      matchDay: m.matchDay,
      venue: m.venue,
      kickoff: new Date(m.kickoff),
      homeTeam,
      awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      period: m.period as Match["period"],
      periodLength: m.periodLength,
      stoppageTime: m.stoppageTime,
      extraTimeVisible: m.extraTimeVisible || false,
      extraTimeEnabled: m.extraTimeEnabled,
      penaltiesEnabled: m.penaltiesEnabled,
      kickoffTeam: (m.kickoffTeam as Match["kickoffTeam"]) || null,
      homeFormation: m.homeFormation as Match["homeFormation"],
      awayFormation: m.awayFormation as Match["awayFormation"],
      homeLineup: JSON.parse(m.homeLineup || "[]"),
      awayLineup: JSON.parse(m.awayLineup || "[]"),
      homeBench: JSON.parse(m.homeBench || "[]"),
      awayBench: JSON.parse(m.awayBench || "[]"),
      officials: JSON.parse(m.officials || "[]"),
      events: normalizedEvents,
      penalties: JSON.parse(m.penalties || "[]"),
      homePenaltyScore: m.homePenaltyScore || 0,
      awayPenaltyScore: m.awayPenaltyScore || 0,
      status: m.status as Match["status"],
      // Include timer state for recovery (Requirements 7.2, 7.3)
      matchTime: m.matchTime || 0,
      timerRunning: m.timerRunning || false,
      possession: (m.possession as Match["possession"]) || null,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })
  }

  return matches
}

/**
 * Save full match state for auto-save (Requirements 1.1, 1.5)
 * Updates existing match record in IndexedDB with complete state
 */
export async function saveMatchState(match: Match): Promise<void> {
  const database = getDB()
  const now = new Date().toISOString()

  const updateData: Partial<DBMatch> = {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    period: match.period,
    stoppageTime: match.stoppageTime,
    extraTimeVisible: match.extraTimeVisible,
    homeFormation: match.homeFormation,
    awayFormation: match.awayFormation,
    homeLineup: JSON.stringify(match.homeLineup),
    awayLineup: JSON.stringify(match.awayLineup),
    homeBench: JSON.stringify(match.homeBench),
    awayBench: JSON.stringify(match.awayBench),
    officials: JSON.stringify(match.officials),
    events: JSON.stringify(match.events),
    penalties: JSON.stringify(match.penalties || []),
    homePenaltyScore: match.homePenaltyScore || 0,
    awayPenaltyScore: match.awayPenaltyScore || 0,
    status: match.status,
    // Timer and control state (Requirements 7.1-7.7)
    matchTime: match.matchTime || 0,
    timerRunning: match.timerRunning || false,
    possession: match.possession || null,
    kickoffTeam: match.kickoffTeam || null,
    lastAutoSave: now,
    updatedAt: now,
  }

  await database.matches.update(match.id, updateData)
}

/**
 * Mark match as abandoned (Requirements 2.5, 6.5)
 * Preserves last known score and events
 */
export async function abandonMatch(id: string): Promise<void> {
  const database = getDB()
  const now = new Date().toISOString()

  await database.matches.update(id, {
    status: "abandoned",
    timerRunning: false,
    updatedAt: now,
  })
}

/**
 * Mark match as completed (Requirements 8.2, 8.3)
 * Updates status and saves final score
 */
export async function completeMatch(
  id: string,
  finalScore: { home: number; away: number }
): Promise<void> {
  const database = getDB()
  const now = new Date().toISOString()

  await database.matches.update(id, {
    status: "completed",
    homeScore: finalScore.home,
    awayScore: finalScore.away,
    timerRunning: false,
    updatedAt: now,
  })
}

/**
 * Fixture list item for tournament view
 */
export interface FixtureListItem {
  id: string
  homeTeam: { name: string; shortName: string; logo?: string }
  awayTeam: { name: string; shortName: string; logo?: string }
  kickoff: Date
  venue: string
  round: string
  status: "draft" | "ready" | "live" | "completed" | "abandoned"
  hasLineups: boolean
  homeScore?: number
  awayScore?: number
}

/**
 * Get fixtures for a tournament with status calculation (Requirements 3.1, 3.2, 3.3)
 */
export async function getTournamentFixtures(
  tournamentId: string
): Promise<FixtureListItem[]> {
  const database = getDB()
  const dbMatches = await database.matches
    .where("tournamentId")
    .equals(tournamentId)
    .sortBy("kickoff")

  const fixtures: FixtureListItem[] = []
  for (const m of dbMatches) {
    const homeTeam = await getTeam(m.homeTeamId)
    const awayTeam = await getTeam(m.awayTeamId)
    if (!homeTeam || !awayTeam) continue

    // Calculate status based on match state
    let status: FixtureListItem["status"]
    if (m.status === "completed") {
      status = "completed"
    } else if (m.status === "abandoned") {
      status = "abandoned"
    } else if (m.status === "live") {
      status = "live"
    } else {
      // Check if lineups are configured (11 players each)
      const homeLineup = JSON.parse(m.homeLineup || "[]")
      const awayLineup = JSON.parse(m.awayLineup || "[]")
      const hasLineups = homeLineup.length >= 11 && awayLineup.length >= 11
      status = hasLineups ? "ready" : "draft"
    }

    // Check if lineups are configured
    const homeLineup = JSON.parse(m.homeLineup || "[]")
    const awayLineup = JSON.parse(m.awayLineup || "[]")
    const hasLineups = homeLineup.length >= 11 && awayLineup.length >= 11

    fixtures.push({
      id: m.id,
      homeTeam: {
        name: homeTeam.name,
        shortName: homeTeam.shortName,
        logo: homeTeam.logo,
      },
      awayTeam: {
        name: awayTeam.name,
        shortName: awayTeam.shortName,
        logo: awayTeam.logo,
      },
      kickoff: new Date(m.kickoff),
      venue: m.venue,
      round: m.round,
      status,
      hasLineups,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    })
  }

  return fixtures
}

export async function clearDatabase(): Promise<void> {
  const database = getDB()
  await database.matches.clear()
  await database.players.clear()
  await database.teams.clear()
  await database.officials.clear()
  await database.tournaments.clear()
}

export async function exportDatabase(): Promise<string> {
  const database = getDB()
  const data = {
    tournaments: await database.tournaments.toArray(),
    teams: await database.teams.toArray(),
    players: await database.players.toArray(),
    officials: await database.officials.toArray(),
    matches: await database.matches.toArray(),
  }
  return JSON.stringify(data)
}

export async function importDatabase(jsonData: string): Promise<void> {
  const database = getDB()
  const data = JSON.parse(jsonData)

  await clearDatabase()

  if (data.tournaments) await database.tournaments.bulkAdd(data.tournaments)
  if (data.teams) await database.teams.bulkAdd(data.teams)
  if (data.players) await database.players.bulkAdd(data.players)
  if (data.officials) await database.officials.bulkAdd(data.officials)
  if (data.matches) await database.matches.bulkAdd(data.matches)
}

// ============================================
// STORAGE MANAGEMENT OPERATIONS
// Requirements: 12.3 - Provide UI to clear old matches
// ============================================

/**
 * Get storage usage statistics
 * @returns Object with counts and estimated storage usage
 */
export async function getStorageStats(): Promise<{
  matchCount: number
  completedMatchCount: number
  abandonedMatchCount: number
  liveMatchCount: number
  draftMatchCount: number
  teamCount: number
  playerCount: number
  tournamentCount: number
}> {
  const database = getDB()
  
  const matches = await database.matches.toArray()
  const completedMatches = matches.filter(m => m.status === "completed")
  const abandonedMatches = matches.filter(m => m.status === "abandoned")
  const liveMatches = matches.filter(m => m.status === "live")
  const draftMatches = matches.filter(m => m.status === "draft" || m.status === "ready")
  
  return {
    matchCount: matches.length,
    completedMatchCount: completedMatches.length,
    abandonedMatchCount: abandonedMatches.length,
    liveMatchCount: liveMatches.length,
    draftMatchCount: draftMatches.length,
    teamCount: await database.teams.count(),
    playerCount: await database.players.count(),
    tournamentCount: await database.tournaments.count(),
  }
}

/**
 * Clear old completed matches to free up storage
 * Requirements: 12.3 - Provide UI to clear old matches
 * 
 * @param olderThanDays - Delete matches completed more than this many days ago
 * @returns Number of matches deleted
 */
export async function clearOldMatches(olderThanDays: number = 30): Promise<number> {
  const database = getDB()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const matches = await database.matches.toArray()
  const oldMatches = matches.filter(m => {
    // Only delete completed or abandoned matches
    if (m.status !== "completed" && m.status !== "abandoned") {
      return false
    }
    // Check if older than cutoff
    const updatedAt = new Date(m.updatedAt)
    return updatedAt < cutoffDate
  })
  
  // Delete old matches
  const idsToDelete = oldMatches.map(m => m.id)
  await database.matches.bulkDelete(idsToDelete)
  
  return idsToDelete.length
}

/**
 * Clear all completed matches
 * Requirements: 12.3 - Provide UI to clear old matches
 * 
 * @returns Number of matches deleted
 */
export async function clearCompletedMatches(): Promise<number> {
  const database = getDB()
  const matches = await database.matches.where("status").equals("completed").toArray()
  const idsToDelete = matches.map(m => m.id)
  await database.matches.bulkDelete(idsToDelete)
  return idsToDelete.length
}

/**
 * Clear all abandoned matches
 * Requirements: 12.3 - Provide UI to clear old matches
 * 
 * @returns Number of matches deleted
 */
export async function clearAbandonedMatches(): Promise<number> {
  const database = getDB()
  const matches = await database.matches.where("status").equals("abandoned").toArray()
  const idsToDelete = matches.map(m => m.id)
  await database.matches.bulkDelete(idsToDelete)
  return idsToDelete.length
}
