'use client'

import { cn } from '@/utils/utils'
import { Maximize2, Minimize2 } from 'lucide-react'

interface SizeSelectorProps {
  value: 5 | 10
  onChange: (size: 5 | 10) => void
}

const sizes = [
  { value: 5 as const, label: '5cm Mini', subtitle: '~2 inches', icon: Minimize2, desc: 'Desktop collectible' },
  { value: 10 as const, label: '10cm Standard', subtitle: '~4 inches', icon: Maximize2, desc: 'Shelf display piece' },
]

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Size
      </span>
      <div className="grid grid-cols-2 gap-3">
        {sizes.map((size) => (
          <button
            key={size.value}
            onClick={() => onChange(size.value)}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all text-left group',
              'hover:scale-[1.02]',
              value === size.value
                ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                : 'border-border/40 bg-card/30 hover:border-border/60',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                value === size.value
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-border/20 text-muted-foreground/50',
              )}>
                <size.icon className="w-5 h-5" />
              </div>
              <div>
                <p className={cn(
                  'text-sm font-semibold',
                  value === size.value ? 'text-cyan-400' : 'text-foreground/80',
                )}>
                  {size.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{size.subtitle}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{size.desc}</p>
              </div>
            </div>
            {value === size.value && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
