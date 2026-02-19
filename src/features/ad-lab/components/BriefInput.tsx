'use client'

import React from 'react'
import { cn } from '@/utils/utils'
import { useAdLabStore } from '../store/ad-lab.store'
import type { BriefInputMode } from '../types/ad-lab.types'

const TABS: { id: BriefInputMode; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'json', label: 'Brand JSON' },
]

export function BriefInput() {
  const { briefText, briefInputMode, setBriefText, setBriefInputMode } = useAdLabStore()

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setBriefInputMode(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              briefInputMode === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder={
          briefInputMode === 'text'
            ? 'Paste your creative brief here...\n\nInclude details about the product/service, target audience, brand voice, competitive landscape, and campaign goals.'
            : '{\n  "brand": "...",\n  "product": "...",\n  "audience": "...",\n  "tone": "...",\n  "goals": "..."\n}'
        }
        className={cn(
          'w-full min-h-[240px] p-4 rounded-lg border border-border bg-card/50 text-sm',
          'resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          'placeholder:text-muted-foreground/50',
          briefInputMode === 'json' && 'font-mono text-xs'
        )}
      />
      <p className="text-xs text-muted-foreground">
        {briefText.length > 0 ? `${briefText.length} characters` : 'Paste a creative brief or brand JSON to get started'}
      </p>
    </div>
  )
}
