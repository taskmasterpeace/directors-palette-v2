'use client'

import { ImageIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface GalleryEmptyStateProps {
  isLoading: boolean
  hasImages: boolean
}

export function GalleryEmptyState({ isLoading, hasImages }: GalleryEmptyStateProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" color="accent" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Loading gallery...</p>
      </div>
    )
  }

  if (!hasImages) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No images generated yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start creating images in Shot Creator to see them here
        </p>
      </div>
    )
  }

  return null
}
