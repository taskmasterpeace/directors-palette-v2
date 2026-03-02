'use client'

import { Waves } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { GROOVE_FEEL_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function GrooveFeelPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Waves className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Groove Feel
        </h3>
        {settings.grooveFeel.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.grooveFeel.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={GROOVE_FEEL_TAGS}
        selected={settings.grooveFeel}
        onChange={(v) => updateSetting('grooveFeel', v)}
        color="emerald"
        compact
      />
    </div>
  )
}
