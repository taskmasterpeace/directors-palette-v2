/**
 * Generate Full Song API
 * Generates an entire song at once based on a structure, tone, concept, and artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import type { SectionType, ToneSettings } from '@/features/music-lab/types/writing-studio.types'
import { SECTION_GUIDANCE } from '@/features/music-lab/types/writing-studio.types'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { logger } from '@/lib/logger'

const GENERATE_FULL_SONG_COST_CENTS = 10
const MODEL = 'openai/gpt-4.1'

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

interface GenerateFullSongBody {
  structure: StructureEntry[]
  tone: Pick<ToneSettings, 'emotion' | 'energy' | 'delivery'>
  concept: string
  artistDna: ArtistDNA
  artistDirection?: string
}

function buildFullSongPrompt(body: GenerateFullSongBody): string {
  const { structure, tone, concept, artistDna } = body
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push('Generate a complete song with the following structure. Each section must flow naturally into the next.')
  parts.push('Return ONLY a JSON array of objects matching the structure order: [{"type":"verse","content":"..."},{"type":"hook","content":"..."},...]')
  parts.push('Do NOT include any markdown formatting, code fences, or explanation. Just raw JSON.')

  // Global tone
  parts.push(`Emotion: ${tone.emotion}`)
  parts.push(`Energy level: ${tone.energy}/100 (${tone.energy <= 25 ? 'chill' : tone.energy <= 50 ? 'moderate' : tone.energy <= 75 ? 'hype' : 'explosive'})`)
  parts.push(`Delivery style: ${tone.delivery}`)

  // Structure with bar counts
  parts.push('SONG STRUCTURE:')
  structure.forEach((s, i) => {
    const guidance = getSectionGuidance(s.type)
    let line = `  ${i + 1}. [${s.type.toUpperCase()}] — ${s.barCount} bars. ${guidance}`
    if (s.direction) {
      line += ` DIRECTION: "${s.direction}"`
    }
    parts.push(line)
  })

  if (concept) {
    parts.push(`Song concept: ${concept}`)
  }

  if (body.artistDirection) {
    parts.push(`\nARTIST DIRECTION: "${body.artistDirection}"`)
    parts.push('The artist specifically wants this vibe. Let it guide the tone, imagery, and feel of every section.')
  }

  // Artist DNA context — reuse same approach as generate-options
  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName
  if (artistName) parts.push(`Artist name: ${artistName}`)
  if (artistDna.identity?.city || artistDna.identity?.state) {
    parts.push(`Origin: ${[artistDna.identity.neighborhood, artistDna.identity.city, artistDna.identity.state].filter(Boolean).join(', ')}`)
  }
  if (artistDna.identity?.backstory) {
    parts.push(`Backstory: ${artistDna.identity.backstory.substring(0, 300)}`)
  }
  if (artistDna.identity?.significantEvents?.length > 0) {
    parts.push(`Significant life events: ${artistDna.identity.significantEvents.slice(0, 5).join('; ')}`)
  }
  if (artistDna.identity?.ethnicity) {
    parts.push(`Cultural background: ${artistDna.identity.ethnicity}`)
  }

  // Sound profile
  if (artistDna.sound?.melodyBias !== undefined) {
    if (artistDna.sound.melodyBias <= 30) {
      parts.push('Style: primarily rap/spoken-word. Focus on wordplay, multisyllabic rhymes, and lyrical density.')
    } else if (artistDna.sound.melodyBias >= 70) {
      parts.push('Style: primarily sung. Focus on melodic phrasing, vocal hooks, and singable melodies.')
    } else {
      parts.push('Style: blend of rap and singing. Mix lyrical bars with melodic hooks.')
    }
  }
  if (artistDna.sound?.genres?.length > 0) parts.push(`Genres: ${artistDna.sound.genres.join(', ')}`)
  if (artistDna.sound?.subgenres?.length > 0) parts.push(`Sub-genres: ${artistDna.sound.subgenres.join(', ')}`)
  if (artistDna.sound?.genreEvolution?.length > 0) {
    const evoDesc = artistDna.sound.genreEvolution
      .map(e => `${e.era}: ${e.genres.join(', ')}`)
      .join(' → ')
    parts.push(`Sound evolution: ${evoDesc}`)
  }
  if (artistDna.sound?.artistInfluences?.length > 0) parts.push(`Influenced by: ${artistDna.sound.artistInfluences.join(', ')}. Channel their energy without copying.`)
  if (artistDna.sound?.keyCollaborators?.length > 0) {
    parts.push(`Key collaborators: ${artistDna.sound.keyCollaborators.join(', ')}`)
  }
  if (artistDna.sound?.productionPreferences?.length > 0) parts.push(`Production vibe: ${artistDna.sound.productionPreferences.join(', ')}`)
  if (artistDna.sound?.vocalTextures?.length > 0) parts.push(`Vocal texture: ${artistDna.sound.vocalTextures.join(', ')}`)
  if (artistDna.sound?.instruments?.length > 0) parts.push(`Preferred instruments: ${artistDna.sound.instruments.join(', ')}`)
  if (artistDna.sound?.flowStyle) parts.push(`Flow style: ${artistDna.sound.flowStyle}`)
  if (artistDna.sound?.language && artistDna.sound.language !== 'English') {
    parts.push(`Primary language: ${artistDna.sound.language}`)
  }
  if (artistDna.sound?.secondaryLanguages?.length > 0) {
    parts.push(`Also writes in: ${artistDna.sound.secondaryLanguages.join(', ')}. Mix in words/phrases from these languages naturally.`)
  }

  // Persona
  if (artistDna.persona?.attitude) parts.push(`Artist attitude: ${artistDna.persona.attitude}`)
  if (artistDna.persona?.worldview) parts.push(`Worldview: ${artistDna.persona.worldview}`)
  if (artistDna.persona?.traits?.length > 0) parts.push(`Key traits: ${artistDna.persona.traits.join(', ')}`)
  if (artistDna.persona?.likes?.length > 0) parts.push(`Themes they gravitate toward: ${artistDna.persona.likes.join(', ')}`)
  if (artistDna.persona?.dislikes?.length > 0) parts.push(`Themes they avoid: ${artistDna.persona.dislikes.join(', ')}`)

  // Lexicon — use sparingly across the whole song
  if (artistDna.lexicon?.signaturePhrases?.length > 0) parts.push(`Signature phrases (use at most 1-2 in the ENTIRE song, not in every section): ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  if (artistDna.lexicon?.slang?.length > 0) parts.push(`Slang/vocabulary (distribute naturally, don't repeat the same slang in every verse): ${artistDna.lexicon.slang.join(', ')}`)
  if (artistDna.lexicon?.adLibs?.length > 0) parts.push(`Ad-libs (use at most 2-3 total across the whole song): ${artistDna.lexicon.adLibs.join(', ')}`)
  if (artistDna.lexicon?.bannedWords?.length > 0) parts.push(`NEVER use these words: ${artistDna.lexicon.bannedWords.join(', ')}`)

  // Catalog genome
  if (artistDna.catalog?.genome?.essenceStatement) {
    const genome = artistDna.catalog.genome
    parts.push(`Catalog genome (from ${genome.songCount} songs):`)
    parts.push(genome.essenceStatement)
    if (genome.rhymeProfile) parts.push(`Rhyme profile: ${genome.rhymeProfile}`)
    if (genome.storytellingProfile) parts.push(`Storytelling profile: ${genome.storytellingProfile}`)
    if (genome.vocabularyProfile) parts.push(`Vocabulary profile: ${genome.vocabularyProfile}`)
    if (genome.blueprint) {
      if (genome.blueprint.mustInclude.length > 0) parts.push(`Must include: ${genome.blueprint.mustInclude.join('; ')}`)
      if (genome.blueprint.shouldInclude.length > 0) parts.push(`Should include: ${genome.blueprint.shouldInclude.join('; ')}`)
      if (genome.blueprint.avoidRepeating.length > 0) parts.push(`Avoid repeating: ${genome.blueprint.avoidRepeating.join('; ')}`)
      if (genome.blueprint.suggestExploring.length > 0) {
        parts.push(`Fresh territory to explore: ${genome.blueprint.suggestExploring.join('; ')}`)
      }
    }
  }

  // Rhyming DNA
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

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

  // Full song directives
  parts.push('FULL SONG DIRECTIVES:')
  parts.push('- Maintain narrative continuity across all sections')
  parts.push('- Do NOT repeat imagery or metaphors between sections')
  parts.push('- Each verse must progress the story forward')
  parts.push('- Hooks must be catchy, repeatable, and the emotional anchor')
  parts.push('- The bridge should offer a new perspective or emotional shift')
  parts.push('- Intro sets the tone; outro leaves a lasting impression')
  parts.push(`NEVER use these AI-sounding words: ${BANNED_AI_PHRASES.join(', ')}`)
  parts.push('Write like a human songwriter, not an AI. Use concrete, specific imagery.')

  return parts.join('\n')
}

function getSectionGuidance(type: SectionType): string {
  return SECTION_GUIDANCE[type] || 'Write this section with appropriate style and energy.'
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const deductResult = await creditsService.deductCredits(auth.user.id, 'full-song-gen', {
      generationType: 'text',
      description: 'Writing studio: generate full song',
      overrideAmount: GENERATE_FULL_SONG_COST_CENTS,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: 'Insufficient credits', ...deductResult }, { status: 402 })
    }

    const body = await request.json() as GenerateFullSongBody

    if (!body.structure?.length || !body.tone) {
      return NextResponse.json({ error: 'structure and tone are required' }, { status: 400 })
    }

    const systemPrompt = buildFullSongPrompt(body)

    const structureDesc = body.structure.map((s, i) => `${i + 1}. ${s.type} (${s.barCount} bars)`).join(', ')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Full Song Generation",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write a complete song with this structure: ${structureDesc}` },
        ],
        temperature: 0.85,
        max_tokens: 12000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error (full song)', { error })
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

    const data = await response.json()
    let raw = data.choices?.[0]?.message?.content || ''
    if (!raw.trim()) raw = '[]'

    let sections
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      sections = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse full song JSON', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse generated song' }, { status: 500 })
    }

    return NextResponse.json({ sections })
  } catch (error) {
    logger.api.error('Generate full song error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
