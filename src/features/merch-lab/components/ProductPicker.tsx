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
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                : 'border-border/30 text-muted-foreground/60 hover:border-cyan-500/30'
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
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-transparent bg-card/30'
              )}
            >
              <Icon className="h-6 w-6 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">{product.name}</span>
              {isAOP(product.name) && (
                <span className="absolute right-1 top-1 rounded-sm bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold text-cyan-400">
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
