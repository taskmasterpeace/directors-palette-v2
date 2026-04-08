/**
 * Suggest Rename API
 *
 * Used by Door 1 review screen to offer 3 fictional stage name
 * alternatives in the same vibe as the seeded real artist.
 * Not charged (single cheap call).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

interface SuggestRenameRequest {
  realName: string
  genres?: string[]
  city?: string
  vibe?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = (await request.json()) as SuggestRenameRequest
    if (!body.realName?.trim()) {
      return NextResponse.json({ error: 'realName is required' }, { status: 400 })
    }

    const context = [
      `real artist: ${body.realName}`,
      body.genres?.length ? `genres: ${body.genres.join(', ')}` : null,
      body.city ? `city: ${body.city}` : null,
      body.vibe ? `vibe: ${body.vibe}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const systemPrompt = `You invent fictional stage names for music artists. Given a real artist the user is drawing inspiration from, return 3 fictional alternative stage names in the same sonic/cultural vibe. Do not reuse the real name or any part of it. Each name should feel like a real artist name — memorable, on-vibe, not corny.

Return ONLY a JSON object: {"alternatives": ["Name 1", "Name 2", "Name 3"]}`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Suggest Rename",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.9,
        max_tokens: 200,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ alternatives: [] })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      const alts = Array.isArray(parsed.alternatives)
        ? parsed.alternatives.filter((a: unknown) => typeof a === 'string').slice(0, 3)
        : []
      return NextResponse.json({ alternatives: alts })
    } catch {
      return NextResponse.json({ alternatives: [] })
    }
  } catch (error) {
    logger.api.error('suggest-rename error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ alternatives: [] })
  }
}
