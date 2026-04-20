/**
 * Shot Animator Types
 */

// Available animation models
export type AnimationModel =
  | 'wan-2.2-5b-fast'      // Ultra budget, 4s max, start frame only
  | 'wan-2.2-i2v-fast'     // Budget+, 5s max, start + last frame
  | 'seedance-pro-fast'    // Standard, 12s max, start frame only
  | 'seedance-lite'        // Featured, 12s max, start + last + ref images
  | 'seedance-1.5-pro'     // Pro, cheapest curated, start + last frame + audio
  | 'seedance-2.0-fast'    // Seedance 2.0 Fast, video refs, 480p/720p
  | 'seedance-2.0'         // Seedance 2.0, video refs, 480p/720p, premium
  | 'kling-2.5-turbo-pro'  // Premium, 10s max, best motion
  | 'p-video'              // Fast video gen with audio + draft mode
  | 'seedance-pro'         // Legacy - keeping for backwards compatibility

// A single reference video attached to a shot (Seedance 2.0 only).
// Stored on R2 after being trimmed to ≤ 14.5s by /api/video/crop.
export interface ShotReferenceVideo {
  /** Public R2 URL of the trimmed clip. */
  url: string
  /** Duration of the trimmed clip in seconds (≤ 14.5). */
  duration: number
  /** Original filename, used for UI display and downloaded filename hints. */
  filename: string
}

// Generated video entry for shot animator
export interface ShotGeneratedVideo {
  galleryId: string
  videoUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  error?: string
  model?: AnimationModel
}

// Shot configuration for animation
export interface ShotAnimationConfig {
  id: string
  shotId?: string // Reference to shot from gallery
  imageUrl: string
  imageName: string
  imageModel?: string // Image generation model that created this image (e.g. 'nano-banana-pro')
  prompt: string
  originalPrompt?: string // Original prompt used to generate the image (for AI animation prompt generation)
  referenceImages: string[]
  /**
   * Reference video clips (Seedance 2.0 / 2.0 Fast only).
   * Uploaded and trimmed to ≤ 14.5s before being attached — we only store R2 URLs here.
   */
  referenceVideos?: ShotReferenceVideo[]
  lastFrameImage?: string
  includeInBatch: boolean
  generatedVideos: ShotGeneratedVideo[] // Array of generated videos (supports multiple generations)
}

// Model-specific settings
export interface ModelSettings {
  duration: number // 3-12 seconds
  resolution: '480p' | '720p' | '1080p'
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'
  fps: number // Fixed at 24
  cameraFixed: boolean
  seed?: number
  generateAudio?: boolean // Generate audio synced to video (seedance-1.5-pro)
  draftMode?: boolean     // p-video: faster lower quality
  audioUrl?: string       // p-video: audio file URI for sync
}

// Settings per model
export interface AnimatorSettings {
  'wan-2.2-5b-fast': ModelSettings
  'wan-2.2-i2v-fast': ModelSettings
  'seedance-pro-fast': ModelSettings
  'seedance-lite': ModelSettings
  'seedance-1.5-pro': ModelSettings
  'seedance-2.0-fast': ModelSettings
  'seedance-2.0': ModelSettings
  'kling-2.5-turbo-pro': ModelSettings
  'p-video': ModelSettings
  'seedance-pro': ModelSettings // Legacy
}

// Generation queue item
export interface GenerationQueueItem {
  id: string
  shotConfig: ShotAnimationConfig
  model: AnimationModel
  modelSettings: ModelSettings
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  error?: string
  createdAt: Date
}

// Model configuration metadata
export interface ModelConfig {
  id: AnimationModel
  displayName: string
  description: string
  maxReferenceImages: number
  /** Seedance 2.0 accepts short video clips as motion/style references. */
  maxReferenceVideos?: number
  supportsLastFrame: boolean
  defaultResolution: '480p' | '720p' | '1080p'
  maxDuration: number // Max duration in seconds
  supportedResolutions: ('480p' | '720p' | '1080p')[]
  supportedAspectRatios: ('16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21')[]
  pricingType: 'per-video' | 'per-second'
  promptStyle: 'specific' | 'reasoning'
  supportsAudio?: boolean // Model can generate synchronized audio
  aspectRatioIgnoredWithImage?: boolean // API ignores aspect_ratio when an image is provided (i2v)
  restrictions?: string[]
}

// Video pricing configuration
export interface VideoPricing {
  '480p': number  // Points per second (or per video for fixed-duration models)
  '720p': number
  '1080p'?: number
}

// Model pricing map
export const VIDEO_MODEL_PRICING: Record<AnimationModel, VideoPricing> = {
  'wan-2.2-5b-fast': { '480p': 1, '720p': 1 },           // Per video (~4s)
  'wan-2.2-i2v-fast': { '480p': 2, '720p': 3 },          // Per video (5s)
  'seedance-pro-fast': { '480p': 2, '720p': 4, '1080p': 9 },   // Per second
  'seedance-lite': { '480p': 3, '720p': 5, '1080p': 11 },      // Per second
  'seedance-1.5-pro': { '480p': 5, '720p': 8 },                // Per second — cheapest curated option
  'seedance-2.0-fast': { '480p': 7, '720p': 10, '1080p': 17 }, // Per second — supports video refs
  'seedance-2.0': { '480p': 8, '720p': 11, '1080p': 19 },      // Per second — premium + video refs
  'kling-2.5-turbo-pro': { '480p': 10, '720p': 10 },           // Per second
  'p-video': { '480p': 1, '720p': 2 },                          // Minimal cost to prevent abuse
  'seedance-pro': { '480p': 4, '720p': 6, '1080p': 15 },       // Per second (legacy)
}

// Generated videos in unified gallery
export interface GeneratedVideo {
  id: string
  videoUrl: string
  thumbnailUrl?: string
  shotName: string
  model: string
  createdAt: Date
  status: 'processing' | 'completed' | 'failed'
  progress?: number
}

// Legacy type for shot-creator store compatibility
export interface ImageData {
  id: string
  file?: File
  fileUrl?: string
  preview: string
  prompt: string
  selected: boolean
  status: 'idle' | 'processing' | 'completed' | 'failed'
  videos?: unknown[]
  filename?: string
  type?: string
  size?: number
  lastFrame?: string | null
  lastFrameFile?: File | undefined
  lastFramePreview?: string | null
  mode?: string
  referenceImages?: unknown[]
  editHistory?: unknown[]
}

// API Types
export interface VideoGenerationRequest {
  model: AnimationModel
  prompt: string
  image: string
  modelSettings: ModelSettings
  referenceImages?: string[]
  /** Seedance 2.0 only — R2 URLs of pre-trimmed reference clips. */
  referenceVideos?: string[]
  lastFrameImage?: string
  extraMetadata?: Record<string, unknown>
  // Note: user_id removed - now extracted from session cookie server-side
}

export interface VideoGenerationResponse {
  predictionId: string
  galleryId: string
  status: string
}

export interface VideoGenerationError {
  error: string
  details?: string[]
}
