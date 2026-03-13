'use client'

import { useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS, PRODUCT_CATEGORIES, type ProductCategory } from '../constants/products'
import { cn } from '@/utils/utils'
import { Shirt, Image, Frame, Puzzle, Coffee, Sticker, Backpack } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Image, Frame, Puzzle, Coffee, Sticker, Backpack,
}

function isAOP(name: string) {
  return name.startsWith('AOP')
}

export function ProductPicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const setProduct = useMerchLabStore((s) => s.setProduct)
  const [activeTab, setActiveTab] = useState<ProductCategory>('apparel')

  const filteredProducts = MERCH_PRODUCTS.filter((p) => p.category === activeTab)

  return (
    <div className="border-b border-border/30 p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        1. Pick a Product
      </div>

      <div className="mb-3 flex gap-1">
        {PRODUCT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all',
              activeTab === cat.id
                ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                : 'border-border/30 text-muted-foreground/40 hover:border-amber-500/30 hover:text-muted-foreground/70'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filteredProducts.map((product) => {
          const Icon = ICON_MAP[product.icon] ?? Shirt
          return (
            <button
              key={product.blueprintId}
              onClick={() => setProduct(product.blueprintId)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-[10px] border-2 p-2.5 transition-all hover:bg-card/60',
                selectedProductId === product.blueprintId
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-transparent bg-card/30 hover:border-border/40'
              )}
            >
              <Icon className={cn('h-6 w-6', selectedProductId === product.blueprintId ? 'text-amber-400' : 'text-muted-foreground/60')} />
              <span className={cn('text-[11px] font-medium', selectedProductId === product.blueprintId ? 'text-amber-300' : 'text-muted-foreground/60')}>{product.name}</span>
              {isAOP(product.name) && (
                <span className="absolute right-1 top-1 rounded-sm bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-400">
                  AOP
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
