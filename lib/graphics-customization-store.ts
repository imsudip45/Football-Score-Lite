"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface GraphicPosition {
  top: number
  left: number
  right?: number
  bottom?: number
}

export interface GradientStop {
  color: string
  position: number // 0-100
}

export interface GradientConfig {
  type: 'linear' | 'radial'
  angle: number // for linear
  stops: GradientStop[]
}

export interface PatternConfig {
  enabled: boolean
  type: 'stripes' | 'dots' | 'chevron' | 'maze' | 'grid' | 'custom'
  color: string
  opacity: number
  size: number
  angle?: number
  customUrl?: string
  animation?: {
    enabled: boolean
    direction: 'up' | 'down' | 'left' | 'right' | 'none'
    speed: number // seconds for one cycle
  }
}

export interface FillConfig {
  type: 'solid' | 'gradient' | 'pattern'
  color: string
  useTeamColor?: 'team1' | 'team2' | 'home1' | 'home2' | 'away1' | 'away2' | 'tournament' | null // Dynamic team/tournament color reference
  gradient?: GradientConfig
  pattern?: PatternConfig
}

export interface TextStyle {
  fontWeight?: 'normal' | 'bold' | 'light' | 'medium' | 'semibold' | 'extrabold' | 'black'
  fontStyle?: 'normal' | 'italic'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  letterSpacing?: number // in em units (e.g., 0.1 = 0.1em)
  textDecoration?: 'none' | 'underline' | 'line-through'
  textShadow?: boolean
}

export interface ComponentStyle {
  id: string
  name: string
  fill: FillConfig
  textColor?: string
  fontSize?: number // font size in pixels
  textStyle?: TextStyle // text styling options
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  shadow?: boolean
  animationSpeed?: number // seconds for ticker/scroll animations
}

export interface GraphicCustomization {
  position: GraphicPosition
  scale: number
  opacity: number
  enabled: boolean
  components: ComponentStyle[]
}

// Default component styles for each graphic type
const defaultScoreBugComponents: ComponentStyle[] = [
  { id: 'league-box', name: 'League Box', fill: { type: 'solid', color: '#ffffff' }, textColor: '#000000', fontSize: 14, textStyle: { fontWeight: 'bold', textTransform: 'uppercase' } },
  { id: 'home-logo-box', name: 'Home Logo Box', fill: { type: 'solid', color: '#E6E7E8', useTeamColor: 'home1' } },
  { id: 'home-name-box', name: 'Home Name Box', fill: { type: 'solid', color: '#ffffff' }, textColor: '#000000', fontSize: 20, textStyle: { fontWeight: 'bold', textTransform: 'uppercase' } },
  { id: 'score-box', name: 'Score Box', fill: { type: 'solid', color: '#D1D3D4' }, textColor: '#000000', fontSize: 28, textStyle: { fontWeight: 'bold' } },
  { id: 'away-name-box', name: 'Away Name Box', fill: { type: 'solid', color: '#ffffff' }, textColor: '#000000', fontSize: 20, textStyle: { fontWeight: 'bold', textTransform: 'uppercase' } },
  { id: 'away-logo-box', name: 'Away Logo Box', fill: { type: 'solid', color: '#E6E7E8', useTeamColor: 'away1' } },
  { id: 'timer-box', name: 'Timer Box', fill: { type: 'solid', color: '#EF3E42' }, textColor: '#ffffff', fontSize: 20, textStyle: { fontWeight: 'bold' } },
  { id: 'extra-time-box', name: 'Extra Time Box', fill: { type: 'solid', color: '#F0F0F0' }, textColor: '#000000', fontSize: 14 },
]

