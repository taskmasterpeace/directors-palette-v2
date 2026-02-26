/**
 * Persistence Store
 * Manages project save/load/delete operations with the backend API
 */

import { create } from 'zustand'
import { useStorybookStore } from './storybook.store'
import { useGenerationStateStore } from './generation.store'
import type { StorybookProject } from '../types/storybook.types'
import { logger } from '@/lib/logger'

// Saved project summary type (from API)
export interface SavedProjectSummary {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

interface PersistenceState {
  // State
  savedProjectId: string | null
  isSaving: boolean
  savedProjects: SavedProjectSummary[]

  // Actions
  saveProject: () => Promise<void>
  loadProject: (projectId: string) => Promise<void>
  fetchSavedProjects: () => Promise<void>
  deleteSavedProject: (projectId: string) => Promise<void>
  clearSavedProjectId: () => void
}

export const usePersistenceStore = create<PersistenceState>()(
  (set, get) => ({
    // Initial state
    savedProjectId: null,
    isSaving: false,
    savedProjects: [],

    // Actions
    saveProject: async () => {
      const mainStore = useStorybookStore.getState()
      const { project } = mainStore
      const { savedProjectId } = get()

      if (!project) {
        useGenerationStateStore.getState().setError('No project to save')
        return
      }

      set({ isSaving: true })
      useGenerationStateStore.getState().setError(null)

      try {
        const response = await fetch('/api/storybook/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: savedProjectId, // If exists, will update instead of create
            title: project.title || 'Untitled Storybook',
            status: project.status,
            projectData: project,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save project')
        }

        const data = await response.json()

        // Clear localStorage draft after successful save
        localStorage.removeItem('directors-palette-storybook-draft')

        set({
          savedProjectId: data.project.id,
          isSaving: false,
        })

        // Refresh saved projects list
        get().fetchSavedProjects()
      } catch (error) {
        useGenerationStateStore.getState().setError(
          error instanceof Error ? error.message : 'Failed to save project'
        )
        set({ isSaving: false })
      }
    },

    loadProject: async (projectId) => {
      const genStore = useGenerationStateStore.getState()
      genStore.setGenerating(true)
      genStore.setError(null)

      try {
        const response = await fetch(`/api/storybook/projects/${projectId}`)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load project')
        }

        const data = await response.json()
        const projectData = data.project.projectData as StorybookProject

        // Clear localStorage draft when explicitly loading a saved project
        localStorage.removeItem('directors-palette-storybook-draft')

        // Update main store with loaded project data
        const mainStore = useStorybookStore.getState()
        mainStore._setProjectData(projectData)
        mainStore.setStep(projectData.status === 'completed' ? 'preview' : 'story')
        mainStore.setStoryMode(projectData.mainCharacterName ? 'generate' : 'paste')

        set({ savedProjectId: projectId })
        genStore.setGenerating(false)
      } catch (error) {
        genStore.setError(
          error instanceof Error ? error.message : 'Failed to load project'
        )
        genStore.setGenerating(false)
      }
    },

    fetchSavedProjects: async () => {
      try {
        const response = await fetch('/api/storybook/projects')

        if (!response.ok) {
          logger.storybook.error('Failed to fetch saved projects')
          return
        }

        const data = await response.json()
        set({ savedProjects: data.projects || [] })
      } catch (error) {
        logger.storybook.error('Error fetching saved projects', { error: error instanceof Error ? error.message : String(error) })
      }
    },

    clearSavedProjectId: () => set({ savedProjectId: null }),

    deleteSavedProject: async (projectId) => {
      try {
        const response = await fetch(`/api/storybook/projects/${projectId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete project')
        }

        // Clear current project if it's the one being deleted
        const { savedProjectId } = get()
        if (savedProjectId === projectId) {
          useStorybookStore.getState().clearProject()
          set({ savedProjectId: null })
        }

        // Refresh saved projects list
        get().fetchSavedProjects()
      } catch (error) {
        useGenerationStateStore.getState().setError(
          error instanceof Error ? error.message : 'Failed to delete project'
        )
      }
    },
  })
)
