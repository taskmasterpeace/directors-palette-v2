/**
 * Image Generation Service
 * Handles API calls for image generation using Replicate with multi-model support
 * Images are processed via webhook and saved to Supabase
 */

import { getModelConfig } from '@/config'
import type {
  ImageModel,
  ImageGenerationInput,
  ImageGenerationRequest,
  ImageGenerationResponse,
  NanoBanana2Settings,
  ZImageTurboSettings,
  FireRedEditSettings,
} from '../types/image-generation.types'
import { ASPECT_RATIO_SIZES } from '@/config'
import { logger } from '@/lib/logger'

export class ImageGenerationService {
  private baseUrl = '/api'

  /**
   * Validate input based on model-specific constraints
   */
  static validateInput(input: ImageGenerationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Common validations
    if (!input.prompt?.trim()) {
      errors.push('Prompt is required')
    }

    if (!input.model) {
      errors.push('Model selection is required')
    }

    // Model-specific validations
    switch (input.model) {
      case 'nano-banana-2':
        errors.push(...this.validateNanoBanana2(input))
        break
      case 'z-image-turbo':
        errors.push(...this.validateZImageTurbo(input))
        break
      case 'firered-image-edit':
        errors.push(...this.validateFireRedEdit(input))
        break
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate nano-banana-2 specific constraints
   */
  private static validateNanoBanana2(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as NanoBanana2Settings

    // nano-banana-2 supports up to 14 reference images
    if (input.referenceImages && input.referenceImages.length > 14) {
      errors.push('Nano Banana 2 supports maximum 14 reference images')
    }

    // match_input_image requires a reference image
    if (settings.aspectRatio === 'match_input_image' && (!input.referenceImages || input.referenceImages.length === 0)) {
      errors.push('Match Input Image aspect ratio requires a reference image')
    }

    return errors
  }

  /**
   * Validate z-image-turbo specific constraints
   */
  private static validateZImageTurbo(input: ImageGenerationInput): string[] {
    const errors: string[] = []

    // Z-Image Turbo is TEXT-TO-IMAGE ONLY - no image input support
    if (input.referenceImages && input.referenceImages.length > 0) {
      errors.push('Z-Image Turbo is text-to-image only and does not support reference images')
    }

    return errors
  }

  /**
   * Validate firered-image-edit specific constraints
   */
  private static validateFireRedEdit(input: ImageGenerationInput): string[] {
    const errors: string[] = []

    if (!input.referenceImages || input.referenceImages.length === 0) {
      errors.push('Z-Image Edit requires an input image to edit')
    }

    return errors
  }

  /**
   * Build Replicate input object based on model
   */
  static buildReplicateInput(input: ImageGenerationInput): Record<string, unknown> {
    switch (input.model) {
      case 'nano-banana-2':
        return this.buildNanoBanana2Input(input)
      case 'z-image-turbo':
        return this.buildZImageTurboInput(input)
      case 'firered-image-edit':
        return this.buildFireRedEditInput(input)
      default:
        throw new Error(`Unsupported model: ${input.model}`)
    }
  }

  private static buildNanoBanana2Input(input: ImageGenerationInput) {
    const settings = input.modelSettings as NanoBanana2Settings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.safetyFilterLevel) {
      replicateInput.safety_filter_level = settings.safetyFilterLevel
    }

    if (settings.personGeneration) {
      replicateInput.person_generation = settings.personGeneration
    }

    if (settings.resolution) {
      replicateInput.resolution = settings.resolution
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (settings.googleSearch) {
      replicateInput.google_search = true
    }

    if (settings.imageSearch) {
      replicateInput.image_search = true
    }

    // nano-banana-2 API uses `image_input` array (supports up to 14 images)
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image_input = this.normalizeReferenceImages(input.referenceImages)
    }

    return replicateInput
  }

  private static buildZImageTurboInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as ZImageTurboSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.numInferenceSteps) {
      replicateInput.num_inference_steps = settings.numInferenceSteps
    }

    if (settings.guidanceScale !== undefined) {
      replicateInput.guidance_scale = settings.guidanceScale
    }

