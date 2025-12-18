/**
 * Storybook Store
 * Zustand store for managing storybook wizard state
 */

import { create } from 'zustand'

// Generate unique IDs without uuid dependency
function generateId(): string {
  return crypto.randomUUID()
}
import type {
  WizardStep,
  StorybookProject,
  StorybookPage,
  StorybookCharacter,
  StorybookStyle,
  TextPosition,
} from '../types/storybook.types'
import { getNextStep, getPreviousStep } from '../types/storybook.types'

interface StorybookState {
  // Wizard state
  currentStep: WizardStep
  isGenerating: boolean
  error: string | null

  // Project data
  project: StorybookProject | null

  // Current page being edited (in page generation step)
  currentPageIndex: number

  // Actions
  setStep: (step: WizardStep) => void
  nextStep: () => void
  previousStep: () => void

  // Project actions
  createProject: (title: string, storyText: string) => void
  updateProject: (updates: Partial<StorybookProject>) => void
  resetProject: () => void

  // Story actions
  setStoryText: (text: string) => void
  detectPages: () => void
  setPages: (pages: StorybookPage[]) => void

  // Style actions
  setStyle: (style: StorybookStyle) => void

  // Character actions
  addCharacter: (name: string, tag: string) => void
  updateCharacter: (id: string, updates: Partial<StorybookCharacter>) => void
  removeCharacter: (id: string) => void
  detectCharacters: () => void

  // Page actions
  setCurrentPageIndex: (index: number) => void
  updatePage: (pageId: string, updates: Partial<StorybookPage>) => void
  selectVariation: (pageId: string, variationIndex: number, imageUrl: string) => void
  setPageTextPosition: (pageId: string, position: TextPosition) => void

  // Generation state
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
}

// Create initial project
function createInitialProject(title: string, storyText: string): StorybookProject {
  return {
    id: generateId(),
    title,
    storyText,
    pages: [],
    characters: [],
    style: undefined,
    coverImageUrl: undefined,
    status: 'draft',
    creditsUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Parse story text into pages (split by paragraph or ~100 words)
function parseStoryIntoPages(storyText: string): StorybookPage[] {
  // Split by double newlines (paragraphs)
  const paragraphs = storyText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // If we have good paragraph breaks, use them
  if (paragraphs.length >= 3) {
    return paragraphs.map((text, index) => ({
      id: generateId(),
      pageNumber: index + 1,
      text,
      textPosition: 'bottom' as TextPosition,
    }))
  }

  // Otherwise, split by sentences (aim for ~50-100 words per page)
  const sentences = storyText.match(/[^.!?]+[.!?]+/g) || [storyText]
  const pages: StorybookPage[] = []
  let currentPageText = ''
  let wordCount = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length
    if (wordCount + sentenceWords > 80 && currentPageText) {
      pages.push({
        id: generateId(),
        pageNumber: pages.length + 1,
        text: currentPageText.trim(),
        textPosition: 'bottom',
      })
      currentPageText = sentence
      wordCount = sentenceWords
    } else {
      currentPageText += ' ' + sentence
      wordCount += sentenceWords
    }
  }

  // Add remaining text
  if (currentPageText.trim()) {
    pages.push({
      id: generateId(),
      pageNumber: pages.length + 1,
      text: currentPageText.trim(),
      textPosition: 'bottom',
    })
  }

  return pages
}

// Extract character names from story text (looking for @mentions or capitalized names)
function extractCharacterNames(storyText: string): { name: string; tag: string }[] {
  const characters: { name: string; tag: string }[] = []
  const seen = new Set<string>()

  // Look for @mentions first
  const mentionRegex = /@(\w+)/g
  let match
  while ((match = mentionRegex.exec(storyText)) !== null) {
    const name = match[1]
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      characters.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        tag: `@${name}`,
      })
    }
  }

  // If no @mentions, look for common name patterns
  if (characters.length === 0) {
    // Look for capitalized words that appear multiple times (likely character names)
    const nameRegex = /\b([A-Z][a-z]+)\b/g
    const nameCounts = new Map<string, number>()
    while ((match = nameRegex.exec(storyText)) !== null) {
      const name = match[1]
      // Skip common words that might be capitalized
      const commonWords = ['The', 'And', 'But', 'Then', 'When', 'Where', 'What', 'How', 'This', 'That', 'There', 'Here']
      if (!commonWords.includes(name)) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
      }
    }

    // Add names that appear more than once
    for (const [name, count] of nameCounts) {
      if (count >= 2 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        characters.push({
          name,
          tag: `@${name}`,
        })
      }
    }
  }

  return characters
}

export const useStorybookStore = create<StorybookState>((set, get) => ({
  // Initial state
  currentStep: 'story',
  isGenerating: false,
  error: null,
  project: null,
  currentPageIndex: 0,

  // Step navigation
  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get()
    const next = getNextStep(currentStep)
    if (next) {
      set({ currentStep: next })
    }
  },

  previousStep: () => {
    const { currentStep } = get()
    const prev = getPreviousStep(currentStep)
    if (prev) {
      set({ currentStep: prev })
    }
  },

  // Project actions
  createProject: (title, storyText) => {
    const project = createInitialProject(title, storyText)
    set({ project, currentStep: 'story' })
  },

  updateProject: (updates) => {
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
      currentStep: 'story',
      currentPageIndex: 0,
      error: null,
    })
  },

  // Story actions
  setStoryText: (text) => {
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

  setPages: (pages) => {
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
  setStyle: (style) => {
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

  // Character actions
  addCharacter: (name, tag) => {
    const { project } = get()
    if (project) {
      const newCharacter: StorybookCharacter = {
        id: generateId(),
        name,
        tag,
      }
      set({
        project: {
          ...project,
          characters: [...project.characters, newCharacter],
          updatedAt: new Date(),
        },
      })
    }
  },

  updateCharacter: (id, updates) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          characters: project.characters.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  removeCharacter: (id) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          characters: project.characters.filter(c => c.id !== id),
          updatedAt: new Date(),
        },
      })
    }
  },

  detectCharacters: () => {
    const { project } = get()
    if (project?.storyText) {
      const detected = extractCharacterNames(project.storyText)
      const existingTags = new Set(project.characters.map(c => c.tag.toLowerCase()))

      // Add new characters that don't already exist
      const newCharacters: StorybookCharacter[] = detected
        .filter(c => !existingTags.has(c.tag.toLowerCase()))
        .map(c => ({
          id: generateId(),
          name: c.name,
          tag: c.tag,
        }))

      if (newCharacters.length > 0) {
        set({
          project: {
            ...project,
            characters: [...project.characters, ...newCharacters],
            updatedAt: new Date(),
          },
        })
      }
    }
  },

  // Page actions
  setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

  updatePage: (pageId, updates) => {
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

  selectVariation: (pageId, variationIndex, imageUrl) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pages: project.pages.map(p =>
            p.id === pageId
              ? { ...p, selectedVariationIndex: variationIndex, imageUrl }
              : p
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  setPageTextPosition: (pageId, position) => {
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

  // Generation state
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
}))
