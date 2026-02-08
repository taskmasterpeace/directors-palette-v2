/**
 * Lip Sync Model Configuration
 *
 * Configuration for Kling Avatar V2 models including pricing and constraints.
 */

import type { LipSyncModel, LipSyncModelConfig, LipSyncResolution } from '../types/lip-sync.types'

// ============================================================================
// Model Configurations
// ============================================================================

export const LIP_SYNC_MODELS: Record<LipSyncModel, LipSyncModelConfig> = {
  'kling-avatar-v2-standard': {
    id: 'kling-avatar-v2-standard',
    displayName: 'Avatar Standard',
    description: 'Quality lip-sync at 6-8 pts/sec',
    replicateModelId: 'kwaivgi/kling-avatar-v2',
    maxAudioSizeMB: 5,
    minImagePx: 300,
    maxAspectRatio: 2.5, // 2.5:1 or 1:2.5
    supportedAudioFormats: ['mp3', 'wav', 'm4a', 'aac'],
    pricingPerSecond: {
      '720p': 6,
      '1080p': 8,
    },
  },
  'kling-avatar-v2-pro': {
    id: 'kling-avatar-v2-pro',
    displayName: 'Avatar Pro',
    description: 'Premium lip-sync at 11-15 pts/sec',
    replicateModelId: 'kwaivgi/kling-avatar-v2',
    maxAudioSizeMB: 5,
    minImagePx: 300,
    maxAspectRatio: 2.5,
    supportedAudioFormats: ['mp3', 'wav', 'm4a', 'aac'],
    pricingPerSecond: {
      '720p': 11,
      '1080p': 15,
    },
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get model configuration by ID
 */
export function getLipSyncModelConfig(modelId: LipSyncModel): LipSyncModelConfig {
  return LIP_SYNC_MODELS[modelId]
}

/**
 * Get all available lip sync models
 */
export function getAllLipSyncModels(): LipSyncModelConfig[] {
  return Object.values(LIP_SYNC_MODELS)
}

/**
 * Calculate cost for a lip-sync generation
 */
export function calculateLipSyncCost(
  model: LipSyncModel,
  durationSeconds: number,
  resolution: LipSyncResolution
): number {
  const config = LIP_SYNC_MODELS[model]
  const pricePerSecond = config.pricingPerSecond[resolution]
  return Math.ceil(durationSeconds * pricePerSecond)
}

/**
 * Get default model settings
 */
export function getDefaultLipSyncSettings(): {
  model: LipSyncModel
  resolution: LipSyncResolution
} {
  return {
    model: 'kling-avatar-v2-standard',
    resolution: '720p',
  }
}

/**
 * Check if audio format is supported
 */
export function isAudioFormatSupported(format: string): boolean {
  const normalizedFormat = format.toLowerCase().replace('.', '')
  return LIP_SYNC_MODELS['kling-avatar-v2-standard'].supportedAudioFormats.includes(normalizedFormat)
}

/**
 * Get supported audio formats as display string
 */
export function getSupportedAudioFormatsDisplay(): string {
  return LIP_SYNC_MODELS['kling-avatar-v2-standard'].supportedAudioFormats
    .map((f) => `.${f}`)
    .join(', ')
}

// ============================================================================
// ElevenLabs Voice Options (reused from Storybook)
// ============================================================================

export interface VoiceOption {
  id: string
  name: string
  description: string
}

export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: 'rachel', name: 'Rachel', description: 'Warm, nurturing voice' },
  { id: 'adam', name: 'Adam', description: 'Friendly male voice' },
  { id: 'charlotte', name: 'Charlotte', description: 'Expressive female voice' },
  { id: 'dorothy', name: 'Dorothy', description: 'Pleasant, clear voice' },
]

export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return ELEVENLABS_VOICES.find((v) => v.id === voiceId)
}
