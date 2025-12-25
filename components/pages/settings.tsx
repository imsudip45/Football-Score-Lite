"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { SPORT_CONFIGS } from "@/lib/sport-config"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, FolderOpen, Keyboard, Globe, Database, Monitor, RotateCcw, Dribbble, Download, Upload, Loader2, Archive, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { SportType } from "@/lib/types"
import * as db from "@/lib/database"
import JSZip from "jszip"

export function Settings() {
  const { settings, updateSettings, sportType, setSportType, getSportConfig } = useAppStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [storageStats, setStorageStats] = useState<{
    matchCount: number
    completedMatchCount: number
    abandonedMatchCount: number
    liveMatchCount: number
    draftMatchCount: number
    teamCount: number
    playerCount: number
    tournamentCount: number
  } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  
  // Load storage stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await db.getStorageStats()
        setStorageStats(stats)
      } catch (error) {
        console.error("Failed to load storage stats:", error)
      }
    }
    loadStats()
  }, [])

  const sportConfig = getSportConfig()

  // Export database as ZIP with images and settings
  const handleExportData = async () => {
    setExporting(true)
    try {
      const zip = new JSZip()
      
      // Get all database data
      const jsonData = await db.exportDatabase()
      const data = JSON.parse(jsonData)
      
      // Extract images from data and replace with file references
      const images: { path: string; data: string }[] = []
      let imageIndex = 0
      
      // Process team logos
      if (data.teams) {
        for (const team of data.teams) {
          if (team.logo && team.logo.startsWith('data:')) {
            const imgPath = `images/team_${team.id}_logo.png`
            images.push({ path: imgPath, data: team.logo })
            team.logo = `zip://${imgPath}`
            imageIndex++
          }
        }
      }
      
      // Process player photos
      if (data.players) {
        for (const player of data.players) {
          if (player.photo && player.photo.startsWith('data:')) {
            const imgPath = `images/player_${player.id}_photo.png`
            images.push({ path: imgPath, data: player.photo })
            player.photo = `zip://${imgPath}`
            imageIndex++
          }
        }
      }
      
      // Process official photos
      if (data.officials) {
        for (const official of data.officials) {
          if (official.photo && official.photo.startsWith('data:')) {
            const imgPath = `images/official_${official.id}_photo.png`
            images.push({ path: imgPath, data: official.photo })
            official.photo = `zip://${imgPath}`
            imageIndex++
          }
        }
      }
      
      // Process tournament logos
      if (data.tournaments) {
        for (const tournament of data.tournaments) {
          if (tournament.logo && tournament.logo.startsWith('data:')) {
            const imgPath = `images/tournament_${tournament.id}_logo.png`
            images.push({ path: imgPath, data: tournament.logo })
            tournament.logo = `zip://${imgPath}`
            imageIndex++
          }
        }
      }
      
      // Add database JSON to zip
      zip.file('database.json', JSON.stringify(data, null, 2))
      
      // Add images to zip
      for (const img of images) {
        const base64Data = img.data.split(',')[1]
        zip.file(img.path, base64Data, { base64: true })
      }
      
      // Export localStorage settings (graphics customization, app settings)
      const localStorageData: Record<string, string> = {}
      const keysToExport = [
        'localmatch-graphics-customization',
        'localmatch-pro-storage',
      ]
      for (const key of keysToExport) {
        const value = localStorage.getItem(key)
        if (value) {
          localStorageData[key] = value
        }
      }
      zip.file('localStorage.json', JSON.stringify(localStorageData, null, 2))
      
      // Add metadata
      zip.file('metadata.json', JSON.stringify({
        version: '2.0',
        exportDate: new Date().toISOString(),
        imageCount: images.length,
        includesSettings: true,
        includesGraphicsCustomization: !!localStorageData['localmatch-graphics-customization'],
      }, null, 2))
      
      // Generate and download zip
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `local-match-pro-backup-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Exported successfully (${images.length} images, settings included)`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    } finally {
      setExporting(false)
    }
  }

  // Import database from ZIP
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    try {
      const zip = await JSZip.loadAsync(file)
      
      // Read database.json
      const dbFile = zip.file('database.json')
      if (!dbFile) {
        throw new Error('Invalid backup file - missing database.json')
      }
      
      const dbContent = await dbFile.async('string')
      const data = JSON.parse(dbContent)
      
      // Restore images from zip
      if (data.teams) {
        for (const team of data.teams) {
          if (team.logo && team.logo.startsWith('zip://')) {
            const imgPath = team.logo.replace('zip://', '')
            const imgFile = zip.file(imgPath)
            if (imgFile) {
              const imgData = await imgFile.async('base64')
              team.logo = `data:image/png;base64,${imgData}`
            } else {
              team.logo = undefined
            }
          }
        }
      }
      
      if (data.players) {
        for (const player of data.players) {
          if (player.photo && player.photo.startsWith('zip://')) {
            const imgPath = player.photo.replace('zip://', '')
            const imgFile = zip.file(imgPath)
            if (imgFile) {
              const imgData = await imgFile.async('base64')
              player.photo = `data:image/png;base64,${imgData}`
            } else {
              player.photo = undefined
            }
          }
        }
      }
      
      if (data.officials) {
        for (const official of data.officials) {
          if (official.photo && official.photo.startsWith('zip://')) {
            const imgPath = official.photo.replace('zip://', '')
            const imgFile = zip.file(imgPath)
            if (imgFile) {
              const imgData = await imgFile.async('base64')
              official.photo = `data:image/png;base64,${imgData}`
            } else {
              official.photo = undefined
            }
          }
        }
      }
      
      if (data.tournaments) {
        for (const tournament of data.tournaments) {
          if (tournament.logo && tournament.logo.startsWith('zip://')) {
            const imgPath = tournament.logo.replace('zip://', '')
            const imgFile = zip.file(imgPath)
            if (imgFile) {
              const imgData = await imgFile.async('base64')
              tournament.logo = `data:image/png;base64,${imgData}`
            } else {
              tournament.logo = undefined
            }
          }
        }
      }
      
      // Import to database
      await db.importDatabase(JSON.stringify(data))
      
      // Import localStorage settings (graphics customization, app settings)
      const localStorageFile = zip.file('localStorage.json')
      if (localStorageFile) {
        try {
          const localStorageContent = await localStorageFile.async('string')
          const localStorageData = JSON.parse(localStorageContent)
          
          // Restore each localStorage key
          for (const [key, value] of Object.entries(localStorageData)) {
            if (typeof value === 'string') {
              localStorage.setItem(key, value)
            }
          }
        } catch (localStorageError) {
          console.warn("Could not restore localStorage settings:", localStorageError)
        }
      }
      
      setImportDialogOpen(false)
      toast.success("Data imported successfully! Refresh the page to see changes.")
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import data - invalid backup file")
    } finally {
      setImporting(false)
      if (importFileRef.current) {
        importFileRef.current.value = ''
      }
    }
  }

  const handleSave = () => {
    updateSettings(localSettings)
    toast.success("Settings saved successfully")
  }

  const handleReset = () => {
    const defaultSettings = {
      storagePath: "/Users/operator/LocalMatchPro/data",
      autosaveInterval: 30,
      obsHost: "localhost",
      obsPort: 3001,
      autoReconnect: true,
      language: "en",
      highContrastMode: false,
      timeFormat: "MM'" as const, // Default to MM' for backward compatibility
    }
    setLocalSettings(defaultSettings)
    updateSettings(defaultSettings)
    toast.success("Settings reset to defaults")
  }

  // Clear old matches - Requirements 12.3
  const handleClearOldMatches = async (days: number) => {
    setClearing(true)
    try {
      const count = await db.clearOldMatches(days)
      const stats = await db.getStorageStats()
      setStorageStats(stats)
      toast.success(`Cleared ${count} old matches`)
      setClearDataDialogOpen(false)
    } catch (error) {
      console.error("Failed to clear old matches:", error)
      toast.error("Failed to clear old matches")
    } finally {
      setClearing(false)
    }
  }

  // Clear completed matches - Requirements 12.3
  const handleClearCompletedMatches = async () => {
    setClearing(true)
    try {
      const count = await db.clearCompletedMatches()
      const stats = await db.getStorageStats()
      setStorageStats(stats)
      toast.success(`Cleared ${count} completed matches`)
      setClearDataDialogOpen(false)
    } catch (error) {
      console.error("Failed to clear completed matches:", error)
      toast.error("Failed to clear completed matches")
    } finally {
      setClearing(false)
    }
  }

  // Clear abandoned matches - Requirements 12.3
  const handleClearAbandonedMatches = async () => {
    setClearing(true)
    try {
      const count = await db.clearAbandonedMatches()
      const stats = await db.getStorageStats()
      setStorageStats(stats)
      toast.success(`Cleared ${count} abandoned matches`)
      setClearDataDialogOpen(false)
    } catch (error) {
      console.error("Failed to clear abandoned matches:", error)
      toast.error("Failed to clear abandoned matches")
    } finally {
      setClearing(false)
    }
  }

  // Reset all data - clear everything
  const handleResetAllData = async () => {
    setClearing(true)
    try {
      await db.clearDatabase()
      // Clear localStorage
      localStorage.removeItem('localmatch-pro-storage')
      localStorage.removeItem('localmatch-graphics-customization')
      toast.success("All data cleared! Reloading...")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error("Failed to reset all data:", error)
      toast.error("Failed to reset all data")
    } finally {
      setClearing(false)
    }
  }

  const handleSportChange = (newSport: SportType) => {
    setSportType(newSport)
    toast.success(`Switched to ${SPORT_CONFIGS[newSport].name} mode`)
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure application preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dribbble className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Sport Mode</CardTitle>
            </div>
            <CardDescription>Choose between Football and Futsal configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.values(SPORT_CONFIGS).map((config) => (
                <button
                  key={config.type}
                  onClick={() => handleSportChange(config.type)}
                  className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all ${
                    sportType === config.type
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                  }`}
                >
                  {/* Sport Icon */}
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-lg ${
                      sportType === config.type ? "bg-primary/20" : "bg-secondary"
                    }`}
                  >
                    {config.type === "football" ? (
                      <svg
                        className={`h-8 w-8 ${sportType === config.type ? "text-primary" : "text-muted-foreground"}`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-.52.07-1.06.07-1.59.07-.53 0-1.06 0-1.59-.07V17h3.18v2.93zM7 14.5L5.5 12 7 9.5h10l1.5 2.5-1.5 2.5H7zm5-9.43c.53 0 1.06 0 1.59.07V8h-3.18V5.07c.53-.07 1.06-.07 1.59-.07z" />
                      </svg>
                    ) : (
                      <svg
                        className={`h-8 w-8 ${sportType === config.type ? "text-primary" : "text-muted-foreground"}`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect
                          x="2"
                          y="6"
                          width="20"
                          height="12"
                          rx="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                  </div>

                  {/* Sport Details */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${sportType === config.type ? "text-primary" : "text-foreground"}`}>
                        {config.name}
                      </h3>
                      {sportType === config.type && (
                        <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.maxLineupSize}v{config.maxLineupSize} • {config.defaultPeriodLength} min halves
                    </p>
                  </div>

                  {/* Selected indicator */}
                  {sportType === config.type && (
                    <div className="absolute right-3 top-3">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Current mode info */}
            <div className="mt-4 rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Mode: {sportConfig.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sportConfig.maxLineupSize} players per side • {sportConfig.defaultPeriodLength} minute periods •{" "}
                    {sportConfig.extraTimePeriodLength} min extra time periods
                  </p>
                </div>
                <Badge variant="outline" className="border-primary text-primary">
                  {sportConfig.positions.join(" / ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Storage</CardTitle>
            </div>
            <CardDescription>Configure local storage and autosave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storage-path">Storage Location</Label>
              <div className="flex gap-2">
                <Input
                  id="storage-path"
                  value={localSettings.storagePath}
                  onChange={(e) => setLocalSettings({ ...localSettings, storagePath: e.target.value })}
                  className="bg-input flex-1"
                />
                <Button variant="outline" size="icon">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="autosave">Autosave Interval</Label>
              <Select
                value={String(localSettings.autosaveInterval)}
                onValueChange={(val) => setLocalSettings({ ...localSettings, autosaveInterval: Number.parseInt(val) })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* OBS Settings */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">OBS Integration</CardTitle>
            </div>
            <CardDescription>Configure OBS browser source URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obs-host">OBS Host</Label>
              <Input
                id="obs-host"
                value={localSettings.obsHost}
                onChange={(e) => setLocalSettings({ ...localSettings, obsHost: e.target.value })}
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs-port">Default Port</Label>
              <Input
                id="obs-port"
                type="number"
                value={localSettings.obsPort}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, obsPort: Number.parseInt(e.target.value) || 3001 })
                }
                className="bg-input"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
              <div>
                <Label className="text-foreground">Auto-reconnect</Label>
                <p className="text-xs text-muted-foreground">Automatically reconnect to OBS</p>
              </div>
              <Switch
                checked={localSettings.autoReconnect}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoReconnect: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Hotkeys</CardTitle>
            </div>
            <CardDescription>Keyboard shortcuts for quick actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "New Match", shortcut: "Ctrl/Cmd + N" },
                { action: "Save Match", shortcut: "Ctrl/Cmd + S" },
                { action: "Toggle Timer", shortcut: "Space" },
                { action: "Home Score +/-", shortcut: "1 / Shift+1" },
                { action: "Away Score +/-", shortcut: "2 / Shift+2" },
                { action: "Undo", shortcut: "Ctrl/Cmd + Z" },
                { action: "Redo", shortcut: "Ctrl/Cmd + Shift + Z" },
                { action: "Lower Third", shortcut: "L" },
                { action: "Ticker", shortcut: "T" },
                { action: "Breaking Banner", shortcut: "B" },
              ].map((item) => (
                <div key={item.action} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.action}</span>
                  <code className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">{item.shortcut}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Language & Accessibility</CardTitle>
            </div>
            <CardDescription>Set interface language and accessibility options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Interface Language</Label>
              <Select
                value={localSettings.language}
                onValueChange={(val) => setLocalSettings({ ...localSettings, language: val })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Espanol</SelectItem>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Time Format</Label>
              <Select
                value={localSettings.timeFormat}
                onValueChange={(val: 'MM:SS' | "MM'") => setLocalSettings({ ...localSettings, timeFormat: val })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM:SS">MM:SS (23:45)</SelectItem>
                  <SelectItem value="MM'">MM' (23')</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how event times are displayed throughout the application
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
              <div>
                <Label className="text-foreground">High Contrast Mode</Label>
                <p className="text-xs text-muted-foreground">Increase contrast for accessibility</p>
              </div>
              <Switch
                checked={localSettings.highContrastMode}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, highContrastMode: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Backup */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Data Backup & Transfer</CardTitle>
            </div>
            <CardDescription>Export or import all your data including teams, players, matches, and images</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Export Section */}
              <div className="rounded-lg bg-secondary/50 p-4">
                <h3 className="font-medium text-foreground mb-2">Export Data</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Download a ZIP file containing all your data including team logos and player photos.
                  Use this to backup your data or transfer to another browser/device.
                </p>
                <Button onClick={handleExportData} disabled={exporting} className="w-full">
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data (.zip)
                    </>
                  )}
                </Button>
              </div>

              {/* Import Section */}
              <div className="rounded-lg bg-secondary/50 p-4">
                <h3 className="font-medium text-foreground mb-2">Import Data</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Restore data from a previously exported ZIP backup file.
                  This will replace all existing data.
                </p>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Backup (.zip)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Management - Requirements 12.3 */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Storage Management</CardTitle>
            </div>
            <CardDescription>Monitor storage usage and clear old data to free up space</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Storage Stats */}
            {storageStats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{storageStats.matchCount}</div>
                  <div className="text-xs text-muted-foreground">Total Matches</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{storageStats.completedMatchCount}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{storageStats.abandonedMatchCount}</div>
                  <div className="text-xs text-muted-foreground">Abandoned</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{storageStats.teamCount}</div>
                  <div className="text-xs text-muted-foreground">Teams</div>
                </div>
              </div>
            )}

            {/* Clear Data Actions */}
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="font-medium text-foreground">Clear Match Data</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Free up storage space by removing old match data. This action cannot be undone.
                Live and draft matches will not be affected.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setClearDataDialogOpen(true)} 
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Manage Match Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Confirmation Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Backup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-yellow-500/10 p-3 text-sm border border-yellow-500/20">
              <p className="font-medium text-yellow-600 mb-1">⚠️ Warning</p>
              <p className="text-xs text-muted-foreground">
                Importing will replace ALL existing data including teams, players, matches, officials, and tournaments.
                Make sure to export your current data first if you want to keep it.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Select Backup File (.zip)</Label>
              <input
                ref={importFileRef}
                type="file"
                accept=".zip"
                onChange={handleImportData}
                disabled={importing}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing data...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog - Requirements 12.3 */}
      <Dialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Clear Match Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-3 text-sm border border-destructive/20">
              <p className="font-medium text-destructive mb-1">⚠️ Warning</p>
              <p className="text-xs text-muted-foreground">
                This will permanently delete match data. Live and draft matches will not be affected.
                Consider exporting your data first.
              </p>
            </div>

            {storageStats && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Current storage: {storageStats.completedMatchCount} completed, {storageStats.abandonedMatchCount} abandoned matches
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => handleClearOldMatches(30)}
                    disabled={clearing}
                    className="w-full justify-start"
                  >
                    {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Clear matches older than 30 days
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleClearOldMatches(7)}
                    disabled={clearing}
                    className="w-full justify-start"
                  >
                    {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Clear matches older than 7 days
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClearAbandonedMatches}
                    disabled={clearing || storageStats.abandonedMatchCount === 0}
                    className="w-full justify-start"
                  >
                    {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Clear all abandoned matches ({storageStats.abandonedMatchCount})
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClearCompletedMatches}
                    disabled={clearing || storageStats.completedMatchCount === 0}
                    className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Clear all completed matches ({storageStats.completedMatchCount})
                  </Button>

                  <div className="border-t border-destructive/20 pt-3 mt-3">
                    <Button
                      variant="destructive"
                      onClick={handleResetAllData}
                      disabled={clearing}
                      className="w-full justify-start"
                    >
                      {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                      🔴 RESET ALL DATA (Tournaments, Teams, Matches, Officials)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDataDialogOpen(false)} disabled={clearing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
