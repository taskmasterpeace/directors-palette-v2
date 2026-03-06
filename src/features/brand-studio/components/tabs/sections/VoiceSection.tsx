'use client'

import { useState } from 'react'
import { Mic2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard, type SectionProps } from './SectionCard'

export function VoiceSection({ brand, onSave, isSaving }: SectionProps) {
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
      number={3} icon={Mic2} title="Voice & Tone" iconColor="bg-emerald-500/10 text-emerald-400"
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
        <div className="space-y-3">
          {/* Tone pills */}
          <div className="flex flex-wrap gap-2">
            {voice.tone?.map((t, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {t}
              </span>
            ))}
          </div>

          {/* Persona quote block */}
          {voice.persona && (
            <div className="relative pl-4 border-l-2 border-emerald-500/30">
              <p className="text-sm text-muted-foreground/70 leading-relaxed italic">
                &ldquo;{voice.persona}&rdquo;
              </p>
            </div>
          )}

          {/* Avoid list */}
          {voice.avoid?.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mb-1.5">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {voice.avoid.map((a, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-red-500/8 text-red-400/70 border border-red-500/15">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
