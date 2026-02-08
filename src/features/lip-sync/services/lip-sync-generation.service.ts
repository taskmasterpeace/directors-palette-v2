/**
 * Lip Sync Generation Service
 *
 * Handles validation, Replicate input building, and pricing calculations
 * for Kling Avatar V2 lip-sync video generation.
 */

import type {
  LipSyncModel,
  LipSyncResolution,
  LipSyncModelSettings,
  LipSyncGenerationRequest,
  LipSyncValidationResult,
  ImageValidation,
  AudioValidation,
  KlingAvatarV2Input,
} from '../types/lip-sync.types'
import {
  LIP_SYNC_MODELS,
  getLipSyncModelConfig,
  isAudioFormatSupported,
} from '../config/lip-sync-models.config'

// ============================================================================
// Service Class
// ============================================================================

export class LipSyncGenerationService {
  /**
   * Validate complete lip-sync generation request
   */
  static validateRequest(request: LipSyncGenerationRequest): LipSyncValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate avatar image URL
    if (!request.avatarImageUrl) {
      errors.push('Avatar image URL is required')
    } else if (!this.isValidUrl(request.avatarImageUrl)) {
      errors.push('Avatar image URL is invalid')
    }

    // Validate audio URL
    if (!request.audioUrl) {
      errors.push('Audio URL is required')
    } else if (!this.isValidUrl(request.audioUrl)) {
      errors.push('Audio URL is invalid')
    }

    // Validate audio duration
    if (!request.audioDurationSeconds || request.audioDurationSeconds <= 0) {
      errors.push('Valid audio duration is required')
    } else if (request.audioDurationSeconds > 120) {
      warnings.push('Audio longer than 2 minutes may result in high costs')
    }

    // Validate model settings
    if (!request.modelSettings) {
      errors.push('Model settings are required')
    } else {
      const modelConfig = getLipSyncModelConfig(request.modelSettings.model)
      if (!modelConfig) {
        errors.push(`Unknown model: ${request.modelSettings.model}`)
      }

      if (!['720p', '1080p'].includes(request.modelSettings.resolution)) {
        errors.push(`Invalid resolution: ${request.modelSettings.resolution}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate portrait image constraints
   * Note: Actual dimension validation happens client-side before upload
   */
  static validateImage(
    width: number,
    height: number,
    model: LipSyncModel = 'kling-avatar-v2-standard'
  ): ImageValidation {
    const errors: string[] = []
    const config = getLipSyncModelConfig(model)

    // Check minimum dimensions
    if (width < config.minImagePx || height < config.minImagePx) {
      errors.push(`Image must be at least ${config.minImagePx}px in both dimensions`)
    }

    // Check aspect ratio (should be within 2.5:1 range)
    const aspectRatio = width / height
    if (aspectRatio > config.maxAspectRatio || aspectRatio < 1 / config.maxAspectRatio) {
      errors.push(`Aspect ratio must be between 1:${config.maxAspectRatio} and ${config.maxAspectRatio}:1`)
    }

    return {
      valid: errors.length === 0,
      width,
      height,
      aspectRatio,
      errors,
    }
  }

  /**
   * Validate audio file constraints
   */
  static validateAudio(
    format: string,
    sizeMB: number,
    durationSeconds: number | null,
    model: LipSyncModel = 'kling-avatar-v2-standard'
  ): AudioValidation {
    const errors: string[] = []
    const config = getLipSyncModelConfig(model)

    // Check format
    if (!isAudioFormatSupported(format)) {
      errors.push(`Audio format '${format}' is not supported. Use: ${config.supportedAudioFormats.join(', ')}`)
    }

    // Check file size
    if (sizeMB > config.maxAudioSizeMB) {
      errors.push(`Audio file must be under ${config.maxAudioSizeMB}MB (current: ${sizeMB.toFixed(2)}MB)`)
    }

    return {
      valid: errors.length === 0,
      format,
      sizeMB,
      durationSeconds,
      errors,
    }
  }

  /**
   * Build Replicate input for Kling Avatar V2
   */
  static buildReplicateInput(request: LipSyncGenerationRequest): KlingAvatarV2Input {
    const mode = request.modelSettings.model === 'kling-avatar-v2-pro' ? 'pro' : 'standard'

    return {
      image: request.avatarImageUrl,
      audio: request.audioUrl,
      mode,
    }
  }

  /**
   * Get Replicate model identifier
   */
  static getReplicateModelId(model: LipSyncModel): string {
    const config = getLipSyncModelConfig(model)
    return config.replicateModelId
  }

  /**
   * Calculate cost in points for lip-sync generation
   */
  static calculateCost(
    model: LipSyncModel,
    durationSeconds: number,
    resolution: LipSyncResolution
  ): number {
    const config = getLipSyncModelConfig(model)
    const pricePerSecond = config.pricingPerSecond[resolution]
    return Math.ceil(durationSeconds * pricePerSecond)
  }

  /**
   * Build metadata for database storage
   */
  static buildMetadata(request: LipSyncGenerationRequest) {
    return {
      lip_sync: true,
      audio_duration: request.audioDurationSeconds,
      model: request.modelSettings.model,
      resolution: request.modelSettings.resolution,
      replicate_model: this.getReplicateModelId(request.modelSettings.model),
      source: request.metadata?.source || 'unknown',
      project_id: request.metadata?.projectId,
      section_id: request.metadata?.sectionId,
    }
  }

  /**
   * Get default model settings
   */
  static getDefaultSettings(): LipSyncModelSettings {
    return {
      model: 'kling-avatar-v2-standard',
      resolution: '720p',
    }
  }

  /**
   * Get all available lip-sync models
   */
  static getAvailableModels() {
    return Object.values(LIP_SYNC_MODELS)
  }

  /**
   * Get model configuration
   */
  static getModelConfig(model: LipSyncModel) {
    return getLipSyncModelConfig(model)
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// ============================================================================
// Audio Duration Utility
// ============================================================================

/**
 * Get audio duration from URL (client-side)
 * Returns a promise that resolves to duration in seconds
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'

    audio.onloadedmetadata = () => {
      resolve(audio.duration)
    }

    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'))
    }

    audio.src = audioUrl
  })
}

/**
 * Format duration as mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format cost with points suffix
 */
export function formatCost(points: number): string {
  return `${points} pts`
}
