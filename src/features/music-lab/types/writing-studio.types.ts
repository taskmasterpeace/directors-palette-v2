/**
 * Writing Studio Types
 * Song section builder with tone controls and draft generation
 */

export type SectionType =
  | 'intro' | 'verse' | 'pre-chorus' | 'hook' | 'chorus'
  | 'post-chorus' | 'bridge' | 'interlude' | 'break'
  | 'drop' | 'build' | 'instrumental' | 'outro'

export interface ToneSettings {
  emotion: string
  energy: number // 0-100
  delivery: string
  barCount: number
}

export const BAR_COUNT_RANGES: Record<SectionType, { min: number; max: number; default: number }> = {
  intro: { min: 2, max: 8, default: 4 },
  verse: { min: 8, max: 32, default: 20 },
  'pre-chorus': { min: 2, max: 8, default: 4 },
  hook: { min: 4, max: 12, default: 8 },
  chorus: { min: 4, max: 12, default: 8 },
  'post-chorus': { min: 2, max: 8, default: 4 },
  bridge: { min: 2, max: 8, default: 4 },
  interlude: { min: 2, max: 8, default: 4 },
  break: { min: 1, max: 4, default: 2 },
  drop: { min: 2, max: 8, default: 4 },
  build: { min: 2, max: 8, default: 4 },
  instrumental: { min: 4, max: 16, default: 8 },
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
  voice: 'lead' | 'feature' | 'both' | 'adlib'
  deliveryTag: string | null
}

export interface FeatureArtist {
  id: string | null        // null = manual entry, string = picked from artist profiles
  name: string
  voiceType: 'male' | 'female'
  voiceDescription: string
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

// ─── Section Guidance & Suno Tags ──────────────────────────────────────────

export const SECTION_GUIDANCE: Record<SectionType, string> = {
  'intro': 'Set the scene, establish mood.',
  'verse': 'Storytelling, vivid detail, narrative progression. Pack each line with meaning.',
  'pre-chorus': 'Build tension toward the chorus. Shorter lines, rising energy.',
  'hook': 'Catchy, memorable, repeatable. The emotional anchor of the song.',
  'chorus': 'Big, singable, repeatable. The part everyone remembers and sings along to.',
  'post-chorus': 'Extend the chorus energy. A chant, ad-lib section, or melodic extension.',
  'bridge': 'Shift perspective, build tension, offer new insight.',
  'interlude': 'Musical break. Minimal or no lyrics — a breathing moment.',
  'break': 'Stripped-down moment. Sparse, raw, exposed.',
  'drop': 'Energy release. Heavy instrumental impact. Minimal lyrics if any.',
  'build': 'Rising intensity. Lines get shorter and more urgent.',
  'instrumental': 'No vocals. Instrumental solo or musical passage.',
  'outro': 'Wrap up, leave a lasting impression.',
}

export const SUNO_SECTION_TAGS: Record<SectionType, string> = {
  'intro': '[Intro]',
  'verse': '[Verse]',
  'pre-chorus': '[Pre-Chorus]',
  'hook': '[Hook]',
  'chorus': '[Chorus]',
  'post-chorus': '[Post-Chorus]',
  'bridge': '[Bridge]',
  'interlude': '[Interlude]',
  'break': '[Break]',
  'drop': '[Drop]',
  'build': '[Build]',
  'instrumental': '[Instrumental]',
  'outro': '[Outro]',
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
