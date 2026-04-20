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
    aspectRatioIgnoredWithImage: true,
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
    aspectRatioIgnoredWithImage: true,
    restrictions: [
      'Reference images cannot be used with 1080p resolution'
    ]
  },
  'seedance-1.5-pro': {
    id: 'seedance-1.5-pro',
    displayName: 'Seedance 1.5 Pro',
    description: 'Joint audio-video generation with last frame control. Image is optional (supports text-to-video).',
    maxReferenceImages: 0,
    supportsLastFrame: true,
    supportsAudio: true,
    defaultResolution: '480p',
    maxDuration: 12,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-video',
    promptStyle: 'reasoning',
    aspectRatioIgnoredWithImage: true,
    durationChoices: { short: 5, long: 12 },
    restrictions: [
      'Last frame requires start frame image'
    ]
  },
  'seedance-2.0-fast': {
    id: 'seedance-2.0-fast',
    displayName: 'Seedance 2.0 Fast',
    description: 'Seedance 2.0 Fast — supports video references ([Video1] tokens in prompt), last frame, up to 4 clips max 15s each.',
    maxReferenceImages: 0,
    maxReferenceVideos: 4,
    supportsLastFrame: true,
    defaultResolution: '480p',
    maxDuration: 15,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-video',
    promptStyle: 'reasoning',
    aspectRatioIgnoredWithImage: true,
    durationChoices: { short: 5, long: 15 },
    restrictions: [
      'Reference videos must be ≤ 15 seconds each',
      'Max 4 reference videos'
    ]
  },
  'seedance-2.0': {
    id: 'seedance-2.0',
    displayName: 'Seedance 2.0',
    description: 'Seedance 2.0 premium — supports video references ([Video1] tokens in prompt), last frame, up to 4 clips max 15s each.',
    maxReferenceImages: 0,
    maxReferenceVideos: 4,
    supportsLastFrame: true,
    defaultResolution: '480p',
    maxDuration: 15,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    pricingType: 'per-video',
    promptStyle: 'reasoning',
    aspectRatioIgnoredWithImage: true,
    durationChoices: { short: 5, long: 15 },
    restrictions: [
      'Reference videos must be ≤ 15 seconds each',
      'Max 4 reference videos'
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
    aspectRatioIgnoredWithImage: true,
    restrictions: [
      '720p only',
      'No last frame support',
      'Higher cost - use for quality-critical videos'
    ]
  },
  'p-video': {
    id: 'p-video',
    displayName: 'P-Video',
    description: 'Fast video with audio input and draft mode. Text-to-video, image-to-video, audio-to-video.',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    supportsAudio: true,
    defaultResolution: '480p',
    maxDuration: 10,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    pricingType: 'per-video',
    promptStyle: 'specific',
    restrictions: [
      'Max 10 seconds',
      'Max 720p resolution',
      'Draft mode available for faster iteration'
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
    aspectRatioIgnoredWithImage: true,
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
  'seedance-1.5-pro': {
    duration: 5,
    resolution: '480p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false,
    generateAudio: true
  },
  'seedance-2.0-fast': {
    duration: 5,
    resolution: '480p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  'seedance-2.0': {
    duration: 5,
    resolution: '480p',
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
  'p-video': {
    duration: 10,
    resolution: '480p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false,
    draftMode: false
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
 * Show a cost-confirmation modal before starting a batch whose estimated
 * cost exceeds this many pts. Keeps a single source of truth — the modal
 * copy, the threshold check, and any future analytics all read from here.
 */
export const COST_CONFIRM_THRESHOLD_PTS = 100

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
 * Active models shown in the Shot Animator UI dropdown (curated, ordered cheapest → premium).
 * Other model definitions remain in ANIMATION_MODELS for backwards compatibility with
 * storyboard, brand-studio, and v2 API consumers, but they're hidden from this feature.
 */
export const ACTIVE_VIDEO_MODELS: AnimationModel[] = [
  'seedance-1.5-pro',     // Cheapest - audio + last frame
  'seedance-2.0-fast',    // Balanced - video refs + last frame (DEFAULT)
  'seedance-2.0',         // Premium - video refs + last frame
]

/**
 * Default model for this feature. Referenced by the settings hook when no
 * persisted selection exists, and used as the migration target for shots
 * whose selected model has been dropped from the curated list.
 */
export const DEFAULT_ACTIVE_MODEL: AnimationModel = 'seedance-2.0-fast'

/**
 * Model tier labels for UI
 */
export const MODEL_TIER_LABELS: Record<AnimationModel, string> = {
  'wan-2.2-5b-fast': 'Budget',
  'wan-2.2-i2v-fast': 'Budget+',
  'seedance-pro-fast': 'Standard',
  'seedance-lite': 'Value',
  'seedance-1.5-pro': 'Cheapest',
  'seedance-2.0-fast': 'Balanced',
  'seedance-2.0': 'Premium',
  'kling-2.5-turbo-pro': 'Premium',
  'p-video': 'Budget',
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
  'seedance-1.5-pro': '🎯',
  'seedance-2.0-fast': '🚀',
  'seedance-2.0': '💎',
  'kling-2.5-turbo-pro': '👑',
  'p-video': '🎬',
  'seedance-pro': '🎬',
}

export function getVideoModelIcon(model?: string): string {
  if (!model) return '🎬'
  return VIDEO_MODEL_ICONS[model as AnimationModel] || '🎬'
}
