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
  ImageModelSettings,
  NanoBanana2Settings,
  Flux2Klein9bSettings,
  QwenImageEditSettings,
} from '../types/image-generation.types'
import { buildCameraAnglePrompt } from '../helpers/camera-angle.helper'
import { logger } from '@/lib/logger'

export class ImageGenerationService {
  private get baseUrl(): string {
    // Server-side (API routes, recipe execution) needs absolute URL
    if (typeof window === 'undefined') {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
      return `${host}/api`
    }
    return '/api'
  }

  /**
   * Validate input based on model-specific constraints
   */
  static validateInput(input: ImageGenerationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Common validations — prompt is optional for qwen-image-edit with camera enabled
    const qwenSettings = input.modelSettings as QwenImageEditSettings | undefined
    const cameraProvidesPrompt = input.model === 'qwen-image-edit' && qwenSettings?.cameraEnabled
    if (!input.prompt?.trim() && !cameraProvidesPrompt) {
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
      case 'flux-2-klein-9b':
        errors.push(...this.validateFlux2Klein9b(input))
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
   * Validate flux-2-klein-9b specific constraints
   */
  private static validateFlux2Klein9b(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    if (input.referenceImages && input.referenceImages.length > 5) {
      errors.push('Flux 2 supports maximum 5 reference images')
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
      case 'flux-2-klein-9b':
        return this.buildFlux2Klein9bInput(input)
      case 'qwen-image-edit':
        return this.buildQwenImageEditInput(input)
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
      // Validate resolution — Replicate only accepts "1K", "2K", "4K"
      const validResolutions = ['1K', '2K', '4K']
      replicateInput.resolution = validResolutions.includes(settings.resolution) ? settings.resolution : '1K'
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

  private static buildFlux2Klein9bInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as Flux2Klein9bSettings

    const replicateInput: Record<string, unknown> = {
      prompt: input.prompt,
      go_fast: true,
      disable_safety_checker: true,
    }

    if (settings.aspectRatio) {
      replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
    }

    // Reference images (up to 5)
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.images = this.normalizeReferenceImages(input.referenceImages)
    }

    return replicateInput
  }

  /**
   * Validate qwen-image-edit specific constraints
   */
  private static validateQwenImageEdit(input: ImageGenerationInput): string[] {
    const errors: string[] = []

    if (!input.referenceImages || input.referenceImages.length === 0) {
      errors.push('Camera Angle requires an input image')
    }

    if (input.referenceImages && input.referenceImages.length > 1) {
      errors.push('Camera Angle accepts only 1 input image')
    }

    return errors
  }

  // Multi-angle LoRA weights URL (HuggingFace direct link)
  static readonly MULTI_ANGLE_LORA_URL = 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/resolve/main/qwen-image-edit-2511-multiple-angles-lora.safetensors'

  private static buildQwenImageEditInput(input: ImageGenerationInput) {
    const settings = input.modelSettings as QwenImageEditSettings
    const replicateInput: Record<string, unknown> = {}

    // Build prompt: prepend camera angle tokens if camera is enabled
    if (settings.cameraEnabled && settings.cameraAzimuth !== undefined) {
      const cameraPrompt = buildCameraAnglePrompt({
        azimuth: settings.cameraAzimuth ?? 0,
        elevation: settings.cameraElevation ?? 0,
        distance: settings.cameraDistance ?? 5,
      })
      // Camera angle prompt goes first, then user prompt
      replicateInput.prompt = input.prompt
        ? `${cameraPrompt} ${input.prompt}`
        : cameraPrompt

      // Auto-inject multi-angle LoRA when camera control is active
      replicateInput.lora_weights = this.MULTI_ANGLE_LORA_URL
      replicateInput.lora_scale = settings.loraScale ?? 1.25
    } else {
      replicateInput.prompt = input.prompt
    }

    // Image input (required)
    if (input.referenceImages && input.referenceImages.length > 0) {
      replicateInput.image = this.normalizeReferenceImages(input.referenceImages)
    }

    // Aspect ratio — qwen-image-edit only supports a limited set
    if (settings.aspectRatio) {
      const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', 'match_input_image']
      replicateInput.aspect_ratio = validAspectRatios.includes(settings.aspectRatio)
        ? settings.aspectRatio
        : '16:9'
    }

    // Output format
    if (settings.outputFormat) {
      replicateInput.output_format = settings.outputFormat
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
  static getReplicateModelId(model: ImageModel, _loraActive?: boolean, _hasReferenceImage?: boolean): string {
    const modelConfig = getModelConfig(model)
    return modelConfig.endpoint
  }

  /** Version hashes for models that require version-based predictions */
  static readonly QWEN_IMAGE_EDIT_VERSION = 'b37d69a6b94414c96cc4ecb16660b472bb62284f2293d4b65537c09b8500e200'
  static readonly FLUX2_KLEIN_9B_VERSION = '963f7b2c4aa2bc7e6377b95759dcf3a21cf175f6e8b0d8c1efe7bf6c8a23b690'

  /**
   * Check if a model requires version-based prediction (not model: shorthand)
   */
  static getVersionForModel(model: ImageModel, _loraActive?: boolean, _hasReferenceImage?: boolean): string | null {
    if (model === 'flux-2-klein-9b') return this.FLUX2_KLEIN_9B_VERSION
    if (model === 'qwen-image-edit') return this.QWEN_IMAGE_EDIT_VERSION
    return null
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
        const responseText = await response.text()
        console.error('[ShotCreator] API error response:', response.status, responseText)
        let error: Record<string, unknown> = {}
        try {
          error = JSON.parse(responseText)
        } catch {
          throw new Error(`Server error (${response.status}): ${responseText || response.statusText}`)
        }

        // Handle insufficient credits error specifically
        if (response.status === 402) {
          const creditsError = new Error(String(error.details || 'Insufficient credits')) as Error & {
            isInsufficientCredits: boolean
            required: number
            balance: number
          }
          creditsError.isInsufficientCredits = true
          creditsError.required = (error.required as number) || 0
          creditsError.balance = (error.balance as number) || 0
          throw creditsError
        }

        throw new Error(String(error.error || error.message || `API error ${response.status}`))
      }

      return await response.json()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      const errName = error instanceof Error ? error.name : typeof error
      // Raw console.error bypasses lognog sanitizer for debugging
      console.error('[ShotCreator] RAW generation error:', errMsg, '| name:', errName, '| type:', typeof error)
      if (error instanceof Error && error.stack) {
        console.error('[ShotCreator] Stack:', error.stack)
      }
      logger.shotCreator.error('Image generation error', { message: errMsg, name: errName, type: typeof error })
      throw error
    }
  }

  /**
   * Server-side image generation (for recipe execution from API routes).
   * Calls Replicate directly instead of going through the HTTP endpoint,
   * avoiding auth/URL issues with server-to-server fetch.
   */
  static async generateImageServerSide(params: {
    userId: string
    model: ImageModel
    prompt: string
    referenceImages?: string[]
    modelSettings: ImageModelSettings
    recipeId?: string
    recipeName?: string
    folderId?: string
    extraMetadata?: Record<string, unknown>
  }): Promise<ImageGenerationResponse> {
    const Replicate = (await import('replicate')).default
    const { createClient } = await import('@supabase/supabase-js')
    const { creditsService } = await import('@/features/credits')
    const { StorageService } = await import('@/features/generation/services/storage.service')

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { userId, model, prompt, referenceImages, modelSettings, recipeId, recipeName, folderId, extraMetadata } = params

    // Deduct credits
    await creditsService.deductCredits(userId, model, {
      generationType: 'image',
      useServiceRole: true,
    })

    // Build Replicate input
    const replicateInput = ImageGenerationService.buildReplicateInput({
      model,
      prompt,
      modelSettings,
      referenceImages: referenceImages || [],
      userId,
    })

    // Get model routing
    const replicateModelId = ImageGenerationService.getReplicateModelId(model)
    const versionHash = ImageGenerationService.getVersionForModel(model)

    // Build prediction
    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null

    const predictionOptions: Record<string, unknown> = versionHash
      ? { version: versionHash, input: replicateInput }
      : { model: replicateModelId, input: replicateInput }

    if (webhookUrl) {
      predictionOptions.webhook = webhookUrl
      predictionOptions.webhook_events_filter = ['start', 'completed']
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prediction = await replicate.predictions.create(predictionOptions as any)

    // Build metadata
    const metadata: Record<string, unknown> = {
      ...ImageGenerationService.buildMetadata({
        model,
        prompt,
        modelSettings,
        referenceImages: referenceImages || [],
        userId,
        recipeId,
        recipeName,
      }),
      ...(extraMetadata || {}),
    }

    // Create gallery entry
    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: userId,
        prediction_id: prediction.id,
        generation_type: 'image',
        status: 'pending',
        metadata,
        ...(folderId ? { folder_id: folderId } : {}),
      })
      .select()
      .single()

    if (galleryError) {
      logger.shotCreator.error('Server-side gallery insert failed', { error: galleryError.message, code: galleryError.code })
    }

    const galleryId = gallery?.id

    // If no webhook, poll for completion
    if (!webhookUrl && galleryId) {
      try {
        let result = prediction
        const maxWait = 90_000
        const start = Date.now()
        while (result.status !== 'succeeded' && result.status !== 'failed' && Date.now() - start < maxWait) {
          await new Promise(r => setTimeout(r, 2000))
          result = await replicate.predictions.get(result.id)
        }
        if (result.status === 'succeeded' && result.output) {
          const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
          if (typeof outputUrl === 'string') {
            const { buffer } = await StorageService.downloadAsset(outputUrl)
            const { ext, mimeType } = StorageService.getMimeType(outputUrl, 'png')
            const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
              buffer, userId, prediction.id, ext, mimeType
            )
            await supabase.from('gallery').update({
              status: 'completed',
              public_url: publicUrl,
              storage_path: storagePath,
              file_size: fileSize,
              mime_type: mimeType,
            }).eq('id', galleryId)
          }
        } else if (result.status === 'failed') {
          throw new Error(result.error?.toString() || 'Replicate prediction failed')
        }
      } catch (pollError) {
        logger.shotCreator.error('Server-side poll error', { error: pollError instanceof Error ? pollError.message : String(pollError) })
      }
    }

    return {
      predictionId: prediction.id,
      galleryId: galleryId || '',
      status: prediction.status,
    }
  }
}

// Singleton instance
export const imageGenerationService = new ImageGenerationService()
