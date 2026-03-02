'use client'

import { Zap } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { energyToLabel } from '@/features/music-lab/types/sound-studio.types'

const ENERGY_PRESETS = [20, 40, 60, 80, 100]

export function EnergySlider() {
  const { settings, updateSetting } = useSoundStudioStore()
  const energy = settings.energy

  const handleSliderChange = (values: number[]) => {
    updateSetting('energy', values[0])
  }

  // Color based on energy level
  const energyColor =
    energy <= 20
      ? 'text-blue-400'
      : energy <= 40
        ? 'text-cyan-400'
        : energy <= 60
          ? 'text-amber-400'
          : energy <= 80
            ? 'text-orange-400'
            : 'text-red-400'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Energy
        </h3>
        <div className="ml-auto flex items-baseline gap-1.5">
          <span className={`text-lg font-bold tabular-nums tracking-tight ${energyColor}`}>
            {energy}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {energyToLabel(energy)}
          </span>
        </div>
      </div>

      {/* Slider with gradient track */}
      <div className="px-1">
        <Slider
          value={[energy]}
          onValueChange={handleSliderChange}
          min={0}
          max={100}
          step={1}
          className="w-full [&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-400 [&_[role=slider]]:shadow-[0_0_8px_oklch(0.6_0.2_55/0.3)] [&_[data-orientation=horizontal]>[data-role=range]]:bg-gradient-to-r [&_[data-orientation=horizontal]>[data-role=range]]:from-blue-500/60 [&_[data-orientation=horizontal]>[data-role=range]]:via-amber-500/60 [&_[data-orientation=horizontal]>[data-role=range]]:to-red-500/60"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-blue-400/60">Calm</span>
          <span className="text-[10px] text-muted-foreground/60">Medium</span>
          <span className="text-[10px] text-red-400/60">Intense</span>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {ENERGY_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => updateSetting('energy', preset)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              energy === preset
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : 'bg-muted/20 text-muted-foreground border border-border hover:border-border hover:text-foreground'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
