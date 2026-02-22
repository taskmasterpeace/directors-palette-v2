/**
 * Writing Studio Store
 * Manages song sections, drafts, idea bank, and generation state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  SongSection,
  IdeaEntry,
  DraftOption,
  ToneSettings,
  SectionType,
  IdeaTag,
} from '../types/writing-studio.types'
import { DEFAULT_TONE } from '../types/writing-studio.types'

interface WritingStudioState {
  // Song structure
  sections: SongSection[]
  activeSectionId: string | null
  concept: string

  // Idea bank
  ideaBank: IdeaEntry[]
  ideaBankOpen: boolean

  // Generation
  isGenerating: boolean
  draftOptions: DraftOption[] // current 4 options for active section

  // Section management
  addSection: (type: SectionType) => void
  removeSection: (id: string) => void
  reorderSections: (fromIndex: number, toIndex: number) => void
  setActiveSection: (id: string | null) => void
  updateSectionTone: (id: string, tone: Partial<ToneSettings>) => void
  lockSection: (id: string) => void
  unlockSection: (id: string) => void

  // Draft actions
  generateOptions: (sectionId: string, artistDna: unknown, previousSections: SongSection[]) => Promise<void>
  keepDraft: (sectionId: string, draft: DraftOption) => void
  chopDraft: (draft: DraftOption, tags: IdeaTag[]) => void
  tossDraft: (draftId: string) => void
  editDraft: (draftId: string, content: string) => void
  clearDraftOptions: () => void

  // Idea bank
  addToIdeaBank: (text: string, tags: IdeaTag[], source: 'chopped' | 'manual') => void
  removeFromIdeaBank: (id: string) => void
  toggleIdeaBank: () => void

  // Concept
  setConcept: (concept: string) => void

  // Reset
  resetStudio: () => void
}

export const useWritingStudioStore = create<WritingStudioState>()(
  persist(
    (set, get) => ({
      sections: [],
      activeSectionId: null,
      concept: '',
      ideaBank: [],
      ideaBankOpen: false,
      isGenerating: false,
      draftOptions: [],

      addSection: (type: SectionType) => {
        const section: SongSection = {
          id: crypto.randomUUID(),
          type,
          tone: { ...DEFAULT_TONE },
          selectedDraft: null,
          isLocked: false,
        }
        set((state) => ({
          sections: [...state.sections, section],
          activeSectionId: section.id,
        }))
      },

      removeSection: (id: string) => {
        set((state) => ({
          sections: state.sections.filter((s) => s.id !== id),
          activeSectionId: state.activeSectionId === id ? null : state.activeSectionId,
        }))
      },

      reorderSections: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const updated = [...state.sections]
          const [moved] = updated.splice(fromIndex, 1)
          updated.splice(toIndex, 0, moved)
          return { sections: updated }
        })
      },

      setActiveSection: (id) => set({ activeSectionId: id, draftOptions: [] }),

      updateSectionTone: (id, tone) => {
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, tone: { ...s.tone, ...tone } } : s
          ),
        }))
      },

      lockSection: (id) => {
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, isLocked: true } : s
          ),
        }))
      },

      unlockSection: (id) => {
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, isLocked: false } : s
          ),
        }))
      },

      generateOptions: async (sectionId, artistDna, previousSections) => {
        const section = get().sections.find((s) => s.id === sectionId)
        if (!section) return

        set({ isGenerating: true, draftOptions: [] })

        try {
          const res = await fetch('/api/artist-dna/generate-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionType: section.type,
              tone: section.tone,
              concept: get().concept,
              artistDna,
              previousSections: previousSections
                .filter((s) => s.selectedDraft)
                .map((s) => ({
                  type: s.type,
                  content: s.selectedDraft!.content,
                })),
            }),
          })

          if (res.ok) {
            const data = await res.json()
            set({ draftOptions: data.options || [] })
          }
        } catch (error) {
          console.error('Failed to generate options:', error)
        } finally {
          set({ isGenerating: false })
        }
      },

      keepDraft: (sectionId, draft) => {
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === sectionId ? { ...s, selectedDraft: draft, isLocked: true } : s
          ),
          draftOptions: [],
        }))
      },

      chopDraft: (draft, tags) => {
        const entry: IdeaEntry = {
          id: crypto.randomUUID(),
          text: draft.content,
          tags,
          source: 'chopped',
        }
        set((state) => ({
          ideaBank: [entry, ...state.ideaBank],
          draftOptions: state.draftOptions.filter((d) => d.id !== draft.id),
          ideaBankOpen: true, // Auto-open idea bank when chopping
        }))
      },

      tossDraft: (draftId) => {
        set((state) => ({
          draftOptions: state.draftOptions.filter((d) => d.id !== draftId),
        }))
      },

      editDraft: (draftId, content) => {
        set((state) => ({
          draftOptions: state.draftOptions.map((d) =>
            d.id === draftId ? { ...d, content } : d
          ),
        }))
      },

      clearDraftOptions: () => set({ draftOptions: [] }),

      addToIdeaBank: (text, tags, source) => {
        const entry: IdeaEntry = {
          id: crypto.randomUUID(),
          text,
          tags,
          source,
        }
        set((state) => ({ ideaBank: [entry, ...state.ideaBank] }))
      },

      removeFromIdeaBank: (id) => {
        set((state) => ({
          ideaBank: state.ideaBank.filter((e) => e.id !== id),
        }))
      },

      toggleIdeaBank: () => set((state) => ({ ideaBankOpen: !state.ideaBankOpen })),

      setConcept: (concept) => set({ concept }),

      resetStudio: () =>
        set({
          sections: [],
          activeSectionId: null,
          concept: '',
          draftOptions: [],
          isGenerating: false,
        }),
    }),
    {
      name: 'writing-studio',
      partialize: (state) => ({
        sections: state.sections,
        concept: state.concept,
        ideaBank: state.ideaBank,
      }),
    }
  )
)
