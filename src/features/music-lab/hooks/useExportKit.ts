'use client'

/**
 * useExportKit — calls the export-kit API, tracks progress, toasts on outcome.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { SongSegment } from './useSegments'

type Phase = 'idle' | 'preparing' | 'generating-sheet' | 'wrapping-audio' | 'bundling' | 'done'

interface ExportKitResponse {
  exportId: string
  zipUrl: string
  zipStoragePath: string
  contactSheetUrl: string
  audioClipUrl: string
  characterSheetUrl: string | null
  downloadCount: number
  createdAt: string
}

interface ExportArgs {
  artistId: string
  songId: string
  audioUrl: string
  segment: SongSegment
  /** Optional per-song style notes like "night exterior, handheld, amber highlights" */
  globalStyleNotes?: string
}

export function useExportKit() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const exportKit = useCallback(
    async (args: ExportArgs): Promise<ExportKitResponse | null> => {
      const { artistId, songId, segment, audioUrl, globalStyleNotes } = args

      // Validate client-side before hitting the API
      const beatsFilled = segment.beats.every((b) => b.caption.trim().length > 0)
      if (!segment.scene.trim()) {
        setError('Scene brief required')
        toast.error('Add a scene brief before exporting')
        return null
      }
      if (!beatsFilled) {
        setError('All 6 beats must have captions')
        toast.error('Fill in all 6 beat captions first')
        return null
      }

      setError(null)
      setPhase('preparing')

      try {
        // The server runs contact-sheet -> audio-wrap -> zip in sequence;
        // we can't stream phase updates from the single POST, so we fake a
        // coarse progression via timers to avoid a frozen UI.
        const progressTimers: ReturnType<typeof setTimeout>[] = []
        progressTimers.push(
          setTimeout(() => setPhase('generating-sheet'), 150),
          setTimeout(() => setPhase('wrapping-audio'), 40_000),
          setTimeout(() => setPhase('bundling'), 60_000)
        )

        const res = await fetch('/api/music-lab/export-kit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId,
            songId,
            segmentId: segment.id,
            segmentLabel: segment.label,
            startS: segment.startS,
            endS: segment.endS,
            scene: segment.scene,
            beats: segment.beats,
            audioUrl,
            globalStyleNotes,
          }),
        })

        progressTimers.forEach(clearTimeout)

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = body?.error || `Export failed (${res.status})`
          setError(msg)
          setPhase('idle')
          toast.error(msg)
          return null
        }

        const data = (await res.json()) as ExportKitResponse
        setPhase('done')
        toast.success(`Kit ready — ${segment.label || segment.id}`)
        return data
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Export failed'
        setError(msg)
        setPhase('idle')
        toast.error(msg)
        return null
      }
    },
    []
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
  }, [])

  return { phase, error, exportKit, reset, isRunning: phase !== 'idle' && phase !== 'done' }
}
