/**
 * Music Lab Types
 * 
 * Core type definitions for the Music Lab feature.
 */

// =============================================================================
// SONG SECTION TYPES
// =============================================================================

export type SongSectionType =
    | 'intro'
    | 'verse'
    | 'pre-chorus'
    | 'chorus'
    | 'post-chorus'
    | 'bridge'
    | 'breakdown'
    | 'outro'

export interface SongSection {
    id: string
    type: SongSectionType
    customName?: string           // User-defined name like "The Struggle"
    startTime: number             // Seconds
    endTime: number               // Seconds
    lyrics: string               // Lyrics within this section
}

export interface TimestampedWord {
    word: string
    startTime: number
    endTime: number
    confidence: number
}

// =============================================================================
// GENRE TYPES
// =============================================================================

export type MusicGenre =
    | 'hip-hop'
    | 'r-and-b'
    | 'pop'
    | 'rock'
    | 'electronic'
    | 'indie'
    | 'country'
    | 'latin'
    | 'jazz'
    | 'classical'
    | 'other'

export interface GenreSelection {
    genre: MusicGenre
    subgenre: string              // Free text for specifics
}

// =============================================================================
// LOCATION REQUESTS
// =============================================================================

export interface LocationRequest {
    id: string
    name: string                  // "Urban rooftop"
    description?: string          // "At golden hour, overlooking the city"
    forSections?: SongSectionType[] // Which sections this location is for
    isRequired: boolean           // Must be included
}

// =============================================================================
// ARTIST PROFILE
// =============================================================================

export interface ArtistProfile {
    name: string
    imageUrl?: string             // Uploaded reference photo
    galleryId?: string           // If stored in gallery
}

// =============================================================================
// ARTIST NOTES
// =============================================================================

export interface ArtistNotes {
    visionStatement?: string      // Overall vision from artist
    perSectionNotes: Record<string, string>  // Key: section ID, Value: notes
    locationPreferences?: string  // Free text about locations
    wardrobeIdeas?: string       // Free text about wardrobe
    moodReferences?: string      // Reference videos, artists, etc.
}

// =============================================================================
// SONG ANALYSIS (from Replicate)
// =============================================================================

export interface SongAnalysis {
    // From whisper-diarization
    transcription: {
        fullText: string
        words: TimestampedWord[]
    }

    // From music-structure-analyzer
    structure: {
        bpm: number
        key?: string
        timeSignature?: string
        sections: Array<{
            type: SongSectionType
            startTime: number
            endTime: number
        }>
        beats: number[]             // Timestamps of beat positions
    }

    // User-confirmed sections
    confirmedSections: SongSection[]
}

// =============================================================================
// MUSIC LAB PROJECT
// =============================================================================

export type MusicLabStatus =
    | 'setup'                     // Initial input
    | 'analyzing'                 // Processing audio
    | 'confirming'               // User confirming sections
    | 'generating-proposals'     // Directors creating proposals
    | 'reviewing'                 // User reviewing proposals
    | 'building'                  // Building final shot list
    | 'generating'                // Generating images
    | 'completed'

export interface MusicLabProject {
    id: string
    userId: string

    // Input
    audioUrl?: string
    audioFileName?: string
    manualLyrics?: string         // If user pastes lyrics
    useVocalIsolation?: boolean   // Run Demucs before transcription

    // Artist
    artist: ArtistProfile
    artistNotes: ArtistNotes

    // Genre & Style
    genreSelection: GenreSelection
    styleId?: string              // Preset or custom style
    styleName?: string            // For display

    // Locations
    locationRequests: LocationRequest[]

    // Analysis
    songAnalysis?: SongAnalysis

    // Status
    status: MusicLabStatus

    // Timestamps
    createdAt: string
    updatedAt: string
}

// =============================================================================
// REFERENCE SHEETS (for consistent character/wardrobe/location across video)
// =============================================================================

import type { ReferenceSheets, WardrobeItem, LocationItem } from './reference-sheet.types'

// =============================================================================
// STORE STATE
// =============================================================================

export interface MusicLabState {
    // Current project
    project: Partial<MusicLabProject>

    // Reference sheets for character consistency
    referenceSheets: ReferenceSheets

    // UI state
    isAnalyzing: boolean
    analysisProgress: number
    analysisError?: string

    // Actions
    setArtist: (artist: ArtistProfile) => void
    setArtistNotes: (notes: ArtistNotes) => void
    setGenre: (genre: GenreSelection) => void
    setStyle: (styleId: string, styleName: string) => void
    addLocationRequest: (location: Omit<LocationRequest, 'id'>) => void
    removeLocationRequest: (id: string) => void
    setAudioFile: (url: string, fileName: string) => void
    setManualLyrics: (lyrics: string) => void
    setSongAnalysis: (analysis: SongAnalysis) => void
    confirmSections: (sections: SongSection[]) => void
    setStatus: (status: MusicLabStatus) => void
    setUseVocalIsolation: (use: boolean) => void
    reset: () => void

    // Reference sheet actions
    setIdentityLockInput: (artistName: string, artistDescription: string) => void
    setIdentityLockResult: (imageUrl: string | null, error?: string) => void
    setIdentityLockStatus: (status: 'idle' | 'generating' | 'complete' | 'error') => void
    setWardrobeInput: (characterName: string, wardrobes: WardrobeItem[]) => void
    setWardrobeResult: (imageUrl: string | null, error?: string) => void
    setWardrobeStatus: (status: 'idle' | 'generating' | 'complete' | 'error') => void
    setLocationInput: (characterName: string, locations: LocationItem[]) => void
    setLocationResult: (imageUrl: string | null, error?: string) => void
    setLocationStatus: (status: 'idle' | 'generating' | 'complete' | 'error') => void
}
