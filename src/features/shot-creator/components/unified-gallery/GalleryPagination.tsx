'use client'

import { LoadMoreButton } from './LoadMoreButton'

interface GalleryPaginationProps {
  hasMore: boolean
  isLoadingMore: boolean
  totalLoaded: number
  onLoadMore: () => void
}

export function GalleryPagination({ hasMore, isLoadingMore, totalLoaded, onLoadMore }: GalleryPaginationProps) {
  if (hasMore) {
    return (
      <div className="flex justify-center py-8">
        <LoadMoreButton
          onClick={onLoadMore}
          loading={isLoadingMore}
          hasMore={hasMore}
        />
      </div>
    )
  }

  if (totalLoaded > 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/50 text-muted-foreground text-sm">
          <span className="text-emerald-400">✓</span>
          All {totalLoaded} images loaded
        </div>
      </div>
    )
  }

  return null
}
