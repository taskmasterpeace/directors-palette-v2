'use client'

import { Drum } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { DRUM_DESIGN_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function DrumDesignPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Drum className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Drum Design
        </h3>
        {settings.drumDesign.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.drumDesign.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={DRUM_DESIGN_TAGS}
        selected={settings.drumDesign}
        onChange={(v) => updateSetting('drumDesign', v)}
        color="rose"
        grouped
        compact
      />
    </div>
  )
}
