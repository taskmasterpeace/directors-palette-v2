/**
 * Sound Studio Types
 * Instrumental music workspace with genre taxonomy and Suno prompt building
 */

export interface GenreNode {
  id: string
  label: string
  children?: GenreNode[]
}

export interface InstrumentTag {
  id: string
  label: string
  category: string  // "keyboards", "strings", "drums", "brass", "electronic"
}

export interface MoodTag {
  id: string
  label: string
  valence: 'positive' | 'neutral' | 'dark'
}

export interface SoundStudioSettings {
  genre: string | null
  subgenre: string | null
  microgenre: string | null
  bpm: number
  mood: string | null
  energy: string | null
  era: string | null
  instruments: string[]
  productionTags: string[]
  negativeTags: string[]
}

export interface SoundStudioPreset {
  id: string
  userId: string
  artistId: string | null
  name: string
  settings: SoundStudioSettings
  sunoPrompt: string
  createdAt: string
}

export interface DbSoundStudioPreset {
  id: string
  user_id: string
  artist_id: string | null
  name: string
  preset_json: SoundStudioSettings
  suno_prompt: string
  created_at: string
}

export interface SoundAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export function createDefaultSettings(): SoundStudioSettings {
  return {
    genre: null,
    subgenre: null,
    microgenre: null,
    bpm: 120,
    mood: null,
    energy: null,
    era: null,
    instruments: [],
    productionTags: [],
    negativeTags: ['no vocals', 'no singing', 'no humming', 'no choir', 'no spoken words'],
  }
}
