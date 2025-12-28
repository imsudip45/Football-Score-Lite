"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  GraphicsPreset,
  ScoreBugStyle,
  LowerThirdStyle,
  TickerStyle,
  BreakingBannerStyle,
  FillConfig,
  FontConfig,
  AnimationConfig,
  Position,
  GraphicElementStyle,
} from "./graphics-types"

// Default Score Bug Style
const defaultScoreBugStyle: ScoreBugStyle = {
  id: "default-scorebug",
  name: "Default Score Bug",
  background: {
    id: "scorebug-bg",
    name: "Background",
    fill: { type: "solid", color: "rgba(0,0,0,0.85)" },
    position: { x: 50, y: 30, anchor: "top-center" },
    width: 420,
    height: 60,
    cornerRadius: 8,
    opacity: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.5)", blur: 16, offsetX: 0, offsetY: 4 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  homeTeamBg: {
    id: "home-bg",
    name: "Home Team BG",
    fill: { type: "solid", color: "#14b8a6" },
    position: { x: 0, y: 0, anchor: "top-left" },
    width: 120,
    height: 60,
    cornerRadius: 8,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  awayTeamBg: {
    id: "away-bg",
    name: "Away Team BG",
    fill: { type: "solid", color: "#dc2626" },
    position: { x: 0, y: 0, anchor: "top-right" },
    width: 120,
    height: 60,
    cornerRadius: 8,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  scoreBg: {
    id: "score-bg",
    name: "Score BG",
    fill: { type: "solid", color: "rgba(255,255,255,0.1)" },
    position: { x: 0, y: 0, anchor: "center" },
    width: 100,
    height: 50,
    cornerRadius: 4,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  timerBg: {
    id: "timer-bg",
    name: "Timer BG",
    fill: { type: "solid", color: "rgba(0,0,0,0.6)" },
    position: { x: 0, y: 0, anchor: "bottom-center" },
    width: 80,
    height: 24,
    cornerRadius: 4,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  teamNameFont: {
    family: "Inter",
    size: 18,
    weight: "bold",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 1,
    lineHeight: 1,
  },
  scoreFont: {
    family: "Inter",
    size: 32,
    weight: "bold",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 0,
    lineHeight: 1,
  },
  timerFont: {
    family: "Inter",
    size: 14,
    weight: "600",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 1,
    lineHeight: 1,
  },
  animation: {
    in: "slide-down",
    out: "slide-up",
    duration: 400,
    easing: "ease-out",
    delay: 0,
  },
  position: { x: 50, y: 5, anchor: "top-center" },
}

// Default Lower Third Style
const defaultLowerThirdStyle: LowerThirdStyle = {
  id: "default-lowerthird",
  name: "Default Lower Third",
  background: {
    id: "lt-bg",
    name: "Background",
    fill: {
      type: "gradient",
      color: "#14b8a6",
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { color: "rgba(0,0,0,0.95)", position: 0 },
          { color: "rgba(20,20,20,0.9)", position: 1 },
        ],
      },
    },
    position: { x: 10, y: 85, anchor: "bottom-left" },
    width: 400,
    height: 80,
    cornerRadius: 8,
    opacity: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.5)", blur: 20, offsetX: 0, offsetY: 4 },
    stroke: { enabled: false, color: "#14b8a6", width: 2 },
  },
  titleBar: {
    id: "lt-titlebar",
    name: "Title Bar",
    fill: { type: "solid", color: "#14b8a6" },
    position: { x: 0, y: 0, anchor: "top-left" },
    width: 6,
    height: 80,
    cornerRadius: 0,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  titleFont: {
    family: "Inter",
    size: 24,
    weight: "bold",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 0,
    lineHeight: 1.2,
  },
  subtitleFont: {
    family: "Inter",
    size: 16,
    weight: "normal",
    style: "normal",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0,
    lineHeight: 1.2,
  },
  logoPosition: { x: 0, y: 0, anchor: "center-left" },
  animation: {
    in: "slide-left",
    out: "slide-left",
    duration: 350,
    easing: "ease-out",
    delay: 0,
  },
  position: { x: 5, y: 85, anchor: "bottom-left" },
}

// Default Ticker Style
const defaultTickerStyle: TickerStyle = {
  id: "default-ticker",
  name: "Default Ticker",
  background: {
    id: "ticker-bg",
    name: "Background",
    fill: { type: "solid", color: "rgba(0,0,0,0.9)" },
    position: { x: 0, y: 100, anchor: "bottom-left" },
    width: 1920,
    height: 48,
    cornerRadius: 0,
    opacity: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.5)", blur: 8, offsetX: 0, offsetY: -2 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  primaryFont: {
    family: "Inter",
    size: 18,
    weight: "600",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 0,
    lineHeight: 1,
  },
  secondaryFont: {
    family: "Inter",
    size: 14,
    weight: "normal",
    style: "normal",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0,
    lineHeight: 1,
  },
  scrollSpeed: 80,
  separatorIcon: "•",
  animation: {
    in: "slide-up",
    out: "slide-down",
    duration: 300,
    easing: "ease-out",
    delay: 0,
  },
  position: { x: 0, y: 100, anchor: "bottom-left" },
}

