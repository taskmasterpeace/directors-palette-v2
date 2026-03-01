/**
 * Sound Studio Suggest API Route
 * AI assistant suggests improvements to current instrumental settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { currentSettings, userMessage, artistDna } = await request.json()

    if (!currentSettings || !userMessage) {
      return NextResponse.json({ error: 'currentSettings and userMessage are required' }, { status: 400 })
    }

    const artistContext = artistDna
      ? `The artist is ${artistDna.identity?.stageName || 'unknown'}, known for ${artistDna.sound?.genres?.join(', ') || 'various genres'}.`
      : ''

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Sound Studio Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a music production assistant helping build instrumental beats for Suno AI. ${artistContext}

Current settings: ${JSON.stringify(currentSettings)}

Give concise, actionable suggestions. If suggesting genre/mood/instrument changes, be specific. Keep responses under 150 words. Be conversational and enthusiastic about music.`
          },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Suggestion failed' }, { status: 500 })
    }

    const data = await response.json()
    const suggestion = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ suggestion })
  } catch (error) {
    logger.api.error('Sound studio suggest error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
