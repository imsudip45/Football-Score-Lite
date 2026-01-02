"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, Upload, Download, Shield, Star, Plus, Trash2, Edit2, Users,
  FileSpreadsheet, Image, Check, X, Loader2, UserPlus, LayoutGrid, ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Team, Player, FormationType } from "@/lib/types"
import { parseCSV, csvToPlayers, getPlayerCSVTemplate, playersToCSV } from "@/lib/csv-utils"
import { getFormationNames, getFormation } from "@/lib/formations"
import * as db from "@/lib/database"

export function TeamsLineups() {
  const { 
    teams: storeTeams, 
    addTeam, 
    updateTeam, 
    deleteTeam, 
    sportType, 
    getSportConfig,
    currentMatch,
    setCurrentPage,
    completeWorkflowStep,
    workflowProgress,
    selectedTournamentId
  } = useAppStore()
  
  const sportConfig = getSportConfig()
  const [teams, setTeams] = useState<Team[]>(storeTeams)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("teams")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string; season: string } | null>(null)
  
  // Dialog states
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [selectedTeamForImport, setSelectedTeamForImport] = useState<string | null>(null)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<string | null>(null)
  const [editPlayer, setEditPlayer] = useState<{ player: Player; teamId: string } | null>(null)
  
  // Form states
  const [teamForm, setTeamForm] = useState({
    name: "", shortName: "", primaryColor: "#c8102e", secondaryColor: "#004d98", defaultFormation: "4-3-3" as FormationType, logo: "", coach: ""
  })
  const [playerForm, setPlayerForm] = useState({
    name: "", shortName: "", number: 1, position: "MID" as Player["position"], nationality: "", photo: ""
  })
  const [csvContent, setCsvContent] = useState("")
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const teamLogoInputRef = useRef<HTMLInputElement>(null)
  const playerPhotoInputRef = useRef<HTMLInputElement>(null)
  const formations = getFormationNames(sportType || 'football')

  // Handle image file upload and convert to base64
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (base64: string) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onSuccess(base64)
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Load teams and tournament from database on mount and when tournament changes
  useEffect(() => {
    // Only load data if dialogs are not open to prevent input focus issues
    if (!createTeamOpen && !editTeam && !csvImportOpen && !addPlayerOpen && !editPlayer) {
      loadTeams()
      // Load tournament info if selected
      if (selectedTournamentId) {
        db.getTournament(selectedTournamentId).then(tournament => {
          if (tournament) {
            setSelectedTournament({ id: tournament.id, name: tournament.name, season: tournament.season })
          }
        })
      } else {
        setSelectedTournament(null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]) // Intentionally not including dialog states to prevent reload loops

  const loadTeams = async () => {
    setLoading(true)
    try {
      // Filter teams by selected tournament if one is selected
      const dbTeams = await db.getTeams(selectedTournamentId || undefined)
      if (dbTeams.length > 0) {
        setTeams(dbTeams)
      } else {
        // Filter store teams by tournament as well
        const filteredStoreTeams = selectedTournamentId 
          ? storeTeams.filter(t => t.tournamentId === selectedTournamentId)
          : storeTeams
        setTeams(filteredStoreTeams)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
      setTeams(storeTeams)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      toast.error("Please enter a team name")
      return
    }

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: teamForm.name,
      shortName: teamForm.shortName || teamForm.name.slice(0, 3).toUpperCase(),
      primaryColor: teamForm.primaryColor,
      secondaryColor: teamForm.secondaryColor,
      defaultFormation: teamForm.defaultFormation,
      logo: teamForm.logo || undefined,
      coach: teamForm.coach || undefined,
      players: []
    }

    try {
      // Associate team with selected tournament if one is selected
      await db.createTeam(newTeam, selectedTournamentId || undefined)
      setTeams(prev => [...prev, { ...newTeam, tournamentId: selectedTournamentId || undefined }])
      addTeam({ ...newTeam, tournamentId: selectedTournamentId || undefined })
      resetTeamForm()
      toast.success("Team created successfully")
    } catch (error) {
      console.error("Error creating team:", error)
      toast.error("Failed to create team")
    }
  }

  const handleUpdateTeam = async () => {
    if (!editTeam) return

    try {
      await db.updateTeam(editTeam.id, {
        name: teamForm.name,
        shortName: teamForm.shortName,
        primaryColor: teamForm.primaryColor,
        secondaryColor: teamForm.secondaryColor,
        defaultFormation: teamForm.defaultFormation,
        logo: teamForm.logo || undefined,
        coach: teamForm.coach || undefined
      })
      
      setTeams(prev => prev.map(t => 
        t.id === editTeam.id 
          ? { ...t, ...teamForm }
          : t
      ))
      updateTeam(editTeam.id, teamForm)
      resetTeamForm()
      toast.success("Team updated")
    } catch (error) {
      console.error("Error updating team:", error)
      toast.error("Failed to update team")
    }
  }

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return

    try {
      await db.deleteTeam(deleteTeamId)
      setTeams(prev => prev.filter(t => t.id !== deleteTeamId))
      deleteTeam(deleteTeamId)
      setDeleteTeamId(null)
      toast.success("Team deleted")
    } catch (error) {
      console.error("Error deleting team:", error)
      toast.error("Failed to delete team")
    }
  }

  const resetTeamForm = () => {
    setCreateTeamOpen(false)
    setEditTeam(null)
    setTeamForm({ name: "", shortName: "", primaryColor: "#c8102e", secondaryColor: "#004d98", defaultFormation: "4-3-3", logo: "", coach: "" })
  }

  const openEditTeam = (team: Team) => {
    setTeamForm({
      name: team.name,
      shortName: team.shortName,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      defaultFormation: team.defaultFormation || "4-3-3",
      logo: team.logo || "",
      coach: team.coach || ""
    })
    setEditTeam(team)
  }

  // CSV Import
  const handleCSVImport = async () => {
    if (!selectedTeamForImport || !csvContent.trim()) {
      toast.error("Please select a team and paste CSV content")
      return
    }

    try {
      const rows = parseCSV<any>(csvContent)
      const players = csvToPlayers(rows)
      
      if (players.length === 0) {
        toast.error("No valid players found in CSV")
        return
      }

      // Add players to database
      const result = await db.addPlayersFromCSV(selectedTeamForImport, players)
      
      // Update local state
      setTeams(prev => prev.map(t => 
        t.id === selectedTeamForImport 
          ? { ...t, players: [...t.players, ...players] }
          : t
      ))

      setCsvImportOpen(false)
      setCsvContent("")
      setSelectedTeamForImport(null)
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.count} players with ${result.errors.length} errors`)
        console.warn("CSV import errors:", result.errors)
      } else {
        toast.success(`Imported ${result.count} players`)
      }
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

  // Add single player
  const handleAddPlayer = async () => {
    if (!selectedTeamForPlayer || !playerForm.name.trim()) {
      toast.error("Please enter player name")
      return
    }

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: playerForm.name,
      shortName: playerForm.shortName || undefined,
      number: playerForm.number,
      position: playerForm.position,
      nationality: playerForm.nationality || undefined,
      photo: playerForm.photo || undefined,
      isCaptain: false,
      isKeeper: playerForm.position === "GK"
    }

    try {
      await db.addPlayer(selectedTeamForPlayer, newPlayer)
      
      setTeams(prev => prev.map(t => 
        t.id === selectedTeamForPlayer 
          ? { ...t, players: [...t.players, newPlayer] }
          : t
      ))

      setAddPlayerOpen(false)
      setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" })
      setSelectedTeamForPlayer(null)
      toast.success("Player added")
    } catch (error) {
      console.error("Error adding player:", error)
      toast.error("Failed to add player")
    }
  }

  const handleDeletePlayer = async (teamId: string, playerId: string) => {
    try {
      await db.deletePlayer(playerId)
      setTeams(prev => prev.map(t => 
        t.id === teamId 
          ? { ...t, players: t.players.filter(p => p.id !== playerId) }
          : t
      ))
      toast.success("Player removed")
    } catch (error) {
      console.error("Error deleting player:", error)
      toast.error("Failed to remove player")
    }
  }

  // Open edit player dialog
  const openEditPlayer = (player: Player, teamId: string) => {
    setPlayerForm({
      name: player.name,
      shortName: player.shortName || "",
      number: player.number,
      position: player.position,
      nationality: player.nationality || "",
      photo: player.photo || ""
    })
    setEditPlayer({ player, teamId })
  }

  // Update existing player
  const handleUpdatePlayer = async () => {
    if (!editPlayer || !playerForm.name.trim()) {
      toast.error("Please enter player name")
      return
    }

    try {
      await db.updatePlayer(editPlayer.player.id, {
        name: playerForm.name,
        shortName: playerForm.shortName || undefined,
        number: playerForm.number,
        position: playerForm.position,
        nationality: playerForm.nationality || undefined,
        photo: playerForm.photo || undefined
      })
      
      setTeams(prev => prev.map(t => 
        t.id === editPlayer.teamId 
          ? { 
              ...t, 
              players: t.players.map(p => 
                p.id === editPlayer.player.id 
                  ? { ...p, ...playerForm, shortName: playerForm.shortName || undefined, nationality: playerForm.nationality || undefined, photo: playerForm.photo || undefined }
                  : p
              )
            }
          : t
      ))

      setEditPlayer(null)
      setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" })
      toast.success("Player updated")
    } catch (error) {
      console.error("Error updating player:", error)
      toast.error("Failed to update player")
    }
  }

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="mt-4 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button 
          onClick={() => setCurrentPage("tournaments")}
          className="hover:text-foreground transition-colors"
        >
          Tournaments
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Teams & Players</span>
      </div>

      {/* Tournament Info Banner */}
      {selectedTournament && (
        <Card className="glass-card border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedTournament.name}</p>
                  <p className="text-xs text-muted-foreground">Season {selectedTournament.season} • Teams shown for this tournament only</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage("tournaments")}>
                Change Tournament
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams & Players</h1>
          <p className="text-sm text-muted-foreground">Manage teams, squads, and formations for your tournaments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentPage("tournaments")}>
            Back to Tournaments
          </Button>
          <Button onClick={() => setCreateTeamOpen(true)} disabled={!selectedTournamentId}>
            <Plus className="h-4 w-4 mr-2" /> Create Team
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <UserPlus className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teams.reduce((acc, t) => acc + t.players.length, 0)}</p>
              <p className="text-xs text-muted-foreground">Total Players</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <LayoutGrid className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formations.length}</p>
              <p className="text-xs text-muted-foreground">Formations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {selectedTournament ? `No teams in ${selectedTournament.name}` : "No teams yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedTournament 
                ? "Create teams for this tournament to start adding players"
                : "Select a tournament first, then create teams"}
            </p>
            <Button onClick={() => setCreateTeamOpen(true)} disabled={!selectedTournamentId}>
              <Plus className="h-4 w-4 mr-2" /> Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="glass-card hover:border-primary/50 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="h-12 w-12 rounded-lg object-contain bg-white p-1" />
                    ) : (
                      <div 
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.primaryColor }}
                      >
                        {team.shortName.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{team.shortName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTeam(team)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTeamId(team.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex gap-1">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: team.primaryColor }} />
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: team.secondaryColor }} />
                  </div>
                  {team.defaultFormation && (
                    <Badge variant="outline">{team.defaultFormation}</Badge>
                  )}
                  <Badge variant="secondary">{team.players.length} players</Badge>
                </div>
                
                {/* Players list */}
                <ScrollArea className="h-[200px]">
                  {team.players.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No players added</p>
                  ) : (
                    <div className="space-y-1">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center gap-2 p-1.5 rounded bg-secondary/50 group">
                          {player.photo ? (
                            <img src={player.photo} alt={player.name} className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {player.number}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{player.name}</p>
                            <p className="text-[10px] text-muted-foreground">{player.position}</p>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5"
                              onClick={() => openEditPlayer(player, team.id)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 text-destructive"
                              onClick={() => handleDeletePlayer(team.id, player.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => { setSelectedTeamForPlayer(team.id); setAddPlayerOpen(true) }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Add Player
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => { setSelectedTeamForImport(team.id); setCsvImportOpen(true) }}
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> Import CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={createTeamOpen || !!editTeam} onOpenChange={(open) => { if (!open) resetTeamForm() }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {editTeam ? "Edit Team" : "Create Team"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Name *</Label>
                <Input
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. FC Barcelona"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input
                  value={teamForm.shortName}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g. BAR"
                  className="bg-secondary"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Head Coach</Label>
              <Input
                value={teamForm.coach}
                onChange={(e) => setTeamForm(prev => ({ ...prev, coach: e.target.value }))}
                placeholder="e.g. Hansi Flick"
                className="bg-secondary"
              />
            </div>
            {/* Team Logo Upload */}
            <div className="space-y-2">
              <Label>Team Logo (optional)</Label>
              <div className="flex gap-3 items-center">
                <input
                  ref={teamLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, (base64) => setTeamForm(prev => ({ ...prev, logo: base64 })))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => teamLogoInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </Button>
                {teamForm.logo && (
                  <>
                    <img src={teamForm.logo} alt="Logo preview" className="h-12 w-12 rounded-lg object-contain bg-white p-1 border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setTeamForm(prev => ({ ...prev, logo: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {!teamForm.logo && (
                  <span className="text-xs text-muted-foreground">PNG, JPG up to 2MB</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={teamForm.primaryColor}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={teamForm.primaryColor}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="bg-secondary font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={teamForm.secondaryColor}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={teamForm.secondaryColor}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="bg-secondary font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Formation</Label>
                <Select value={teamForm.defaultFormation} onValueChange={(v) => setTeamForm(prev => ({ ...prev, defaultFormation: v as FormationType }))}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formations.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-3">
                {teamForm.logo ? (
                  <img src={teamForm.logo} alt="Team logo" className="h-12 w-12 rounded-lg object-contain bg-white p-1" />
                ) : (
                  <div 
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: teamForm.primaryColor }}
                  >
                    {(teamForm.shortName || teamForm.name.slice(0, 3)).toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{teamForm.name || "Team Name"}</p>
                  <p className="text-xs text-muted-foreground">{teamForm.defaultFormation}</p>
                </div>
                <div className="flex gap-1 ml-auto">
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: teamForm.primaryColor }} />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: teamForm.secondaryColor }} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetTeamForm}>Cancel</Button>
            <Button onClick={editTeam ? handleUpdateTeam : handleCreateTeam}>
              <Check className="h-4 w-4 mr-2" />
              {editTeam ? "Save Changes" : "Create Team"}
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
              Import Players from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Team *</Label>
              <Select value={selectedTeamForImport || ""} onValueChange={setSelectedTeamForImport}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CSV Content</Label>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Upload File
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCsvContent(getPlayerCSVTemplate())}>
                    Load Template
                  </Button>
                </div>
              </div>
              <Textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="number,name,position,nationality,photo&#10;1,John Smith,GK,England,https://...&#10;2,David Jones,DEF,Wales,"
                className="bg-secondary font-mono text-xs h-[200px]"
              />
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-sm">
              <p className="font-medium text-blue-500 mb-1">CSV Format</p>
              <p className="text-xs text-muted-foreground">
                Required columns: <code className="bg-secondary px-1 rounded">number</code>, <code className="bg-secondary px-1 rounded">name</code>, <code className="bg-secondary px-1 rounded">position</code><br/>
                Optional: <code className="bg-secondary px-1 rounded">nationality</code>, <code className="bg-secondary px-1 rounded">photo</code> (URL)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvContent("") }}>Cancel</Button>
            <Button onClick={handleCSVImport} disabled={!selectedTeamForImport || !csvContent.trim()}>
              <Check className="h-4 w-4 mr-2" /> Import Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Player Name *</Label>
                <Input
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Lionel Messi"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name (for graphics)</Label>
                <Input
                  value={playerForm.shortName}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g. MESSI (uses last name if empty)"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jersey Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={playerForm.number}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, number: parseInt(e.target.value) || 1 }))}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={playerForm.position} onValueChange={(v) => setPlayerForm(prev => ({ ...prev, position: v as Player["position"] }))}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GK">Goalkeeper (GK)</SelectItem>
                    <SelectItem value="DEF">Defender (DEF)</SelectItem>
                    <SelectItem value="MID">Midfielder (MID)</SelectItem>
                    <SelectItem value="FWD">Forward (FWD)</SelectItem>
                    {sportType === 'futsal' && (
                      <>
                        <SelectItem value="PIVOT">Pivot</SelectItem>
                        <SelectItem value="FIXO">Fixo</SelectItem>
                        <SelectItem value="ALA">Ala</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={playerForm.nationality}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="e.g. Argentina"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Player Photo (optional)</Label>
              <div className="flex gap-3 items-center">
                <input
                  ref={playerPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, (base64) => setPlayerForm(prev => ({ ...prev, photo: base64 })))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => playerPhotoInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
                {playerForm.photo && (
                  <>
                    <img src={playerForm.photo} alt="Preview" className="h-12 w-12 rounded-full object-cover border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setPlayerForm(prev => ({ ...prev, photo: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {!playerForm.photo && (
                  <span className="text-xs text-muted-foreground">PNG, JPG up to 2MB</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddPlayerOpen(false); setSelectedTeamForPlayer(null) }}>Cancel</Button>
            <Button onClick={handleAddPlayer} disabled={!playerForm.name.trim()}>
              <Check className="h-4 w-4 mr-2" /> Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => { if (!open) { setEditPlayer(null); setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" }) } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Player Name *</Label>
                <Input
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Lionel Messi"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name (for graphics)</Label>
                <Input
                  value={playerForm.shortName}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g. MESSI (uses last name if empty)"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jersey Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={playerForm.number}
                  onChange={(e) => setPlayerForm(prev => ({ ...prev, number: parseInt(e.target.value) || 1 }))}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={playerForm.position} onValueChange={(v) => setPlayerForm(prev => ({ ...prev, position: v as Player["position"] }))}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GK">Goalkeeper (GK)</SelectItem>
                    <SelectItem value="DEF">Defender (DEF)</SelectItem>
                    <SelectItem value="MID">Midfielder (MID)</SelectItem>
                    <SelectItem value="FWD">Forward (FWD)</SelectItem>
                    {sportType === 'futsal' && (
                      <>
                        <SelectItem value="PIVOT">Pivot</SelectItem>
                        <SelectItem value="FIXO">Fixo</SelectItem>
                        <SelectItem value="ALA">Ala</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input
                value={playerForm.nationality}
                onChange={(e) => setPlayerForm(prev => ({ ...prev, nationality: e.target.value }))}
                placeholder="e.g. Argentina"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Player Photo</Label>
              <div className="flex gap-3 items-center">
                <input
                  ref={playerPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, (base64) => setPlayerForm(prev => ({ ...prev, photo: base64 })))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => playerPhotoInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {playerForm.photo ? "Change Photo" : "Upload Photo"}
                </Button>
                {playerForm.photo && (
                  <>
                    <img src={playerForm.photo} alt="Preview" className="h-12 w-12 rounded-full object-cover border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setPlayerForm(prev => ({ ...prev, photo: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {!playerForm.photo && (
                  <span className="text-xs text-muted-foreground">PNG, JPG up to 2MB</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditPlayer(null); setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" }) }}>Cancel</Button>
            <Button onClick={handleUpdatePlayer} disabled={!playerForm.name.trim()}>
              <Check className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation */}
      <ConfirmDialog
        open={!!deleteTeamId}
        onOpenChange={() => setDeleteTeamId(null)}
        title="Delete Team"
        description="Are you sure you want to delete this team? All players will also be removed. This action cannot be undone."
        onConfirm={handleDeleteTeam}
        confirmText="Delete"
        destructive
      />

    </div>
  )
}
