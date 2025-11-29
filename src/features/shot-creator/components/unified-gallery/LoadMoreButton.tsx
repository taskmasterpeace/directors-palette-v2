'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LoadMoreButtonProps {
  onClick: () => void
  loading: boolean
  hasMore: boolean
  remainingCount?: number
}

/**
 * Load More button for infinite scroll
 * Shows different states based on loading/hasMore status
 */
export function LoadMoreButton({
  onClick,
  loading,
  hasMore,
  remainingCount
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <Button
        variant="outline"
        size="lg"
        disabled
        className="min-h-12 px-8"
      >
        All images loaded
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={loading}
      className="min-h-12 px-8 w-full sm:w-auto"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          Load More Images
          {remainingCount !== undefined && remainingCount > 0 && (
            <span className="ml-2 text-muted-foreground">({remainingCount})</span>
          )}
        </>
      )}
    </Button>
  )
}
