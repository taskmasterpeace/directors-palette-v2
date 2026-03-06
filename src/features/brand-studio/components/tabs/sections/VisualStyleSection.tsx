'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard, type SectionProps } from './SectionCard'

export function VisualStyleSection({ brand, onSave, isSaving }: SectionProps) {
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
      number={5} icon={Eye} title="Visual Style" iconColor="bg-cyan-500/10 text-cyan-400"
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
        <div className="space-y-3">
          {/* Photography tone quote */}
          {style.photography_tone && (
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/50 mb-2">Photography Tone</p>
              <p className="text-sm font-medium leading-relaxed">{style.photography_tone}</p>
            </div>
          )}

          {/* Two-column: subjects | composition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mb-2">Subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {style.subjects?.map((s, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-secondary/50 border border-border/20 text-muted-foreground/80">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {style.composition && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mb-2">Composition</p>
                <p className="text-sm text-muted-foreground/60 leading-relaxed">{style.composition}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}
