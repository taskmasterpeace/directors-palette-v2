/**
 * Music Lab Feature Module
 * 
 * Audio-driven music video treatment generator with AI director proposals.
 */

// Types
export * from './types/music-lab.types'
export * from './types/director.types'
export * from './types/timeline.types'
export * from './types/wardrobe.types'
export * from './types/reference-sheet.types'

// Components - Phase 1A
export { AudioUploader } from './components/AudioUploader'
export { LyricsEditor } from './components/LyricsEditor'
export { GenreSelector } from './components/GenreSelector'
export { LocationRequests } from './components/LocationRequests'
export { ArtistNotes } from './components/ArtistNotes'
export { SectionConfirmation } from './components/SectionConfirmation'

// Components - Phase 2
export { ProposalList } from './components/ProposalList'
export { ProposalCard } from './components/ProposalCard'

// Components - Phase 3
export { WardrobeSelector } from './components/WardrobeLookbook'
export { WardrobeLookCard } from './components/WardrobeLookCard'

// Components - Reference Sheets
export { ReferenceSheetGenerator } from './components/ReferenceSheetGenerator'

// Components - Phase 4
export { Timeline } from './components/Timeline'

// Store
export { useMusicLabStore } from './store/music-lab.store'
export { useTimelineStore } from './store/timeline.store'
export { useWardrobeStore } from './store/wardrobe.store'

// Services
export { audioAnalysisService } from './services/audio-analysis.service'
export { directorProposalService } from './services/director-proposal.service'
export { wardrobeService } from './services/wardrobe.service'
export { referenceSheetService } from './services/reference-sheet.service'

// Components - Artist DNA
export { ArtistDnaPage } from './components/artist-dna/ArtistDnaPage'

// Components - Shared
export { ArtistContextBar } from './components/ArtistContextBar'
export { WritingStudioPage } from './components/WritingStudioPage'

// Store
export { useArtistDnaStore } from './store/artist-dna.store'

// Services - Artist DNA
export { artistDnaService } from './services/artist-dna.service'

// Types - Artist DNA
export * from './types/artist-dna.types'

// Data
export { DIRECTORS, getDirectorById, getAllDirectors } from './data/directors.data'

