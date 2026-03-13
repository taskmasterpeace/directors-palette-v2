'use client'

import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { cn } from '@/utils/utils'
import type { DesignStyle } from '../types'

const STYLE_META: Record<DesignStyle, { label: string; description: string }> = {
  'center': { label: 'Center Graphic', description: 'Logo or illustration centered' },
  'all-over': { label: 'All-Over Print', description: 'Full coverage pattern' },
  'left-chest': { label: 'Left Chest', description: 'Small logo, pocket area' },
  'back': { label: 'Back Print', description: 'Large graphic on back' },
  'wrap': { label: 'Wrap', description: 'Design wraps around surface' },
  'full-bleed': { label: 'Full Bleed', description: 'Edge-to-edge coverage' },
}

export function DesignStylePicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const designStyle = useMerchLabStore((s) => s.designStyle)
  const setDesignStyle = useMerchLabStore((s) => s.setDesignStyle)

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const availableStyles = product?.designStyles ?? ['center']

  if (availableStyles.length <= 1) {
    return null
  }

  return (
    <div className="border-b border-border/30 p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        3. Design Style
      </div>
      <div className="grid grid-cols-2 gap-2">
        {availableStyles.map((style) => {
          const meta = STYLE_META[style]
          return (
            <button
              key={style}
              onClick={() => setDesignStyle(style)}
              className={cn(
                'rounded-[10px] border-2 p-3 text-left transition-all hover:bg-card/60',
                designStyle === style
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-transparent bg-card/30'
              )}
            >
              <div className="text-xs font-semibold">{meta.label}</div>
              <div className="text-[10px] text-muted-foreground/50">{meta.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
