'use client'

import { useState } from 'react'
import {
  Palette, Type, Mic2, Users, Eye, Music2,
  RefreshCw, ChevronDown, Save, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useActiveBrand, useBrandStore } from '../../hooks/useBrandStore'
import type { Brand, BrandColor } from '../../types'

export function BrandTab() {
  const brand = useActiveBrand()
  const { updateBrand, generateBrandGuide, isGeneratingGuide, isSaving } = useBrandStore()

  if (!brand) {
    return <EmptyBrandState />
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Brand Guide Image */}
      {brand.brand_guide_image_url && (
        <div className="relative group rounded-xl overflow-hidden border border-border/40">
          <img
            src={brand.brand_guide_image_url}
            alt={`${brand.name} brand guide`}
            className="w-full object-contain"
          />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-background/80 backdrop-blur-sm"
              onClick={() => generateBrandGuide(brand.id, brand.logo_url, brand.raw_company_info || brand.name)}
              disabled={isGeneratingGuide}
            >
              {isGeneratingGuide
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Editable Sections */}
      <div className="grid gap-4">
        <ColorsSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
        <TypographySection brand={brand} onSave={updateBrand} isSaving={isSaving} />
        <VoiceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
        <AudienceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
        <VisualStyleSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
        <MusicSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </div>

      {/* Raw JSON */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ChevronDown className="w-4 h-4" />
            Raw Brand Data (JSON)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 p-4 bg-secondary/50 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(brand, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function EmptyBrandState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Palette className="w-8 h-8 text-primary/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No Brand Selected</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Create a new brand or select one from the dropdown to view and edit its identity.
      </p>
    </div>
  )
}

// --- Section Components ---

interface SectionProps {
  brand: Brand
  onSave: (data: Partial<Brand> & { id: string }) => Promise<void>
  isSaving: boolean
}

function ColorsSection({ brand, onSave, isSaving }: SectionProps) {
  const colors = brand.visual_identity_json?.colors ?? []
  const [editing, setEditing] = useState(false)
  const [localColors, setLocalColors] = useState<BrandColor[]>(colors)

  const handleSave = async () => {
    await onSave({
      id: brand.id,
      visual_identity_json: {
        ...(brand.visual_identity_json || { typography: { heading_font: '', body_font: '', weights: [], heading_sizes: '' } }),
        colors: localColors,
      },
    })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Colors
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocalColors(colors); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {colors.length === 0 && !editing ? (
          <p className="text-sm text-muted-foreground">No colors defined yet.</p>
        ) : editing ? (
          <div className="space-y-2">
            {localColors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => {
                    const next = [...localColors]
                    next[i] = { ...c, hex: e.target.value }
                    setLocalColors(next)
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <Input
                  value={c.name}
                  onChange={(e) => {
                    const next = [...localColors]
                    next[i] = { ...c, name: e.target.value }
                    setLocalColors(next)
                  }}
                  className="flex-1 h-8 text-sm"
                />
                <code className="text-xs text-muted-foreground w-16">{c.hex}</code>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-dashed"
              onClick={() => setLocalColors([...localColors, { name: 'New', hex: '#888888', role: 'accent' }])}
            >
              + Add Color
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5">
                <div className="w-5 h-5 rounded-md border border-border/40" style={{ backgroundColor: c.hex }} />
                <span className="text-sm">{c.name}</span>
                <code className="text-[10px] text-muted-foreground">{c.hex}</code>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TypographySection({ brand, onSave, isSaving }: SectionProps) {
  const typo = brand.visual_identity_json?.typography
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(typo)

  const handleSave = async () => {
    if (!local) return
    await onSave({
      id: brand.id,
      visual_identity_json: {
        ...(brand.visual_identity_json || { colors: [] }),
        typography: local,
      },
    })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            Typography
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocal(typo); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!typo && !editing ? (
          <p className="text-sm text-muted-foreground">No typography defined yet.</p>
        ) : editing && local ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Heading Font</Label>
              <Input value={local.heading_font} onChange={(e) => setLocal({ ...local, heading_font: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body Font</Label>
              <Input value={local.body_font} onChange={(e) => setLocal({ ...local, body_font: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
        ) : typo ? (
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="text-xs">{typo.heading_font} (heading)</Badge>
            <Badge variant="secondary" className="text-xs">{typo.body_font} (body)</Badge>
            {typo.weights?.map((w, i) => (
              <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function VoiceSection({ brand, onSave, isSaving }: SectionProps) {
  const voice = brand.voice_json
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(voice)

  const handleSave = async () => {
    if (!local) return
    await onSave({ id: brand.id, voice_json: local })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-primary" />
            Voice & Tone
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocal(voice); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!voice && !editing ? (
          <p className="text-sm text-muted-foreground">No voice profile defined yet.</p>
        ) : editing && local ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tone (comma-separated)</Label>
              <Input
                value={local.tone?.join(', ')}
                onChange={(e) => setLocal({ ...local, tone: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
                placeholder="bold, energetic, authentic"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Persona</Label>
              <Textarea
                value={local.persona}
                onChange={(e) => setLocal({ ...local, persona: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">What to Avoid (comma-separated)</Label>
              <Input
                value={local.avoid?.join(', ')}
                onChange={(e) => setLocal({ ...local, avoid: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        ) : voice ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {voice.tone?.map((t, i) => (
                <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-xs">{t}</Badge>
              ))}
            </div>
            {voice.persona && <p className="text-sm text-muted-foreground">{voice.persona}</p>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AudienceSection({ brand, onSave, isSaving }: SectionProps) {
  const audience = brand.audience_json
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(audience)

  const handleSave = async () => {
    if (!local) return
    await onSave({ id: brand.id, audience_json: local })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Audience
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocal(audience); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!audience && !editing ? (
          <p className="text-sm text-muted-foreground">No audience defined yet.</p>
        ) : editing && local ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Primary Audience</Label>
              <Input value={local.primary} onChange={(e) => setLocal({ ...local, primary: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secondary Audience</Label>
              <Input value={local.secondary} onChange={(e) => setLocal({ ...local, secondary: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Psychographics</Label>
              <Textarea value={local.psychographics} onChange={(e) => setLocal({ ...local, psychographics: e.target.value })} rows={2} className="text-sm" />
            </div>
          </div>
        ) : audience ? (
          <div className="space-y-1.5">
            <p className="text-sm"><span className="text-muted-foreground">Primary:</span> {audience.primary}</p>
            <p className="text-sm"><span className="text-muted-foreground">Secondary:</span> {audience.secondary}</p>
            {audience.psychographics && (
              <p className="text-sm text-muted-foreground">{audience.psychographics}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function VisualStyleSection({ brand, onSave, isSaving }: SectionProps) {
  const style = brand.visual_style_json
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(style)

  const handleSave = async () => {
    if (!local) return
    await onSave({ id: brand.id, visual_style_json: local })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Visual Style
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocal(style); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!style && !editing ? (
          <p className="text-sm text-muted-foreground">No visual style defined yet.</p>
        ) : editing && local ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Photography Tone</Label>
              <Input value={local.photography_tone} onChange={(e) => setLocal({ ...local, photography_tone: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subjects (comma-separated)</Label>
              <Input
                value={local.subjects?.join(', ')}
                onChange={(e) => setLocal({ ...local, subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Composition</Label>
              <Input value={local.composition} onChange={(e) => setLocal({ ...local, composition: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
        ) : style ? (
          <div className="space-y-1.5">
            <p className="text-sm"><span className="text-muted-foreground">Tone:</span> {style.photography_tone}</p>
            <div className="flex flex-wrap gap-1.5">
              {style.subjects?.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
            {style.composition && <p className="text-sm text-muted-foreground">{style.composition}</p>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MusicSection({ brand, onSave, isSaving }: SectionProps) {
  const music = brand.music_json
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(music)

  const handleSave = async () => {
    if (!local) return
    await onSave({ id: brand.id, music_json: local })
    setEditing(false)
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-primary" />
            Music Preferences
          </span>
          {editing ? (
            <Button size="sm" variant="default" className="gap-1.5 h-7" onClick={handleSave} disabled={isSaving}>
              <Save className="w-3 h-3" /> Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLocal(music); setEditing(true) }}>
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!music && !editing ? (
          <p className="text-sm text-muted-foreground">No music preferences defined yet.</p>
        ) : editing && local ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Genres (comma-separated)</Label>
              <Input
                value={local.genres?.join(', ')}
                onChange={(e) => setLocal({ ...local, genres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Moods (comma-separated)</Label>
              <Input
                value={local.moods?.join(', ')}
                onChange={(e) => setLocal({ ...local, moods: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Min BPM</Label>
                <Input
                  type="number"
                  value={local.bpm_range?.min ?? 80}
                  onChange={(e) => setLocal({ ...local, bpm_range: { ...local.bpm_range, min: Number(e.target.value) } })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max BPM</Label>
                <Input
                  type="number"
                  value={local.bpm_range?.max ?? 140}
                  onChange={(e) => setLocal({ ...local, bpm_range: { ...local.bpm_range, max: Number(e.target.value) } })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ) : music ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {music.genres?.map((g, i) => (
                <Badge key={i} className="bg-accent/10 text-accent border-accent/20 text-xs">{g}</Badge>
              ))}
              {music.moods?.map((m, i) => (
                <Badge key={`m-${i}`} variant="outline" className="text-xs">{m}</Badge>
              ))}
            </div>
            {music.bpm_range && (
              <p className="text-xs text-muted-foreground">BPM: {music.bpm_range.min}–{music.bpm_range.max}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
