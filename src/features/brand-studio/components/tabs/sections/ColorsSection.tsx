'use client'

import { useState } from 'react'
import { Palette, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SectionCard, type SectionProps } from './SectionCard'
import type { BrandColor } from '../../../types'

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return ''
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

const roleOrder = ['primary', 'secondary', 'accent', 'background', 'text'] as const

export function ColorsSection({ brand, onSave, isSaving }: SectionProps) {
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

  // Group by role
  const grouped = roleOrder.reduce<Record<string, BrandColor[]>>((acc, role) => {
    const matching = colors.filter(c => c.role === role)
    if (matching.length > 0) acc[role] = matching
    return acc
  }, {})
  // Any ungrouped
  const ungrouped = colors.filter(c => !roleOrder.includes(c.role as typeof roleOrder[number]))
  if (ungrouped.length > 0) grouped['other'] = ungrouped

  return (
    <SectionCard
      number={1} icon={Palette} title="Color Palette" iconColor="bg-amber-500/10 text-amber-400"
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
        <div className="space-y-4">
          {Object.entries(grouped).map(([role, roleColors]) => (
            <div key={role}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-2 font-medium">
                {role}
              </p>
              <div className="flex flex-wrap gap-3">
                {roleColors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-[72px] h-[72px] rounded-xl border border-white/10 shadow-md shadow-black/10 ring-1 ring-inset ring-white/5"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] truncate">{c.name}</span>
                    <code className="text-[9px] text-muted-foreground/50 font-mono uppercase">{c.hex}</code>
                    <span className="text-[8px] text-muted-foreground/30 font-mono">
                      {hexToRgb(c.hex)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
