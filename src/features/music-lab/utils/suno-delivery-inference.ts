/**
 * Infer Suno vocal delivery tags from ArtistDNA
 */

import type { ArtistSound } from '../types/artist-dna.types'
import type { SectionType } from '../types/writing-studio.types'

const RAP_DELIVERIES = [
  'Rap', 'Rapped', 'Fast Rap', 'Slow Flow', 'Melodic Rap',
  'Trap Flow', 'Double Time', 'Spoken Word',
] as const

const SUNG_DELIVERIES = [
  'Smooth', 'Belted', 'Whispered', 'Falsetto',
  'Breathy', 'Raspy', 'Soulful', 'Crooning',
] as const

const SPECIAL_DELIVERIES = ['Spoken', 'Growled', 'Chant', 'A Cappella'] as const

export const ALL_DELIVERY_TAGS = [
  ...RAP_DELIVERIES, ...SUNG_DELIVERIES, ...SPECIAL_DELIVERIES,
] as const

export type DeliveryTag = typeof ALL_DELIVERY_TAGS[number]

/** No-vocal section types that should not get delivery tags */
const NO_VOCAL_SECTIONS: SectionType[] = ['instrumental', 'interlude']

/**
 * Infer the default delivery tag for a section based on melodyBias and vocalTextures.
 * Returns null if no tag should be applied (blend range or no-vocal section).
 */
export function inferDeliveryTag(
  sound: Pick<ArtistSound, 'melodyBias' | 'vocalTextures'>,
  sectionType: SectionType
): DeliveryTag | null {
  if (NO_VOCAL_SECTIONS.includes(sectionType)) return null

  const { melodyBias, vocalTextures } = sound
  const textures = (vocalTextures || []).map(t => t.toLowerCase())

  if (melodyBias <= 20) return 'Rapped'
  if (melodyBias <= 40) return 'Rap'
  if (melodyBias >= 81) {
    if (textures.includes('raspy')) return 'Raspy'
    if (textures.includes('smooth')) return 'Smooth'
    if (textures.includes('soulful')) return 'Soulful'
    if (textures.includes('breathy')) return 'Breathy'
    return 'Belted'
  }
  if (melodyBias >= 61) return 'Smooth'

  // 41-60 blend — no tag, let Suno decide
  return null
}
