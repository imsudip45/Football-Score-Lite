// Sport configuration for Football and Futsal
import type { SportConfig } from "./types"

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  futsal: {
    type: "futsal",
    name: "Futsal",
    icon: "🥅",
    minLineupSize: 1,
    maxLineupSize: 7,
    defaultPeriodLength: 20,
    periods: 2,
    extraTimePeriodLength: 5,
    positions: ["GK", "FIXO", "ALA", "PIVOT"],
  },
  football: {
    type: "football",
    name: "Football",
    icon: "⚽",
    minLineupSize: 7,
    maxLineupSize: 11,
    defaultPeriodLength: 45,
    periods: 2,
    extraTimePeriodLength: 15,
    positions: ["GK", "DEF", "MID", "FWD"],
  },
}

export function getSportConfig(sport: string): SportConfig {
  return SPORT_CONFIGS[sport] || SPORT_CONFIGS.futsal
}
