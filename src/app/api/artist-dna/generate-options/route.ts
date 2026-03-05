/**
 * Generate Options API
 * Generates 4 draft options for a song section based on tone, concept, and artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import type { ToneSettings, SectionType } from '@/features/music-lab/types/writing-studio.types'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { logger } from '@/lib/logger'

const GENERATE_OPTIONS_COST_CENTS = 5
const MODEL = 'openai/gpt-4.1-mini'

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

interface PreviousSection {
  type: string
  content: string
}

interface GenerateOptionsBody {
  sectionType: SectionType
  tone: ToneSettings
  concept: string
  artistDna: ArtistDNA
  previousSections: PreviousSection[]
  artistDirection?: string
}

function buildSystemPrompt(body: GenerateOptionsBody): string {
  const { sectionType, tone, concept, artistDna, previousSections } = body
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push(`Generate exactly 4 different draft options for a song ${sectionType} section.`)
  parts.push('Each option should have a different creative direction while matching the same tone.')
  parts.push('Return ONLY a JSON array of 4 objects: [{"label":"A","content":"..."},{"label":"B","content":"..."},{"label":"C","content":"..."},{"label":"D","content":"..."}]')
  parts.push('Do NOT include any markdown formatting, code fences, or explanation. Just raw JSON.')

  // Tone context
  parts.push(`Emotion: ${tone.emotion}`)
  parts.push(`Energy level: ${tone.energy}/100 (${tone.energy <= 25 ? 'chill' : tone.energy <= 50 ? 'moderate' : tone.energy <= 75 ? 'hype' : 'explosive'})`)
  parts.push(`Delivery style: ${tone.delivery}`)

  // Section-specific guidance with bar count
  const barCount = tone.barCount
  switch (sectionType) {
    case 'intro':
      parts.push(`This is an intro: set the scene, establish mood. Write exactly ${barCount || 4} bars.`)
      break
    case 'hook':
      parts.push(`This is a hook/chorus: catchy, memorable, repeatable. Write exactly ${barCount || 8} bars. Every line should be singable and stick in your head.`)
      break
    case 'verse':
      parts.push(`This is a verse: storytelling, vivid detail, narrative progression. Write exactly ${barCount || 20} bars. Pack each line with meaning.`)
      break
    case 'bridge':
      parts.push(`This is a bridge: shift perspective, build tension. Write exactly ${barCount || 4} bars.`)
      break
    case 'outro':
      parts.push(`This is an outro: wrap up, leave a lasting impression. Write exactly ${barCount || 4} bars.`)
      break
  }

  if (concept) {
    parts.push(`Song concept: ${concept}`)
  }

  if (body.artistDirection) {
    parts.push(`\nARTIST DIRECTION: "${body.artistDirection}"`)
    parts.push('The artist specifically wants this vibe. Let it guide the tone, imagery, and feel.')
  }

  // Artist DNA context — full profile
  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName
  if (artistName) {
    parts.push(`Artist name: ${artistName}`)
  }
  if (artistDna.identity?.city || artistDna.identity?.state) {
    parts.push(`Origin: ${[artistDna.identity.neighborhood, artistDna.identity.city, artistDna.identity.state].filter(Boolean).join(', ')}`)
  }
  if (artistDna.identity?.backstory) {
    parts.push(`Backstory: ${artistDna.identity.backstory.substring(0, 300)}`)
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
  if (artistDna.sound?.genres?.length > 0) {
    parts.push(`Genres: ${artistDna.sound.genres.join(', ')}`)
  }
  if (artistDna.sound?.subgenres?.length > 0) {
    parts.push(`Sub-genres: ${artistDna.sound.subgenres.join(', ')}`)
  }
  if (artistDna.sound?.artistInfluences?.length > 0) {
    parts.push(`Influenced by: ${artistDna.sound.artistInfluences.join(', ')}. Channel their energy without copying.`)
  }
  if (artistDna.sound?.productionPreferences?.length > 0) {
    parts.push(`Production vibe: ${artistDna.sound.productionPreferences.join(', ')}`)
  }
  if (artistDna.sound?.vocalTextures?.length > 0) {
    parts.push(`Vocal texture: ${artistDna.sound.vocalTextures.join(', ')}`)
  }
  if (artistDna.sound?.instruments?.length > 0) {
    parts.push(`Preferred instruments: ${artistDna.sound.instruments.join(', ')}. Reference these instruments naturally in imagery or rhythm.`)
  }

  // Persona
  if (artistDna.persona?.attitude) {
    parts.push(`Artist attitude: ${artistDna.persona.attitude}`)
  }
  if (artistDna.persona?.worldview) {
    parts.push(`Worldview: ${artistDna.persona.worldview}`)
  }
  if (artistDna.persona?.traits?.length > 0) {
    parts.push(`Key traits: ${artistDna.persona.traits.join(', ')}`)
  }
  if (artistDna.persona?.likes?.length > 0) {
    parts.push(`Themes they gravitate toward: ${artistDna.persona.likes.join(', ')}`)
  }
  if (artistDna.persona?.dislikes?.length > 0) {
    parts.push(`Themes they avoid: ${artistDna.persona.dislikes.join(', ')}`)
  }

  // Lexicon
  if (artistDna.lexicon?.signaturePhrases?.length > 0) {
    parts.push(`Signature phrases to weave in naturally: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.slang?.length > 0) {
    parts.push(`Slang/vocabulary to use: ${artistDna.lexicon.slang.join(', ')}`)
  }
  if (artistDna.lexicon?.adLibs?.length > 0) {
    parts.push(`Ad-libs to sprinkle in: ${artistDna.lexicon.adLibs.join(', ')}`)
  }
  if (artistDna.lexicon?.bannedWords?.length > 0) {
    parts.push(`NEVER use these words: ${artistDna.lexicon.bannedWords.join(', ')}`)
  }

  // Discography/catalog — use genome if available, fall back to raw lyrics
  if (artistDna.catalog?.genome?.essenceStatement) {
    const genome = artistDna.catalog.genome
    parts.push(`Catalog genome (from ${genome.songCount} song${genome.songCount !== 1 ? 's' : ''}):`)
    parts.push(genome.essenceStatement)
    if (genome.rhymeProfile) parts.push(`Rhyme profile: ${genome.rhymeProfile}`)
    if (genome.storytellingProfile) parts.push(`Storytelling profile: ${genome.storytellingProfile}`)
    if (genome.vocabularyProfile) parts.push(`Vocabulary profile: ${genome.vocabularyProfile}`)
    if (genome.blueprint) {
      if (genome.blueprint.mustInclude.length > 0) parts.push(`Must include: ${genome.blueprint.mustInclude.join('; ')}`)
      if (genome.blueprint.shouldInclude.length > 0) parts.push(`Should include: ${genome.blueprint.shouldInclude.join('; ')}`)
      if (genome.blueprint.avoidRepeating.length > 0) parts.push(`Avoid repeating: ${genome.blueprint.avoidRepeating.join('; ')}`)
    }
    parts.push('Use this genome to understand the artist\'s established style. Build on it, don\'t repeat it.')
  } else if (artistDna.catalog?.entries?.length > 0) {
    parts.push(`Discography (${artistDna.catalog.entries.length} songs):`)
    artistDna.catalog.entries.slice(0, 5).forEach((entry) => {
      const meta = [entry.mood, entry.tempo].filter(Boolean).join(', ')
      parts.push(`  - "${entry.title}"${meta ? ` (${meta})` : ''}`)
      if (entry.lyrics) {
        parts.push(`    Sample: ${entry.lyrics.substring(0, 100)}...`)
      }
    })
    parts.push('Use this discography to understand the artist\'s established style. Build on it, don\'t repeat it.')
  }

  // Previous sections for context
  if (previousSections.length > 0) {
    parts.push('Previously written sections (maintain continuity and don\'t repeat imagery):')
    previousSections.forEach((s) => {
      parts.push(`[${s.type}]: ${s.content.substring(0, 200)}`)
    })
  }

  // Rhyming DNA
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

  if (rhymeTypes?.length || rhymePatterns?.length || rhymeDensity !== undefined) {
    parts.push('RHYMING STYLE:')

    if (rhymeTypes?.length) {
      const typeDescriptions: Record<string, string> = {
        'perfect': 'Perfect rhymes (exact ending sounds: cat/hat, flow/know)',
        'multi-syllable': 'Multi-syllable rhymes (demonstrate/hesitate, syllable/killable) — match 2+ syllables at the end',
        'slant': 'Slant/near rhymes (home/bone, love/move) — close sounds, not exact',
        'internal': 'Internal rhymes (rhymes within lines, not just at line endings)',
        'compound': 'Compound/mosaic rhymes (multiple words rhyming together: "door hinge"/"orange", "lackin\' purpose"/"back on surface")',
        'assonance': 'Assonance rhymes (matching vowel sounds: lake/fate, go/slow)',
      }
      const descs = rhymeTypes.map(t => typeDescriptions[t] || t)
      parts.push(`Preferred rhyme types: ${descs.join('. ')}`)
      if (rhymeTypes.includes('multi-syllable') || rhymeTypes.includes('compound')) {
        parts.push('This artist favors COMPLEX rhyming — avoid simple single-syllable rhymes like "cat/hat". Aim for multi-word and multi-syllable matches.')
      }
    }

    if (rhymePatterns?.length) {
      const patternDescriptions: Record<string, string> = {
        'aabb': 'AABB (couplets — lines 1-2 rhyme, lines 3-4 rhyme)',
        'abab': 'ABAB (alternating — lines 1 and 3 rhyme, lines 2 and 4 rhyme)',
        'abcb': 'ABCB (only lines 2 and 4 rhyme)',
        'abba': 'ABBA (enclosed — lines 1 and 4 rhyme, lines 2 and 3 rhyme)',
        'free': 'Free form (no fixed pattern, rhymes land where they feel natural)',
        'chain': 'Chain rhyme (the end word of one line rhymes with a word in the middle of the next line)',
      }
      const descs = rhymePatterns.map(p => patternDescriptions[p] || p)
      parts.push(`Preferred rhyme patterns: ${descs.join('. ')}`)
      parts.push(`Distribute these patterns across the 4 options — each option can use a different pattern from the artist's preferences.`)
    }

    if (rhymeDensity !== undefined) {
      if (rhymeDensity <= 25) {
        parts.push('Rhyme density: SPARSE — only rhyme occasionally. Let some lines breathe without rhymes.')
      } else if (rhymeDensity <= 50) {
        parts.push('Rhyme density: MODERATE — rhyme naturally, don\'t force it on every line.')
      } else if (rhymeDensity <= 75) {
        parts.push('Rhyme density: DENSE — most lines should rhyme. Pack the bars.')
      } else {
        parts.push('Rhyme density: EVERY LINE — every line should rhyme with something. Maximum lyrical density.')
      }
    }
  }

  // Variety directive
  parts.push('Make each of the 4 options DISTINCTLY different: different imagery, rhythm, opening lines, rhyme schemes.')
  parts.push(`NEVER use these AI-sounding words: ${BANNED_AI_PHRASES.join(', ')}`)
  parts.push('Write like a human songwriter, not an AI. Use concrete, specific imagery from the artist\'s world.')
  if (!rhymePatterns?.length) {
    parts.push('End-of-line rhymes should feel natural, not forced. Vary rhyme schemes across options (AABB, ABAB, ABCB).')
  }

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const deductResult = await creditsService.deductCredits(auth.user.id, 'writing-options', {
      generationType: 'text',
      description: 'Writing studio: generate 4 draft options',
      overrideAmount: GENERATE_OPTIONS_COST_CENTS,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: 'Insufficient credits', ...deductResult }, { status: 402 })
    }

    const body = await request.json() as GenerateOptionsBody

    if (!body.sectionType || !body.tone) {
      return NextResponse.json({ error: 'sectionType and tone are required' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(body)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Writing Studio Options",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 4 draft options for this ${body.sectionType} section.` },
        ],
        temperature: 0.9,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error', { error })
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

    const data = await response.json()
    let raw = data.choices?.[0]?.message?.content || ''
    if (!raw.trim()) raw = '[]'

    // Parse JSON response, handling potential markdown wrapping
    let options
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      options = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse options JSON', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse generated options' }, { status: 500 })
    }

    // Add IDs
    const optionsWithIds = (options as { label: string; content: string }[]).map(
      (opt: { label: string; content: string }) => ({
        id: crypto.randomUUID(),
        label: opt.label,
        content: opt.content,
      })
    )

    return NextResponse.json({ options: optionsWithIds })
  } catch (error) {
    logger.api.error('Generate options error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
