'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { X, Download, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUnifiedGalleryStore } from '../../store/unified-gallery-store'
import { logger } from '@/lib/logger'

interface ImageCropModalProps {
  imageUrl: string
  galleryId: string
  onClose: () => void
}

/** Aspect ratio presets offered in the crop UI. `undefined` = free-form. */
const ASPECT_PRESETS: { label: string; value: number | undefined; key: string }[] = [
  { label: 'Free', value: undefined, key: 'free' },
  { label: '16:9', value: 16 / 9, key: '16:9' },
  { label: '9:16', value: 9 / 16, key: '9:16' },
  { label: '1:1', value: 1, key: '1:1' },
  { label: '4:5', value: 4 / 5, key: '4:5' },
  { label: '5:4', value: 5 / 4, key: '5:4' },
  { label: '3:2', value: 3 / 2, key: '3:2' },
  { label: '2:3', value: 2 / 3, key: '2:3' },
  { label: '21:9', value: 21 / 9, key: '21:9' },
]

/** Center a crop of the chosen aspect inside the image on first load. */
function centerInitialCrop(width: number, height: number, aspect?: number): Crop {
  if (!aspect) {
    return { unit: '%', x: 10, y: 10, width: 80, height: 80 }
  }
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
    width,
    height
  )
}

export function ImageCropModal({ imageUrl, galleryId, onClose }: ImageCropModalProps) {
  const { toast } = useToast()
  const imgRef = useRef<HTMLImageElement>(null)

  const [aspect, setAspect] = useState<number | undefined>(16 / 9)
  const [aspectKey, setAspectKey] = useState<string>('16:9')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerInitialCrop(width, height, aspect))
  }, [aspect])

  const handleAspectChange = useCallback((preset: typeof ASPECT_PRESETS[number]) => {
    setAspect(preset.value)
    setAspectKey(preset.key)
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerInitialCrop(width, height, preset.value))
    }
  }, [])

  /** Render the current crop to a canvas and return the resulting blob. */
  const renderCropToBlob = useCallback(async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) return null
    const image = imgRef.current

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelWidth = Math.round(completedCrop.width * scaleX)
    const pixelHeight = Math.round(completedCrop.height * scaleY)

    if (pixelWidth < 2 || pixelHeight < 2) return null

    const canvas = document.createElement('canvas')
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }, [completedCrop])

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    try {
      const blob = await renderCropToBlob()
      if (!blob) {
        toast({ title: 'Crop is empty', description: 'Drag to select an area first.', variant: 'destructive' })
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cropped-${aspectKey}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({ title: 'Downloaded', description: `Saved as cropped-${aspectKey}.png` })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.shotCreator.error('Crop download failed', { error: msg })
      toast({ title: 'Download failed', description: msg, variant: 'destructive' })
    } finally {
      setIsDownloading(false)
    }
  }, [renderCropToBlob, aspectKey, toast])

  const handleSaveToGallery = useCallback(async () => {
    setIsSaving(true)
    try {
      const blob = await renderCropToBlob()
      if (!blob) {
        toast({ title: 'Crop is empty', description: 'Drag to select an area first.', variant: 'destructive' })
        return
      }

      // Convert blob to data URL for API upload
      const reader = new FileReader()
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const response = await fetch('/api/tools/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          galleryId,
          cropAspect: aspectKey === 'free' ? undefined : aspectKey,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save crop')
      }

      toast({ title: 'Saved to Gallery', description: 'Your cropped image is now in the gallery.' })
      await useUnifiedGalleryStore.getState().refreshGallery()
      onClose()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.shotCreator.error('Crop save failed', { error: msg })
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }, [renderCropToBlob, galleryId, aspectKey, toast, onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-white text-lg font-medium">Crop Image</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Aspect presets */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-border">
        {ASPECT_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            size="sm"
            variant={aspectKey === preset.key ? 'default' : 'outline'}
            onClick={() => handleAspectChange(preset)}
            className={aspectKey === preset.key ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'text-white border-border'}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Crop area — scrollable if image is tall */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          keepSelection
          minWidth={20}
          minHeight={20}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop source"
            crossOrigin="anonymous"
            onLoad={onImageLoad}
            className="max-h-[70vh] w-auto"
          />
        </ReactCrop>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 p-4 border-t border-border">
        <div className="flex-1 text-xs text-muted-foreground self-center">
          {completedCrop && (
            <span>
              {Math.round(completedCrop.width * (imgRef.current?.naturalWidth ?? 0) / (imgRef.current?.width ?? 1))} × {Math.round(completedCrop.height * (imgRef.current?.naturalHeight ?? 0) / (imgRef.current?.height ?? 1))} px
            </span>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={isDownloading || isSaving || !completedCrop}
          className="text-white border-border"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download
        </Button>
        <Button
          onClick={handleSaveToGallery}
          disabled={isDownloading || isSaving || !completedCrop}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save to Gallery
        </Button>
      </div>
    </div>
  )
}
