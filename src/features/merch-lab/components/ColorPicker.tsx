'use client'

import { useMemo } from 'react'
import { useMerchLabStore } from '../hooks'
import { cn } from '@/utils/utils'

const NO_COLOR_PRODUCTS = [282, 937, 532, 400, 413]

export function ColorPicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const variants = useMerchLabStore((s) => s.variants)
  const isLoadingCatalog = useMerchLabStore((s) => s.isLoadingCatalog)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const setColor = useMerchLabStore((s) => s.setColor)

  const colors = useMemo(() => {
    const seen = new Set<string>()
    return variants.filter((v) => {
      if (seen.has(v.color)) return false
      seen.add(v.color)
      return true
    }).map((v) => ({ name: v.color, hex: v.colorHex }))
  }, [variants])

  if (NO_COLOR_PRODUCTS.includes(selectedProductId ?? 0)) {
    return null
  }

  return (
    <div className="border-b border-border/30 p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        2. Product Color
      </div>
      {isLoadingCatalog ? (
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-full bg-card/50" />
          ))}
        </div>
      ) : colors.length === 0 ? (
        <p className="text-xs text-muted-foreground/50">Select a product to see colors</p>
      ) : (
        <>
          <div className="max-h-[180px] overflow-y-auto rounded-lg pr-1">
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={() => setColor(c.name, c.hex)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all hover:scale-110',
                    selectedColor === c.name
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-border/30',
                    c.name === 'White' && 'border-border/50'
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          {selectedColor && (
            <div className="mt-2 text-[11px] text-muted-foreground/70">
              Selected: <span className="font-medium text-foreground/80">{selectedColor}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