const defaultVsGraphicComponents: ComponentStyle[] = [
  { id: 'home-background', name: 'Home Background', fill: { type: 'solid', color: '#A50044' } },
  { id: 'away-background', name: 'Away Background', fill: { type: 'solid', color: '#00529F' } },
  { id: 'home-sidebar', name: 'Home Sidebar', fill: { type: 'solid', color: '#000000' }, textColor: '#ffffff', fontSize: 40, textStyle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.2 }, animationSpeed: 50 },
  { id: 'away-sidebar', name: 'Away Sidebar', fill: { type: 'solid', color: '#000000' }, textColor: '#ffffff', fontSize: 40, textStyle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.2 }, animationSpeed: 50 },
  { id: 'center-badge', name: 'Center Badge', fill: { type: 'solid', color: '#ffffff' } },
  { id: 'team-name', name: 'Team Names', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff', fontSize: 120, textStyle: { fontWeight: 'bold', textTransform: 'uppercase' } },
  { id: 'score-text', name: 'Score Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff', fontSize: 180, textStyle: { fontWeight: 'black' } },
  { id: 'competition-text', name: 'Competition Name', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff', fontSize: 60, textStyle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.02 } },
  { id: 'round-text', name: 'Round/Match Info', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff', fontSize: 32, textStyle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.1 } },
]

const defaultLineupComponents: ComponentStyle[] = [
  { id: 'left-sidebar', name: 'Left Sidebar', fill: { type: 'solid', color: '#D6002A' } },
  { id: 'right-sidebar', name: 'Right Sidebar', fill: { type: 'solid', color: '#F8F8F8' } },
  { id: 'pitch-background', name: 'Pitch Background', fill: { type: 'solid', color: '#EBEBEB' } },
  { id: 'title-box', name: 'Title Box', fill: { type: 'solid', color: '#ffffff' } },
  { id: 'player-card-photo', name: 'Player Card Photo', fill: { type: 'solid', color: '#D6002A' } },
  { id: 'player-card-info', name: 'Player Card Info', fill: { type: 'solid', color: '#ffffff' }, textColor: '#000000' },
  { id: 'player-number', name: 'Player Number', fill: { type: 'solid', color: '#000000' }, textColor: '#ffffff' },
]

const defaultLowerThirdComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'gradient', color: '#000000', gradient: { type: 'linear', angle: 90, stops: [{ color: 'rgba(0,0,0,0.95)', position: 0 }, { color: 'rgba(20,20,20,0.9)', position: 100 }] } } },
  { id: 'accent-bar', name: 'Accent Bar', fill: { type: 'solid', color: '#14b8a6' } },
  { id: 'title-text', name: 'Title Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
  { id: 'subtitle-text', name: 'Subtitle Text', fill: { type: 'solid', color: 'rgba(255,255,255,0.7)' }, textColor: 'rgba(255,255,255,0.7)' },
]

// Home team goal graphic - background uses team color by default
const defaultGoalHomeComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#A50044', useTeamColor: 'team1' } },
  { id: 'accent', name: 'Accent Color', fill: { type: 'solid', color: '#EF3E42' } },
  { id: 'text', name: 'Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

// Away team goal graphic - background uses away team color by default
const defaultGoalAwayComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'accent', name: 'Accent Color', fill: { type: 'solid', color: '#0066CC' } },
  { id: 'text', name: 'Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

// Home team card graphic - background uses team color by default
const defaultCardHomeComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#A50044', useTeamColor: 'team1' } },
  { id: 'accent', name: 'Accent', fill: { type: 'solid', color: '#D1D3D4' } },
  { id: 'yellow-card', name: 'Yellow Card', fill: { type: 'solid', color: '#FFC107' } },
  { id: 'red-card', name: 'Red Card', fill: { type: 'solid', color: '#dc2626' } },
  { id: 'text', name: 'Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

// Away team card graphic - background uses away team color by default
const defaultCardAwayComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'accent', name: 'Accent', fill: { type: 'solid', color: '#D1D3D4' } },
  { id: 'yellow-card', name: 'Yellow Card', fill: { type: 'solid', color: '#FFC107' } },
  { id: 'red-card', name: 'Red Card', fill: { type: 'solid', color: '#dc2626' } },
  { id: 'text', name: 'Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

// Home team substitution graphic - background uses team color by default
const defaultSubstitutionHomeComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#A50044', useTeamColor: 'team1' } },
  { id: 'player-in', name: 'Player In', fill: { type: 'solid', color: '#D1D3D4' }, textColor: '#111827' },
  { id: 'player-out', name: 'Player Out', fill: { type: 'solid', color: '#ffffff' }, textColor: '#111827' },
]

// Away team substitution graphic - background uses away team color by default
const defaultSubstitutionAwayComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'player-in', name: 'Player In', fill: { type: 'solid', color: '#D1D3D4' }, textColor: '#111827' },
  { id: 'player-out', name: 'Player Out', fill: { type: 'solid', color: '#ffffff' }, textColor: '#111827' },
]

