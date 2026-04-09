'use client'

import { Clock } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { ERA_TAGS } from '@/features/music-lab/data/production-tags.data'

/**
 * Single-select era picker. Mix of plain decades and flavored era descriptors
 * (e.g. "80s horror movie", "90s boom-bap"). Writes to settings.era as a
 * plain string so the Suno prompt builder picks it up.
 */
export function EraPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  const toggle = (label: string) => {
    updateSetting('era', settings.era === label ? null : label)
  }

  // Group by the ProductionTag.group field
  const groups = ERA_TAGS.reduce<Record<string, typeof ERA_TAGS>>((acc, tag) => {
    const g = tag.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(tag)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Era
        </h3>
        {settings.era && (
          <span className="text-xs text-muted-foreground ml-auto truncate max-w-[180px]">
            {settings.era}
          </span>
        )}
      </div>

      {Object.entries(groups).map(([group, tags]) => (
        <div key={group} className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400/70">
            {group}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = settings.era === tag.label
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.label)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all hover:scale-[1.03] ${
                    active
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_oklch(0.55_0.15_15/0.2)]'
                      : 'bg-muted/20 text-foreground/80 border-border hover:border-rose-500/40 hover:text-rose-300'
                  }`}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
