'use client'

import { Disc3 } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { SYNTH_TEXTURE_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function SynthTexturePanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Disc3 className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Synth/Keys Texture
        </h3>
        {settings.synthTexture.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{settings.synthTexture.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={SYNTH_TEXTURE_TAGS}
        selected={settings.synthTexture}
        onChange={(v) => updateSetting('synthTexture', v)}
        color="purple"
        compact
      />
    </div>
  )
}
