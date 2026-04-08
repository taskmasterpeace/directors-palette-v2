/**
 * Build Artist From Pins API
 *
 * Used by Door 2 (Build it) and Door 3 (Surprise me).
 * Takes a free-form description + optional structured pins and produces
 * a complete ArtistDNA profile, treating every pin as a hard constraint.
 *
 * Single-pass (no web search needed — there's no real artist to verify).
 *
 * Prompt-building lives in `@/features/music-lab/services/build-from-pins.prompt`
 * so it can be unit-tested without Next.js server imports.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'
import {
  BUILD_FROM_PINS_SYSTEM_PROMPT,
  buildUserPrompt,
  type BuildFromPinsRequest,
} from '@/features/music-lab/services/build-from-pins.prompt'

const GENERATION_MODEL = 'openai/gpt-4.1'
const BUILD_FROM_PINS_COST_CENTS = 15

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = (await request.json()) as BuildFromPinsRequest

    // Require at least one signal: description or at least one pin
    const hasDescription = !!body.description?.trim()
    const hasPin = !!(
      body.pins && Object.values(body.pins).some((v) => {
        if (v == null) return false
        if (typeof v === 'string') return v.trim().length > 0
        if (typeof v === 'object') return Object.values(v).some((sv) => typeof sv === 'string' && sv.trim().length > 0)
        return false
      })
    )
    if (!hasDescription && !hasPin) {
      return NextResponse.json(
        { error: 'At least a description or one pin is required' },
        { status: 400 }
      )
    }

    const { user } = auth

    const deductResult = await creditsService.deductCredits(user.id, 'artist-dna-build', {
      generationType: 'text',
      description: 'Artist DNA build from pins',
      overrideAmount: BUILD_FROM_PINS_COST_CENTS,
      user_email: user.email,
    })

    if (!deductResult.success) {
      return NextResponse.json(
        { error: deductResult.error || 'Insufficient credits' },
        { status: 402 }
      )
    }

    const userPrompt = buildUserPrompt(body)

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Build From Pins",
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: BUILD_FROM_PINS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 5000,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      logger.api.error('build-from-pins generation error', { error })
      return NextResponse.json({ error: 'Failed to build artist profile' }, { status: 500 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    if (!content.trim()) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 500 })
    }

    let dna: Record<string, unknown>
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      dna = JSON.parse(cleaned)
    } catch {
      logger.api.error('build-from-pins parse error', { detail: content.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse artist profile' }, { status: 500 })
    }

    // Ensure required shape
    if (!dna.identity) dna.identity = {}
    if (!dna.sound) dna.sound = {}
    if (!dna.persona) dna.persona = {}
    if (!dna.lexicon) dna.lexicon = {}
    if (!dna.look) dna.look = {}
    if (!dna.catalog) dna.catalog = { entries: [] }
    if (!dna.lowConfidenceFields) dna.lowConfidenceFields = []

    return NextResponse.json({ dna })
  } catch (error) {
    logger.api.error('build-from-pins error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
