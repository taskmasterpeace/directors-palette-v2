'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/utils'
import { ImageCard } from './ImageCard'
import { GalleryPagination } from './GalleryPagination'
import type { GeneratedImage, GridSize, SortBy } from '../../store/unified-gallery-store'
import type { FolderWithCount } from '../../types/folder.types'

interface ImageCardCallbacks {
  onSelect: (url: string, e?: React.MouseEvent) => void
  onZoom: (image: GeneratedImage) => void
  onCopy: (url: string) => void
  onDownload: (url: string) => void
  onDelete: (url: string) => void
  onSendTo?: (url: string, target: string) => void
  onSetReference: (image: GeneratedImage) => Promise<void>
  onEditReference: (image: GeneratedImage) => Promise<void>
  onAddToLibrary?: (image: GeneratedImage) => void
  onMoveToFolder: (imageId: string, folderId: string | null) => void
  onExtractFrames?: (image: GeneratedImage) => void
  onExtractFramesToGallery?: (image: GeneratedImage) => void
  onRemoveBackground: (image: GeneratedImage) => void
  onUpscale?: (image: GeneratedImage) => void
  onRetry: (image: GeneratedImage) => void
  onShare?: (image: GeneratedImage) => void
  onMakeFigurine?: (image: GeneratedImage) => void
  isGridImage: (image: GeneratedImage) => boolean
  removingBackgroundId: string | null
  upscalingId?: string | null
}

interface GalleryGridProps {
  images: GeneratedImage[]
  paginatedImages: GeneratedImage[]
  selectedImages: string[]
  isSelectionMode: boolean
  isMobile: boolean
  gridSize: GridSize
  useNativeAspectRatio: boolean
  showPrompts: boolean
  sortBy: SortBy
  folders: FolderWithCount[]
  hasMore: boolean
  isLoadingMore: boolean
  callbacks: ImageCardCallbacks
  onLoadMore: () => void
  onToggleFavorite: (imageId: string) => Promise<void>
}

// Grid size to CSS classes mapping
function getGridClasses(size: GridSize): string {
  switch (size) {
    case 'small':
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
    case 'medium':
      return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    case 'large':
      return 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    default:
      return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  }
}

// Date grouping helpers
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return 'This Week'

  // Show month + year
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function sortImages(images: GeneratedImage[], sortBy: SortBy): GeneratedImage[] {
  const sorted = [...images]
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => a.timestamp - b.timestamp)
    case 'model':
      return sorted.sort((a, b) => (a.model || '').localeCompare(b.model || '') || b.timestamp - a.timestamp)
    case 'newest':
    default:
      return sorted.sort((a, b) => b.timestamp - a.timestamp)
  }
}

function groupByDate(images: GeneratedImage[]): { label: string; images: GeneratedImage[] }[] {
  const groups: Map<string, GeneratedImage[]> = new Map()

  for (const image of images) {
    const dateStr = image.createdAt || image.metadata?.createdAt || new Date(image.timestamp).toISOString()
    const label = getDateLabel(dateStr)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(image)
  }

  return Array.from(groups.entries()).map(([label, imgs]) => ({ label, images: imgs }))
}

function renderImageCard(
  image: GeneratedImage,
  props: GalleryGridProps,
  includeShare: boolean
) {
  const { selectedImages, isSelectionMode, gridSize, useNativeAspectRatio, showPrompts, folders, callbacks, onToggleFavorite } = props

  return (
    <ImageCard
      key={image.id}
      image={image}
      isSelected={selectedImages.includes(image.url)}
      isSelectionMode={isSelectionMode}
      onSelect={(e) => e ? callbacks.onSelect(image.url, e) : callbacks.onSelect(image.url)}
      onZoom={() => callbacks.onZoom(image)}
      onCopy={() => callbacks.onCopy(image.url)}
      onDownload={() => callbacks.onDownload(image.url)}
      onDelete={() => callbacks.onDelete(image.url)}
      onSendTo={callbacks.onSendTo ? (target) => callbacks.onSendTo!(image.url, target) : undefined}
      onSetReference={() => callbacks.onSetReference(image)}
      onEditReference={() => callbacks.onEditReference(image)}
      onAddToLibrary={callbacks.onAddToLibrary ? () => callbacks.onAddToLibrary!(image) : undefined}
      onMoveToFolder={(folderId) => callbacks.onMoveToFolder(image.id, folderId)}
      onExtractFrames={callbacks.isGridImage(image) && callbacks.onExtractFrames ? () => callbacks.onExtractFrames!(image) : undefined}
      onExtractFramesToGallery={callbacks.isGridImage(image) && callbacks.onExtractFramesToGallery ? () => callbacks.onExtractFramesToGallery!(image) : undefined}
      onRemoveBackground={() => callbacks.onRemoveBackground(image)}
      isRemovingBackground={callbacks.removingBackgroundId === image.id}
      onUpscale={callbacks.onUpscale ? () => callbacks.onUpscale!(image) : undefined}
      isUpscaling={callbacks.upscalingId === image.id}
      currentFolderId={image.folderId}
      folders={folders}
      showActions={true}
      useNativeAspectRatio={useNativeAspectRatio}
      showPrompt={showPrompts}
      gridSize={gridSize}
      onRetry={() => callbacks.onRetry(image)}
      onShare={includeShare && callbacks.onShare ? () => callbacks.onShare!(image) : undefined}
      onMakeFigurine={callbacks.onMakeFigurine ? () => callbacks.onMakeFigurine!(image) : undefined}
      onToggleFavorite={() => onToggleFavorite(image.id)}
    />
  )
}

export function GalleryGrid(props: GalleryGridProps) {
  const { images, paginatedImages, isMobile, gridSize, sortBy, hasMore, isLoadingMore, onLoadMore } = props

  // Sort images
  const sortedImages = useMemo(() => sortImages(paginatedImages, sortBy), [paginatedImages, sortBy])

  // Group by date (only for newest/oldest sort — model sort skips date grouping)
  const dateGroups = useMemo(() => {
    if (sortBy === 'model') return null
    return groupByDate(sortedImages)
  }, [sortedImages, sortBy])

  const renderGrid = (imagesToRender: GeneratedImage[], includeShare: boolean) => (
    <div className={cn("grid gap-3", getGridClasses(gridSize))}>
      {imagesToRender.map((image) => renderImageCard(image, props, includeShare))}
    </div>
  )

  const renderGroupedContent = (includeShare: boolean) => {
    if (!dateGroups || dateGroups.length === 0) {
      return renderGrid(sortedImages, includeShare)
    }

    // If only one group, skip the header
    if (dateGroups.length === 1) {
      return renderGrid(dateGroups[0].images, includeShare)
    }

    return (
      <div className="space-y-6">
        {dateGroups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground/60">{group.images.length}</span>
            </div>
            {renderGrid(group.images, includeShare)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {isMobile ? (
        <div className="pb-4">
          {renderGroupedContent(true)}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {renderGroupedContent(false)}
        </ScrollArea>
      )}

      <GalleryPagination
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        totalLoaded={images.length}
        onLoadMore={onLoadMore}
      />
    </>
  )
}
