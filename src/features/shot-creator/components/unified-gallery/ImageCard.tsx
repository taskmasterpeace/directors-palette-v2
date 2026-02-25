'use client'

import { useState, memo } from 'react'
import Image from "next/image"
import type { GeneratedImage } from "../../store/unified-gallery-store"
import type { FolderWithCount } from "../../types/folder.types"
import { useImageActions } from "../../hooks/useImageActions"
import { ImageActionMenu } from "./ImageActionMenu"
import { ModelBadge } from "./ModelBadge"
import { ReferenceBadge } from "./ReferenceBadge"
import { SourceBadge } from "./SourceBadge"
import { MetadataBar } from "./MetadataBar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/utils/utils"
import type { GridSize } from "../../store/unified-gallery-store"
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClapperboardSpinner } from "./ClapperboardSpinner"

interface ImageCardProps {
  image: GeneratedImage
  isSelected: boolean
  /** When true, checkboxes are always visible (not just on hover) */
  isSelectionMode?: boolean
  onSelect: (event?: React.MouseEvent) => void
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
  onRetry?: () => void
}

/**
 * Image card component for gallery display
 * Displays image with overlays, badges, and action menu
 * Memoized to prevent unnecessary re-renders in large galleries
 */
const ImageCardComponent = ({
  image,
  isSelected,
  isSelectionMode = false,
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
  gridSize = 'medium',
  onRetry
}: ImageCardProps) => {
  const { handleCopyPrompt, handleCopyImage } = useImageActions()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)

  // Check if image is still loading (pending/processing status)
  const isLoading = image.status === 'pending' || image.status === 'processing'
  const hasFailed = image.status === 'failed' || imageLoadError
  // Note: completed state is the default render path (no explicit check needed)

  // Render loading state — clapperboard spinner with countdown
  if (isLoading) {
    return (
      <div className="relative group rounded-lg overflow-hidden bg-card border border-border">
        <div className={cn(
          "w-full relative flex flex-col items-center justify-center",
          useNativeAspectRatio ? "aspect-video" : "aspect-square"
        )}>
          <ClapperboardSpinner model={image.model} prompt={image.prompt} />
        </div>
        <ModelBadge model={image.model} />
      </div>
    )
  }

  // Render failed/error state
  if (hasFailed) {
    const isLoadError = imageLoadError && image.status !== 'failed'
    return (
      <div className="relative group rounded-lg overflow-hidden bg-card border-2 border-red-500/50">
        <div className={cn(
          "w-full relative flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-background to-red-950/30 p-3",
          useNativeAspectRatio ? "aspect-video" : "aspect-square"
        )}>
          <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 mt-2 font-medium text-center">
            {isLoadError ? 'Unavailable' : 'Failed'}
          </p>
          {image.metadata?.error && !isLoadError && (
            <p className="text-xs text-muted-foreground mt-1 px-2 text-center line-clamp-1">
              {image.metadata.error}
            </p>
          )}
          {/* Action buttons - always visible */}
          <div className="flex gap-2 mt-3 flex-shrink-0">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs h-8 px-2 border-violet-500/50 hover:bg-violet-500/20 bg-violet-500/10"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-xs h-8 px-2 border-red-500/50 hover:bg-red-500/20 bg-red-500/10 text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
        {/* Model badge for failed state */}
        <ModelBadge model={image.model} />
      </div>
    )
  }

  // Render completed state (normal image)
  return (
    <div className={`relative group rounded-lg overflow-hidden bg-card border transition-all ${isSelected ? 'border-primary border-2' : 'border-border hover:border-primary/50'}`}>
      {/* Selection Checkbox - always visible in selection mode, otherwise show on hover/selected */}
      <div className={cn(
        "absolute top-2 left-2 z-10 transition-opacity",
        isSelectionMode || isSelected
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100'
      )}>
        <Checkbox
          checked={isSelected}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onSelect(e)
          }}
          onCheckedChange={() => {
            // Selection is handled by onClick to capture modifier keys
          }}
          className={cn(
            "bg-background/80 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary",
            isSelectionMode && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
          )}
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
          onError={() => setImageLoadError(true)}
        />
      </div>

      {/* Model icon badge */}
      <ModelBadge model={image.model} />

      {/* Reference badge if exists */}
      <ReferenceBadge reference={image.reference || ''} />

      {/* Source badge (shows which module generated the image) */}
      <SourceBadge source={image.source} />

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
    prevProps.image.status === nextProps.image.status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.useNativeAspectRatio === nextProps.useNativeAspectRatio &&
    prevProps.gridSize === nextProps.gridSize
  )
})
