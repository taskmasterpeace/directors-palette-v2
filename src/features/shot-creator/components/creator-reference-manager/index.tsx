'use client'

import { useState, ReactNode, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Trash2,
  X,
  RectangleHorizontal,
  Square,
  Download,
  Copy,
  Film,
  Layout,
  Eraser,
  Loader2,
} from 'lucide-react'
import Image from "next/image"
import CreatorReferenceManagerCompact from "./CreatorReferenceManagerCompact"
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { ReferenceImageCard, type ShotImage } from "./ReferenceImageCard"
import { useToast } from "@/hooks/use-toast"
import { clipboardManager } from '@/utils/clipboard-manager'
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"

interface CreatorReferenceManagerProps {
  compact?: boolean
  maxImages?: number
  modelSelector?: ReactNode
}

export function CreatorReferenceManager({
  compact = false,
  maxImages = 3,
  modelSelector
}: CreatorReferenceManagerProps) {
  const { shotCreatorReferenceImages, setShotCreatorReferenceImages, useNativeAspectRatio, setUseNativeAspectRatio, onSendToShotAnimator } = useShotCreatorStore()
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)
  const [removingBackgroundId, setRemovingBackgroundId] = useState<string | null>(null)
  const [savingToGalleryId, setSavingToGalleryId] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    visibleSlots,
    fullscreenImage,
    setFullscreenImage,
    handleShotCreatorImageUpload,
    handleMultipleImageUpload,
    handlePasteImage,
    handleCameraCapture,
    removeShotCreatorImage
  } = useReferenceImageManager(maxImages)

  // Action handlers for fullscreen modal
  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `reference_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      toast({ title: "Downloaded", description: "Image saved to downloads" })
    } catch (error) {
      console.error('Download failed:', error)
      toast({ title: "Download Failed", variant: "destructive" })
    }
  }

  const handleCopyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      // Convert blob to data URL for clipboard manager
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          await clipboardManager.writeImage(reader.result as string)
          toast({ title: "Copied", description: "Image copied to clipboard" })
        } catch {
          // Fallback: copy URL
          await clipboardManager.writeText(imageUrl)
          toast({ title: "URL Copied", description: "Image URL copied to clipboard" })
        }
      }
      reader.readAsDataURL(blob)
    } catch (error) {
      console.error('Copy failed:', error)
      // Fallback: copy URL
      await clipboardManager.writeText(imageUrl)
      toast({ title: "URL Copied", description: "Image URL copied to clipboard" })
    }
  }

  const handleSendToAnimator = async (imageUrl: string) => {
    await onSendToShotAnimator(imageUrl)
    setFullscreenImage(null)
  }

  const handleSendToLayout = (imageUrl: string) => {
    // Dispatch event to layout annotation
    window.dispatchEvent(new CustomEvent('send-to-layout', { detail: { imageUrl } }))
    toast({ title: "Sent to Layout", description: "Image added to Layout & Annotation" })
    setFullscreenImage(null)
  }

  // Handle removing background from reference image
  const handleRemoveBackground = useCallback(async (image: ShotImage) => {
    if (removingBackgroundId) return // Prevent multiple concurrent removals

    setRemovingBackgroundId(image.id)
    toast({
      title: "Removing Background",
      description: "Processing image... (3 pts)"
    })

    try {
      const response = await fetch('/api/tools/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: image.preview,
          saveToGallery: true // Save the result to gallery
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove background')
      }

      toast({
        title: "Background Removed!",
        description: "New image saved to gallery."
      })

      // Refresh gallery to show the new image
      setTimeout(async () => {
        await useUnifiedGalleryStore.getState().refreshGallery()
      }, 500)
    } catch (error) {
      console.error('Background removal error:', error)
      toast({
        title: "Remove Background Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setRemovingBackgroundId(null)
    }
  }, [removingBackgroundId, toast])

  // Handle saving reference image to gallery
  const handleSaveToGallery = useCallback(async (image: ShotImage) => {
    if (savingToGalleryId) return // Prevent multiple concurrent saves

    setSavingToGalleryId(image.id)
    toast({
      title: "Saving to Gallery",
      description: "Uploading image..."
    })

    try {
      // Convert image URL to base64 data URL
      const response = await fetch(image.preview)
      const blob = await response.blob()
      const reader = new FileReader()

      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      // Use the save-frame API to save to gallery
      const saveResponse = await fetch('/api/gallery/save-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64Data,
          metadata: {
            aspectRatio: image.detectedAspectRatio || '16:9',
            width: 1024,
            height: 576,
            row: 0,
            col: 0
          }
        })
      })

      const result = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(result.error || 'Failed to save to gallery')
      }

      toast({
        title: "Saved to Gallery!",
        description: "Reference image added to your gallery."
      })

      // Refresh gallery to show the new image
      setTimeout(async () => {
        await useUnifiedGalleryStore.getState().refreshGallery()
      }, 500)
    } catch (error) {
      console.error('Save to gallery error:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setSavingToGalleryId(null)
    }
  }, [savingToGalleryId, toast])

  if (compact) {
    return (
      <CreatorReferenceManagerCompact
        maxImages={maxImages}
        modelSelector={modelSelector}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Aspect Ratio Toggle */}
      {shotCreatorReferenceImages.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setUseNativeAspectRatio(!useNativeAspectRatio)}
            title={useNativeAspectRatio ? "Switch to square crop" : "Switch to native aspect ratio"}
          >
            {useNativeAspectRatio ? (
              <>
                <Square className="w-4 h-4 mr-1" />
                <span className="text-xs">Square</span>
              </>
            ) : (
              <>
                <RectangleHorizontal className="w-4 h-4 mr-1" />
                <span className="text-xs">Native</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Mobile-First Reference Image Layout */}
      <div className="space-y-8 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
        {Array.from({ length: visibleSlots }, (_, index) => index).map((index) => {
          const image = shotCreatorReferenceImages[index]
          const isEmpty = !image

          return (
            <ReferenceImageCard
              key={index}
              index={index}
              image={image}
              isEmpty={isEmpty}
              editingTagsId={editingTagsId}
              setEditingTagsId={setEditingTagsId}
              shotCreatorReferenceImages={shotCreatorReferenceImages}
              setShotCreatorReferenceImages={setShotCreatorReferenceImages}
              handleShotCreatorImageUpload={handleShotCreatorImageUpload}
              handleMultipleImageUpload={handleMultipleImageUpload}
              handlePasteImage={handlePasteImage}
              handleCameraCapture={handleCameraCapture}
              removeShotCreatorImage={removeShotCreatorImage}
              setFullscreenImage={setFullscreenImage}
              useNativeAspectRatio={useNativeAspectRatio}
              onRemoveBackground={handleRemoveBackground}
              onSaveToGallery={handleSaveToGallery}
              isRemovingBackground={removingBackgroundId === image?.id}
              isSavingToGallery={savingToGalleryId === image?.id}
            />
          )
        })}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-7xl max-h-screen w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 z-10"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="h-6 w-6 text-white" />
            </Button>

            {/* Image */}
            <Image
              src={fullscreenImage.preview}
              alt="Reference image fullscreen"
              width={1000}
              height={1000}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image info and actions overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4" onClick={(e) => e.stopPropagation()}>
              {/* Info row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white text-sm font-medium">
                    Reference Image
                  </p>
                  {fullscreenImage.detectedAspectRatio && (
                    <p className="text-zinc-400 text-xs mt-1">
                      Aspect Ratio: {fullscreenImage.detectedAspectRatio}
                    </p>
                  )}
                  {fullscreenImage.tags && fullscreenImage.tags.length > 0 && (
                    <p className="text-zinc-400 text-xs mt-1">
                      Tags: {fullscreenImage.tags.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleCopyImage(fullscreenImage.preview)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleDownload(fullscreenImage.preview)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleRemoveBackground(fullscreenImage)}
                  disabled={removingBackgroundId === fullscreenImage.id}
                >
                  {removingBackgroundId === fullscreenImage.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Eraser className="h-4 w-4 mr-1" />
                  )}
                  {removingBackgroundId === fullscreenImage.id ? 'Removing...' : 'Remove BG'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleSaveToGallery(fullscreenImage)}
                  disabled={savingToGalleryId === fullscreenImage.id}
                >
                  {savingToGalleryId === fullscreenImage.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  {savingToGalleryId === fullscreenImage.id ? 'Saving...' : 'Save to Gallery'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleSendToAnimator(fullscreenImage.preview)}
                >
                  <Film className="h-4 w-4 mr-1" />
                  Animator
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={() => handleSendToLayout(fullscreenImage.preview)}
                >
                  <Layout className="h-4 w-4 mr-1" />
                  Layout
                </Button>
              </div>

              {/* Delete button - separate row */}
              <div className="mt-3 pt-3 border-t border-zinc-700">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    removeShotCreatorImage(fullscreenImage.id)
                    setFullscreenImage(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove Reference
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}