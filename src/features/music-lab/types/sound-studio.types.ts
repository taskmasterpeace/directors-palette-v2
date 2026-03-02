/**
 * Sound Studio Types
 * Full-screen instrumental music workspace with deep genre taxonomy,
 * production sections (drum design, groove, bass, synth, harmony, space/fx, ear candy),
 * and Suno prompt building.
 */

export interface GenreNode {
  id: string
  label: string
  children?: GenreNode[]
}

export interface InstrumentTag {
  id: string
  label: string
  category: string
}

export interface MoodTag {
  id: string
  label: string
  valence: 'positive' | 'neutral' | 'dark'
}

export interface ProductionTag {
  id: string
  label: string
  category: string
  group?: string // optional sub-group within category
}

export interface SoundStudioSettings {
  // Genre hierarchy (multi-select)
  genres: string[]
  subgenres: string[]
  microgenres: string[]

  // Core
  bpm: number
  moods: string[]
  energy: number // 0-100
  era: string | null

  // Production sections
  drumDesign: string[]
  grooveFeel: string[]
  bassStyle: string[]
  synthTexture: string[]
  harmonyColor: string[]
  key: string | null
  spaceFx: string[]
  earCandy: string[]
  structure: string | null

  // Instruments & tags
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
    genres: [],
    subgenres: [],
    microgenres: [],
    bpm: 120,
    moods: [],
    energy: 50,
    era: null,
    drumDesign: [],
    grooveFeel: [],
    bassStyle: [],
    synthTexture: [],
    harmonyColor: [],
    key: null,
    spaceFx: [],
    earCandy: [],
    structure: null,
    instruments: [],
    productionTags: [],
    negativeTags: ['no vocals', 'no singing', 'no humming', 'no choir', 'no spoken words'],
  }
}

/**
 * Map energy 0-100 to a descriptive label for Suno prompts
 */
export function energyToLabel(energy: number): string {
  if (energy <= 20) return 'very low energy'
  if (energy <= 40) return 'low energy'
  if (energy <= 60) return 'medium energy'
  if (energy <= 80) return 'high energy'
  return 'very high energy'
}
