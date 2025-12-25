// Football Formation Definitions
// Positions are defined as percentages (0-100) for x and y coordinates
// x: 0 = left, 100 = right (from team's perspective attacking right)
// y: 0 = top (goal line), 100 = bottom (attacking direction)

import type { Formation, FormationType, FormationPosition } from './types'

// Standard football formations
// Player cards are ~15% of height, need ~18% gap between rows
// 3-layer: GK(75) -> DEF(55) -> MID(32) -> ATK(8)
// 4-layer: GK(75) -> DEF(57) -> CDM(42) -> CAM(25) -> ST(8)
export const footballFormations: Record<string, Formation> = {
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 55, role: 'LB' },
      { id: 'cb1', x: 45, y: 55, role: 'CB' },
      { id: 'cb2', x: 66, y: 55, role: 'CB' },
      { id: 'rb', x: 90, y: 55, role: 'RB' },
      { id: 'lm', x: 23, y: 32, role: 'LM' },
      { id: 'cm1', x: 45, y: 32, role: 'CM' },
      { id: 'cm2', x: 66, y: 32, role: 'CM' },
      { id: 'rm', x: 90, y: 32, role: 'RM' },
      { id: 'st1', x: 45, y: 8, role: 'ST' },
      { id: 'st2', x: 66, y: 8, role: 'ST' },
    ]
  },
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 55, role: 'LB' },
      { id: 'cb1', x: 45, y: 55, role: 'CB' },
      { id: 'cb2', x: 66, y: 55, role: 'CB' },
      { id: 'rb', x: 90, y: 55, role: 'RB' },
      { id: 'cm1', x: 35, y: 32, role: 'CM' },
      { id: 'cm2', x: 56, y: 32, role: 'CDM' },
      { id: 'cm3', x: 77, y: 32, role: 'CM' },
      { id: 'lw', x: 35, y: 8, role: 'LW' },
      { id: 'st', x: 56, y: 8, role: 'ST' },
      { id: 'rw', x: 77, y: 8, role: 'RW' },
    ]
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1',
    sport: 'football',
    // 4 layers evenly spaced: ST(2) -> CAM(20) -> CDM(38) -> DEF(56)
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 56, role: 'LB' },
      { id: 'cb1', x: 45, y: 56, role: 'CB' },
      { id: 'cb2', x: 66, y: 56, role: 'CB' },
      { id: 'rb', x: 90, y: 56, role: 'RB' },
      { id: 'cdm1', x: 45, y: 38, role: 'CDM' },
      { id: 'cdm2', x: 66, y: 38, role: 'CDM' },
      { id: 'lam', x: 31, y: 20, role: 'LAM' },
      { id: 'cam', x: 56, y: 20, role: 'CAM' },
      { id: 'ram', x: 81, y: 20, role: 'RAM' },
      { id: 'st', x: 56, y: 2, role: 'ST' },
    ]
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'cb1', x: 35, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 77, y: 55, role: 'CB' },
      { id: 'lwb', x: 20, y: 32, role: 'LWB' },
      { id: 'cm1', x: 38, y: 32, role: 'CM' },
      { id: 'cdm', x: 56, y: 32, role: 'CDM' },
      { id: 'cm2', x: 74, y: 32, role: 'CM' },
      { id: 'rwb', x: 92, y: 32, role: 'RWB' },
      { id: 'st1', x: 45, y: 8, role: 'ST' },
      { id: 'st2', x: 66, y: 8, role: 'ST' },
    ]
  },
  '5-3-2': {
    id: '5-3-2',
    name: '5-3-2',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lwb', x: 16, y: 55, role: 'LWB' },
      { id: 'cb1', x: 36, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 76, y: 55, role: 'CB' },
      { id: 'rwb', x: 96, y: 55, role: 'RWB' },
      { id: 'cm1', x: 35, y: 32, role: 'CM' },
      { id: 'cm2', x: 56, y: 32, role: 'CM' },
      { id: 'cm3', x: 77, y: 32, role: 'CM' },
      { id: 'st1', x: 45, y: 8, role: 'ST' },
      { id: 'st2', x: 66, y: 8, role: 'ST' },
    ]
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    name: '4-1-4-1',
    sport: 'football',
    // 4 layers evenly spaced: ST(2) -> MID(20) -> CDM(38) -> DEF(56)
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 56, role: 'LB' },
      { id: 'cb1', x: 45, y: 56, role: 'CB' },
      { id: 'cb2', x: 66, y: 56, role: 'CB' },
      { id: 'rb', x: 90, y: 56, role: 'RB' },
      { id: 'cdm', x: 56, y: 38, role: 'CDM' },
      { id: 'lm', x: 23, y: 20, role: 'LM' },
      { id: 'cm1', x: 45, y: 20, role: 'CM' },
      { id: 'cm2', x: 66, y: 20, role: 'CM' },
      { id: 'rm', x: 90, y: 20, role: 'RM' },
      { id: 'st', x: 56, y: 2, role: 'ST' },
    ]
  },
  '3-4-3': {
    id: '3-4-3',
    name: '3-4-3',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'cb1', x: 35, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 77, y: 55, role: 'CB' },
      { id: 'lm', x: 23, y: 32, role: 'LM' },
      { id: 'cm1', x: 45, y: 32, role: 'CM' },
      { id: 'cm2', x: 66, y: 32, role: 'CM' },
      { id: 'rm', x: 90, y: 32, role: 'RM' },
      { id: 'lw', x: 35, y: 8, role: 'LW' },
      { id: 'st', x: 56, y: 8, role: 'ST' },
      { id: 'rw', x: 77, y: 8, role: 'RW' },
    ]
  },
  '4-5-1': {
    id: '4-5-1',
    name: '4-5-1',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 55, role: 'LB' },
      { id: 'cb1', x: 45, y: 55, role: 'CB' },
      { id: 'cb2', x: 66, y: 55, role: 'CB' },
      { id: 'rb', x: 90, y: 55, role: 'RB' },
      { id: 'lm', x: 20, y: 32, role: 'LM' },
      { id: 'cm1', x: 38, y: 32, role: 'CM' },
      { id: 'cm2', x: 56, y: 32, role: 'CM' },
      { id: 'cm3', x: 74, y: 32, role: 'CM' },
      { id: 'rm', x: 92, y: 32, role: 'RM' },
      { id: 'st', x: 56, y: 8, role: 'ST' },
    ]
  },
  '5-4-1': {
    id: '5-4-1',
    name: '5-4-1',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lwb', x: 16, y: 55, role: 'LWB' },
      { id: 'cb1', x: 36, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 76, y: 55, role: 'CB' },
      { id: 'rwb', x: 96, y: 55, role: 'RWB' },
      { id: 'lm', x: 23, y: 32, role: 'LM' },
      { id: 'cm1', x: 45, y: 32, role: 'CM' },
      { id: 'cm2', x: 66, y: 32, role: 'CM' },
      { id: 'rm', x: 90, y: 32, role: 'RM' },
      { id: 'st', x: 56, y: 8, role: 'ST' },
    ]
  },
  '4-4-1-1': {
    id: '4-4-1-1',
    name: '4-4-1-1',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 56, role: 'LB' },
      { id: 'cb1', x: 45, y: 56, role: 'CB' },
      { id: 'cb2', x: 66, y: 56, role: 'CB' },
      { id: 'rb', x: 90, y: 56, role: 'RB' },
      { id: 'lm', x: 23, y: 38, role: 'LM' },
      { id: 'cm1', x: 45, y: 38, role: 'CM' },
      { id: 'cm2', x: 66, y: 38, role: 'CM' },
      { id: 'rm', x: 90, y: 38, role: 'RM' },
      { id: 'cam', x: 56, y: 20, role: 'CAM' },
      { id: 'st', x: 56, y: 2, role: 'ST' },
    ]
  },
  '4-3-2-1': {
    id: '4-3-2-1',
    name: '4-3-2-1',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 56, role: 'LB' },
      { id: 'cb1', x: 45, y: 56, role: 'CB' },
      { id: 'cb2', x: 66, y: 56, role: 'CB' },
      { id: 'rb', x: 90, y: 56, role: 'RB' },
      { id: 'cm1', x: 35, y: 38, role: 'CM' },
      { id: 'cm2', x: 56, y: 38, role: 'CM' },
      { id: 'cm3', x: 77, y: 38, role: 'CM' },
      { id: 'lam', x: 40, y: 20, role: 'LAM' },
      { id: 'ram', x: 72, y: 20, role: 'RAM' },
      { id: 'st', x: 56, y: 2, role: 'ST' },
    ]
  },
  '3-4-2-1': {
    id: '3-4-2-1',
    name: '3-4-2-1',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'cb1', x: 35, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 77, y: 55, role: 'CB' },
      { id: 'lwb', x: 20, y: 38, role: 'LWB' },
      { id: 'cm1', x: 45, y: 38, role: 'CM' },
      { id: 'cm2', x: 66, y: 38, role: 'CM' },
      { id: 'rwb', x: 92, y: 38, role: 'RWB' },
      { id: 'lam', x: 40, y: 20, role: 'LAM' },
      { id: 'ram', x: 72, y: 20, role: 'RAM' },
      { id: 'st', x: 56, y: 2, role: 'ST' },
    ]
  },
  '4-1-2-1-2': {
    id: '4-1-2-1-2',
    name: '4-1-2-1-2',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'lb', x: 23, y: 58, role: 'LB' },
      { id: 'cb1', x: 45, y: 58, role: 'CB' },
      { id: 'cb2', x: 66, y: 58, role: 'CB' },
      { id: 'rb', x: 90, y: 58, role: 'RB' },
      { id: 'cdm', x: 56, y: 44, role: 'CDM' },
      { id: 'cm1', x: 38, y: 30, role: 'CM' },
      { id: 'cm2', x: 74, y: 30, role: 'CM' },
      { id: 'cam', x: 56, y: 18, role: 'CAM' },
      { id: 'st1', x: 45, y: 4, role: 'ST' },
      { id: 'st2', x: 66, y: 4, role: 'ST' },
    ]
  },
  '3-3-4': {
    id: '3-3-4',
    name: '3-3-4',
    sport: 'football',
    positions: [
      { id: 'gk', x: 56, y: 75, role: 'GK' },
      { id: 'cb1', x: 35, y: 55, role: 'CB' },
      { id: 'cb2', x: 56, y: 55, role: 'CB' },
      { id: 'cb3', x: 77, y: 55, role: 'CB' },
      { id: 'cm1', x: 35, y: 32, role: 'CM' },
      { id: 'cm2', x: 56, y: 32, role: 'CM' },
      { id: 'cm3', x: 77, y: 32, role: 'CM' },
      { id: 'lw', x: 23, y: 8, role: 'LW' },
      { id: 'st1', x: 45, y: 8, role: 'ST' },
      { id: 'st2', x: 66, y: 8, role: 'ST' },
      { id: 'rw', x: 90, y: 8, role: 'RW' },
    ]
  },
}

