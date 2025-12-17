/**
 * Video Generation Service
 * Handles video model input validation, Replicate input building, and pricing calculations
 */

import type { AnimationModel, ModelSettings, ModelConfig } from '../types'
import { VIDEO_MODEL_PRICING } from '../types'

// Model configurations
export const VIDEO_MODEL_CONFIGS: Record<AnimationModel, ModelConfig> = {
  'wan-2.2-5b-fast': {
    id: 'wan-2.2-5b-fast',
    displayName: 'WAN 2.2 Fast',
    description: 'Ultra budget - Quick previews (~4s)',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 4,
    supportedResolutions: ['480p', '720p'],
    pricingType: 'per-video',
    restrictions: ['No last frame', 'Max 4 seconds', 'No 1080p'],
  },
  'wan-2.2-i2v-fast': {
    id: 'wan-2.2-i2v-fast',
    displayName: 'WAN 2.2 I2V',
    description: 'Budget with last frame control (5s)',
    maxReferenceImages: 0,
    supportsLastFrame: true,
    defaultResolution: '720p',
    maxDuration: 5,
    supportedResolutions: ['480p', '720p'],
    pricingType: 'per-video',
    restrictions: ['Max 5 seconds', 'No 1080p'],
  },
  'seedance-pro-fast': {
    id: 'seedance-pro-fast',
    displayName: 'Seedance Fast',
    description: 'Standard - Longer videos, fast generation',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    pricingType: 'per-second',
    restrictions: ['No last frame', 'No reference images'],
  },
  'seedance-lite': {
    id: 'seedance-lite',
    displayName: 'Seedance Lite',
    description: 'Featured - Full control with reference images',
    maxReferenceImages: 4,
    supportsLastFrame: true,
    defaultResolution: '720p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    pricingType: 'per-second',
    restrictions: ['Ref images not with 1080p or last frame'],
  },
  'kling-2.5-turbo-pro': {
    id: 'kling-2.5-turbo-pro',
    displayName: 'Kling Premium',
    description: 'Premium - Best motion quality',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 10,
    supportedResolutions: ['720p'],
    pricingType: 'per-second',
    restrictions: ['720p only', 'No last frame'],
  },
  'seedance-pro': {
    id: 'seedance-pro',
    displayName: 'Seedance Pro (Legacy)',
    description: 'High-quality video generation',
    maxReferenceImages: 0,
    supportsLastFrame: true,
    defaultResolution: '1080p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    pricingType: 'per-second',
  },
}

export interface VideoGenerationInput {
  model: AnimationModel
  prompt: string
  image: string // Base image URL for image-to-video
  modelSettings: ModelSettings
  referenceImages?: string[] // Only for seedance-lite (1-4 images)
  lastFrameImage?: string
}

export interface ReplicateVideoInput {
  prompt: string
  image: string
  duration: number
  resolution: string
  aspect_ratio: string
  fps: number
  camera_fixed: boolean
  seed?: number
  reference_images?: string[]
  last_frame_image?: string
}

