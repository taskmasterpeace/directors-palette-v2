'use client'

/**
 * Sound Studio Store
 * Manages genre/instrument/mood settings and Suno prompt building
 * Full-screen multi-select version with production sections
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SoundStudioSettings, SoundStudioPreset, SoundAssistantMessage } from '../types/sound-studio.types'
import { createDefaultSettings, energyToLabel } from '../types/sound-studio.types'
import type { ArtistDNA } from '../types/artist-dna.types'

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildSunoPrompt(settings: SoundStudioSettings): string {
  const parts: string[] = []

  // Genre chain
  if (settings.genres.length) parts.push(settings.genres.join(', '))
  if (settings.subgenres.length) parts.push(settings.subgenres.join(', '))
  if (settings.microgenres.length) parts.push(settings.microgenres.join(', '))

  // Era
  if (settings.era) parts.push(settings.era)

  // Mood + energy
  if (settings.moods.length) parts.push(settings.moods.join(', '))
  parts.push(energyToLabel(settings.energy))

  // BPM
  if (settings.bpm) parts.push(`${settings.bpm} BPM`)

  // Key
  if (settings.key) parts.push(`key of ${settings.key}`)

  // Production sections
  if (settings.drumDesign.length) parts.push(settings.drumDesign.join(', '))
  if (settings.grooveFeel.length) parts.push(settings.grooveFeel.join(', '))
  if (settings.bassStyle.length) parts.push(settings.bassStyle.join(', '))
  if (settings.synthTexture.length) parts.push(settings.synthTexture.join(', '))
  if (settings.harmonyColor.length) parts.push(settings.harmonyColor.join(', '))
  if (settings.spaceFx.length) parts.push(settings.spaceFx.join(', '))
  if (settings.earCandy.length) parts.push(settings.earCandy.join(', '))

  // Structure
  if (settings.structure) parts.push(settings.structure)

  // Instruments
  if (settings.instruments.length) parts.push(settings.instruments.join(', '))

  // Production tags
  if (settings.productionTags.length) parts.push(settings.productionTags.join(', '))

  // Negative tags (always appended)
  if (settings.negativeTags.length) parts.push(settings.negativeTags.join(', '))

  const prompt = parts.join(', ')
  return prompt.length > 1000 ? prompt.substring(0, 997) + '...' : prompt
}

// ─── Migration Helper ────────────────────────────────────────────────────────

interface OldSettings {
  genre?: string | null
  subgenre?: string | null
  microgenre?: string | null
  mood?: string | null
  energy?: string | null | number
  genres?: string[]
  subgenres?: string[]
  microgenres?: string[]
  moods?: string[]
  [key: string]: unknown
}

function migrateSettings(raw: OldSettings): SoundStudioSettings {
  const defaults = createDefaultSettings()

  // Migrate singular → plural
  const genres = raw.genres ?? (raw.genre ? [raw.genre] : defaults.genres)
  const subgenres = raw.subgenres ?? (raw.subgenre ? [raw.subgenre] : defaults.subgenres)
  const microgenres = raw.microgenres ?? (raw.microgenre ? [raw.microgenre] : defaults.microgenres)
  const moods = raw.moods ?? (raw.mood ? [raw.mood] : defaults.moods)

  // Migrate energy string → number
  let energy = defaults.energy
  if (typeof raw.energy === 'number') {
    energy = raw.energy
  } else if (typeof raw.energy === 'string') {
    const map: Record<string, number> = { low: 25, medium: 50, high: 75 }
    energy = map[raw.energy.toLowerCase()] ?? 50
  }

  return {
    genres,
    subgenres,
    microgenres,
    bpm: typeof raw.bpm === 'number' ? raw.bpm : defaults.bpm,
    moods,
    energy,
    era: typeof raw.era === 'string' ? raw.era : defaults.era,
    drumDesign: Array.isArray(raw.drumDesign) ? raw.drumDesign as string[] : defaults.drumDesign,
    grooveFeel: Array.isArray(raw.grooveFeel) ? raw.grooveFeel as string[] : defaults.grooveFeel,
    bassStyle: Array.isArray(raw.bassStyle) ? raw.bassStyle as string[] : defaults.bassStyle,
    synthTexture: Array.isArray(raw.synthTexture) ? raw.synthTexture as string[] : defaults.synthTexture,
    harmonyColor: Array.isArray(raw.harmonyColor) ? raw.harmonyColor as string[] : defaults.harmonyColor,
    key: typeof raw.key === 'string' ? raw.key : defaults.key,
    spaceFx: Array.isArray(raw.spaceFx) ? raw.spaceFx as string[] : defaults.spaceFx,
    earCandy: Array.isArray(raw.earCandy) ? raw.earCandy as string[] : defaults.earCandy,
    structure: typeof raw.structure === 'string' ? raw.structure : defaults.structure,
    instruments: Array.isArray(raw.instruments) ? raw.instruments as string[] : defaults.instruments,
    productionTags: Array.isArray(raw.productionTags) ? raw.productionTags as string[] : defaults.productionTags,
    negativeTags: Array.isArray(raw.negativeTags) ? raw.negativeTags as string[] : defaults.negativeTags,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

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
          ...createDefaultSettings(),
          genres: dna.sound.genres || [],
          subgenres: dna.sound.subgenres?.slice(0, 3) || [],
          microgenres: dna.sound.microgenres?.slice(0, 3) || [],
          productionTags: dna.sound.productionPreferences?.slice(0, 5) || [],
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
        if (payload.genres && Array.isArray(payload.genres)) settings.genres = payload.genres as string[]
        if (payload.genre && typeof payload.genre === 'string') settings.genres = [payload.genre]
        if (payload.moods && Array.isArray(payload.moods)) settings.moods = payload.moods as string[]
        if (payload.mood && typeof payload.mood === 'string') settings.moods = [payload.mood]
        if (payload.bpm) settings.bpm = payload.bpm as number
        if (typeof payload.energy === 'number') settings.energy = payload.energy
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
      // Migrate old localStorage format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persisted: any) => {
        if (persisted && persisted.settings) {
          persisted.settings = migrateSettings(persisted.settings)
          persisted.sunoPrompt = buildSunoPrompt(persisted.settings)
        }
        return persisted
      },
      version: 2,
    }
  )
)
