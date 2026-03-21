'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { DesignThumbnails } from './DesignThumbnails'
import { ImageDown, RotateCcw, Eye, Pencil } from 'lucide-react'
import { cn } from '@/utils/utils'

const STAGE_WIDTH = 480
const STAGE_HEIGHT = 560

// Print zones as fractions of stage dimensions per product shape + style
function getPrintZone(shapeType: string, designStyle: string, view: string) {
  if (shapeType === 'apparel' && view === 'back') {
    return { x: 0.2, y: 0.2, w: 0.6, h: 0.5 }
  }
  if (shapeType === 'apparel') {
    switch (designStyle) {
      case 'left-chest': return { x: 0.28, y: 0.22, w: 0.2, h: 0.18 }
      case 'back': return { x: 0.25, y: 0.2, w: 0.5, h: 0.45 }
      case 'all-over': return { x: 0.12, y: 0.08, w: 0.76, h: 0.72 }
      case 'center': default: return { x: 0.22, y: 0.2, w: 0.56, h: 0.48 }
    }
  }
  switch (shapeType) {
    case 'wall-art': return { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }
    case 'accessory': return { x: 0.22, y: 0.22, w: 0.56, h: 0.56 }
    case 'drinkware': return { x: 0.25, y: 0.18, w: 0.4, h: 0.6 }
    case 'sticker': return { x: 0.15, y: 0.15, w: 0.7, h: 0.7 }
    default: return { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }
  }
}

const SHAPE_MAP: Record<number, string> = {
  12: 'apparel', 77: 'apparel', 281: 'apparel', 450: 'apparel',
  282: 'wall-art', 937: 'wall-art', 532: 'wall-art',
  478: 'drinkware', 400: 'sticker', 413: 'accessory',
}

function useLoadImage(url: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!url) { setImage(null); return }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.onerror = () => {
      // Retry without crossOrigin
      const img2 = new window.Image()
      img2.onload = () => setImage(img2)
      img2.src = url
    }
    img.src = url
  }, [url])
  return image
}

