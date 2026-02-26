/**
 * Image Generation Types
 * Type definitions for Nano Banana image generation models
 */

import type { ModelId } from '@/config'

// Available image generation models
export type ImageModel = Extract<ModelId,
  | 'nano-banana-2'
  | 'nano-banana-pro'
  | 'z-image-turbo'
  | 'seedream-5-lite'
>

// Model-specific settings interfaces
export interface NanoBanana2Settings {
  aspectRatio?: string
  resolution?: '1K' | '2K'
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high' | 'block_none'
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all'
  googleSearch?: boolean
  imageSearch?: boolean
  outputFormat?: 'jpg' | 'png' | 'webp'
}

export interface ZImageTurboSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
  numInferenceSteps?: number
  guidanceScale?: number
  promptStrength?: number
}

export interface SeedreamSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
  resolution?: '2K' | '3K' | '4K' | 'custom'
  maxImages?: number // 1-15
  sequentialGeneration?: boolean
}

export interface NanoBananaProSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
  resolution?: '1K' | '2K' | '4K'
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high'
}

// Union type for all model settings
export type ImageModelSettings =
  | NanoBanana2Settings
  | ZImageTurboSettings
  | SeedreamSettings
  | NanoBananaProSettings

// Input for image generation service
export interface ImageGenerationInput {
  model: ImageModel
  prompt: string
  referenceImages?: string[]
  modelSettings: ImageModelSettings
  userId: string
  recipeId?: string
  recipeName?: string
}

// Replicate API input schemas
export interface NanoBanana2Input {
  prompt: string
  image?: string
  aspect_ratio?: string
  safety_filter_level?: string
  person_generation?: string
}

export interface ZImageTurboInput {
  prompt: string
  image?: string // Uses separate image input instead of string[]
  num_inference_steps?: number
  guidance_scale?: number
  prompt_strength?: number
  aspect_ratio?: string // if supported, else width/height
  output_format?: string
}

export interface SeedreamInput {
  prompt: string
  aspect_ratio?: string
  size?: '2K' | '3K' | '4K' | 'custom'
  output_format?: string
  sequential_image_generation?: 'auto' | 'disabled'
  max_images?: number
  image_input?: string[]
}

export interface NanoBananaProInput {
  prompt: string
  image_input?: string[]
  aspect_ratio?: string
  output_format?: string
  resolution?: string
  safety_filter_level?: string
}

// Union type for all Replicate inputs
export type ReplicateImageInput =
  | NanoBanana2Input
  | ZImageTurboInput
  | SeedreamInput
  | NanoBananaProInput

// API Request/Response types
export interface ImageGenerationRequest {
  model: ImageModel
  prompt: string
  referenceImages?: string[]
  modelSettings: ImageModelSettings
  // Recipe tracking
  recipeId?: string
  recipeName?: string
  // Gallery organization (for storybook, etc.)
  folderId?: string
  extraMetadata?: Record<string, unknown>
  // Note: user_id removed - now extracted from session cookie server-side
  // Force server-side polling even when webhooks are configured (for storyboard batch generation)
  waitForResult?: boolean
}

export interface ImageGenerationResponse {
  predictionId: string
  galleryId: string
  status: string
  imageUrl?: string // Present when status is 'completed' (from polling)
  imageCount?: number // Number of images returned (for multi-image models like Seedream)
}

export interface ImageGenerationError {
  error: string
  details?: string[]
}