// Home team nameplate graphic - separate logo-box and bottom-box for customization
const defaultNameplateHomeComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background (Legacy)', fill: { type: 'solid', color: '#A50044', useTeamColor: 'home1' } },
  { id: 'logo-box', name: 'Logo Box', fill: { type: 'solid', color: '#A50044', useTeamColor: 'home1' } },
  { id: 'accent', name: 'Name Box', fill: { type: 'solid', color: '#D1D3D4' } },
  { id: 'bottom-box', name: 'Position Box', fill: { type: 'solid', color: '#EF3E42' } },
  { id: 'name-text', name: 'Name Text', fill: { type: 'solid', color: '#EF3E42' }, textColor: '#EF3E42' },
  { id: 'position-text', name: 'Position Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

// Away team nameplate graphic - separate logo-box and bottom-box for customization
const defaultNameplateAwayComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background (Legacy)', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'logo-box', name: 'Logo Box', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'accent', name: 'Name Box', fill: { type: 'solid', color: '#D1D3D4' } },
  { id: 'bottom-box', name: 'Position Box', fill: { type: 'solid', color: '#EF3E42' } },
  { id: 'name-text', name: 'Name Text', fill: { type: 'solid', color: '#EF3E42' }, textColor: '#EF3E42' },
  { id: 'position-text', name: 'Position Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

const defaultBreakingBannerComponents: ComponentStyle[] = [
  { id: 'background', name: 'Background', fill: { type: 'solid', color: 'rgba(0,0,0,0.95)' } },
  { id: 'label-box', name: 'Breaking Label', fill: { type: 'solid', color: '#dc2626' }, textColor: '#ffffff' },
  { id: 'text', name: 'Banner Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff' },
]

const defaultMatchStatsComponents: ComponentStyle[] = [
  { id: 'home-logo-box', name: 'Home Logo Box', fill: { type: 'solid', color: '#A50044', useTeamColor: 'home1' } },
  { id: 'away-logo-box', name: 'Away Logo Box', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
  { id: 'center-bar', name: 'Center Bar', fill: { type: 'solid', color: '#ffffff' }, textColor: '#000000' },
  { id: 'score-box', name: 'Score Box', fill: { type: 'solid', color: '#E6E7E8' }, textColor: '#000000' },
  { id: 'timer-box', name: 'Timer Box', fill: { type: 'solid', color: '#292a2bff' }, textColor: '#ffffff' },
  { id: 'scorers-box', name: 'Scorers Box', fill: { type: 'solid', color: '#6D6E71' }, textColor: '#ffffff' },
]

const defaultMatchStatsFullScreenComponents: ComponentStyle[] = [
  {
    id: 'background',
    name: 'Background',
    fill: {
      type: 'gradient',
      color: '#000000',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: 'rgba(0,0,0,0.88)', position: 0 },
          { color: 'rgba(0,0,0,0.78)', position: 100 },
        ],
      },
    },
  },
  {
    id: 'background-pattern',
    name: 'Background Pattern',
    fill: {
      type: 'pattern',
      color: 'transparent',
      pattern: { enabled: true, type: 'maze', color: '#ffffff', opacity: 0.12, size: 90 },
    },
  },
  { id: 'title-text', name: 'Title Text', fill: { type: 'solid', color: '#ffffff' }, textColor: '#ffffff', fontSize: 64, textStyle: { fontWeight: 'extrabold', textTransform: 'uppercase', letterSpacing: 0.08 } },
  { id: 'card', name: 'Center Card', fill: { type: 'solid', color: '#ffffff' } },
  { id: 'divider', name: 'Row Dividers', fill: { type: 'solid', color: '#E5E7EB' } },
  { id: 'stat-label', name: 'Stat Labels', fill: { type: 'solid', color: '#6B7280' }, textColor: '#4B5563', fontSize: 22, textStyle: { fontWeight: 'semibold', textTransform: 'uppercase', letterSpacing: 0.18 } },
  { id: 'stat-value', name: 'Stat Values', fill: { type: 'solid', color: '#111827' }, textColor: '#111827', fontSize: 54, textStyle: { fontWeight: 'extrabold' } },
  { id: 'home-panel', name: 'Home Team Panel', fill: { type: 'solid', color: '#A50044', useTeamColor: 'home1' } },
  { id: 'away-panel', name: 'Away Team Panel', fill: { type: 'solid', color: '#00529F', useTeamColor: 'away1' } },
]

