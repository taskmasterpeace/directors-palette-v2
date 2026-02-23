/**
 * Suggest Concepts API
 * Suggests song concepts based on artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1-mini'

interface SuggestConceptsBody {
  artistDna: ArtistDNA
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistDna } = await request.json() as SuggestConceptsBody

    if (!artistDna) {
      return NextResponse.json({ error: 'artistDna is required' }, { status: 400 })
    }

    const parts: string[] = []
    parts.push('Suggest 6 unique song concept ideas for this artist. Each concept should be 1-2 sentences.')
    parts.push('Return ONLY a JSON array of strings. No markdown, no explanation.')

    const artistName = artistDna.identity?.stageName || artistDna.identity?.realName
    if (artistName) {
      parts.push(`Artist: ${artistName}`)
    }
    if (artistDna.identity?.city) {
      parts.push(`From: ${artistDna.identity.city}`)
    }
    if (artistDna.persona?.attitude) {
      parts.push(`Attitude: ${artistDna.persona.attitude}`)
    }
    if (artistDna.persona?.worldview) {
      parts.push(`Worldview: ${artistDna.persona.worldview}`)
    }
    if (artistDna.persona?.traits?.length > 0) {
      parts.push(`Traits: ${artistDna.persona.traits.join(', ')}`)
    }
    if (artistDna.sound?.genres?.length > 0) {
      parts.push(`Genres: ${artistDna.sound.genres.join(', ')}`)
    }

    // Avoid repeating catalog themes
    if (artistDna.catalog?.entries?.length > 0) {
      const existingThemes = artistDna.catalog.entries.map((e) => e.title).join(', ')
      parts.push(`Avoid themes already in catalog: ${existingThemes}`)
    }

    parts.push('Mix personal stories, social commentary, aspirational themes, and emotional depth.')
    parts.push('Be specific and vivid, not generic.')

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
          { role: 'system', content: parts.join('\n') },
          { role: 'user', content: 'Suggest 6 song concepts.' },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
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
      console.error('Failed to parse concepts JSON:', raw.substring(0, 300))
      return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 })
    }

    return NextResponse.json({ concepts })
  } catch (error) {
    console.error('Suggest concepts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
