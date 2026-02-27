import type { ArtistDNA } from '../../../types/artist-dna.types'
import type { NodeData, AtmospherePreset } from './types'
import { GENRE_PALETTES, DEFAULT_PALETTE, ATTITUDE_SHIFTS } from './constants'

export const sa = <T = string>(val: unknown): T[] => Array.isArray(val) ? val as T[] : []

export function calculateRingFill(dna: ArtistDNA) {
  const sound =
    (sa(dna.sound.genres).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.vocalTextures).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.productionPreferences).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.artistInfluences).length > 0 ? 0.2 : 0) +
    (dna.sound.soundDescription ? 0.2 : 0)

  const influences =
    (sa(dna.sound.artistInfluences).length > 0 ? 0.5 : 0) +
    (sa(dna.sound.genres).length > 0 ? 0.25 : 0) +
    (sa(dna.sound.subgenres).length > 0 ? 0.25 : 0)

  const persona =
    (sa(dna.persona.traits).length > 0 ? 0.25 : 0) +
    (sa(dna.persona.likes).length > 0 ? 0.25 : 0) +
    (dna.persona.attitude ? 0.25 : 0) +
    (dna.persona.worldview ? 0.25 : 0)

  const lexicon =
    (sa(dna.lexicon.signaturePhrases).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.slang).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.adLibs).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.bannedWords).length > 0 ? 0.25 : 0)

  const profile =
    (dna.identity.stageName || dna.identity.realName ? 0.2 : 0) +
    (dna.identity.backstory ? 0.2 : 0) +
    (dna.identity.city ? 0.2 : 0) +
    (dna.look.visualDescription ? 0.2 : 0) +
    (Array.isArray(dna.catalog.entries) && dna.catalog.entries.length > 0 ? 0.2 : 0)

  return { sound, influences, persona, lexicon, profile }
}

export function calculateRingCounts(dna: ArtistDNA) {
  const sound = sa(dna.sound.genres).length + sa(dna.sound.vocalTextures).length +
    sa(dna.sound.productionPreferences).length + (dna.sound.soundDescription ? 1 : 0)
  const influences = sa(dna.sound.artistInfluences).length
  const persona = sa(dna.persona.traits).length + sa(dna.persona.likes).length +
    sa(dna.persona.dislikes).length + (dna.persona.attitude ? 1 : 0) + (dna.persona.worldview ? 1 : 0)
  const lexicon = sa(dna.lexicon.signaturePhrases).length + sa(dna.lexicon.slang).length +
    sa(dna.lexicon.adLibs).length + sa(dna.lexicon.bannedWords).length
  const profile = (dna.identity.stageName || dna.identity.realName ? 1 : 0) + (dna.identity.backstory ? 1 : 0) +
    (dna.identity.city ? 1 : 0) + (dna.look.visualDescription ? 1 : 0) + (Array.isArray(dna.catalog.entries) ? dna.catalog.entries.length : 0)
  return [sound, influences, persona, lexicon, profile]
}

export function calculateRingGlow(dna: ArtistDNA) {
  const sound = sa(dna.sound.genres).join('').length + sa(dna.sound.vocalTextures).join('').length +
    sa(dna.sound.productionPreferences).join('').length + (dna.sound.soundDescription || '').length
  const influences = sa(dna.sound.artistInfluences).join('').length
  const persona = sa(dna.persona.traits).join('').length + sa(dna.persona.likes).join('').length +
    sa(dna.persona.dislikes).join('').length + (dna.persona.attitude || '').length + (dna.persona.worldview || '').length
  const lexicon = sa(dna.lexicon.signaturePhrases).join('').length + sa(dna.lexicon.slang).join('').length +
    sa(dna.lexicon.adLibs).join('').length + sa(dna.lexicon.bannedWords).join('').length
  const profile = (dna.identity.stageName?.length || 0) + (dna.identity.realName?.length || 0) + (dna.identity.backstory || '').length +
    (dna.identity.city || '').length + (dna.look.visualDescription || '').length
  return [sound, influences, persona, lexicon, profile]
}

