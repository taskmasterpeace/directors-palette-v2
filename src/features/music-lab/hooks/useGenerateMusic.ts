'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useGenerationStore } from '../store/generation.store'
import type { GenerateRequest } from '../types/generation.types'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 40

export function useGenerateMusic() {
  const {
    currentJob,
    drawerOpen,
    startJob,
    updateJobStatus,
    clearJob,
    openDrawer,
    closeDrawer,
    incrementPoll,
    addToHistory,
  } = useGenerationStore()

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    const timer = pollTimerRef
    const abort = abortRef
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (abort.current) abort.current.abort()
    }
  }, [])

  // Poll for status
  const pollStatus = useCallback(
    async (requestId: string) => {
      const { pollCount: currentPollCount } = useGenerationStore.getState()
      if (currentPollCount >= MAX_POLL_ATTEMPTS) {
        updateJobStatus('failed', undefined, 'Generation timed out after 2 minutes')
        return
      }

      try {
        incrementPoll()
        const res = await fetch(`/api/music/status/${requestId}`)
        const data = await res.json()

        if (data.status === 'completed' && data.audio?.length) {
          const variations = data.audio.map((a: { url: string; duration?: number }) => ({
            url: a.url,
            duration: a.duration || 0,
          }))
          updateJobStatus('completed', variations)

          // Add to history
          const job = useGenerationStore.getState().currentJob
          if (job) {
            addToHistory({
              id: job.id,
              mode: job.mode,
              artistId: job.artistId,
              title: job.title,
              variations,
            })
          }
        } else if (data.status === 'failed') {
          updateJobStatus('failed', undefined, data.error || 'Generation failed')
        } else {
          // Still processing — poll again
          updateJobStatus(data.status === 'processing' ? 'processing' : 'pending')
          pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)
        }
      } catch {
        // Network error — retry a few times
        const { pollCount: pc } = useGenerationStore.getState()
        if (pc < MAX_POLL_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)
        } else {
          updateJobStatus('failed', undefined, 'Network error during polling')
        }
      }
    },
    [incrementPoll, updateJobStatus, addToHistory]
  )

  // Submit generation
  const generate = useCallback(
    async (req: GenerateRequest) => {
      // Abort any existing poll
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      if (abortRef.current) abortRef.current.abort()

      startJob({
        id: '',
        mode: req.mode,
        artistId: req.artistId,
        title: req.title,
        stylePrompt: req.stylePrompt,
        lyricsPrompt: req.lyricsPrompt,
        excludePrompt: req.excludePrompt,
      })

      try {
        const res = await fetch('/api/music/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })

        if (!res.ok) {
          const data = await res.json()
          if (res.status === 402) {
            updateJobStatus('failed', undefined, 'insufficient_credits')
            return { error: 'insufficient_credits', ...data }
          }
          updateJobStatus('failed', undefined, data.error || 'Generation failed')
          return { error: data.error }
        }

        const { requestId } = await res.json()

        // Update job with real ID and start polling
        updateJobStatus('pending')
        useGenerationStore.setState((s) => ({
          currentJob: s.currentJob ? { ...s.currentJob, id: requestId } : null,
        }))

        // Start polling
        pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)

        return { requestId }
      } catch {
        updateJobStatus('failed', undefined, 'Network error')
        return { error: 'Network error' }
      }
    },
    [startJob, updateJobStatus, pollStatus]
  )

  // Save picked track
  const saveTrack = useCallback(
    async (variationIndex: number, catalogEntryId?: string) => {
      const job = useGenerationStore.getState().currentJob
      if (!job || !job.variations[variationIndex]) return { error: 'No variation to save' }

      const variation = job.variations[variationIndex]

      try {
        const res = await fetch('/api/music/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: job.artistId,
            audioUrl: variation.url,
            title: job.title,
            lyrics: job.lyricsPrompt,
            mood: job.mode === 'instrumental' ? 'instrumental' : '',
            duration: variation.duration,
            catalogEntryId,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          return { error: data.error }
        }

        const { publicUrl, trackId } = await res.json()

        // Mark in history
        useGenerationStore.getState().markPicked(job.id, variationIndex)

        return { publicUrl, trackId }
      } catch {
        return { error: 'Failed to save track' }
      }
    },
    []
  )

  const isGenerating = !!currentJob && ['submitting', 'pending', 'processing'].includes(currentJob.status)

  return {
    currentJob,
    drawerOpen,
    isGenerating,
    generate,
    saveTrack,
    clearJob,
    openDrawer,
    closeDrawer,
  }
}
