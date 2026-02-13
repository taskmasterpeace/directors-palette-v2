/**
 * Generation UI State Store
 * Manages transient generation UI state (not persisted)
 * Cover variations, title page variations, back cover variations, and generation status
 */

import { create } from 'zustand'
import { useStorybookStore } from './storybook.store'

interface GenerationState {
  // Global generation status
  isGenerating: boolean
  error: string | null

  // Cover variation state
  pendingCoverVariations: string[]
  isGeneratingCoverVariations: boolean
  coverGenerationError?: string

  // Title page variation state
  pendingTitlePageVariations: string[]
  isGeneratingTitlePageVariations: boolean
  titlePageGenerationError?: string

  // Back cover state
  pendingBackCoverVariations: string[]
  isGeneratingBackCoverSynopsis: boolean
  isGeneratingBackCoverVariations: boolean
  backCoverGenerationError?: string

  // Actions
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void

  // Cover variation actions
  setPendingCoverVariations: (urls: string[]) => void
  setGeneratingCoverVariations: (isGenerating: boolean) => void
  selectCoverVariation: (url: string) => void
  setCoverGenerationError: (error?: string) => void

  // Title page variation actions
  setPendingTitlePageVariations: (urls: string[]) => void
  setGeneratingTitlePageVariations: (isGenerating: boolean) => void
  selectTitlePageVariation: (url: string) => void
  setTitlePageGenerationError: (error?: string) => void

  // Back cover actions
  setBackCoverSynopsis: (text: string) => void
  setBackCoverImageUrl: (url: string) => void
  setPendingBackCoverVariations: (urls: string[]) => void
  selectBackCoverVariation: (url: string) => void
  setGeneratingBackCoverSynopsis: (isGenerating: boolean) => void
  setGeneratingBackCoverVariations: (isGenerating: boolean) => void
  setBackCoverGenerationError: (error?: string) => void
}

export const useGenerationStateStore = create<GenerationState>()(
  (set) => ({
    // Initial state
    isGenerating: false,
    error: null,

    // Cover variation state
    pendingCoverVariations: [],
    isGeneratingCoverVariations: false,
    coverGenerationError: undefined,

    // Title page variation state
    pendingTitlePageVariations: [],
    isGeneratingTitlePageVariations: false,
    titlePageGenerationError: undefined,

    // Back cover state
    pendingBackCoverVariations: [],
    isGeneratingBackCoverSynopsis: false,
    isGeneratingBackCoverVariations: false,
    backCoverGenerationError: undefined,

    // Global generation status
    setGenerating: (isGenerating) => set({ isGenerating }),
    setError: (error) => set({ error }),

    // Cover variation actions
    setPendingCoverVariations: (urls) => set({ pendingCoverVariations: urls }),

    setGeneratingCoverVariations: (isGenerating) => set({ isGeneratingCoverVariations: isGenerating }),

    selectCoverVariation: (url) => {
      // Update project in main store
      const mainStore = useStorybookStore.getState()
      const { project } = mainStore
      if (!project) return

      mainStore.updateProject({ coverImageUrl: url })

      // Clear variations after selection
      set({ pendingCoverVariations: [] })
    },

    setCoverGenerationError: (error) => set({ coverGenerationError: error }),

    // Title page variation actions
    setPendingTitlePageVariations: (urls) => set({ pendingTitlePageVariations: urls }),

    setGeneratingTitlePageVariations: (isGenerating) => set({ isGeneratingTitlePageVariations: isGenerating }),

    selectTitlePageVariation: (url) => {
      // Update project in main store
      const mainStore = useStorybookStore.getState()
      const { project } = mainStore
      if (!project) return

      mainStore.updateProject({ titlePageImageUrl: url })

      // Clear variations after selection
      set({ pendingTitlePageVariations: [] })
    },

    setTitlePageGenerationError: (error) => set({ titlePageGenerationError: error }),

    // Back cover actions
    setBackCoverSynopsis: (text) => {
      // Update project in main store
      const mainStore = useStorybookStore.getState()
      mainStore.updateProject({ backCoverSynopsis: text })
    },

    setBackCoverImageUrl: (url) => {
      // Update project in main store
      const mainStore = useStorybookStore.getState()
      mainStore.updateProject({ backCoverImageUrl: url })
    },

    setPendingBackCoverVariations: (urls) => set({ pendingBackCoverVariations: urls }),

    setGeneratingBackCoverSynopsis: (isGenerating) => set({ isGeneratingBackCoverSynopsis: isGenerating }),

    setGeneratingBackCoverVariations: (isGenerating) => set({ isGeneratingBackCoverVariations: isGenerating }),

    selectBackCoverVariation: (url) => {
      // Update project in main store
      const mainStore = useStorybookStore.getState()
      const { project } = mainStore
      if (!project) return

      mainStore.updateProject({ backCoverImageUrl: url })

      // Clear variations after selection
      set({ pendingBackCoverVariations: [] })
    },

    setBackCoverGenerationError: (error) => set({ backCoverGenerationError: error }),
  })
)
