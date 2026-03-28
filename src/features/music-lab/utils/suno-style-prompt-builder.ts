/**
 * Build a Suno-compatible "Style of Music" prompt from ArtistDNA + tone settings
 */

import type { ArtistDNA, ArtistVoice } from '../types/artist-dna.types'

interface StylePromptOptions {
  emotion?: string
  bpm?: number
  key?: string
  featureVoice?: { name: string; description: string } | null
}

const MAX_CHARS = 1000

/**
 * Compile ArtistDNA into a Suno "Style of Music" prompt string.
 * Front-loads genres (Suno weights early words most).
 */
export function buildSunoStylePrompt(
  dna: ArtistDNA,
  activeVoice: ArtistVoice | null,
  options: StylePromptOptions = {}
): string {
  const parts: string[] = []

  // 1. Genres (front-loaded — most important)
  const genres = [...(dna.sound?.genres || []), ...(dna.sound?.subgenres || [])].slice(0, 4)
  if (genres.length) parts.push(genres.join(', '))

  // 2. Mood/emotion from tone
  if (options.emotion) parts.push(options.emotion.toLowerCase())

  // 3. Key instruments (2-3 max)
  const instruments = (dna.sound?.instruments || []).slice(0, 3)
  if (instruments.length) parts.push(instruments.join(', '))

  // 4. Vocal description — from active voice or inferred
  if (activeVoice?.description) {
    parts.push(activeVoice.description)
  } else if (dna.sound?.vocalTextures?.length) {
    const bias = dna.sound.melodyBias ?? 50
    const vocalType = bias <= 30 ? 'rap vocal' : bias >= 70 ? 'singing vocal' : 'vocal'
    parts.push(`${dna.sound.vocalTextures.slice(0, 3).join(', ')} ${vocalType}`)
  }

  // 5. Feature voice
  if (options.featureVoice?.description) {
    parts.push(`feature: ${options.featureVoice.description}`)
  }

  // 6. Production preferences
  const production = (dna.sound?.productionPreferences || []).slice(0, 3)
  if (production.length) parts.push(production.join(', '))

  // 7. BPM
  if (options.bpm) parts.push(`${options.bpm} BPM`)

  // 8. Key
  if (options.key) parts.push(options.key)

  let result = parts.join(', ')

  // Truncate if over limit — drop from the end
  if (result.length > MAX_CHARS) {
    result = result.substring(0, MAX_CHARS - 3) + '...'
  }

  return result
}

/**
 * Build the "Exclude" field from banned words and production exclusions.
 */
export function buildSunoExcludePrompt(dna: ArtistDNA): string {
  const excludes: string[] = []
  if (dna.lexicon?.bannedWords?.length) {
    excludes.push(...dna.lexicon.bannedWords.map(w => `no ${w}`))
  }
  return excludes.join(', ')
}
