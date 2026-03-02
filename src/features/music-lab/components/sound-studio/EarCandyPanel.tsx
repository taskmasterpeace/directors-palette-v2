'use client'

import { Candy } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { EAR_CANDY_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function EarCandyPanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Candy className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Ear Candy
        </h3>
        {settings.earCandy.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.earCandy.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={EAR_CANDY_TAGS}
        selected={settings.earCandy}
        onChange={(v) => updateSetting('earCandy', v)}
        color="pink"
        compact
      />
    </div>
  )
}
