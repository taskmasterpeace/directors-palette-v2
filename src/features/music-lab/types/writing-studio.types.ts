/**
 * Writing Studio Types
 * Song section builder with tone controls and draft generation
 */

export type SectionType = 'intro' | 'hook' | 'verse' | 'bridge' | 'outro'

export interface ToneSettings {
  emotion: string
  energy: number // 0-100
  delivery: string
  barCount: number
}

export const BAR_COUNT_RANGES: Record<SectionType, { min: number; max: number; default: number }> = {
  intro: { min: 2, max: 8, default: 4 },
  hook: { min: 4, max: 12, default: 8 },
  verse: { min: 8, max: 32, default: 20 },
  bridge: { min: 2, max: 8, default: 4 },
  outro: { min: 2, max: 8, default: 4 },
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
  barCount: 16,
}

// ─── Song Import Types ──────────────────────────────────────────────────────

export interface DetectedSection {
  type: SectionType
  label: string       // e.g. "Verse 1", "Hook", "Bridge"
  lines: string[]     // Lines of lyrics in this section
}

// ─── Artist Judge Types ──────────────────────────────────────────────────────

export interface LineNote {
  lineNumber: number
  note: string
  suggestion?: string
}

export interface ArtistJudgment {
  draftIndex: number
  vibe: string
  score: number
  rhymeScore: number
  lineNotes: LineNote[]
  wouldKeep: boolean
}

export interface JudgeResult {
  judgments: ArtistJudgment[]
  ranking: number[]
  rankingReason: string
}
