"use client"

import { useState, useRef, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, ImageIcon, Palette, Star, Plus, Trash2, Edit2, 
  Layers, Search, Filter, Download, Copy, Eye, X, Check,
  FileImage, Film, Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Asset } from "@/lib/types"

export function Assets() {
  const { teams, assets, addAsset, updateAsset, deleteAsset, updateTeam } = useAppStore()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [editColorOpen, setEditColorOpen] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [newAssetName, setNewAssetName] = useState("")
  const [newAssetType, setNewAssetType] = useState<Asset["type"]>("logo")
  const [primaryColor, setPrimaryColor] = useState("#14b8a6")
  const [secondaryColor, setSecondaryColor] = useState("#0f766e")
  const [searchQuery, setSearchQuery] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const logos = assets.filter((a) => a.type === "logo")
  const sponsors = assets.filter((a) => a.type === "sponsor")
  const overlays = assets.filter((a) => a.type === "overlay")

  // Filter assets by search
  const filterAssets = (assetList: Asset[]) => {
    if (!searchQuery) return assetList
    return assetList.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }
    
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // Auto-fill name from filename
    if (!newAssetName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      setNewAssetName(nameWithoutExt)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!newAssetName.trim()) {
      toast.error("Please enter an asset name")
      return
    }

    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      type: newAssetType,
      name: newAssetName,
      url: uploadedPreview || `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(newAssetName)}`,
    }

    addAsset(newAsset)
    resetUploadForm()
    toast.success("Asset uploaded successfully")
  }

  const resetUploadForm = () => {
    setUploadOpen(false)
    setNewAssetName("")
    setUploadedFile(null)
    setUploadedPreview(null)
  }

  const handleDeleteAsset = (id: string) => {
    deleteAsset(id)
    setConfirmDeleteId(null)
    toast.success("Asset deleted")
  }

  const handleSaveColors = (teamId: string) => {
    updateTeam(teamId, { primaryColor, secondaryColor })
    setEditColorOpen(null)
    toast.success("Colors updated")
  }

  const openColorEditor = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (team) {
      setPrimaryColor(team.primaryColor)
      setSecondaryColor(team.secondaryColor)
      setEditColorOpen(teamId)
    }
  }

  const copyAssetUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success("URL copied to clipboard")
  }

  const downloadAsset = (asset: Asset) => {
    const link = document.createElement('a')
    link.href = asset.url
    link.download = `${asset.name}.png`
    link.click()
    toast.success("Download started")
  }

  // Asset Card Component
  const AssetCard = ({ asset, showActions = true }: { asset: Asset; showActions?: boolean }) => (
    <Card className="glass-card group hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div 
          className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center mb-3 border border-border overflow-hidden cursor-pointer relative"
          onClick={() => setPreviewAsset(asset)}
        >
          {asset.url && !asset.url.includes('placeholder') ? (
            <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">{asset.name}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset) }}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyAssetUrl(asset.url) }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
            <Badge variant="outline" className="text-[10px] mt-1">{asset.type}</Badge>
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setConfirmDeleteId(asset.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Add New Card Component
  const AddNewCard = ({ type, label }: { type: Asset["type"]; label: string }) => (
    <Card
      className="glass-card border-dashed cursor-pointer hover:border-primary transition-colors"
      onClick={() => { setNewAssetType(type); setUploadOpen(true) }}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[200px]">
        <div className="rounded-full bg-secondary p-3 mb-3">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="mt-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground">Manage logos, overlays, and sponsors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px] bg-secondary"
            />
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ImageIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logos.length}</p>
              <p className="text-xs text-muted-foreground">Logos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Layers className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overlays.length}</p>
              <p className="text-xs text-muted-foreground">Overlays</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sponsors.length}</p>
              <p className="text-xs text-muted-foreground">Sponsors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Palette className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Team Colors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logos">
        <TabsList className="bg-secondary">
          <TabsTrigger value="logos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ImageIcon className="h-4 w-4" />
            Logos ({logos.length})
          </TabsTrigger>
          <TabsTrigger value="overlays" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="h-4 w-4" />
            Overlays ({overlays.length})
          </TabsTrigger>
          <TabsTrigger value="sponsors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Star className="h-4 w-4" />
            Sponsors ({sponsors.length})
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
        </TabsList>

        {/* Logos Tab */}
        <TabsContent value="logos" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {teams.map((team) => (
              <Card key={team.id} className="glass-card group hover:border-primary/50 transition-all">
                <CardContent className="p-4">
                  <div
                    className="aspect-square rounded-lg flex items-center justify-center text-2xl font-bold text-white mb-3 relative overflow-hidden"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                      team.shortName
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary" onClick={() => openColorEditor(team.id)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.shortName}</p>
                </CardContent>
              </Card>
            ))}
            {filterAssets(logos).map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            <AddNewCard type="logo" label="Add Logo" />
          </div>
        </TabsContent>

        {/* Overlays Tab */}
        <TabsContent value="overlays" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterAssets(overlays).length === 0 && (
              <div className="col-span-full text-center py-12">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No overlays yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload PNG overlays with transparency for broadcast graphics</p>
                <Button onClick={() => { setNewAssetType("overlay"); setUploadOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Overlay
                </Button>
              </div>
            )}
            {filterAssets(overlays).map((asset) => (
              <Card key={asset.id} className="glass-card group">
                <CardContent className="p-4">
                  <div 
                    className="aspect-video rounded-lg bg-[url('/checkerboard.png')] bg-repeat flex items-center justify-center mb-3 border border-border overflow-hidden cursor-pointer relative"
                    style={{ backgroundSize: '20px 20px' }}
                    onClick={() => setPreviewAsset(asset)}
                  >
                    {asset.url && !asset.url.includes('placeholder') ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
                    ) : (
                      <Layers className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadAsset(asset)}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteId(asset.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterAssets(overlays).length > 0 && <AddNewCard type="overlay" label="Add Overlay" />}
          </div>
        </TabsContent>

        {/* Sponsors Tab */}
        <TabsContent value="sponsors" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterAssets(sponsors).map((sponsor) => (
              <Card key={sponsor.id} className="glass-card group">
                <CardContent className="p-4">
                  <div 
                    className="aspect-[3/1] rounded-lg bg-secondary flex items-center justify-center mb-3 border border-border overflow-hidden cursor-pointer"
                    onClick={() => setPreviewAsset(sponsor)}
                  >
                    {sponsor.url && !sponsor.url.includes('placeholder') ? (
                      <img src={sponsor.url} alt={sponsor.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <p className="text-sm text-muted-foreground">{sponsor.name}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{sponsor.name}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDeleteId(sponsor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <AddNewCard type="sponsor" label="Add Sponsor" />
          </div>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team) => (
              <Card key={team.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: team.primaryColor }}
                      >
                        {team.shortName.slice(0, 2)}
                      </div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openColorEditor(team.id)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Primary</p>
                      <div
                        className="h-16 w-16 rounded-lg border border-border cursor-pointer hover:scale-105 transition-transform shadow-lg"
                        style={{ backgroundColor: team.primaryColor }}
                        onClick={() => openColorEditor(team.id)}
                      />
                      <p className="text-xs text-muted-foreground font-mono">{team.primaryColor}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Secondary</p>
                      <div
                        className="h-16 w-16 rounded-lg border border-border cursor-pointer hover:scale-105 transition-transform shadow-lg"
                        style={{ backgroundColor: team.secondaryColor }}
                        onClick={() => openColorEditor(team.id)}
                      />
                      <p className="text-xs text-muted-foreground font-mono">{team.secondaryColor}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-muted-foreground">Preview</p>
                      <div className="h-16 rounded-lg overflow-hidden flex">
                        <div className="flex-1" style={{ backgroundColor: team.primaryColor }} />
                        <div className="flex-1" style={{ backgroundColor: team.secondaryColor }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Gradient preview</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open) resetUploadForm(); else setUploadOpen(true) }}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload {newAssetType.charAt(0).toUpperCase() + newAssetType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={newAssetType} onValueChange={(v) => setNewAssetType(v as Asset["type"])}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo"><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo</div></SelectItem>
                  <SelectItem value="overlay"><div className="flex items-center gap-2"><Layers className="h-4 w-4" /> Overlay</div></SelectItem>
                  <SelectItem value="sponsor"><div className="flex items-center gap-2"><Star className="h-4 w-4" /> Sponsor</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="e.g. Team Logo, Main Sponsor"
                className="bg-secondary"
              />
            </div>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              {uploadedPreview ? (
                <div className="relative">
                  <img src={uploadedPreview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setUploadedPreview(null) }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">{uploadedFile?.name}</p>
                </div>
              ) : (
                <>
                  <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 5MB</p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm} className="bg-transparent">Cancel</Button>
            <Button onClick={handleUpload} disabled={!newAssetName.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="h-4 w-4 mr-2" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Colors Dialog */}
      <Dialog open={!!editColorOpen} onOpenChange={() => setEditColorOpen(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Edit Team Colors
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-secondary font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="bg-secondary font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { p: '#c8102e', s: '#004d98', name: 'Barcelona' },
                  { p: '#ffffff', s: '#000000', name: 'Classic' },
                  { p: '#da291c', s: '#fbe122', name: 'Liverpool' },
                  { p: '#132257', s: '#ffffff', name: 'Chelsea' },
                  { p: '#6cabdd', s: '#1c2c5b', name: 'Man City' },
                  { p: '#da291c', s: '#ffe500', name: 'Man Utd' },
                ].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => { setPrimaryColor(preset.p); setSecondaryColor(preset.s) }}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.p }} />
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.s }} />
                    <span className="text-xs">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-xs text-muted-foreground mb-3">Preview</p>
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-lg shadow-lg" style={{ backgroundColor: primaryColor }} />
                <div className="h-16 w-16 rounded-lg shadow-lg" style={{ backgroundColor: secondaryColor }} />
                <div className="flex-1 h-16 rounded-lg overflow-hidden flex shadow-lg">
                  <div className="flex-1" style={{ backgroundColor: primaryColor }} />
                  <div className="flex-1" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditColorOpen(null)} className="bg-transparent">Cancel</Button>
            <Button onClick={() => editColorOpen && handleSaveColors(editColorOpen)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="h-4 w-4 mr-2" /> Save Colors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="glass-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewAsset?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="aspect-video rounded-lg bg-[url('/checkerboard.png')] bg-repeat flex items-center justify-center border border-border overflow-hidden" style={{ backgroundSize: '20px 20px' }}>
              {previewAsset?.url && !previewAsset.url.includes('placeholder') ? (
                <img src={previewAsset.url} alt={previewAsset.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                  <p>No preview available</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <Badge variant="outline">{previewAsset?.type}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => previewAsset && copyAssetUrl(previewAsset.url)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy URL
                </Button>
                <Button variant="outline" size="sm" onClick={() => previewAsset && downloadAsset(previewAsset)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        onConfirm={() => confirmDeleteId && handleDeleteAsset(confirmDeleteId)}
        confirmText="Delete"
        destructive
      />
    </div>
  )
}
