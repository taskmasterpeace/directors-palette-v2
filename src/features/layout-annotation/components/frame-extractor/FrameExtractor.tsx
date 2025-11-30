'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Grid3x3, Download, ChevronLeft, ChevronRight, Save, ZoomIn } from 'lucide-react'
import {
  GridConfig,
  GridCell,
  CropRegion,
  DEFAULT_GRID_CONFIG,
  ASPECT_RATIO_PRESETS,
  calculateGridCells,
  initializeCropRegions,
  FrameExtractionResult
} from '../../types/frame-extractor.types'

interface FrameExtractorProps {
  imageUrl: string
  onClose: () => void
  onExtract: (frames: FrameExtractionResult[]) => void
}

export function FrameExtractor({ imageUrl, onClose, onExtract }: FrameExtractorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cornerCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null])

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG)
  const [cells, setCells] = useState<GridCell[]>([])
  const [cropRegions, setCropRegions] = useState<CropRegion[]>([])
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [displayScale, setDisplayScale] = useState(1)
  const [isExtracting, setIsExtracting] = useState(false)
  const [trim, setTrim] = useState(0) // Pixels to inset from each edge

  // Dragging state
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'offsetX' | 'offsetY' | 'gutterX' | 'gutterY' | null>(null)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [dragStartValue, setDragStartValue] = useState(0)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageDimensions({ width: img.width, height: img.height })
      setImageLoaded(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Calculate display scale
  useEffect(() => {
    if (!containerRef.current || !imageLoaded) return

    const containerWidth = containerRef.current.clientWidth - 32
    const containerHeight = containerRef.current.clientHeight - 32
    const scaleX = containerWidth / imageDimensions.width
    const scaleY = containerHeight / imageDimensions.height
    setDisplayScale(Math.min(scaleX, scaleY, 1))
  }, [imageLoaded, imageDimensions])

  // Recalculate grid when config or image changes
  useEffect(() => {
    if (!imageLoaded) return

    const newCells = calculateGridCells(
      imageDimensions.width,
      imageDimensions.height,
      gridConfig
    )
    setCells(newCells)

    const targetAspect = aspectRatio === '16:9' ? 16 / 9 : 9 / 16
    const newCropRegions = initializeCropRegions(newCells, targetAspect)
    setCropRegions(newCropRegions)
  }, [imageLoaded, imageDimensions, gridConfig, aspectRatio])

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const displayWidth = imageDimensions.width * displayScale
    const displayHeight = imageDimensions.height * displayScale

    canvas.width = displayWidth
    canvas.height = displayHeight

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight)

    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 2

    cells.forEach((cell, index) => {
      const x = cell.x * displayScale
      const y = cell.y * displayScale
      const w = cell.width * displayScale
      const h = cell.height * displayScale

      // Draw cell border
      ctx.strokeStyle = selectedCellIndex === index ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 0.8)'
      ctx.lineWidth = selectedCellIndex === index ? 3 : 2
      ctx.strokeRect(x, y, w, h)

      // Draw cell number
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = `bold ${Math.max(14, 20 * displayScale)}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${index + 1}`, x + w / 2, y + h / 2)
    })

    // Draw crop regions
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    cropRegions.forEach((region, index) => {
      const cell = region.cell
      const x = (cell.x + region.cropX) * displayScale
      const y = (cell.y + region.cropY) * displayScale
      const w = region.cropWidth * displayScale
      const h = region.cropHeight * displayScale

      if (selectedCellIndex === index) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
        ctx.lineWidth = 2
      } else {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'
        ctx.lineWidth = 1
      }
      ctx.strokeRect(x, y, w, h)
    })

    ctx.setLineDash([])
  }, [cells, cropRegions, displayScale, imageLoaded, imageDimensions, selectedCellIndex])

  // Draw corner magnifier previews
  useEffect(() => {
    if (!imageRef.current || !imageLoaded || selectedCellIndex === null) return
    if (!cropRegions[selectedCellIndex]) return

    const region = cropRegions[selectedCellIndex]
    const cell = region.cell
    const cornerSize = 60 // Size of corner preview area
    const zoomLevel = 4 // 4x zoom
    const sourceSize = cornerSize / zoomLevel // Actual pixels from source

    // Calculate crop bounds with trim
    const cropX = cell.x + region.cropX + trim
    const cropY = cell.y + region.cropY + trim
    const cropW = region.cropWidth - (trim * 2)
    const cropH = region.cropHeight - (trim * 2)

    // Corner positions: [top-left, top-right, bottom-left, bottom-right]
    const corners = [
      { sx: cropX, sy: cropY, label: 'TL' },
      { sx: cropX + cropW - sourceSize, sy: cropY, label: 'TR' },
      { sx: cropX, sy: cropY + cropH - sourceSize, label: 'BL' },
      { sx: cropX + cropW - sourceSize, sy: cropY + cropH - sourceSize, label: 'BR' }
    ]

    corners.forEach((corner, i) => {
      const canvas = cornerCanvasRefs.current[i]
      if (!canvas) return

      canvas.width = cornerSize
      canvas.height = cornerSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear and draw background
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, cornerSize, cornerSize)

      // Draw zoomed corner
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        imageRef.current!,
        corner.sx, corner.sy, sourceSize, sourceSize,
        0, 0, cornerSize, cornerSize
      )

      // Draw trim indicator line
      if (trim > 0) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])

        const trimPixels = trim * zoomLevel
        if (i === 0) { // TL
          ctx.beginPath()
          ctx.moveTo(trimPixels, 0)
          ctx.lineTo(trimPixels, cornerSize)
          ctx.moveTo(0, trimPixels)
          ctx.lineTo(cornerSize, trimPixels)
          ctx.stroke()
        } else if (i === 1) { // TR
          ctx.beginPath()
          ctx.moveTo(cornerSize - trimPixels, 0)
          ctx.lineTo(cornerSize - trimPixels, cornerSize)
          ctx.moveTo(0, trimPixels)
          ctx.lineTo(cornerSize, trimPixels)
          ctx.stroke()
        } else if (i === 2) { // BL
          ctx.beginPath()
          ctx.moveTo(trimPixels, 0)
          ctx.lineTo(trimPixels, cornerSize)
          ctx.moveTo(0, cornerSize - trimPixels)
          ctx.lineTo(cornerSize, cornerSize - trimPixels)
          ctx.stroke()
        } else { // BR
          ctx.beginPath()
          ctx.moveTo(cornerSize - trimPixels, 0)
          ctx.lineTo(cornerSize - trimPixels, cornerSize)
          ctx.moveTo(0, cornerSize - trimPixels)
          ctx.lineTo(cornerSize, cornerSize - trimPixels)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }
    })
  }, [imageLoaded, selectedCellIndex, cropRegions, trim])

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking near a grid line for dragging
    const tolerance = 10

    // Check vertical lines (for offsetX adjustment)
    const firstCellX = gridConfig.offsetX * displayScale
    if (Math.abs(x - firstCellX) < tolerance) {
      setIsDragging(true)
      setDragType('offsetX')
      setDragStartPos({ x: e.clientX, y: e.clientY })
      setDragStartValue(gridConfig.offsetX)
      return
    }

    // Check horizontal lines (for offsetY adjustment)
    const firstCellY = gridConfig.offsetY * displayScale
    if (Math.abs(y - firstCellY) < tolerance) {
      setIsDragging(true)
      setDragType('offsetY')
      setDragStartPos({ x: e.clientX, y: e.clientY })
      setDragStartValue(gridConfig.offsetY)
      return
    }

    // Check for cell click
    cells.forEach((cell, index) => {
      const cellX = cell.x * displayScale
      const cellY = cell.y * displayScale
      const cellW = cell.width * displayScale
      const cellH = cell.height * displayScale

      if (x >= cellX && x <= cellX + cellW && y >= cellY && y <= cellY + cellH) {
        setSelectedCellIndex(index)
      }
    })
  }, [cells, displayScale, gridConfig])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragType) return

    const deltaX = (e.clientX - dragStartPos.x) / displayScale
    const deltaY = (e.clientY - dragStartPos.y) / displayScale

    if (dragType === 'offsetX') {
      const newOffset = Math.max(0, Math.min(imageDimensions.width / 4, dragStartValue + deltaX))
      setGridConfig(prev => ({ ...prev, offsetX: Math.round(newOffset) }))
    } else if (dragType === 'offsetY') {
      const newOffset = Math.max(0, Math.min(imageDimensions.height / 4, dragStartValue + deltaY))
      setGridConfig(prev => ({ ...prev, offsetY: Math.round(newOffset) }))
    }
  }, [isDragging, dragType, dragStartPos, dragStartValue, displayScale, imageDimensions])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragType(null)
  }, [])

  // Extract frames
  const handleExtract = useCallback(async () => {
    if (!imageRef.current || cropRegions.length === 0) return

    setIsExtracting(true)
    const { width: targetWidth, height: targetHeight } = ASPECT_RATIO_PRESETS[aspectRatio]
    const results: FrameExtractionResult[] = []

    for (let i = 0; i < cropRegions.length; i++) {
      const region = cropRegions[i]
      const cell = region.cell

      // Create temp canvas for extraction
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = targetWidth
      tempCanvas.height = targetHeight
      const ctx = tempCanvas.getContext('2d')
      if (!ctx) continue

      // Calculate source rectangle in original image coordinates with trim applied
      const sx = cell.x + region.cropX + trim
      const sy = cell.y + region.cropY + trim
      const sw = region.cropWidth - (trim * 2)
      const sh = region.cropHeight - (trim * 2)

      // Draw cropped region scaled to target size
      ctx.drawImage(
        imageRef.current,
        sx, sy, sw, sh,
        0, 0, targetWidth, targetHeight
      )

      const dataUrl = tempCanvas.toDataURL('image/png', 1.0)
      results.push({
        index: i,
        row: cell.row,
        col: cell.col,
        dataUrl,
        width: targetWidth,
        height: targetHeight
      })
    }

    setIsExtracting(false)
    onExtract(results)
  }, [cropRegions, aspectRatio, trim, onExtract])

  // Save frames to gallery
  const handleSaveToGallery = useCallback(async () => {
    if (!imageRef.current || cropRegions.length === 0) return

    setIsExtracting(true)
    const { width: targetWidth, height: targetHeight } = ASPECT_RATIO_PRESETS[aspectRatio]
    let successCount = 0

    for (let i = 0; i < cropRegions.length; i++) {
      const region = cropRegions[i]
      const cell = region.cell

      // Create temp canvas for extraction
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = targetWidth
      tempCanvas.height = targetHeight
      const ctx = tempCanvas.getContext('2d')
      if (!ctx) continue

      // Calculate source rectangle in original image coordinates with trim applied
      const sx = cell.x + region.cropX + trim
      const sy = cell.y + region.cropY + trim
      const sw = region.cropWidth - (trim * 2)
      const sh = region.cropHeight - (trim * 2)

      // Draw cropped region scaled to target size
      ctx.drawImage(
        imageRef.current,
        sx, sy, sw, sh,
        0, 0, targetWidth, targetHeight
      )

      const dataUrl = tempCanvas.toDataURL('image/png', 1.0)

      // Save to gallery via API
      try {
        const response = await fetch('/api/gallery/save-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            metadata: {
              row: cell.row,
              col: cell.col,
              aspectRatio,
              width: targetWidth,
              height: targetHeight,
            }
          })
        })

        if (response.ok) {
          successCount++
        }
      } catch (error) {
        console.error(`Failed to save frame ${i + 1}:`, error)
      }
    }

    setIsExtracting(false)

    // Create a minimal result array for the callback
    const results: FrameExtractionResult[] = Array.from({ length: successCount }, (_, i) => ({
      index: i,
      row: Math.floor(i / gridConfig.cols),
      col: i % gridConfig.cols,
      dataUrl: '',
      width: targetWidth,
      height: targetHeight
    }))

    onExtract(results)
  }, [cropRegions, aspectRatio, trim, gridConfig.cols, onExtract])

  const targetPreset = ASPECT_RATIO_PRESETS[aspectRatio]

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex">
      {/* Main canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
      >
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            className="border border-slate-600 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        ) : (
          <div className="text-white">Loading image...</div>
        )}
      </div>

      {/* Controls sidebar */}
      <div className="w-80 bg-slate-900 border-l border-slate-700 overflow-y-auto">
        <Card className="bg-slate-800/50 border-slate-600 m-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-cyan-400" />
                Frame Extractor
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Grid Configuration */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-300">Grid Layout</Label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Rows: {gridConfig.rows}</Label>
                  <Slider
                    value={[gridConfig.rows]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, rows: v }))}
                    min={1}
                    max={6}
                    step={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Cols: {gridConfig.cols}</Label>
                  <Slider
                    value={[gridConfig.cols]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, cols: v }))}
                    min={1}
                    max={6}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Offset X: {gridConfig.offsetX}px</Label>
                  <Slider
                    value={[gridConfig.offsetX]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, offsetX: v }))}
                    min={0}
                    max={Math.floor(imageDimensions.width / 4)}
                    step={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Offset Y: {gridConfig.offsetY}px</Label>
                  <Slider
                    value={[gridConfig.offsetY]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, offsetY: v }))}
                    min={0}
                    max={Math.floor(imageDimensions.height / 4)}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Gutter X: {gridConfig.gutterX}px</Label>
                  <Slider
                    value={[gridConfig.gutterX]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, gutterX: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Gutter Y: {gridConfig.gutterY}px</Label>
                  <Slider
                    value={[gridConfig.gutterY]}
                    onValueChange={([v]) => setGridConfig(prev => ({ ...prev, gutterY: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* Trim / Edge Inset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">Edge Trim: {trim}px</Label>
              <Slider
                value={[trim]}
                onValueChange={([v]) => setTrim(v)}
                min={0}
                max={20}
                step={1}
              />
              <p className="text-xs text-slate-400">
                Inset crop from edges to remove black lines
              </p>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">Output Aspect Ratio</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('16:9')}
                  className={aspectRatio === '16:9' ? 'bg-cyan-600' : ''}
                >
                  16:9
                </Button>
                <Button
                  size="sm"
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('9:16')}
                  className={aspectRatio === '9:16' ? 'bg-cyan-600' : ''}
                >
                  9:16
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Output: {targetPreset.width} x {targetPreset.height}px
              </p>
            </div>

            {/* Cell previews */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Frames ({cells.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {cells.map((_cell, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedCellIndex(index)}
                    className={`aspect-video bg-slate-700 rounded border-2 flex items-center justify-center text-sm font-bold transition-colors ${selectedCellIndex === index
                        ? 'border-green-500 text-green-500'
                        : 'border-slate-600 text-slate-400 hover:border-cyan-500'
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected cell navigation */}
            {selectedCellIndex !== null && (
              <div className="flex items-center justify-between p-2 bg-slate-700 rounded">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={selectedCellIndex === 0}
                  onClick={() => setSelectedCellIndex(prev => prev !== null ? prev - 1 : 0)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-white text-sm">
                  Frame {selectedCellIndex + 1} of {cells.length}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={selectedCellIndex === cells.length - 1}
                  onClick={() => setSelectedCellIndex(prev => prev !== null ? prev + 1 : 0)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Corner Magnifier */}
            {selectedCellIndex !== null && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4" />
                  Corner Preview (4x)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {['TL', 'TR', 'BL', 'BR'].map((label, i) => (
                    <div key={label} className="relative">
                      <canvas
                        ref={el => { cornerCanvasRefs.current[i] = el }}
                        className="w-full aspect-square bg-slate-800 rounded border border-slate-600"
                      />
                      <span className="absolute bottom-1 right-1 text-xs text-slate-400 bg-slate-900/80 px-1 rounded">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  Green lines show trim boundary
                </p>
              </div>
            )}

            {/* Export buttons */}
            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleSaveToGallery}
                disabled={isExtracting || cells.length === 0}
              >
                {isExtracting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save {cells.length} to Gallery
                  </>
                )}
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleExtract}
                disabled={isExtracting || cells.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Download {cells.length} Frames
              </Button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setGridConfig(DEFAULT_GRID_CONFIG)}
              >
                Reset Grid
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
