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
  QwenImage2512Settings,
  GptImageSettings,
  SeedreamSettings,
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
      case 'qwen-image-2512':
        // Qwen Image 2512 supports single image for i2i
        if (input.referenceImages && input.referenceImages.length > 1) {
          errors.push('Qwen Image 2512 supports maximum 1 reference image')
        }
        break
      case 'gpt-image-low':
      case 'gpt-image-medium':
      case 'gpt-image-high':
        errors.push(...this.validateGptImage(input))
        break
      case 'seedream-4.5':
        // Seedream 4.5 supports up to 14 reference images
        if (input.referenceImages && input.referenceImages.length > 14) {
          errors.push('Seedream 4.5 supports maximum 14 reference images')
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
   * Validate gpt-image specific constraints
   */
  private static validateGptImage(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as GptImageSettings

    // GPT Image supports up to 10 reference images via input_images
    if (input.referenceImages && input.referenceImages.length > 10) {
      errors.push('GPT Image supports maximum 10 reference images')
    }

    // Validate numImages if provided
    if (settings.numImages !== undefined) {
      if (settings.numImages < 1 || settings.numImages > 10) {
        errors.push('GPT Image supports 1-10 images per request')
      }
    }

    // Validate transparent background requires PNG
    if (settings.background === 'transparent' && settings.outputFormat && settings.outputFormat !== 'png') {
      errors.push('Transparent background requires PNG output format')
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
      case 'qwen-image-2512':
        return this.buildQwenImage2512Input(input)
      case 'gpt-image-low':
        return this.buildGptImageInput(input, 'low')
      case 'gpt-image-medium':
        return this.buildGptImageInput(input, 'medium')
      case 'gpt-image-high':
        return this.buildGptImageInput(input, 'high')
      case 'seedream-4.5':
        return this.buildSeedreamInput(input)
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

    // Z-Image Turbo doesn't support aspect_ratio - convert to width/height
    // Max dimensions: 1440px
    if (settings.aspectRatio && settings.aspectRatio !== 'match_input_image') {
      const dimensions = ASPECT_RATIO_SIZES[settings.aspectRatio]
      if (dimensions) {
        replicateInput.width = Math.min(dimensions.width, 1440)
        replicateInput.height = Math.min(dimensions.height, 1440)
      }
    }

    // Z-Image uses 'image' key for single reference image usually
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image = this.normalizeReferenceImages(input.referenceImages)[0]
    }

    return replicateInput
  }

  private static buildQwenImage2512Input(input: ImageGenerationInput) {
    const settings = input.modelSettings as QwenImage2512Settings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    // Qwen Image 2512 supports aspect_ratio directly
    if (settings.aspectRatio && settings.aspectRatio !== 'match_input_image') {
      replicateInput.aspect_ratio = settings.aspectRatio
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

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // go_fast optimization
    if (settings.goFast !== undefined) {
      replicateInput.go_fast = settings.goFast
    }

    // Image-to-image support
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image = this.normalizeReferenceImages(input.referenceImages)[0]
      // Default strength for i2i
      replicateInput.strength = 0.8
    }

    return replicateInput
  }

  private static buildGptImageInput(input: ImageGenerationInput, quality: 'low' | 'medium' | 'high' | 'auto') {
    const settings = input.modelSettings as GptImageSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
      quality: quality,
    }

    // Reference images support via input_images parameter
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.input_images = this.normalizeReferenceImages(input.referenceImages)
      // Add input fidelity if specified (controls how closely to match reference features)
      if (settings.inputFidelity) {
        replicateInput.input_fidelity = settings.inputFidelity
      }
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (settings.background) {
      replicateInput.background = settings.background
    }

    if (settings.numImages && settings.numImages > 1) {
      replicateInput.number_of_images = settings.numImages
    }

    return replicateInput
  }

  private static buildSeedreamInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as SeedreamSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.resolution) {
      replicateInput.size = settings.resolution // 2K, 4K, or custom
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // Sequential image generation
    if (settings.sequentialGeneration) {
      replicateInput.sequential_image_generation = settings.sequentialGeneration ? 'auto' : 'disabled'
    }

    if (settings.maxImages && settings.maxImages > 1) {
      replicateInput.max_images = settings.maxImages
    }

    // Reference images for i2i
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image_input = this.normalizeReferenceImages(input.referenceImages)
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
