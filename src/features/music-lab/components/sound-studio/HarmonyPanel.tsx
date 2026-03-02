'use client'

import { Music } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { HARMONY_COLOR_TAGS, getMusicalKeys } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

export function HarmonyPanel() {
  const { settings, updateSetting } = useSoundStudioStore()
  const keys = getMusicalKeys()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Harmony & Key
        </h3>
        {(settings.harmonyColor.length > 0 || settings.key) && (
          <span className="text-xs text-muted-foreground ml-auto">
            {settings.key || ''} {settings.harmonyColor.length > 0 ? `+${settings.harmonyColor.length}` : ''}
          </span>
        )}
      </div>

      {/* Key selector */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/70">Key</p>
        <select
          value={settings.key || ''}
          onChange={(e) => updateSetting('key', e.target.value || null)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="">No specific key</option>
          {keys.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Harmony tags */}
      <MultiSelectPills
        items={HARMONY_COLOR_TAGS}
        selected={settings.harmonyColor}
        onChange={(v) => updateSetting('harmonyColor', v)}
        color="cyan"
        compact
      />
    </div>
  )
}
