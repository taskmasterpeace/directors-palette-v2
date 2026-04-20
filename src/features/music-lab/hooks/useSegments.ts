'use client'

/**
 * useSegments — per-song segment store
 *
 * Segments are the user's plan for what parts of a song they want to
 * make video for. Each segment is ≤15s, has 6 beats, and can be
 * independently exported as a kit ZIP.
 *
 * Persisted to localStorage per (artistId, songId). Keeping it client-only
 * for MVP — Phase 5+ moves history to the server but the *draft plan* can
 * stay local since it's cheap and editable.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ContactSheetBeat } from '@/features/recipes/contact-sheet'

export type SegmentStatus =
  | 'draft'           // beats not all filled
  | 'ready'           // beats filled, no contact sheet yet
  | 'sheet-generated' // contact sheet exists, no export yet
  | 'exported'        // ZIP downloaded at least once

export interface SongSegment {
  id: string
  label: string
  startS: number
  endS: number
  scene: string
  beats: ContactSheetBeat[]      // length 6
  contactSheetUrl?: string
  lastExportUrl?: string
  lastExportedAt?: string        // ISO
  downloadCount?: number
  createdAt: string              // ISO
}

interface SegmentsState {
  /** key = `${artistId}::${songId}` */
  bySong: Record<string, SongSegment[]>
  upsert: (key: string, seg: SongSegment) => void
  remove: (key: string, segId: string) => void
  clear: (key: string) => void
  setMany: (key: string, list: SongSegment[]) => void
}

const STORAGE_KEY = 'dp-music-lab-segments-v1'

function songKey(artistId: string, songId: string): string {
  return `${artistId}::${songId}`
}

export const useSegmentsStore = create<SegmentsState>()(
  persist(
    (set) => ({
      bySong: {},
      upsert: (key, seg) =>
        set((state) => {
          const list = state.bySong[key] ?? []
          const idx = list.findIndex((s) => s.id === seg.id)
          const next = idx >= 0 ? list.slice() : list.concat(seg)
          if (idx >= 0) next[idx] = seg
          next.sort((a, b) => a.startS - b.startS)
          return { bySong: { ...state.bySong, [key]: next } }
        }),
      remove: (key, segId) =>
        set((state) => {
          const list = state.bySong[key] ?? []
          return {
            bySong: {
              ...state.bySong,
              [key]: list.filter((s) => s.id !== segId),
            },
          }
        }),
      clear: (key) =>
        set((state) => {
          const next = { ...state.bySong }
          delete next[key]
          return { bySong: next }
        }),
      setMany: (key, list) =>
        set((state) => ({
          bySong: { ...state.bySong, [key]: list.slice().sort((a, b) => a.startS - b.startS) },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/** Blank 6-beat scaffold for a new segment. */
export function emptyBeats(): ContactSheetBeat[] {
  return Array.from({ length: 6 }, () => ({ caption: '' }))
}

export function deriveStatus(seg: SongSegment): SegmentStatus {
  if (seg.lastExportedAt) return 'exported'
  if (seg.contactSheetUrl) return 'sheet-generated'
  const beatsReady = seg.beats.every((b) => b.caption.trim().length > 0)
  return beatsReady && seg.scene.trim().length > 0 ? 'ready' : 'draft'
}

/** Hook helper: get list for (artistId, songId) + bound actions. */
export function useSegments(artistId: string | null, songId: string | null) {
  const key = artistId && songId ? songKey(artistId, songId) : null
  const segments = useSegmentsStore((s) => (key ? s.bySong[key] ?? [] : []))
  const upsert = useSegmentsStore((s) => s.upsert)
  const remove = useSegmentsStore((s) => s.remove)
  const clear = useSegmentsStore((s) => s.clear)

  return {
    key,
    segments,
    upsert: (seg: SongSegment) => {
      if (!key) return
      upsert(key, seg)
    },
    remove: (segId: string) => {
      if (!key) return
      remove(key, segId)
    },
    clear: () => {
      if (!key) return
      clear(key)
    },
  }
}
