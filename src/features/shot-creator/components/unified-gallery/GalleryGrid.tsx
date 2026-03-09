'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/utils'
import { ImageCard } from './ImageCard'
import { GalleryPagination } from './GalleryPagination'
import type { GeneratedImage, GridSize } from '../../store/unified-gallery-store'
import type { FolderWithCount } from '../../types/folder.types'
export type { GridSize }

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
  onRetry: (image: GeneratedImage) => void
  onShare?: (image: GeneratedImage) => void
  isGridImage: (image: GeneratedImage) => boolean
  removingBackgroundId: string | null
}

interface GalleryGridProps {
  images: GeneratedImage[]
  paginatedImages: GeneratedImage[]
  selectedImages: string[]
  isSelectionMode: boolean
  isMobile: boolean
  gridSize: GridSize
  useNativeAspectRatio: boolean
  folders: FolderWithCount[]
  hasMore: boolean
  isLoadingMore: boolean
  callbacks: ImageCardCallbacks
  onLoadMore: () => void
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

function renderImageCard(
  image: GeneratedImage,
  props: GalleryGridProps,
  includeShare: boolean
) {
  const { selectedImages, isSelectionMode, gridSize, useNativeAspectRatio, folders, callbacks } = props

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
      currentFolderId={image.folderId}
      folders={folders}
      showActions={true}
      useNativeAspectRatio={useNativeAspectRatio}
      gridSize={gridSize}
      onRetry={() => callbacks.onRetry(image)}
      onShare={includeShare && callbacks.onShare ? () => callbacks.onShare!(image) : undefined}
    />
  )
}

export function GalleryGrid(props: GalleryGridProps) {
  const { images, paginatedImages, isMobile, gridSize, hasMore, isLoadingMore, onLoadMore } = props

  return (
    <>
      {isMobile ? (
        <div className={cn("grid gap-4 pb-4", getGridClasses(gridSize))}>
          {paginatedImages.map((image) => renderImageCard(image, props, true))}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className={cn("grid gap-4", getGridClasses(gridSize))}>
            {paginatedImages.map((image) => renderImageCard(image, props, false))}
          </div>
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
