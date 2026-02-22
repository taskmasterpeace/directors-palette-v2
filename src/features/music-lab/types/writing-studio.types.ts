/**
 * Writing Studio Types
 * Song section builder with tone controls and draft generation
 */

export type SectionType = 'intro' | 'hook' | 'verse' | 'bridge' | 'outro'

export interface ToneSettings {
  emotion: string
  energy: number // 0-100
  delivery: string
}

export interface DraftOption {
  id: string
  content: string
  label: string // A, B, C, D
}

export interface SongSection {
  id: string
  type: SectionType
  tone: ToneSettings
  selectedDraft: DraftOption | null
  isLocked: boolean
}

export interface IdeaEntry {
  id: string
  text: string
  tags: IdeaTag[]
  source: 'chopped' | 'manual'
}

export type IdeaTag = 'Metaphor' | 'Punchline' | 'Imagery' | 'Wordplay'

export const EMOTIONS = [
  'Defiant', 'Hungry', 'Triumphant', 'Vulnerable', 'Reflective', 'Playful',
  'Menacing', 'Nostalgic', 'Euphoric', 'Melancholic', 'Confident', 'Desperate',
] as const

export const DELIVERIES = [
  'Raw', 'Polished', 'Aggressive', 'Smooth',
  'Conversational', 'Theatrical', 'Intimate', 'Anthemic',
] as const

export const ENERGY_ZONES = [
  { min: 0, max: 25, label: 'Chill' },
  { min: 26, max: 50, label: 'Moderate' },
  { min: 51, max: 75, label: 'Hype' },
  { min: 76, max: 100, label: 'Explosive' },
] as const

export const IDEA_TAGS: IdeaTag[] = ['Metaphor', 'Punchline', 'Imagery', 'Wordplay']

export const DEFAULT_TONE: ToneSettings = {
  emotion: 'Confident',
  energy: 50,
  delivery: 'Raw',
}
