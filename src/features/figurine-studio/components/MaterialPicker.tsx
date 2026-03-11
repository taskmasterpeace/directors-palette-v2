'use client'

import { cn } from '@/utils/utils'
import { Star, Paintbrush } from 'lucide-react'

export interface MaterialOption {
  materialId: number
  materialName: string
  ourPricePts: number
  shapewaysPrice: number
}

interface MaterialPickerProps {
  materials: MaterialOption[]
  selectedId: number | null
  onChange: (materialId: number) => void
}

const MATERIAL_META: Record<number, {
  color: string
  gradient: string
  badge?: string
  desc: string
}> = {
  317: {
    color: '#f5f5f5',
    gradient: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #cccccc 100%)',
    desc: 'Affordable FDM print, great for prototypes',
  },
  6: {
    color: '#fafafa',
    gradient: 'linear-gradient(135deg, #fafafa 0%, #eeeeee 50%, #e0e0e0 100%)',
    desc: 'Strong SLS nylon, professional quality',
  },
  25: {
    color: '#2a2a2a',
    gradient: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 50%, #1a1a1a 100%)',
    desc: 'Dyed nylon, sleek dark finish',
  },
  231: {
    color: '#e8d5b7',
    gradient: 'linear-gradient(135deg, #e8d5b7 0%, #d4c4a8 30%, #c9b896 60%, #bfad85 100%)',
    badge: 'Full Color',
    desc: 'Full texture printing, the showpiece',
  },
  232: {
    color: '#f0e6d3',
    gradient: 'linear-gradient(135deg, #f0e6d3 0%, #e8dcc8 30%, #dfd2bc 60%, #d6c8b0 100%)',
    badge: 'Premium',
    desc: 'Smooth finish with full color texture',
  },
}

export function MaterialPicker({ materials, selectedId, onChange }: MaterialPickerProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Material
      </span>
      <div className="grid grid-cols-1 gap-2">
        {materials.map((mat) => {
          const meta = MATERIAL_META[mat.materialId]
          const isSelected = selectedId === mat.materialId
          return (
            <button
              key={mat.materialId}
              onClick={() => onChange(mat.materialId)}
              className={cn(
                'relative p-3 rounded-xl border-2 transition-all text-left group',
                'hover:scale-[1.01]',
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                  : 'border-border/40 bg-card/30 hover:border-border/60',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-border/20 shrink-0"
                  style={{ background: meta?.gradient || '#666' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'text-sm font-semibold truncate',
                      isSelected ? 'text-cyan-400' : 'text-foreground/80',
                    )}>
                      {mat.materialName}
                    </p>
                    {meta?.badge && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-wider shrink-0">
                        {meta.badge === 'Full Color' ? <Paintbrush className="w-2.5 h-2.5" /> : <Star className="w-2.5 h-2.5" />}
                        {meta.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate">{meta?.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    isSelected ? 'text-cyan-400' : 'text-foreground/70',
                  )}>
                    {mat.ourPricePts.toLocaleString()} pts
                  </p>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