// Default Breaking Banner Style
const defaultBreakingBannerStyle: BreakingBannerStyle = {
  id: "default-breaking",
  name: "Default Breaking",
  background: {
    id: "breaking-bg",
    name: "Background",
    fill: { type: "solid", color: "rgba(0,0,0,0.95)" },
    position: { x: 0, y: 100, anchor: "bottom-left" },
    width: 1920,
    height: 56,
    cornerRadius: 0,
    opacity: 1,
    shadow: { enabled: true, color: "rgba(220,38,38,0.3)", blur: 20, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#dc2626", width: 2 },
  },
  labelBg: {
    id: "breaking-label",
    name: "Breaking Label",
    fill: { type: "solid", color: "#dc2626" },
    position: { x: 0, y: 0, anchor: "center-left" },
    width: 140,
    height: 56,
    cornerRadius: 0,
    opacity: 1,
    shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: "#ffffff", width: 1 },
  },
  labelFont: {
    family: "Inter",
    size: 16,
    weight: "bold",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 2,
    lineHeight: 1,
  },
  textFont: {
    family: "Inter",
    size: 20,
    weight: "600",
    style: "normal",
    color: "#ffffff",
    letterSpacing: 0,
    lineHeight: 1,
  },
  flashEnabled: true,
  flashColor: "#dc2626",
  animation: {
    in: "slide-up",
    out: "slide-down",
    duration: 300,
    easing: "ease-out",
    delay: 0,
  },
  position: { x: 0, y: 100, anchor: "bottom-left" },
}

// Default preset
const defaultPreset: GraphicsPreset = {
  id: "default-preset",
  name: "Default Theme",
  description: "Clean, modern broadcast graphics",
  scoreBug: defaultScoreBugStyle,
  lowerThird: defaultLowerThirdStyle,
  ticker: defaultTickerStyle,
  breakingBanner: defaultBreakingBannerStyle,
  createdAt: new Date(),
  updatedAt: new Date(),
}

interface GraphicsState {
  // Current active styles
  activePreset: GraphicsPreset

  // Pattern assets
  patterns: { id: string; name: string; url: string }[]

  // Presets
  presets: GraphicsPreset[]

  // Live state
  scoreBugVisible: boolean
  lowerThirdVisible: boolean
  tickerVisible: boolean
  breakingBannerVisible: boolean
  goalVisible: boolean
  cardVisible: boolean
  substitutionVisible: boolean
  vsGraphicVisible: boolean
  nameplateVisible: boolean
  lineupVisible: boolean
  lineupTeam: 'home' | 'away' | null
  matchStatsLowerThirdVisible: boolean
  matchStatsFullScreenVisible: boolean
  matchOfficialsVisible: boolean

  // Actions
  setActivePreset: (preset: GraphicsPreset) => void
  updateScoreBugStyle: (updates: Partial<ScoreBugStyle>) => void
  updateLowerThirdStyle: (updates: Partial<LowerThirdStyle>) => void
  updateTickerStyle: (updates: Partial<TickerStyle>) => void
  updateBreakingBannerStyle: (updates: Partial<BreakingBannerStyle>) => void

  // Element updates
  updateElementStyle: (
    graphicType: "scoreBug" | "lowerThird" | "ticker" | "breakingBanner",
    elementKey: string,
    updates: Partial<GraphicElementStyle>,
  ) => void
  updateElementFill: (
    graphicType: "scoreBug" | "lowerThird" | "ticker" | "breakingBanner",
    elementKey: string,
    fill: FillConfig,
  ) => void
  updateFont: (
    graphicType: "scoreBug" | "lowerThird" | "ticker" | "breakingBanner",
    fontKey: string,
    updates: Partial<FontConfig>,
  ) => void
  updateAnimation: (
    graphicType: "scoreBug" | "lowerThird" | "ticker" | "breakingBanner",
    animation: AnimationConfig,
  ) => void
  updatePosition: (graphicType: "scoreBug" | "lowerThird" | "ticker" | "breakingBanner", position: Position) => void

