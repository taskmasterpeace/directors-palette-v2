'use client'

/**
 * Sound Studio Store
 * Manages genre/instrument/mood settings and Suno prompt building
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SoundStudioSettings, SoundStudioPreset, SoundAssistantMessage } from '../types/sound-studio.types'
import { createDefaultSettings } from '../types/sound-studio.types'
import type { ArtistDNA } from '../types/artist-dna.types'

// Inline prompt builder to avoid importing server-side service
function buildSunoPrompt(settings: SoundStudioSettings): string {
  const parts: string[] = []
  const genreParts = [settings.genre, settings.subgenre, settings.microgenre].filter(Boolean)
  if (genreParts.length) parts.push(genreParts.join(', '))
  if (settings.era) parts.push(settings.era)
  if (settings.mood) parts.push(settings.mood)
  if (settings.energy) parts.push(`${settings.energy} energy`)
  if (settings.bpm) parts.push(`${settings.bpm} BPM`)
  if (settings.instruments.length) parts.push(settings.instruments.join(', '))
  if (settings.productionTags.length) parts.push(settings.productionTags.join(', '))
  if (settings.negativeTags.length) parts.push(settings.negativeTags.join(', '))
  const prompt = parts.join(', ')
  return prompt.length > 1000 ? prompt.substring(0, 997) + '...' : prompt
}

interface SoundStudioState {
  // Settings
  settings: SoundStudioSettings
  artistId: string | null

  // Prompt
  sunoPrompt: string
  promptCharCount: number

  // Sound assistant
  assistantMessages: SoundAssistantMessage[]
  isAssistantLoading: boolean

  // Presets
  presets: SoundStudioPreset[]

  // Actions
  updateSetting: <K extends keyof SoundStudioSettings>(key: K, value: SoundStudioSettings[K]) => void
  loadFromArtist: (artistId: string, dna: ArtistDNA) => void
  loadFromChat: (payload: Record<string, unknown>) => void
  resetToDefaults: () => void
  rebuildPrompt: () => void

  // Assistant
  askAssistant: (message: string, artistDna?: ArtistDNA) => Promise<void>
  clearAssistant: () => void

  // Presets
  savePreset: (name: string, userId: string) => Promise<void>
  loadPreset: (preset: SoundStudioPreset) => void
  deletePreset: (id: string) => Promise<void>
  loadPresets: (userId: string, artistId?: string) => Promise<void>
}

export const useSoundStudioStore = create<SoundStudioState>()(
  persist(
    (set, get) => ({
      settings: createDefaultSettings(),
      artistId: null,
      sunoPrompt: '',
      promptCharCount: 0,
      assistantMessages: [],
      isAssistantLoading: false,
      presets: [],

      updateSetting: (key, value) => {
        set(state => {
          const newSettings = { ...state.settings, [key]: value }
          const prompt = buildSunoPrompt(newSettings)
          return {
            settings: newSettings,
            sunoPrompt: prompt,
            promptCharCount: prompt.length,
          }
        })
      },

      loadFromArtist: (artistId, dna) => {
        const settings: SoundStudioSettings = {
          genre: dna.sound.genres[0] || null,
          subgenre: dna.sound.subgenres[0] || null,
          microgenre: dna.sound.microgenres[0] || null,
          bpm: 120,
          mood: null,
          energy: null,
          era: null,
          instruments: [],
          productionTags: dna.sound.productionPreferences.slice(0, 5),
          negativeTags: ['no vocals', 'no singing', 'no humming', 'no choir', 'no spoken words'],
        }
        const prompt = buildSunoPrompt(settings)
        set({
          settings,
          artistId,
          sunoPrompt: prompt,
          promptCharCount: prompt.length,
        })
      },

      loadFromChat: (payload) => {
        const settings = { ...get().settings }
        if (payload.genre) settings.genre = payload.genre as string
        if (payload.mood) settings.mood = payload.mood as string
        if (payload.bpm) settings.bpm = payload.bpm as number
        const prompt = buildSunoPrompt(settings)
        set({
          settings,
          sunoPrompt: prompt,
          promptCharCount: prompt.length,
        })
      },

      resetToDefaults: () => {
        const settings = createDefaultSettings()
        set({
          settings,
          sunoPrompt: '',
          promptCharCount: 0,
        })
      },

      rebuildPrompt: () => {
        const prompt = buildSunoPrompt(get().settings)
        set({ sunoPrompt: prompt, promptCharCount: prompt.length })
      },

      askAssistant: async (message, artistDna) => {
        const state = get()
        set({
          isAssistantLoading: true,
          assistantMessages: [
            ...state.assistantMessages,
            { role: 'user', content: message },
          ],
        })

        try {
          const res = await fetch('/api/sound-studio/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentSettings: state.settings,
              userMessage: message,
              artistDna,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            set(state => ({
              assistantMessages: [
                ...state.assistantMessages,
                { role: 'assistant', content: data.suggestion },
              ],
            }))
          }
        } catch (e) {
          console.error('Assistant error:', e)
        } finally {
          set({ isAssistantLoading: false })
        }
      },

      clearAssistant: () => set({ assistantMessages: [] }),

      savePreset: async (name, userId) => {
        const { settings, artistId, sunoPrompt } = get()
        try {
          const res = await fetch('/api/sound-studio/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              artist_id: artistId,
              name,
              preset_json: settings,
              suno_prompt: sunoPrompt,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            set(state => ({ presets: [data.preset, ...state.presets] }))
          }
        } catch (e) {
          console.error('Save preset failed:', e)
        }
      },

      loadPreset: (preset) => {
        const prompt = buildSunoPrompt(preset.settings)
        set({
          settings: preset.settings,
          sunoPrompt: prompt,
          promptCharCount: prompt.length,
          artistId: preset.artistId,
        })
      },

      deletePreset: async (id) => {
        try {
          await fetch(`/api/sound-studio/presets?id=${id}`, { method: 'DELETE' })
          set(state => ({
            presets: state.presets.filter(p => p.id !== id),
          }))
        } catch (e) {
          console.error('Delete preset failed:', e)
        }
      },

      loadPresets: async (userId, artistId) => {
        try {
          const params = new URLSearchParams({ userId })
          if (artistId) params.set('artistId', artistId)
          const res = await fetch(`/api/sound-studio/presets?${params}`)
          if (res.ok) {
            const data = await res.json()
            set({ presets: data.presets || [] })
          }
        } catch (e) {
          console.error('Load presets failed:', e)
        }
      },
    }),
    {
      name: 'sound-studio',
      partialize: (state) => ({
        settings: state.settings,
        artistId: state.artistId,
        sunoPrompt: state.sunoPrompt,
      }),
    }
  )
)
