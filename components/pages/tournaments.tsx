"use client"
import { useState, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Trophy, Plus, Edit2, Trash2, Users, Check, Loader2, X, Upload, UserPlus, FileSpreadsheet
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Tournament, TournamentType, Team, Player, FormationType } from "@/lib/types"
import { parseCSV, csvToPlayers, getPlayerCSVTemplate } from "@/lib/csv-utils"
import { getFormationNames } from "@/lib/formations"
import * as db from "@/lib/database"

const tournamentTypeLabels: Record<TournamentType, string> = {
  league: "League", cup: "Cup", friendly: "Friendly", tournament: "Tournament"
}
const tournamentTypeColors: Record<TournamentType, string> = {
  league: "bg-blue-500/10 text-blue-500",
  cup: "bg-yellow-500/10 text-yellow-500",
  friendly: "bg-green-500/10 text-green-500",
  tournament: "bg-purple-500/10 text-purple-500"
}

export function Tournaments() {
  const { 
    selectedTournamentId, setSelectedTournament, sportType, getSportConfig,
    addTeam, updateTeam, deleteTeam: deleteTeamFromStore
  } = useAppStore()

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false)
  const [editTournament, setEditTournament] = useState<Tournament | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // Team states
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [selectedTeamForImport, setSelectedTeamForImport] = useState<string | null>(null)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<string | null>(null)
  const [editPlayer, setEditPlayer] = useState<{ player: Player; teamId: string } | null>(null)

  // Tournament form
  const [formData, setFormData] = useState({
    name: "", shortName: "", type: "league" as TournamentType,
    season: new Date().getFullYear().toString(), country: "", logo: "", color: "#EF3E42",
  })

  // Team form
  const [teamForm, setTeamForm] = useState({
    name: "", shortName: "", primaryColor: "#c8102e", secondaryColor: "#004d98", 
    defaultFormation: "4-3-3" as FormationType, logo: "", coach: ""
  })
  const [playerForm, setPlayerForm] = useState({
    name: "", shortName: "", number: 1, position: "MID" as Player["position"], nationality: "", photo: ""
  })
  const [csvContent, setCsvContent] = useState("")

  const teamLogoInputRef = useRef<HTMLInputElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const playerPhotoInputRef = useRef<HTMLInputElement>(null)
  const formations = getFormationNames(sportType || 'football')

  useEffect(() => { loadData() }, [selectedTournamentId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dbTournaments, dbTeams] = await Promise.all([
        db.getTournaments(),
        db.getTeams(selectedTournamentId || undefined),
      ])
      setTournaments(dbTournaments)
      setTeams(dbTeams)
      
      if (dbTournaments.length > 0 && !selectedTournamentId) {
        setSelectedTournament(dbTournaments[0].id)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Tournament handlers
  const handleCreateTournament = async () => {
    if (!formData.name.trim()) { toast.error("Enter tournament name"); return }
    try {
      const newTournament = await db.createTournament({
        id: `tournament-${Date.now()}`, name: formData.name,
        shortName: formData.shortName || formData.name.slice(0, 3).toUpperCase(),
        type: formData.type, season: formData.season,
        country: formData.country || undefined, logo: formData.logo || undefined,
        color: formData.color || undefined,
      })
      setTournaments(prev => [newTournament, ...prev])
      setSelectedTournament(newTournament.id)
      resetTournamentForm()
      toast.success("Tournament created")
    } catch (error) { toast.error("Failed to create tournament") }
  }

  const handleUpdateTournament = async () => {
    if (!editTournament) return
    try {
      await db.updateTournament(editTournament.id, formData)
      setTournaments(prev => prev.map(t => t.id === editTournament.id ? { ...t, ...formData } : t))
      resetTournamentForm()
      toast.success("Tournament updated")
    } catch (error) { toast.error("Failed to update") }
  }

  const handleDeleteTournament = async () => {
    if (!deleteId) return
    try {
      await db.deleteTournament(deleteId)
      setTournaments(prev => prev.filter(t => t.id !== deleteId))
      if (selectedTournamentId === deleteId) setSelectedTournament(null)
      setDeleteId(null)
      toast.success("Deleted")
    } catch (error) { toast.error("Failed to delete") }
  }

  const resetTournamentForm = () => {
    setCreateTournamentOpen(false)
    setEditTournament(null)
    setFormData({ name: "", shortName: "", type: "league", season: new Date().getFullYear().toString(), country: "", logo: "", color: "#EF3E42" })
  }

  const openEditTournament = (t: Tournament) => {
    setFormData({ name: t.name, shortName: t.shortName, type: t.type, season: t.season, country: t.country || "", logo: t.logo || "", color: t.color || "#EF3E42" })
    setEditTournament(t)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFormData(prev => ({ ...prev, logo: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  // Team handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (base64: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return }
    const reader = new FileReader()
    reader.onload = (event) => onSuccess(event.target?.result as string)
    reader.onerror = () => toast.error('Failed to read image file')
    reader.readAsDataURL(file)
  }

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) { toast.error("Please enter a team name"); return }
    const newTeam: Team = {
      id: `team-${Date.now()}`, name: teamForm.name,
      shortName: teamForm.shortName || teamForm.name.slice(0, 3).toUpperCase(),
      primaryColor: teamForm.primaryColor, secondaryColor: teamForm.secondaryColor,
      defaultFormation: teamForm.defaultFormation, logo: teamForm.logo || undefined,
      coach: teamForm.coach || undefined, players: []
    }
    try {
      await db.createTeam(newTeam, selectedTournamentId || undefined)
      setTeams(prev => [...prev, { ...newTeam, tournamentId: selectedTournamentId || undefined }])
      addTeam({ ...newTeam, tournamentId: selectedTournamentId || undefined })
      resetTeamForm()
      toast.success("Team created")
    } catch (error) { toast.error("Failed to create team") }
  }

  const handleUpdateTeam = async () => {
    if (!editTeam) return
    try {
      await db.updateTeam(editTeam.id, teamForm)
      setTeams(prev => prev.map(t => t.id === editTeam.id ? { ...t, ...teamForm } : t))
      updateTeam(editTeam.id, teamForm)
      resetTeamForm()
      toast.success("Team updated")
    } catch (error) { toast.error("Failed to update team") }
  }

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return
    try {
      await db.deleteTeam(deleteTeamId)
      setTeams(prev => prev.filter(t => t.id !== deleteTeamId))
      deleteTeamFromStore(deleteTeamId)
      setDeleteTeamId(null)
      toast.success("Team deleted")
    } catch (error) { toast.error("Failed to delete team") }
  }

  const resetTeamForm = () => {
    setCreateTeamOpen(false)
    setEditTeam(null)
    setTeamForm({ name: "", shortName: "", primaryColor: "#c8102e", secondaryColor: "#004d98", defaultFormation: "4-3-3", logo: "", coach: "" })
  }

  const openEditTeamDialog = (team: Team) => {
    setTeamForm({ name: team.name, shortName: team.shortName, primaryColor: team.primaryColor, secondaryColor: team.secondaryColor, defaultFormation: team.defaultFormation || "4-3-3", logo: team.logo || "", coach: team.coach || "" })
    setEditTeam(team)
  }

  // Player handlers
  const handleAddPlayer = async () => {
    if (!selectedTeamForPlayer || !playerForm.name.trim()) { toast.error("Please enter player name"); return }
    const newPlayer: Player = {
      id: `player-${Date.now()}`, name: playerForm.name, shortName: playerForm.shortName || undefined,
      number: playerForm.number, position: playerForm.position, nationality: playerForm.nationality || undefined,
      photo: playerForm.photo || undefined, isCaptain: false, isKeeper: playerForm.position === "GK"
    }
    try {
      await db.addPlayer(selectedTeamForPlayer, newPlayer)
      setTeams(prev => prev.map(t => t.id === selectedTeamForPlayer ? { ...t, players: [...t.players, newPlayer] } : t))
      setAddPlayerOpen(false)
      setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" })
      setSelectedTeamForPlayer(null)
      toast.success("Player added")
    } catch (error) { toast.error("Failed to add player") }
  }

  const handleUpdatePlayer = async () => {
    if (!editPlayer || !playerForm.name.trim()) { toast.error("Please enter player name"); return }
    try {
      await db.updatePlayer(editPlayer.player.id, { ...playerForm, shortName: playerForm.shortName || undefined, nationality: playerForm.nationality || undefined, photo: playerForm.photo || undefined })
      setTeams(prev => prev.map(t => t.id === editPlayer.teamId ? { ...t, players: t.players.map(p => p.id === editPlayer.player.id ? { ...p, ...playerForm } : p) } : t))
      setEditPlayer(null)
      setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" })
      toast.success("Player updated")
    } catch (error) { toast.error("Failed to update player") }
  }

  const handleDeletePlayer = async (teamId: string, playerId: string) => {
    try {
      await db.deletePlayer(playerId)
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, players: t.players.filter(p => p.id !== playerId) } : t))
      toast.success("Player removed")
    } catch (error) { toast.error("Failed to remove player") }
  }

  const handleCSVImport = async () => {
    if (!selectedTeamForImport || !csvContent.trim()) { toast.error("Please select a team and paste CSV content"); return }
    try {
      const rows = parseCSV<any>(csvContent)
      const players = csvToPlayers(rows)
      if (players.length === 0) { toast.error("No valid players found in CSV"); return }
      const count = await db.addPlayersFromCSV(selectedTeamForImport, players)
      setTeams(prev => prev.map(t => t.id === selectedTeamForImport ? { ...t, players: [...t.players, ...players] } : t))
      setCsvImportOpen(false); setCsvContent(""); setSelectedTeamForImport(null)
      toast.success(`Imported ${count} players`)
    } catch (error) { toast.error("Failed to import CSV") }
  }

  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
    }
    reader.onerror = () => toast.error('Failed to read CSV file')
    reader.readAsText(file)
  }

  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return }
    const reader = new FileReader()
    reader.onload = (event) => setPlayerForm(prev => ({ ...prev, photo: event.target?.result as string }))
    reader.onerror = () => toast.error('Failed to read image file')
    reader.readAsDataURL(file)
  }

  const handleDownloadTemplate = () => {
    const template = getPlayerCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'players_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* TOURNAMENTS SECTION - White Box */}
      <div className="bg-white dark:bg-card rounded-lg p-4 w-full border border-gray-200 dark:border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Tournaments
          </h2>
          <Button size="sm" onClick={() => setCreateTournamentOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Tournament
          </Button>
        </div>

        {/* Tournaments List */}
        {tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No tournaments yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="flex items-center justify-between py-3 bg-secondary/30 rounded-lg group px-4">
                <div className="flex items-center gap-3">
                  {tournament.logo ? (
                    <img src={tournament.logo} alt="" className="h-7 w-7 rounded object-contain bg-white p-0.5" />
                  ) : (
                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <span className="font-medium">{tournament.name}</span>
                  <span className="text-sm text-muted-foreground">{tournament.season}</span>
                  <Badge className={`text-xs ${tournamentTypeColors[tournament.type]}`}>{tournamentTypeLabels[tournament.type]}</Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => openEditTournament(tournament)}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(tournament.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TEAMS SECTION */}
      <div className="flex items-center justify-between py-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Teams
          </h2>
        <Button size="sm" onClick={() => setCreateTeamOpen(true)} disabled={tournaments.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> New Team
        </Button>
      </div>

      {/* Teams Grid */}
      {tournaments.length === 0 ? (
        <Card className="glass-card border-warning/30 bg-warning/5">
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto text-warning mb-3" />
            <p className="text-sm text-muted-foreground">Create a tournament first to add teams</p>
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No teams yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="glass-card hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="h-14 w-14 rounded-lg object-contain bg-white p-1" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: team.primaryColor }}>
                        {team.shortName.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{team.shortName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTeamDialog(team)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTeamId(team.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-1">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: team.primaryColor }} />
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: team.secondaryColor }} />
                  </div>
                  {team.defaultFormation && <Badge variant="outline" className="text-xs">{team.defaultFormation}</Badge>}
                  <Badge variant="secondary" className="text-xs">{team.players.length} players</Badge>
                </div>
                <ScrollArea className="h-[400px]">
                  {team.players.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No players</p>
                  ) : (
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 group">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{player.number}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{player.name}</p>
                            <p className="text-xs text-muted-foreground">#{player.number} • {player.position}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => { setPlayerForm({ name: player.name, shortName: player.shortName || "", number: player.number, position: player.position, nationality: player.nationality || "", photo: player.photo || "" }); setEditPlayer({ player, teamId: team.id }) }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeletePlayer(team.id, player.id)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-sm" onClick={() => { setSelectedTeamForPlayer(team.id); setAddPlayerOpen(true) }}><UserPlus className="h-4 w-4 mr-1" /> Add</Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-sm" onClick={() => { setSelectedTeamForImport(team.id); setCsvImportOpen(true) }}><FileSpreadsheet className="h-4 w-4 mr-1" /> CSV</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tournament Dialog */}
      <Dialog open={createTournamentOpen || !!editTournament} onOpenChange={(open) => { if (!open) resetTournamentForm() }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" /> {editTournament ? "Edit Tournament" : "Create Tournament"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Premier League" className="bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input value={formData.shortName} onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))} placeholder="PL" className="bg-secondary" maxLength={5} />
              </div>
              <div className="space-y-2">
                <Label>Season</Label>
                <Input value={formData.season} onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))} placeholder="2024" className="bg-secondary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as TournamentType }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="league">League</SelectItem>
                    <SelectItem value="cup">Cup</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country} onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))} placeholder="England" className="bg-secondary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-2">
                  {formData.logo ? (
                    <div className="relative">
                      <img src={formData.logo} alt="" className="h-10 w-10 object-contain rounded bg-white p-1" />
                      <button onClick={() => setFormData(prev => ({ ...prev, logo: "" }))} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center">×</button>
                    </div>
                  ) : <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center"><Trophy className="h-5 w-5 text-muted-foreground" /></div>}
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="bg-secondary flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded border cursor-pointer" style={{ backgroundColor: formData.color }} onClick={() => document.getElementById('color-picker')?.click()} />
                  <Input id="color-picker" type="color" value={formData.color} onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))} className="h-10 w-20" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetTournamentForm}>Cancel</Button>
            <Button onClick={editTournament ? handleUpdateTournament : handleCreateTournament}>
              <Check className="h-4 w-4 mr-2" /> {editTournament ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={createTeamOpen || !!editTeam} onOpenChange={(open) => { if (!open) resetTeamForm() }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> {editTeam ? "Edit Team" : "Create Team"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Name *</Label>
                <Input value={teamForm.name} onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))} placeholder="FC Barcelona" className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input value={teamForm.shortName} onChange={(e) => setTeamForm(prev => ({ ...prev, shortName: e.target.value }))} placeholder="BAR" className="bg-secondary" maxLength={5} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Head Coach</Label>
              <Input value={teamForm.coach} onChange={(e) => setTeamForm(prev => ({ ...prev, coach: e.target.value }))} placeholder="Hansi Flick" className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <div className="flex gap-3 items-center">
                <input ref={teamLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (base64) => setTeamForm(prev => ({ ...prev, logo: base64 })))} />
                <Button type="button" variant="outline" size="sm" onClick={() => teamLogoInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
                {teamForm.logo && <><img src={teamForm.logo} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border" /><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTeamForm(prev => ({ ...prev, logo: "" }))}><X className="h-4 w-4" /></Button></>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={teamForm.primaryColor} onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={teamForm.primaryColor} onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))} className="bg-secondary font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={teamForm.secondaryColor} onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={teamForm.secondaryColor} onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))} className="bg-secondary font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Formation</Label>
                <Select value={teamForm.defaultFormation} onValueChange={(v) => setTeamForm(prev => ({ ...prev, defaultFormation: v as FormationType }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>{formations.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetTeamForm}>Cancel</Button>
            <Button onClick={editTeam ? handleUpdateTeam : handleCreateTeam}><Check className="h-4 w-4 mr-2" /> {editTeam ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Player Dialog */}
      <Dialog open={addPlayerOpen || !!editPlayer} onOpenChange={(open) => { if (!open) { setAddPlayerOpen(false); setEditPlayer(null); setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" }); setSelectedTeamForPlayer(null) } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>{editPlayer ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex gap-3 items-center">
                <input ref={playerPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePlayerPhotoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => playerPhotoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
                {playerForm.photo ? (
                  <>
                    <img src={playerForm.photo} alt="" className="h-12 w-12 rounded-full object-cover border" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPlayerForm(prev => ({ ...prev, photo: "" }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={playerForm.name} onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Lionel Messi" className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input value={playerForm.shortName} onChange={(e) => setPlayerForm(prev => ({ ...prev, shortName: e.target.value }))} placeholder="L. MESSI" className="bg-secondary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number</Label>
                <Input type="number" min={1} max={99} value={playerForm.number} onChange={(e) => setPlayerForm(prev => ({ ...prev, number: parseInt(e.target.value) || 1 }))} className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={playerForm.position} onValueChange={(v) => setPlayerForm(prev => ({ ...prev, position: v as Player["position"] }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GK">Goalkeeper (GK)</SelectItem>
                    {sportType === 'futsal' ? (
                      <>
                        <SelectItem value="FIXO">Fixo (FIXO)</SelectItem>
                        <SelectItem value="ALA">Ala (ALA)</SelectItem>
                        <SelectItem value="PIVOT">Pivot (PIVOT)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="DEF">Defender (DEF)</SelectItem>
                        <SelectItem value="MID">Midfielder (MID)</SelectItem>
                        <SelectItem value="FWD">Forward (FWD)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={playerForm.nationality} onChange={(e) => setPlayerForm(prev => ({ ...prev, nationality: e.target.value }))} placeholder="Argentina" className="bg-secondary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddPlayerOpen(false); setEditPlayer(null); setPlayerForm({ name: "", shortName: "", number: 1, position: "MID", nationality: "", photo: "" }); setSelectedTeamForPlayer(null) }}>Cancel</Button>
            <Button onClick={editPlayer ? handleUpdatePlayer : handleAddPlayer}><Check className="h-4 w-4 mr-2" /> {editPlayer ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onOpenChange={(open) => { if (!open) { setCsvImportOpen(false); setCsvContent(""); setSelectedTeamForImport(null) } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Import Players from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Two main options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <input ref={csvFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFileUpload} />
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2" onClick={() => csvFileInputRef.current?.click()}>
                  <Upload className="h-6 w-6" />
                  <span>Import CSV File</span>
                </Button>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>Download Template</span>
                </Button>
              </div>
            </div>
            
            {/* CSV Content Preview/Edit */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">CSV Content (columns: number, name, position, nationality, photo)</Label>
              <textarea 
                className="w-full h-32 p-3 rounded-lg bg-secondary text-sm font-mono border" 
                placeholder="number,name,position,nationality,photo&#10;10,Lionel Messi,FWD,Argentina,&#10;7,Cristiano Ronaldo,FWD,Portugal,&#10;..." 
                value={csvContent} 
                onChange={(e) => setCsvContent(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvContent(""); setSelectedTeamForImport(null) }}>Cancel</Button>
            <Button onClick={handleCSVImport} disabled={!csvContent.trim()}><Check className="h-4 w-4 mr-2" /> Import Players</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Tournament" description="Delete this tournament and all associated data?" onConfirm={handleDeleteTournament} confirmText="Delete" destructive />
      <ConfirmDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)} title="Delete Team" description="Delete this team and all players?" onConfirm={handleDeleteTeam} confirmText="Delete" destructive />
    </div>
  )
}