'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard, type SectionProps } from './SectionCard'

export function AudienceSection({ brand, onSave, isSaving }: SectionProps) {
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
      icon={Users} title="Audience" iconColor="bg-cyan-500/10 text-cyan-400"
      editing={editing} onEdit={() => { setLocal(audience); setEditing(true) }}
      onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isSaving}
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
        <div className="space-y-3">
          {/* Two-column cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/50 mb-1">Primary</p>
              <p className="text-sm font-medium leading-relaxed">{audience.primary}</p>
            </div>
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/50 mb-1">Secondary</p>
              <p className="text-sm font-medium leading-relaxed">{audience.secondary}</p>
            </div>
          </div>

          {/* Psychographics */}
          {audience.psychographics && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mb-1.5">Psychographics</p>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">{audience.psychographics}</p>
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
