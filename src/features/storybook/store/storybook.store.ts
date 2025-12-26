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
  BookFormat,
  PageLayout,
  StoryMode,
  StoryCharacter,
} from '../types/storybook.types'
import { getNextStep, getPreviousStep } from '../types/storybook.types'
import type { StoryIdea, GeneratedStory, ExtractedElements } from '../types/education.types'

// Saved project summary type (from API)
export interface SavedProjectSummary {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

interface StorybookState {
  // Wizard state
  currentStep: WizardStep
  storyMode: StoryMode
  isGenerating: boolean
  error: string | null

  // Project data
  project: StorybookProject | null

  // Current page being edited (in page generation step)
  currentPageIndex: number

  // Story ideas (for generate mode)
  storyIdeas: StoryIdea[]

  // Project persistence state
  savedProjectId: string | null
  isSaving: boolean
  savedProjects: SavedProjectSummary[]

  // Actions
  setStep: (step: WizardStep) => void
  nextStep: () => void
  previousStep: () => void
  setStoryMode: (mode: StoryMode) => void

  // Project actions
  createProject: (title: string, storyText: string, bookFormat?: BookFormat, targetAge?: number) => void
  createGenerateProject: (characterName: string, characterAge: number) => void
  updateProject: (updates: Partial<StorybookProject>) => void
  resetProject: () => void
  setBookFormat: (format: BookFormat) => void
  setTargetAge: (age: number) => void
  setDefaultLayout: (layout: PageLayout) => void

  // Education actions (NEW)
  setMainCharacter: (name: string, age: number) => void
  setEducationCategory: (category: string) => void
  setEducationTopic: (topic: string) => void
  setBookSettings: (pageCount: number, sentencesPerPage: number) => void
  setCustomization: (storySetting?: string, customSetting?: string, customElements?: string[], customNotes?: string) => void
  setStoryIdeas: (ideas: StoryIdea[]) => void
  selectStoryApproach: (id: string, title: string, summary: string) => void
  setGeneratedStory: (story: GeneratedStory) => void
  setExtractedElements: (elements: ExtractedElements) => void

  // Story character actions (siblings, friends, pets at setup)
  addStoryCharacter: (character: Omit<StoryCharacter, 'id'>) => void
  updateStoryCharacter: (id: string, updates: Partial<StoryCharacter>) => void
  removeStoryCharacter: (id: string) => void

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

  // Recipe configuration actions
  setRecipeConfig: (config: Partial<import('../types/storybook.types').StorybookRecipeConfig>) => void

  // Generation state
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void

  // Project persistence actions
  saveProject: () => Promise<void>
  loadProject: (projectId: string) => Promise<void>
  fetchSavedProjects: () => Promise<void>
  deleteSavedProject: (projectId: string) => Promise<void>
  clearProject: () => void
}

// Create initial project for paste mode
function createInitialProject(
  title: string,
  storyText: string,
  bookFormat: BookFormat = 'square',
  targetAge: number = 7
): StorybookProject {
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
    bookFormat,
    defaultLayout: 'image-with-text' as PageLayout,
    targetAge,
    storyMode: 'paste',
  }
}

