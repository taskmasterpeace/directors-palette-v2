/**
 * Music Lab Lip Sync Store
 *
 * Zustand store for lip-sync video generation state in Music Lab.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LipSyncModel,
  LipSyncResolution,
  LipSyncModelSettings,
  LipSyncGenerationStatus,
  MusicLabAvatarSource,
  MusicLabAudioSource,
  MusicLabLipSyncSection,
} from '@/features/lip-sync/types/lip-sync.types'

// ============================================================================
// Types
// ============================================================================

interface LipSyncStudioState {
  // Avatar configuration
  avatarSource: MusicLabAvatarSource
  customAvatarUrl: string | null
  customAvatarFile: File | null

  // Audio configuration
  audioSource: MusicLabAudioSource
  customAudioUrl: string | null
  customAudioFile: File | null

  // Sections (from song analysis)
  sections: MusicLabLipSyncSection[]

  // Model settings
  modelSettings: LipSyncModelSettings

  // Overall status
  isGenerating: boolean
  currentBatchIndex: number
}

interface LipSyncStudioActions {
  // Avatar actions
  setAvatarSource: (source: MusicLabAvatarSource) => void
  setCustomAvatar: (url: string | null, file?: File | null) => void

  // Audio actions
  setAudioSource: (source: MusicLabAudioSource) => void
  setCustomAudio: (url: string | null, file?: File | null) => void

  // Section actions
  initializeSections: (sections: Array<{
    sectionId: string
    sectionName: string
    startTime: number
    endTime: number
  }>) => void
  toggleSectionSelection: (sectionId: string) => void
  selectAllSections: () => void
  deselectAllSections: () => void
  updateSectionStatus: (
    sectionId: string,
    status: LipSyncGenerationStatus,
    updates?: {
      progress?: number
      predictionId?: string | null
      galleryId?: string | null
      videoUrl?: string | null
      error?: string | null
    }
  ) => void

  // Model settings actions
  setModel: (model: LipSyncModel) => void
  setResolution: (resolution: LipSyncResolution) => void

  // Generation actions
  startGeneration: () => void
  setCurrentBatchIndex: (index: number) => void
  completeGeneration: () => void
  reset: () => void
}

type LipSyncStore = LipSyncStudioState & LipSyncStudioActions

// ============================================================================
// Initial State
// ============================================================================

const initialState: LipSyncStudioState = {
  avatarSource: 'identity-lock',
  customAvatarUrl: null,
  customAvatarFile: null,

  audioSource: 'isolated-vocals',
  customAudioUrl: null,
  customAudioFile: null,

  sections: [],

  modelSettings: {
    model: 'kling-avatar-v2-standard',
    resolution: '720p',
  },

  isGenerating: false,
  currentBatchIndex: -1,
}

// ============================================================================
// Store
// ============================================================================

export const useLipSyncStore = create<LipSyncStore>()(
  persist(
    (set, _get) => ({
      ...initialState,

      // Avatar actions
      setAvatarSource: (source) => set({ avatarSource: source }),

      setCustomAvatar: (url, file = null) => set({
        customAvatarUrl: url,
        customAvatarFile: file,
      }),

      // Audio actions
      setAudioSource: (source) => set({ audioSource: source }),

      setCustomAudio: (url, file = null) => set({
        customAudioUrl: url,
        customAudioFile: file,
      }),

      // Section actions
      initializeSections: (sections) => set({
        sections: sections.map((s) => ({
          sectionId: s.sectionId,
          sectionName: s.sectionName,
          startTime: s.startTime,
          endTime: s.endTime,
          durationSeconds: s.endTime - s.startTime,
          estimatedCost: 0, // Will be calculated by component
          selected: true,
          generationState: {
            status: 'idle',
            progress: 0,
            predictionId: null,
            galleryId: null,
            videoUrl: null,
            error: null,
          },
        })),
      }),

      toggleSectionSelection: (sectionId) => set((state) => ({
        sections: state.sections.map((s) =>
          s.sectionId === sectionId
            ? { ...s, selected: !s.selected }
            : s
        ),
      })),

      selectAllSections: () => set((state) => ({
        sections: state.sections.map((s) => ({ ...s, selected: true })),
      })),

      deselectAllSections: () => set((state) => ({
        sections: state.sections.map((s) => ({ ...s, selected: false })),
      })),

      updateSectionStatus: (sectionId, status, updates = {}) => set((state) => ({
        sections: state.sections.map((s) =>
          s.sectionId === sectionId
            ? {
                ...s,
                generationState: {
                  ...s.generationState,
                  status,
                  progress: updates.progress ?? s.generationState.progress,
                  predictionId: updates.predictionId ?? s.generationState.predictionId,
                  galleryId: updates.galleryId ?? s.generationState.galleryId,
                  videoUrl: updates.videoUrl ?? s.generationState.videoUrl,
                  error: updates.error ?? s.generationState.error,
                },
              }
            : s
        ),
      })),

      // Model settings actions
      setModel: (model) => set((state) => ({
        modelSettings: { ...state.modelSettings, model },
      })),

      setResolution: (resolution) => set((state) => ({
        modelSettings: { ...state.modelSettings, resolution },
      })),

      // Generation actions
      startGeneration: () => set({
        isGenerating: true,
        currentBatchIndex: 0,
      }),

      setCurrentBatchIndex: (index) => set({ currentBatchIndex: index }),

      completeGeneration: () => set({
        isGenerating: false,
        currentBatchIndex: -1,
      }),

      reset: () => set(initialState),
    }),
    {
      name: 'music-lab-lip-sync-storage',
      partialize: (state) => ({
        avatarSource: state.avatarSource,
        audioSource: state.audioSource,
        modelSettings: state.modelSettings,
        sections: state.sections.map((s) => ({
          ...s,
          // Don't persist file objects
          generationState: {
            ...s.generationState,
            // Reset generating states on reload
            status: s.generationState.status === 'completed' ? 'completed' : 'idle',
            progress: s.generationState.status === 'completed' ? 100 : 0,
          },
        })),
      }),
    }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectSelectedSections = (state: LipSyncStore) =>
  state.sections.filter((s) => s.selected)

export const selectTotalDuration = (state: LipSyncStore) =>
  selectSelectedSections(state).reduce((sum, s) => sum + s.durationSeconds, 0)

export const selectCompletedCount = (state: LipSyncStore) =>
  state.sections.filter((s) => s.generationState.status === 'completed').length

export const selectFailedCount = (state: LipSyncStore) =>
  state.sections.filter((s) => s.generationState.status === 'failed').length

export const selectProcessingCount = (state: LipSyncStore) =>
  state.sections.filter((s) =>
    s.generationState.status === 'validating' ||
    s.generationState.status === 'generating-audio' ||
    s.generationState.status === 'generating-video'
  ).length