    // Z-Image Turbo doesn't support aspect_ratio - convert to width/height
    // Max dimensions: 2048px (API allows 64-2048)
    if (settings.aspectRatio && settings.aspectRatio !== 'match_input_image') {
      const dimensions = ASPECT_RATIO_SIZES[settings.aspectRatio]
      if (dimensions) {
        replicateInput.width = Math.min(dimensions.width, 2048)
        replicateInput.height = Math.min(dimensions.height, 2048)
      }
    }

    // Output format - API supports png, jpg, webp
    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // LoRA support — API expects arrays for lora_weights and lora_scales
    if (settings.loraWeightsUrl) {
      replicateInput.lora_weights = [settings.loraWeightsUrl]
      replicateInput.lora_scales = [settings.loraScale ?? 1.0]
    }

    // Note: Z-Image Turbo is TEXT-TO-IMAGE ONLY
    // It does NOT support image input - reference images are ignored

    return replicateInput
  }

  private static buildFireRedEditInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as FireRedEditSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
      go_fast: settings.goFast !== false, // Default true
    }

    // Image input (required, array of URIs)
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image = this.normalizeReferenceImages(input.referenceImages)
    }

    // Aspect ratio
    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    // CFG scale
    if (settings.trueCfgScale !== undefined) {
      replicateInput.true_cfg_scale = settings.trueCfgScale
    }

    // Inference steps
    if (settings.numInferenceSteps !== undefined) {
      replicateInput.num_inference_steps = settings.numInferenceSteps
    }

    // Output format
    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // Output quality
    if (settings.outputQuality !== undefined) {
      replicateInput.output_quality = settings.outputQuality
    }

    return replicateInput
  }

  /**
   * Normalize reference images to URL strings
   * Handles both string[] and {url, weight}[] formats
   */
  private static normalizeReferenceImages(refs: unknown[]): string[] {
    return refs.map(ref => {
      if (typeof ref === 'string') {
        return ref
      }
      if (ref && typeof ref === 'object' && 'url' in ref) {
        return (ref as { url: string }).url
      }
      return String(ref)
    })
  }

  /**
   * Get Replicate model identifier
   */
  static getReplicateModelId(model: ImageModel, loraActive?: boolean): string {
    const modelConfig = getModelConfig(model)
    // When LoRA is active on z-image-turbo, use the LoRA-enabled variant
    // This model requires version-based prediction (not model: shorthand)
    if (loraActive && model === 'z-image-turbo') {
      return 'prunaai/z-image-turbo-lora'
    }
    return modelConfig.endpoint
  }

  /** Version hash for models that require version-based predictions */
  static readonly LORA_VERSION = '197b2db2015aa366d2bc61a941758adf4c31ac66b18573f5c66dc388ab081ca2'

  /**
   * Build metadata for database storage
   */
  static buildMetadata(input: ImageGenerationInput): Record<string, unknown> {
    return {
      prompt: input.prompt,
      model: input.model,
      replicateModel: this.getReplicateModelId(input.model),
      modelSettings: JSON.parse(JSON.stringify(input.modelSettings)), // Ensure JSON serializable
      has_reference_images: input.referenceImages && input.referenceImages.length > 0,
      reference_images_count: input.referenceImages?.length || 0,
      // Recipe tracking
      recipeId: input.recipeId || null,
      recipeName: input.recipeName || null,
    }
  }

  /**
   * Start a new image generation
   * Images will be processed by webhook and saved to Supabase gallery
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/generation/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()

        // Handle insufficient credits error specifically
        if (response.status === 402) {
          const creditsError = new Error(error.details || 'Insufficient credits') as Error & {
            isInsufficientCredits: boolean
            required: number
            balance: number
          }
          creditsError.isInsufficientCredits = true
          creditsError.required = error.required || 0
          creditsError.balance = error.balance || 0
          throw creditsError
        }

        throw new Error(error.error || 'Failed to start image generation')
      }

      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Image generation error', { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }
}

// Singleton instance
export const imageGenerationService = new ImageGenerationService()
