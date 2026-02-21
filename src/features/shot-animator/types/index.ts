/**
 * Shot Animator Types
 */

// Available animation models
export type AnimationModel =
  | 'wan-2.2-5b-fast'      // Ultra budget, 4s max, start frame only
  | 'wan-2.2-i2v-fast'     // Budget+, 5s max, start + last frame
  | 'seedance-pro-fast'    // Standard, 12s max, start frame only
  | 'seedance-lite'        // Featured, 12s max, start + last + ref images
  | 'seedance-1.5-pro'     // Pro, 480p, start + last frame
  | 'kling-2.5-turbo-pro'  // Premium, 10s max, best motion
  | 'seedance-pro'         // Legacy - keeping for backwards compatibility

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
}

// Settings per model
export interface AnimatorSettings {
  'wan-2.2-5b-fast': ModelSettings
  'wan-2.2-i2v-fast': ModelSettings
  'seedance-pro-fast': ModelSettings
  'seedance-lite': ModelSettings
  'seedance-1.5-pro': ModelSettings
  'kling-2.5-turbo-pro': ModelSettings
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
  supportsLastFrame: boolean
  defaultResolution: '480p' | '720p' | '1080p'
  maxDuration: number // Max duration in seconds
  supportedResolutions: ('480p' | '720p' | '1080p')[]
  supportedAspectRatios: ('16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21')[]
  pricingType: 'per-video' | 'per-second'
  promptStyle: 'specific' | 'reasoning'
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
  'seedance-1.5-pro': { '480p': 5, '720p': 8 },                // Per second
  'kling-2.5-turbo-pro': { '480p': 10, '720p': 10 },           // Per second
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
