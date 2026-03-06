'use client'

import { useState } from 'react'
import { Type } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SectionCard, type SectionProps } from './SectionCard'

function parseHeadingSizes(str: string): { label: string; size: string }[] {
  if (!str) return []
  return str.split(',').map(part => {
    const [label, size] = part.split(':').map(s => s.trim())
    return { label: label || '', size: size || '' }
  }).filter(p => p.label && p.size)
}

export function TypographySection({ brand, onSave, isSaving }: SectionProps) {
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

  const sizes = parseHeadingSizes(typo?.heading_sizes || '')

  return (
    <SectionCard
      number={2} icon={Type} title="Typography" iconColor="bg-blue-500/10 text-blue-400"
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
        <div className="space-y-4">
          {/* Font family display */}
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Heading</p>
              <p className="text-lg font-bold tracking-tight">{typo.heading_font}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Body</p>
              <p className="text-lg font-medium">{typo.body_font}</p>
            </div>
          </div>

          {/* Weight badges */}
          {typo.weights?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {typo.weights.map((w, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-border/25 text-muted-foreground/60 font-mono">{w}</Badge>
              ))}
            </div>
          )}

          {/* Visual hierarchy */}
          {sizes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/15">
              {sizes.map((s, i) => {
                const ptMatch = s.size.match(/(\d+)/)
                const pt = ptMatch ? parseInt(ptMatch[1]) : 14
                const scale = Math.max(0.75, Math.min(2.2, pt / 16))
                return (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30 w-10 shrink-0 font-mono">{s.label}</span>
                    <span
                      className="font-semibold truncate"
                      style={{ fontSize: `${scale}rem`, lineHeight: 1.2 }}
                    >
                      {typo.heading_font || 'Sample Text'}
                    </span>
                    <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0">{s.size}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
