'use client'

import { useState } from 'react'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { cn } from '@/utils/utils'
import { Dices, List, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WildcardFieldPickerProps {
  onSelect: (wildcardName: string, mode: 'browse' | 'random', label: string) => void
  onCancel: () => void
}

export function WildcardFieldPicker({ onSelect, onCancel }: WildcardFieldPickerProps) {
  const { wildcards } = useWildCardStore()
  const [selectedWc, setSelectedWc] = useState<string | null>(null)
  const [mode, setMode] = useState<'browse' | 'random'>('browse')
  const [label, setLabel] = useState('')

  // Group wildcards by category
  const groups: Record<string, typeof wildcards> = {}
  for (const wc of wildcards) {
    const cat = wc.category || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(wc)
  }

  const selectedWildcard = wildcards.find(w => w.name === selectedWc)
  const entries = selectedWildcard
    ? selectedWildcard.content.split('\n').filter(l => l.trim().length > 0)
    : []

  if (selectedWc && selectedWildcard) {
    // Step 2: Configure the field
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-amber-400">
          Configure: _{selectedWildcard.name}_
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">Field Label</div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={selectedWildcard.name.replace(/_/g, ' ')}
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
          />
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">Default Mode</div>
          <div className="flex gap-1">
            <button
              onClick={() => setMode('browse')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all',
                mode === 'browse'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
              )}
            >
              <List className="w-3 h-3" /> Browse
            </button>
            <button
              onClick={() => setMode('random')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all',
                mode === 'random'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
              )}
            >
              <Dices className="w-3 h-3" /> Random
            </button>
          </div>
        </div>

        {/* Preview entries */}
        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">
            Sample entries ({entries.length} total)
          </div>
          <div className="max-h-[120px] overflow-y-auto space-y-0.5">
            {entries.slice(0, 5).map((entry, i) => (
              <div key={i} className="text-[11px] text-muted-foreground/80 truncate px-2 py-0.5 bg-card/50 rounded">
                {entry}
              </div>
            ))}
            {entries.length > 5 && (
              <div className="text-[10px] text-muted-foreground/40 px-2">
                ...and {entries.length - 5} more
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedWc(null)} className="text-xs">
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const fieldLabel = label.trim() || selectedWildcard.name.replace(/_/g, ' ')
              onSelect(selectedWildcard.name, mode, fieldLabel)
            }}
            className="text-xs bg-amber-600 hover:bg-amber-500"
          >
            Add Field
          </Button>
        </div>
      </div>
    )
  }

  // Step 1: Browse wildcards by category
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-amber-400">Select a Wildcard</div>
      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, wcs]) => (
            <div key={category}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 px-2 py-1">
                {category} ({wcs.length})
              </div>
              {wcs.sort((a, b) => a.name.localeCompare(b.name)).map(wc => {
                const count = wc.content.split('\n').filter(l => l.trim().length > 0).length
                return (
                  <button
                    key={wc.id}
                    onClick={() => {
                      setSelectedWc(wc.name)
                      setLabel(wc.name.replace(/_/g, ' '))
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs rounded hover:bg-card transition-colors"
                  >
                    <span className="font-mono text-amber-400">_{wc.name}_</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{count}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </button>
                )
              })}
            </div>
          ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
        Cancel
      </Button>
    </div>
  )
}
