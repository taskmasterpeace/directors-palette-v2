'use client'

import { AudioLines } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { BASS_STYLE_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function BassStylePanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AudioLines className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Bass & Low-End
        </h3>
        {settings.bassStyle.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.bassStyle.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={BASS_STYLE_TAGS}
        selected={settings.bassStyle}
        onChange={(v) => updateSetting('bassStyle', v)}
        color="orange"
        compact
      />
    </div>
  )
}
