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
  SeedreamSettings,
  Gen4Settings,
  QwenImageSettings,
  QwenImageEditSettings,
} from '../types/image-generation.types'

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
        errors.push(...this.validateNanoBananaPro(input, modelConfig.maxReferenceImages || 14))
        break
      case 'seedream-4':
        errors.push(...this.validateSeedream(input, modelConfig?.maxReferenceImages || 10))
        break
      case 'gen4-image':
      case 'gen4-image-turbo':
        errors.push(...this.validateGen4(input, modelConfig?.maxReferenceImages || 3))
        break
      case 'qwen-image':
        errors.push(...this.validateQwenImage(input))
        break
      case 'qwen-image-edit':
        errors.push(...this.validateQwenImageEdit(input))
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
   * Validate Seedream-4 specific constraints
   */
  private static validateSeedream(input: ImageGenerationInput, maxRefs: number): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as SeedreamSettings

    if (input.referenceImages && input.referenceImages.length > maxRefs) {
      errors.push(`Seedream-4 supports maximum ${maxRefs} reference images`)
    }

    // Custom dimensions validation
    if (settings.size === 'custom') {
      if (!settings.width || settings.width < 1024 || settings.width > 4096) {
        errors.push('Custom width must be between 1024 and 4096 pixels')
      }
      if (!settings.height || settings.height < 1024 || settings.height > 4096) {
        errors.push('Custom height must be between 1024 and 4096 pixels')
      }
    }

    // Max images validation
    if (settings.maxImages && (settings.maxImages < 1 || settings.maxImages > 15)) {
      errors.push('Number of images must be between 1 and 15')
    }

    return errors
  }

  /**
   * Validate Gen4 models specific constraints
   */
  private static validateGen4(input: ImageGenerationInput, maxRefs: number): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as Gen4Settings

    if (input.referenceImages && input.referenceImages.length > maxRefs) {
      errors.push(`Gen4 models support maximum ${maxRefs} reference images`)
    }

    // Reference tags must match reference images count
    if (settings.referenceTags && input.referenceImages) {
      if (settings.referenceTags.length !== input.referenceImages.length) {
        errors.push('Number of reference tags must match number of reference images')
      }

      // Validate tag format: alphanumeric, starts with letter, 3-15 chars
      for (const tag of settings.referenceTags) {
        if (!/^[a-zA-Z][a-zA-Z0-9]{2,14}$/.test(tag)) {
          errors.push(`Invalid tag "${tag}": must be 3-15 alphanumeric characters, starting with a letter`)
        }
      }
    }

    return errors
  }

  /**
   * Validate Qwen Image specific constraints
   */
  private static validateQwenImage(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as QwenImageSettings

    // Qwen Image doesn't support reference images, only img2img via image parameter
    if (input.referenceImages && input.referenceImages.length > 0) {
      errors.push('Qwen Image does not support reference images. Use the image parameter for img2img instead.')
    }

    // Guidance validation
    if (settings.guidance !== undefined && (settings.guidance < 0 || settings.guidance > 10)) {
      errors.push('Guidance must be between 0 and 10')
    }

    // Strength validation (for img2img)
    if (settings.strength !== undefined && (settings.strength < 0 || settings.strength > 1)) {
      errors.push('Strength must be between 0 and 1')
    }

    // Inference steps validation
    if (settings.numInferenceSteps !== undefined &&
      (settings.numInferenceSteps < 1 || settings.numInferenceSteps > 50)) {
      errors.push('Inference steps must be between 1 and 50')
    }

    return errors
  }

  /**
   * Validate Qwen Image Edit specific constraints
   */
  private static validateQwenImageEdit(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as QwenImageEditSettings

    // Qwen Image Edit REQUIRES an input image
    if (!settings.image) {
      errors.push('Qwen Image Edit requires an input image to edit')
    }

    // Should only have 1 reference image (the image to edit)
    if (input.referenceImages && input.referenceImages.length > 1) {
      errors.push('Qwen Image Edit supports only 1 input image')
    }

    // Aspect ratio validation - qwen-image-edit has specific requirements
    if (settings.aspectRatio) {
      const validRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', 'match_input_image']
      if (!validRatios.includes(settings.aspectRatio)) {
        errors.push(`Aspect ratio must be one of: ${validRatios.join(', ')}`)
      }
    }

    // Output quality validation
    if (settings.outputQuality !== undefined &&
      (settings.outputQuality < 0 || settings.outputQuality > 100)) {
      errors.push('Output quality must be between 0 and 100')
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
      case 'seedream-4':
        return this.buildSeedreamInput(input)
      case 'gen4-image':
      case 'gen4-image-turbo':
        return this.buildGen4Input(input)
      case 'qwen-image':
        return this.buildQwenImageInput(input)
      case 'qwen-image-edit':
        return this.buildQwenImageEditInput(input)
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
      replicateInput.image_input = input.referenceImages
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
      replicateInput.image_input = input.referenceImages
    }

    return replicateInput
  }

  private static buildSeedreamInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as SeedreamSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.size) {
      replicateInput.size = settings.size
    }

    if (settings.aspectRatio && settings.size !== 'custom') {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.size === 'custom') {
      if (settings.width) replicateInput.width = settings.width
      if (settings.height) replicateInput.height = settings.height
    }

    if (settings.sequentialImageGeneration) {
      replicateInput.sequential_image_generation = settings.sequentialImageGeneration
    }

    if (settings.maxImages) {
      replicateInput.max_images = settings.maxImages
    }

    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image_input = input.referenceImages
    }

    return replicateInput
  }

  private static buildGen4Input(input: ImageGenerationInput) {
    const settings = input.modelSettings as Gen4Settings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    if (settings.seed !== undefined && settings.seed !== null) {
      replicateInput.seed = settings.seed
    }

    if (settings.resolution) {
      replicateInput.resolution = settings.resolution
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.reference_images = input.referenceImages
    }

    if (settings.referenceTags && settings.referenceTags.length > 0) {
      replicateInput.reference_tags = settings.referenceTags
    }

    return replicateInput
  }

  private static buildQwenImageInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as QwenImageSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
    }

    // Note: Qwen Image uses 'image' for img2img mode (optional)
    if (settings.image) {
      replicateInput.image = settings.image
    }

    if (settings.seed !== undefined && settings.seed !== null) {
      replicateInput.seed = settings.seed
    }

    if (settings.guidance !== undefined) {
      replicateInput.guidance = settings.guidance
    }

    if (settings.strength !== undefined) {
      replicateInput.strength = settings.strength
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.numInferenceSteps !== undefined) {
      replicateInput.num_inference_steps = settings.numInferenceSteps
    }

    // Add negative prompt support
    if (settings.negativePrompt) {
      replicateInput.negative_prompt = settings.negativePrompt
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (settings.goFast !== undefined) {
      replicateInput.go_fast = settings.goFast
    }

    return replicateInput
  }

  private static buildQwenImageEditInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as QwenImageEditSettings
    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
      image: settings.image,
    }

    // Map aspect ratio to valid values, default to match_input_image
    if (settings.aspectRatio) {
      const validRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', 'match_input_image']
      const aspectRatio = validRatios.includes(settings.aspectRatio)
        ? settings.aspectRatio
        : 'match_input_image'
      replicateInput.aspect_ratio = aspectRatio
    }

    if (settings.seed !== undefined && settings.seed !== null) {
      replicateInput.seed = settings.seed
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    if (settings.outputQuality !== undefined) {
      replicateInput.output_quality = settings.outputQuality
    }

    if (settings.goFast !== undefined) {
      replicateInput.go_fast = settings.goFast
    }

    return replicateInput
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
