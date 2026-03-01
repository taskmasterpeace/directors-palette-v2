/**
 * Web Research API Route
 * Artist researches topics they care about via Perplexity Sonar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'perplexity/sonar-pro'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistId, personalityPrint, topic } = await request.json()

    if (!artistId || !topic) {
      return NextResponse.json({ error: 'artistId and topic are required' }, { status: 400 })
    }

    const expertise = personalityPrint?.knowledge?.expertise?.join(', ') || 'music'
    const topicPrefs = personalityPrint?.conversationStyle?.topicPreferences?.join(', ') || ''

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Web Research",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are researching topics for a music artist with expertise in: ${expertise}. Their interests include: ${topicPrefs}. Find recent, relevant content about the requested topic. Return ONLY valid JSON array (no markdown, no code fences):
[{"title": "Article title", "url": "https://...", "summary": "2-sentence summary", "source": "domain.com"}]
Return 3-5 results. Focus on quality, relevance, and recency.`
          },
          {
            role: 'user',
            content: `Research: ${topic}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('Web research failed', { error })
      return NextResponse.json({ error: 'Web research failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()

    let results
    try {
      results = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse web research', { detail: raw.substring(0, 500) })
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({ results: Array.isArray(results) ? results : [] })
  } catch (error) {
    logger.api.error('Web research error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
