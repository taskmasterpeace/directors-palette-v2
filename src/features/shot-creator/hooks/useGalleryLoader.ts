/**
 * Hook to load gallery images from Supabase with real-time updates
 */

import { useEffect, useState, useRef } from 'react'
import { GalleryService } from '../services/gallery.service'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import { getClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    let lastError: unknown

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Don't retry on auth errors
            if (errorMessage.includes('Authentication failed')) {
                throw error
            }

            // Only retry on network errors
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_NETWORK')) {
                const delay = baseDelay * Math.pow(2, i)
                logger.shotCreator.info('Retrying gallery load', { attempt: i + 1, maxRetries, delay })
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
            }

            // Don't retry on other errors
            throw error
        }
    }

    throw lastError
}

export function useGalleryLoader() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Ref to prevent concurrent loads (React Strict Mode calls useEffect twice)
    const isLoadingRef = useRef(false)

    // Use direct selectors to ensure reactivity when store values change
    const loadImagesPaginated = useUnifiedGalleryStore(state => state.loadImagesPaginated)
    const loadFolders = useUnifiedGalleryStore(state => state.loadFolders)
    const currentPage = useUnifiedGalleryStore(state => state.currentPage)
    const pageSize = useUnifiedGalleryStore(state => state.pageSize)
    const currentFolderId = useUnifiedGalleryStore(state => state.currentFolderId)
    const searchQuery = useUnifiedGalleryStore(state => state.searchQuery)
    const setTotalDatabaseCount = useUnifiedGalleryStore(state => state.setTotalDatabaseCount)

    // Load gallery on mount and subscribe to real-time updates
    useEffect(() => {
        let mounted = true
        let subscription: { unsubscribe: () => void } | null = null

        const loadGallery = async () => {
            // Prevent concurrent loads (React Strict Mode double-invokes effects)
            if (!mounted || isLoadingRef.current) return
            isLoadingRef.current = true

            setIsLoading(true)
            setError(null)

            try {
                // Load folders first
                await loadFolders()

                // Fetch total database count and paginated images in parallel
                const [totalCount, paginatedResult] = await Promise.all([
                    GalleryService.getTotalImageCount(),
                    retryWithBackoff(() =>
                        GalleryService.loadUserGalleryPaginated(currentPage, pageSize, currentFolderId, { searchQuery: searchQuery || undefined })
                    )
                ])

                if (!mounted) return

                const { images, total, totalPages } = paginatedResult
                logger.shotCreator.info('Loaded gallery images', { count: images.length, total, totalPages, totalCount })
                setTotalDatabaseCount(totalCount)
                loadImagesPaginated(images, total, totalPages)

                // Set up real-time subscription to gallery changes
                const supabase = await getClient()
                if (supabase) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        subscription = supabase
                            .channel('gallery-changes')
                            .on(
                                'postgres_changes',
                                {
                                    event: '*',
                                    schema: 'public',
                                    table: 'gallery',
                                    filter: `user_id=eq.${user.id}`
                                },
                                async () => {
                                    try {
                                        // Reload gallery and total count when changes occur
                                        const [updatedTotalCount, paginatedUpdate] = await Promise.all([
                                            GalleryService.getTotalImageCount(),
                                            GalleryService.loadUserGalleryPaginated(currentPage, pageSize, currentFolderId, { searchQuery: searchQuery || undefined })
                                        ])

                                        if (mounted) {
                                            setTotalDatabaseCount(updatedTotalCount)
                                            loadImagesPaginated(paginatedUpdate.images, paginatedUpdate.total, paginatedUpdate.totalPages)
                                            // Reload folders to update counts
                                            await loadFolders()
                                        }
                                    } catch (realtimeError) {
                                        // Silently handle realtime update errors to prevent UI disruption
                                        logger.shotCreator.warn('Realtime gallery update failed (non-critical)', { realtimeError: realtimeError })
                                    }
                                }
                            )
                            .subscribe()
                    }
                }
            } catch (err) {
                if (!mounted) return

                const errorMessage = err instanceof Error ? err.message : 'Failed to load gallery'
                setError(errorMessage)
                logger.shotCreator.error('Gallery loading error', { error: err instanceof Error ? err.message : String(err) })
            } finally {
                isLoadingRef.current = false
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }

        loadGallery()

        return () => {
            mounted = false
            isLoadingRef.current = false
            if (subscription) {
                subscription.unsubscribe()
            }
        }
    }, [loadImagesPaginated, loadFolders, currentPage, pageSize, currentFolderId, searchQuery, setTotalDatabaseCount])

    return {
        isLoading,
        error,
    }
}
