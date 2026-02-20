'use client'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface MelodyBiasSliderProps {
  value: number
  onChange: (value: number) => void
}

export function MelodyBiasSlider({ value, onChange }: MelodyBiasSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Melody Bias</Label>
        <span className="text-sm text-muted-foreground">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        aria-label="Melody bias"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Pure Rap</span>
        <span>Pure Singing</span>
      </div>
    </div>
  )
}
