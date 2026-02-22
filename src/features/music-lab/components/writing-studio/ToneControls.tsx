'use client'

import { Slider } from '@/components/ui/slider'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { EMOTIONS, DELIVERIES, ENERGY_ZONES } from '../../types/writing-studio.types'

export function ToneControls() {
  const { sections, activeSectionId, updateSectionTone } = useWritingStudioStore()
  const section = sections.find((s) => s.id === activeSectionId)

  if (!section) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Select a section to configure tone
      </div>
    )
  }

  const energyZone = ENERGY_ZONES.find(
    (z) => section.tone.energy >= z.min && section.tone.energy <= z.max
  )

  return (
    <div className="space-y-4">
      {/* Emotion chips */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Emotion</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              onClick={() => updateSectionTone(section.id, { emotion })}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                section.tone.emotion === emotion
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Energy slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Energy</label>
          <span className="text-xs text-amber-400">{energyZone?.label} ({section.tone.energy})</span>
        </div>
        <Slider
          value={[section.tone.energy]}
          onValueChange={([value]) => updateSectionTone(section.id, { energy: value })}
          min={0}
          max={100}
          step={1}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">Chill</span>
          <span className="text-[10px] text-muted-foreground">Explosive</span>
        </div>
      </div>

      {/* Delivery chips */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Delivery</label>
        <div className="flex flex-wrap gap-1.5">
          {DELIVERIES.map((delivery) => (
            <button
              key={delivery}
              onClick={() => updateSectionTone(section.id, { delivery })}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                section.tone.delivery === delivery
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {delivery}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