  // Patterns
  addPattern: (pattern: { id: string; name: string; url: string }) => void
  removePattern: (id: string) => void

  // Presets
  savePreset: (name: string, description: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void

  // Visibility
  toggleScoreBug: (visible: boolean) => void
  toggleLowerThird: (visible: boolean) => void
  toggleTicker: (visible: boolean) => void
  toggleBreakingBanner: (visible: boolean) => void
  toggleGoal: (visible: boolean) => void
  toggleCard: (visible: boolean) => void
  toggleSubstitution: (visible: boolean) => void
  toggleVSGraphic: (visible: boolean) => void
  toggleNameplate: (visible: boolean) => void
  toggleLineup: (visible: boolean, team?: 'home' | 'away') => void
  toggleMatchStatsLowerThird: (visible: boolean) => void
  toggleMatchStatsFullScreen: (visible: boolean) => void
  toggleMatchOfficials: (visible: boolean) => void

  // Reset
  resetToDefault: () => void
}

// Current store version - increment to reset persisted state
const GRAPHICS_STORE_VERSION = 2

export const useGraphicsStore = create<GraphicsState>()(
  persist(
    (set, get) => ({
      activePreset: defaultPreset,
      patterns: [],
      presets: [defaultPreset],

      // Visibility states - these should always start as false
      scoreBugVisible: false,
      lowerThirdVisible: false,
      tickerVisible: false,
      breakingBannerVisible: false,
      goalVisible: false,
      cardVisible: false,
      substitutionVisible: false,
      vsGraphicVisible: false,
      nameplateVisible: false,
      lineupVisible: false,
      lineupTeam: null,
      matchStatsLowerThirdVisible: false,
      matchStatsFullScreenVisible: false,
      matchOfficialsVisible: false,

      setActivePreset: (preset) => set({ activePreset: preset }),

      updateScoreBugStyle: (updates) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            scoreBug: { ...state.activePreset.scoreBug, ...updates },
            updatedAt: new Date(),
          },
        })),

