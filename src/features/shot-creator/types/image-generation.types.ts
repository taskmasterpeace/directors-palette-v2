/**
 * Image Generation Types
 * Type definitions for Nano Banana image generation models
 */

import type { ModelId } from '@/config'

// Available image generation models
export type ImageModel = Extract<ModelId,
  | 'nano-banana-2'
  | 'z-image-turbo'
  | 'seedream-5-lite'
  | 'riverflow-2-pro'
>

// Model-specific settings interfaces
export interface NanoBanana2Settings {
  aspectRatio?: string
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high' | 'block_none'
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all'
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
  | NanoBanana2Settings
  | ZImageTurboSettings
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

// Union type for all Replicate inputs
export type ReplicateImageInput =
  | NanoBanana2Input
  | ZImageTurboInput
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
