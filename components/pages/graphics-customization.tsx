"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  RotateCcw, 
  Move, 
  Maximize2, 
  Eye,
  Monitor,
  Palette,
  Settings2,
  ChevronRight,
  Plus,
  Trash2,
  Paintbrush,
  Download,
  Upload,
  Save
} from "lucide-react"
import { toast } from "sonner"
import { 
  useGraphicsCustomizationStore, 
  triggerGraphicsSync,
  type ComponentStyle, 
  type FillConfig,
  type GradientStop,
  type TextStyle
} from "@/lib/graphics-customization-store"
import { useAppStore } from "@/lib/store"

type GraphicType = 'scoreBug' | 'lowerThird' | 'goalHome' | 'goalAway' | 'cardHome' | 'cardAway' | 'substitutionHome' | 'substitutionAway' | 'nameplateHome' | 'nameplateAway' | 'vsGraphic' | 'lineup' | 'breakingBanner' | 'matchStats' | 'matchOfficials'

const graphicsList: { id: GraphicType; name: string; description: string }[] = [
  { id: 'scoreBug', name: 'Score Bug', description: 'Live match score display' },
  { id: 'lowerThird', name: 'Lower Third', description: 'Information overlay at bottom' },
  { id: 'goalHome', name: 'Goal - Home Team', description: 'Goal scorer for home team' },
  { id: 'goalAway', name: 'Goal - Away Team', description: 'Goal scorer for away team' },
  { id: 'cardHome', name: 'Card - Home Team', description: 'Card display for home team' },
  { id: 'cardAway', name: 'Card - Away Team', description: 'Card display for away team' },
  { id: 'substitutionHome', name: 'Substitution - Home', description: 'Substitution for home team' },
  { id: 'substitutionAway', name: 'Substitution - Away', description: 'Substitution for away team' },
  { id: 'nameplateHome', name: 'Nameplate - Home', description: 'Nameplate for home team' },
  { id: 'nameplateAway', name: 'Nameplate - Away', description: 'Nameplate for away team' },
  { id: 'vsGraphic', name: 'VS Graphic', description: 'Pre-match/Half-time/Full-time screen' },
  { id: 'lineup', name: 'Starting Lineup', description: 'Team formation display' },
  { id: 'breakingBanner', name: 'Breaking Banner', description: 'Breaking news ticker' },
  { id: 'matchStats', name: 'Match Stats', description: 'Match stats lower third display' },
  { id: 'matchOfficials', name: 'Match Officials', description: 'Match officials display' },
]

const patternTypes = [
  { id: 'stripes', name: 'Stripes' },
  { id: 'dots', name: 'Dots' },
  { id: 'chevron', name: 'Chevron' },
  { id: 'maze', name: 'Maze (Original)' },
  { id: 'grid', name: 'Grid' },
  { id: 'custom', name: 'Custom Image' },
]

// Team color option type
interface TeamColorOption {
  id: 'home1' | 'home2' | 'away1' | 'away2' | 'tournament' | null
  name: string
  preview: string | null
}

