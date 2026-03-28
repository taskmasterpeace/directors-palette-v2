/**
 * Format Writing Studio sections into Suno-compatible tagged lyrics
 */

import type { SongSection, FeatureArtist } from '../types/writing-studio.types'
import { SUNO_SECTION_TAGS } from '../types/writing-studio.types'
import type { ArtistDNA } from '../types/artist-dna.types'
import { inferDeliveryTag } from './suno-delivery-inference'

interface FormatOptions {
  artistName: string
  featureArtist: FeatureArtist | null
  sound: ArtistDNA['sound']
}

/**
 * Build Suno-formatted lyrics string from song sections.
 */
export function formatLyricsForSuno(
  sections: SongSection[],
  options: FormatOptions
): string {
  const lines: string[] = []
  const verseCounts: Record<string, number> = {}

  for (const section of sections) {
    if (!section.selectedDraft?.content && section.type !== 'instrumental') continue

    // Build section tag with numbering for verses
    let tag = SUNO_SECTION_TAGS[section.type] || `[${section.type}]`
    if (['verse', 'chorus'].includes(section.type)) {
      verseCounts[section.type] = (verseCounts[section.type] || 0) + 1
      if (verseCounts[section.type] > 1 || sections.filter(s => s.type === section.type).length > 1) {
        tag = tag.replace(']', ` ${verseCounts[section.type]}]`)
      }
    }

    // Add voice assignment for duets
    if (options.featureArtist && section.voice !== 'lead') {
      const voiceName = section.voice === 'feature'
        ? options.featureArtist.name
        : section.voice === 'both'
          ? 'Both'
          : options.artistName
      tag = tag.replace(']', `: ${voiceName}]`)
    }

    // Add delivery tag
    const delivery = section.deliveryTag || inferDeliveryTag(options.sound, section.type)
    const deliveryStr = delivery ? ` [${delivery}]` : ''

    lines.push(`${tag}${deliveryStr}`)

    // Add lyrics content (skip for instrumental)
    if (section.type !== 'instrumental' && section.selectedDraft?.content) {
      lines.push(section.selectedDraft.content)
    }

    lines.push('') // blank line between sections
  }

  return lines.join('\n').trim()
}
