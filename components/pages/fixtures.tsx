"use client"

import { useState, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar, Plus, Loader2, Gamepad2, Trash2, X, User, FileSpreadsheet, Upload, Check, Search, UserCheck, Edit2
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import * as db from "@/lib/database"
import type { Match, Tournament, Official } from "@/lib/types"
import { parseCSV, csvToOfficials, getOfficialCSVTemplate } from "@/lib/csv-utils"

export function Fixtures() {
  const { 
    setCurrentPage, setCurrentMatch, teams: storeTeams, getSportConfig,
    selectedTournamentId, setSelectedTournament, completeWorkflowStep, addOfficial,
  } = useAppStore()
  
  // Fixtures state
  const [matches, setMatches] = useState<Match[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teams, setTeams] = useState(storeTeams)
  const [loading, setLoading] = useState(true)
  const [showFixtureForm, setShowFixtureForm] = useState(false)
  const [homeTeamId, setHomeTeamId] = useState("")
  const [awayTeamId, setAwayTeamId] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [venue, setVenue] = useState("")
  const [round, setRound] = useState("")
  const [creating, setCreating] = useState(false)

  // Officials state
  const [officials, setOfficials] = useState<Official[]>([])
  const [addOfficialOpen, setAddOfficialOpen] = useState(false)
  const [editOfficialOpen, setEditOfficialOpen] = useState(false)
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvContent, setCsvContent] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [newOfficialName, setNewOfficialName] = useState("")
  const [newOfficialBadge, setNewOfficialBadge] = useState("")
  const [newOfficialNationality, setNewOfficialNationality] = useState("")
  const [newOfficialPhoto, setNewOfficialPhoto] = useState("")
  const [deleteOfficialId, setDeleteOfficialId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const officialPhotoInputRef = useRef<HTMLInputElement>(null)

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const homeTeam = teams.find(t => t.id === homeTeamId)
  const awayTeam = teams.find(t => t.id === awayTeamId)

  useEffect(() => { loadData() }, [selectedTournamentId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dbMatches, dbTournaments, dbTeams, dbOfficials] = await Promise.all([
        db.getMatches(selectedTournamentId || undefined),
        db.getTournaments(),
        db.getTeams(selectedTournamentId || undefined),
        db.getOfficials(selectedTournamentId || undefined),
      ])
      
      // Auto-select latest tournament if none selected
      if (dbTournaments.length > 0 && !selectedTournamentId) {
        const latestTournament = dbTournaments[0] // Already sorted by createdAt desc
        setSelectedTournament(latestTournament.id)
        // Reload with the selected tournament
        const filteredMatches = await db.getMatches(latestTournament.id)
        setMatches(filteredMatches)
      } else {
        setMatches(dbMatches)
      }
      
      setTournaments(dbTournaments)
      if (dbTeams.length > 0) setTeams(dbTeams)
      setOfficials(dbOfficials)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFixture = async () => {
    if (!homeTeamId || !awayTeamId) { toast.error("Select both teams"); return }
    if (homeTeamId === awayTeamId) { toast.error("Teams must be different"); return }
    if (!venue) { toast.error("Enter venue"); return }
    if (tournaments.length === 0) { toast.error("Create a tournament first"); return }
    
    const tournamentToUse = selectedTournament || tournaments[0]
    setCreating(true)
    try {
      const homeTeamData = teams.find(t => t.id === homeTeamId)
      const awayTeamData = teams.find(t => t.id === awayTeamId)
      if (!homeTeamData || !awayTeamData) { toast.error("Teams not found"); return }

      const sportConfig = getSportConfig()
      const kickoffDate = matchDate ? new Date(matchDate) : new Date()

      const newMatch: Match = {
        id: `match-${Date.now()}`, homeTeam: homeTeamData, awayTeam: awayTeamData,
        homeScore: 0, awayScore: 0,
        homeFouls: 0, awayFouls: 0,
        homeShots: 0, awayShots: 0,
        homeShotsOnTarget: 0, awayShotsOnTarget: 0,
        homePossession: 50, awayPossession: 50,
        homeOffsides: 0, awayOffsides: 0,
        homeCorners: 0, awayCorners: 0,
        competition: tournamentToUse?.name || "Friendly",
        competitionShortName: tournamentToUse?.shortName || "FRI",
        competitionLogo: tournamentToUse?.logo || "",
        tournamentId: tournamentToUse?.id,
        tournamentColor: tournamentToUse?.color || "#EF3E42",
        round: round || "", venue, kickoff: kickoffDate, status: "draft", period: "pre",
        periodLength: sportConfig.defaultPeriodLength, stoppageTime: 0,
        extraTimeVisible: false, extraTimeEnabled: false, penaltiesEnabled: false,
        penalties: [], homePenaltyScore: 0, awayPenaltyScore: 0,
        homeFormation: homeTeamData.defaultFormation || "4-3-3",
        awayFormation: awayTeamData.defaultFormation || "4-3-3",
        homeLineup: homeTeamData.players.slice(0, sportConfig.maxLineupSize).map((p: any, i: number) => ({ player: p, position: i + 1 })),
        awayLineup: awayTeamData.players.slice(0, sportConfig.maxLineupSize).map((p: any, i: number) => ({ player: p, position: i + 1 })),
        homeBench: homeTeamData.players.slice(sportConfig.maxLineupSize).map((p: any, i: number) => ({ player: p, position: i + sportConfig.maxLineupSize + 1 })),
        awayBench: awayTeamData.players.slice(sportConfig.maxLineupSize).map((p: any, i: number) => ({ player: p, position: i + sportConfig.maxLineupSize + 1 })),
        events: [], officials: [], createdAt: new Date(), updatedAt: new Date(),
      }

      await db.createMatch(newMatch)
      setMatches(prev => [newMatch, ...prev])
      setCurrentMatch(newMatch)
      completeWorkflowStep('fixtureCreated')
      toast.success("Fixture created!")
      setHomeTeamId(""); setAwayTeamId(""); setVenue(""); setRound(""); setMatchDate("")
      setShowFixtureForm(false)
      setTimeout(() => setCurrentPage("lineup-setup"), 500)
    } catch (error) { toast.error("Failed to create fixture") }
    finally { setCreating(false) }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Delete this match?")) return
    try {
      await db.deleteMatch(matchId)
      setMatches(prev => prev.filter(m => m.id !== matchId))
      toast.success("Match deleted")
    } catch (error) { toast.error("Failed to delete") }
  }

  const handleLoadMatch = (match: Match) => {
    setCurrentMatch(match)
    completeWorkflowStep('fixtureCreated')
    toast.success(`Loaded: ${match.homeTeam.name} vs ${match.awayTeam.name}`)
    setTimeout(() => setCurrentPage("lineup-setup"), 300)
  }

  // Officials handlers
  const resetOfficialForm = () => {
    setNewOfficialName("")
    setNewOfficialBadge("")
    setNewOfficialNationality("")
    setNewOfficialPhoto("")
  }

  const handleOfficialPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return }
    const reader = new FileReader()
    reader.onload = (event) => setNewOfficialPhoto(event.target?.result as string)
    reader.onerror = () => toast.error('Failed to read image file')
    reader.readAsDataURL(file)
  }

  const handleAddOfficial = async () => {
    if (!newOfficialName.trim()) return
    const newOfficial: Official = {
      id: `official-${Date.now()}`, name: newOfficialName, role: "referee",
      badge: newOfficialBadge || undefined, nationality: newOfficialNationality || undefined,
      photo: newOfficialPhoto || undefined,
      tournamentId: selectedTournamentId || undefined,
    }
    try {
      await db.createOfficial(newOfficial)
      setOfficials(prev => [...prev, newOfficial])
      addOfficial(newOfficial)
      setAddOfficialOpen(false)
      resetOfficialForm()
      toast.success("Official added")
    } catch (error) { toast.error("Failed to add official") }
  }

  const openEditOfficial = (official: Official) => {
    setEditingOfficial(official)
    setNewOfficialName(official.name)
    setNewOfficialBadge(official.badge || "")
    setNewOfficialNationality(official.nationality || "")
    setNewOfficialPhoto(official.photo || "")
    setEditOfficialOpen(true)
  }

  const handleUpdateOfficial = async () => {
    if (!editingOfficial || !newOfficialName.trim()) return
    try {
      const updates = {
        name: newOfficialName,
        badge: newOfficialBadge || undefined,
        nationality: newOfficialNationality || undefined,
        photo: newOfficialPhoto || undefined,
      }
      await db.updateOfficial(editingOfficial.id, updates)
      setOfficials(prev => prev.map(o => o.id === editingOfficial.id ? { ...o, ...updates } : o))
      setEditOfficialOpen(false)
      setEditingOfficial(null)
      resetOfficialForm()
      toast.success("Official updated")
    } catch (error) { toast.error("Failed to update official") }
  }

  const handleCSVImport = async () => {
    if (!csvContent.trim()) { toast.error("Please paste CSV content"); return }
    try {
      const rows = parseCSV<any>(csvContent)
      const newOfficials = csvToOfficials(rows)
      if (newOfficials.length === 0) { toast.error("No valid officials found in CSV"); return }
      const count = await db.addOfficialsFromCSV(newOfficials)
      setOfficials(prev => [...prev, ...newOfficials])
      newOfficials.forEach(o => addOfficial(o))
      setCsvImportOpen(false); setCsvContent("")
      toast.success(`Imported ${count} officials`)
    } catch (error) { toast.error("Failed to import CSV") }
  }

  const handleDeleteOfficial = async () => {
    if (!deleteOfficialId) return
    try {
      await db.deleteOfficial(deleteOfficialId)
      setOfficials(prev => prev.filter(o => o.id !== deleteOfficialId))
      setDeleteOfficialId(null)
      toast.success("Official deleted")
    } catch (error) { toast.error("Failed to delete official") }
  }

  const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))

  const filteredOfficials = officials.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* FIXTURES SECTION */}
      <div className="bg-white dark:bg-card rounded-lg p-4 w-full border border-gray-200 dark:border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <img src="./vs.svg" alt="VS" className="h-6 w-6 object-contain" /> Fixtures
          </h2>
          <Button size="sm" onClick={() => setShowFixtureForm(!showFixtureForm)} disabled={tournaments.length === 0}
            variant={showFixtureForm ? "secondary" : "default"}>
            {showFixtureForm ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Plus className="h-4 w-4 mr-1" /> Create Fixture</>}
          </Button>
        </div>

        {/* Fixture Create Form */}
        {showFixtureForm && tournaments.length > 0 && (
          <Card className="glass-card mb-4">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Home Team</Label>
                  <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                    <SelectTrigger className="bg-secondary">
                      {homeTeam ? (
                        <div className="flex items-center gap-2">
                          {homeTeam.logo ? <img src={homeTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" /> :
                            <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: homeTeam.primaryColor }}>{homeTeam.shortName.slice(0, 2)}</div>}
                          <span>{homeTeam.name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">Select home team</span>}
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              {team.logo ? <img src={team.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" /> :
                                <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: team.primaryColor }}>{team.shortName.slice(0, 2)}</div>}
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Away Team</Label>
                  <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                    <SelectTrigger className="bg-secondary">
                      {awayTeam ? (
                        <div className="flex items-center gap-2">
                          {awayTeam.logo ? <img src={awayTeam.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" /> :
                            <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: awayTeam.primaryColor }}>{awayTeam.shortName.slice(0, 2)}</div>}
                          <span>{awayTeam.name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">Select away team</span>}
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              {team.logo ? <img src={team.logo} alt="" className="h-5 w-5 rounded object-contain bg-white p-0.5" /> :
                                <div className="h-5 w-5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: team.primaryColor }}>{team.shortName.slice(0, 2)}</div>}
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Match</Label>
                  <Input placeholder="Match 1" value={round} onChange={(e) => setRound(e.target.value)} className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Venue</Label>
                  <Input placeholder="Stadium" value={venue} onChange={(e) => setVenue(e.target.value)} className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-secondary" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateFixture} disabled={creating || !homeTeamId || !awayTeamId || !venue}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Create Fixture
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixtures List */}
        {tournaments.length === 0 ? (
          <div className="py-6 text-center">
            <Calendar className="h-10 w-10 mx-auto text-warning mb-3" />
            <p className="text-sm text-muted-foreground">Create a tournament first to add fixtures</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-6 text-center">
            <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No fixtures yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.filter(m => m.status === "live").length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                </p>
                {matches.filter(m => m.status === "live").map(match => (
                  <MatchRow key={match.id} match={match} onDelete={handleDeleteMatch} onLoad={handleLoadMatch} formatDate={formatDate} />
                ))}
              </>
            )}
            {matches.filter(m => m.status === "draft").length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-1 mt-3">UPCOMING</p>
                {matches.filter(m => m.status === "draft").map(match => (
                  <MatchRow key={match.id} match={match} onDelete={handleDeleteMatch} onLoad={handleLoadMatch} formatDate={formatDate} />
                ))}
              </>
            )}
            {matches.filter(m => m.status === "completed").length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-1 mt-3">COMPLETED</p>
                {matches.filter(m => m.status === "completed").map(match => (
                  <MatchRow key={match.id} match={match} onDelete={handleDeleteMatch} onLoad={handleLoadMatch} formatDate={formatDate} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* OFFICIALS SECTION */}
      <div className="bg-white dark:bg-card rounded-lg p-4 w-full border border-gray-200 dark:border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> Officials
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCsvImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setAddOfficialOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Official
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search officials..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary h-9" />
        </div>

        {/* Officials List */}
        {officials.length === 0 ? (
          <div className="py-6 text-center">
            <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No officials yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOfficials.map((official) => (
              <div key={official.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 group">
                {official.photo ? (
                  <img src={official.photo} alt={official.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{official.name}</p>
                  <div className="flex items-center gap-2">
                    {official.badge && <Badge variant="outline" className="text-xs">{official.badge}</Badge>}
                    {official.nationality && <span className="text-xs text-muted-foreground">{official.nationality}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => openEditOfficial(official)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => setDeleteOfficialId(official.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Official Dialog */}
      <Dialog open={addOfficialOpen} onOpenChange={(open) => { if (!open) { setAddOfficialOpen(false); resetOfficialForm() } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Add New Official</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex gap-3 items-center">
                <input ref={officialPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleOfficialPhotoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => officialPhotoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
                {newOfficialPhoto ? (
                  <>
                    <img src={newOfficialPhoto} alt="" className="h-10 w-10 rounded-full object-cover border" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setNewOfficialPhoto("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newOfficialName} onChange={(e) => setNewOfficialName(e.target.value)} placeholder="e.g. John Smith" className="bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Level</Label>
                <Select value={newOfficialBadge} onValueChange={setNewOfficialBadge}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select badge" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFA">FIFA</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={newOfficialNationality} onChange={(e) => setNewOfficialNationality(e.target.value)} placeholder="e.g. England" className="bg-secondary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOfficialOpen(false); resetOfficialForm() }}>Cancel</Button>
            <Button onClick={handleAddOfficial} disabled={!newOfficialName.trim()}><Check className="h-4 w-4 mr-2" /> Add Official</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Official Dialog */}
      <Dialog open={editOfficialOpen} onOpenChange={(open) => { if (!open) { setEditOfficialOpen(false); setEditingOfficial(null); resetOfficialForm() } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="h-5 w-5" /> Edit Official</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex gap-3 items-center">
                <input ref={officialPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleOfficialPhotoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => officialPhotoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
                {newOfficialPhoto ? (
                  <>
                    <img src={newOfficialPhoto} alt="" className="h-10 w-10 rounded-full object-cover border" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setNewOfficialPhoto("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newOfficialName} onChange={(e) => setNewOfficialName(e.target.value)} placeholder="e.g. John Smith" className="bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Level</Label>
                <Select value={newOfficialBadge} onValueChange={setNewOfficialBadge}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select badge" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFA">FIFA</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={newOfficialNationality} onChange={(e) => setNewOfficialNationality(e.target.value)} placeholder="e.g. England" className="bg-secondary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOfficialOpen(false); setEditingOfficial(null); resetOfficialForm() }}>Cancel</Button>
            <Button onClick={handleUpdateOfficial} disabled={!newOfficialName.trim()}><Check className="h-4 w-4 mr-2" /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Import Officials from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Two main options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) { const reader = new FileReader(); reader.onload = (ev) => setCsvContent(ev.target?.result as string); reader.readAsText(file) }
                }} />
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-6 w-6" />
                  <span>Import CSV File</span>
                </Button>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2" onClick={() => {
                  const template = getOfficialCSVTemplate()
                  const blob = new Blob([template], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'officials_template.csv'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  toast.success('Template downloaded')
                }}>
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>Download Template</span>
                </Button>
              </div>
            </div>
            
            {/* CSV Content Preview/Edit */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">CSV Content (columns: name, role, nationality, badge)</Label>
              <Textarea value={csvContent} onChange={(e) => setCsvContent(e.target.value)}
                placeholder="name,role,nationality,badge&#10;John Smith,referee,England,FIFA&#10;Jane Doe,assistant,Spain,National" className="bg-secondary font-mono text-xs h-[120px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvContent("") }}>Cancel</Button>
            <Button onClick={handleCSVImport} disabled={!csvContent.trim()}><Check className="h-4 w-4 mr-2" /> Import Officials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Official Dialog */}
      <ConfirmDialog open={!!deleteOfficialId} onOpenChange={() => setDeleteOfficialId(null)}
        title="Delete Official" description="Are you sure you want to delete this official?"
        onConfirm={handleDeleteOfficial} confirmText="Delete" destructive />
    </div>
  )
}

function MatchRow({ match, onDelete, onLoad, formatDate }: { match: Match; onDelete: (id: string) => void; onLoad: (match: Match) => void; formatDate: (d: Date) => string }) {
  return (
    <div className="bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-all group p-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3 w-[180px] justify-end">
            <span className="text-base font-medium truncate">{match.homeTeam?.name || "Home"}</span>
            {match.homeTeam?.logo ? <img src={match.homeTeam.logo} alt="" className="h-10 w-10 rounded object-contain bg-white p-0.5 shrink-0" /> :
              <div className="h-10 w-10 rounded text-xs font-bold text-white flex items-center justify-center shrink-0" style={{ backgroundColor: match.homeTeam?.primaryColor || "#666" }}>{match.homeTeam?.shortName?.slice(0, 2) || "HM"}</div>}
          </div>
          <div className="flex items-center gap-2 px-4 min-w-[80px] justify-center">
            <span className="text-2xl font-bold tabular-nums">{match.homeScore}</span>
            <span className="text-muted-foreground text-xl">-</span>
            <span className="text-2xl font-bold tabular-nums">{match.awayScore}</span>
          </div>
          <div className="flex items-center gap-3 w-[180px]">
            {match.awayTeam?.logo ? <img src={match.awayTeam.logo} alt="" className="h-10 w-10 rounded object-contain bg-white p-0.5 shrink-0" /> :
              <div className="h-10 w-10 rounded text-xs font-bold text-white flex items-center justify-center shrink-0" style={{ backgroundColor: match.awayTeam?.primaryColor || "#666" }}>{match.awayTeam?.shortName?.slice(0, 2) || "AW"}</div>}
            <span className="text-base font-medium truncate">{match.awayTeam?.name || "Away"}</span>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground min-w-[100px]">
          <p className="truncate">{match.round || match.venue}</p>
        </div>
        <Badge variant={match.status === "live" ? "destructive" : match.status === "completed" ? "secondary" : "outline"} className="min-w-[60px] justify-center">
          {match.status === "live" ? "LIVE" : match.status === "completed" ? "FT" : formatDate(match.kickoff).split(',')[0]}
        </Badge>
        <Button size="sm" variant="default" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onLoad(match)}>
          <Upload className="h-4 w-4 mr-1" /> Load
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(match.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
