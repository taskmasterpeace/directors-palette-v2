/**
 * Judge Drafts API
 * AI becomes the artist persona and reviews/scores 4 draft options
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { DraftOption, SectionType } from '@/features/music-lab/types/writing-studio.types'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1'
const JUDGE_COST_CENTS = 5

interface JudgeDraftsBody {
  drafts: DraftOption[]
  sectionType: SectionType
  artistDna: ArtistDNA
  artistDirection?: string
}

function buildJudgePrompt(body: JudgeDraftsBody): string {
  const { sectionType, artistDna, artistDirection } = body
  const parts: string[] = []

  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName || 'the artist'
  const city = [artistDna.identity?.neighborhood, artistDna.identity?.city, artistDna.identity?.state].filter(Boolean).join(', ')

  parts.push(`You ARE ${artistName}${city ? ` from ${city}` : ''}.`)
  parts.push(`You are reviewing 4 draft options for a ${sectionType} section of YOUR new song.`)
  parts.push('Give your HONEST opinion as the artist. Be specific. Be yourself.')

  if (artistDna.identity?.backstory) {
    parts.push(`Your backstory: ${artistDna.identity.backstory.substring(0, 300)}`)
  }
  if (artistDna.persona?.attitude) {
    parts.push(`Your attitude: ${artistDna.persona.attitude}`)
  }
  if (artistDna.persona?.worldview) {
    parts.push(`Your worldview: ${artistDna.persona.worldview}`)
  }

  if (artistDirection) {
    parts.push(`The vibe you were going for: "${artistDirection}"`)
    parts.push('Judge each draft against this vibe. Does it capture what you wanted?')
  }

  // Rhyming DNA for scoring
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

  if (rhymeTypes?.length) {
    parts.push(`Your preferred rhyme types: ${rhymeTypes.join(', ')}`)
  }
  if (rhymePatterns?.length) {
    parts.push(`Your preferred rhyme patterns: ${rhymePatterns.join(', ')}`)
  }
  if (rhymeDensity !== undefined) {
    const label = rhymeDensity <= 25 ? 'SPARSE' : rhymeDensity <= 50 ? 'MODERATE' : rhymeDensity <= 75 ? 'DENSE' : 'EVERY LINE'
    parts.push(`Your rhyme density preference: ${label}`)
  }
  if (artistDna.sound?.flowStyle) parts.push(`Flow style: ${artistDna.sound.flowStyle}`)

  // Genome essence for voice matching
  if (artistDna.catalog?.genome?.essenceStatement) {
    parts.push(`Your writing DNA: ${artistDna.catalog.genome.essenceStatement}`)
  }

  // Lexicon for voice authenticity
  if (artistDna.lexicon?.signaturePhrases?.length) {
    parts.push(`Your signature phrases: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.slang?.length) {
    parts.push(`Your slang: ${artistDna.lexicon.slang.join(', ')}`)
  }

  parts.push('')
  parts.push('For each draft, return:')
  parts.push('- "vibe": 1-2 sentence gut reaction IN YOUR VOICE (first person, how you actually talk)')
  parts.push('- "score": 1-10 overall quality')
  parts.push('- "rhymeScore": 1-10 how well it follows YOUR rhyme style')
  parts.push('- "lineNotes": array of {lineNumber, note, suggestion} for lines that need work. lineNumber is 1-indexed. Only include lines that actually need feedback.')
  parts.push('- "wouldKeep": boolean, would YOU actually record this?')
  parts.push('')
  parts.push('Then rank all 4 from best to worst.')
  parts.push('')
  parts.push('Return ONLY valid JSON in this exact format:')
  parts.push('{')
  parts.push('  "judgments": [')
  parts.push('    {"draftIndex": 0, "vibe": "...", "score": 7, "rhymeScore": 8, "lineNotes": [{"lineNumber": 3, "note": "...", "suggestion": "..."}], "wouldKeep": true},')
  parts.push('    ...')
  parts.push('  ],')
  parts.push('  "ranking": [2, 0, 3, 1],')
  parts.push('  "rankingReason": "..."')
  parts.push('}')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const deductResult = await creditsService.deductCredits(auth.user.id, 'artist-judge', {
      generationType: 'text',
      description: 'Artist judge: draft review',
      overrideAmount: JUDGE_COST_CENTS,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: 'Insufficient credits', ...deductResult }, { status: 402 })
    }

    const body = await request.json() as JudgeDraftsBody

    if (!body.drafts?.length || !body.sectionType || !body.artistDna) {
      return NextResponse.json({ error: 'drafts, sectionType, and artistDna are required' }, { status: 400 })
    }

    const systemPrompt = buildJudgePrompt(body)

    // Format drafts for the user message
    const draftsText = body.drafts.map((d, i) =>
      `--- DRAFT ${i} (Option ${d.label}) ---\n${d.content}`
    ).join('\n\n')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist Judge",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Review these ${body.drafts.length} drafts:\n\n${draftsText}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error (judge)', { error })
      return NextResponse.json({ error: 'Judge failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    let result
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse judge JSON', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse judge response' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.api.error('Judge drafts error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
