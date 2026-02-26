/**
 * Generation Slice
 * Story ideas, approaches, generated stories, beats, spreads.
 */

import type { StoreApi } from 'zustand'
import type { StorybookStore } from '../storybook.store'
import type {
  StorybookPage,
  StoryBeat,
  BookSpread,
  SpreadImageMode,
  SpreadTextPosition,
  TextPosition,
} from '../../types/storybook.types'
import type { StoryIdea, GeneratedStory } from '../../types/education.types'
import { generateId } from '../storybook.helpers'

type Set = StoreApi<StorybookStore>['setState']
type Get = StoreApi<StorybookStore>['getState']

export const createGenerationSlice = (set: Set, get: Get) => ({
  // Initial state
  storyIdeas: [] as StoryIdea[],

  setStoryIdeas: (ideas: StoryIdea[]) => set({ storyIdeas: ideas }),

  selectStoryApproach: (id: string, title: string, summary: string) => {
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

  setGeneratedStory: (story: GeneratedStory) => {
    const { project } = get()
    if (project) {
      // Convert generated story to storybook pages
      const pages: StorybookPage[] = story.pages.map((page, index) => ({
        id: generateId(),
        pageNumber: index + 1,
        text: page.text,
        textPosition: 'bottom' as TextPosition,
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

  // Beat actions (AI-generated story moments)
  setBeats: (beats: StoryBeat[]) => {
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

  updateBeat: (beatId: string, updates: Partial<StoryBeat>) => {
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

  updateSpread: (spreadId: string, updates: Partial<BookSpread>) => {
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

  setSpreadImage: (spreadId: string, imageUrl: string, imageMode: SpreadImageMode) => {
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

  setSpreadTextPlacement: (spreadId: string, placement: SpreadTextPosition, leftText?: string, rightText?: string) => {
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

  markSpreadGenerated: (spreadId: string, leftImageUrl: string, rightImageUrl?: string) => {
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

  setSpreadGenerating: (spreadId: string, isGenerating: boolean) => {
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
})
