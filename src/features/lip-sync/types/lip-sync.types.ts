/**
 * Lip Sync Types
 *
 * Core types for Kling Avatar V2 lip-sync video generation.
 */

// ============================================================================
// Model Types
// ============================================================================

export type LipSyncModel = 'kling-avatar-v2-standard' | 'kling-avatar-v2-pro'
export type LipSyncResolution = '720p' | '1080p'

export interface LipSyncModelSettings {
  model: LipSyncModel
  resolution: LipSyncResolution
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface LipSyncModelConfig {
  id: LipSyncModel
  displayName: string
  description: string
  replicateModelId: string
  maxAudioSizeMB: number
  minImagePx: number
  maxAspectRatio: number // Max ratio for portrait validation (e.g., 2.5:1)
  supportedAudioFormats: string[]
  pricingPerSecond: Record<LipSyncResolution, number>
}

// ============================================================================
// Request/Response Types
// ============================================================================

export type LipSyncSource = 'music-lab' | 'adhub'

export interface LipSyncGenerationRequest {
  avatarImageUrl: string
  audioUrl: string
  audioDurationSeconds: number
  modelSettings: LipSyncModelSettings
  metadata?: {
    source: LipSyncSource
    projectId?: string
    sectionId?: string // For Music Lab batch generation
  }
}

export interface LipSyncGenerationResponse {
  predictionId: string
  galleryId: string
  estimatedCost: number
  estimatedDurationSeconds: number
}

// ============================================================================
// Validation Types
// ============================================================================

export interface LipSyncValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ImageValidation {
  valid: boolean
  width: number
  height: number
  aspectRatio: number
  errors: string[]
}

export interface AudioValidation {
  valid: boolean
  format: string
  sizeMB: number
  durationSeconds: number | null
  errors: string[]
}

// ============================================================================
// Generation State Types
// ============================================================================

export type LipSyncGenerationStatus =
  | 'idle'
  | 'validating'
  | 'generating-audio'  // For TTS
  | 'generating-video'
  | 'completed'
  | 'failed'

export interface LipSyncGenerationState {
  status: LipSyncGenerationStatus
  progress: number // 0-100
  predictionId: string | null
  galleryId: string | null
  videoUrl: string | null
  error: string | null
}

// ============================================================================
// Music Lab Specific Types
// ============================================================================

export type MusicLabAvatarSource = 'identity-lock' | 'custom-upload'
export type MusicLabAudioSource = 'isolated-vocals' | 'custom-upload'

export interface MusicLabLipSyncSection {
  sectionId: string
  sectionName: string
  startTime: number
  endTime: number
  durationSeconds: number
  estimatedCost: number
  selected: boolean
  generationState: LipSyncGenerationState
}

// ============================================================================
// Adhub Specific Types
// ============================================================================

export type AdhubAudioSource = 'upload' | 'tts'

export interface AdhubVideoAdConfig {
  enabled: boolean
  spokespersonImageUrl: string | null
  audioSource: AdhubAudioSource
  uploadedAudioUrl: string | null
  ttsScript: string
  ttsVoiceId: string
  audioDurationSeconds: number | null
  modelSettings: LipSyncModelSettings
}

// ============================================================================
// Replicate API Types
// ============================================================================

export interface KlingAvatarV2Input {
  image: string // URL to portrait image
  audio: string // URL to audio file
  mode?: 'standard' | 'pro'
}

export interface KlingAvatarV2Output {
  video: string // URL to generated video
}
