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
  JudgeResult,
  ArtistJudgment,
  DetectedSection,
} from '../types/writing-studio.types'
import { DEFAULT_TONE, BAR_COUNT_RANGES } from '../types/writing-studio.types'
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
  isGeneratingFullSong: boolean
  draftOptions: DraftOption[] // current options for active section
  sectionDrafts: Record<string, DraftOption[]> // per-section draft storage

  // Artist direction
  artistDirection: string
  sectionDirections: Record<string, string>

  // Artist judge
  isJudging: boolean
  judgeResult: JudgeResult | null
  sectionJudgments: Record<string, JudgeResult>

  // Revision
  isRevising: boolean
  revisionNotes: string

  // Section management
  addSection: (type: SectionType, defaultEmotion?: string) => void
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

  // Artist direction
  setArtistDirection: (direction: string) => void
  setSectionDirection: (sectionId: string, direction: string) => void

  // Judge
  judgeDrafts: (sectionId: string, drafts: DraftOption[], sectionType: SectionType, artistDna: unknown, artistDirection?: string) => Promise<void>
  clearJudgeResult: () => void

  // Revision
  reviseDraft: (sectionId: string, draft: DraftOption, revisionNotes: string, sectionType: SectionType, artistDna: unknown, judgment?: ArtistJudgment, artistDirection?: string) => Promise<void>
  setRevisionNotes: (notes: string) => void

  // Idea bank
  addToIdeaBank: (text: string, tags: IdeaTag[], source: 'chopped' | 'manual') => void
  removeFromIdeaBank: (id: string) => void
  toggleIdeaBank: () => void
  setActiveArtistId: (artistId: string | null) => void

  // Computed-like getter for current artist's idea bank
  getIdeaBank: () => IdeaEntry[]

  // Full song generation
  generateFullSong: (
    structure: { type: SectionType; barCount: number; direction?: string }[],
    tone: { emotion: string; energy: number; delivery: string },
    artistDna: unknown,
    concept: string
  ) => Promise<void>

  // Concept
  setConcept: (concept: string) => void

  // Import
  importSections: (detected: DetectedSection[]) => void

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
      isGeneratingFullSong: false,
      draftOptions: [],
      sectionDrafts: {},
      artistDirection: '',
      sectionDirections: {},
      isJudging: false,
      judgeResult: null,
      sectionJudgments: {},
      isRevising: false,
      revisionNotes: '',

      addSection: (type: SectionType, defaultEmotion?: string) => {
        const barDefaults = BAR_COUNT_RANGES[type]
        const section: SongSection = {
          id: crypto.randomUUID(),
          type,
          tone: { ...DEFAULT_TONE, emotion: defaultEmotion || DEFAULT_TONE.emotion, barCount: barDefaults.default },
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
              artistDirection: get().artistDirection,
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

            // Auto-judge the drafts
            if (options.length > 0) {
              const state = get()
              state.judgeDrafts(sectionId, options, section.type, artistDna, state.artistDirection)
            }
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

      setArtistDirection: (direction) => set({ artistDirection: direction }),

      setSectionDirection: (sectionId, direction) => {
        set((state) => ({
          sectionDirections: { ...state.sectionDirections, [sectionId]: direction },
        }))
      },

      judgeDrafts: async (sectionId, drafts, sectionType, artistDna, artistDirection) => {
        set({ isJudging: true, judgeResult: null })
        try {
          const res = await fetch('/api/artist-dna/judge-drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drafts, sectionType, artistDna, artistDirection }),
          })
          if (res.ok) {
            const result = await res.json()
            set((state) => ({
              judgeResult: result,
              sectionJudgments: { ...state.sectionJudgments, [sectionId]: result },
            }))
          }
        } catch (error) {
          logger.musicLab.error('Failed to judge drafts', { error: error instanceof Error ? error.message : String(error) })
        } finally {
          set({ isJudging: false })
        }
      },

      clearJudgeResult: () => set({ judgeResult: null }),

      reviseDraft: async (sectionId, draft, revisionNotes, sectionType, artistDna, judgment, artistDirection) => {
        set({ isRevising: true })
        try {
          const res = await fetch('/api/artist-dna/revise-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalContent: draft.content,
              sectionType,
              revisionNotes,
              judgment,
              artistDna,
              artistDirection,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            // Replace the draft content with the revised version
            set((state) => ({
              draftOptions: state.draftOptions.map((d) =>
                d.id === draft.id ? { ...d, content: data.content } : d
              ),
              sectionDrafts: {
                ...state.sectionDrafts,
                [sectionId]: (state.sectionDrafts[sectionId] || []).map((d) =>
                  d.id === draft.id ? { ...d, content: data.content } : d
                ),
              },
              revisionNotes: '',
            }))
          }
        } catch (error) {
          logger.musicLab.error('Failed to revise draft', { error: error instanceof Error ? error.message : String(error) })
        } finally {
          set({ isRevising: false })
        }
      },

      setRevisionNotes: (notes) => set({ revisionNotes: notes }),

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

      generateFullSong: async (structure, tone, artistDna, concept) => {
        set({ isGeneratingFullSong: true, sections: [], draftOptions: [], sectionDrafts: {}, activeSectionId: null })

        try {
          const res = await fetch('/api/artist-dna/generate-full-song', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ structure, tone, concept, artistDna, artistDirection: get().artistDirection }),
          })

          if (res.ok) {
            const data = await res.json()
            const generatedSections = data.sections || []

            const newSections: SongSection[] = generatedSections.map(
              (s: { type: SectionType; content: string }, i: number) => {
                const barDefaults = BAR_COUNT_RANGES[s.type] || BAR_COUNT_RANGES.verse
                const barCount = structure[i]?.barCount ?? barDefaults.default
                return {
                  id: crypto.randomUUID(),
                  type: s.type,
                  tone: { ...tone, barCount },
                  selectedDraft: {
                    id: crypto.randomUUID(),
                    label: 'A',
                    content: s.content,
                  },
                  isLocked: true,
                }
              }
            )

            set({ sections: newSections, activeSectionId: newSections[0]?.id || null })
          }
        } catch (error) {
          logger.musicLab.error('Failed to generate full song', { error: error instanceof Error ? error.message : String(error) })
        } finally {
          set({ isGeneratingFullSong: false })
        }
      },

      setConcept: (concept) => set({ concept }),

      importSections: (detected) => {
        const sections: SongSection[] = detected.map((d) => {
          const barDefaults = BAR_COUNT_RANGES[d.type]
          return {
            id: crypto.randomUUID(),
            type: d.type,
            tone: { ...DEFAULT_TONE, barCount: barDefaults.default },
            selectedDraft: {
              id: crypto.randomUUID(),
              content: d.lines.join('\n'),
              label: 'A',
            },
            isLocked: false,
          }
        })
        set({
          sections,
          activeSectionId: sections[0]?.id ?? null,
          draftOptions: [],
          sectionDrafts: {},
          sectionJudgments: {},
          sectionDirections: {},
        })
      },

      resetStudio: () =>
        set({
          sections: [],
          activeSectionId: null,
          concept: '',
          draftOptions: [],
          sectionDrafts: {},
          isGenerating: false,
          isGeneratingFullSong: false,
          artistDirection: '',
          sectionDirections: {},
          isJudging: false,
          judgeResult: null,
          sectionJudgments: {},
          isRevising: false,
          revisionNotes: '',
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
        artistDirection: state.artistDirection,
        sectionDirections: state.sectionDirections,
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
