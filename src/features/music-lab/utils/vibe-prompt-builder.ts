import type { ArtistDNA } from '../types/artist-dna.types'

const SUNO_STYLE_LIMIT = 1000
const SOUND_DESC_LIMIT = 200
const NEGATIVE_TAGS = 'no vocals, no singing, no humming, no choir, no spoken words'

interface VibePromptResult {
  style: string
  negativeTags: string
}

/**
 * Build an instrumental Suno style prompt from an artist's DNA.
 * Concatenates genre/instrument/production tags, truncating
 * least-important fields first if over the 1000-char Suno limit.
 */
export function buildVibePrompt(dna: ArtistDNA): VibePromptResult {
  const parts: { label: string; value: string; priority: number }[] = []

  // Priority 1 (highest) — genres
  const genres = dna.sound.genres
  if (genres.length) parts.push({ label: 'genres', value: genres.join(', '), priority: 1 })

  // Priority 2 — subgenres
  const subgenres = dna.sound.subgenres
  if (subgenres.length) parts.push({ label: 'subgenres', value: subgenres.join(', '), priority: 2 })

  // Priority 3 — instruments
  const instruments = dna.sound.instruments
  if (instruments.length) parts.push({ label: 'instruments', value: instruments.join(', '), priority: 3 })

  // Priority 5 — microgenres (lower priority, truncated before production)
  const microgenres = dna.sound.microgenres
  if (microgenres.length) parts.push({ label: 'microgenres', value: microgenres.join(', '), priority: 5 })

  // Priority 4 — production preferences
  const production = dna.sound.productionPreferences
  if (production.length) parts.push({ label: 'production', value: production.join(', '), priority: 4 })

  // Priority 6 (lowest) — sound description (truncated to 200 chars)
  const desc = dna.sound.soundDescription
  if (desc) {
    const truncated = desc.length > SOUND_DESC_LIMIT ? desc.slice(0, SOUND_DESC_LIMIT) : desc
    parts.push({ label: 'description', value: truncated, priority: 6 })
  }

  // Tempo from catalog entries
  const tempoTag = extractDominantTempo(dna)
  if (tempoTag) parts.push({ label: 'tempo', value: tempoTag, priority: 3 })

  // Always instrumental
  parts.push({ label: 'mode', value: 'instrumental', priority: 0 })

  // Build style string, truncating lowest-priority parts if over limit
  // Sort by priority ascending (highest priority = lowest number = kept first)
  parts.sort((a, b) => a.priority - b.priority)

  let style = parts.map((p) => p.value).join(', ')

  // Truncate from the end (lowest priority) if over limit
  while (style.length > SUNO_STYLE_LIMIT && parts.length > 1) {
    const removed = parts.pop()!
    console.warn(
      `[buildVibePrompt] Truncating "${removed.label}" (${removed.value.length} chars) — style was ${style.length}/${SUNO_STYLE_LIMIT}`
    )
    style = parts.map((p) => p.value).join(', ')
  }

  return { style, negativeTags: NEGATIVE_TAGS }
}

/**
 * Extract dominant BPM from catalog entries.
 * CatalogEntry.tempo is a string — could be "120", "fast", "85 BPM", etc.
 */
function extractDominantTempo(dna: ArtistDNA): string | null {
  const entries = dna.catalog?.entries || []
  const tempos = entries
    .map((e) => e.tempo)
    .filter((t): t is string => !!t)

  if (tempos.length === 0) return null

  // Try to extract numeric BPM values
  const numericBpms: number[] = []
  const descriptors: string[] = []

  for (const t of tempos) {
    const match = t.match(/\d+/)
    if (match) {
      numericBpms.push(parseInt(match[0], 10))
    } else {
      descriptors.push(t.toLowerCase())
    }
  }

  // Prefer numeric — average and round
  if (numericBpms.length > 0) {
    const avg = Math.round(numericBpms.reduce((sum, v) => sum + v, 0) / numericBpms.length)
    return `${avg} BPM`
  }

  // Fall back to most common descriptor
  if (descriptors.length > 0) {
    const counts = new Map<string, number>()
    for (const d of descriptors) counts.set(d, (counts.get(d) || 0) + 1)
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0][0]
  }

  return null
}
