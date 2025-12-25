"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// Commentator Preferences Interface (Requirements 9.1, 9.5)
export interface CommentatorPreferences {
  // Display toggles (Requirements 9.2)
  showLineups: boolean
  showStats: boolean
  showOfficials: boolean
  showBench: boolean
  
  // Appearance (Requirements 9.3, 9.4)
  theme: 'light' | 'dark'
  textSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  
  // Event feed (Requirements 4.1, 4.5)
  maxEvents: number           // How many events to show (default 10)
  highlightDuration: number   // How long to highlight new events (seconds)
  
  // Time format (Requirements 11.1, 11.2)
  timeFormat: 'MM:SS' | "MM'"
}

interface CommentatorState extends CommentatorPreferences {
  // Actions
  setPreference: <K extends keyof CommentatorPreferences>(
    key: K,
    value: CommentatorPreferences[K]
  ) => void
  resetToDefaults: () => void
}

// Default preferences (Requirements 9.1, 9.5)
const defaultPreferences: CommentatorPreferences = {
  // Display toggles - all enabled by default
  showLineups: true,
  showStats: true,
  showOfficials: true,
  showBench: true,
  
  // Appearance - medium text, dark theme, normal mode
  theme: 'dark',
  textSize: 'medium',
  compactMode: false,
  
  // Event feed - show 10 events, highlight for 30 seconds
  maxEvents: 10,
  highlightDuration: 30,
  
  // Time format - default to MM:SS for commentator output
  timeFormat: 'MM:SS',
}

export const useCommentatorStore = create<CommentatorState>()(
  persist(
    (set) => ({
      // Initialize with defaults
      ...defaultPreferences,

      // Set individual preference (Requirements 9.5)
      setPreference: (key, value) =>
        set((state) => ({
          [key]: value,
        })),

      // Reset all preferences to defaults (Requirements 9.5)
      resetToDefaults: () => set(defaultPreferences),
    }),
    {
      name: "localmatch-commentator-storage", // localStorage key
      // Persist all preferences (Requirements 9.5)
      partialize: (state) => ({
        showLineups: state.showLineups,
        showStats: state.showStats,
        showOfficials: state.showOfficials,
        showBench: state.showBench,
        theme: state.theme,
        textSize: state.textSize,
        compactMode: state.compactMode,
        maxEvents: state.maxEvents,
        highlightDuration: state.highlightDuration,
        timeFormat: state.timeFormat,
      }),
    },
  ),
)
