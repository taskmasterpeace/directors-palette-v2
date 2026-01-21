/**
 * Storybook Store
 * Zustand store for managing storybook wizard state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Generate unique IDs without uuid dependency
function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
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
  KDPPageCount,
  StoryBeat,
  BookSpread,
  SpreadImageMode,
  SpreadTextPosition,
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

  // Cover variation state (UI-only, not persisted)
  pendingCoverVariations: string[]
  isGeneratingCoverVariations: boolean
  coverGenerationError?: string

  // Title page variation state (UI-only, not persisted)
  pendingTitlePageVariations: string[]
  isGeneratingTitlePageVariations: boolean
  titlePageGenerationError?: string

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
  setMainCharacter: (name: string, age: number, description?: string) => void
  setEducationCategory: (category: string) => void
  setEducationTopic: (topic: string) => void
  setStoryStructure: (structureId: string) => void
  setBookSettings: (pageCount: number, sentencesPerPage: number, bookFormat?: BookFormat) => void
  setKDPSettings: (kdpPageCount: KDPPageCount, options?: {
    includeFrontMatter?: boolean
    includeBackMatter?: boolean
    dedicationText?: string
    aboutAuthorText?: string
    authorPhotoUrl?: string
    copyrightYear?: number
    publisherName?: string
    isbnPlaceholder?: string
  }) => void
  setCustomization: (storySetting?: string, customSetting?: string, customElements?: string[], customNotes?: string) => void
  setStoryIdeas: (ideas: StoryIdea[]) => void
  selectStoryApproach: (id: string, title: string, summary: string) => void
  setGeneratedStory: (story: GeneratedStory) => void
  setExtractedElements: (elements: ExtractedElements) => void

  // Story character actions (siblings, friends, pets at setup)
  addStoryCharacter: (character: Omit<StoryCharacter, 'id'>) => void
  updateStoryCharacter: (id: string, updates: Partial<StoryCharacter>) => void
  removeStoryCharacter: (id: string) => void

  // Beat actions (AI-generated story moments)
  setBeats: (beats: StoryBeat[]) => void
  updateBeat: (beatId: string, updates: Partial<StoryBeat>) => void

  // Spread actions (user-designed layouts)
  initializeSpreadsFromBeats: () => void
  updateSpread: (spreadId: string, updates: Partial<BookSpread>) => void
  setSpreadImage: (spreadId: string, imageUrl: string, imageMode: SpreadImageMode) => void
  setSpreadTextPlacement: (spreadId: string, placement: SpreadTextPosition, leftText?: string, rightText?: string) => void
  markSpreadGenerated: (spreadId: string, leftImageUrl: string, rightImageUrl?: string) => void
  setSpreadGenerating: (spreadId: string, isGenerating: boolean) => void

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
    titlePageImageUrl: undefined,
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
  characterDescription?: string,
  bookFormat: BookFormat = 'square'
): StorybookProject {
  // Create initial main character with description (if provided)
  const mainCharacter: StorybookCharacter = {
    id: generateId(),
    name: characterName,
    tag: `@${characterName.replace(/\s+/g, '')}`,
    description: characterDescription,
  }

  return {
    id: generateId(),
    title: `${characterName}'s Story`,
    storyText: '',
    pages: [],
    characters: [mainCharacter],
    style: undefined,
    coverImageUrl: undefined,
    titlePageImageUrl: undefined,
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

export const useStorybookStore = create<StorybookState>()(
  persist(
    (set, get) => ({
  // Initial state
  currentStep: 'character-setup',
  storyMode: 'generate',
  isGenerating: false,
  error: null,
  project: null,
  currentPageIndex: 0,
  storyIdeas: [],

  // Cover variation state
  pendingCoverVariations: [],
  isGeneratingCoverVariations: false,
  coverGenerationError: undefined,

  // Title page variation state
  pendingTitlePageVariations: [],
  isGeneratingTitlePageVariations: false,
  titlePageGenerationError: undefined,

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

  // Cover variation actions
  setPendingCoverVariations: (urls) => set({ pendingCoverVariations: urls }),

  setGeneratingCoverVariations: (isGenerating) => set({ isGeneratingCoverVariations: isGenerating }),

  selectCoverVariation: (url) => {
    const { project } = get()
    if (!project) return

    // Apply selected cover to project
    set({
      project: {
        ...project,
        coverImageUrl: url,
        updatedAt: new Date(),
      },
      // Clear variations after selection
      pendingCoverVariations: [],
    })
  },

  setCoverGenerationError: (error) => set({ coverGenerationError: error }),

  // Title page variation actions
  setPendingTitlePageVariations: (urls) => set({ pendingTitlePageVariations: urls }),

  setGeneratingTitlePageVariations: (isGenerating) => set({ isGeneratingTitlePageVariations: isGenerating }),

  selectTitlePageVariation: (url) => {
    const { project } = get()
    if (!project) return

    // Apply selected title page to project
    set({
      project: {
        ...project,
        titlePageImageUrl: url,
        updatedAt: new Date(),
      },
      // Clear variations after selection
      pendingTitlePageVariations: [],
    })
  },

  setTitlePageGenerationError: (error) => set({ titlePageGenerationError: error }),

  // Education actions (NEW)
  setMainCharacter: (name, age, description) => {
    const { project } = get()
    if (project) {
      // Update or create main character with description
      const existingMainChar = project.characters[0]
      const updatedMainChar: StorybookCharacter = existingMainChar
        ? {
            ...existingMainChar,
            name,
            tag: `@${name.replace(/\s+/g, '')}`,
            description,
          }
        : {
            id: generateId(),
            name,
            tag: `@${name.replace(/\s+/g, '')}`,
            description,
          }

      set({
        project: {
          ...project,
          mainCharacterName: name,
          mainCharacterAge: age,
          characters: [updatedMainChar, ...project.characters.slice(1)],
          // mainCharacterPhotoUrl removed - deprecated field
          title: `${name}'s Story`,
          targetAge: age,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new project for generate mode
      const newProject = createGenerateProject(name, age, description)
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

  setStoryStructure: (structureId) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          storyStructureId: structureId,
          updatedAt: new Date(),
        },
      })
    }
  },

  setBookSettings: (pageCount, sentencesPerPage, bookFormat) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          pageCount,
          sentencesPerPage,
          ...(bookFormat && { bookFormat }),
          updatedAt: new Date(),
        },
      })
    }
  },

  setKDPSettings: (kdpPageCount, options = {}) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          kdpPageCount,
          includeFrontMatter: options.includeFrontMatter ?? true,
          includeBackMatter: options.includeBackMatter ?? true,
          dedicationText: options.dedicationText,
          aboutAuthorText: options.aboutAuthorText,
          authorPhotoUrl: options.authorPhotoUrl,
          copyrightYear: options.copyrightYear ?? new Date().getFullYear(),
          publisherName: options.publisherName,
          isbnPlaceholder: options.isbnPlaceholder,
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
      // Split extracted characters by role
      const mainCharacters: StorybookCharacter[] = elements.characters
        .filter(char => char.role === 'main')
        .map(char => ({
          id: generateId(),
          name: char.name,
          tag: `@${char.name.replace(/\s+/g, '')}`,
          description: char.description || '',
        }))

      // Supporting characters go to storyCharacters array
      const supportingCharacters: StoryCharacter[] = elements.characters
        .filter(char => char.role === 'supporting')
        .map(char => ({
          id: generateId(),
          name: char.name,
          role: 'other' as const, // CharacterRole type for store
          description: char.description || '',
        }))

      set({
        project: {
          ...project,
          extractedCharacters: elements.characters,
          extractedLocations: elements.locations,
          characters: mainCharacters,
          storyCharacters: [...(project.storyCharacters || []), ...supportingCharacters],
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

  // Beat actions (AI-generated story moments)
  setBeats: (beats) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          beats,
          updatedAt: new Date(),
        },
      })
    }
  },

  updateBeat: (beatId, updates) => {
    const { project } = get()
    if (project && project.beats) {
      set({
        project: {
          ...project,
          beats: project.beats.map(b =>
            b.id === beatId ? { ...b, ...updates } : b
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  // Spread actions (user-designed layouts)
  initializeSpreadsFromBeats: () => {
    const { project } = get()
    if (!project || !project.beats) return

    // Calculate first story page number (after front matter if applicable)
    const frontMatterPages = project.includeFrontMatter ? 6 : 0
    const firstStoryPage = frontMatterPages + 1

    // Create spreads from beats
    const spreads: BookSpread[] = project.beats.map((beat, index) => ({
      id: generateId(),
      spreadNumber: index + 1,
      beatId: beat.id,
      text: beat.text,
      sceneDescription: beat.sceneDescription,
      imageMode: 'full-spread' as const,
      textPlacement: 'left' as const,
      leftPageText: beat.text,
      rightPageText: undefined,
      textPosition: 'bottom' as const,
      leftPageNumber: firstStoryPage + index * 2,
      rightPageNumber: firstStoryPage + index * 2 + 1,
      isGenerated: false,
      isGenerating: false,
    }))

    set({
      project: {
        ...project,
        spreads,
        updatedAt: new Date(),
      },
    })
  },

  updateSpread: (spreadId, updates) => {
    const { project } = get()
    if (project && project.spreads) {
      set({
        project: {
          ...project,
          spreads: project.spreads.map(s =>
            s.id === spreadId ? { ...s, ...updates } : s
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  setSpreadImage: (spreadId, imageUrl, imageMode) => {
    const { project } = get()
    if (project && project.spreads) {
      set({
        project: {
          ...project,
          spreads: project.spreads.map(s =>
            s.id === spreadId
              ? { ...s, spreadImageUrl: imageUrl, imageMode }
              : s
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  setSpreadTextPlacement: (spreadId, placement, leftText, rightText) => {
    const { project } = get()
    if (project && project.spreads) {
      set({
        project: {
          ...project,
          spreads: project.spreads.map(s =>
            s.id === spreadId
              ? {
                  ...s,
                  textPlacement: placement,
                  leftPageText: leftText,
                  rightPageText: rightText,
                }
              : s
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  markSpreadGenerated: (spreadId, leftImageUrl, rightImageUrl) => {
    const { project } = get()
    if (project && project.spreads) {
      set({
        project: {
          ...project,
          spreads: project.spreads.map(s =>
            s.id === spreadId
              ? {
                  ...s,
                  leftImageUrl,
                  rightImageUrl: rightImageUrl || leftImageUrl, // Use same image if not split
                  isGenerated: true,
                  isGenerating: false,
                }
              : s
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  setSpreadGenerating: (spreadId, isGenerating) => {
    const { project } = get()
    if (project && project.spreads) {
      set({
        project: {
          ...project,
          spreads: project.spreads.map(s =>
            s.id === spreadId ? { ...s, isGenerating } : s
          ),
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

      // Clear localStorage draft after successful save
      localStorage.removeItem('directors-palette-storybook-draft')

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

      // Clear localStorage draft when explicitly loading a saved project
      localStorage.removeItem('directors-palette-storybook-draft')

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
    }),
    {
      name: 'directors-palette-storybook-draft',
      version: 1,
      partialize: (state) => ({
        currentStep: state.currentStep,
        storyMode: state.storyMode,
        project: state.project,
        currentPageIndex: state.currentPageIndex,
        storyIdeas: state.storyIdeas,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects
        if (state?.project) {
          state.project.createdAt = new Date(state.project.createdAt)
          state.project.updatedAt = new Date(state.project.updatedAt)
        }
      },
    }
  )
)
