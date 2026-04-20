/**
 * Contact Sheet — prompt builder
 *
 * Turns the scene + beats + artist DNA into 6 frame prompts.
 * Applies the artist's bannedWords lexicon as the final filter.
 */

import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { ContactSheetBeat } from './types'

export interface BuildFramePromptsArgs {
  scene: string
  beats: ContactSheetBeat[]
  dna?: Pick<ArtistDNA, 'look' | 'persona' | 'lexicon'> | null
  globalStyleNotes?: string
}

const FRAME_FOOTER =
  'Cinematic photo, 35mm, film grain, naturalistic color, shallow depth of field. ' +
  'Single coherent shot — no text, no watermarks, no split frames.'

/**
 * Build a short "who" clause from artist DNA so every frame stays on-character.
 * Intentionally light — the companion character sheet carries the full identity.
 */
function buildIdentityClause(
  dna?: Pick<ArtistDNA, 'look' | 'persona'> | null
): string {
  if (!dna) return ''

  const look = dna.look
  const lookBits: string[] = []
  if (look?.skinTone) lookBits.push(look.skinTone)
  if (look?.hairStyle) lookBits.push(look.hairStyle)
  if (look?.fashionStyle) lookBits.push(`${look.fashionStyle} styling`)
  if (look?.jewelry) lookBits.push(look.jewelry)

  const personaBits: string[] = []
  if (dna.persona?.attitude) personaBits.push(dna.persona.attitude)

  const parts: string[] = []
  if (lookBits.length) parts.push(`Subject: ${lookBits.join(', ')}.`)
  if (personaBits.length) parts.push(`Energy: ${personaBits.join(', ')}.`)
  return parts.join(' ')
}

/**
 * Strip banned words (case-insensitive, whole-word) from a prompt
 * and collapse the resulting whitespace.
 */
export function applyBannedWords(prompt: string, bannedWords?: string[]): string {
  if (!bannedWords || bannedWords.length === 0) return prompt
  let result = prompt
  for (const raw of bannedWords) {
    const word = raw?.trim()
    if (!word) continue
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(pattern, '')
  }
  return result.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}

/**
 * Build 6 frame prompts from a scene brief and 6 beats.
 * Order of precedence per prompt: identity → scene → beat → global notes → footer.
 */
export function buildFramePrompts(args: BuildFramePromptsArgs): string[] {
  const { scene, beats, dna, globalStyleNotes } = args

  if (!Array.isArray(beats) || beats.length !== 6) {
    throw new Error(`Contact sheet requires exactly 6 beats (got ${beats?.length ?? 0})`)
  }

  const identity = buildIdentityClause(dna)
  const bannedWords = dna?.lexicon?.bannedWords

  return beats.map((beat, i) => {
    const beatLine = beat.promptExtra
      ? `${beat.caption}. ${beat.promptExtra}`
      : beat.caption
    const segments = [
      identity,
      `Scene: ${scene}`,
      `Frame ${i + 1} of 6: ${beatLine}`,
      globalStyleNotes ? `Style notes: ${globalStyleNotes}` : '',
      FRAME_FOOTER,
    ].filter(Boolean)
    const raw = segments.join(' ')
    return applyBannedWords(raw, bannedWords)
  })
}
