'use client'

import { LayoutList } from 'lucide-react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { STRUCTURE_PRESETS } from '@/features/music-lab/data/production-tags.data'

export function StructurePanel() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LayoutList className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Structure
        </h3>
        {settings.structure && (
          <button
            onClick={() => updateSetting('structure', null)}
            className="text-[10px] text-[oklch(0.50_0.04_55)] ml-auto hover:text-amber-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STRUCTURE_PRESETS.map((preset) => {
          const isActive = settings.structure === preset.value
          return (
            <button
              key={preset.id}
              onClick={() => updateSetting('structure', isActive ? null : preset.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_oklch(0.6_0.2_55/0.15)]'
                  : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-amber-500/40 hover:text-amber-300'
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
