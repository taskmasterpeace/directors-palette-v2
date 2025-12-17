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
  NanoBananaSettings,
  NanoBananaProSettings,
  ZImageTurboSettings,
  QwenImageFastSettings,
} from '../types/image-generation.types'
import { ASPECT_RATIO_SIZES } from '@/config'

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

    // Get model config
    const modelConfig = getModelConfig(input.model)

    // Model-specific validations
    switch (input.model) {
      case 'nano-banana':
        errors.push(...this.validateNanoBanana(input, modelConfig?.maxReferenceImages || 10))
        break
      case 'nano-banana-pro':
        errors.push(...this.validateNanoBananaPro(input, modelConfig?.maxReferenceImages || 14))
        break
      case 'z-image-turbo':
        errors.push(...this.validateZImageTurbo(input))
        break
      case 'qwen-image-fast':
        // Qwen Image Fast is text-to-image only, no reference images
        if (input.referenceImages && input.referenceImages.length > 0) {
          errors.push('Qwen Image Fast does not support reference images (text-to-image only)')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate nano-banana specific constraints
   */
  private static validateNanoBanana(input: ImageGenerationInput, maxRefs: number): string[] {
    const errors: string[] = []

    if (input.referenceImages && input.referenceImages.length > maxRefs) {
      errors.push(`Nano Banana supports maximum ${maxRefs} reference images`)
    }

    return errors
  }

  /**
   * Validate nano-banana-pro specific constraints
   */
  private static validateNanoBananaPro(input: ImageGenerationInput, maxRefs: number): string[] {
    const errors: string[] = []

    if (input.referenceImages && input.referenceImages.length > maxRefs) {
      errors.push(`Nano Banana Pro supports maximum ${maxRefs} reference images`)
    }

    return errors
  }

  /**
   * Validate z-image-turbo specific constraints
   */
  private static validateZImageTurbo(input: ImageGenerationInput): string[] {
    const errors: string[] = []

    // Z-Image likely takes 1 image input if doing i2i, usually
    if (input.referenceImages && input.referenceImages.length > 1) {
      errors.push('Z-Image Turbo supports maximum 1 reference image')
    }

    return errors
  }

  /**
   * Build Replicate input object based on model
   */
  static buildReplicateInput(input: ImageGenerationInput): Record<string, unknown> {
    switch (input.model) {
      case 'nano-banana':
        return this.buildNanoBananaInput(input)
      case 'nano-banana-pro':
        return this.buildNanoBananaProInput(input)
      case 'z-image-turbo':
        return this.buildZImageTurboInput(input)
      case 'qwen-image-fast':
        return this.buildQwenImageFastInput(input)
      default:
        throw new Error(`Unsupported model: ${input.model}`)
    }
  }

  private static buildNanoBananaInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as NanoBananaSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (input.referenceImages && input.referenceImages.length > 0) {
      // Normalize reference images to URL strings
      // Can be either string[] or {url, weight}[]
      replicateInput.image_input = this.normalizeReferenceImages(input.referenceImages)
    }

    return replicateInput
  }

  private static buildNanoBananaProInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as NanoBananaProSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (settings.resolution) {
      replicateInput.resolution = settings.resolution
    }

    if (settings.safetyFilterLevel) {
      replicateInput.safety_filter_level = settings.safetyFilterLevel
    }

    if (input.referenceImages && input.referenceImages.length > 0) {
      // Normalize reference images to URL strings
      // Can be either string[] or {url, weight}[]
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

    if (settings.guidanceScale) {
      replicateInput.guidance_scale = settings.guidanceScale
    }

    if (settings.aspectRatio) {
      // Check if z-image-turbo supports aspect_ratio param. 
      // Assuming yes based on standard Replicate models.
      // If not, we might need width/height mapping.
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    // Z-Image uses 'image' key for single reference image usually
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image = this.normalizeReferenceImages(input.referenceImages)[0]
    }

    return replicateInput
  }

  private static buildQwenImageFastInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as QwenImageFastSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    // Qwen uses width/height instead of aspect_ratio
    if (settings.aspectRatio && settings.aspectRatio !== 'match_input_image') {
      const dimensions = ASPECT_RATIO_SIZES[settings.aspectRatio]
      if (dimensions) {
        replicateInput.width = dimensions.width
        replicateInput.height = dimensions.height
      }
    }

    if (settings.guidance !== undefined) {
      replicateInput.guidance = settings.guidance
    }

    if (settings.num_inference_steps !== undefined) {
      replicateInput.num_inference_steps = settings.num_inference_steps
    }

    if (settings.negative_prompt) {
      replicateInput.negative_prompt = settings.negative_prompt
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
  static getReplicateModelId(model: ImageModel): string {
    const modelConfig = getModelConfig(model)
    return modelConfig.endpoint
  }

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
      console.error('Image generation error:', error)
      throw error
    }
  }
}

// Singleton instance
export const imageGenerationService = new ImageGenerationService()
