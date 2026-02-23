/**
 * Artist DNA Store
 * Manages artist profiles, draft editing state, and prompt generation
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ArtistDNA,
  ArtistDnaTab,
  CatalogEntry,
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

  // Actions - Draft editing
  setActiveTab: (tab: ArtistDnaTab) => void
  updateDraft: <S extends keyof ArtistDNA>(section: S, data: Partial<ArtistDNA[S]>) => void
  setDraftName: (name: string) => void

  // Actions - Catalog
  addCatalogEntry: (entry: Omit<CatalogEntry, 'id' | 'createdAt'>) => void
  removeCatalogEntry: (id: string) => void

  // Actions - Suggestions
  setSuggestions: (field: string, suggestions: string[]) => void
  consumeSuggestion: (field: string, value: string) => void
  dismissSuggestion: (field: string, index: number) => void
  clearSuggestions: (field: string) => void

  // Actions - Mix
  generateMix: () => Promise<void>
  toggleCombineMode: () => void

  // Actions - Navigation
  closeEditor: () => void
}

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

      initialize: async (userId: string) => {
        const state = get()
        if (state.isInitialized && state.currentUserId === userId) return

        set({ isLoading: true })
        try {
          const artists = await artistDnaService.getArtists(userId)
          set({ artists, isInitialized: true, currentUserId: userId, isLoading: false })
        } catch (error) {
          console.error('Error initializing artist DNA store:', error)
          set({ isLoading: false })
        }
      },

      createArtist: async () => {
        const { currentUserId, draft } = get()
        if (!currentUserId) return null

        const name = draft.identity.name || 'Untitled Artist'
        const result = await artistDnaService.createArtist(currentUserId, name, draft)

        if (result) {
          set((state) => ({
            artists: [result, ...state.artists],
            activeArtistId: result.id,
            isDirty: false,
          }))
        }

        return result
      },

      saveArtist: async () => {
        const { currentUserId, activeArtistId, draft } = get()
        if (!currentUserId) return false

        const name = draft.identity.name || 'Untitled Artist'

        if (activeArtistId) {
          const result = await artistDnaService.updateArtist(activeArtistId, currentUserId, name, draft)
          if (result) {
            set((state) => ({
              artists: state.artists.map((a) => (a.id === activeArtistId ? result : a)),
              isDirty: false,
            }))
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
          const merged: ArtistDNA = {
            identity: { ...defaults.identity, ...dna.identity },
            sound: { ...defaults.sound, ...dna.sound },
            persona: { ...defaults.persona, ...dna.persona },
            lexicon: { ...defaults.lexicon, ...dna.lexicon },
            look: { ...defaults.look, ...dna.look },
            catalog: { ...defaults.catalog, ...dna.catalog },
          }
          set({
            editorOpen: true,
            activeArtistId: id,
            draft: merged,
            isDirty: false,
            activeTab: 'identity',
            sunoOutput: null,
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
        })
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
            identity: { ...state.draft.identity, name },
          },
          isDirty: true,
        }))
      },

      addCatalogEntry: (entry) => {
        const newEntry: CatalogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          draft: {
            ...state.draft,
            catalog: {
              entries: [...state.draft.catalog.entries, newEntry],
            },
          },
          isDirty: true,
        }))
      },

      removeCatalogEntry: (id) => {
        set((state) => ({
          draft: {
            ...state.draft,
            catalog: {
              entries: state.draft.catalog.entries.filter((e) => e.id !== id),
            },
          },
          isDirty: true,
        }))
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
          console.error('Error generating lyrics template:', error)
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
        const draft = p.draft
          ? {
              identity: { ...defaults.identity, ...p.draft.identity },
              sound: { ...defaults.sound, ...p.draft.sound },
              persona: { ...defaults.persona, ...p.draft.persona },
              lexicon: { ...defaults.lexicon, ...p.draft.lexicon },
              look: { ...defaults.look, ...p.draft.look },
              catalog: { ...defaults.catalog, ...p.draft.catalog },
            }
          : current.draft
        return { ...current, ...p, draft }
      },
    }
  )
)