const defaultMatchOfficialsComponents: ComponentStyle[] = [
  { id: 'sidebar', name: 'Sidebar', fill: { type: 'solid', color: '#F3F4F6' }, textColor: '#EF3E42', fontSize: 30, textStyle: { fontStyle: 'italic' } },
  { id: 'header', name: 'Header', fill: { type: 'solid', color: '#EF3E42' }, textColor: '#ffffff', fontSize: 24, textStyle: { textTransform: 'uppercase', letterSpacing: 0.05 } },
  { id: 'row-even', name: 'Row (Even)', fill: { type: 'solid', color: '#ffffff' }, textColor: '#374151', fontSize: 16, textStyle: { textTransform: 'uppercase' } },
  { id: 'row-odd', name: 'Row (Odd)', fill: { type: 'solid', color: '#E5E7EB' }, textColor: '#374151', fontSize: 16, textStyle: { textTransform: 'uppercase' } },
  { id: 'role-highlight', name: 'Role Highlight', fill: { type: 'solid', color: '#EF3E42' }, textColor: '#EF3E42', fontSize: 12, textStyle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.05 } },
  { id: 'official-icon', name: 'Official Icon', fill: { type: 'solid', color: '#F59E0B' } },
]

interface GraphicsCustomizationState {
  scoreBug: GraphicCustomization
  lowerThird: GraphicCustomization
  goalHome: GraphicCustomization
  goalAway: GraphicCustomization
  cardHome: GraphicCustomization
  cardAway: GraphicCustomization
  substitutionHome: GraphicCustomization
  substitutionAway: GraphicCustomization
  nameplateHome: GraphicCustomization
  nameplateAway: GraphicCustomization
  vsGraphic: GraphicCustomization
  lineup: GraphicCustomization
  breakingBanner: GraphicCustomization
  matchStats: GraphicCustomization
  matchStatsFullScreen: GraphicCustomization
  matchOfficials: GraphicCustomization

  // Actions
  updateGraphicPosition: (graphic: GraphicKey, position: Partial<GraphicPosition>) => void
  updateGraphicScale: (graphic: GraphicKey, scale: number) => void
  updateGraphicOpacity: (graphic: GraphicKey, opacity: number) => void
  updateGraphicEnabled: (graphic: GraphicKey, enabled: boolean) => void
  updateComponentStyle: (graphic: GraphicKey, componentId: string, updates: Partial<ComponentStyle>) => void
  updateComponentFill: (graphic: GraphicKey, componentId: string, fill: FillConfig) => void
  resetGraphic: (graphic: GraphicKey) => void
  resetAll: () => void
}

type GraphicKey =
  | 'scoreBug'
  | 'lowerThird'
  | 'goalHome'
  | 'goalAway'
  | 'cardHome'
  | 'cardAway'
  | 'substitutionHome'
  | 'substitutionAway'
  | 'nameplateHome'
  | 'nameplateAway'
  | 'vsGraphic'
  | 'lineup'
  | 'breakingBanner'
  | 'matchStats'
  | 'matchStatsFullScreen'
  | 'matchOfficials'

