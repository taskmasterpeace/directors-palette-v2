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
  | 'qwen-image-fast'
  | 'gpt-image-low'
  | 'gpt-image-medium'
  | 'gpt-image-high'
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

export interface QwenImageFastSettings {
  aspectRatio?: string
  outputFormat?: 'jpg' | 'png'
  guidance?: number
  num_inference_steps?: number
  negative_prompt?: string
}

export interface GptImageSettings {
  aspectRatio?: '1:1' | '3:2' | '2:3'
  outputFormat?: 'png' | 'jpeg' | 'webp'
  background?: 'opaque' | 'transparent' | 'auto'
  numImages?: number // 1-10
  inputFidelity?: 'low' | 'high' // How closely to match reference image features
}

// Union type for all model settings
export type ImageModelSettings =
  | NanoBananaSettings
  | NanoBananaProSettings
  | ZImageTurboSettings
  | QwenImageFastSettings
  | GptImageSettings

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

export interface QwenImageFastInput {
  prompt: string
  width?: number
  height?: number
  guidance?: number
  num_inference_steps?: number
  negative_prompt?: string
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
  | QwenImageFastInput
  | GptImageInput

// API Request/Response types
export interface ImageGenerationRequest {
  model: ImageModel
  prompt: string
  referenceImages?: string[]
  modelSettings: ImageModelSettings
  // Recipe tracking
  recipeId?: string
  recipeName?: string
  // Note: user_id removed - now extracted from session cookie server-side
}

export interface ImageGenerationResponse {
  predictionId: string
  galleryId: string
  status: string
  imageUrl?: string // Present when status is 'completed' (from polling)
}

export interface ImageGenerationError {
  error: string
  details?: string[]
}
