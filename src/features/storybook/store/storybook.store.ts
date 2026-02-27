/**
 * Storybook Store (Main)
 * Zustand store for managing storybook wizard state and project data.
 * Slices: project, character, education, generation
 *
 * Generation UI state -> generation.store.ts
 * Persistence (save/load) -> persistence.store.ts
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
import type { StoryIdea, GeneratedStory, ExtractedElements } from '../types/education.types'

import { createProjectSlice } from './slices/project.slice'
import { createCharacterSlice } from './slices/character.slice'
import { createEducationSlice } from './slices/education.slice'
import { createGenerationSlice } from './slices/generation.slice'
import { createGenerateProject as createGenerateProjectHelper } from './storybook.helpers'

// ── Type definition ──────────────────────────────────────────────────────────
// Keep the full interface so external consumers can type-check against the store.

export interface StorybookStore {
  // Wizard state
  currentStep: WizardStep
  storyMode: StoryMode
  furthestStepIndex: number

  // Project data
  project: StorybookProject | null

  // Current page being edited (in page generation step)
  currentPageIndex: number

  // Story ideas (for generate mode)
  storyIdeas: StoryIdea[]

  // Step navigation
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

  // Direct project replacement (used by persistence store for loadProject)
  _setProjectData: (project: StorybookProject) => void

  // Education actions
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
  setPageTextPosition: (pageId: string, position: TextPosition) => void

  // Recipe configuration actions
  setRecipeConfig: (config: Partial<import('../types/storybook.types').StorybookRecipeConfig>) => void

  // Clear project action (resets wizard + project state)
  clearProject: () => void
}

// ── Store creation ───────────────────────────────────────────────────────────

export const useStorybookStore = create<StorybookStore>()(
  persist(
    (set, get) => ({
      // Combine slices
      ...createProjectSlice(set, get),
      ...createCharacterSlice(set, get),
      ...createEducationSlice(set, get),
      ...createGenerationSlice(set, get),

      // createGenerateProject lives here because it also sets wizard state
      createGenerateProject: (characterName: string, characterAge: number) => {
        const project = createGenerateProjectHelper(characterName, characterAge)
        set({ project, currentStep: 'category', storyMode: 'generate' })
      },
    }),
    {
      name: 'directors-palette-storybook-draft',
      version: 1,
      partialize: (state) => ({
        currentStep: state.currentStep,
        storyMode: state.storyMode,
        furthestStepIndex: state.furthestStepIndex,
        project: state.project,
        currentPageIndex: state.currentPageIndex,
        storyIdeas: state.storyIdeas,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects
        if (state?.project) {
          state.project.createdAt = new Date(state.project.createdAt)
          state.project.updatedAt = new Date(state.project.updatedAt)

          // Migrate to bookCharacters if not present
          if (!state.project.bookCharacters) {
            state.project.bookCharacters = [
              ...(Array.isArray(state.project.characters) ? state.project.characters : []).map(c => ({
                id: c.id,
                name: c.name,
                tag: c.tag,
                role: 'protagonist' as const,
                description: c.description,
                sourcePhotoUrls: c.sourcePhotoUrls || (c.sourcePhotoUrl ? [c.sourcePhotoUrl] : []),
                characterSheetUrl: c.characterSheetUrl,
                outfitDescription: c.outfitDescription,
              })),
              ...(state.project.storyCharacters || []).map(sc => ({
                id: sc.id,
                name: sc.name,
                tag: `@${sc.name.replace(/\s+/g, '')}`,
                role: 'supporting' as const,
                characterRole: sc.role,
                sourcePhotoUrls: sc.photoUrl ? [sc.photoUrl] : [],
                description: sc.description,
                characterSheetUrl: sc.characterSheetUrl,
                relationship: sc.relationship,
                age: sc.age,
                outfitDescription: sc.outfitDescription,
              })),
            ]
          }
        }
      },
    }
  )
)
