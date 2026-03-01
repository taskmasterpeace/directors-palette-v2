/**
 * Artist DNA Store
 * Manages artist profiles, draft editing state, and prompt generation
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ArtistDNA,
  ArtistDnaTab,
  ArtistGalleryItem,
  CatalogEntry,
  CatalogSongAnalysis,
  GalleryItemType,
  SuggestionBatch,
  SunoPromptOutput,
  UserArtistProfile,
} from '../types/artist-dna.types'
import { createEmptyDNA } from '../types/artist-dna.types'
import { artistDnaService } from '../services/artist-dna.service'
import {
  buildVocalPrompt,
  buildMusicStylePrompt,
  buildCombinedPrompt,
} from '../services/suno-prompt-builder'
import { logger } from '@/lib/logger'

interface ArtistDnaState {
  // Server data
  artists: UserArtistProfile[]
  isLoading: boolean
  isInitialized: boolean
  currentUserId: string | null

  // Editor state (persisted)
  editorOpen: boolean
  activeArtistId: string | null
  draft: ArtistDNA
  isDirty: boolean
  activeTab: ArtistDnaTab

  // Personality print
  personalityPrintStatus: 'idle' | 'generating' | 'done' | 'error'

  // Suggestion cache
  suggestionCache: Record<string, SuggestionBatch>

  // Suno output
  sunoOutput: SunoPromptOutput | null
  combineVocalAndStyle: boolean

  // Actions - Init
  initialize: (userId: string) => Promise<void>

  // Actions - CRUD
  createArtist: () => Promise<UserArtistProfile | null>
  saveArtist: () => Promise<boolean>
  deleteArtist: (id: string) => Promise<boolean>
  loadArtistIntoDraft: (id: string) => void
  startNewArtist: () => void

  // Actions - Seed from real artist
  startFromArtist: (artistName: string) => Promise<boolean | 'insufficient_credits'>
  isSeedingFromArtist: boolean
  seededFrom: string | null
  clearSeededFrom: () => void

  // Actions - Draft editing
  setActiveTab: (tab: ArtistDnaTab) => void
  updateDraft: <S extends keyof ArtistDNA>(section: S, data: Partial<ArtistDNA[S]>) => void
  setDraftName: (name: string) => void

  // Actions - Catalog
  addCatalogEntry: (entry: Omit<CatalogEntry, 'id' | 'createdAt'>) => void
  removeCatalogEntry: (id: string) => void

  // Actions - Genome
  analyzeSong: (entryId: string) => Promise<void>
  recalculateGenome: () => Promise<void>
  analyzeCatalog: () => Promise<void>
  isAnalyzingCatalog: boolean

  // Actions - Suggestions
  setSuggestions: (field: string, suggestions: string[]) => void
  consumeSuggestion: (field: string, value: string) => void
  dismissSuggestion: (field: string, index: number) => void
  clearSuggestions: (field: string) => void

  // Actions - Gallery
  addGalleryItem: (item: { url: string; type: GalleryItemType; category?: string; prompt?: string; aspectRatio: string }) => void
  removeGalleryItem: (id: string) => void

  // Actions - Mix
  generateMix: () => Promise<void>
  toggleCombineMode: () => void

  // Actions - Navigation
  closeEditor: () => void
}

// Debounce timer for genome recalculation
let genomeDebounceTimer: ReturnType<typeof setTimeout> | null = null

export const useArtistDnaStore = create<ArtistDnaState>()(
  persist(
    (set, get) => ({
      // Initial state
      artists: [],
      isLoading: false,
      isInitialized: false,
      currentUserId: null,
      editorOpen: false,
      activeArtistId: null,
      draft: createEmptyDNA(),
      isDirty: false,
      activeTab: 'identity',
      suggestionCache: {},
      sunoOutput: null,
      combineVocalAndStyle: false,
      isSeedingFromArtist: false,
      seededFrom: null,
      isAnalyzingCatalog: false,
      personalityPrintStatus: 'idle',

      clearSeededFrom: () => set({ seededFrom: null }),

      initialize: async (userId: string) => {
        const state = get()
        if (state.isInitialized && state.currentUserId === userId) return

        set({ isLoading: true })
        try {
          const artists = await artistDnaService.getArtists(userId)
          set({ artists, isInitialized: true, currentUserId: userId, isLoading: false })
        } catch (error) {
          logger.musicLab.error('Error initializing artist DNA store', { error: error instanceof Error ? error.message : String(error) })
          set({ isLoading: false })
        }
      },

      createArtist: async () => {
        const { currentUserId, draft } = get()
        if (!currentUserId) return null

        const name = draft.identity.stageName || draft.identity.realName || 'Untitled Artist'
        const result = await artistDnaService.createArtist(currentUserId, name, draft)

        if (result) {
          set((state) => ({
            artists: [result, ...state.artists],
            activeArtistId: result.id,
            isDirty: false,
          }))
          // Fire async personality print generation (non-blocking)
          set({ personalityPrintStatus: 'generating' })
          fetch('/api/artist-dna/generate-personality-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId: result.id, dna: draft }),
          }).then(() => set({ personalityPrintStatus: 'done' }))
            .catch(() => set({ personalityPrintStatus: 'error' }))
        }

        return result
      },

      saveArtist: async () => {
        const { currentUserId, activeArtistId, draft } = get()
        if (!currentUserId) return false

        const name = draft.identity.stageName || draft.identity.realName || 'Untitled Artist'

        if (activeArtistId) {
          const result = await artistDnaService.updateArtist(activeArtistId, currentUserId, name, draft)
          if (result) {
            set((state) => ({
              artists: state.artists.map((a) => (a.id === activeArtistId ? result : a)),
              isDirty: false,
            }))
            // Fire async personality print generation (non-blocking)
            set({ personalityPrintStatus: 'generating' })
            fetch('/api/artist-dna/generate-personality-print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ artistId: activeArtistId, dna: draft }),
            }).then(() => set({ personalityPrintStatus: 'done' }))
              .catch(() => set({ personalityPrintStatus: 'error' }))
            return true
          }
          return false
        } else {
          const result = await get().createArtist()
          return result !== null
        }
      },

      deleteArtist: async (id: string) => {
        const { currentUserId } = get()
        if (!currentUserId) return false

        const success = await artistDnaService.deleteArtist(id, currentUserId)
        if (success) {
          set((state) => ({
            artists: state.artists.filter((a) => a.id !== id),
            activeArtistId: state.activeArtistId === id ? null : state.activeArtistId,
          }))
        }
        return success
      },

      loadArtistIntoDraft: (id: string) => {
        const artist = get().artists.find((a) => a.id === id)
        if (artist) {
          const defaults = createEmptyDNA()
          const dna = structuredClone(artist.dna)
          // Merge with defaults so older DB records don't crash on missing array fields
          const identity = { ...defaults.identity, ...dna.identity }
          // Migrate old `name` field to `stageName` for backwards compat
          const oldName = (dna.identity as unknown as Record<string, unknown>)?.name as string | undefined
          if (oldName && !identity.stageName) identity.stageName = oldName
          // Migrate old `region` field to `state` for backwards compat
          const oldRegion = (dna.identity as unknown as Record<string, unknown>)?.region as string | undefined
          if (oldRegion && !identity.state) identity.state = oldRegion
          const sound = { ...defaults.sound, ...dna.sound }
          if (!Array.isArray(sound.genreEvolution)) sound.genreEvolution = []
          if (!Array.isArray(sound.keyCollaborators)) sound.keyCollaborators = []
          const lookMerged = { ...defaults.look, ...dna.look }
          if (!Array.isArray(lookMerged.gallery)) lookMerged.gallery = []
          const merged: ArtistDNA = {
            identity,
            sound,
            persona: { ...defaults.persona, ...dna.persona },
            lexicon: { ...defaults.lexicon, ...dna.lexicon },
            look: lookMerged,
            catalog: { ...defaults.catalog, ...dna.catalog },
            lowConfidenceFields: Array.isArray(dna.lowConfidenceFields) ? dna.lowConfidenceFields : [],
          }
          set({
            editorOpen: true,
            activeArtistId: id,
            draft: merged,
            isDirty: false,
            activeTab: 'identity',
            sunoOutput: null,
            seededFrom: null,
          })
        }
      },

      startNewArtist: () => {
        set({
          editorOpen: true,
          activeArtistId: null,
          draft: createEmptyDNA(),
          isDirty: false,
          activeTab: 'identity',
          sunoOutput: null,
          suggestionCache: {},
          seededFrom: null,
        })
      },

      startFromArtist: async (artistName: string) => {
        set({ isSeedingFromArtist: true })
        try {
          const res = await fetch('/api/artist-dna/seed-from-artist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistName }),
          })
          if (!res.ok) {
            set({ isSeedingFromArtist: false })
            if (res.status === 402) return 'insufficient_credits'
            return false
          }
          const { dna, seededFrom } = await res.json()
          if (!dna) {
            set({ isSeedingFromArtist: false })
            return false
          }
          // Merge with defaults so any missing fields get sensible values
          const defaults = createEmptyDNA()
          // Ensure array fields from AI responses are actually arrays
          const ensureArrays = <T extends Record<string, unknown>>(obj: T, def: T): T => {
            const result = { ...obj }
            for (const key of Object.keys(def)) {
              if (Array.isArray(def[key]) && !Array.isArray(result[key])) {
                (result as Record<string, unknown>)[key] = []
              }
            }
            return result
          }
          const sound = ensureArrays({ ...defaults.sound, ...dna.sound }, defaults.sound)
          const merged: ArtistDNA = {
            identity: ensureArrays({ ...defaults.identity, ...dna.identity }, defaults.identity),
            sound,
            persona: ensureArrays({ ...defaults.persona, ...dna.persona }, defaults.persona),
            lexicon: ensureArrays({ ...defaults.lexicon, ...dna.lexicon }, defaults.lexicon),
            look: ensureArrays({ ...defaults.look, ...dna.look }, defaults.look),
            catalog: { ...defaults.catalog, ...dna.catalog },
            lowConfidenceFields: Array.isArray(dna.lowConfidenceFields) ? dna.lowConfidenceFields : [],
          }
          set({
            editorOpen: true,
            activeArtistId: null,
            draft: merged,
            isDirty: true,
            activeTab: 'identity',
            sunoOutput: null,
            suggestionCache: {},
            isSeedingFromArtist: false,
            seededFrom: seededFrom || artistName,
          })
          return true
        } catch (error) {
          logger.musicLab.error('Error seeding from artist', { error: error instanceof Error ? error.message : String(error) })
          set({ isSeedingFromArtist: false })
          return false
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateDraft: (section, data) => {
        set((state) => ({
          draft: {
            ...state.draft,
            [section]: { ...state.draft[section], ...data },
          },
          isDirty: true,
        }))
      },

      setDraftName: (name: string) => {
        set((state) => ({
          draft: {
            ...state.draft,
            identity: { ...state.draft.identity, stageName: name },
          },
          isDirty: true,
        }))
      },

      addCatalogEntry: (entry) => {
        const newEntry: CatalogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          analysisStatus: entry.lyrics ? 'pending' : undefined,
        }
        set((state) => ({
          draft: {
            ...state.draft,
            catalog: {
              ...state.draft.catalog,
              entries: [...state.draft.catalog.entries, newEntry],
            },
          },
          isDirty: true,
        }))
        // Fire async analysis if there are lyrics
        if (newEntry.lyrics) {
          get().analyzeSong(newEntry.id)
        }
      },

      removeCatalogEntry: (id) => {
        set((state) => ({
          draft: {
            ...state.draft,
            catalog: {
              ...state.draft.catalog,
              entries: state.draft.catalog.entries.filter((e) => e.id !== id),
            },
          },
          isDirty: true,
        }))
        // Recalculate genome after removal (debounced)
        const remaining = get().draft.catalog.entries
        const analyzedCount = remaining.filter((e) => e.analysis).length
        if (analyzedCount > 0) {
          if (genomeDebounceTimer) clearTimeout(genomeDebounceTimer)
          genomeDebounceTimer = setTimeout(() => {
            get().recalculateGenome()
          }, 2000)
        } else {
          // No analyzed songs left — clear genome
          set((state) => ({
            draft: {
              ...state.draft,
              catalog: { ...state.draft.catalog, genome: undefined, genomeStatus: 'idle' },
            },
          }))
        }
      },

      analyzeSong: async (entryId: string) => {
        const { draft } = get()
        const entry = draft.catalog.entries.find((e) => e.id === entryId)
        if (!entry || !entry.lyrics) return

        // Mark as analyzing
        set((state) => ({
          draft: {
            ...state.draft,
            catalog: {
              ...state.draft.catalog,
              entries: state.draft.catalog.entries.map((e) =>
                e.id === entryId ? { ...e, analysisStatus: 'analyzing' as const } : e
              ),
            },
          },
        }))

        try {
          const artistName = draft.identity.stageName || draft.identity.realName || ''
          const res = await fetch('/api/artist-dna/analyze-song', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lyrics: entry.lyrics,
              title: entry.title,
              mood: entry.mood,
              tempo: entry.tempo,
              artistName,
            }),
          })

          if (!res.ok) throw new Error('Analysis failed')

          const { analysis } = await res.json() as { analysis: CatalogSongAnalysis }

          set((state) => ({
            draft: {
              ...state.draft,
              catalog: {
                ...state.draft.catalog,
                entries: state.draft.catalog.entries.map((e) =>
                  e.id === entryId ? { ...e, analysis, analysisStatus: 'done' as const } : e
                ),
              },
            },
            isDirty: true,
          }))

          // Debounced genome recalculation
          if (genomeDebounceTimer) clearTimeout(genomeDebounceTimer)
          genomeDebounceTimer = setTimeout(() => {
            get().recalculateGenome()
          }, 2000)
        } catch (error) {
          logger.musicLab.error('Song analysis error', { error: error instanceof Error ? error.message : String(error) })
          set((state) => ({
            draft: {
              ...state.draft,
              catalog: {
                ...state.draft.catalog,
                entries: state.draft.catalog.entries.map((e) =>
                  e.id === entryId ? { ...e, analysisStatus: 'error' as const } : e
                ),
              },
            },
          }))
        }
      },

      recalculateGenome: async () => {
        const { draft } = get()
        const analyzedEntries = draft.catalog.entries.filter((e) => e.analysis)
        if (analyzedEntries.length === 0) return

        set((state) => ({
          draft: {
            ...state.draft,
            catalog: { ...state.draft.catalog, genomeStatus: 'calculating' },
          },
        }))

        try {
          const artistName = draft.identity.stageName || draft.identity.realName || ''
          const payload = analyzedEntries.map((e) => ({
            title: e.title,
            mood: e.mood,
            tempo: e.tempo,
            analysis: e.analysis!,
          }))

          const res = await fetch('/api/artist-dna/calculate-genome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: payload, artistName }),
          })

          if (!res.ok) throw new Error('Genome calculation failed')

          const { genome } = await res.json()

          set((state) => ({
            draft: {
              ...state.draft,
              catalog: { ...state.draft.catalog, genome, genomeStatus: 'done' },
            },
            isDirty: true,
          }))
        } catch (error) {
          logger.musicLab.error('Genome calculation error', { error: error instanceof Error ? error.message : String(error) })
          set((state) => ({
            draft: {
              ...state.draft,
              catalog: { ...state.draft.catalog, genomeStatus: 'error' },
            },
          }))
        }
      },

      analyzeCatalog: async () => {
        if (get().isAnalyzingCatalog) return
        set({ isAnalyzingCatalog: true })
        try {
          const { draft, analyzeSong } = get()
          const unanalyzed = draft.catalog.entries.filter(
            (e) => e.lyrics && (!e.analysis || e.analysisStatus === 'error')
          )
          // Analyze sequentially to avoid rate limits
          for (const entry of unanalyzed) {
            await analyzeSong(entry.id)
          }
        } finally {
          set({ isAnalyzingCatalog: false })
        }
      },

      setSuggestions: (field, suggestions) => {
        set((state) => ({
          suggestionCache: {
            ...state.suggestionCache,
            [field]: { suggestions, cursor: 0 },
          },
        }))
      },

      consumeSuggestion: (field, value) => {
        const batch = get().suggestionCache[field]
        if (!batch) return
        set((state) => ({
          suggestionCache: {
            ...state.suggestionCache,
            [field]: {
              suggestions: batch.suggestions.filter((s) => s !== value),
              cursor: batch.cursor,
            },
          },
        }))
      },

      dismissSuggestion: (field, index) => {
        const batch = get().suggestionCache[field]
        if (!batch) return
        const updated = [...batch.suggestions]
        updated.splice(index, 1)
        set((state) => ({
          suggestionCache: {
            ...state.suggestionCache,
            [field]: { suggestions: updated, cursor: batch.cursor },
          },
        }))
      },

      clearSuggestions: (field) => {
        set((state) => {
          const cache = { ...state.suggestionCache }
          delete cache[field]
          return { suggestionCache: cache }
        })
      },

      addGalleryItem: (item) => {
        const newItem: ArtistGalleryItem = {
          id: crypto.randomUUID(),
          url: item.url,
          type: item.type,
          category: item.category,
          prompt: item.prompt,
          aspectRatio: item.aspectRatio,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          draft: {
            ...state.draft,
            look: {
              ...state.draft.look,
              gallery: [...(Array.isArray(state.draft.look.gallery) ? state.draft.look.gallery : []), newItem],
            },
          },
          isDirty: true,
        }))
      },

      removeGalleryItem: (id) => {
        set((state) => ({
          draft: {
            ...state.draft,
            look: {
              ...state.draft.look,
              gallery: (Array.isArray(state.draft.look.gallery) ? state.draft.look.gallery : []).filter((g) => g.id !== id),
            },
          },
          isDirty: true,
        }))
      },

      generateMix: async () => {
        const { draft, combineVocalAndStyle } = get()

        const vocalPrompt = buildVocalPrompt(draft)
        const musicStylePrompt = buildMusicStylePrompt(draft)

        // Lyrics template via LLM
        let lyricsTemplate = ''
        try {
          const res = await fetch('/api/artist-dna/generate-mix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dna: draft }),
          })
          if (res.ok) {
            const data = await res.json()
            lyricsTemplate = data.lyricsTemplate || ''
          }
        } catch (error) {
          logger.musicLab.error('Error generating lyrics template', { error: error instanceof Error ? error.message : String(error) })
        }

        const output: SunoPromptOutput = {
          vocalPrompt,
          musicStylePrompt,
          lyricsTemplate,
        }

        if (combineVocalAndStyle) {
          output.combinedPrompt = buildCombinedPrompt(vocalPrompt, musicStylePrompt)
        }

        set({ sunoOutput: output })
      },

      toggleCombineMode: () => {
        set((state) => {
          const newCombine = !state.combineVocalAndStyle
          const output = state.sunoOutput
            ? {
                ...state.sunoOutput,
                combinedPrompt: newCombine
                  ? buildCombinedPrompt(state.sunoOutput.vocalPrompt, state.sunoOutput.musicStylePrompt)
                  : undefined,
              }
            : null
          return { combineVocalAndStyle: newCombine, sunoOutput: output }
        })
      },

      closeEditor: () => {
        set({
          editorOpen: false,
          activeArtistId: null,
          activeTab: 'identity',
          sunoOutput: null,
          suggestionCache: {},
          seededFrom: null,
        })
      },
    }),
    {
      name: 'artist-dna-editor',
      partialize: (state) => ({
        editorOpen: state.editorOpen,
        draft: state.draft,
        activeArtistId: state.activeArtistId,
        activeTab: state.activeTab,
        combineVocalAndStyle: state.combineVocalAndStyle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ArtistDnaState>
        const defaults = createEmptyDNA()
        // Deep-merge draft so stale localStorage never leaves array fields undefined
        let draft: ArtistDNA
        if (p.draft) {
          const identity = { ...defaults.identity, ...p.draft.identity }
          // Migrate old `name` field to `stageName` for backwards compat
          const oldName = (p.draft.identity as unknown as Record<string, unknown>)?.name as string | undefined
          if (oldName && !identity.stageName) identity.stageName = oldName
          // Migrate old `region` field to `state` for backwards compat
          const oldRegion = (p.draft.identity as unknown as Record<string, unknown>)?.region as string | undefined
          if (oldRegion && !identity.state) identity.state = oldRegion
          const sound = { ...defaults.sound, ...p.draft.sound }
          if (!Array.isArray(sound.genreEvolution)) sound.genreEvolution = []
          if (!Array.isArray(sound.keyCollaborators)) sound.keyCollaborators = []
          draft = {
            identity,
            sound,
            persona: { ...defaults.persona, ...p.draft.persona },
            lexicon: { ...defaults.lexicon, ...p.draft.lexicon },
            look: { ...defaults.look, ...p.draft.look, gallery: Array.isArray(p.draft.look?.gallery) ? p.draft.look.gallery : [] },
            catalog: { ...defaults.catalog, ...p.draft.catalog },
            lowConfidenceFields: Array.isArray(p.draft.lowConfidenceFields) ? p.draft.lowConfidenceFields : [],
          }
        } else {
          draft = current.draft
        }
        const validTabs = ['identity', 'sound', 'persona', 'lexicon', 'look', 'catalog']
        const activeTab = p.activeTab && validTabs.includes(p.activeTab) ? p.activeTab : 'identity'
        return { ...current, ...p, draft, activeTab }
      },
    }
  )
)
