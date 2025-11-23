/**
 * Hook to load gallery images from Supabase with real-time updates
 */

import { useEffect, useState } from 'react'
import { GalleryService } from '../services/gallery.service'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import { getClient } from '@/lib/db/client'

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
                console.log(`Retrying gallery load (${i + 1}/${maxRetries}) after ${delay}ms...`)
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
    const { loadImagesPaginated, currentPage, pageSize, setTotalDatabaseCount } = useUnifiedGalleryStore()

    // Load gallery on mount and subscribe to real-time updates
    useEffect(() => {
        let mounted = true
        let subscription: { unsubscribe: () => void } | null = null

        const loadGallery = async () => {
            if (!mounted) return

            setIsLoading(true)
            setError(null)

            try {
                // Fetch total database count and paginated images in parallel
                const [totalCount, paginatedResult] = await Promise.all([
                    GalleryService.getTotalImageCount(),
                    retryWithBackoff(() =>
                        GalleryService.loadUserGalleryPaginated(currentPage, pageSize)
                    )
                ])

                if (!mounted) return

                const { images, total, totalPages } = paginatedResult
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
                                            GalleryService.loadUserGalleryPaginated(currentPage, pageSize)
                                        ])

                                        if (mounted) {
                                            setTotalDatabaseCount(updatedTotalCount)
                                            loadImagesPaginated(paginatedUpdate.images, paginatedUpdate.total, paginatedUpdate.totalPages)
                                        }
                                    } catch (realtimeError) {
                                        // Silently handle realtime update errors to prevent UI disruption
                                        console.warn('Realtime gallery update failed (non-critical):', realtimeError)
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
                console.error('Gallery loading error:', err)
            } finally {
                if (mounted) {
                    setIsLoading(false)
                }
            }
        }

        loadGallery()

        return () => {
            mounted = false
            if (subscription) {
                subscription.unsubscribe()
            }
        }
    }, [loadImagesPaginated, currentPage, pageSize])

    return {
        isLoading,
        error,
    }
}
