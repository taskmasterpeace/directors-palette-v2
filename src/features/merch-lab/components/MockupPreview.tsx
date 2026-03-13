'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { DesignThumbnails } from './DesignThumbnails'
import { MockupControls } from './MockupControls'
import { ImageDown } from 'lucide-react'
import { cn } from '@/utils/utils'

function drawProductShape(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, category: string) {
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 8

  switch (category) {
    case 'apparel': {
      const cx = w / 2, top = h * 0.1, bw = w * 0.55, bh = h * 0.7
      ctx.beginPath()
      ctx.arc(cx, top + 15, 30, Math.PI, 0)
      ctx.lineTo(cx + bw / 2 + 40, top + 30)
      ctx.lineTo(cx + bw / 2 + 40, top + 130)
      ctx.lineTo(cx + bw / 2, top + 100)
      ctx.lineTo(cx + bw / 2, top + bh)
      ctx.quadraticCurveTo(cx, top + bh + 20, cx - bw / 2, top + bh)
      ctx.lineTo(cx - bw / 2, top + 100)
      ctx.lineTo(cx - bw / 2 - 40, top + 130)
      ctx.lineTo(cx - bw / 2 - 40, top + 30)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'wall-art': {
      const pad = 30
      ctx.beginPath()
      ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 4)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 2
      ctx.strokeRect(pad + 4, pad + 4, w - pad * 2 - 8, h - pad * 2 - 8)
      break
    }
    case 'accessory': {
      const bx = w * 0.2, by = h * 0.2, bw2 = w * 0.6, bh2 = h * 0.6
      ctx.beginPath()
      ctx.roundRect(bx, by, bw2, bh2, 8)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(w * 0.35, by, 30, Math.PI, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(w * 0.65, by, 30, Math.PI, 0)
      ctx.stroke()
      break
    }
    case 'drinkware': {
      const mx = w * 0.25, my = h * 0.15, mw = w * 0.4, mh2 = h * 0.65
      ctx.beginPath()
      ctx.roundRect(mx, my, mw, mh2, 12)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(mx + mw + 20, my + mh2 / 2, 30, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      break
    }
    case 'sticker': {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7, 20)
      ctx.fill()
      break
    }
  }

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

function getPrintZone(w: number, h: number, category: string) {
  switch (category) {
    case 'apparel':
      return { x: w * 0.25, y: h * 0.2, w: w * 0.5, h: h * 0.45 }
    case 'wall-art':
      return { x: 35, y: 35, w: w - 70, h: h - 70 }
    case 'accessory':
      return { x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.5 }
    case 'drinkware':
      return { x: w * 0.28, y: h * 0.2, w: w * 0.35, h: h * 0.55 }
    case 'sticker':
      return { x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 }
    default:
      return { x: w * 0.25, y: h * 0.2, w: w * 0.5, h: h * 0.5 }
  }
}

export function MockupPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColorHex = useMerchLabStore((s) => s.selectedColorHex)
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const mockupView = useMerchLabStore((s) => s.mockupView)
  const mockupImages = useMerchLabStore((s) => s.mockupImages)
  const isLoadingMockup = useMerchLabStore((s) => s.isLoadingMockup)
  const error = useMerchLabStore((s) => s.error)

  const [mockupFadedIn, setMockupFadedIn] = useState(false)

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const activeDesign = generatedDesigns[activeDesignIndex]

  const mockupImage = mockupImages.find((img) => img.position === mockupView) ?? mockupImages[0]
  const hasMockup = !!mockupImage?.src

  useEffect(() => {
    setMockupFadedIn(false)
    if (hasMockup) {
      const timer = setTimeout(() => setMockupFadedIn(true), 50)
      return () => clearTimeout(timer)
    }
  }, [hasMockup, mockupImage?.src])

  const drawMockup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const color = selectedColorHex || '#2a2a2a'

    ctx.clearRect(0, 0, w, h)
    drawProductShape(ctx, w, h, color, product?.category ?? 'apparel')

    if (activeDesign?.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const printZone = getPrintZone(w, h, product?.category ?? 'apparel')
        const dw = printZone.w * designPosition.scale
        const dh = printZone.h * designPosition.scale
        const dx = printZone.x + (printZone.w * designPosition.x) - dw / 2
        const dy = printZone.y + (printZone.h * designPosition.y) - dh / 2
        ctx.drawImage(img, dx, dy, dw, dh)
      }
      img.src = activeDesign.url
    }
  }, [selectedColorHex, activeDesign, designPosition, product])

  useEffect(() => { drawMockup() }, [drawMockup])

  const handleDownload = () => {
    if (!activeDesign?.url) return
    const a = document.createElement('a')
    a.href = activeDesign.url
    a.download = `merch-design-${activeDesign.id}.png`
    a.click()
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Live Preview {mockupView === 'back' ? '(Back)' : '(Front)'}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={480}
          className={cn(
            'rounded-2xl transition-opacity duration-300',
            hasMockup && mockupFadedIn ? 'opacity-0 absolute inset-0' : 'opacity-100'
          )}
        />

        {hasMockup && (
          <img
            src={mockupImage.src}
            alt="Product mockup"
            className={cn(
              'h-[480px] w-[400px] rounded-2xl object-contain transition-opacity duration-300',
              mockupFadedIn ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {!activeDesign && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border-2 border-dashed border-cyan-500/30 px-8 py-6 text-center text-sm text-cyan-500/50">
              Your design appears here
            </div>
          </div>
        )}

        {activeDesign && isLoadingMockup && (
          <div className="absolute right-3 top-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
          </div>
        )}
      </div>

      {activeDesign && isLoadingMockup && (
        <div className="text-[10px] text-muted-foreground/40">Loading product preview...</div>
      )}

      {activeDesign && !isLoadingMockup && !hasMockup && generatedDesigns.length > 0 && (
        <div className="text-[10px] text-muted-foreground/30">Preview unavailable</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <MockupControls />

      {activeDesign && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60"
        >
          <ImageDown className="h-3.5 w-3.5" />
          Download PNG
        </button>
      )}

      <DesignThumbnails />
    </div>
  )
}
