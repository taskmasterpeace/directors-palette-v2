/**
 * Auto-generate a voice description from ArtistDNA fields
 */

import type { ArtistDNA } from '../types/artist-dna.types'

/**
 * Compile a natural-language voice description from DNA sound fields.
 */
export function generateVoiceDescription(dna: ArtistDNA): string {
  const parts: string[] = []

  // Vocal textures
  const textures = dna.sound?.vocalTextures || []
  if (textures.length) {
    parts.push(textures.slice(0, 3).join(', '))
  }

  // Vocal type from melodyBias
  const bias = dna.sound?.melodyBias ?? 50
  if (bias <= 20) parts.push('rap vocal')
  else if (bias <= 40) parts.push('mostly rapping')
  else if (bias >= 80) parts.push('singing vocal')
  else if (bias >= 60) parts.push('melodic vocal')
  else parts.push('versatile vocal')

  // Flow style
  if (dna.sound?.flowStyle) {
    parts.push(dna.sound.flowStyle)
  }

  // Primary genre flavor
  const genres = dna.sound?.genres || []
  if (genres.length) {
    parts.push(`${genres.slice(0, 2).join('/')} style`)
  }

  return parts.join(', ')
}