function drawProductShape(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, category: string) {
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 10

  switch (category) {
    case 'apparel': {
      const cx = w / 2, top = h * 0.08, bw = w * 0.55, bh = h * 0.72
      ctx.beginPath()
      ctx.arc(cx, top + 18, 32, Math.PI, 0)
      ctx.lineTo(cx + bw / 2 + 44, top + 34)
      ctx.lineTo(cx + bw / 2 + 44, top + 140)
      ctx.lineTo(cx + bw / 2, top + 108)
      ctx.lineTo(cx + bw / 2, top + bh)
      ctx.quadraticCurveTo(cx, top + bh + 22, cx - bw / 2, top + bh)
      ctx.lineTo(cx - bw / 2, top + 108)
      ctx.lineTo(cx - bw / 2 - 44, top + 140)
      ctx.lineTo(cx - bw / 2 - 44, top + 34)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'wall-art': {
      const pad = 28
      ctx.beginPath()
      ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 6)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 2
      ctx.strokeRect(pad + 5, pad + 5, w - pad * 2 - 10, h - pad * 2 - 10)
      break
    }
    case 'drinkware': {
      const mx = w * 0.22, my = h * 0.12, mw = w * 0.44, mh = h * 0.68
      ctx.beginPath()
      ctx.roundRect(mx, my, mw, mh, 14)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.arc(mx + mw + 24, my + mh / 2, 34, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      break
    }
    case 'sticker': {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76, 24)
      ctx.fill()
      break
    }
    case 'accessory': {
      const bx = w * 0.18, by = h * 0.18, bw2 = w * 0.64, bh2 = h * 0.64
      ctx.beginPath()
      ctx.roundRect(bx, by, bw2, bh2, 10)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(w * 0.33, by, 32, Math.PI, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(w * 0.67, by, 32, Math.PI, 0)
      ctx.stroke()
      break
    }
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

function ProductShapeCanvas({ color, category }: { color: string; category: string }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = STAGE_WIDTH
    canvas.height = STAGE_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawProductShape(ctx, STAGE_WIDTH, STAGE_HEIGHT, color, category)
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = canvas.toDataURL()
  }, [color, category])

  if (!image) return null
  return <KonvaImage image={image} width={STAGE_WIDTH} height={STAGE_HEIGHT} listening={false} />
}

export function DesignEditor() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColorHex = useMerchLabStore((s) => s.selectedColorHex)
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const designStyle = useMerchLabStore((s) => s.designStyle)
  const mockupView = useMerchLabStore((s) => s.mockupView)
  const mockupImages = useMerchLabStore((s) => s.mockupImages)
  const isLoadingMockup = useMerchLabStore((s) => s.isLoadingMockup)
  const setDesignPosition = useMerchLabStore((s) => s.setDesignPosition)
  const setMockupView = useMerchLabStore((s) => s.setMockupView)
  const error = useMerchLabStore((s) => s.error)

  const activeDesign = generatedDesigns[activeDesignIndex]
  const designImage = useLoadImage(activeDesign?.url)
  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const shapeType = SHAPE_MAP[selectedProductId ?? 12] ?? 'apparel'
  const color = selectedColorHex || '#2a2a2a'

  const mockupImage = mockupImages.find((img) => img.position === mockupView) ?? mockupImages[0]
  const hasMockup = !!mockupImage?.src
  const printifyImg = useLoadImage(hasMockup ? mockupImage.src : undefined)

  const [showEditor, setShowEditor] = useState(true) // Toggle between editor and preview
  const imageRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)

  // Compute print zone in pixels
  const zone = getPrintZone(shapeType, designStyle, mockupView)
  const zoneX = zone.x * STAGE_WIDTH
  const zoneY = zone.y * STAGE_HEIGHT
  const zoneW = zone.w * STAGE_WIDTH
  const zoneH = zone.h * STAGE_HEIGHT

  // Initial design placement (centered in zone, scaled to fit)
  const getInitialDesignAttrs = useCallback(() => {
    if (!designImage) return { x: zoneX, y: zoneY, scaleX: 1, scaleY: 1, rotation: 0 }
    const imgW = designImage.naturalWidth || designImage.width
    const imgH = designImage.naturalHeight || designImage.height
    const fitScale = Math.min(zoneW / imgW, zoneH / imgH) * 0.85
    return {
      x: zoneX + zoneW / 2 - (imgW * fitScale) / 2,
      y: zoneY + zoneH / 2 - (imgH * fitScale) / 2,
      scaleX: fitScale,
      scaleY: fitScale,
      rotation: 0,
    }
  }, [designImage, zoneX, zoneY, zoneW, zoneH])

  // Apply stored position or use initial
  const getDesignAttrs = useCallback(() => {
    if (!designImage) return getInitialDesignAttrs()
    const imgW = designImage.naturalWidth || designImage.width
    const imgH = designImage.naturalHeight || designImage.height

    if (designPosition.x === 0.5 && designPosition.y === 0.5 && designPosition.scale === 1 && designPosition.rotation === 0) {
      return getInitialDesignAttrs()
    }

    const baseScale = Math.min(zoneW / imgW, zoneH / imgH) * 0.85
    return {
      x: zoneX + designPosition.x * zoneW,
      y: zoneY + designPosition.y * zoneH,
      scaleX: baseScale * designPosition.scale,
      scaleY: baseScale * designPosition.scale,
      rotation: designPosition.rotation,
    }
  }, [designImage, designPosition, zoneX, zoneY, zoneW, zoneH, getInitialDesignAttrs])

  // Attach transformer when image loads
  useEffect(() => {
    if (imageRef.current && trRef.current && showEditor) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [designImage, showEditor])

  // Sync position to store on drag/transform end
  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current
    if (!node) return
    const newPos = {
      x: (node.x() - zoneX) / zoneW,
      y: (node.y() - zoneY) / zoneH,
      scale: node.scaleX() / (getInitialDesignAttrs().scaleX || 1),
      rotation: node.rotation(),
    }
    setDesignPosition(newPos)
  }, [zoneX, zoneY, zoneW, zoneH, getInitialDesignAttrs, setDesignPosition])

  const handleReset = () => {
    setDesignPosition({ x: 0.5, y: 0.5, scale: 1, rotation: 0 })
    if (imageRef.current) {
      const attrs = getInitialDesignAttrs()
      imageRef.current.setAttrs(attrs)
      trRef.current?.getLayer()?.batchDraw()
    }
  }

  const handleDownload = async () => {
    if (!activeDesign?.url) return
    try {
      const res = await fetch(activeDesign.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merch-design-${activeDesign.id}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(activeDesign.url, '_blank')
    }
  }

  const designAttrs = getDesignAttrs()
  const showPrintifyPreview = hasMockup && printifyImg && !showEditor

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      {/* Header with view toggle */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {showPrintifyPreview ? 'Realistic Preview' : 'Design Editor'}
          {mockupView === 'back' ? ' (Back)' : ' (Front)'}
        </span>

        {hasMockup && (
          <button
            onClick={() => setShowEditor(!showEditor)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-all',
              showEditor
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                : 'border-amber-500/50 bg-amber-500/10 text-amber-400'
            )}
          >
            {showEditor ? <><Eye className="h-3 w-3" /> Preview</> : <><Pencil className="h-3 w-3" /> Edit</>}
          </button>
        )}
      </div>

      {/* Mockup area */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'oklch(0.13 0.01 260)' }}>
        {showPrintifyPreview ? (
          // Printify realistic mockup
          <img
            src={mockupImage.src}
            alt="Product mockup"
            className="h-[560px] w-[480px] object-contain"
          />
        ) : (
          // Konva interactive editor
          <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
            {/* Product shape layer (non-interactive) */}
            <Layer listening={false}>
              <ProductShapeCanvas color={color} category={shapeType} />
            </Layer>

            {/* Print zone indicator + design layer */}
            <Layer>
              {/* Print zone border (dashed) */}
              {activeDesign && (
                <Rect
                  x={zoneX}
                  y={zoneY}
                  width={zoneW}
                  height={zoneH}
                  stroke="rgba(245, 158, 11, 0.25)"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                  cornerRadius={4}
                />
              )}

              {/* Design image (draggable, transformable) */}
              {designImage && (
                <Group
                  clipX={zoneX}
                  clipY={zoneY}
                  clipWidth={zoneW}
                  clipHeight={zoneH}
                >
                  <KonvaImage
                    ref={imageRef}
                    image={designImage}
                    x={designAttrs.x}
                    y={designAttrs.y}
                    scaleX={designAttrs.scaleX}
                    scaleY={designAttrs.scaleY}
                    rotation={designAttrs.rotation}
                    draggable
                    onDragEnd={handleTransformEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                </Group>
              )}

              {/* Transformer (resize/rotate handles) */}
              {designImage && showEditor && (
                <Transformer
                  ref={trRef}
                  rotateEnabled
                  keepRatio
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                  borderStroke="rgba(6, 182, 212, 0.8)"
                  borderStrokeWidth={1.5}
                  anchorStroke="rgba(6, 182, 212, 0.9)"
                  anchorFill="rgba(6, 182, 212, 0.3)"
                  anchorSize={10}
                  anchorCornerRadius={2}
                  rotateAnchorOffset={24}
                  padding={2}
                />
              )}
            </Layer>
          </Stage>
        )}

        {/* Empty state */}
        {!activeDesign && !showPrintifyPreview && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-xl border-2 border-dashed border-amber-500/25 px-8 py-6 text-center">
              <div className="text-sm text-amber-500/40 font-medium">Your design appears here</div>
              <div className="text-[10px] text-amber-500/25 mt-1">Generate a design to start editing</div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {activeDesign && isLoadingMockup && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <span className="text-[9px] text-amber-400/70">Generating preview...</span>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2">
        {product?.hasFrontBack && (
          <>
            <button
              onClick={() => setMockupView('front')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs transition-all',
                mockupView === 'front'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 bg-card/30 text-muted-foreground hover:bg-card/60'
              )}
            >
              Front
            </button>
            <button
              onClick={() => setMockupView('back')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs transition-all',
                mockupView === 'back'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 bg-card/30 text-muted-foreground hover:bg-card/60'
              )}
            >
              Back
            </button>
          </>
        )}

        {activeDesign && showEditor && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}

        {activeDesign && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60"
          >
            <ImageDown className="h-3.5 w-3.5" /> PNG
          </button>
        )}
      </div>

      {/* Design thumbnails */}
      <DesignThumbnails />

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
