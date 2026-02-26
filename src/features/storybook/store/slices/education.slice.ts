/**
 * Education Slice
 * Category, topic, structure, custom education settings, book settings, KDP settings.
 */

import type { StoreApi } from 'zustand'
import type { StorybookStore } from '../storybook.store'
import type { KDPPageCount, BookFormat } from '../../types/storybook.types'

type Set = StoreApi<StorybookStore>['setState']
type Get = StoreApi<StorybookStore>['getState']

export const createEducationSlice = (set: Set, get: Get) => ({
  setEducationCategory: (category: string) => {
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

  setEducationTopic: (topic: string) => {
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

  setStoryStructure: (structureId: string) => {
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

  setBookSettings: (pageCount: number, sentencesPerPage: number, bookFormat?: BookFormat) => {
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

  setKDPSettings: (kdpPageCount: KDPPageCount, options: {
    includeFrontMatter?: boolean
    includeBackMatter?: boolean
    dedicationText?: string
    aboutAuthorText?: string
    authorPhotoUrl?: string
    copyrightYear?: number
    publisherName?: string
    isbnPlaceholder?: string
  } = {}) => {
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

  setCustomization: (storySetting?: string, customSetting?: string, customElements?: string[], customNotes?: string) => {
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
})
