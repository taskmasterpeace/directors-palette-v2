'use client'

import { Drum } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { DRUM_DESIGN_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'
import { useArtistFit } from '../../hooks/useArtistFit'

export function DrumDesignPanel() {
  const { settings, updateSetting } = useSoundStudioStore()
  const { drumDesign: artistPicks } = useArtistFit()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Drum className="w-4 h-4 text-amber-400" />
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
        color="amber"
        grouped
        compact
        artistPicks={artistPicks}
      />
    </div>
  )
}
