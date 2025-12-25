"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, RefreshCw, Plus, Trash2, Save, FileSpreadsheet, Upload, Check, Search, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Official, Match } from "@/lib/types"
import { parseCSV, csvToOfficials, getOfficialCSVTemplate } from "@/lib/csv-utils"
import * as db from "@/lib/database"

const roleLabels: Record<string, string> = {
  referee: "Referee",
  ar1: "Assistant Referee 1",
  ar2: "Assistant Referee 2",
  fourth: "4th Official",
}

export function Officials() {
  const { 
    currentMatch, 
    officials: storeOfficials, 
    assignOfficialToMatch, 
    removeOfficialFromMatch, 
    addOfficial, 
    setCurrentPage,
    completeWorkflowStep,
    workflowProgress,
    selectedTournamentId
  } = useAppStore()

  const [officials, setOfficials] = useState<Official[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addOfficialOpen, setAddOfficialOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvContent, setCsvContent] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [newOfficialName, setNewOfficialName] = useState("")
  const [newOfficialBadge, setNewOfficialBadge] = useState("")
  const [newOfficialContact, setNewOfficialContact] = useState("")
  const [newOfficialNationality, setNewOfficialNationality] = useState("")
  const [newOfficialPhoto, setNewOfficialPhoto] = useState("")
  const [confirmRemoveRole, setConfirmRemoveRole] = useState<string | null>(null)
  const [deleteOfficialId, setDeleteOfficialId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasUserMadeChanges = useRef(false) // Track if user has made changes

  // Auto-save officials assignment to database (Requirement 4.4)
  const saveOfficialsToDatabase = useCallback(async () => {
    // Only save if user has made changes (prevents overwriting on initial load)
    if (!hasUserMadeChanges.current) return
    
    // Get fresh state from store to avoid stale closure
    const freshMatch = useAppStore.getState().currentMatch
    if (!freshMatch?.id) return

    setIsSaving(true)
    try {
      await db.saveMatchState({
        ...freshMatch,
        officials: freshMatch.officials,
      } as Match)
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error auto-saving officials:", error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Trigger auto-save when officials change
  useEffect(() => {
    // Save whenever officials array changes (only after user has made changes)
    if (currentMatch?.id && hasUserMadeChanges.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveOfficialsToDatabase()
      }, 500) // 500ms debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [currentMatch?.officials, saveOfficialsToDatabase])

  // Load officials and refresh match from database
  useEffect(() => {
    loadOfficials()
    refreshMatchFromDatabase()
  }, [selectedTournamentId])

  const loadOfficials = async () => {
    setIsLoading(true)
    try {
      // Load officials filtered by selected tournament
      const dbOfficials = await db.getOfficials(selectedTournamentId || undefined)
      setOfficials(dbOfficials.length > 0 ? dbOfficials : storeOfficials)
    } catch (error) {
      console.error("Error loading officials:", error)
      setOfficials(storeOfficials)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh match from database to get latest officials
  const refreshMatchFromDatabase = async () => {
    if (!currentMatch?.id) return
    try {
      const matches = await db.getMatches()
      const dbMatch = matches.find(m => m.id === currentMatch.id)
      if (dbMatch && dbMatch.officials.length > 0) {
        // Update store with officials from database
        useAppStore.setState({
          currentMatch: {
            ...currentMatch,
            officials: dbMatch.officials,
          }
        })
      }
    } catch (error) {
      console.error("Error refreshing match from database:", error)
    }
  }

  const getOfficialByRole = (role: string) => {
    return currentMatch?.officials.find((o) => o.role === role)
  }

  const handleAssign = (role: Official["role"], officialId: string) => {
    // Find the official in local state and pass it to the store
    const officialData = officials.find(o => o.id === officialId)
    hasUserMadeChanges.current = true // Mark that user made changes
    assignOfficialToMatch(officialId, role, officialData)
    toast.success(`${roleLabels[role]} assigned`)
  }

  const handleRemove = (role: string) => {
    hasUserMadeChanges.current = true // Mark that user made changes
    removeOfficialFromMatch(role as Official["role"])
    setConfirmRemoveRole(null)
    toast.success(`${roleLabels[role]} removed`)
  }

  const handleAddOfficial = async () => {
    if (!newOfficialName.trim()) return

    const newOfficial: Official = {
      id: `official-${Date.now()}`,
      name: newOfficialName,
      role: "referee",
      badge: newOfficialBadge || undefined,
      contact: newOfficialContact || undefined,
      nationality: newOfficialNationality || undefined,
      photo: newOfficialPhoto || undefined,
      tournamentId: selectedTournamentId || undefined,
    }

    try {
      await db.createOfficial(newOfficial)
      setOfficials(prev => [...prev, newOfficial])
      addOfficial(newOfficial)
      setAddOfficialOpen(false)
      setNewOfficialName("")
      setNewOfficialBadge("")
      setNewOfficialContact("")
      setNewOfficialNationality("")
      setNewOfficialPhoto("")
      toast.success("Official added")
    } catch (error) {
      console.error("Error adding official:", error)
      toast.error("Failed to add official")
    }
  }

  const handleCSVImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content")
      return
    }

    try {
      const rows = parseCSV<any>(csvContent)
      const newOfficials = csvToOfficials(rows)
      
      if (newOfficials.length === 0) {
        toast.error("No valid officials found in CSV")
        return
      }

      const count = await db.addOfficialsFromCSV(newOfficials)
      setOfficials(prev => [...prev, ...newOfficials])
      newOfficials.forEach(o => addOfficial(o))
      
      setCsvImportOpen(false)
      setCsvContent("")
      toast.success(`Imported ${count} officials`)
    } catch (error) {
      console.error("CSV import error:", error)
      toast.error("Failed to import CSV")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string)
    }
    reader.readAsText(file)
  }

  const handleDeleteOfficial = async () => {
    if (!deleteOfficialId) return

    try {
      await db.deleteOfficial(deleteOfficialId)
      setOfficials(prev => prev.filter(o => o.id !== deleteOfficialId))
      setDeleteOfficialId(null)
      toast.success("Official deleted")
    } catch (error) {
      console.error("Error deleting official:", error)
      toast.error("Failed to delete official")
    }
  }

  const handleSaveAndContinue = () => {
    completeWorkflowStep('officialsAssigned')
    toast.success("Officials assigned! Continue to Lineup Setup")
    setCurrentPage("lineup-setup")
  }

  const filteredOfficials = officials.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if match setup is completed
  if (!workflowProgress.matchSetupCompleted || !currentMatch) {
    return (
      <div className="mt-4 space-y-4">
        <Card className="glass-card border-warning/30 bg-warning/5">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                <User className="h-8 w-8 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Match Setup Not Completed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please complete match setup before assigning officials
                </p>
              </div>
              <Button onClick={() => setCurrentPage("lineup-setup")}>
                Go to Match Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Match Officials</h1>
            {/* Auto-save indicator */}
            {isSaving ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </Badge>
            ) : lastSaved ? (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <Save className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">Assign officials for {currentMatch.homeTeam?.name} vs {currentMatch.awayTeam?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentPage("lineup-setup")}>
            Back
          </Button>
          <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button variant="outline" onClick={() => setAddOfficialOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Official
          </Button>
          <Button onClick={handleSaveAndContinue}>
            <ArrowRight className="h-4 w-4 mr-2" /> Continue
          </Button>
        </div>
      </div>

      {/* Stats & Officials Database */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Officials Database</CardTitle>
                <Badge variant="secondary">{officials.length}</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search officials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary h-8 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOfficials.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No officials found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredOfficials.map((official) => (
                      <div key={official.id} className="flex items-center gap-2 p-2 rounded bg-secondary/50 group">
                        {official.photo ? (
                          <img src={official.photo} alt={official.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{official.name}</p>
                          <div className="flex items-center gap-1">
                            {official.badge && <Badge variant="outline" className="text-[10px] h-4">{official.badge}</Badge>}
                            {official.nationality && <span className="text-[10px] text-muted-foreground">{official.nationality}</span>}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => setDeleteOfficialId(official.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Match Assignment</h3>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {(["referee", "ar1", "ar2", "fourth"] as const).map((role) => {
          const official = getOfficialByRole(role)

          return (
            <Card key={role} className="glass-card min-w-0">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">{roleLabels[role]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {official ? (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-foreground truncate leading-tight">{official.name}</p>
                        {official.badge && (
                          <Badge variant="secondary" className="mt-0.5 text-[10px] h-4 px-1">
                            {official.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Select onValueChange={(val) => handleAssign(role, val)}>
                        <SelectTrigger className="flex-1 bg-input h-7 text-xs">
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            <span>Swap</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {officials
                            .filter((o) => o.id !== official.id)
                            .map((off) => (
                              <SelectItem key={off.id} value={off.id}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{off.name}</span>
                                  {off.badge && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {off.badge}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => setConfirmRemoveRole(role)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Select onValueChange={(val) => handleAssign(role, val)}>
                    <SelectTrigger className="bg-input h-8 text-xs">
                      <SelectValue placeholder="Select official" />
                    </SelectTrigger>
                    <SelectContent>
                      {officials.map((off) => (
                        <SelectItem key={off.id} value={off.id}>
                          <div className="flex items-center gap-2">
                            <span className="truncate">{off.name}</span>
                            {off.badge && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {off.badge}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Official Dialog */}
      <Dialog open={addOfficialOpen} onOpenChange={setAddOfficialOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Add New Official
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newOfficialName}
                  onChange={(e) => setNewOfficialName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={newOfficialNationality}
                  onChange={(e) => setNewOfficialNationality(e.target.value)}
                  placeholder="e.g. England"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Level</Label>
                <Select value={newOfficialBadge} onValueChange={setNewOfficialBadge}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select badge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFA">FIFA</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  value={newOfficialContact}
                  onChange={(e) => setNewOfficialContact(e.target.value)}
                  placeholder="Phone or email"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <div className="flex gap-2">
                <Input
                  value={newOfficialPhoto}
                  onChange={(e) => setNewOfficialPhoto(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="bg-secondary"
                />
                {newOfficialPhoto && (
                  <img src={newOfficialPhoto} alt="Preview" className="h-10 w-10 rounded-full object-cover" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOfficialOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOfficial} disabled={!newOfficialName.trim()}>
              <Check className="h-4 w-4 mr-2" /> Add Official
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
        <DialogContent className="glass-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Officials from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CSV Content</Label>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Upload File
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCsvContent(getOfficialCSVTemplate())}>
                    Load Template
                  </Button>
                </div>
              </div>
              <Textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="name,role,nationality,photo,badge&#10;John Smith,referee,England,,FIFA&#10;Mike Jones,ar1,Wales,,"
                className="bg-secondary font-mono text-xs h-[200px]"
              />
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-sm">
              <p className="font-medium text-blue-500 mb-1">CSV Format</p>
              <p className="text-xs text-muted-foreground">
                Required: <code className="bg-secondary px-1 rounded">name</code>, <code className="bg-secondary px-1 rounded">role</code><br/>
                Optional: <code className="bg-secondary px-1 rounded">nationality</code>, <code className="bg-secondary px-1 rounded">photo</code>, <code className="bg-secondary px-1 rounded">badge</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvContent("") }}>Cancel</Button>
            <Button onClick={handleCSVImport} disabled={!csvContent.trim()}>
              <Check className="h-4 w-4 mr-2" /> Import Officials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemoveRole}
        onOpenChange={() => setConfirmRemoveRole(null)}
        title="Remove Official"
        description={`Are you sure you want to remove the ${confirmRemoveRole ? roleLabels[confirmRemoveRole] : ""} from this match?`}
        onConfirm={() => confirmRemoveRole && handleRemove(confirmRemoveRole)}
        confirmText="Remove"
        destructive
      />

      {/* Delete Official Dialog */}
      <ConfirmDialog
        open={!!deleteOfficialId}
        onOpenChange={() => setDeleteOfficialId(null)}
        title="Delete Official"
        description="Are you sure you want to delete this official from the database?"
        onConfirm={handleDeleteOfficial}
        confirmText="Delete"
        destructive
      />
        </div>
      </div>
    </div>
  )
}