export const defaultCustomizations: Record<GraphicKey, GraphicCustomization> = {
  scoreBug: {
    position: { top: 64, left: 64 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultScoreBugComponents,
  },
  lowerThird: {
    position: { top: 0, left: 64, bottom: 160 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultLowerThirdComponents,
  },
  goalHome: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultGoalHomeComponents,
  },
  goalAway: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultGoalAwayComponents,
  },
  cardHome: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultCardHomeComponents,
  },
  cardAway: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultCardAwayComponents,
  },
  substitutionHome: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultSubstitutionHomeComponents,
  },
  substitutionAway: {
    position: { top: 0, left: 64, bottom: 208 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultSubstitutionAwayComponents,
  },
  nameplateHome: {
    position: { top: 0, left: 64, bottom: 160 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultNameplateHomeComponents,
  },
  nameplateAway: {
    position: { top: 0, left: 64, bottom: 160 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultNameplateAwayComponents,
  },
  vsGraphic: {
    position: { top: 0, left: 0 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultVsGraphicComponents,
  },
  lineup: {
    position: { top: 0, left: 0 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultLineupComponents,
  },
  breakingBanner: {
    position: { top: 0, left: 0, bottom: 0 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultBreakingBannerComponents,
  },
  matchStats: {
    // Match Stats Lower Third is centered; store `left` as the center X (px).
    position: { top: 0, left: 960, bottom: 64 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultMatchStatsComponents,
  },
  matchStatsFullScreen: {
    position: { top: 0, left: 0 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultMatchStatsFullScreenComponents,
  },
  matchOfficials: {
    position: { top: 0, left: 64, bottom: 40 },
    scale: 1,
    opacity: 1,
    enabled: true,
    components: defaultMatchOfficialsComponents,
  },
}

export const useGraphicsCustomizationStore = create<GraphicsCustomizationState>()(
  persist(
    (set) => ({
      ...defaultCustomizations,

      updateGraphicPosition: (graphic, position) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            position: { ...state[graphic].position, ...position },
          },
        })),

      updateGraphicScale: (graphic, scale) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            scale,
          },
        })),

      updateGraphicOpacity: (graphic, opacity) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            opacity,
          },
        })),

      updateGraphicEnabled: (graphic, enabled) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            enabled,
          },
        })),

      updateComponentStyle: (graphic, componentId, updates) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            components: state[graphic].components.map((comp) =>
              comp.id === componentId ? { ...comp, ...updates } : comp
            ),
          },
        })),

      updateComponentFill: (graphic, componentId, fill) =>
        set((state) => ({
          [graphic]: {
            ...state[graphic],
            components: state[graphic].components.map((comp) =>
              comp.id === componentId ? { ...comp, fill } : comp
            ),
          },
        })),

      resetGraphic: (graphic) =>
        set(() => ({
          [graphic]: defaultCustomizations[graphic],
        })),

      resetAll: () => set(defaultCustomizations),
    }),
    {
      name: "localmatch-graphics-customization",
      version: 24, // v24: unify score bug score boxes into a single "score-box" component
      migrate: (persistedState: unknown, version: number) => {
        // Always reset if version is old or if components are missing
        if (version < 23) {
          // Version 23: add matchStatsFullScreen customization + keep prior defaults aligned
          return defaultCustomizations
        }

        // Version 24: unify scorebug home/away score boxes into a single component id.
        if (version < 24) {
          const next = { ...(persistedState as any) } as any
          const sb = next?.scoreBug as GraphicCustomization | undefined
          if (sb?.components && Array.isArray(sb.components)) {
            const comps = sb.components as ComponentStyle[]
            const existing = comps.find((c) => c.id === 'score-box')
            const homeLegacy = comps.find((c) => c.id === 'home-score-box')
            const awayLegacy = comps.find((c) => c.id === 'away-score-box')

            if (!existing) {
              const source = homeLegacy || awayLegacy
              const fallback = defaultScoreBugComponents.find((c) => c.id === 'score-box')
              if (source) {
                comps.push({ ...source, id: 'score-box', name: 'Score Box' })
              } else if (fallback) {
                comps.push(fallback)
              }
            }

            sb.components = comps.filter((c) => c.id !== 'home-score-box' && c.id !== 'away-score-box')
          }
          return next as GraphicsCustomizationState
        }

        // Check if persisted state has components properly
        const state = persistedState as Record<string, unknown>
        const scoreBug = state?.scoreBug as GraphicCustomization | undefined
        if (!scoreBug?.components || scoreBug.components.length === 0) {
          return defaultCustomizations
        }
        // If a newer graphic key is missing (e.g., after update), reset to defaults
        const msfs = state?.matchStatsFullScreen as GraphicCustomization | undefined
        if (!msfs?.components || msfs.components.length === 0) {
          return defaultCustomizations
        }

        // Safety net: even if the persisted `version` is already >= 24, some users may still
        // have legacy scorebug component IDs stored (e.g., from imports or older saves).
        // Ensure the renderer always has a usable `score-box` component.
        try {
          const next = { ...(persistedState as any) } as any
          const sb = next?.scoreBug as GraphicCustomization | undefined
          if (sb?.components && Array.isArray(sb.components)) {
            const comps = sb.components as ComponentStyle[]
            const existing = comps.find((c) => c.id === 'score-box')
            const homeLegacy = comps.find((c) => c.id === 'home-score-box')
            const awayLegacy = comps.find((c) => c.id === 'away-score-box')

            if (!existing) {
              const source = homeLegacy || awayLegacy
              const fallback = defaultScoreBugComponents.find((c) => c.id === 'score-box')
              if (source) {
                comps.push({ ...source, id: 'score-box', name: 'Score Box' })
              } else if (fallback) {
                comps.push(fallback)
              }
            }

            // Ensure score-box has a fill; if not, patch it to default so it never renders transparent.
            const scoreBox = comps.find((c) => c.id === 'score-box')
            const defaultScoreBox = defaultScoreBugComponents.find((c) => c.id === 'score-box')
            if (scoreBox && (!scoreBox.fill || !(scoreBox.fill as any).type)) {
              if (defaultScoreBox?.fill) scoreBox.fill = defaultScoreBox.fill
            }

            sb.components = comps.filter((c) => c.id !== 'home-score-box' && c.id !== 'away-score-box')
            next.scoreBug = sb
          }
          return next as GraphicsCustomizationState
        } catch {
          // If anything goes wrong, fall back to persisted state.
        }
        return persistedState as GraphicsCustomizationState
      },
    }
  )
)

