/**
 * Image Generation Types
 * Type definitions for Nano Banana image generation models
 */

import type { ModelId } from '@/config'

// Available image generation models
export type ImageModel = Extract<ModelId,
  | 'nano-banana'
  | 'nano-banana-pro'
  | 'z-image-turbo'
  | 'gpt-image-low'
  | 'gpt-image-medium'
  | 'gpt-image-high'
  | 'seedream-4.5'
  | 'seedream-5-lite'
  | 'riverflow-2-pro'
>

// Model-specific settings interfaces
export interface NanoBananaSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
}

export interface NanoBananaProSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
  resolution?: '1K' | '2K' | '4K'
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high'
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

export interface GptImageSettings {
  aspectRatio?: '1:1' | '3:2' | '2:3'
  outputFormat?: 'png' | 'jpeg' | 'webp'
  background?: 'opaque' | 'transparent' | 'auto'
  numImages?: number // 1-10
  inputFidelity?: 'low' | 'high' // How closely to match reference image features
}

export interface RiverflowProSettings {
  aspectRatio?: string
  resolution?: '1K' | '2K' | '4K'
  outputFormat?: 'webp' | 'png'
  transparency?: boolean
  enhancePrompt?: boolean
  maxIterations?: 1 | 2 | 3
  // Riverflow-specific inputs (passed separately, not in modelSettings)
  // These are tracked in store but passed as separate API params
}

// Union type for all model settings
export type ImageModelSettings =
  | NanoBananaSettings
  | NanoBananaProSettings
  | ZImageTurboSettings
  | GptImageSettings
  | SeedreamSettings
  | RiverflowProSettings

// Input for image generation service
export interface ImageGenerationInput {
  model: ImageModel
  prompt: string
  referenceImages?: string[]
  modelSettings: ImageModelSettings
  userId: string
  recipeId?: string
  recipeName?: string
  // Riverflow-specific inputs
  detailRefImages?: string[]    // For logo cleanup (super_resolution_refs)
  fontUrls?: string[]           // Custom font file URLs
  fontTexts?: string[]          // Text to render with each font
}

// Replicate API input schemas
export interface NanoBananaInput {
  prompt: string
  image_input?: string[]
  aspect_ratio?: string
  output_format?: string
}

export interface NanoBananaProInput {
  prompt: string
  image_input?: string[]
  aspect_ratio?: string
  output_format?: string
  resolution?: string
  safety_filter_level?: string
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

export interface RiverflowProInput {
  instruction: string           // Note: "instruction" not "prompt"
  init_images?: string[]        // Up to 10 source/product images
  super_resolution_refs?: string[] // Up to 4 logo/detail cleanup refs
  font_urls?: string[]          // Up to 2 font file URLs
  font_texts?: string[]         // Text to render with fonts (max 300 chars each)
  resolution?: '1K' | '2K' | '4K'
  aspect_ratio?: string
  output_format?: 'webp' | 'png'
  transparency?: boolean
  enhance_prompt?: boolean
  max_iterations?: 1 | 2 | 3
}

export interface GptImageInput {
  prompt: string
  aspect_ratio?: '1:1' | '3:2' | '2:3'
  output_format?: 'png' | 'jpeg' | 'webp'
  background?: 'opaque' | 'transparent' | 'auto'
  quality?: 'low' | 'medium' | 'high' | 'auto'
  n?: number // Number of images (1-10)
  input_images?: string[] // Reference images (up to 10)
  input_fidelity?: 'low' | 'high' // How closely to match reference features
}

// Union type for all Replicate inputs
export type ReplicateImageInput =
  | NanoBananaInput
  | NanoBananaProInput
  | ZImageTurboInput
  | GptImageInput
  | SeedreamInput
  | RiverflowProInput

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
  // Riverflow-specific inputs
  detailRefImages?: string[]    // For logo cleanup (super_resolution_refs)
  fontUrls?: string[]           // Custom font file URLs
  fontTexts?: string[]          // Text to render with each font
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
