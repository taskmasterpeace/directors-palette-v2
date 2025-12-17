/**
 * useCommunity Hook
 * React hook for community feature interactions
 */

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useCommunityStore } from '../store/community.store'
import type { CommunityFilters, CommunityItemType } from '../types/community.types'

export function useCommunity() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

  const {
    items,
    libraryItemIds,
    userRatings,
    filters,
    isLoading,
    error,
    selectedItem,
    fetchItems,
    fetchLibraryItemIds,
    fetchUserRatings,
    addToLibrary: addToLibraryAction,
    rateItem: rateItemAction,
    setFilters,
    setSelectedItem,
    clearError,
  } = useCommunityStore()

  // Initialize user and fetch data
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setUserName(data.user.user_metadata?.full_name || data.user.email || 'Anonymous')

        // Fetch user-specific data
        fetchLibraryItemIds(data.user.id)
        fetchUserRatings(data.user.id)
      }
      setIsInitialized(true)
    })

    // Fetch community items
    fetchItems()
  }, [fetchItems, fetchLibraryItemIds, fetchUserRatings])

  // Check if item is in user's library
  const isInLibrary = useCallback((itemId: string): boolean => {
    return libraryItemIds.has(itemId)
  }, [libraryItemIds])

  // Get user's rating for an item
  const getUserRating = useCallback((itemId: string): number | null => {
    return userRatings.get(itemId) || null
  }, [userRatings])

  // Add item to library
  const addToLibrary = useCallback(async (itemId: string): Promise<boolean> => {
    if (!userId) return false
    return addToLibraryAction(itemId, userId)
  }, [userId, addToLibraryAction])

  // Rate an item
  const rateItem = useCallback(async (itemId: string, rating: number): Promise<boolean> => {
    if (!userId) return false
    return rateItemAction(itemId, userId, rating)
  }, [userId, rateItemAction])

  // Filter helpers
  const setTypeFilter = useCallback((type: CommunityItemType | 'all') => {
    setFilters({ type })
  }, [setFilters])

  const setCategoryFilter = useCallback((category: string | undefined) => {
    setFilters({ category })
  }, [setFilters])

  const setSearchFilter = useCallback((search: string | undefined) => {
    setFilters({ search })
  }, [setFilters])

  const setSortBy = useCallback((sortBy: CommunityFilters['sortBy']) => {
    setFilters({ sortBy })
  }, [setFilters])

  // Refresh items
  const refresh = useCallback(() => {
    fetchItems()
    if (userId) {
      fetchLibraryItemIds(userId)
      fetchUserRatings(userId)
    }
  }, [fetchItems, fetchLibraryItemIds, fetchUserRatings, userId])

  return {
    // Data
    items,
    filters,
    isLoading,
    error,
    selectedItem,
    isInitialized,
    userId,
    userName,

    // Item checks
    isInLibrary,
    getUserRating,

    // Actions
    addToLibrary,
    rateItem,
    setSelectedItem,
    clearError,
    refresh,

    // Filter actions
    setTypeFilter,
    setCategoryFilter,
    setSearchFilter,
    setSortBy,
  }
}