// Create initial project for generate mode (educational)
function createGenerateProject(
  characterName: string,
  characterAge: number,
  bookFormat: BookFormat = 'square'
): StorybookProject {
  return {
    id: generateId(),
    title: `${characterName}'s Story`,
    storyText: '',
    pages: [],
    characters: [],
    style: undefined,
    coverImageUrl: undefined,
    status: 'draft',
    creditsUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookFormat,
    defaultLayout: 'image-with-text' as PageLayout,
    targetAge: characterAge,
    storyMode: 'generate',
    mainCharacterName: characterName,
    mainCharacterAge: characterAge,
    storyCharacters: [], // Initialize empty array for additional characters
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

// Common words to exclude from character detection
const COMMON_WORDS = new Set([
  // Articles and conjunctions
  'The', 'And', 'But', 'Then', 'When', 'Where', 'What', 'How', 'This', 'That', 'There', 'Here',
  'Or', 'So', 'Yet', 'For', 'Nor', 'If', 'As', 'With', 'At', 'From', 'Into', 'During', 'Before',
  'After', 'Above', 'Below', 'To', 'Of', 'In', 'On', 'By', 'About', 'Against', 'Between', 'Through',
  // Pronouns
  'She', 'He', 'Her', 'His', 'Him', 'They', 'Them', 'Their', 'We', 'Us', 'Our', 'You', 'Your',
  'It', 'Its', 'My', 'Me', 'I',
  // Common sentence starters
  'One', 'Once', 'Some', 'Sometimes', 'Soon', 'Still', 'Such', 'Sure', 'Suddenly',
  'Now', 'Next', 'Never', 'New', 'No', 'Not', 'Nothing', 'Just', 'Each', 'Every', 'Even',
  'First', 'Finally', 'Far', 'Few', 'Well', 'While', 'Who', 'Why', 'Will', 'Would', 'Was', 'Were',
  // Common verbs at start
  'Being', 'Having', 'Going', 'Coming', 'Looking', 'Making', 'Taking', 'Seeing', 'Getting',
  'Feeling', 'Thinking', 'Knowing', 'Running', 'Walking', 'Sitting', 'Standing',
  // Time-related
  'Today', 'Tomorrow', 'Yesterday', 'Morning', 'Night', 'Day', 'Week', 'Month', 'Year',
  // Common descriptors
  'Little', 'Big', 'Small', 'Large', 'Long', 'Short', 'Good', 'Bad', 'Best', 'Worst',
  'Old', 'Young', 'All', 'Any', 'Many', 'Most', 'Much', 'More', 'Less', 'Very', 'Really',
  // Other common words
  'Maybe', 'Perhaps', 'However', 'Although', 'Because', 'Since', 'Until', 'Unless',
  'Another', 'Both', 'Other', 'Others', 'Either', 'Neither', 'Everything', 'Something',
  'Anything', 'Someone', 'Anyone', 'Everyone', 'Nobody', 'Everybody', 'Always', 'Usually'
])

// Extract character names from story text (looking for @mentions or capitalized names)
function extractCharacterNames(storyText: string): { name: string; tag: string }[] {
  const characters: { name: string; tag: string }[] = []
  const seen = new Set<string>()

  // Look for @mentions first (highest priority)
  const mentionRegex = /@(\w+)/g
  let match
  while ((match = mentionRegex.exec(storyText)) !== null) {
    const name = match[1]
    if (!seen.has(name.toLowerCase()) && !COMMON_WORDS.has(name)) {
      seen.add(name.toLowerCase())
      characters.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        tag: `@${name}`,
      })
    }
  }

  // If no @mentions, look for proper names
  if (characters.length === 0) {
    // Look for capitalized words that appear multiple times (likely character names)
    // But exclude words at the start of sentences (after . ! ? or at text start)
    const nameRegex = /(?<=[a-z,;:]\s+)([A-Z][a-z]{2,})\b/g
    const nameCounts = new Map<string, number>()
    while ((match = nameRegex.exec(storyText)) !== null) {
      const name = match[1]
      // Skip common words and short words (likely not names)
      if (!COMMON_WORDS.has(name) && name.length >= 3) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
      }
    }

    // Add names that appear at least twice
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
  currentStep: 'character-setup',
  storyMode: 'generate',
  isGenerating: false,
  error: null,
  project: null,
  currentPageIndex: 0,
  storyIdeas: [],

  // Project persistence state
  savedProjectId: null,
  isSaving: false,
  savedProjects: [],

  // Step navigation
  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, storyMode } = get()
    const next = getNextStep(currentStep, storyMode)
    if (next) {
      set({ currentStep: next })
    }
  },

  previousStep: () => {
    const { currentStep, storyMode } = get()
    const prev = getPreviousStep(currentStep, storyMode)
    if (prev) {
      set({ currentStep: prev })
    }
  },

  setStoryMode: (mode) => {
    const newStep = mode === 'generate' ? 'character-setup' : 'story'
    set({ storyMode: mode, currentStep: newStep })
  },

  // Project actions
  createProject: (title, storyText, bookFormat = 'square', targetAge = 7) => {
    const project = createInitialProject(title, storyText, bookFormat, targetAge)
    set({ project, currentStep: 'story', storyMode: 'paste' })
  },

  createGenerateProject: (characterName, characterAge) => {
    const project = createGenerateProject(characterName, characterAge)
    set({ project, currentStep: 'category', storyMode: 'generate' })
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

  setBookFormat: (format) => {
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

  setTargetAge: (age) => {
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

  setDefaultLayout: (layout) => {
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

  // Recipe configuration actions
  setRecipeConfig: (config) => {
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

  // Education actions (NEW)
  setMainCharacter: (name, age) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          mainCharacterName: name,
          mainCharacterAge: age,
          // mainCharacterPhotoUrl removed - deprecated field
          title: `${name}'s Story`,
          targetAge: age,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new project for generate mode
      const newProject = createGenerateProject(name, age)
      // No photoUrl assignment needed
      set({ project: newProject })
    }
  },

  setEducationCategory: (category) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          educationCategory: category,
          educationTopic: undefined, // Clear topic when category changes
          updatedAt: new Date(),
        },
      })
    }
  },

  setEducationTopic: (topic) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          educationTopic: topic,
          updatedAt: new Date(),
        },
      })
    }
  },

  setBookSettings: (pageCount, sentencesPerPage) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pageCount,
          sentencesPerPage,
          updatedAt: new Date(),
        },
      })
    }
  },

  setCustomization: (storySetting, customSetting, customElements, customNotes) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          storySetting,
          customSetting,
          customElements,
          customNotes,
          updatedAt: new Date(),
        },
      })
    }
  },

  setStoryIdeas: (ideas) => set({ storyIdeas: ideas }),

  selectStoryApproach: (id, title, summary) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          selectedApproach: id,
          selectedApproachTitle: title,
          selectedApproachSummary: summary,
          updatedAt: new Date(),
        },
      })
    }
  },

  setGeneratedStory: (story) => {
    const { project } = get()
    if (project) {
      // Convert generated story to storybook pages
      const pages: StorybookPage[] = story.pages.map((page, index) => ({
        id: generateId(),
        pageNumber: index + 1,
        text: page.text,
        textPosition: 'bottom' as TextPosition,
        // Store scene description for image generation
      }))

      set({
        project: {
          ...project,
          title: story.title,
          storyText: story.pages.map(p => p.text).join('\n\n'),
          generatedStory: story,
          pages,
          updatedAt: new Date(),
        },
      })
    }
  },

  setExtractedElements: (elements) => {
    const { project } = get()
    if (project) {
      // Add extracted characters as storybook characters
      const newCharacters: StorybookCharacter[] = elements.characters.map(char => ({
        id: generateId(),
        name: char.name,
        tag: `@${char.name.replace(/\s+/g, '')}`,
      }))

      set({
        project: {
          ...project,
          extractedCharacters: elements.characters,
          extractedLocations: elements.locations,
          characters: newCharacters,
          updatedAt: new Date(),
        },
      })
    }
  },

  // Story character actions (siblings, friends, pets at setup)
  addStoryCharacter: (character) => {
    let { project } = get()

    // Create a default project if one doesn't exist yet
    // This allows adding characters before clicking Continue
    if (!project) {
      project = createGenerateProject('', 5)
      set({ project })
    }

    const newCharacter: StoryCharacter = {
      ...character,
      id: generateId(),
    }
    const existingCharacters = project.storyCharacters || []
    // Limit to 3 additional characters
    if (existingCharacters.length >= 3) {
      return
    }
    set({
      project: {
        ...project,
        storyCharacters: [...existingCharacters, newCharacter],
        updatedAt: new Date(),
      },
    })
  },

  updateStoryCharacter: (id, updates) => {
    const { project } = get()
    if (project && project.storyCharacters) {
      set({
        project: {
          ...project,
          storyCharacters: project.storyCharacters.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  removeStoryCharacter: (id) => {
    const { project } = get()
    if (project && project.storyCharacters) {
      set({
        project: {
          ...project,
          storyCharacters: project.storyCharacters.filter(c => c.id !== id),
          updatedAt: new Date(),
        },
      })
    }
  },

  // Project persistence actions
  saveProject: async () => {
    const { project, savedProjectId } = get()
    if (!project) {
      set({ error: 'No project to save' })
      return
    }

    set({ isSaving: true, error: null })

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
      set({
        savedProjectId: data.project.id,
        isSaving: false,
      })

      // Refresh saved projects list
      get().fetchSavedProjects()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save project',
        isSaving: false,
      })
    }
  },

  loadProject: async (projectId) => {
    set({ isGenerating: true, error: null })

    try {
      const response = await fetch(`/api/storybook/projects/${projectId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load project')
      }

      const data = await response.json()
      const projectData = data.project.projectData as StorybookProject

      set({
        project: projectData,
        savedProjectId: projectId,
        currentStep: projectData.status === 'completed' ? 'preview' : 'story',
        storyMode: projectData.mainCharacterName ? 'generate' : 'paste',
        isGenerating: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load project',
        isGenerating: false,
      })
    }
  },

  fetchSavedProjects: async () => {
    try {
      const response = await fetch('/api/storybook/projects')

      if (!response.ok) {
        console.error('Failed to fetch saved projects')
        return
      }

      const data = await response.json()
      set({ savedProjects: data.projects || [] })
    } catch (error) {
      console.error('Error fetching saved projects:', error)
    }
  },

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
        get().clearProject()
      }

      // Refresh saved projects list
      get().fetchSavedProjects()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
      })
    }
  },

  clearProject: () => {
    set({
      project: null,
      savedProjectId: null,
      currentStep: 'character-setup',
      storyMode: 'generate',
      currentPageIndex: 0,
      storyIdeas: [],
      error: null,
    })
  },
}))