function hashString(input: string): string {
  // Simple, stable hash for filenames (not crypto; just dedupe).
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

function guessExtFromDataUrl(dataUrl: string): string {
  const mime = /^data:([^;]+);base64,/i.exec(dataUrl || '')?.[1] || ''
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('webp')) return 'webp'
  return 'png'
}

// One-time migration: convert legacy `data:` custom pattern URLs to `app-assets://...` URLs in Electron.
// This keeps customization sync small and makes packaged builds work without re-uploading.
export async function migrateLegacyPatternDataUrlsToAssets(): Promise<{ migrated: number }> {
  if (typeof window === 'undefined') return { migrated: 0 }

  const markerKey = 'localmatch-graphics-customization-pattern-migration-v1'
  const api = (window as any).electronAPI
  if (!api?.assets?.writeDataUrl) {
    // Not running in Electron; nothing to do.
    localStorage.setItem(markerKey, `done:${Date.now()}`)
    return { migrated: 0 }
  }

  // Ensure we have the latest persisted state.
  try {
    ;(useGraphicsCustomizationStore as any).persist?.rehydrate?.()
  } catch {
    // ignore
  }

  const current = (useGraphicsCustomizationStore as any).getState?.() as GraphicsCustomizationState
  if (!current) {
    localStorage.setItem(markerKey, `done:${Date.now()}`)
    return { migrated: 0 }
  }

  // If we've already migrated and there are no legacy data URLs left, skip.
  const already = localStorage.getItem(markerKey)
  let hasLegacy = false
  const quickKeys = Object.keys(defaultCustomizations) as GraphicKey[]
  for (const g of quickKeys) {
    const graphic: any = (current as any)[g]
    const comps: any[] = graphic?.components
    if (!Array.isArray(comps)) continue
    if (comps.some((c) => c?.fill?.pattern?.type === 'custom' && typeof c?.fill?.pattern?.customUrl === 'string' && c.fill.pattern.customUrl.startsWith('data:'))) {
      hasLegacy = true
      break
    }
  }
  if (!hasLegacy && already?.startsWith('done:')) {
    return { migrated: 0 }
  }

  const cache = new Map<string, string>()
  let migrated = 0

  const patch: Partial<GraphicsCustomizationState> = {}
  const graphicKeys = Object.keys(defaultCustomizations) as GraphicKey[]

  for (const g of graphicKeys) {
    const graphic: any = (current as any)[g]
    if (!graphic?.components || !Array.isArray(graphic.components)) continue

    let changedGraphic = false
    const nextComponents = graphic.components.map((comp: any) => {
      const pattern = comp?.fill?.pattern
      const customUrl = pattern?.type === 'custom' ? pattern?.customUrl : undefined
      if (typeof customUrl === 'string' && customUrl.startsWith('data:')) {
        changedGraphic = true
        return { ...comp } // we'll patch below
      }
      return comp
    })

    if (!changedGraphic) continue

    for (let i = 0; i < nextComponents.length; i++) {
      const comp = nextComponents[i]
      const pattern = comp?.fill?.pattern
      const customUrl = pattern?.type === 'custom' ? pattern?.customUrl : undefined
      if (typeof customUrl !== 'string' || !customUrl.startsWith('data:')) continue

      const existing = cache.get(customUrl)
      let newUrl: string | undefined = existing
      if (!newUrl) {
        const ext = guessExtFromDataUrl(customUrl)
        const relPath = `patterns/legacy-${hashString(customUrl)}.${ext}`
        try {
          const res = await api.assets.writeDataUrl(relPath, customUrl)
          if (res?.success && res.url) {
            newUrl = res.url
            cache.set(customUrl, res.url)
          }
        } catch {
          // keep as-is
        }
      }

      if (newUrl && newUrl !== customUrl) {
        migrated++
        nextComponents[i] = {
          ...comp,
          fill: {
            ...comp.fill,
            pattern: {
              ...pattern,
              customUrl: newUrl,
            },
          },
        }
      }
    }

    ;(patch as any)[g] = { ...graphic, components: nextComponents }
  }

  if (migrated > 0) {
    try {
      // Merge patch; do NOT replace store (replacing would drop action functions).
      ;(useGraphicsCustomizationStore as any).setState?.(patch)
    } catch {
      // ignore
    }
  }

  localStorage.setItem(markerKey, `done:${Date.now()}`)
  return { migrated }
}

