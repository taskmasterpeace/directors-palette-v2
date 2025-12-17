'use client'

import React, { useMemo } from 'react'
import { RefreshCw, Star, Sparkles, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommunityFilters } from './CommunityFilters'
import { CommunityGrid } from './CommunityGrid'
import { CommunityCard } from './CommunityCard'
import { useCommunity } from '../hooks/useCommunity'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { CommunityItemType } from '../types/community.types'

const TYPE_LABELS: Record<CommunityItemType, string> = {
  wildcard: 'Wildcard',
  recipe: 'Recipe',
  prompt: 'Prompt',
  director: 'Director',
}

export function CommunityPage() {
  const { toast } = useToast()
  const {
    items,
    filters,
    isLoading,
    error,
    isInitialized,
    isInLibrary,
    getUserRating,
    addToLibrary,
    rateItem,
    refresh,
    setTypeFilter,
    setCategoryFilter,
    setSearchFilter,
    setSortBy,
    clearError,
  } = useCommunity()

  // Separate featured items by type
  const featuredByType = useMemo(() => {
    const featured = items.filter(item => item.isFeatured)
    return {
      wildcard: featured.find(i => i.type === 'wildcard'),
      recipe: featured.find(i => i.type === 'recipe'),
      prompt: featured.find(i => i.type === 'prompt'),
      director: featured.find(i => i.type === 'director'),
    }
  }, [items])

  const hasFeatured = Object.values(featuredByType).some(Boolean)

  // Non-featured items for the grid
  const regularItems = useMemo(() => {
    return items.filter(item => !item.isFeatured)
  }, [items])

  // Handle add to library
  const handleAdd = async (itemId: string): Promise<boolean> => {
    const success = await addToLibrary(itemId)
    if (success) {
      toast({
        title: 'Added to Library',
        description: 'Item has been added to your library.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add item to library.',
        variant: 'destructive',
      })
    }
    return success
  }

  // Handle rate item
  const handleRate = async (itemId: string, rating: number): Promise<boolean> => {
    const success = await rateItem(itemId, rating)
    if (success) {
      toast({
        title: 'Rating Saved',
        description: `You rated this item ${rating} star${rating > 1 ? 's' : ''}.`,
      })
    }
    return success
  }

  // Check if it's a schema cache error (tables not available)
  const isSchemaError = error?.includes('schema cache') || error?.includes('PGRST205')

  // Show error toast only for non-schema errors
  React.useEffect(() => {
    if (error && !isSchemaError) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
      clearError()
    }
  }, [error, toast, clearError, isSchemaError])

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show schema error message if tables aren't available
  if (isSchemaError) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Setup Required Message */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md space-y-4">
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <Database className="h-5 w-5 text-amber-500" />
              <AlertTitle className="text-amber-400">Community Setup Required</AlertTitle>
              <AlertDescription className="text-muted-foreground mt-2">
                <p className="mb-3">
                  The Community feature requires database tables that need to be refreshed in Supabase.
                </p>
                <p className="text-sm mb-3">
                  <strong>To fix this:</strong>
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1 mb-4">
                  <li>Go to Supabase Dashboard</li>
                  <li>Navigate to Settings → API</li>
                  <li>Click &quot;Reload schema&quot; button</li>
                  <li>Come back and refresh this page</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 flex items-center gap-4">
        <div className="flex-1">
          <CommunityFilters
          filters={filters}
          onTypeChange={setTypeFilter}
          onCategoryChange={setCategoryFilter}
          onSearchChange={setSearchFilter}
          onSortChange={setSortBy}
        />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Featured Section */}
        {hasFeatured && filters.type === 'all' && !filters.search && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-white">Featured</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['wildcard', 'recipe', 'prompt', 'director'] as const).map((type) => {
                const item = featuredByType[type]
                if (!item) return null
                return (
                  <div key={type} className="relative">
                    <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 bg-amber-500 text-black text-xs font-medium px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      Featured {TYPE_LABELS[type]}
                    </div>
                    <CommunityCard
                      item={item}
                      isInLibrary={isInLibrary(item.id)}
                      userRating={getUserRating(item.id)}
                      onAdd={() => handleAdd(item.id)}
                      onRate={(rating) => handleRate(item.id, rating)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Items Grid */}
        <div>
          {hasFeatured && filters.type === 'all' && !filters.search && (
            <h2 className="text-lg font-semibold text-white mb-4">All Items</h2>
          )}
          <CommunityGrid
            items={regularItems}
            isLoading={isLoading}
            isInLibrary={isInLibrary}
            getUserRating={getUserRating}
            onAdd={handleAdd}
            onRate={handleRate}
          />
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-border/50 bg-muted/20 text-center">
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''} in community
        </p>
      </div>
    </div>
  )
}
