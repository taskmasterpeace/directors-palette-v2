export type GenerationMode = 'song' | 'instrumental'

export type GenerationJobStatus = 'submitting' | 'pending' | 'processing' | 'completed' | 'failed'

export interface GenerationVariation {
  url: string
  duration: number
}

export interface GenerationJob {
  id: string
  mode: GenerationMode
  status: GenerationJobStatus
  artistId: string
  title: string
  stylePrompt: string
  lyricsPrompt: string
  excludePrompt: string
  variations: GenerationVariation[]
  error?: string
  createdAt: string
}

export interface GenerationHistoryEntry {
  id: string
  mode: GenerationMode
  artistId: string
  title: string
  variations: GenerationVariation[]
  pickedIndex?: number
  createdAt: string
}

export interface GenerateRequest {
  mode: GenerationMode
  artistId: string
  title: string
  stylePrompt: string
  lyricsPrompt: string
  excludePrompt: string
  vocalGender?: string
  personaId?: string
}

export interface SaveTrackRequest {
  artistId: string
  audioUrl: string
  title: string
  lyrics: string
  mood: string
  duration: number
  catalogEntryId?: string
}