// Futsal formations
export const futsalFormations: Record<string, Formation> = {
  '1-2-1': {
    id: '1-2-1',
    name: '1-2-1',
    sport: 'futsal',
    positions: [
      { id: 'gk', x: 50, y: 8, role: 'GK' },
      { id: 'fixo', x: 50, y: 30, role: 'FIXO' },
      { id: 'ala1', x: 25, y: 55, role: 'ALA' },
      { id: 'ala2', x: 75, y: 55, role: 'ALA' },
      { id: 'pivot', x: 50, y: 80, role: 'PIVOT' },
    ]
  },
  '2-2': {
    id: '2-2',
    name: '2-2',
    sport: 'futsal',
    positions: [
      { id: 'gk', x: 50, y: 8, role: 'GK' },
      { id: 'def1', x: 30, y: 35, role: 'FIXO' },
      { id: 'def2', x: 70, y: 35, role: 'FIXO' },
      { id: 'atk1', x: 30, y: 70, role: 'ALA' },
      { id: 'atk2', x: 70, y: 70, role: 'ALA' },
    ]
  },
  '1-1-2': {
    id: '1-1-2',
    name: '1-1-2',
    sport: 'futsal',
    positions: [
      { id: 'gk', x: 50, y: 8, role: 'GK' },
      { id: 'fixo', x: 50, y: 30, role: 'FIXO' },
      { id: 'ala', x: 50, y: 55, role: 'ALA' },
      { id: 'pivot1', x: 30, y: 80, role: 'PIVOT' },
      { id: 'pivot2', x: 70, y: 80, role: 'PIVOT' },
    ]
  },
  '3-1': {
    id: '3-1',
    name: '3-1',
    sport: 'futsal',
    positions: [
      { id: 'gk', x: 50, y: 8, role: 'GK' },
      { id: 'fixo', x: 50, y: 30, role: 'FIXO' },
      { id: 'ala1', x: 25, y: 30, role: 'ALA' },
      { id: 'ala2', x: 75, y: 30, role: 'ALA' },
      { id: 'pivot', x: 50, y: 70, role: 'PIVOT' },
    ]
  },
}

// Get all formations for a sport
export function getFormationsForSport(sport: 'football' | 'futsal'): Formation[] {
  return sport === 'football' 
    ? Object.values(footballFormations)
    : Object.values(futsalFormations)
}

// Get a specific formation
export function getFormation(name: FormationType, sport: 'football' | 'futsal' = 'football'): Formation | null {
  const formations = sport === 'football' ? footballFormations : futsalFormations
  return formations[name] || null
}

// Get formation names list
export function getFormationNames(sport: 'football' | 'futsal' = 'football'): FormationType[] {
  const formations = sport === 'football' ? footballFormations : futsalFormations
  return Object.keys(formations) as FormationType[]
}
