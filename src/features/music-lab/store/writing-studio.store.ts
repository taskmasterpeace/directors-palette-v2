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
import { logger } from '@/lib/logger'

interface WritingStudioState {
  // Song structure
  sections: SongSection[]
  activeSectionId: string | null
  concept: string

  // Idea bank — per-artist
  ideaBankByArtist: Record<string, IdeaEntry[]>
  activeArtistId: string | null
  ideaBankOpen: boolean

  // Generation
  isGenerating: boolean
  draftOptions: DraftOption[] // current options for active section
  sectionDrafts: Record<string, DraftOption[]> // per-section draft storage

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
  setActiveArtistId: (artistId: string | null) => void

  // Computed-like getter for current artist's idea bank
  getIdeaBank: () => IdeaEntry[]

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
      ideaBankByArtist: {},
      activeArtistId: null,
      ideaBankOpen: false,
      isGenerating: false,
      draftOptions: [],
      sectionDrafts: {},

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
        set((state) => {
          const { [id]: _removed, ...restDrafts } = state.sectionDrafts
          return {
            sections: state.sections.filter((s) => s.id !== id),
            activeSectionId: state.activeSectionId === id ? null : state.activeSectionId,
            sectionDrafts: restDrafts,
            draftOptions: state.activeSectionId === id ? [] : state.draftOptions,
          }
        })
      },

      reorderSections: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const updated = [...state.sections]
          const [moved] = updated.splice(fromIndex, 1)
          updated.splice(toIndex, 0, moved)
          return { sections: updated }
        })
      },

      setActiveSection: (id) => {
        const state = get()
        const updatedSectionDrafts = { ...state.sectionDrafts }

        // Save current section's drafts before switching
        if (state.activeSectionId) {
          updatedSectionDrafts[state.activeSectionId] = state.draftOptions
        }

        // Load target section's drafts
        const targetDrafts = id ? (updatedSectionDrafts[id] || []) : []

        set({
          activeSectionId: id,
          draftOptions: targetDrafts,
          sectionDrafts: updatedSectionDrafts,
        })
      },

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
            const options = data.options || []
            set((state) => ({
              draftOptions: options,
              sectionDrafts: { ...state.sectionDrafts, [sectionId]: options },
            }))
          }
        } catch (error) {
          logger.musicLab.error('Failed to generate options', { error: error instanceof Error ? error.message : String(error) })
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
          sectionDrafts: { ...state.sectionDrafts, [sectionId]: [] },
        }))
      },

      chopDraft: (draft, tags) => {
        const state = get()
        const artistId = state.activeArtistId || '_default'
        const entry: IdeaEntry = {
          id: crypto.randomUUID(),
          text: draft.content,
          tags,
          source: 'chopped',
        }
        const currentBank = state.ideaBankByArtist[artistId] || []
        set((state) => ({
          ideaBankByArtist: {
            ...state.ideaBankByArtist,
            [artistId]: [entry, ...currentBank],
          },
          draftOptions: state.draftOptions.filter((d) => d.id !== draft.id),
          ideaBankOpen: true,
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
        const state = get()
        const artistId = state.activeArtistId || '_default'
        const entry: IdeaEntry = {
          id: crypto.randomUUID(),
          text,
          tags,
          source,
        }
        const currentBank = state.ideaBankByArtist[artistId] || []
        set((state) => ({
          ideaBankByArtist: {
            ...state.ideaBankByArtist,
            [artistId]: [entry, ...currentBank],
          },
        }))
      },

      removeFromIdeaBank: (id) => {
        const state = get()
        const artistId = state.activeArtistId || '_default'
        const currentBank = state.ideaBankByArtist[artistId] || []
        set((state) => ({
          ideaBankByArtist: {
            ...state.ideaBankByArtist,
            [artistId]: currentBank.filter((e) => e.id !== id),
          },
        }))
      },

      toggleIdeaBank: () => set((state) => ({ ideaBankOpen: !state.ideaBankOpen })),

      setActiveArtistId: (artistId) => set({ activeArtistId: artistId }),

      getIdeaBank: () => {
        const state = get()
        const artistId = state.activeArtistId || '_default'
        return state.ideaBankByArtist[artistId] || []
      },

      setConcept: (concept) => set({ concept }),

      resetStudio: () =>
        set({
          sections: [],
          activeSectionId: null,
          concept: '',
          draftOptions: [],
          sectionDrafts: {},
          isGenerating: false,
        }),
    }),
    {
      name: 'writing-studio',
      partialize: (state) => ({
        sections: state.sections,
        concept: state.concept,
        ideaBankByArtist: state.ideaBankByArtist,
        sectionDrafts: state.sectionDrafts,
        activeArtistId: state.activeArtistId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<WritingStudioState> & { ideaBank?: IdeaEntry[] }
        // Migrate old ideaBank array to ideaBankByArtist
        let ideaBankByArtist = p.ideaBankByArtist || {}
        if (p.ideaBank && Array.isArray(p.ideaBank) && p.ideaBank.length > 0 && Object.keys(ideaBankByArtist).length === 0) {
          ideaBankByArtist = { _default: p.ideaBank }
        }
        return {
          ...current,
          ...p,
          ideaBankByArtist,
        }
      },
    }
  )
)
