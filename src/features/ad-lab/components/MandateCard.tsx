'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/utils'
import { AlertTriangle, Check, X, Pencil } from 'lucide-react'
import { useAdLabStore } from '../store/ad-lab.store'
import type { CreativeMandate } from '../types/ad-lab.types'

interface EditableFieldProps {
  label: string
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  highlight?: 'amber' | 'red' | null
}

function EditableField({ label, value, onSave, multiline, highlight }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      highlight === 'amber' && 'border-amber-500/30 bg-amber-500/5',
      highlight === 'red' && 'border-red-500/30 bg-red-500/5',
      !highlight && 'border-border/50 bg-card/30'
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-1">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full p-2 rounded border border-border bg-background text-sm resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full p-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="p-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  )
}

export function MandateCard() {
  const { mandate, setMandate } = useAdLabStore()
  if (!mandate) return null

  const hasPainPoint = mandate.primaryPainPoint && mandate.primaryPainPoint.trim().length > 0
  const painPointHighlight = hasPainPoint ? 'amber' : 'red'

  const updateField = <K extends keyof CreativeMandate>(key: K, value: CreativeMandate[K]) => {
    setMandate({ ...mandate, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
        <h3 className="text-lg font-semibold">Creative Mandate</h3>
      </div>

      {!hasPainPoint && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>No pain point detected — this is critical for effective ad copy. Please add one.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <EditableField
          label="Audience Demographics"
          value={mandate.audienceDemographics}
          onSave={(v) => updateField('audienceDemographics', v)}
          multiline
        />
        <EditableField
          label="Primary Pain Point"
          value={mandate.primaryPainPoint}
          onSave={(v) => updateField('primaryPainPoint', v)}
          multiline
          highlight={painPointHighlight}
        />
        <EditableField
          label="Brand Voice"
          value={mandate.brandVoice}
          onSave={(v) => updateField('brandVoice', v)}
        />
        <div className={cn('p-3 rounded-lg border border-border/50 bg-card/30')}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forbidden Words</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mandate.forbiddenWords.length > 0 ? (
              mandate.forbiddenWords.map((word, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                  {word}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None specified</span>
            )}
          </div>
        </div>
      </div>

      {/* Duration Strategy */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration Strategy</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['5s', '15s', '30s'] as const).map((dur) => (
            <EditableField
              key={dur}
              label={dur}
              value={mandate.durationStrategy[dur]}
              onSave={(v) => updateField('durationStrategy', { ...mandate.durationStrategy, [dur]: v })}
              multiline
            />
          ))}
        </div>
      </div>

      {/* Platform Constraints */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform Constraints</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(['16:9', '9:16'] as const).map((ratio) => (
            <EditableField
              key={ratio}
              label={ratio}
              value={mandate.platformConstraints[ratio]}
              onSave={(v) => updateField('platformConstraints', { ...mandate.platformConstraints, [ratio]: v })}
              multiline
            />
          ))}
        </div>
      </div>
    </div>
  )
}
