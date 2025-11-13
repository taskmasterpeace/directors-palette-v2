'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Trash2,
  Plus,
  X,
} from 'lucide-react'
import Image from "next/image"
import CreatorReferenceManagerCompact from "./CreatorReferenceManagerCompact"
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { ReferenceImageCard } from "./ReferenceImageCard"

interface CreatorReferenceManagerProps {
  compact?: boolean
  maxImages?: number
  editingMode?: boolean
}

export function CreatorReferenceManager({
  compact = false,
  maxImages = 3,
  editingMode = false
}: CreatorReferenceManagerProps) {
  const { shotCreatorReferenceImages, setShotCreatorReferenceImages } = useShotCreatorStore()
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)

  const {
    visibleSlots,
    fullscreenImage,
    setFullscreenImage,
    handleShotCreatorImageUpload,
    handlePasteImage,
    handleCameraCapture,
    removeShotCreatorImage
  } = useReferenceImageManager(maxImages)

  if (compact) {
    return (
      <CreatorReferenceManagerCompact
        maxImages={maxImages}
        editingMode={editingMode}
      />
    )
  }

  return (
    <div className="space-y-6">
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
              handlePasteImage={handlePasteImage}
              handleCameraCapture={handleCameraCapture}
              removeShotCreatorImage={removeShotCreatorImage}
              setFullscreenImage={setFullscreenImage}
            />
          )
        })}
      </div>

      {/* Progressive Disclosure Indicator */}
      {visibleSlots < maxImages && shotCreatorReferenceImages.length >= visibleSlots - 1 && (
        <div className="text-center py-3 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            <Plus className="w-4 h-4 mx-auto mb-1" />
            <span className="font-medium">
              {maxImages - visibleSlots} more slots available
            </span>
            <br />
            <span className="text-xs">
              Fill current slots to expand automatically
            </span>
          </div>
        </div>
      )}


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

            {/* Image info overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">
                    Reference Image
                  </p>
                  {fullscreenImage.detectedAspectRatio && (
                    <p className="text-slate-300 text-xs mt-1">
                      Aspect Ratio: {fullscreenImage.detectedAspectRatio}
                    </p>
                  )}
                  {fullscreenImage.tags && fullscreenImage.tags.length > 0 && (
                    <p className="text-slate-300 text-xs mt-1">
                      Tags: {fullscreenImage.tags.join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeShotCreatorImage(fullscreenImage.id)
                    setFullscreenImage(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}