'use client'

import { useMemo, useEffect } from 'react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS, MAX_QUANTITY } from '../constants/products'
import { cn } from '@/utils/utils'
import { Minus, Plus, ShoppingCart } from 'lucide-react'

const NO_COLOR_PRODUCTS = [282, 937, 532, 400, 413]

function OrderRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/20 py-3 text-sm">
      <span className="text-muted-foreground/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function OrderPanel() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const selectedColorHex = useMerchLabStore((s) => s.selectedColorHex)
  const designStyle = useMerchLabStore((s) => s.designStyle)
  const variants = useMerchLabStore((s) => s.variants)
  const selectedSize = useMerchLabStore((s) => s.selectedSize)
  const setSize = useMerchLabStore((s) => s.setSize)
  const setColor = useMerchLabStore((s) => s.setColor)
  const quantity = useMerchLabStore((s) => s.quantity)
  const setQuantity = useMerchLabStore((s) => s.setQuantity)
  const pricePts = useMerchLabStore((s) => s.pricePts)
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const setOrderModalOpen = useMerchLabStore((s) => s.setOrderModalOpen)

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const isNoColorProduct = NO_COLOR_PRODUCTS.includes(selectedProductId ?? 0)

  // Auto-select first variant for no-color products
  useEffect(() => {
    if (isNoColorProduct && variants.length > 0 && !selectedColor) {
      const first = variants[0]
      setColor(first.color, first.colorHex)
    }
  }, [isNoColorProduct, variants, selectedColor, setColor])

  const sizes = useMemo(() => {
    if (isNoColorProduct) {
      const seen = new Set<string>()
      return variants.filter((v) => {
        if (seen.has(v.size)) return false
        seen.add(v.size)
        return true
      }).map((v) => v.size)
    }
    if (!selectedColor) return []
    const colorVariants = variants.filter((v) => v.color === selectedColor)
    const seen = new Set<string>()
    return colorVariants.filter((v) => {
      if (seen.has(v.size)) return false
      seen.add(v.size)
      return true
    }).map((v) => v.size)
  }, [variants, selectedColor, isNoColorProduct])

  // Auto-select first size when sizes become available
  useEffect(() => {
    if (sizes.length > 0 && !selectedSize) {
      setSize(sizes[0])
    }
  }, [sizes, selectedSize, setSize])

  const canOrder = generatedDesigns.length > 0
    && (isNoColorProduct || selectedColor)
    && (!product?.hasSizes || selectedSize)

  return (
    <div className="flex h-full flex-col border-l border-border/30 p-5">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Order Details
      </div>

      <div className="flex-1 space-y-0">
        <OrderRow label="Product" value={product?.name ?? '—'} />
        {!isNoColorProduct && (
          <OrderRow
            label="Color"
            value={
              selectedColor ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-border/30"
                    style={{ backgroundColor: selectedColorHex ?? undefined }} />
                  {selectedColor}
                </span>
              ) : '—'
            }
          />
        )}
        {!isNoColorProduct && (
          <OrderRow label="Style" value={designStyle.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
        )}

        {product?.hasSizes && (
          <div className="border-b border-border/20 py-3">
            <div className="mb-2 text-xs text-muted-foreground/60">Size</div>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSize(size)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-[11px] transition-all',
                    selectedSize === size
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                      : 'border-border/30 hover:border-amber-500/30'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-border/20 py-3">
          <span className="text-xs text-muted-foreground/60">Quantity</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-sm transition-all hover:bg-card/60 disabled:opacity-30">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-medium">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} disabled={quantity >= MAX_QUANTITY}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-sm transition-all hover:bg-card/60 disabled:opacity-30">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="my-4 text-center">
        <div className="text-3xl font-bold text-amber-400">
          {pricePts ? `${pricePts * quantity} pts` : '— pts'}
        </div>
      </div>

      <div className="mb-3 text-center text-[11px] text-muted-foreground/40">
        Printed &amp; shipped by Printify<br />
        Estimated delivery: 5-7 business days
      </div>

      <button
        onClick={() => setOrderModalOpen(true)}
        disabled={!canOrder}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-4 w-4" />
        Order via Printify
      </button>
    </div>
  )
}
