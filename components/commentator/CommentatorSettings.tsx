'use client'

import React from 'react'
import { useCommentatorStore } from '@/lib/commentator-store'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/**
 * CommentatorSettings Component
 * 
 * Provides customization options for the commentator output display.
 * All preferences are automatically saved to localStorage via Zustand store.
 * 
 * Requirements:
 * - 9.1: Provide a settings panel for customization
 * - 9.2: Allow toggling visibility of different sections
 * - 9.3: Allow adjusting text size for better readability
 * - 9.4: Allow choosing between light and dark themes
 * - 9.5: Save customization preferences per user
 */
export function CommentatorSettings() {
  const {
    // Display toggles (Requirements 9.2)
    showLineups,
    showStats,
    showOfficials,
    showBench,
    
    // Appearance (Requirements 9.3, 9.4)
    theme,
    textSize,
    compactMode,
    
    // Event feed
    maxEvents,
    highlightDuration,
    
    // Time format
    timeFormat,
    
    // Actions (Requirements 9.5)
    setPreference,
    resetToDefaults,
  } = useCommentatorStore()

  return (
    <div className={`rounded-lg shadow-xl p-6 border ${
      theme === 'light'
        ? 'bg-white border-gray-300'
        : 'bg-gray-800 border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}>Display Settings</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefaults}
          className={theme === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}
        >
          Reset to Defaults
        </Button>
      </div>

      <div className="space-y-6">
        {/* Section Visibility Toggles (Requirements 9.2) */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Section Visibility</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show-lineups" className={`cursor-pointer ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Show Team Lineups
            </Label>
            <Switch
              id="show-lineups"
              checked={showLineups}
              onCheckedChange={(checked) => setPreference('showLineups', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-stats" className={`cursor-pointer ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Show Match Statistics
            </Label>
            <Switch
              id="show-stats"
              checked={showStats}
              onCheckedChange={(checked) => setPreference('showStats', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-officials" className={`cursor-pointer ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Show Match Officials
            </Label>
            <Switch
              id="show-officials"
              checked={showOfficials}
              onCheckedChange={(checked) => setPreference('showOfficials', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-bench" className={`cursor-pointer ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Show Bench Players
            </Label>
            <Switch
              id="show-bench"
              checked={showBench}
              onCheckedChange={(checked) => setPreference('showBench', checked)}
            />
          </div>
        </div>

        {/* Appearance Settings (Requirements 9.3, 9.4) */}
        <div className={`space-y-4 border-t pt-6 ${
          theme === 'light' ? 'border-gray-300' : 'border-gray-700'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Appearance</h3>
          
          {/* Theme Selector (Requirements 9.4) */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('theme', 'dark')}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('theme', 'light')}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light
              </Button>
            </div>
          </div>

          {/* Text Size Selector (Requirements 9.3) */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>Text Size</Label>
            <div className="flex gap-2">
              <Button
                variant={textSize === 'small' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('textSize', 'small')}
                className="flex-1"
              >
                Small
              </Button>
              <Button
                variant={textSize === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('textSize', 'medium')}
                className="flex-1"
              >
                Medium
              </Button>
              <Button
                variant={textSize === 'large' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('textSize', 'large')}
                className="flex-1"
              >
                Large
              </Button>
            </div>
          </div>

          {/* Compact Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="compact-mode" className={`cursor-pointer ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Compact Mode
              <span className={`block text-xs font-normal mt-1 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-500'
              }`}>
                Reduce spacing for more information on screen
              </span>
            </Label>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={(checked) => setPreference('compactMode', checked)}
            />
          </div>
        </div>

        {/* Event Feed Settings */}
        <div className={`space-y-4 border-t pt-6 ${
          theme === 'light' ? 'border-gray-300' : 'border-gray-700'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Event Feed</h3>
          
          {/* Max Events */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
              Maximum Events to Display: {maxEvents}
            </Label>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={maxEvents}
              onChange={(e) => setPreference('maxEvents', parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 ${
                theme === 'light' ? 'bg-gray-300' : 'bg-gray-700'
              }`}
            />
            <div className={`flex justify-between text-xs ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {/* Highlight Duration */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>
              Highlight Duration: {highlightDuration}s
            </Label>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={highlightDuration}
              onChange={(e) => setPreference('highlightDuration', parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 ${
                theme === 'light' ? 'bg-gray-300' : 'bg-gray-700'
              }`}
            />
            <div className={`flex justify-between text-xs ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <span>10s</span>
              <span>60s</span>
            </div>
          </div>
        </div>

        {/* Time Format Settings */}
        <div className={`space-y-4 border-t pt-6 ${
          theme === 'light' ? 'border-gray-300' : 'border-gray-700'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Time Format</h3>
          
          <div className="space-y-2">
            <Label className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>Event Time Display</Label>
            <div className="flex gap-2">
              <Button
                variant={timeFormat === 'MM:SS' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('timeFormat', 'MM:SS')}
                className="flex-1"
              >
                MM:SS (23:45)
              </Button>
              <Button
                variant={timeFormat === "MM'" ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreference('timeFormat', "MM'")}
                className="flex-1"
              >
                MM' (23')
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className={`mt-6 pt-6 border-t ${
        theme === 'light' ? 'border-gray-300' : 'border-gray-700'
      }`}>
        <p className={`text-xs text-center ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-500'
        }`}>
          All settings are automatically saved and will persist across sessions
        </p>
      </div>
    </div>
  )
}
