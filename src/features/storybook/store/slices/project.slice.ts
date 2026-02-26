/**
 * Project Slice
 * Project CRUD, story text, pages, step navigation, style, recipe config, page actions.
 */

import type { StoreApi } from 'zustand'
import type { StorybookStore } from '../storybook.store'
import type {
  BookFormat,
  StorybookPage,
  TextPosition,
} from '../../types/storybook.types'
import { getNextStep, getPreviousStep, getStepIndex } from '../../types/storybook.types'
import { createInitialProject, parseStoryIntoPages } from '../storybook.helpers'

type Set = StoreApi<StorybookStore>['setState']
type Get = StoreApi<StorybookStore>['getState']

export const createProjectSlice = (set: Set, get: Get) => ({
  // Initial state
  currentStep: 'character-setup' as const,
  storyMode: 'generate' as const,
  furthestStepIndex: 0,
  project: null,
  currentPageIndex: 0,

  // Step navigation
  setStep: (step: StorybookStore['currentStep']) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, storyMode, furthestStepIndex } = get()
    const next = getNextStep(currentStep, storyMode)
    if (next) {
      const newStepIndex = getStepIndex(next, storyMode)
      set({
        currentStep: next,
        furthestStepIndex: Math.max(furthestStepIndex, newStepIndex),
      })
    }
  },

  previousStep: () => {
    const { currentStep, storyMode } = get()
    const prev = getPreviousStep(currentStep, storyMode)
    if (prev) {
      set({ currentStep: prev })
    }
  },

  setStoryMode: (mode: StorybookStore['storyMode']) => {
    const newStep = mode === 'generate' ? 'character-setup' : 'story'
    set({ storyMode: mode, currentStep: newStep })
  },

  // Project actions
  createProject: (title: string, storyText: string, bookFormat: BookFormat = 'square', targetAge = 7) => {
    const project = createInitialProject(title, storyText, bookFormat, targetAge)
    set({ project, currentStep: 'story', storyMode: 'paste' })
  },

  updateProject: (updates: Partial<StorybookStore['project'] & object>) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          ...updates,
          updatedAt: new Date(),
        },
      })
    }
  },

  resetProject: () => {
    set({
      project: null,
      currentStep: 'story' as const,
      currentPageIndex: 0,
    })
  },

  // Direct project replacement (used by persistence store for loadProject)
  _setProjectData: (project: StorybookStore['project']) => {
    set({ project })
  },

  setBookFormat: (format: BookFormat) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          bookFormat: format,
          updatedAt: new Date(),
        },
      })
    }
  },

  setTargetAge: (age: number) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          targetAge: age,
          updatedAt: new Date(),
        },
      })
    }
  },

  setDefaultLayout: (layout: Parameters<StorybookStore['setDefaultLayout']>[0]) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          defaultLayout: layout,
          updatedAt: new Date(),
        },
      })
    }
  },

  // Story actions
  setStoryText: (text: string) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          storyText: text,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new project
      const newProject = createInitialProject('Untitled Storybook', text)
      set({ project: newProject })
    }
  },

  detectPages: () => {
    const { project } = get()
    if (project?.storyText) {
      const pages = parseStoryIntoPages(project.storyText)
      set({
        project: {
          ...project,
          pages,
          updatedAt: new Date(),
        },
      })
    }
  },

  setPages: (pages: StorybookPage[]) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pages,
          updatedAt: new Date(),
        },
      })
    }
  },

  // Style actions
  setStyle: (style: Parameters<StorybookStore['setStyle']>[0]) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          style,
          updatedAt: new Date(),
        },
      })
    }
  },

  // Recipe configuration actions
  setRecipeConfig: (config: Parameters<StorybookStore['setRecipeConfig']>[0]) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          recipeConfig: {
            ...project.recipeConfig,
            ...config,
          },
          updatedAt: new Date(),
        },
      })
    }
  },

  // Page actions
  setCurrentPageIndex: (index: number) => set({ currentPageIndex: index }),

  updatePage: (pageId: string, updates: Partial<StorybookPage>) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pages: project.pages.map(p =>
            p.id === pageId ? { ...p, ...updates } : p
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  setPageTextPosition: (pageId: string, position: TextPosition) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pages: project.pages.map(p =>
            p.id === pageId ? { ...p, textPosition: position } : p
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  // Clear project (resets wizard + project state)
  clearProject: () => {
    set({
      project: null,
      currentStep: 'character-setup' as const,
      storyMode: 'generate' as const,
      furthestStepIndex: 0,
      currentPageIndex: 0,
      storyIdeas: [],
    })
  },
})
