// CSV Import/Export Utilities

import type { Player, Official, PlayerCSVRow, OfficialCSVRow } from './types'

// Parse CSV string to array of objects
export function parseCSV<T>(csvString: string): T[] {
  const lines = csvString.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows: T[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue
    
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || ''
    })
    rows.push(obj as T)
  }
  
  return rows
}

// Parse a single CSV line (handles quoted values with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

// Convert CSV rows to Player objects
export function csvToPlayers(rows: PlayerCSVRow[]): Player[] {
  return rows.map((row, index) => ({
    id: `player-${Date.now()}-${index}`,
    name: row.name || '',
    number: Number(row.number) || index + 1,
    position: normalizePosition(row.position),
    isCaptain: false,
    isKeeper: normalizePosition(row.position) === 'GK',
    photo: row.photo || undefined,
    nationality: row.nationality || undefined,
    dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
    height: row.height ? Number(row.height) : undefined,
    weight: row.weight ? Number(row.weight) : undefined,
  }))
}

// Convert CSV rows to Official objects
export function csvToOfficials(rows: OfficialCSVRow[]): Official[] {
  return rows.map((row, index) => ({
    id: `official-${Date.now()}-${index}`,
    name: row.name || '',
    role: normalizeOfficialRole(row.role),
    badge: row.badge || undefined,
    photo: row.photo || undefined,
    nationality: row.nationality || undefined,
  }))
}

// Normalize position string to valid position type
function normalizePosition(pos: string): Player['position'] {
  const normalized = pos?.toUpperCase().trim()
  
  const positionMap: Record<string, Player['position']> = {
    'GK': 'GK', 'GOALKEEPER': 'GK', 'KEEPER': 'GK', 'G': 'GK',
    'DEF': 'DEF', 'DEFENDER': 'DEF', 'D': 'DEF', 'CB': 'DEF', 'LB': 'DEF', 'RB': 'DEF', 'FB': 'DEF',
    'MID': 'MID', 'MIDFIELDER': 'MID', 'M': 'MID', 'CM': 'MID', 'CDM': 'MID', 'CAM': 'MID', 'LM': 'MID', 'RM': 'MID',
    'FWD': 'FWD', 'FORWARD': 'FWD', 'F': 'FWD', 'ST': 'FWD', 'CF': 'FWD', 'LW': 'FWD', 'RW': 'FWD', 'ATT': 'FWD', 'ATTACKER': 'FWD',
    // Futsal
    'PIVOT': 'PIVOT', 'FIXO': 'FIXO', 'ALA': 'ALA',
  }
  
  return positionMap[normalized] || 'MID'
}

// Normalize official role
function normalizeOfficialRole(role: string): Official['role'] {
  const normalized = role?.toLowerCase().trim()
  
  const roleMap: Record<string, Official['role']> = {
    'referee': 'referee', 'ref': 'referee', 'main': 'referee',
    'ar1': 'ar1', 'assistant1': 'ar1', 'linesman1': 'ar1',
    'ar2': 'ar2', 'assistant2': 'ar2', 'linesman2': 'ar2',
    'fourth': 'fourth', '4th': 'fourth', 'fourth official': 'fourth',
    'var': 'var', 'video': 'var',
    'avar': 'avar', 'assistant var': 'avar',
  }
  
  return roleMap[normalized] || 'referee'
}

// Generate sample CSV template for players
export function getPlayerCSVTemplate(): string {
  return `number,name,position,nationality,photo
1,John Smith,GK,England,https://example.com/photo1.jpg
2,David Jones,DEF,Wales,
3,Michael Brown,DEF,Scotland,
4,James Wilson,MID,England,
5,Robert Taylor,MID,Ireland,
6,William Davis,FWD,England,`
}

// Generate sample CSV template for officials
export function getOfficialCSVTemplate(): string {
  return `name,role,nationality,photo,badge
John Referee,referee,England,,FIFA
Mike Assistant,ar1,Wales,,
Steve Linesman,ar2,Scotland,,`
}

// Export players to CSV
export function playersToCSV(players: Player[]): string {
  const headers = ['number', 'name', 'position', 'nationality', 'photo']
  const rows = players.map(p => [
    p.number,
    `"${p.name}"`,
    p.position,
    p.nationality || '',
    p.photo || ''
  ].join(','))
  
  return [headers.join(','), ...rows].join('\n')
}

// Export officials to CSV
export function officialsToCSV(officials: Official[]): string {
  const headers = ['name', 'role', 'nationality', 'photo', 'badge']
  const rows = officials.map(o => [
    `"${o.name}"`,
    o.role,
    o.nationality || '',
    o.photo || '',
    o.badge || ''
  ].join(','))
  
  return [headers.join(','), ...rows].join('\n')
}
