'use client'

import { Sparkles } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { SPACE_FX_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function SpaceFxPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Space & FX
        </h3>
        {settings.spaceFx.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.spaceFx.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={SPACE_FX_TAGS}
        selected={settings.spaceFx}
        onChange={(v) => updateSetting('spaceFx', v)}
        color="blue"
        grouped
        compact
      />
    </div>
  )
}
