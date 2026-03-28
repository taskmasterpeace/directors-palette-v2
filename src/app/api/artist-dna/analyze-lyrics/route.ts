/**
 * Analyze Lyrics API
 * Detects song sections (intro, verse, hook, bridge, outro) from pasted lyrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

interface AnalyzeLyricsBody {
  lyrics: string
  artistName?: string
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body: AnalyzeLyricsBody = await request.json()
    const { lyrics, artistName } = body

    if (!lyrics || lyrics.trim().length === 0) {
      return NextResponse.json({ error: 'Lyrics are required' }, { status: 400 })
    }

    const systemPrompt = `You are a music structure analyst. Analyze the following song lyrics and break them into sections.

Rules:
- Allowed section types: intro, verse, pre-chorus, hook, chorus, post-chorus, bridge, interlude, break, drop, build, instrumental, outro
- Repeated choruses/refrains should be labeled "hook" or "chorus"
- Number verses sequentially (Verse 1, Verse 2, etc.)
- Number hooks if there are multiple (Hook, Hook 2, etc.) — but if the same chorus repeats, just call each one "Hook"
- Look for structural cues: short opening lines = intro, repeated lines = hook/chorus, narrative progression = verse, rising energy before chorus = pre-chorus, tonal shift = bridge, closing/fade = outro
${artistName ? `- The artist is "${artistName}" — use knowledge of their style to inform section detection` : ''}

Return ONLY a JSON array. No markdown, no code fences, no explanation.
Each element: {"type": "intro"|"verse"|"pre-chorus"|"hook"|"chorus"|"post-chorus"|"bridge"|"interlude"|"break"|"drop"|"build"|"instrumental"|"outro", "label": "Verse 1", "lines": ["line 1", "line 2"]}

Analyze these lyrics:`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://directorspalette.com',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lyrics },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.api.error('OpenRouter analyze-lyrics failed', { status: response.status, error: errorText })
      return NextResponse.json({ error: 'Analysis failed' }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'No analysis returned' }, { status: 502 })
    }

    // Parse JSON — strip markdown fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const sections = JSON.parse(jsonStr)

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid analysis format' }, { status: 502 })
    }

    return NextResponse.json({ sections })
  } catch (error) {
    logger.api.error('analyze-lyrics error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
