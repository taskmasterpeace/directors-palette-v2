'use client'

import { useState, memo } from 'react'
import Image from "next/image"
import type { GeneratedImage } from "../../store/unified-gallery-store"
import type { FolderWithCount } from "../../types/folder.types"
import { useImageActions } from "../../hooks/useImageActions"
import { ImageActionMenu } from "./ImageActionMenu"
import { ModelBadge } from "./ModelBadge"
import { ReferenceBadge } from "./ReferenceBadge"
import { MetadataBar } from "./MetadataBar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/utils/utils"
import type { GridSize } from "../../store/unified-gallery-store"

interface ImageCardProps {
  image: GeneratedImage
  isSelected: boolean
  onSelect: () => void
  onZoom: () => void
  onCopy: () => void
  onDownload: () => void
  onDelete: () => void
  onSendTo?: (target: string) => void
  onSetReference?: () => void
  onEditReference?: () => void
  onAddToLibrary?: () => void
  onMoveToFolder?: (folderId: string | null) => void
  onExtractFrames?: () => void
  onExtractFramesToGallery?: () => void
  onRemoveBackground?: () => void
  isRemovingBackground?: boolean
  currentFolderId?: string | null
  folders?: FolderWithCount[]
  showActions?: boolean
  useNativeAspectRatio?: boolean
  gridSize?: GridSize
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
  onEditReference,
  onAddToLibrary,
  onMoveToFolder,
  onExtractFrames,
  onExtractFramesToGallery,
  onRemoveBackground,
  isRemovingBackground,
  currentFolderId,
  folders = [],
  showActions = true,
  useNativeAspectRatio = false,
  gridSize = 'medium'
}: ImageCardProps) => {
  const { handleCopyPrompt, handleCopyImage } = useImageActions()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-card border transition-all ${isSelected ? 'border-primary border-2' : 'border-border hover:border-primary/50'}`}>
      {/* Selection Checkbox */}
      <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="bg-background/80 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Main image - toggle between square and native aspect ratio */}
      <div className={cn(
        "w-full relative",
        useNativeAspectRatio ? "aspect-video" : "aspect-square"
      )}>
        <Image
          src={image.url}
          alt={image.prompt?.slice(0, 50) || 'Generated image'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw"
          quality={100}
          className={cn(
            "cursor-zoom-in",
            useNativeAspectRatio ? "object-contain" : "object-cover"
          )}
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
            currentReference={image.reference}
            currentFolderId={currentFolderId}
            folders={folders}
            onCopyPrompt={() => handleCopyPrompt(image.prompt)}
            onCopyImage={() => handleCopyImage(image.url)}
            onDownload={onDownload}
            onDelete={onDelete}
            onSendTo={onSendTo}
            onSetReference={onSetReference}
            onEditReference={onEditReference}
            onAddToLibrary={onAddToLibrary}
            onMoveToFolder={onMoveToFolder}
            onExtractFrames={onExtractFrames}
            onExtractFramesToGallery={onExtractFramesToGallery}
            onRemoveBackground={onRemoveBackground}
            isRemovingBackground={isRemovingBackground}
            dropdownOpen={dropdownOpen}
            onDropdownChange={setDropdownOpen}
          />
        </div>
      )}

      {/* Metadata bar - shows aspect ratio & resolution on hover */}
      <MetadataBar
        aspectRatio={image.settings.aspectRatio || image.settings.aspect_ratio || '16:9'}
        resolution={image.settings.resolution || '1024x1024'}
        gridSize={gridSize}
      />
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
    prevProps.showActions === nextProps.showActions &&
    prevProps.useNativeAspectRatio === nextProps.useNativeAspectRatio &&
    prevProps.gridSize === nextProps.gridSize
  )
})
