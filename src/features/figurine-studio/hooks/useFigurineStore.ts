import { create } from 'zustand'
import type { FigurineStatus } from '../types/figurine.types'

interface FigurineModel {
  id: string
  sourceImageUrl: string
  glbUrl?: string
  status: FigurineStatus
  error?: string
  createdAt: string
  /** If this model was loaded from the DB */
  savedId?: string
}

interface FigurineStore {
  // Current generation state
  models: FigurineModel[]
  activeModelId: string | null
  isGenerating: boolean
  preSelectedImageUrl: string | null
  savedLoaded: boolean

  // Actions
  startGeneration: (sourceImageUrl: string) => string
  setGenerationComplete: (id: string, glbUrl: string) => void
  setGenerationFailed: (id: string, error: string) => void
  setActiveModel: (id: string | null) => void
  removeModel: (id: string) => void
  setPreSelectedImage: (url: string | null) => void
  loadSavedModels: (saved: { id: string; source_image_url: string; glb_url: string; created_at: string }[]) => void
}

let idCounter = 0

export const useFigurineStore = create<FigurineStore>((set) => ({
  models: [],
  activeModelId: null,
  isGenerating: false,
  preSelectedImageUrl: null,
  savedLoaded: false,

  startGeneration: (sourceImageUrl) => {
    const id = `figurine-${Date.now()}-${++idCounter}`
    set((state) => ({
      models: [
        {
          id,
          sourceImageUrl,
          status: 'generating',
          createdAt: new Date().toISOString(),
        },
        ...state.models,
      ],
      activeModelId: id,
      isGenerating: true,
    }))
    return id
  },

  setGenerationComplete: (id, glbUrl) => {
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...m, glbUrl, status: 'ready' as const } : m
      ),
      isGenerating: false,
    }))
  },

  setGenerationFailed: (id, error) => {
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...m, error, status: 'failed' as const } : m
      ),
      isGenerating: false,
    }))
  },

  setActiveModel: (id) => set({ activeModelId: id }),

  removeModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      activeModelId: state.activeModelId === id ? null : state.activeModelId,
    })),

  setPreSelectedImage: (url) => set({ preSelectedImageUrl: url }),

  loadSavedModels: (saved) => {
    set((state) => {
      // Don't duplicate — only add models not already in the list
      const existingGlbs = new Set(state.models.map(m => m.glbUrl).filter(Boolean))
      const newModels = saved
        .filter(s => !existingGlbs.has(s.glb_url))
        .map(s => ({
          id: `saved-${s.id}`,
          sourceImageUrl: s.source_image_url,
          glbUrl: s.glb_url,
          status: 'ready' as const,
          createdAt: s.created_at,
          savedId: s.id,
        }))

      return {
        models: [...state.models, ...newModels],
        savedLoaded: true,
      }
    })
  },
}))
