'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, ZoomIn, Wand2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FullscreenImageViewModal } from './FullscreenImageViewModal'
import { ALLOWED_IMAGE_TYPES, GALLERY_IMAGE_MIME_TYPE } from '../constants/drag-drop.constants'

interface LastFrameModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (imageUrl?: string) => void
  initialImage?: string
  imageName: string
  startFrameUrl?: string
}

export function LastFrameModal({
  isOpen,
  onClose,
  onSave,
  initialImage,
  imageName,
  startFrameUrl
}: LastFrameModalProps) {
  const [image, setImage] = useState<string | undefined>(initialImage)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    setImage(initialImage)
    setGenerationError(null)
  }, [initialImage, isOpen])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemove = () => {
    setImage(undefined)
  }

  const handleSave = () => {
    onSave(image)
    onClose()
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) setIsDragOver(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)

    // Gallery image drag
    const galleryData = e.dataTransfer?.getData(GALLERY_IMAGE_MIME_TYPE)
    if (galleryData) {
      try {
        const parsed = JSON.parse(galleryData)
        if (parsed.url) setImage(parsed.url)
      } catch { /* ignore */ }
      return
    }

    // File drag
    const file = Array.from(e.dataTransfer.files).find(f => ALLOWED_IMAGE_TYPES.includes(f.type))
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const TEMPORAL_PROMPT = 'TEMPORAL UNIT ACTIVE. Input: reference image. Directive: render this scene as it appears 15 seconds later. Maintain all characters, style, lighting, and framing. Show realistic progression of motion, expression, and environment — nothing more, nothing less.'

  const handleGenerateLastFrame = async () => {
    if (!startFrameUrl) return
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-2',
          prompt: TEMPORAL_PROMPT,
          referenceImages: [startFrameUrl],
          modelSettings: { aspectRatio: '16:9', resolution: '1024x1024' },
          waitForResult: true,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate final frame')
      }
      const result = await response.json()
      if (result.status === 'completed' && result.imageUrl) {
        setImage(result.imageUrl)
      } else if (result.status === 'failed') {
        throw new Error(result.error || 'Generation failed')
      } else {
        throw new Error('Generation did not complete')
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl bg-background border-border text-white safe-bottom">
          <DialogHeader>
            <DialogTitle>Last Frame Image</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {imageName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-4 sm:px-6 max-h-[60vh] sm:max-h-none overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-white">Last Frame Image (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Specify the ending frame for the animation. Drag an image here or upload one.
              </p>
            </div>

            {/* Image Preview / Drop Zone */}
            <div
              className="flex justify-center"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {image ? (
                <div className={`relative w-full max-w-sm aspect-square sm:w-64 sm:h-64 group rounded transition-colors ${isDragOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                  <Image
                    src={image}
                    alt="Last frame"
                    fill
                    className="object-cover rounded border border-border"
                  />
                  {isDragOver && (
                    <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center z-20">
                      <span className="text-sm font-bold text-primary bg-background/80 px-3 py-1.5 rounded">Replace image</span>
                    </div>
                  )}
                  {/* Zoom overlay */}
                  {!isDragOver && (
                    <div
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center rounded"
                      onClick={() => setIsFullscreenOpen(true)}
                    >
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                    </div>
                  )}
                  <button
                    onClick={handleRemove}
                    className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-2.5 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation z-10"
                    aria-label="Remove image"
                  >
                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ) : (
                <label className={`w-full max-w-sm aspect-square sm:w-64 sm:h-64 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-colors touch-manipulation ${isDragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-border'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className={`w-16 h-16 sm:w-12 sm:h-12 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-base sm:text-sm ${isDragOver ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {isDragOver ? 'Drop image here' : 'Upload or drag image here'}
                  </span>
                </label>
              )}
            </div>

            {/* AI Generation Section */}
            {startFrameUrl && (
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
                <Button
                  onClick={handleGenerateLastFrame}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full max-w-sm bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary min-h-[44px] touch-manipulation"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating final frame...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Uses AI to imagine this scene 15 seconds later
                </p>
                {generationError && (
                  <p className="text-xs text-red-400 text-center">{generationError}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 px-4 sm:px-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-card border-border min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              Save Last Frame
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen viewer for last frame */}
      {image && (
        <FullscreenImageViewModal
          imageUrl={image}
          imageName="Last Frame"
          open={isFullscreenOpen}
          onOpenChange={setIsFullscreenOpen}
        />
      )}
    </>
  )
}
