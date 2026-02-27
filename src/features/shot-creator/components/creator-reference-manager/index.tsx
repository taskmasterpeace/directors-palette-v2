'use client'

import { useState, ReactNode, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  RectangleHorizontal,
  Square,
} from 'lucide-react'
import CreatorReferenceManagerCompact from "./CreatorReferenceManagerCompact"
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { ReferenceImageCard, type ShotImage } from "./ReferenceImageCard"
import { useToast } from "@/hooks/use-toast"
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"
import { createReference } from "../../services/reference-library.service"
import { logger } from '@/lib/logger'

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
  const { shotCreatorReferenceImages, setShotCreatorReferenceImages, useNativeAspectRatio, setUseNativeAspectRatio } = useShotCreatorStore()
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)
  const [removingBackgroundId, setRemovingBackgroundId] = useState<string | null>(null)
  const [savingToGalleryId, setSavingToGalleryId] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    visibleSlots,
    handleShotCreatorImageUpload,
    handleMultipleImageUpload,
    handlePasteImage,
    handleCameraCapture,
    removeShotCreatorImage
  } = useReferenceImageManager(maxImages)

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
      logger.shotCreator.error('Background removal error', { error: error instanceof Error ? error.message : String(error) })
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

      // Auto-add to reference library if image has tags
      if (image.tags && image.tags.length > 0 && result.galleryId) {
        const { error: refError } = await createReference(result.galleryId, 'unorganized', image.tags)
        if (refError) {
          logger.shotCreator.error('Auto-add to reference library failed', { error: refError.message })
        }
      }

      const addedToLibrary = image.tags && image.tags.length > 0 && result.galleryId
      toast({
        title: "Saved to Gallery!",
        description: addedToLibrary
          ? "Image added to gallery and reference library."
          : "Reference image added to your gallery."
      })

      // Refresh gallery to show the new image
      setTimeout(async () => {
        await useUnifiedGalleryStore.getState().refreshGallery()
      }, 500)
    } catch (error) {
      logger.shotCreator.error('Save to gallery error', { error: error instanceof Error ? error.message : String(error) })
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
              useNativeAspectRatio={useNativeAspectRatio}
              onRemoveBackground={handleRemoveBackground}
              onSaveToGallery={handleSaveToGallery}
              isRemovingBackground={removingBackgroundId === image?.id}
              isSavingToGallery={savingToGalleryId === image?.id}
            />
          )
        })}
      </div>
    </div>
  )
}