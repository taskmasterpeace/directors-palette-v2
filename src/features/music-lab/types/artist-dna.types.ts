/**
 * Artist DNA Types
 * Virtual artist creator - profile sections + Suno prompt output
 */

// =============================================================================
// DNA SECTIONS
// =============================================================================

export interface ArtistIdentity {
  name: string
  ethnicity: string
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
  productionPreferences: string[]
  artistInfluences: string[]
  melodyBias: number // 0 = Pure Rap, 100 = Pure Singing
  language: string
  secondaryLanguages: string[]
  soundDescription: string
}

export interface ArtistPersona {
  traits: string[]
  likes: string[]
  dislikes: string[]
  attitude: string
  worldview: string
}

export interface ArtistLexicon {
  signaturePhrases: string[]
  slang: string[]
  bannedWords: string[]
  adLibs: string[]
}

export interface ArtistLook {
  skinTone: string
  hairStyle: string
  fashionStyle: string
  jewelry: string
  tattoos: string
  visualDescription: string
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
  | 'persona'
  | 'lexicon'
  | 'look'
  | 'catalog'
  | 'studio'
  | 'the-mix'

export const ARTIST_DNA_TABS: { id: ArtistDnaTab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'sound', label: 'Sound' },
  { id: 'persona', label: 'Persona' },
  { id: 'lexicon', label: 'Lexicon' },
  { id: 'look', label: 'Look' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'studio', label: 'Studio' },
  { id: 'the-mix', label: 'The Mix' },
]

// =============================================================================
// EMPTY DEFAULTS
// =============================================================================

export function createEmptyDNA(): ArtistDNA {
  return {
    identity: {
      name: '',
      ethnicity: '',
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
      productionPreferences: [],
      artistInfluences: [],
      melodyBias: 50,
      language: 'English',
      secondaryLanguages: [],
      soundDescription: '',
    },
    persona: {
      traits: [],
      likes: [],
      dislikes: [],
      attitude: '',
      worldview: '',
    },
    lexicon: {
      signaturePhrases: [],
      slang: [],
      bannedWords: [],
      adLibs: [],
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
