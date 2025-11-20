'use client'

import { useState, memo } from 'react'
import Image from "next/image"
import type { GalleryImage } from "../../types"
import { useImageActions } from "../../hooks/useImageActions"
import { ImageActionMenu } from "./ImageActionMenu"
import { ModelBadge } from "./ModelBadge"
import { ReferenceBadge } from "./ReferenceBadge"
import { PromptTooltip } from "./PromptTooltip"
import { Checkbox } from "@/components/ui/checkbox"

interface ImageCardProps {
  image: GalleryImage
  isSelected: boolean
  onSelect: () => void
  onZoom: () => void
  onCopy: () => void
  onDownload: () => void
  onDelete: () => void
  onSendTo?: (target: string) => void
  onSetReference?: () => void
  onAddToLibrary?: () => void
  showActions?: boolean
}

/**
 * Image card component for gallery display
 * Displays image with overlays, badges, and action menu
 * Memoized to prevent unnecessary re-renders in large galleries
 */
const ImageCardComponent = ({
  image,
  isSelected,
  onSelect,
  onZoom,
  onDownload,
  onDelete,
  onSendTo,
  onSetReference,
  onAddToLibrary,
  showActions = true
}: ImageCardProps) => {
  const { handleCopyPrompt, handleCopyImage } = useImageActions()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-slate-800 border transition-all ${isSelected ? 'border-red-500 border-2' : 'border-slate-700 hover:border-red-600/50'}`}>
      {/* Selection Checkbox */}
      <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="bg-slate-900/80 border-slate-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
        />
      </div>

      {/* Main image - show in native aspect ratio */}
      <div className="w-full aspect-square relative">
        <Image
          src={image.url}
          alt={image.prompt?.slice(0, 50) || 'Generated image'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw"
          className="object-cover cursor-zoom-in"
          onClick={onZoom}
        />
      </div>

      {/* Model icon badge */}
      <ModelBadge model={image.model} />

      {/* Reference badge if exists */}
      <ReferenceBadge reference={image.reference || ''} />

      {/* Action menu button - always visible on mobile, hover on desktop */}
      {showActions && (
        <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <ImageActionMenu
            imageUrl={image.url}
            prompt={image.prompt}
            onCopyPrompt={() => handleCopyPrompt(image.prompt)}
            onCopyImage={() => handleCopyImage(image.url)}
            onDownload={onDownload}
            onDelete={onDelete}
            onSendTo={onSendTo}
            onSetReference={onSetReference}
            onAddToLibrary={onAddToLibrary}
            dropdownOpen={dropdownOpen}
            onDropdownChange={setDropdownOpen}
          />
        </div>
      )}

      {/* Hover tooltip with prompt */}
      <PromptTooltip prompt={image.prompt} />
    </div>
  )
}

// Memoize component with custom comparison function
// Only re-render if image data or selection state changes
export const ImageCard = memo(ImageCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.url === nextProps.image.url &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.showActions === nextProps.showActions
  )
})
