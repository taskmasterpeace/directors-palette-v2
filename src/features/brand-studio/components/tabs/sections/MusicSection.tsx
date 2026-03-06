'use client'

import { useState } from 'react'
import { Music2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard, type SectionProps } from './SectionCard'

export function MusicSection({ brand, onSave, isSaving }: SectionProps) {
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
      number={6} icon={Music2} title="Music & Sound" iconColor="bg-rose-500/10 text-rose-400"
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
        <div className="space-y-3">
          {/* Genre + Mood badges */}
          <div className="flex flex-wrap gap-2">
            {music.genres?.map((g, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {g}
              </span>
            ))}
            {music.moods?.map((m, i) => (
              <span key={`m-${i}`} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 border border-border/20 text-muted-foreground/70">
                {m}
              </span>
            ))}
          </div>

          {/* BPM Range Bar */}
          {music.bpm_range && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mb-2">Tempo Range</p>
              <div className="relative h-6 rounded-full bg-secondary/30 border border-border/15 overflow-hidden">
                {/* Scale: 40-200 BPM */}
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-rose-500/20 via-rose-500/30 to-rose-500/20"
                  style={{
                    left: `${((music.bpm_range.min - 40) / 160) * 100}%`,
                    right: `${100 - ((music.bpm_range.max - 40) / 160) * 100}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-mono font-medium text-foreground/80">
                    {music.bpm_range.min} &ndash; {music.bpm_range.max} BPM
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
