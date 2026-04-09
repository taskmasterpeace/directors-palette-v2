'use client'

import { LayoutList } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { STRUCTURE_PRESETS } from '@/features/music-lab/data/production-tags.data'

export function StructurePanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <LayoutList className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Structure
        </h3>
        {settings.structure && (
          <button
            onClick={() => updateSetting('structure', null)}
            className="text-[10px] text-muted-foreground ml-auto hover:text-emerald-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {STRUCTURE_PRESETS.map((preset) => {
          const isActive = settings.structure === preset.value
          return (
            <button
              key={preset.id}
              onClick={() => updateSetting('structure', isActive ? null : preset.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border hover:scale-[1.03] ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_oklch(0.55_0.15_155/0.2)]'
                  : 'bg-muted/20 text-foreground/80 border-border hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
