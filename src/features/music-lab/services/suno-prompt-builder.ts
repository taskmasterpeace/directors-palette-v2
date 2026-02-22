/**
 * Suno Prompt Builder
 * Template-based (no LLM) prompt assembly from ArtistDNA
 */

import type { ArtistDNA } from '../types/artist-dna.types'

/**
 * Build vocal prompt from DNA
 * Describes vocal delivery style for Suno
 */
export function buildVocalPrompt(dna: ArtistDNA): string {
  const parts: string[] = []

  // Vocal textures
  if (dna.sound.vocalTextures.length > 0) {
    parts.push(dna.sound.vocalTextures.join(', '))
  }

  // Melody bias interpretation
  if (dna.sound.melodyBias <= 20) {
    parts.push('spoken word delivery')
  } else if (dna.sound.melodyBias <= 40) {
    parts.push('rap-focused with occasional melody')
  } else if (dna.sound.melodyBias <= 60) {
    parts.push('balanced rap and singing')
  } else if (dna.sound.melodyBias <= 80) {
    parts.push('melodic with spoken sections')
  } else {
    parts.push('fully sung vocals')
  }

  // Persona attitude coloring
  if (dna.persona.attitude) {
    parts.push(dna.persona.attitude + ' tone')
  }

  // Ad-libs
  if (dna.lexicon.adLibs.length > 0) {
    parts.push('ad-libs: ' + dna.lexicon.adLibs.slice(0, 3).join(', '))
  }

  return parts.filter(Boolean).join(', ')
}

/**
 * Build music/style prompt from DNA
 * Short comma-separated style tags for Suno (3-8 words ideal)
 */
export function buildMusicStylePrompt(dna: ArtistDNA): string {
  const tags: string[] = []

  // Genres (primary)
  if (dna.sound.genres.length > 0) {
    tags.push(...dna.sound.genres.slice(0, 2))
  }

  // Subgenres
  if (dna.sound.subgenres.length > 0) {
    tags.push(...dna.sound.subgenres.slice(0, 2))
  }

  // Production preferences
  if (dna.sound.productionPreferences.length > 0) {
    tags.push(...dna.sound.productionPreferences.slice(0, 2))
  }

  // Artist influences
  if (dna.sound.artistInfluences.length > 0) {
    tags.push(dna.sound.artistInfluences[0] + ' influenced')
  }

  return tags.filter(Boolean).join(', ')
}

/**
 * Combine vocal + style into a single prompt
 */
export function buildCombinedPrompt(vocalPrompt: string, stylePrompt: string): string {
  return [vocalPrompt, stylePrompt].filter(Boolean).join(', ')
}