// BroadcastChannel for same-origin cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel('localmatch-graphics-sync');
    } catch {
      // BroadcastChannel not supported
      return null;
    }
  }
  return broadcastChannel;
}

// Trigger sync to all windows/tabs (including same window)
export function triggerGraphicsSync() {
  if (typeof window === 'undefined') return;
  
  // Update localStorage timestamp to trigger storage event in other windows
  localStorage.setItem('localmatch-graphics-sync', Date.now().toString());
  
  // Use BroadcastChannel for same-origin tabs (works even in same window context)
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({ type: 'sync', timestamp: Date.now() });
  }
}

// Hook to sync store across tabs/windows via storage events and BroadcastChannel
export function useGraphicsCustomizationSync() {
  if (typeof window === 'undefined') return;

  // Force rehydration on mount to get latest data from localStorage
  // This ensures the renderer has the latest customization when it opens
  useGraphicsCustomizationStore.persist.rehydrate();

  const handleStorageChange = (e: StorageEvent) => {
    // Listen for both the main store key and the sync trigger key
    if (e.key === 'localmatch-graphics-customization' || e.key === 'localmatch-graphics-sync') {
      // Rehydrate the store to get fresh data from localStorage
      useGraphicsCustomizationStore.persist.rehydrate();
    }
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data?.type === 'sync') {
      // Rehydrate the store to get fresh data from localStorage
      useGraphicsCustomizationStore.persist.rehydrate();
    }
  };

  // Listen for storage events (cross-window)
  window.addEventListener('storage', handleStorageChange);
  
  // Listen for BroadcastChannel messages (same-origin, including same window)
  const channel = getBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    if (channel) {
      channel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}
