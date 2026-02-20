/**
 * Artist DNA Types
 * Virtual artist creator - profile sections + Suno prompt output
 */

// =============================================================================
// DNA SECTIONS
// =============================================================================

export interface ArtistIdentity {
  name: string
  city: string
  region: string
  backstory: string
  significantEvents: string[]
}

export interface ArtistSound {
  genres: string[]
  subgenres: string[]
  microgenres: string[]
  vocalTextures: string[]
  tempoPreference: string
  productionStyles: string[]
  eraInfluences: string[]
  instruments: string[]
  soundDescription: string
}

export interface ArtistFlow {
  rhymeDensity: string
  flowPatterns: string[]
  melodyBias: number // 0 = Pure Rap, 100 = Pure Singing
  avgLineLength: string
  language: string
  secondaryLanguages: string[]
  flowDescription: string
}

export interface ArtistPersona {
  traits: string[]
  likes: string[]
  dislikes: string[]
  attitude: string
  worldview: string
  quirks: string[]
}

export interface ArtistLexicon {
  signaturePhrases: string[]
  slang: string[]
  bannedWords: string[]
  adLibs: string[]
  adLibPlacement: string
  vocabularyLevel: string
}

export interface ArtistLook {
  skinTone: string
  hairStyle: string
  fashionStyle: string
  jewelry: string
  tattoos: string
  visualDescription: string
  referenceImageUrl?: string
}

export interface CatalogEntry {
  id: string
  title: string
  lyrics: string
  mood: string
  tempo: string
  createdAt: string
}

export interface ArtistCatalog {
  entries: CatalogEntry[]
}

// =============================================================================
// FULL DNA
// =============================================================================

export interface ArtistDNA {
  identity: ArtistIdentity
  sound: ArtistSound
  flow: ArtistFlow
  persona: ArtistPersona
  lexicon: ArtistLexicon
  look: ArtistLook
  catalog: ArtistCatalog
}

// =============================================================================
// SUNO PROMPT OUTPUT
// =============================================================================

export interface SunoPromptOutput {
  vocalPrompt: string
  musicStylePrompt: string
  lyricsTemplate: string
  combinedPrompt?: string
}

// =============================================================================
// SUGGESTION SYSTEM
// =============================================================================

export interface SuggestionBatch {
  suggestions: string[]
  cursor: number // Index of next suggestion to show
}

// =============================================================================
// DATABASE TYPES
// =============================================================================

export interface DbArtistProfile {
  id: string
  user_id: string
  name: string
  dna: ArtistDNA
  created_at: string
  updated_at: string
}

export interface UserArtistProfile {
  id: string
  userId: string
  name: string
  dna: ArtistDNA
  createdAt: string
  updatedAt: string
}

// =============================================================================
// EDITOR STATE
// =============================================================================

export type ArtistDnaTab =
  | 'identity'
  | 'sound'
  | 'flow'
  | 'persona'
  | 'lexicon'
  | 'look'
  | 'catalog'
  | 'the-mix'

export const ARTIST_DNA_TABS: { id: ArtistDnaTab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'sound', label: 'Sound' },
  { id: 'flow', label: 'Flow' },
  { id: 'persona', label: 'Persona' },
  { id: 'lexicon', label: 'Lexicon' },
  { id: 'look', label: 'Look' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'the-mix', label: 'The Mix' },
]

// =============================================================================
// EMPTY DEFAULTS
// =============================================================================

export function createEmptyDNA(): ArtistDNA {
  return {
    identity: {
      name: '',
      city: '',
      region: '',
      backstory: '',
      significantEvents: [],
    },
    sound: {
      genres: [],
      subgenres: [],
      microgenres: [],
      vocalTextures: [],
      tempoPreference: '',
      productionStyles: [],
      eraInfluences: [],
      instruments: [],
      soundDescription: '',
    },
    flow: {
      rhymeDensity: '',
      flowPatterns: [],
      melodyBias: 50,
      avgLineLength: '',
      language: 'English',
      secondaryLanguages: [],
      flowDescription: '',
    },
    persona: {
      traits: [],
      likes: [],
      dislikes: [],
      attitude: '',
      worldview: '',
      quirks: [],
    },
    lexicon: {
      signaturePhrases: [],
      slang: [],
      bannedWords: [],
      adLibs: [],
      adLibPlacement: '',
      vocabularyLevel: '',
    },
    look: {
      skinTone: '',
      hairStyle: '',
      fashionStyle: '',
      jewelry: '',
      tattoos: '',
      visualDescription: '',
    },
    catalog: {
      entries: [],
    },
  }
}
