'use client'

import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { cn } from '@/utils/utils'

export function ProductPicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const setProduct = useMerchLabStore((s) => s.setProduct)

  return (
    <div className="border-b border-border/30 p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        1. Pick a Product
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MERCH_PRODUCTS.map((product) => (
          <button
            key={product.blueprintId}
            onClick={() => setProduct(product.blueprintId)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-[10px] border-2 p-2.5 transition-all hover:bg-card/60',
              selectedProductId === product.blueprintId
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-transparent bg-card/30'
            )}
          >
            <span className="text-2xl">{product.icon}</span>
            <span className="text-[11px] font-medium text-muted-foreground">{product.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
