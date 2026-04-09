'use client'

import { Waves } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { MOTION_ENVELOPE_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function MotionEnvelopePanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Waves className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Motion & Envelope
        </h3>
        {settings.motionEnvelope.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {settings.motionEnvelope.length}
          </span>
        )}
      </div>
      <MultiSelectPills
        items={MOTION_ENVELOPE_TAGS}
        selected={settings.motionEnvelope}
        onChange={(v) => updateSetting('motionEnvelope', v)}
        color="amber"
        grouped
        compact
      />
    </div>
  )
}
