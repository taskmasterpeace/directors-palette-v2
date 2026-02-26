/**
 * Polling fallback for video generation status.
 *
 * The shot-animator relies on Supabase real-time subscriptions to know when
 * a video finishes processing. If the subscription fails to connect (auth
 * issues, network blip, etc.) the UI never learns that videos are done and
 * shots stay stuck on "Processing" forever.
 *
 * This hook adds a periodic poll that:
 *  - Only runs when there are gallery items with status "processing"
 *  - Queries the database directly for the current status of those items
 *  - Updates the store with any completed / failed transitions
 *  - Stops automatically once nothing is processing
 *  - Cleans up on unmount
 *  - Does NOT interfere with the real-time subscription (additive only)
 */

import { useEffect, useRef } from 'react'
import { getClient } from '@/lib/db/client'
import type { ShotAnimationConfig } from '../types'
import { logger } from '@/lib/logger'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

interface UseVideoPollingOptions {
  /** Current shot configs (used to find processing gallery IDs) */
  shotConfigs: ShotAnimationConfig[]
  /** Setter to apply updated configs to the store */
  setShotConfigs: (configs: ShotAnimationConfig[]) => void
  /** Whether the user is authenticated (skip polling if not) */
  enabled: boolean
}

/**
 * Periodically polls Supabase for the latest status of any gallery items
 * that are currently marked as "processing" in the local shot configs.
 *
 * Mirrors the same update logic used by the real-time subscription in
 * ShotAnimatorView so that the two mechanisms are interchangeable.
 */
export function useVideoPolling({
  shotConfigs,
  setShotConfigs,
  enabled,
}: UseVideoPollingOptions) {
  // Keep a ref so the interval callback always reads the latest configs
  // without needing to re-create the interval on every render.
  const shotConfigsRef = useRef(shotConfigs)
  shotConfigsRef.current = shotConfigs

  // Stable ref for setShotConfigs (zustand setters are stable, but belt-and-suspenders)
  const setShotConfigsRef = useRef(setShotConfigs)
  setShotConfigsRef.current = setShotConfigs

  // Collect the sorted, comma-joined list of processing gallery IDs so we
  // can use it as a dependency -- the effect only re-runs when the set of
  // IDs actually changes.
  const processingIds = useRef<string[]>([])
  const ids: string[] = []
  for (const config of shotConfigs) {
    for (const video of config.generatedVideos ?? []) {
      if (video.status === 'processing' || video.status === 'pending') {
        ids.push(video.galleryId)
      }
    }
  }
  ids.sort()
  const processingKey = ids.join(',')
  processingIds.current = ids

  useEffect(() => {
    // Nothing to poll -- bail out and don't start an interval.
    if (!enabled || !processingKey) return

    const poll = async () => {
      const galleryIds = processingIds.current
      if (galleryIds.length === 0) return

      try {
        const supabase = await getClient()
        if (!supabase) return

        const { data, error } = await supabase
          .from('gallery')
          .select('id, public_url, status, metadata')
          .in('id', galleryIds)

        if (error) {
          logger.shotCreator.warn('[useVideoPolling] query error', { message: error.message })
          return
        }
        if (!data || data.length === 0) return

        // Build a lookup for quick access
        const recordMap = new Map<
          string,
          { id: string; public_url: string | null; status: string | null; metadata: Record<string, unknown> | null }
        >()
        for (const row of data) {
          recordMap.set(row.id, {
            id: row.id,
            public_url: row.public_url,
            status: row.status,
            metadata: row.metadata as Record<string, unknown> | null,
          })
        }

        const currentConfigs = shotConfigsRef.current
        let hasChanges = false

        const updatedConfigs = currentConfigs.map((config) => {
          const updatedVideos = config.generatedVideos?.map((video) => {
            // Only touch videos that are still processing/pending locally
            if (video.status !== 'processing' && video.status !== 'pending') return video

            const record = recordMap.get(video.galleryId)
            if (!record) return video

            // Completed -- the record now has a public_url
            if (record.public_url && !video.videoUrl) {
              hasChanges = true
              return {
                ...video,
                videoUrl: record.public_url,
                status: 'completed' as const,
              }
            }

            // Failed -- metadata.error is populated (or status column says "failed")
            if (record.status === 'failed' || record.metadata?.error) {
              hasChanges = true
              return {
                ...video,
                status: 'failed' as const,
                error: record.metadata?.error
                  ? String(record.metadata.error)
                  : 'Generation failed',
              }
            }

            return video
          })

          if (updatedVideos && updatedVideos !== config.generatedVideos) {
            return { ...config, generatedVideos: updatedVideos }
          }
          return config
        })

        if (hasChanges) {
          logger.shotCreator.info('[useVideoPolling] detected status changes via poll, updating store')
          setShotConfigsRef.current(updatedConfigs)
        }
      } catch (err) {
        // Non-fatal -- we'll retry on the next tick.
        logger.shotCreator.warn('[useVideoPolling] poll error', { error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Run one poll immediately so we don't wait a full interval for stale items
    // that were already completed before the component mounted.
    poll()

    const intervalId = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [processingKey, enabled])
}
