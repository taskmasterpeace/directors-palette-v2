/**
 * Shot Animator Types
 */

// Available animation models
export type AnimationModel = 'seedance-lite' | 'seedance-pro'

// Generated video entry for shot animator
export interface ShotGeneratedVideo {
  galleryId: string
  videoUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  error?: string
}

// Shot configuration for animation
export interface ShotAnimationConfig {
  id: string
  shotId?: string // Reference to shot from gallery
  imageUrl: string
  imageName: string
  prompt: string
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
  'seedance-lite': ModelSettings
  'seedance-pro': ModelSettings
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
  restrictions?: string[]
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
