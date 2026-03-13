'use client'

import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { RotateCw, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/utils/utils'

export function MockupControls() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const mockupView = useMerchLabStore((s) => s.mockupView)
  const setMockupView = useMerchLabStore((s) => s.setMockupView)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const setDesignPosition = useMerchLabStore((s) => s.setDesignPosition)

  const mockupImages = useMerchLabStore((s) => s.mockupImages)
  const hasPrintifyMockup = mockupImages.length > 0

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)

  const btnClass = 'flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60'
  const activeBtnClass = 'flex items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-400 transition-all'

  return (
    <div className="flex gap-2">
      {product?.hasFrontBack && (
        <>
          <button
            onClick={() => setMockupView('front')}
            className={cn(mockupView === 'front' ? activeBtnClass : btnClass)}
          >
            <RotateCw className="h-3.5 w-3.5" /> Front
          </button>
          <button
            onClick={() => setMockupView('back')}
            className={cn(mockupView === 'back' ? activeBtnClass : btnClass)}
          >
            <RotateCw className="h-3.5 w-3.5" /> Back
          </button>
        </>
      )}
      {!hasPrintifyMockup && (
        <>
          <button
            onClick={() => setDesignPosition({ ...designPosition, scale: Math.min(2, designPosition.scale + 0.1) })}
            className={btnClass}
          >
            <Maximize2 className="h-3.5 w-3.5" /> Larger
          </button>
          <button
            onClick={() => setDesignPosition({ ...designPosition, scale: Math.max(0.2, designPosition.scale - 0.1) })}
            className={btnClass}
          >
            <Minimize2 className="h-3.5 w-3.5" /> Smaller
          </button>
        </>
      )}
    </div>
  )
}
