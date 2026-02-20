import { ModelConfig, AnimationModel, ModelSettings } from '../types'

/**
 * Animation Model Configurations
 * All models support image-to-video (start frame)
 */
export const ANIMATION_MODELS: Record<AnimationModel, ModelConfig> = {
  'wan-2.2-5b-fast': {
    id: 'wan-2.2-5b-fast',
    displayName: 'WAN 2.2-5B Fast',
    description: 'Ultra budget option. Fixed ~4 second videos at lowest cost.',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 4,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '9:16'],
    pricingType: 'per-video',
    promptStyle: 'specific',
    restrictions: [
      'Fixed duration (~4 seconds)',
      'No last frame support',
      'Max 720p resolution'
    ]
  },
  'wan-2.2-i2v-fast': {
    id: 'wan-2.2-i2v-fast',
    displayName: 'WAN 2.2 I2V Fast',
    description: 'Budget option with last frame control. Fixed 5 second videos.',
    maxReferenceImages: 0,
    supportsLastFrame: true,
    defaultResolution: '720p',
    maxDuration: 5,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '9:16'],
    pricingType: 'per-video',
    promptStyle: 'specific',
    restrictions: [
      'Fixed duration (5 seconds)',
      'Max 720p resolution'
    ]
  },
  'seedance-pro-fast': {
    id: 'seedance-pro-fast',
    displayName: 'Seedance Pro Fast',
    description: 'Standard quality with fast generation. Variable duration up to 12 seconds.',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-second',
    promptStyle: 'reasoning',
    restrictions: [
      'No last frame support',
      'No reference images'
    ]
  },
  'seedance-lite': {
    id: 'seedance-lite',
    displayName: 'Seedance Lite',
    description: 'Full featured with reference images + last frame control. Best value for features.',
    maxReferenceImages: 4,
    supportsLastFrame: true,
    defaultResolution: '720p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-second',
    promptStyle: 'reasoning',
    restrictions: [
      'Reference images cannot be used with 1080p resolution'
    ]
  },
  'kling-2.5-turbo-pro': {
    id: 'kling-2.5-turbo-pro',
    displayName: 'Kling 2.5 Turbo Pro',
    description: 'Premium motion quality. Best for complex movement and high-quality output.',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    defaultResolution: '720p',
    maxDuration: 10,
    supportedResolutions: ['720p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    pricingType: 'per-second',
    promptStyle: 'specific',
    restrictions: [
      '720p only',
      'No last frame support',
      'Higher cost - use for quality-critical videos'
    ]
  },
  'seedance-pro': {
    id: 'seedance-pro',
    displayName: 'Seedance Pro (Legacy)',
    description: 'Legacy model - use Seedance Pro Fast instead.',
    maxReferenceImages: 0,
    supportsLastFrame: true,
    defaultResolution: '1080p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p', '1080p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-second',
    promptStyle: 'reasoning',
    restrictions: []
  }
}

/**
 * Default model settings
 */
export const DEFAULT_MODEL_SETTINGS: Record<AnimationModel, ModelSettings> = {
  'wan-2.2-5b-fast': {
    duration: 4,  // Fixed
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'wan-2.2-i2v-fast': {
    duration: 5,  // Fixed
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'seedance-pro-fast': {
    duration: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'seedance-lite': {
    duration: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'kling-2.5-turbo-pro': {
    duration: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'seedance-pro': {
    duration: 5,
    resolution: '1080p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  }
}

/**
 * Duration constraints
 */
export const DURATION_CONSTRAINTS = {
  min: 3,
  max: 12,
  default: 5
}

/**
 * Available resolutions
 */
export const RESOLUTIONS = ['480p', '720p', '1080p'] as const

/**
 * Available aspect ratios
 */
export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
  { value: '9:21', label: '9:21 (Vertical Ultra)' }
] as const

/**
 * Active models for UI display (ordered by price tier)
 * Excludes legacy seedance-pro model
 */
export const ACTIVE_VIDEO_MODELS: AnimationModel[] = [
  'wan-2.2-5b-fast',      // Ultra Budget - 4 pts/video
  'wan-2.2-i2v-fast',     // Budget+ - 16 pts/video (has last frame)
  'seedance-pro-fast',    // Standard - 4 pts/sec
  'seedance-lite',        // Featured - 5 pts/sec (has last frame + ref images)
  'kling-2.5-turbo-pro',  // Premium - 10 pts/sec
]

/**
 * Model tier labels for UI
 */
export const MODEL_TIER_LABELS: Record<AnimationModel, string> = {
  'wan-2.2-5b-fast': 'Budget',
  'wan-2.2-i2v-fast': 'Budget+',
  'seedance-pro-fast': 'Standard',
  'seedance-lite': 'Featured',
  'kling-2.5-turbo-pro': 'Premium',
  'seedance-pro': 'Legacy',
}

/**
 * Model icons (emoji) for visual identification on video cards
 */
export const VIDEO_MODEL_ICONS: Record<AnimationModel, string> = {
  'wan-2.2-5b-fast': '🌀',
  'wan-2.2-i2v-fast': '🌊',
  'seedance-pro-fast': '⚡',
  'seedance-lite': '🌱',
  'kling-2.5-turbo-pro': '👑',
  'seedance-pro': '🎬',
}

export function getVideoModelIcon(model?: string): string {
  if (!model) return '🎬'
  return VIDEO_MODEL_ICONS[model as AnimationModel] || '🎬'
}
