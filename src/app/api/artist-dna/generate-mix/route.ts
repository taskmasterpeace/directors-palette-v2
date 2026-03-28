/**
 * Artist DNA Generate Mix API
 * Generates lyrics template via LLM from ArtistDNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { SectionType } from '@/features/music-lab/types/writing-studio.types'
import { SECTION_GUIDANCE } from '@/features/music-lab/types/writing-studio.types'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

interface StructureEntry {
  type: SectionType
  barCount: number
  direction?: string
}

function getSyllableGuidance(sectionType: string, melodyBias: number): string {
  const noVocalSections = ['instrumental', 'interlude']
  if (noVocalSections.includes(sectionType)) return ''

  const isRap = melodyBias <= 40
  const isSung = melodyBias >= 60

  const targets: Record<string, { rap: string; sung: string; blend: string }> = {
    'verse': { rap: '10-14', sung: '8-10', blend: '8-12' },
    'hook': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'chorus': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'pre-chorus': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'build': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'bridge': { rap: '8-12', sung: '8-10', blend: '8-10' },
    'post-chorus': { rap: '6-8', sung: '6-8', blend: '6-8' },
    'intro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'outro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'break': { rap: '4-8', sung: '4-6', blend: '4-8' },
    'drop': { rap: '4-8', sung: '4-6', blend: '4-8' },
  }

  const t = targets[sectionType] || targets['verse']
  const range = isRap ? t.rap : isSung ? t.sung : t.blend

  return `SYLLABLE CONSISTENCY: Target ${range} syllables per line for this ${sectionType}. Keep syllable counts consistent within the section — lines that vary wildly sound rushed or awkward when performed.`
}

const DEFAULT_STRUCTURE: StructureEntry[] = [
  { type: 'verse', barCount: 16 },
  { type: 'chorus', barCount: 8 },
  { type: 'verse', barCount: 16 },
  { type: 'chorus', barCount: 8 },
  { type: 'bridge', barCount: 4 },
]

function buildSystemPrompt(dna: ArtistDNA, structure: StructureEntry[]): string {
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push('Generate a lyrics template that matches this artist\'s DNA exactly.')
  parts.push('Return ONLY the lyrics text with section headers like [Verse 1], [Chorus], etc.')

  // Identity context
  const writingName = dna.identity.stageName || dna.identity.realName
  if (writingName) {
    parts.push(`Writing for: ${writingName}`)
  }
  if (dna.identity.city || dna.identity.state) {
    parts.push(`From: ${[dna.identity.neighborhood, dna.identity.city, dna.identity.state].filter(Boolean).join(', ')}`)
  }
  if (dna.identity.ethnicity) {
    parts.push(`Background: ${dna.identity.ethnicity}`)
  }
  if (dna.identity.backstory) {
    parts.push(`Backstory: ${dna.identity.backstory.substring(0, 400)}`)
  }
  if (dna.identity.significantEvents?.length > 0) {
    parts.push(`Life events to draw from: ${dna.identity.significantEvents.join(', ')}`)
  }

  // Sound context
  if (dna.sound.melodyBias <= 30) {
    parts.push('This is primarily a rap/spoken-word track. Focus on lyrical density, multisyllabic rhymes, and wordplay.')
  } else if (dna.sound.melodyBias >= 70) {
    parts.push('This is primarily a sung track. Focus on melodic phrasing, vocal hooks, and singable melodies.')
  } else {
    parts.push('This blends rapping and singing. Alternate between lyrical sections and melodic hooks.')
  }

  if (dna.sound.genres?.length > 0) {
    parts.push(`Genres: ${dna.sound.genres.join(', ')}`)
  }
  if (dna.sound.subgenres?.length > 0) {
    parts.push(`Sub-genres: ${dna.sound.subgenres.join(', ')}`)
  }
  if (dna.sound.productionPreferences.length > 0) {
    parts.push(`Production style: ${dna.sound.productionPreferences.join(', ')}`)
  }
  if (dna.sound.artistInfluences.length > 0) {
    parts.push(`Influenced by: ${dna.sound.artistInfluences.join(', ')}. Channel their energy without copying.`)
  }
  if (dna.sound.vocalTextures?.length > 0) {
    parts.push(`Vocal texture: ${dna.sound.vocalTextures.join(', ')}`)
  }
  if (dna.sound.soundDescription) {
    parts.push(`Sound description: ${dna.sound.soundDescription}`)
  }

  // Persona
  if (dna.persona.attitude) {
    parts.push(`Attitude/tone: ${dna.persona.attitude}`)
  }
  if (dna.persona.worldview) {
    parts.push(`Worldview: ${dna.persona.worldview}`)
  }
  if (dna.persona.traits.length > 0) {
    parts.push(`Key traits: ${dna.persona.traits.join(', ')}`)
  }
  if (dna.persona.likes?.length > 0) {
    parts.push(`Themes they love: ${dna.persona.likes.join(', ')}`)
  }
  if (dna.persona.dislikes?.length > 0) {
    parts.push(`Themes they avoid: ${dna.persona.dislikes.join(', ')}`)
  }

  // Lexicon — tightened distribution rules
  if (dna.lexicon?.signaturePhrases?.length)
    parts.push(`Signature phrases (use at most 1-2 in the ENTIRE song, not in every section): ${dna.lexicon.signaturePhrases.join(', ')}`)
  if (dna.lexicon?.slang?.length)
    parts.push(`Slang/vocabulary (distribute naturally, don't repeat the same slang in every verse): ${dna.lexicon.slang.join(', ')}`)
  if (dna.lexicon?.adLibs?.length)
    parts.push(`Ad-libs (use at most 2-3 total across the whole song): ${dna.lexicon.adLibs.join(', ')}`)
  if (dna.lexicon?.bannedWords?.length)
    parts.push(`NEVER use these words: ${dna.lexicon.bannedWords.join(', ')}`)

  // Discography/catalog — use genome if available, fall back to raw lyrics
  if (dna.catalog.genome?.essenceStatement) {
    const genome = dna.catalog.genome
    parts.push(`\nCATALOG GENOME (distilled from ${genome.songCount} song${genome.songCount !== 1 ? 's' : ''}):`)
    parts.push(genome.essenceStatement)
    if (genome.rhymeProfile) parts.push(`Rhyme profile: ${genome.rhymeProfile}`)
    if (genome.storytellingProfile) parts.push(`Storytelling profile: ${genome.storytellingProfile}`)
    if (genome.vocabularyProfile) parts.push(`Vocabulary profile: ${genome.vocabularyProfile}`)
    if (genome.dominantThemes.length > 0) parts.push(`Dominant themes: ${genome.dominantThemes.join(', ')}`)
    if (genome.dominantMood) parts.push(`Dominant mood: ${genome.dominantMood}`)
    if (genome.blueprint) {
      if (genome.blueprint.mustInclude.length > 0) parts.push(`Must include: ${genome.blueprint.mustInclude.join('; ')}`)
      if (genome.blueprint.shouldInclude.length > 0) parts.push(`Should include: ${genome.blueprint.shouldInclude.join('; ')}`)
      if (genome.blueprint.avoidRepeating.length > 0) parts.push(`Avoid repeating: ${genome.blueprint.avoidRepeating.join('; ')}`)
      if (genome.blueprint.suggestExploring.length > 0) parts.push(`Explore: ${genome.blueprint.suggestExploring.join('; ')}`)
    }
    parts.push('The new song should feel like it belongs in this catalog but covers NEW ground.')
  } else if (dna.catalog.entries.length > 0) {
    parts.push(`\nDISCOGRAPHY (${dna.catalog.entries.length} existing songs):`)
    dna.catalog.entries.forEach((entry) => {
      const meta = [entry.mood, entry.tempo].filter(Boolean).join(', ')
      parts.push(`  "${entry.title}"${meta ? ` — ${meta}` : ''}`)
      if (entry.lyrics) {
        parts.push(`    Lyrics excerpt: ${entry.lyrics.substring(0, 200)}`)
      }
    })
    parts.push('Study these songs for patterns: rhyme schemes, vocabulary, storytelling approach.')
    parts.push('The new song should feel like it belongs in this catalog but covers NEW ground.')
  }

  // Rhyming DNA
  const rhymeTypes = dna.sound?.rhymeTypes
  const rhymePatterns = dna.sound?.rhymePatterns
  const rhymeDensity = dna.sound?.rhymeDensity

  if (rhymeTypes?.length || rhymePatterns?.length || rhymeDensity !== undefined) {
    parts.push('RHYMING STYLE:')
    if (rhymeTypes?.length) {
      const typeDescriptions: Record<string, string> = {
        'perfect': 'Perfect rhymes (exact ending sounds)',
        'multi-syllable': 'Multi-syllable rhymes (2+ syllables match)',
        'slant': 'Slant/near rhymes (close sounds, not exact)',
        'internal': 'Internal rhymes (within lines, not just at endings)',
        'compound': 'Compound/mosaic rhymes (multiple words rhyming together)',
        'assonance': 'Assonance rhymes (matching vowel sounds)',
      }
      parts.push(`Preferred rhyme types: ${rhymeTypes.map(t => typeDescriptions[t] || t).join('. ')}`)
    }
    if (rhymePatterns?.length) {
      const patternDescriptions: Record<string, string> = {
        'aabb': 'AABB (couplets)', 'abab': 'ABAB (alternating)',
        'abcb': 'ABCB (only 2 and 4)', 'abba': 'ABBA (enclosed)',
        'free': 'Free form', 'chain': 'Chain rhyme',
      }
      parts.push(`Preferred rhyme patterns: ${rhymePatterns.map(p => patternDescriptions[p] || p).join('. ')}`)
    }
    if (rhymeDensity !== undefined) {
      if (rhymeDensity <= 25) parts.push('Rhyme density: SPARSE')
      else if (rhymeDensity <= 50) parts.push('Rhyme density: MODERATE')
      else if (rhymeDensity <= 75) parts.push('Rhyme density: DENSE')
      else parts.push('Rhyme density: EVERY LINE')
    }
  }

  // Song structure with section guidance and syllable notes
  parts.push('SONG STRUCTURE:')
  structure.forEach((s, i) => {
    const guidance = SECTION_GUIDANCE[s.type] || 'Write this section with appropriate style and energy.'
    let line = `  ${i + 1}. [${s.type.toUpperCase()}] — ${s.barCount} bars. ${guidance}`
    if (s.direction) {
      line += ` DIRECTION: "${s.direction}"`
    }
    parts.push(line)
  })

  // Per-section syllable guidance
  const melodyBias = dna.sound?.melodyBias ?? 50
  structure.forEach((s, i) => {
    const syllableNote = getSyllableGuidance(s.type, melodyBias)
    if (syllableNote) parts.push(`  Section ${i + 1} syllables: ${syllableNote}`)
  })

  parts.push('Keep total lyrics under 3000 characters (Suno limit).')

  // Banned AI phrases
  parts.push(`NEVER use these overused AI words: ${BANNED_AI_PHRASES.join(', ')}`)

  // Human-voice directive
  parts.push('Use concrete, specific imagery. Reference real places, objects, and sensations.')
  parts.push('Write like a human songwriter, not an AI. No purple prose.')
  if (!rhymePatterns?.length) {
    parts.push('Vary rhyme schemes across sections (AABB, ABAB, ABCB). Make rhymes feel natural, not forced.')
  }

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { dna, structure: providedStructure } = await request.json() as {
      dna: ArtistDNA
      structure?: StructureEntry[]
    }

    if (!dna) {
      return NextResponse.json({ error: 'dna is required' }, { status: 400 })
    }

    const structure = providedStructure?.length ? providedStructure : DEFAULT_STRUCTURE
    const systemPrompt = buildSystemPrompt(dna, structure)
    const artistName = dna.identity.stageName || dna.identity.realName || 'this artist'
    const genre = dna.sound.genres[0] || 'music'
    const city = dna.identity.city || 'the city'
    const influences = dna.sound.artistInfluences.length > 0
      ? ` Their sound channels ${dna.sound.artistInfluences.slice(0, 3).join(', ')}.`
      : ''

    const userPrompt = `Write a lyrics template for ${artistName}, a ${genre} artist from ${city}.${influences} The song should reflect their persona and storytelling style.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Mix Generation",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error', { error })
      return NextResponse.json({ error: 'Mix generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const lyricsTemplate = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ lyricsTemplate })
  } catch (error) {
    logger.api.error('Mix generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
