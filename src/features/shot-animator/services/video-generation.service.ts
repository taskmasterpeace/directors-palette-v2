/**
 * Video Generation Service
 * Handles video model input validation, Replicate input building, and pricing calculations
 */

import type { AnimationModel, ModelSettings } from '../types'
import { VIDEO_MODEL_PRICING } from '../types'
import { ANIMATION_MODELS } from '../config/models.config'

export interface VideoGenerationInput {
  model: AnimationModel
  prompt: string
  image?: string // Base image URL (optional for seedance-1.5-pro text-to-video)
  modelSettings: ModelSettings
  referenceImages?: string[] // Only for seedance-lite (1-4 images)
  lastFrameImage?: string
}

export interface ReplicateVideoInput {
  prompt: string
  image?: string
  duration: number
  resolution?: string
  aspect_ratio: string
  fps: number
  camera_fixed: boolean
  seed?: number
  generate_audio?: boolean
  reference_images?: string[]
  last_frame_image?: string
  draft_mode?: boolean
  audio?: string
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

    // Image is required for all models except seedance-1.5-pro and p-video (support text-to-video)
    if (!input.image && input.model !== 'seedance-1.5-pro' && input.model !== 'p-video') {
      errors.push('Base image is required for image-to-video generation')
    }

    // Model-specific validations
    const config = ANIMATION_MODELS[input.model]
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

    // Validate aspect ratio
    if (!config.supportedAspectRatios?.includes(input.modelSettings.aspectRatio)) {
      errors.push(`${config.displayName} does not support ${input.modelSettings.aspectRatio} aspect ratio`)
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
    } else if (input.model === 'seedance-1.5-pro') {
      // Last frame only works when start frame image is also provided
      if (input.lastFrameImage && !input.image) {
        errors.push('Last frame image requires a start frame image for Seedance 1.5 Pro')
      }
    } else if (input.model === 'p-video') {
      // Duration constraint for p-video: only 5 or 10
      if (input.modelSettings.duration !== 5 && input.modelSettings.duration !== 10) {
        errors.push('P-Video supports only 5 or 10 second durations')
      }
      // Validate audioUrl if provided
      if (input.modelSettings.audioUrl) {
        try {
          const parsed = new URL(input.modelSettings.audioUrl)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            errors.push('Audio URL must use http or https protocol')
          }
        } catch {
          errors.push('Audio URL is not a valid URL')
        }
      }
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
      duration: input.modelSettings.duration,
      aspect_ratio: input.modelSettings.aspectRatio,
      fps: input.modelSettings.fps,
      camera_fixed: input.modelSettings.cameraFixed,
    }

    // Add image (optional for seedance-1.5-pro which supports text-to-video)
    if (input.image) {
      replicateInput.image = input.image
    }

    // Add resolution (seedance-1.5-pro doesn't accept resolution param)
    if (input.model !== 'seedance-1.5-pro') {
      replicateInput.resolution = input.modelSettings.resolution
    }

    // Add optional seed
    if (input.modelSettings.seed !== undefined && input.modelSettings.seed !== null) {
      replicateInput.seed = input.modelSettings.seed
    }

    // Add generate_audio for models that support it
    if (input.modelSettings.generateAudio) {
      replicateInput.generate_audio = true
    }

    // Add reference images (only for seedance-lite)
    if (input.model === 'seedance-lite' && input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.reference_images = input.referenceImages
    }

    // Add last frame image
    if (input.lastFrameImage) {
      replicateInput.last_frame_image = input.lastFrameImage
    }

    // Add p-video specific params
    if (input.model === 'p-video') {
      if (input.modelSettings.draftMode) {
        replicateInput.draft_mode = true
      }
      if (input.modelSettings.audioUrl) {
        replicateInput.audio = input.modelSettings.audioUrl
      }
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
      'seedance-1.5-pro': 'bytedance/seedance-1.5-pro',
      'kling-2.5-turbo-pro': 'kwaivgi/kling-v2.5-turbo-pro',
      'p-video': 'prunaai/p-video',
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
    const config = ANIMATION_MODELS[model]
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
   * Build metadata for database storage
   */
  static buildMetadata(input: VideoGenerationInput) {
    return {
      prompt: input.prompt,
      model: input.model,  // Store internal model ID for credit deduction lookup
      replicate_model: this.getReplicateModelId(input.model),  // Store Replicate ID for reference
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