      updateLowerThirdStyle: (updates) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            lowerThird: { ...state.activePreset.lowerThird, ...updates },
            updatedAt: new Date(),
          },
        })),

      updateTickerStyle: (updates) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            ticker: { ...state.activePreset.ticker, ...updates },
            updatedAt: new Date(),
          },
        })),

      updateBreakingBannerStyle: (updates) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            breakingBanner: { ...state.activePreset.breakingBanner, ...updates },
            updatedAt: new Date(),
          },
        })),

      updateElementStyle: (graphicType, elementKey, updates) =>
        set((state) => {
          const graphic = state.activePreset[graphicType] as Record<string, unknown>
          const element = graphic[elementKey] as GraphicElementStyle

          return {
            activePreset: {
              ...state.activePreset,
              [graphicType]: {
                ...graphic,
                [elementKey]: { ...element, ...updates },
              },
              updatedAt: new Date(),
            },
          }
        }),

      updateElementFill: (graphicType, elementKey, fill) =>
        set((state) => {
          const graphic = state.activePreset[graphicType] as Record<string, unknown>
          const element = graphic[elementKey] as GraphicElementStyle

          return {
            activePreset: {
              ...state.activePreset,
              [graphicType]: {
                ...graphic,
                [elementKey]: { ...element, fill },
              },
              updatedAt: new Date(),
            },
          }
        }),

      updateFont: (graphicType, fontKey, updates) =>
        set((state) => {
          const graphic = state.activePreset[graphicType] as Record<string, unknown>
          const font = graphic[fontKey] as FontConfig

          return {
            activePreset: {
              ...state.activePreset,
              [graphicType]: {
                ...graphic,
                [fontKey]: { ...font, ...updates },
              },
              updatedAt: new Date(),
            },
          }
        }),

      updateAnimation: (graphicType, animation) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            [graphicType]: {
              ...state.activePreset[graphicType],
              animation,
            },
            updatedAt: new Date(),
          },
        })),

      updatePosition: (graphicType, position) =>
        set((state) => ({
          activePreset: {
            ...state.activePreset,
            [graphicType]: {
              ...state.activePreset[graphicType],
              position,
            },
            updatedAt: new Date(),
          },
        })),

      addPattern: (pattern) =>
        set((state) => ({
          patterns: [...state.patterns, pattern],
        })),

      removePattern: (id) =>
        set((state) => ({
          patterns: state.patterns.filter((p) => p.id !== id),
        })),

      savePreset: (name, description) => {
        const { activePreset, presets } = get()
        const newPreset: GraphicsPreset = {
          ...activePreset,
          id: `preset-${Date.now()}`,
          name,
          description,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set({ presets: [...presets, newPreset] })
      },

      loadPreset: (id) => {
        const { presets } = get()
        const preset = presets.find((p) => p.id === id)
        if (preset) {
          set({ activePreset: preset })
        }
      },

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id && p.id !== "default-preset"),
        })),

      toggleScoreBug: (visible) => {
        const state = get()
        if (visible && state.matchStatsLowerThirdVisible) {
          // L3 is visible, hide it first then show scorebug after L3 out animation (~3.5s)
          set({ matchStatsLowerThirdVisible: false })
          setTimeout(() => {
            set({ scoreBugVisible: true })
          }, 3500)
        } else {
          set({ scoreBugVisible: visible })
        }
      },
      toggleLowerThird: (visible) => set({ lowerThirdVisible: visible }),
      toggleTicker: (visible) => set({ tickerVisible: visible }),
      toggleBreakingBanner: (visible) => set({ breakingBannerVisible: visible }),
      toggleGoal: (visible) => set({ goalVisible: visible }),
      toggleCard: (visible) => set({ cardVisible: visible }),
      toggleSubstitution: (visible) => set({ substitutionVisible: visible }),
      toggleVSGraphic: (visible) => set({ vsGraphicVisible: visible }),
      toggleNameplate: (visible) => set({ nameplateVisible: visible }),
      toggleLineup: (visible, team) => set({ lineupVisible: visible, lineupTeam: visible ? (team || null) : null }),
      toggleMatchStatsLowerThird: (visible) => {
        const state = get()
        if (visible) {
          // When L3 is enabled, hide all other graphics first
          const hasVisibleGraphics = state.scoreBugVisible || state.goalVisible || state.cardVisible || 
            state.substitutionVisible || state.vsGraphicVisible || state.nameplateVisible || state.lineupVisible
          
          if (hasVisibleGraphics) {
            // Hide all graphics first
            set({
              scoreBugVisible: false,
              goalVisible: false,
              cardVisible: false,
              substitutionVisible: false,
              vsGraphicVisible: false,
              nameplateVisible: false,
              lineupVisible: false,
            })
            // Wait for out animations (~1.5s for most graphics) then show L3
            setTimeout(() => {
              set({ matchStatsLowerThirdVisible: true })
            }, 1500)
          } else {
            set({ matchStatsLowerThirdVisible: true })
          }
        } else {
          set({ matchStatsLowerThirdVisible: false })
        }
      },
      toggleMatchStatsFullScreen: (visible) => set({ matchStatsFullScreenVisible: visible }),
      toggleMatchOfficials: (visible) => set({ matchOfficialsVisible: visible }),

      resetToDefault: () => set({ activePreset: defaultPreset }),
    }),
    {
      name: "localmatch-graphics-storage",
      version: GRAPHICS_STORE_VERSION,
      // Don't persist visibility states - they should always start as false
      partialize: (state) => ({
        activePreset: state.activePreset,
        patterns: state.patterns,
        presets: state.presets,
        // Explicitly exclude all visibility states from persistence
      }),
      // Migration function to handle version changes
      migrate: (persistedState: any, version: number) => {
        if (version < GRAPHICS_STORE_VERSION) {
          // Reset all visibility states on version upgrade
          return {
            ...persistedState,
            scoreBugVisible: false,
            lowerThirdVisible: false,
            tickerVisible: false,
            breakingBannerVisible: false,
            goalVisible: false,
            cardVisible: false,
            substitutionVisible: false,
            vsGraphicVisible: false,
            nameplateVisible: false,
            lineupVisible: false,
            matchStatsLowerThirdVisible: false,
            matchStatsFullScreenVisible: false,
            matchOfficialsVisible: false,
          }
        }
        return persistedState
      },
    },
  ),
)