// Color picker component with team color options
function ColorPicker({ 
  color, 
  onChange, 
  label,
  useTeamColor,
  onTeamColorChange,
  teamColorOptions
}: { 
  color: string
  onChange: (color: string) => void
  label?: string
  useTeamColor?: 'team1' | 'team2' | 'home1' | 'home2' | 'away1' | 'away2' | 'tournament' | null
  onTeamColorChange?: (teamColor: 'team1' | 'team2' | 'home1' | 'home2' | 'away1' | 'away2' | 'tournament' | null) => void
  teamColorOptions?: TeamColorOption[]
}) {
  const isTeamColor = useTeamColor && useTeamColor !== null
  
  // Default options if not provided - show null preview when no team colors available
  const options: TeamColorOption[] = teamColorOptions || [
    { id: null, name: 'Custom Color', preview: null },
    { id: 'home1', name: 'Home Team Primary', preview: null },
    { id: 'home2', name: 'Home Team Secondary', preview: null },
    { id: 'away1', name: 'Away Team Primary', preview: null },
    { id: 'away2', name: 'Away Team Secondary', preview: null },
    { id: 'tournament', name: 'Tournament Color', preview: null },
  ]
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {label && <Label className="text-xs w-16">{label}</Label>}
        {onTeamColorChange && (
          <Select 
            value={useTeamColor || 'custom'} 
            onValueChange={(v) => onTeamColorChange(v === 'custom' ? null : v as typeof useTeamColor)}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Select color type" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id || 'custom'} value={opt.id || 'custom'}>
                  <div className="flex items-center gap-2">
                    {opt.preview && (
                      <div 
                        className="w-3 h-3 rounded-full border border-border" 
                        style={{ backgroundColor: opt.preview }}
                      />
                    )}
                    <span>{opt.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {!isTeamColor && (
        <div className="flex items-center gap-2">
          {label && !onTeamColorChange && <Label className="text-xs w-16">{label}</Label>}
          {label && onTeamColorChange && <div className="w-16" />}
          <div className="relative">
            <input
              type="color"
              value={color.startsWith('#') ? color : '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
          </div>
          <Input
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-8 text-xs font-mono"
            placeholder="#000000 or rgba()"
          />
        </div>
      )}
      {isTeamColor && (
        <div className="flex items-center gap-2 pl-16">
          <Badge variant="secondary" className="text-xs">
            {options.find(o => o.id === useTeamColor)?.name || 'Team Color'}
          </Badge>
          <span className="text-xs text-muted-foreground">Color will be applied from team data at runtime</span>
        </div>
      )}
    </div>
  )
}

// Gradient editor component
function GradientEditor({ 
  fill, 
  onChange 
}: { 
  fill: FillConfig
  onChange: (fill: FillConfig) => void 
}) {
  const gradient = fill.gradient || { type: 'linear' as const, angle: 90, stops: [{ color: '#000000', position: 0 }, { color: '#ffffff', position: 100 }] }
  
  const updateGradient = (updates: Partial<typeof gradient>) => {
    onChange({
      ...fill,
      type: 'gradient',
      gradient: { ...gradient, ...updates }
    })
  }

  const updateStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = [...gradient.stops]
    newStops[index] = { ...newStops[index], ...updates }
    updateGradient({ stops: newStops })
  }

  const addStop = () => {
    const newStops = [...gradient.stops, { color: '#888888', position: 50 }]
    updateGradient({ stops: newStops.sort((a, b) => a.position - b.position) })
  }

  const removeStop = (index: number) => {
    if (gradient.stops.length > 2) {
      const newStops = gradient.stops.filter((_, i) => i !== index)
      updateGradient({ stops: newStops })
    }
  }

  const gradientPreview = `linear-gradient(${gradient.angle}deg, ${gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div 
        className="h-12 rounded-lg border border-border"
        style={{ background: gradientPreview }}
      />

      {/* Type & Angle */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <Select value={gradient.type} onValueChange={(v) => updateGradient({ type: v as 'linear' | 'radial' })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {gradient.type === 'linear' && (
          <div className="space-y-2">
            <Label className="text-xs">Angle: {gradient.angle}°</Label>
            <Slider
              value={[gradient.angle]}
              onValueChange={([v]) => updateGradient({ angle: v })}
              min={0}
              max={360}
              step={1}
            />
          </div>
        )}
      </div>

      {/* Color Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Color Stops</Label>
          <Button variant="outline" size="sm" onClick={addStop} className="h-6 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={stop.color.startsWith('#') ? stop.color : '#000000'}
                onChange={(e) => updateStop(index, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
              <Input
                value={stop.color}
                onChange={(e) => updateStop(index, { color: e.target.value })}
                className="flex-1 h-8 text-xs font-mono"
              />
              <Input
                type="number"
                value={stop.position}
                onChange={(e) => updateStop(index, { position: parseInt(e.target.value) || 0 })}
                className="w-16 h-8 text-xs"
                min={0}
                max={100}
              />
              <span className="text-xs text-muted-foreground">%</span>
              {gradient.stops.length > 2 && (
                <Button variant="ghost" size="sm" onClick={() => removeStop(index)} className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Pattern editor component
function PatternEditor({ 
  fill, 
  onChange,
  teamColorOptions
}: { 
  fill: FillConfig
  onChange: (fill: FillConfig) => void
  teamColorOptions?: TeamColorOption[]
}) {
  const pattern = fill.pattern || { enabled: true, type: 'stripes' as const, color: '#ffffff', opacity: 0.2, size: 20, angle: 45 }

  const updatePattern = (updates: Partial<typeof pattern>) => {
    onChange({
      ...fill,
      type: 'pattern',
      pattern: { ...pattern, ...updates }
    })
  }

  return (
    <div className="space-y-4">
      {/* Pattern Type */}
      <div className="space-y-2">
        <Label className="text-xs">Pattern Type</Label>
        <Select value={pattern.type} onValueChange={(v) => {
          // Clear customUrl when switching away from custom pattern type
          if (v !== 'custom') {
            updatePattern({ type: v as typeof pattern.type, customUrl: undefined })
          } else {
            updatePattern({ type: v as typeof pattern.type })
          }
        }}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {patternTypes.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Base Color */}
      <ColorPicker 
        color={fill.color} 
        onChange={(color) => onChange({ ...fill, color, useTeamColor: null })} 
        label="Base"
        useTeamColor={fill.useTeamColor}
        onTeamColorChange={(teamColor) => onChange({ ...fill, useTeamColor: teamColor })}
        teamColorOptions={teamColorOptions}
      />

      {/* Pattern Color */}
      <ColorPicker 
        color={pattern.color} 
        onChange={(color) => updatePattern({ color })} 
        label="Pattern"
      />

      {/* Pattern Settings */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Opacity: {(pattern.opacity * 100).toFixed(0)}%</Label>
          <Slider
            value={[pattern.opacity]}
            onValueChange={([v]) => updatePattern({ opacity: v })}
            min={0}
            max={1}
            step={0.01}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Size</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[Math.min(pattern.size, 200)]}
              onValueChange={([v]) => updatePattern({ size: v })}
              min={5}
              max={200}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={pattern.size}
              onChange={(e) => updatePattern({ size: Math.max(1, parseInt(e.target.value) || 20) })}
              className="w-20 h-8 text-xs"
              min={1}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>
      </div>

      {pattern.type === 'stripes' && (
        <div className="space-y-2">
          <Label className="text-xs">Angle: {pattern.angle}°</Label>
          <Slider
            value={[pattern.angle || 45]}
            onValueChange={([v]) => updatePattern({ angle: v })}
            min={0}
            max={180}
            step={5}
          />
        </div>
      )}

      {pattern.type === 'custom' && (
        <div className="space-y-3">
          <Label className="text-xs">Custom Pattern Image</Label>
          
          {/* File Upload */}
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    const dataUrl = event.target?.result as string
                    updatePattern({ customUrl: dataUrl })
                  }
                  reader.readAsDataURL(file)
                }
              }}
              className="h-8 text-xs flex-1"
            />
          </div>
          
          {/* Preview */}
          {pattern.customUrl && (
            <div className="relative">
              <img 
                src={pattern.customUrl} 
                alt="Pattern preview" 
                className="w-full h-20 object-cover rounded border border-border"
                style={{ opacity: pattern.opacity }}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => updatePattern({ customUrl: '' })}
              >
                ×
              </Button>
            </div>
          )}
          
          {/* Or URL input */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Or paste URL</Label>
            <Input
              value={pattern.customUrl?.startsWith('data:') ? '' : (pattern.customUrl || '')}
              onChange={(e) => updatePattern({ customUrl: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Animation Controls */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Pattern Animation</Label>
          <Button
            variant={pattern.animation?.enabled ? "default" : "outline"}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => updatePattern({ 
              animation: { 
                enabled: !pattern.animation?.enabled, 
                direction: pattern.animation?.direction || 'up',
                speed: pattern.animation?.speed || 4
              } 
            })}
          >
            {pattern.animation?.enabled ? 'On' : 'Off'}
          </Button>
        </div>
        
        {pattern.animation?.enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Direction</Label>
              <Select 
                value={pattern.animation?.direction || 'up'} 
                onValueChange={(v) => updatePattern({ 
                  animation: { ...pattern.animation!, direction: v as 'up' | 'down' | 'left' | 'right' | 'none' } 
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up ↑</SelectItem>
                  <SelectItem value="down">Down ↓</SelectItem>
                  <SelectItem value="left">Left ←</SelectItem>
                  <SelectItem value="right">Right →</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Speed</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[Math.min(pattern.animation?.speed || 4, 20)]}
                  onValueChange={([v]) => updatePattern({ 
                    animation: { ...pattern.animation!, speed: v } 
                  })}
                  min={0.5}
                  max={20}
                  step={0.5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={pattern.animation?.speed || 4}
                  onChange={(e) => updatePattern({ 
                    animation: { ...pattern.animation!, speed: Math.max(0.1, parseFloat(e.target.value) || 4) } 
                  })}
                  className="w-20 h-8 text-xs"
                  min={0.1}
                  step={0.1}
                />
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Component style editor
function ComponentStyleEditor({
  component,
  onUpdate,
  teamColorOptions
}: {
  component: ComponentStyle
  onUpdate: (updates: Partial<ComponentStyle>) => void
  teamColorOptions?: TeamColorOption[]
}) {
  const [fillType, setFillType] = useState<'solid' | 'gradient' | 'pattern'>(component.fill.type)

  const handleFillTypeChange = (type: 'solid' | 'gradient' | 'pattern') => {
    setFillType(type)
    if (type === 'solid') {
      // Clear pattern and gradient when switching to solid
      onUpdate({ fill: { type: 'solid', color: component.fill.color, pattern: undefined, gradient: undefined } })
    } else if (type === 'gradient') {
      // Clear pattern when switching to gradient
      onUpdate({ 
        fill: { 
          type: 'gradient',
          color: component.fill.color,
          gradient: component.fill.gradient || { type: 'linear', angle: 90, stops: [{ color: '#000000', position: 0 }, { color: '#ffffff', position: 100 }] },
          pattern: undefined
        } 
      })
    } else {
      // Clear gradient when switching to pattern
      onUpdate({
        fill: {
          type: 'pattern',
          color: component.fill.color,
          pattern: component.fill.pattern || { enabled: true, type: 'stripes', color: '#ffffff', opacity: 0.2, size: 20, angle: 45 },
          gradient: undefined
        }
      })
    }
  }

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{component.name}</h4>
        <Badge variant="outline" className="text-xs">{component.id}</Badge>
      </div>

      {/* Fill Type Selector */}
      <div className="space-y-2">
        <Label className="text-xs">Fill Type</Label>
        <div className="flex gap-2">
          <Button
            variant={fillType === 'solid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFillTypeChange('solid')}
            className="flex-1 h-8 text-xs"
          >
            Solid
          </Button>
          <Button
            variant={fillType === 'gradient' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFillTypeChange('gradient')}
            className="flex-1 h-8 text-xs"
          >
            Gradient
          </Button>
          <Button
            variant={fillType === 'pattern' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFillTypeChange('pattern')}
            className="flex-1 h-8 text-xs"
          >
            Pattern
          </Button>
        </div>
      </div>

      {/* Fill Editor based on type */}
      {fillType === 'solid' && (
        <ColorPicker
          color={component.fill.color}
          onChange={(color) => onUpdate({ fill: { ...component.fill, color, useTeamColor: null } })}
          label="Color"
          useTeamColor={component.fill.useTeamColor}
          onTeamColorChange={(teamColor) => onUpdate({ fill: { ...component.fill, useTeamColor: teamColor } })}
          teamColorOptions={teamColorOptions}
        />
      )}

      {fillType === 'gradient' && (
        <GradientEditor
          fill={component.fill}
          onChange={(fill) => onUpdate({ fill })}
        />
      )}

      {fillType === 'pattern' && (
        <PatternEditor
          fill={component.fill}
          onChange={(fill) => onUpdate({ fill })}
          teamColorOptions={teamColorOptions}
        />
      )}

      {/* Text Color (if applicable) */}
      {component.textColor !== undefined && (
        <ColorPicker
          color={component.textColor}
          onChange={(textColor) => onUpdate({ textColor })}
          label="Text"
        />
      )}

      {/* Font Size (if applicable) */}
      {component.fontSize !== undefined && (
        <div className="space-y-2">
          <Label className="text-xs">Font Size</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[component.fontSize]}
              onValueChange={(value) => onUpdate({ fontSize: value[0] })}
              min={8}
              max={200}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{component.fontSize}px</span>
          </div>
        </div>
      )}

      {/* Animation Speed (for ticker/scroll animations) */}
      {component.animationSpeed !== undefined && (
        <div className="space-y-2">
          <Label className="text-xs">Ticker Animation Speed</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[component.animationSpeed]}
              onValueChange={(value) => onUpdate({ animationSpeed: value[0] })}
              min={5}
              max={120}
              step={5}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{component.animationSpeed}s</span>
          </div>
          <p className="text-xs text-muted-foreground">Lower = faster scroll, Higher = slower scroll</p>
        </div>
      )}

      {/* Text Style Options (if component has textColor, it likely has text) */}
      {component.textColor !== undefined && (
        <TextStyleEditor
          textStyle={component.textStyle}
          onUpdate={(textStyle) => onUpdate({ textStyle })}
        />
      )}
    </div>
  )
}

// Text style editor component
function TextStyleEditor({
  textStyle,
  onUpdate
}: {
  textStyle?: TextStyle
  onUpdate: (textStyle: TextStyle) => void
}) {
  const style = textStyle || {};
  
  const updateStyle = (updates: Partial<TextStyle>) => {
    onUpdate({ ...style, ...updates });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <Label className="text-xs font-medium">Text Style</Label>
      
      {/* Font Weight & Style Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <Select 
            value={style.fontWeight || 'normal'} 
            onValueChange={(v) => updateStyle({ fontWeight: v as TextStyle['fontWeight'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="semibold">Semibold</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="extrabold">Extra Bold</SelectItem>
              <SelectItem value="black">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <Select 
            value={style.fontStyle || 'normal'} 
            onValueChange={(v) => updateStyle({ fontStyle: v as TextStyle['fontStyle'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="italic">Italic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transform & Decoration Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Transform</Label>
          <Select 
            value={style.textTransform || 'none'} 
            onValueChange={(v) => updateStyle({ textTransform: v as TextStyle['textTransform'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
              <SelectItem value="capitalize">Capitalize</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Decoration</Label>
          <Select 
            value={style.textDecoration || 'none'} 
            onValueChange={(v) => updateStyle({ textDecoration: v as TextStyle['textDecoration'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="underline">Underline</SelectItem>
              <SelectItem value="line-through">Strikethrough</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Letter Spacing: {((style.letterSpacing || 0) * 100).toFixed(0)}%</Label>
        <Slider
          value={[style.letterSpacing || 0]}
          onValueChange={([v]) => updateStyle({ letterSpacing: v })}
          min={-0.1}
          max={0.5}
          step={0.01}
        />
      </div>

      {/* Text Shadow Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Text Shadow</Label>
        <Button
          variant={style.textShadow ? "default" : "outline"}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => updateStyle({ textShadow: !style.textShadow })}
        >
          {style.textShadow ? 'On' : 'Off'}
        </Button>
      </div>
    </div>
  );
}

export function GraphicsCustomization() {
  const [selectedGraphic, setSelectedGraphic] = useState<GraphicType>('scoreBug')
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const store = useGraphicsCustomizationStore()
  const currentMatch = useAppStore(state => state.currentMatch)
  
  const currentGraphic = store[selectedGraphic]
  
  // Get actual team colors from current match
  const teamColorOptions: TeamColorOption[] = useMemo(() => {
    const homeTeam = currentMatch?.homeTeam
    const awayTeam = currentMatch?.awayTeam
    const tournamentColor = currentMatch?.tournamentColor
    
    return [
      { id: null, name: 'Custom Color', preview: null },
      { id: 'home1', name: 'Home Team Primary', preview: homeTeam?.primaryColor || null },
      { id: 'home2', name: 'Home Team Secondary', preview: homeTeam?.secondaryColor || null },
      { id: 'away1', name: 'Away Team Primary', preview: awayTeam?.primaryColor || null },
      { id: 'away2', name: 'Away Team Secondary', preview: awayTeam?.secondaryColor || null },
      { id: 'tournament', name: 'Tournament Color', preview: tournamentColor || null },
    ]
  }, [currentMatch?.homeTeam, currentMatch?.awayTeam, currentMatch?.tournamentColor])
  
  const handlePositionChange = (key: 'top' | 'left' | 'right' | 'bottom', value: number) => {
    store.updateGraphicPosition(selectedGraphic, { [key]: value })
    triggerGraphicsSync()
  }

  const handleScaleChange = (value: number[]) => {
    store.updateGraphicScale(selectedGraphic, value[0])
    triggerGraphicsSync()
  }

  const handleOpacityChange = (value: number[]) => {
    store.updateGraphicOpacity(selectedGraphic, value[0])
    triggerGraphicsSync()
  }

  const handleComponentUpdate = (componentId: string, updates: Partial<ComponentStyle>) => {
    store.updateComponentStyle(selectedGraphic, componentId, updates)
    // Auto-sync changes to renderer
    triggerGraphicsSync()
  }

  const handleReset = () => {
    store.resetGraphic(selectedGraphic)
    triggerGraphicsSync()
    toast.success('Graphic reset to defaults')
  }

  const handleResetAll = () => {
    store.resetAll()
    triggerGraphicsSync()
    toast.success('All graphics reset to defaults')
  }

  const handleExport = () => {
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      graphics: {
        scoreBug: store.scoreBug,
        lowerThird: store.lowerThird,
        goalHome: store.goalHome,
        goalAway: store.goalAway,
        cardHome: store.cardHome,
        cardAway: store.cardAway,
        substitutionHome: store.substitutionHome,
        substitutionAway: store.substitutionAway,
        nameplateHome: store.nameplateHome,
        nameplateAway: store.nameplateAway,
        vsGraphic: store.vsGraphic,
        lineup: store.lineup,
        breakingBanner: store.breakingBanner,
        matchStats: store.matchStats,
        matchOfficials: store.matchOfficials,
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `graphics-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Graphics configuration exported')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (!data.graphics) {
          toast.error('Invalid configuration file')
          return
        }
        
        // Import each graphic
        const graphicKeys: GraphicType[] = ['scoreBug', 'lowerThird', 'goalHome', 'goalAway', 'cardHome', 'cardAway', 'substitutionHome', 'substitutionAway', 'nameplateHome', 'nameplateAway', 'vsGraphic', 'lineup', 'breakingBanner', 'matchStats', 'matchOfficials']
        graphicKeys.forEach((key) => {
          if (data.graphics[key]) {
            const graphic = data.graphics[key]
            if (graphic.position) store.updateGraphicPosition(key, graphic.position)
            if (graphic.scale !== undefined) store.updateGraphicScale(key, graphic.scale)
            if (graphic.opacity !== undefined) store.updateGraphicOpacity(key, graphic.opacity)
            if (graphic.components) {
              graphic.components.forEach((comp: ComponentStyle) => {
                store.updateComponentStyle(key, comp.id, comp)
              })
            }
          }
        })
        
        triggerGraphicsSync()
        toast.success('Graphics configuration imported and synced')
      } catch {
        toast.error('Failed to import configuration')
      }
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-6">
        {/* Graphics List */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Graphics</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleImport} className="h-7 w-7 p-0" title="Import">
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 w-7 p-0" title="Export">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResetAll} className="h-7 w-7 p-0" title="Reset All">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-2">
                {graphicsList.map((graphic) => (
                  <button
                    key={graphic.id}
                    onClick={() => { setSelectedGraphic(graphic.id); setSelectedComponent(null); }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      selectedGraphic === graphic.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{graphic.name}</div>
                      <div className="text-xs text-muted-foreground">{graphic.description}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedGraphic === graphic.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customization Panel */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{graphicsList.find(g => g.id === selectedGraphic)?.name}</CardTitle>
                  <CardDescription>{graphicsList.find(g => g.id === selectedGraphic)?.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => {
                    // Trigger sync to all windows/tabs including renderer
                    triggerGraphicsSync();
                    toast.success('Changes saved and synced!');
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Sync
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="components" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="components" className="gap-2">
                    <Paintbrush className="h-4 w-4" />
                    Components
                  </TabsTrigger>
                  <TabsTrigger value="position" className="gap-2">
                    <Move className="h-4 w-4" />
                    Position
                  </TabsTrigger>
                  <TabsTrigger value="transform" className="gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Transform
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Advanced
                  </TabsTrigger>
                </TabsList>

                {/* Components Tab - Color/Gradient/Pattern Editor */}
                <TabsContent value="components" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click on a component to customize its colors, gradients, or patterns.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Component List */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Component</Label>
                      <div className="space-y-1 max-h-[500px] overflow-auto pr-2">
                        {currentGraphic.components.map((comp) => {
                          // Resolve the preview color - use team color if set, otherwise use fill.color
                          const getPreviewColor = () => {
                            if (comp.fill.useTeamColor) {
                              const opt = teamColorOptions.find(o => o.id === comp.fill.useTeamColor)
                              if (opt?.preview) return opt.preview
                            }
                            return comp.fill.color
                          }
                          const previewColor = getPreviewColor()
                          
                          return (
                            <button
                              key={comp.id}
                              onClick={() => setSelectedComponent(comp.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                selectedComponent === comp.id
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-muted border border-transparent'
                              }`}
                            >
                              <div 
                                className="w-8 h-8 rounded border border-border shrink-0"
                                style={{ 
                                  background: comp.fill.type === 'gradient' && comp.fill.gradient
                                    ? `linear-gradient(${comp.fill.gradient.angle}deg, ${comp.fill.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                                    : previewColor 
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{comp.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{comp.fill.type}</div>
                              </div>
                              <Palette className={`h-4 w-4 shrink-0 ${selectedComponent === comp.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Component Editor */}
                    <div>
                      {selectedComponent ? (
                        <ComponentStyleEditor
                          component={currentGraphic.components.find(c => c.id === selectedComponent)!}
                          onUpdate={(updates) => handleComponentUpdate(selectedComponent, updates)}
                          teamColorOptions={teamColorOptions}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg p-8">
                          <div className="text-center">
                            <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Select a component to customize</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Position Tab */}
                <TabsContent value="position" className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Move className="h-4 w-4" />
                        Screen Position
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="top">Top (px)</Label>
                          <Input
                            id="top"
                            type="number"
                            value={currentGraphic.position.top}
                            onChange={(e) => handlePositionChange('top', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="left">Left (px)</Label>
                          <Input
                            id="left"
                            type="number"
                            value={currentGraphic.position.left}
                            onChange={(e) => handlePositionChange('left', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Preview
                      </h3>
                      <div className="aspect-video bg-muted rounded-lg border-2 border-dashed border-border relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                          {[...Array(9)].map((_, i) => (
                            <div key={i} className="border border-border/30" />
                          ))}
                        </div>
                        <div
                          className="absolute bg-primary/30 border-2 border-primary rounded transition-all"
                          style={{
                            top: `${(currentGraphic.position.top / 1080) * 100}%`,
                            left: `${(currentGraphic.position.left / 1920) * 100}%`,
                            width: selectedGraphic === 'vsGraphic' || selectedGraphic === 'lineup' ? '100%' : '20%',
                            height: selectedGraphic === 'vsGraphic' || selectedGraphic === 'lineup' ? '100%' : '10%',
                            transform: `scale(${currentGraphic.scale})`,
                            opacity: currentGraphic.opacity,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Transform Tab */}
                <TabsContent value="transform" className="space-y-6 mt-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Maximize2 className="h-4 w-4" />
                          Scale
                        </Label>
                        <Badge variant="secondary">{(currentGraphic.scale * 100).toFixed(0)}%</Badge>
                      </div>
                      <Slider
                        value={[currentGraphic.scale]}
                        onValueChange={handleScaleChange}
                        min={0.5}
                        max={2}
                        step={0.05}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Opacity
                        </Label>
                        <Badge variant="secondary">{(currentGraphic.opacity * 100).toFixed(0)}%</Badge>
                      </div>
                      <Slider
                        value={[currentGraphic.opacity]}
                        onValueChange={handleOpacityChange}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-6 mt-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2">Current Configuration</h3>
                    <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-[400px]">
                      {JSON.stringify(currentGraphic, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
