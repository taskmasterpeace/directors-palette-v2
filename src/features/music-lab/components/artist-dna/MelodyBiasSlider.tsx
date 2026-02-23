'use client'

import { useMemo } from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface MelodyBiasSliderProps {
  value: number
  onChange: (value: number) => void
}

const ZONES = [
  { label: 'Spoken', max: 20, color: '#3b82f6', desc: 'Spoken word delivery, aggressive bars, monotone flow' },
  { label: 'Rap+', max: 40, color: '#5a94f0', desc: 'Primarily rapping with occasional melodic hooks' },
  { label: 'Balanced', max: 60, color: '#9b8ed8', desc: 'Seamless blend of rapping and singing' },
  { label: 'Melodic+', max: 80, color: '#d99548', desc: 'Primarily sung with rap verses or spoken bridges' },
  { label: 'Sung', max: 100, color: '#f59e0b', desc: 'Pure vocal performance, no rapping' },
]

function getZoneIndex(value: number): number {
  if (value <= 20) return 0
  if (value <= 40) return 1
  if (value <= 60) return 2
  if (value <= 80) return 3
  return 4
}

export function MelodyBiasSlider({ value, onChange }: MelodyBiasSliderProps) {
  const zoneIdx = useMemo(() => getZoneIndex(value), [value])
  const zone = ZONES[zoneIdx]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Melody Bias</Label>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ color: zone.color, backgroundColor: `${zone.color}18` }}
          >
            {zone.label}
          </span>
          <span className="text-sm tabular-nums text-muted-foreground">{value}%</span>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        aria-label="Melody bias"
      />

      {/* Spectrum bar with zone segments */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {ZONES.map((z, i) => (
          <div
            key={z.label}
            className="flex-1 transition-opacity duration-200"
            style={{
              backgroundColor: z.color,
              opacity: i === zoneIdx ? 1 : 0.25,
            }}
          />
        ))}
      </div>

      {/* Zone labels */}
      <div className="flex">
        {ZONES.map((z, i) => (
          <span
            key={z.label}
            className="flex-1 text-center text-[10px] font-medium transition-all duration-200"
            style={{
              color: i === zoneIdx ? z.color : 'var(--muted-foreground)',
              opacity: i === zoneIdx ? 1 : 0.5,
            }}
          >
            {z.label}
          </span>
        ))}
      </div>

      {/* Zone description */}
      <p
        className="text-xs transition-colors duration-200 text-center"
        style={{ color: zone.color }}
      >
        {zone.desc}
      </p>
    </div>
  )
}
