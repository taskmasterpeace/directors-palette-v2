'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GenerationJob,
  GenerationJobStatus,
  GenerationVariation,
  GenerationHistoryEntry,
} from '../types/generation.types'

const MAX_HISTORY = 20

interface GenerationState {
  currentJob: GenerationJob | null
  drawerOpen: boolean
  pollCount: number
  history: GenerationHistoryEntry[]
}

interface GenerationActions {
  startJob: (job: Omit<GenerationJob, 'status' | 'variations' | 'createdAt'>) => void
  updateJobStatus: (status: GenerationJobStatus, variations?: GenerationVariation[], error?: string) => void
  clearJob: () => void
  openDrawer: () => void
  closeDrawer: () => void
  incrementPoll: () => void
  resetPoll: () => void
  addToHistory: (entry: Omit<GenerationHistoryEntry, 'createdAt'>) => void
  markPicked: (historyId: string, index: number) => void
  clearHistory: () => void
}

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  persist(
    (set) => ({
      currentJob: null,
      drawerOpen: false,
      pollCount: 0,
      history: [],

      startJob: (job) =>
        set({
          currentJob: {
            ...job,
            status: 'submitting',
            variations: [],
            createdAt: new Date().toISOString(),
          },
          drawerOpen: true,
          pollCount: 0,
        }),

      updateJobStatus: (status, variations, error) =>
        set((state) => ({
          currentJob: state.currentJob
            ? {
                ...state.currentJob,
                status,
                variations: variations || state.currentJob.variations,
                error: error || state.currentJob.error,
              }
            : null,
        })),

      clearJob: () => set({ currentJob: null, pollCount: 0 }),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      incrementPoll: () => set((s) => ({ pollCount: s.pollCount + 1 })),
      resetPoll: () => set({ pollCount: 0 }),

      addToHistory: (entry) =>
        set((state) => ({
          history: [
            { ...entry, createdAt: new Date().toISOString() },
            ...state.history,
          ].slice(0, MAX_HISTORY),
        })),

      markPicked: (historyId, index) =>
        set((state) => ({
          history: state.history.map((h) =>
            h.id === historyId ? { ...h, pickedIndex: index } : h
          ),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'music-generation-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
)
