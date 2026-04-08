/**
 * Build Artist From Pins API
 *
 * Used by Door 2 (Build it) and Door 3 (Surprise me).
 * Takes a free-form description + optional structured pins and produces
 * a complete ArtistDNA profile, treating every pin as a hard constraint.
 *
 * Single-pass (no web search needed — there's no real artist to verify).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

const GENERATION_MODEL = 'openai/gpt-4.1'
const BUILD_FROM_PINS_COST_CENTS = 15

interface Pins {
  genre?: { base?: string; sub?: string; micro?: string }
  region?: { city?: string; state?: string; country?: string }
  ethnicity?: string
  gender?: string
  vocalStyle?: string
  signatureLook?: string
  vibe?: string
  era?: string
  language?: string
  stageName?: string
}

interface BuildFromPinsRequest {
  description?: string
  pins?: Pins
}

const BASE_PROMPT = `You are inventing a fictional music artist from scratch. Given a free-form description and/or a set of hard-constraint pins, create a complete artist DNA profile. Fill every field with rich, specific, coherent details that respect every pin as an absolute requirement.

ABSOLUTE RULE: Every pin the user provides is a HARD CONSTRAINT. If they pin genre="Trap", the artist must be a trap artist. If they pin region="Houston, TX", the artist must be from Houston. If they pin stageName="Lil Stardust", the stage name is Lil Stardust. Do not override, reinterpret, or ignore any pin.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "fictional stage name (use the pinned one if provided)",
    "realName": "invented birth name",
    "ethnicity": "ethnic background (use the pinned one if provided)",
    "city": "city they grew up in (use the pinned one if provided)",
    "state": "state or region (use the pinned one if provided)",
    "neighborhood": "specific neighborhood within the city above",
    "backstory": "3-4 sentence invented origin story",
    "significantEvents": ["5-7 fictional career milestones with years"]
  },
  "sound": {
    "genres": ["2-4 primary genres, using pinned genre as the primary"],
    "subgenres": ["3-5 specific subgenres"],
    "microgenres": ["1-2 niche microgenres if applicable"],
    "genreEvolution": [],
    "vocalTextures": ["exactly 5 descriptive vocal qualities, each 2-4 words"],
    "flowStyle": "1-2 sentence description of their rap flow or singing phrasing",
    "productionPreferences": ["5-6 production elements they favor"],
    "keyCollaborators": ["4-6 fictional collaborators"],
    "artistInfluences": ["5-6 influences (can be real artists)"],
    "melodyBias": 50,
    "language": "primary language (use the pinned one if provided)",
    "secondaryLanguages": [],
    "soundDescription": "3-4 sentences painting their sonic identity"
  },
  "persona": {
    "traits": ["5-6 personality traits, 1-2 words each"],
    "likes": ["4-5 things they care about"],
    "dislikes": ["3-4 things they oppose"],
    "attitude": "6-10 word encapsulation (should reflect pinned vibe if provided)",
    "worldview": "3-4 sentences about their philosophy"
  },
  "lexicon": {
    "signaturePhrases": ["4-6 invented catchphrases"],
    "slang": ["4-6 slang terms or invented words"],
    "bannedWords": [],
    "adLibs": ["2-4 invented ad-libs, or empty array"]
  },
  "look": {
    "skinTone": "descriptive skin tone (must match pinned ethnicity)",
    "hairStyle": "signature hairstyle (use pinned look hint if provided)",
    "fashionStyle": "fashion aesthetic in 5-10 words",
    "jewelry": "signature jewelry (4-8 words or 'minimal')",
    "tattoos": "tattoo style (5-10 words or 'none')",
    "visualDescription": "3-4 sentences about their visual presence",
    "portraitUrl": "",
    "characterSheetUrl": ""
  },
  "catalog": {
    "entries": []
  },
  "lowConfidenceFields": []
}

RULES:
- Everything is invented — do not use a real artist's identity.
- Every pin is non-negotiable. If the user pins stageName, that's the stage name.
- melodyBias: 0-10=pure rapper, 30-45=rap-dominant melodic, 50-60=hybrid, 65-75=sing-rap, 80-90=primarily singer, 95-100=pure singer. Pick a value that matches the pinned genre and vocal style.
- Leave portraitUrl, characterSheetUrl, bannedWords, genreEvolution, catalog.entries, lowConfidenceFields empty/default — the user fills these later.
- vocalTextures must be EXACTLY 5 entries.
- The description field (if provided) is additional free-form guidance — weave it in alongside the pins.`

function buildUserPrompt(body: BuildFromPinsRequest): string {
  const parts: string[] = []
  if (body.description?.trim()) {
    parts.push(`User description:\n${body.description.trim()}`)
  }
  if (body.pins) {
    const pinLines: string[] = []
    const p = body.pins
    if (p.genre?.base) {
      const g = [p.genre.base, p.genre.sub, p.genre.micro].filter(Boolean).join(' → ')
      pinLines.push(`- genre: ${g}`)
    }
    if (p.region) {
      const r = [p.region.city, p.region.state, p.region.country].filter(Boolean).join(', ')
      if (r) pinLines.push(`- region: ${r}`)
    }
    if (p.ethnicity) pinLines.push(`- ethnicity: ${p.ethnicity}`)
    if (p.gender) pinLines.push(`- gender/presentation: ${p.gender}`)
    if (p.vocalStyle) pinLines.push(`- vocal style: ${p.vocalStyle}`)
    if (p.signatureLook) pinLines.push(`- signature look: ${p.signatureLook}`)
    if (p.vibe) pinLines.push(`- vibe/energy: ${p.vibe}`)
    if (p.era) pinLines.push(`- era/time period: ${p.era}`)
    if (p.language) pinLines.push(`- language: ${p.language}`)
    if (p.stageName) pinLines.push(`- stage name: ${p.stageName} (USE THIS EXACT NAME)`)
    if (pinLines.length) parts.push(`Hard-constraint pins (every one of these is non-negotiable):\n${pinLines.join('\n')}`)
  }
  if (parts.length === 0) {
    parts.push('No description or pins provided — invent a completely random, coherent artist.')
  }
  return parts.join('\n\n')
}

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
          { role: 'system', content: BASE_PROMPT },
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
