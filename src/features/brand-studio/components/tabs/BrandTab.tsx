'use client'

import { useState } from 'react'
import {
  Palette, Type, Mic2, Users, Eye, Music2,
  RefreshCw, ChevronDown, Save, Loader2, Sparkles, Plus
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useActiveBrand, useBrandStore } from '../../hooks/useBrandStore'
import type { Brand, BrandColor } from '../../types'

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } }
}
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}

export function BrandTab() {
  const brand = useActiveBrand()
  const { updateBrand, generateBrandGuide, isGeneratingGuide, isSaving } = useBrandStore()

  if (!brand) {
    return <EmptyBrandState />
  }

  return (
    <motion.div className="space-y-5 pb-8" variants={stagger} initial="initial" animate="animate">
      {/* Brand Guide Image */}
      {brand.brand_guide_image_url && (
        <motion.div variants={fadeUp} className="relative group rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
          <img
            src={brand.brand_guide_image_url}
            alt={`${brand.name} brand guide`}
            className="w-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-background/90 backdrop-blur-md border border-border/40 shadow-lg"
              onClick={() => generateBrandGuide(brand.id, brand.logo_url, brand.raw_company_info || brand.name)}
              disabled={isGeneratingGuide}
            >
              {isGeneratingGuide
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              Regenerate Guide
            </Button>
          </div>
        </motion.div>
      )}

      {/* Editable Sections */}
      <motion.div variants={fadeUp}>
        <ColorsSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <TypographySection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <VoiceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <AudienceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <VisualStyleSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <MusicSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>

      {/* Raw JSON */}
      <motion.div variants={fadeUp}>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground/60 hover:text-muted-foreground text-xs">
              <ChevronDown className="w-3.5 h-3.5" />
              Raw Brand Data
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 p-4 bg-secondary/30 rounded-xl text-[11px] overflow-x-auto max-h-64 overflow-y-auto border border-border/20 text-muted-foreground/70 font-mono">
              {JSON.stringify(brand, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </motion.div>
  )
}

function EmptyBrandState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center relative"
    >
      {/* Decorative background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-primary/5 absolute" />
        <div className="w-48 h-48 rounded-full border border-primary/8 absolute" />
        <div className="w-32 h-32 rounded-full border border-primary/10 absolute" />
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center mb-6 shadow-lg shadow-primary/5"
      >
        <Palette className="w-9 h-9 text-primary/50" />
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight mb-2">No Brand Selected</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Create a new brand to get started. Upload a logo and describe your brand — AI will generate a complete visual identity guide.
      </p>
      <Button className="gap-2 shadow-lg shadow-primary/10" size="sm">
        <Sparkles className="w-4 h-4" />
        Create Your First Brand
      </Button>
    </motion.div>
  )
}

// --- Section Components (compact, polished card style) ---

interface SectionProps {
  brand: Brand
  onSave: (data: Partial<Brand> & { id: string }) => Promise<void>
  isSaving: boolean
}

function SectionCard({ icon: Icon, title, iconColor, children, editing, onEdit, onSave, isSaving }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  iconColor: string
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <Card className="border-border/25 bg-card/60 backdrop-blur-sm hover:border-border/40 transition-colors duration-300 group">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold">{title}</span>
          </span>
          {editing ? (
            <Button size="sm" className="gap-1.5 h-7 text-xs px-3" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
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
    <SectionCard
      icon={Palette} title="Colors" iconColor="bg-amber-500/10 text-amber-400"
      editing={editing} onEdit={() => { setLocalColors(colors); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {colors.length === 0 && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No colors defined yet.</p>
      ) : editing ? (
        <div className="space-y-2">
          {localColors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => {
                    const next = [...localColors]
                    next[i] = { ...c, hex: e.target.value }
                    setLocalColors(next)
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-border/40 bg-transparent"
                />
              </div>
              <Input
                value={c.name}
                onChange={(e) => {
                  const next = [...localColors]
                  next[i] = { ...c, name: e.target.value }
                  setLocalColors(next)
                }}
                className="flex-1 h-8 text-sm"
              />
              <code className="text-[11px] text-muted-foreground/60 font-mono w-16">{c.hex}</code>
            </div>
          ))}
          <Button
            size="sm" variant="outline"
            className="h-7 text-xs border-dashed gap-1"
            onClick={() => setLocalColors([...localColors, { name: 'New', hex: '#888888', role: 'accent' }])}
          >
            <Plus className="w-3 h-3" /> Add Color
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-1.5 border border-border/15">
              <div className="w-5 h-5 rounded-md border border-white/10 shadow-inner" style={{ backgroundColor: c.hex }} />
              <span className="text-sm font-medium">{c.name}</span>
              <code className="text-[10px] text-muted-foreground/50 font-mono">{c.hex}</code>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
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
      visual_identity_json: { ...(brand.visual_identity_json || { colors: [] }), typography: local },
    })
    setEditing(false)
  }

  return (
    <SectionCard
      icon={Type} title="Typography" iconColor="bg-blue-500/10 text-blue-400"
      editing={editing} onEdit={() => { setLocal(typo); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {!typo && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No typography defined yet.</p>
      ) : editing && local ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Heading Font</Label>
            <Input value={local.heading_font} onChange={(e) => setLocal({ ...local, heading_font: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Body Font</Label>
            <Input value={local.body_font} onChange={(e) => setLocal({ ...local, body_font: e.target.value })} className="h-8 text-sm" />
          </div>
        </div>
      ) : typo ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs bg-secondary/50 border-border/20">{typo.heading_font} (heading)</Badge>
          <Badge variant="secondary" className="text-xs bg-secondary/50 border-border/20">{typo.body_font} (body)</Badge>
          {typo.weights?.map((w, i) => (
            <Badge key={i} variant="outline" className="text-xs border-border/20 text-muted-foreground">{w}</Badge>
          ))}
        </div>
      ) : null}
    </SectionCard>
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
    <SectionCard
      icon={Mic2} title="Voice & Tone" iconColor="bg-emerald-500/10 text-emerald-400"
      editing={editing} onEdit={() => { setLocal(voice); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {!voice && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No voice profile defined yet.</p>
      ) : editing && local ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tone (comma-separated)</Label>
            <Input value={local.tone?.join(', ')} onChange={(e) => setLocal({ ...local, tone: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 text-sm" placeholder="bold, energetic, authentic" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Persona</Label>
            <Textarea value={local.persona} onChange={(e) => setLocal({ ...local, persona: e.target.value })} rows={2} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">What to Avoid (comma-separated)</Label>
            <Input value={local.avoid?.join(', ')} onChange={(e) => setLocal({ ...local, avoid: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 text-sm" />
          </div>
        </div>
      ) : voice ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {voice.tone?.map((t, i) => (
              <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">{t}</Badge>
            ))}
          </div>
          {voice.persona && <p className="text-sm text-muted-foreground/70 leading-relaxed">{voice.persona}</p>}
        </div>
      ) : null}
    </SectionCard>
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
    <SectionCard
      icon={Users} title="Audience" iconColor="bg-purple-500/10 text-purple-400"
      editing={editing} onEdit={() => { setLocal(audience); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {!audience && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No audience defined yet.</p>
      ) : editing && local ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Primary Audience</Label>
            <Input value={local.primary} onChange={(e) => setLocal({ ...local, primary: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Secondary Audience</Label>
            <Input value={local.secondary} onChange={(e) => setLocal({ ...local, secondary: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Psychographics</Label>
            <Textarea value={local.psychographics} onChange={(e) => setLocal({ ...local, psychographics: e.target.value })} rows={2} className="text-sm" />
          </div>
        </div>
      ) : audience ? (
        <div className="space-y-1.5">
          <p className="text-sm"><span className="text-muted-foreground/50 text-xs uppercase tracking-wider">Primary:</span> <span className="font-medium">{audience.primary}</span></p>
          <p className="text-sm"><span className="text-muted-foreground/50 text-xs uppercase tracking-wider">Secondary:</span> <span className="font-medium">{audience.secondary}</span></p>
          {audience.psychographics && <p className="text-sm text-muted-foreground/60 leading-relaxed mt-2">{audience.psychographics}</p>}
        </div>
      ) : null}
    </SectionCard>
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
    <SectionCard
      icon={Eye} title="Visual Style" iconColor="bg-cyan-500/10 text-cyan-400"
      editing={editing} onEdit={() => { setLocal(style); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {!style && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No visual style defined yet.</p>
      ) : editing && local ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Photography Tone</Label>
            <Input value={local.photography_tone} onChange={(e) => setLocal({ ...local, photography_tone: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subjects (comma-separated)</Label>
            <Input value={local.subjects?.join(', ')} onChange={(e) => setLocal({ ...local, subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Composition</Label>
            <Input value={local.composition} onChange={(e) => setLocal({ ...local, composition: e.target.value })} className="h-8 text-sm" />
          </div>
        </div>
      ) : style ? (
        <div className="space-y-1.5">
          <p className="text-sm"><span className="text-muted-foreground/50 text-xs uppercase tracking-wider">Tone:</span> <span className="font-medium">{style.photography_tone}</span></p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {style.subjects?.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs border-border/20 text-muted-foreground">{s}</Badge>
            ))}
          </div>
          {style.composition && <p className="text-sm text-muted-foreground/60 mt-1">{style.composition}</p>}
        </div>
      ) : null}
    </SectionCard>
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
    <SectionCard
      icon={Music2} title="Music Preferences" iconColor="bg-rose-500/10 text-rose-400"
      editing={editing} onEdit={() => { setLocal(music); setEditing(true) }}
      onSave={handleSave} isSaving={isSaving}
    >
      {!music && !editing ? (
        <p className="text-sm text-muted-foreground/60 italic">No music preferences defined yet.</p>
      ) : editing && local ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Genres (comma-separated)</Label>
            <Input value={local.genres?.join(', ')} onChange={(e) => setLocal({ ...local, genres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Moods (comma-separated)</Label>
            <Input value={local.moods?.join(', ')} onChange={(e) => setLocal({ ...local, moods: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min BPM</Label>
              <Input type="number" value={local.bpm_range?.min ?? 80} onChange={(e) => setLocal({ ...local, bpm_range: { ...local.bpm_range, min: Number(e.target.value) } })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max BPM</Label>
              <Input type="number" value={local.bpm_range?.max ?? 140} onChange={(e) => setLocal({ ...local, bpm_range: { ...local.bpm_range, max: Number(e.target.value) } })} className="h-8 text-sm" />
            </div>
          </div>
        </div>
      ) : music ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {music.genres?.map((g, i) => (
              <Badge key={i} className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs">{g}</Badge>
            ))}
            {music.moods?.map((m, i) => (
              <Badge key={`m-${i}`} variant="outline" className="text-xs border-border/20 text-muted-foreground">{m}</Badge>
            ))}
          </div>
          {music.bpm_range && (
            <p className="text-xs text-muted-foreground/50">{music.bpm_range.min}–{music.bpm_range.max} BPM</p>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