function makeNodes(items: string[], ring: string, category: string, importance: number): NodeData[] {
  return items.filter(Boolean).map(label => ({
    id: `${ring.toLowerCase()}:${label.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    category,
    ring,
    importance,
  }))
}

export function extractRingNodes(dna: ArtistDNA): NodeData[][] {
  const sound = [
    ...makeNodes(sa(dna.sound.genres), 'Sound', 'genre', 1.0),
    ...makeNodes(sa(dna.sound.subgenres), 'Sound', 'subgenre', 0.6),
    ...makeNodes(sa(dna.sound.vocalTextures), 'Sound', 'vocal', 0.6),
    ...makeNodes(sa(dna.sound.productionPreferences), 'Sound', 'production', 0.5),
    ...makeNodes(sa(dna.sound.microgenres), 'Sound', 'microgenre', 0.3),
  ]

  const influences = makeNodes(sa(dna.sound.artistInfluences), 'Influences', 'influence', 1.0)

  const persona = [
    ...makeNodes(sa(dna.persona.traits), 'Persona', 'trait', 1.0),
    ...makeNodes(sa(dna.persona.likes), 'Persona', 'like', 0.6),
    ...makeNodes(sa(dna.persona.dislikes), 'Persona', 'dislike', 0.4),
    ...(dna.persona.attitude ? [{ id: 'persona:attitude', label: dna.persona.attitude, category: 'attitude', ring: 'Persona', importance: 0.8 }] : []),
  ]

  const lexicon = [
    ...makeNodes(sa(dna.lexicon.signaturePhrases), 'Lexicon', 'phrase', 1.0),
    ...makeNodes(sa(dna.lexicon.slang), 'Lexicon', 'slang', 0.7),
    ...makeNodes(sa(dna.lexicon.adLibs), 'Lexicon', 'adlib', 0.5),
    ...makeNodes(sa(dna.lexicon.bannedWords), 'Lexicon', 'banned', 0.3),
  ]

  const profile = [
    ...(dna.identity.stageName ? [{ id: 'profile:stagename', label: dna.identity.stageName, category: 'name', ring: 'Profile', importance: 1.0 }] : []),
    ...(dna.identity.city ? [{ id: 'profile:city', label: dna.identity.city, category: 'location', ring: 'Profile', importance: 0.7 }] : []),
    ...(dna.identity.backstory ? [{ id: 'profile:backstory', label: 'Backstory', category: 'bio', ring: 'Profile', importance: 0.5 }] : []),
  ]

  return [sound, influences, persona, lexicon, profile]
}

export function getAtmospherePreset(dna: ArtistDNA): AtmospherePreset {
  const genres = sa(dna.sound.genres).map(g => g.toLowerCase().replace(/[^a-z&]/g, ''))
  const attitude = (dna.persona.attitude || '').toLowerCase()

  let palette = DEFAULT_PALETTE
  for (const genre of genres) {
    for (const [key, pal] of Object.entries(GENRE_PALETTES)) {
      if (genre.includes(key) || key.includes(genre)) {
        palette = pal
        break
      }
    }
    if (palette !== DEFAULT_PALETTE) break
  }

  const shift = ATTITUDE_SHIFTS[attitude] || 0
  if (shift !== 0) {
    palette = palette.map(([r, g, b]) => [
      Math.max(0, Math.min(1, r + shift)),
      Math.max(0, Math.min(1, g - Math.abs(shift) * 0.3)),
      Math.max(0, Math.min(1, b - shift)),
    ] as [number, number, number])
  }

  const isElectronic = genres.some(g => g.includes('electronic') || g.includes('dance'))
  const isRock = genres.some(g => g.includes('rock') || g.includes('metal'))

  return {
    palette,
    particleSize: isElectronic ? 0.02 : isRock ? 0.04 : 0.03,
    brightness: attitude === 'playful' ? 0.9 : 0.7,
  }
}