export class VideoGenerationService {
  /**
   * Validate input based on model-specific constraints
   */
  static validateInput(input: VideoGenerationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Common validations
    if (!input.prompt?.trim()) {
      errors.push('Prompt is required')
    }

    if (!input.image) {
      errors.push('Base image is required for image-to-video generation')
    }

    // Model-specific validations
    const config = VIDEO_MODEL_CONFIGS[input.model]
    if (!config) {
      errors.push(`Unknown model: ${input.model}`)
      return { valid: false, errors }
    }

    // Validate duration against model max
    if (input.modelSettings.duration > config.maxDuration) {
      errors.push(`${config.displayName} supports max ${config.maxDuration} seconds`)
    }

    // Validate resolution
    if (!config.supportedResolutions.includes(input.modelSettings.resolution)) {
      errors.push(`${config.displayName} does not support ${input.modelSettings.resolution}`)
    }

    // Validate reference images
    if (input.referenceImages && input.referenceImages.length > 0) {
      if (config.maxReferenceImages === 0) {
        errors.push(`${config.displayName} does not support reference images`)
      } else if (input.referenceImages.length > config.maxReferenceImages) {
        errors.push(`${config.displayName} supports max ${config.maxReferenceImages} reference images`)
      }
    }

    // Validate last frame
    if (input.lastFrameImage && !config.supportsLastFrame) {
      errors.push(`${config.displayName} does not support last frame control`)
    }

    // Model-specific validations
    if (input.model === 'seedance-lite') {
      errors.push(...this.validateSeedanceLite(input))
    } else if (input.model === 'seedance-pro') {
      errors.push(...this.validateSeedancePro(input))
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate Seedance-1-lite specific constraints
   */
  private static validateSeedanceLite(input: VideoGenerationInput): string[] {
    const errors: string[] = []

    // Reference images validation
    if (input.referenceImages && input.referenceImages.length > 0) {
      if (input.referenceImages.length > 4) {
        errors.push('Seedance Lite supports maximum 4 reference images')
      }

      // Reference images cannot be used with 1080p
      if (input.modelSettings.resolution === '1080p') {
        errors.push('Reference images cannot be used with 1080p resolution in Seedance Lite')
      }

      // Reference images cannot be used with first/last frame images
      if (input.lastFrameImage) {
        errors.push('Reference images cannot be used with last frame image in Seedance Lite')
      }
    }

    return errors
  }

  /**
   * Validate Seedance-1-pro specific constraints
   */
  private static validateSeedancePro(input: VideoGenerationInput): string[] {
    const errors: string[] = []

    // Seedance Pro does NOT support reference images
    if (input.referenceImages && input.referenceImages.length > 0) {
      errors.push('Seedance Pro does not support reference images')
    }

    // Last frame only works if start frame image is provided
    if (input.lastFrameImage && !input.image) {
      errors.push('Last frame image only works when a start frame image is provided in Seedance Pro')
    }

    return errors
  }

  /**
   * Build Replicate input object based on model
   */
  static buildReplicateInput(input: VideoGenerationInput): ReplicateVideoInput {
    const replicateInput: ReplicateVideoInput = {
      prompt: input.prompt,
      image: input.image,
      duration: input.modelSettings.duration,
      resolution: input.modelSettings.resolution,
      aspect_ratio: input.modelSettings.aspectRatio,
      fps: input.modelSettings.fps,
      camera_fixed: input.modelSettings.cameraFixed,
    }

    // Add optional seed
    if (input.modelSettings.seed !== undefined && input.modelSettings.seed !== null) {
      replicateInput.seed = input.modelSettings.seed
    }

    // Add reference images (only for seedance-lite)
    if (input.model === 'seedance-lite' && input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.reference_images = input.referenceImages
    }

    // Add last frame image
    if (input.lastFrameImage) {
      replicateInput.last_frame_image = input.lastFrameImage
    }

    return replicateInput
  }

  /**
   * Get Replicate model identifier
   */
  static getReplicateModelId(model: AnimationModel): string {
    const modelMap: Record<AnimationModel, string> = {
      'wan-2.2-5b-fast': 'wan-video/wan-2.2-5b-fast',
      'wan-2.2-i2v-fast': 'wan-video/wan-2.2-i2v-fast',
      'seedance-pro-fast': 'bytedance/seedance-1-pro-fast',
      'seedance-lite': 'bytedance/seedance-1-lite',
      'kling-2.5-turbo-pro': 'kwaivgi/kling-v2.5-turbo-pro',
      'seedance-pro': 'bytedance/seedance-1-pro',
    }

    return modelMap[model]
  }

  /**
   * Calculate estimated cost in points for a video generation
   */
  static calculateCost(
    model: AnimationModel,
    duration: number,
    resolution: '480p' | '720p' | '1080p'
  ): number {
    const config = VIDEO_MODEL_CONFIGS[model]
    const pricing = VIDEO_MODEL_PRICING[model]

    // Get price for resolution (fallback to 720p if not supported)
    const pricePerUnit = pricing[resolution] ?? pricing['720p']

    // Per-video models charge flat rate regardless of duration
    if (config.pricingType === 'per-video') {
      return pricePerUnit
    }

    // Per-second models charge based on duration
    return pricePerUnit * duration
  }

  /**
   * Get model configuration
   */
  static getModelConfig(model: AnimationModel): ModelConfig {
    return VIDEO_MODEL_CONFIGS[model]
  }

  /**
   * Get all available models
   */
  static getAvailableModels(): ModelConfig[] {
    return Object.values(VIDEO_MODEL_CONFIGS).filter(
      config => config.id !== 'seedance-pro' // Hide legacy model
    )
  }

  /**
   * Build metadata for database storage
   */
  static buildMetadata(input: VideoGenerationInput) {
    return {
      prompt: input.prompt,
      model: this.getReplicateModelId(input.model),
      duration: input.modelSettings.duration,
      resolution: input.modelSettings.resolution,
      aspect_ratio: input.modelSettings.aspectRatio,
      fps: input.modelSettings.fps,
      camera_fixed: input.modelSettings.cameraFixed,
      seed: input.modelSettings.seed,
      has_reference_images: input.referenceImages && input.referenceImages.length > 0,
      reference_images_count: input.referenceImages?.length || 0,
      has_last_frame: !!input.lastFrameImage,
    }
  }
}
