/**
 * Photo Shoot Recipe Types
 * Sub-scene system with recipe fields for customizable photo shoots.
 */

import type { ArtistDNA } from './artist-dna.types'

// =============================================================================
// CORE TYPES
// =============================================================================

export type PhotoShootCategory = 'wardrobe' | 'location' | 'social' | 'performance' | 'everyday'

export interface PhotoShootField {
  id: string
  label: string
  type: 'select' | 'text'
  options?: string[]
  defaultValue?: string
  placeholder?: string
}

export interface PhotoShootSubScene {
  id: string
  label: string
  description: string
  aspectRatio: '16:9' | '9:16' | '1:1'
  fields: PhotoShootField[]
  buildPrompt: (dna: ArtistDNA, fieldValues: Record<string, string>) => string
}

export interface PhotoShootScene {
  id: string
  label: string
  description: string
  category: PhotoShootCategory
  subScenes: PhotoShootSubScene[]
}

export interface PhotoShootCategoryInfo {
  id: PhotoShootCategory
  label: string
  icon: string
}

// =============================================================================
// COMMON RECIPE FIELDS — shared across sub-scenes
// =============================================================================

export const COMMON_FIELDS = {
  pov: {
    id: 'pov',
    label: 'Camera POV',
    type: 'select' as const,
    options: [
      'Professional editorial',
      'Fan photo from across the room',
      'Paparazzi long lens',
      'Candid friend\'s phone',
      'iPhone selfie (front camera)',
      'Security camera angle',
    ],
    defaultValue: 'Professional editorial',
  },
  lighting: {
    id: 'lighting',
    label: 'Lighting',
    type: 'select' as const,
    options: [
      'Natural daylight',
      'Golden hour',
      'Studio flash',
      'Dramatic single source',
      'Neon / LED accent',
      'Overhead fluorescent',
      'Candlelight / warm ambient',
    ],
    defaultValue: 'Natural daylight',
  },
  mood: {
    id: 'mood',
    label: 'Mood',
    type: 'select' as const,
    options: [
      'Confident and powerful',
      'Relaxed and candid',
      'Intense and focused',
      'Playful and energetic',
      'Moody and contemplative',
    ],
    defaultValue: 'Confident and powerful',
  },
  customDetail: {
    id: 'customDetail',
    label: 'Custom Detail',
    type: 'text' as const,
    placeholder: 'Add any specific detail...',
  },
} satisfies Record<string, PhotoShootField>

// =============================================================================
// PROMPT MAPPERS — convert field selections to prompt text
// =============================================================================

export function povToPrompt(pov: string): string {
  switch (pov) {
    case 'Fan photo from across the room':
      return 'shot by a fan on an iPhone from 30 feet away, slightly grainy, zoomed-in crop, authentic candid moment, they don\'t know they\'re being photographed'
    case 'Paparazzi long lens':
      return '300mm telephoto lens, paparazzi-style, shot from a distance, compressed depth of field, celebrity caught in public'
    case 'Candid friend\'s phone':
      return 'taken by a friend on a smartphone, casual angle, slightly off-center framing, authentic and unposed, warm social energy'
    case 'iPhone selfie (front camera)':
      return 'iPhone 16 Pro front camera selfie, 12MP, wide angle slight distortion, arm extended, looking directly into lens'
    case 'Security camera angle':
      return 'overhead security camera angle, wide fish-eye distortion, timestamp overlay in corner, surveillance footage aesthetic'
    default:
      return 'professional photography, well-composed, sharp focus'
  }
}

export function lightingToPrompt(lighting: string): string {
  switch (lighting) {
    case 'Golden hour': return 'golden hour warm sunlight, long shadows, amber backlight'
    case 'Studio flash': return 'studio flash photography, clean even lighting, slight harsh shadows'
    case 'Dramatic single source': return 'single dramatic light source, deep shadows on one side, chiaroscuro effect'
    case 'Neon / LED accent': return 'neon LED accent lighting, colored light spill, cyberpunk-adjacent glow'
    case 'Overhead fluorescent': return 'overhead fluorescent lighting, slightly sterile, realistic indoor environment'
    case 'Candlelight / warm ambient': return 'warm candlelight and ambient lamps, soft intimate glow, low-light'
    default: return 'natural daylight, soft even lighting'
  }
}

export function moodToPrompt(mood: string): string {
  switch (mood) {
    case 'Confident and powerful': return 'confident powerful energy, commanding presence'
    case 'Relaxed and candid': return 'relaxed candid energy, natural and unposed'
    case 'Intense and focused': return 'intense focused energy, sharp determined gaze'
    case 'Playful and energetic': return 'playful energetic vibe, genuine smile, dynamic movement'
    case 'Moody and contemplative': return 'moody contemplative atmosphere, introspective, deep in thought'
    default: return 'natural authentic energy'
  }
}
