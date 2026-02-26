/**
 * Hook to manage video gallery with real-time updates
 * Loads videos from the database and subscribes to changes
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getClient } from '@/lib/db/client'
import { GalleryService } from '@/lib/services/gallery.service'
import { VideoGalleryService } from '../services/gallery.service'
import type { GeneratedVideo } from '../types'
import { GalleryRow } from '@/lib/db/types'
import { logger } from '@/lib/logger'

const GALLERY_POLL_INTERVAL_MS = 30_000 // 30 seconds

interface UseGalleryReturn {
  videos: GeneratedVideo[]
  galleryImages: GalleryRow[]
  isLoading: boolean
  error: string | null
  deleteVideo: (videoId: string) => Promise<boolean>
  refreshVideos: () => Promise<void>
  // Pagination support
  currentPage: number
  totalPages: number
  totalCount: number
  loadPage: (page: number) => Promise<void>
  pageSize: number
}

export function useGallery(enablePagination = false, itemsPerPage = 12): UseGalleryReturn {
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [galleryImages, setGalleryImages] = useState<GalleryRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = itemsPerPage

  /**
   * Load videos from the database
   */
  const loadVideos = useCallback(async () => {
    try {
      const loadedVideos = await VideoGalleryService.loadUserVideos()
      setVideos(loadedVideos)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load videos'
      setError(errorMessage)
      logger.shotCreator.error('Video gallery loading error', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  /**
   * Load images from the database
   */
  const loadImages = useCallback(async (page = 1) => {
    try {
      if (enablePagination) {
        const result = await VideoGalleryService.loadUserImagesPaginated(page, pageSize)
        setGalleryImages(result.items)
        setTotalPages(result.totalPages)
        setTotalCount(result.total)
        setCurrentPage(page)
      } else {
        const loadedImages = await VideoGalleryService.loadUserImages()
        setGalleryImages(loadedImages)
        setTotalCount(loadedImages.length)
        setTotalPages(1)
      }
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load images'
      setError(errorMessage)
      logger.shotCreator.error('Image gallery loading error', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [enablePagination, pageSize])

  /**
   * Load a specific page of images
   */
  const loadPage = useCallback(async (page: number) => {
    if (!enablePagination) return

    setIsLoading(true)
    await loadImages(page)
    setIsLoading(false)
  }, [enablePagination, loadImages])

  /**
   * Delete a video from the gallery
   */
  const deleteVideo = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      const result = await VideoGalleryService.deleteVideo(videoId)
      
      if (result.success) {
        // Optimistically update the UI
        setVideos((prev) => prev.filter((video) => video.id !== videoId))
        return true
      } else {
        setError(result.error || 'Failed to delete video')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete video'
      setError(errorMessage)
      logger.shotCreator.error('Delete video error', { error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }, [])

  /**
   * Manually refresh videos
   */
  const refreshVideos = useCallback(async () => {
    setIsLoading(true)
    await loadVideos()
    setIsLoading(false)
  }, [loadVideos])

  // Load videos on mount and set up real-time subscription
  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initializeGallery = async () => {
      if (!mounted) return

      setIsLoading(true)
      setError(null)

      try {
        // Initial load
        await loadVideos()
        // Set up real-time subscription to gallery changes
        const supabase = await getClient()
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            subscription = supabase
              .channel(`video-gallery-${user.id}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'gallery',
                  filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                  logger.shotCreator.info('Gallery change detected', { payload: payload })

                  if (mounted) {
                    await loadVideos()
                  }
                }
              )
              .subscribe()
          }
        }
      } catch (err) {
        if (!mounted) return

        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize gallery'
        setError(errorMessage)
        logger.shotCreator.error('Gallery initialization error', { error: err instanceof Error ? err.message : String(err) })
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeGallery()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [loadVideos])

  // ---- Polling fallback for the gallery ----
  // If the Supabase real-time subscription fails (auth issues, network),
  // we still want the gallery to pick up newly completed videos.
  // This effect checks whether there are pending/processing items in the
  // database. If there are, it re-fetches the gallery every 30s until
  // nothing is pending any longer.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true

    const checkAndPoll = async () => {
      try {
        const pendingCount = await GalleryService.getPendingCount('video')

        if (!mounted) return

        if (pendingCount > 0 && !pollingRef.current) {
          // Start polling -- there are processing items the subscription may miss
          logger.shotCreator.info('Pending videos detected, starting poll fallback', { pendingCount })

          pollingRef.current = setInterval(async () => {
            if (!mounted) return

            try {
              const stillPending = await GalleryService.getPendingCount('video')
              // Always reload so we pick up any newly completed items
              await loadVideos()

              if (stillPending === 0) {
                // Nothing left to wait for -- stop polling
                logger.shotCreator.info('[useGallery] no more pending videos, stopping poll fallback')
                if (pollingRef.current) {
                  clearInterval(pollingRef.current)
                  pollingRef.current = null
                }
              }
            } catch {
              // Non-fatal; will retry next tick
            }
          }, GALLERY_POLL_INTERVAL_MS)
        } else if (pendingCount === 0 && pollingRef.current) {
          // Nothing pending any more -- clean up
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } catch {
        // Ignore errors during the pending-count check
      }
    }

    // Check once on mount and whenever videos change (a generation was
    // submitted, which adds a pending row).
    checkAndPoll()

    return () => {
      mounted = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [videos, loadVideos])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  return {
    videos,
    galleryImages,
    isLoading,
    error,
    deleteVideo,
    refreshVideos,
    currentPage,
    totalPages,
    totalCount,
    loadPage,
    pageSize,
  }
}
