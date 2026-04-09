'use client'

import { Film } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { SAMPLE_CHARACTER_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function SampleCharacterPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Film className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Sample Character
        </h3>
        {settings.sampleCharacter.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {settings.sampleCharacter.length}
          </span>
        )}
      </div>
      <MultiSelectPills
        items={SAMPLE_CHARACTER_TAGS}
        selected={settings.sampleCharacter}
        onChange={(v) => updateSetting('sampleCharacter', v)}
        color="rose"
        grouped
        compact
      />
    </div>
  )
}
