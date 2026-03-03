'use client'

import { useMemo } from 'react'
import { useArtistDnaStore } from '../store/artist-dna.store'
import { MOOD_TAGS } from '../data/mood-tags.data'
import {
  DRUM_DESIGN_TAGS,
  GROOVE_FEEL_TAGS,
  BASS_STYLE_TAGS,
  SYNTH_TEXTURE_TAGS,
  HARMONY_COLOR_TAGS,
  SPACE_FX_TAGS,
  EAR_CANDY_TAGS,
} from '../data/production-tags.data'

export interface ArtistFitResult {
  moods: string[]
  drumDesign: string[]
  grooveFeel: string[]
  bassStyle: string[]
  synthTexture: string[]
  harmonyColor: string[]
  spaceFx: string[]
  earCandy: string[]
  instruments: string[]
  hasArtist: boolean
}

/**
 * Normalizes a string for fuzzy matching: lowercase, trim, strip hyphens
 */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/-/g, ' ')
}

/**
 * Returns true if any keyword matches the target (or vice versa)
 */
function fuzzyMatch(target: string, keywords: Set<string>): boolean {
  const t = norm(target)
  for (const kw of keywords) {
    if (t === kw || t.includes(kw) || kw.includes(t)) return true
  }
  return false
}

/**
 * Match tag labels against a set of artist preference strings.
 * Returns matched labels.
 */
function matchTags(
  tags: { label: string }[],
  preferences: string[],
): string[] {
  if (preferences.length === 0) return []
  const prefSet = new Set(preferences.map(norm))
  return tags
    .filter((tag) => fuzzyMatch(tag.label, prefSet))
    .map((tag) => tag.label)
}

/**
 * Matches persona traits/attitude keywords against mood tag labels.
 */
function matchMoods(traits: string[], attitude: string): string[] {
  // Build keyword set from persona traits + attitude words
  const keywords = new Set<string>()
  for (const trait of traits) {
    keywords.add(norm(trait))
  }
  // Split attitude into individual words (e.g. "aggressive and raw" → "aggressive", "raw")
  if (attitude) {
    for (const word of attitude.split(/[\s,;/&]+/)) {
      const w = norm(word)
      if (w.length > 2 && w !== 'and' && w !== 'but' && w !== 'the' && w !== 'with') {
        keywords.add(w)
      }
    }
  }
  if (keywords.size === 0) return []

  return MOOD_TAGS
    .filter((tag) => fuzzyMatch(tag.label, keywords))
    .map((tag) => tag.label)
}

/**
 * Hook that maps the active artist's DNA to matching Sound Studio tag labels.
 * Returns per-section arrays of labels that match the artist's preferences.
 */
export function useArtistFit(): ArtistFitResult {
  const { artists, activeArtistId } = useArtistDnaStore()

  return useMemo(() => {
    const empty: ArtistFitResult = {
      moods: [],
      drumDesign: [],
      grooveFeel: [],
      bassStyle: [],
      synthTexture: [],
      harmonyColor: [],
      spaceFx: [],
      earCandy: [],
      instruments: [],
      hasArtist: false,
    }

    const artist = artists.find((a) => a.id === activeArtistId)
    if (!artist?.dna) return empty

    const dna = artist.dna
    const prodPrefs = dna.sound?.productionPreferences || []
    const instruments = dna.sound?.instruments || []
    const traits = dna.persona?.traits || []
    const attitude = dna.persona?.attitude || ''

    return {
      moods: matchMoods(traits, attitude),
      drumDesign: matchTags(DRUM_DESIGN_TAGS, prodPrefs),
      grooveFeel: matchTags(GROOVE_FEEL_TAGS, prodPrefs),
      bassStyle: matchTags(BASS_STYLE_TAGS, prodPrefs),
      synthTexture: matchTags(SYNTH_TEXTURE_TAGS, prodPrefs),
      harmonyColor: matchTags(HARMONY_COLOR_TAGS, prodPrefs),
      spaceFx: matchTags(SPACE_FX_TAGS, prodPrefs),
      earCandy: matchTags(EAR_CANDY_TAGS, prodPrefs),
      instruments,
      hasArtist: true,
    }
  }, [artists, activeArtistId])
}
