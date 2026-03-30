/**
 * Suggest Concepts API
 * Generates song concepts in the artist's own voice using their full DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { logger } from '@/lib/logger'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'

const MODEL = 'openai/gpt-4.1-mini'
const LLM_COST_POINTS = 1

interface SuggestConceptsBody {
  artistDna: ArtistDNA
}

function buildArtistProfile(dna: ArtistDNA): string {
  const lines: string[] = []

  // Identity
  const name = dna.identity?.stageName || dna.identity?.realName || 'Unknown'
  lines.push(`NAME: ${name}`)
  if (dna.identity?.city) {
    const location = [dna.identity.neighborhood, dna.identity.city, dna.identity.state].filter(Boolean).join(', ')
    lines.push(`FROM: ${location}`)
  }
  if (dna.identity?.ethnicity) lines.push(`ETHNICITY: ${dna.identity.ethnicity}`)
  if (dna.identity?.backstory) lines.push(`BACKSTORY: ${dna.identity.backstory}`)
  if (dna.identity?.significantEvents?.length > 0) {
    lines.push(`LIFE EVENTS: ${dna.identity.significantEvents.join('; ')}`)
  }

  // Persona
  if (dna.persona?.attitude) lines.push(`ATTITUDE: ${dna.persona.attitude}`)
  if (dna.persona?.worldview) lines.push(`WORLDVIEW: ${dna.persona.worldview}`)
  if (dna.persona?.traits?.length > 0) lines.push(`PERSONALITY: ${dna.persona.traits.join(', ')}`)
  if (dna.persona?.likes?.length > 0) lines.push(`CARES ABOUT: ${dna.persona.likes.join(', ')}`)
  if (dna.persona?.dislikes?.length > 0) lines.push(`HATES: ${dna.persona.dislikes.join(', ')}`)

  // Sound
  if (dna.sound?.genres?.length > 0) lines.push(`GENRES: ${dna.sound.genres.join(', ')}`)
  if (dna.sound?.subgenres?.length > 0) lines.push(`SUBGENRES: ${dna.sound.subgenres.join(', ')}`)
  if (dna.sound?.soundDescription) lines.push(`SOUND: ${dna.sound.soundDescription}`)

  // Lexicon — the artist's actual vocabulary
  if (dna.lexicon?.signaturePhrases?.length > 0) {
    lines.push(`SIGNATURE PHRASES: "${dna.lexicon.signaturePhrases.join('", "')}"`)
  }
  if (dna.lexicon?.slang?.length > 0) lines.push(`SLANG THEY USE: ${dna.lexicon.slang.join(', ')}`)
  if (dna.lexicon?.adLibs?.length > 0) lines.push(`AD-LIBS: ${dna.lexicon.adLibs.join(', ')}`)
  if (dna.lexicon?.bannedWords?.length > 0) lines.push(`NEVER SAYS: ${dna.lexicon.bannedWords.join(', ')}`)

  // Existing catalog — to avoid repeats
  if (dna.catalog?.entries?.length > 0) {
    const existing = dna.catalog.entries.map((e) => e.title).join(', ')
    lines.push(`EXISTING SONGS (don't repeat these themes): ${existing}`)
  }

  const dominantThemes = dna.catalog?.genome?.dominantThemes
  if (dominantThemes && dominantThemes.length > 0) {
    lines.push(`Dominant catalog themes: ${dominantThemes.join(', ')}`)
  }
  const suggestExploring = dna.catalog?.genome?.blueprint?.suggestExploring
  if (suggestExploring && suggestExploring.length > 0) {
    lines.push(`EXPLORE THESE (genome recommends new territory): ${suggestExploring.join('; ')}`)
  }
  const avoidRepeating = dna.catalog?.genome?.blueprint?.avoidRepeating
  if (avoidRepeating && avoidRepeating.length > 0) {
    lines.push(`Avoid repeating (overused in catalog): ${avoidRepeating.join('; ')}`)
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email || '')

    if (!userIsAdmin) {
        const balance = await creditsService.getBalance(user.id)
        if (!balance || balance.balance < LLM_COST_POINTS) {
            return NextResponse.json(
                { error: `Insufficient credits. Need ${LLM_COST_POINTS}, have ${balance?.balance || 0}` },
                { status: 402 }
            )
        }
    }

    const { artistDna } = await request.json() as SuggestConceptsBody

    if (!artistDna) {
      return NextResponse.json({ error: 'artistDna is required' }, { status: 400 })
    }

    const artistName = artistDna.identity?.stageName || artistDna.identity?.realName || 'the artist'
    const profile = buildArtistProfile(artistDna)

    const systemPrompt = `You ARE ${artistName}. You're a musician pitching song ideas to your producer.

Here's who you are:
${profile}

RULES:
- Write each concept AS ${artistName} would actually say it — use their slang, their rhythm, their attitude.
- Reference specific places, people, feelings, and moments from their life.
- Each concept should be 2-3 sentences max. Casual, not formal. Like you're in the studio talking.
- Mix it up: some personal/emotional, some hard/aspirational, some storytelling, some for the culture.
- Don't start every concept the same way. Vary the energy.
- Never use generic phrases like "a song about overcoming adversity" — be SPECIFIC.
- Return ONLY a JSON array of 6 strings. No markdown, no explanation, no wrapping.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Concept Suggestions",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: "What you been cooking? Pitch me 6 song ideas." },
        ],
        temperature: 0.95,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error', { error })
      return NextResponse.json({ error: 'Suggestion failed' }, { status: 500 })
    }

    const data = await response.json()
    let raw = data.choices?.[0]?.message?.content || ''
    if (!raw.trim()) raw = '[]'

    let concepts: string[]
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      concepts = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse concepts JSON', { detail: raw.substring(0, 300) })
      return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 })
    }

    if (!userIsAdmin) {
        await creditsService.addCredits(user.id, -LLM_COST_POINTS, {
            type: 'usage',
            description: 'Concept suggestion',
            metadata: { tool: 'artist-concepts' },
        })
    }

    return NextResponse.json({ concepts })
  } catch (error) {
    logger.api.error('Suggest concepts error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
