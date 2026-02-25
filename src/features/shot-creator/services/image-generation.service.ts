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
  GptImageSettings,
  SeedreamSettings,
  RiverflowProSettings,
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
      case 'gpt-image-low':
      case 'gpt-image-medium':
      case 'gpt-image-high':
        errors.push(...this.validateGptImage(input))
        break
      case 'seedream-5-lite':
        // Seedream 5 Lite supports up to 14 reference images
        if (input.referenceImages && input.referenceImages.length > 14) {
          errors.push('Seedream 5 Lite supports maximum 14 reference images')
        }
        break
      case 'riverflow-2-pro':
        errors.push(...this.validateRiverflowPro(input))
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

    // Z-Image Turbo is TEXT-TO-IMAGE ONLY - no image input support
    if (input.referenceImages && input.referenceImages.length > 0) {
      errors.push('Z-Image Turbo is text-to-image only and does not support reference images')
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
   * Validate riverflow-2-pro specific constraints
   */
  private static validateRiverflowPro(input: ImageGenerationInput): string[] {
    const errors: string[] = []

    // Riverflow supports up to 10 init_images (source/product photos)
    if (input.referenceImages && input.referenceImages.length > 10) {
      errors.push('Riverflow Pro supports maximum 10 source images')
    }

    // Riverflow supports up to 4 super_resolution_refs (detail/logo cleanup)
    if (input.detailRefImages && input.detailRefImages.length > 4) {
      errors.push('Riverflow Pro supports maximum 4 detail reference images')
    }

    // Riverflow supports up to 2 fonts
    if (input.fontUrls && input.fontUrls.length > 2) {
      errors.push('Riverflow Pro supports maximum 2 custom fonts')
    }

    // Each font text must be <= 300 chars
    if (input.fontTexts) {
      for (let i = 0; i < input.fontTexts.length; i++) {
        if (input.fontTexts[i] && input.fontTexts[i].length > 300) {
          errors.push(`Font text ${i + 1} exceeds 300 character limit`)
        }
      }
    }

    // Font URLs and texts must match in count
    if (input.fontUrls && input.fontTexts) {
      if (input.fontUrls.length !== input.fontTexts.length) {
        errors.push('Each font must have corresponding text')
      }
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
      case 'gpt-image-low':
        return this.buildGptImageInput(input, 'low')
      case 'gpt-image-medium':
        return this.buildGptImageInput(input, 'medium')
      case 'gpt-image-high':
        return this.buildGptImageInput(input, 'high')
      case 'seedream-5-lite':
        return this.buildSeedreamInput(input)
      case 'riverflow-2-pro':
        return this.buildRiverflowProInput(input)
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
      // nano-banana only supports jpg and png, not webp
      // Runtime check since UI may send webp as default
      const format = settings.outputFormat as string
      replicateInput.output_format = format === 'webp' ? 'jpg' : settings.outputFormat
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
      // nano-banana-pro only supports jpg and png, not webp
      // Runtime check since UI may send webp as default
      const format = settings.outputFormat as string
      replicateInput.output_format = format === 'webp' ? 'jpg' : settings.outputFormat
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

    // Note: Z-Image Turbo is TEXT-TO-IMAGE ONLY
    // It does NOT support image input - reference images are ignored

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

    // Seedream 5 Lite supports output_format; Seedream 4.5 does not (always JPG)
    if (input.model === 'seedream-5-lite' && settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // Sequential image generation - API accepts 'auto' or 'disabled' string
    if (settings.sequentialGeneration !== undefined) {
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
   * Build Riverflow 2.0 Pro input
   * Note: Riverflow uses "instruction" instead of "prompt"
   */
  private static buildRiverflowProInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as RiverflowProSettings
    const replicateInput: Record<string, unknown> = {
      instruction: input.prompt, // Riverflow uses "instruction" not "prompt"
    }

    // Aspect ratio
    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    // Resolution (1K, 2K, 4K)
    if (settings.resolution) {
      replicateInput.resolution = settings.resolution
    }

    // Output format (webp or png)
    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // Transparency (PNG only)
    if (settings.transparency !== undefined) {
      replicateInput.transparency = settings.transparency
    }

    // AI prompt enhancement
    if (settings.enhancePrompt !== undefined) {
      replicateInput.enhance_prompt = settings.enhancePrompt
    }

    // Max iterations (reasoning depth)
    if (settings.maxIterations !== undefined) {
      replicateInput.max_iterations = settings.maxIterations
    }

    // Source/product images (init_images)
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.init_images = this.normalizeReferenceImages(input.referenceImages)
    }

    // Detail/logo cleanup references (super_resolution_refs)
    if (input.detailRefImages && input.detailRefImages.length > 0) {
      replicateInput.super_resolution_refs = input.detailRefImages
    }

    // Custom fonts
    if (input.fontUrls && input.fontUrls.length > 0) {
      replicateInput.font_urls = input.fontUrls
    }

    // Font texts to render
    if (input.fontTexts && input.fontTexts.length > 0) {
      replicateInput.font_texts = input.fontTexts
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
