/**
 * Artist DNA Types
 * Virtual artist creator - profile sections + Suno prompt output
 */

// =============================================================================
// DNA SECTIONS
// =============================================================================

export interface ArtistIdentity {
  stageName: string
  realName: string
  ethnicity: string
  city: string
  state: string
  neighborhood: string
  backstory: string
  significantEvents: string[]
}

export interface GenreEra {
  era: string        // e.g. "2016-2020", "Renaissance era"
  genres: string[]   // genres active in this era
}

export interface ArtistSound {
  genres: string[]
  subgenres: string[]
  microgenres: string[]
  genreEvolution: GenreEra[]  // for genre-fluid artists — tracks how their sound changed over time
  vocalTextures: string[]
  flowStyle: string
  productionPreferences: string[]
  keyCollaborators: string[]
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
  portraitUrl: string
  characterSheetUrl: string
}

// =============================================================================
// CATALOG GENOME TYPES
// =============================================================================

export interface VerseAttribution {
  section: string
  artist: 'primary' | 'feature'
  featureName?: string
}

export interface CatalogSongAnalysis {
  themes: string[]
  moodProgression: string
  rhymeSchemes: string[]
  storytellingApproach: string
  vocabularyLevel: string
  notableDevices: string[]
  recurringImagery: string[]
  verseMap: VerseAttribution[]
  primaryVerseCount: number
  emotionalIntensity: number
  analyzedAt: string
}

export interface GenomeTrait {
  trait: string
  frequency: number
  category: string
}

export interface GenomeBlueprint {
  mustInclude: string[]
  shouldInclude: string[]
  avoidRepeating: string[]
  suggestExploring: string[]
}

export interface CatalogGenome {
  signatures: GenomeTrait[]
  tendencies: GenomeTrait[]
  experiments: GenomeTrait[]
  dominantThemes: string[]
  dominantMood: string
  rhymeProfile: string
  storytellingProfile: string
  vocabularyProfile: string
  essenceStatement: string
  blueprint: GenomeBlueprint
  songCount: number
  calculatedAt: string
}

export type AnalysisStatus = 'pending' | 'analyzing' | 'done' | 'error'
export type GenomeStatus = 'idle' | 'calculating' | 'done' | 'error'

export interface CatalogEntry {
  id: string
  title: string
  lyrics: string
  mood: string
  tempo: string
  createdAt: string
  analysis?: CatalogSongAnalysis
  analysisStatus?: AnalysisStatus
}

export interface ArtistCatalog {
  entries: CatalogEntry[]
  genome?: CatalogGenome
  genomeStatus?: GenomeStatus
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
  lowConfidenceFields: string[]  // field paths where data may be inaccurate (e.g. "identity.realName", "lexicon.adLibs")
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

export const ARTIST_DNA_TABS: { id: ArtistDnaTab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'sound', label: 'Sound' },
  { id: 'persona', label: 'Persona' },
  { id: 'lexicon', label: 'Lexicon' },
  { id: 'look', label: 'Look' },
  { id: 'catalog', label: 'Catalog' },
]

// =============================================================================
// EMPTY DEFAULTS
// =============================================================================

export function createEmptyDNA(): ArtistDNA {
  return {
    identity: {
      stageName: '',
      realName: '',
      ethnicity: '',
      city: '',
      state: '',
      neighborhood: '',
      backstory: '',
      significantEvents: [],
    },
    sound: {
      genres: [],
      subgenres: [],
      microgenres: [],
      genreEvolution: [],
      vocalTextures: [],
      flowStyle: '',
      productionPreferences: [],
      keyCollaborators: [],
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
      portraitUrl: '',
      characterSheetUrl: '',
    },
    catalog: {
      entries: [],
    },
    lowConfidenceFields: [],
  }
}
