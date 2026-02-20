/**
 * Artist DNA Suggestion API
 * Magic wand suggestions via OpenRouter gpt-4.1-mini
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const MODEL = 'openai/gpt-4.1-mini'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { field, section, currentValue, context, exclude } = await request.json()

    if (!field || !section) {
      return NextResponse.json({ error: 'field and section are required' }, { status: 400 })
    }

    // Build context from existing DNA fields
    const contextParts: string[] = []
    if (context?.identity?.name) contextParts.push(`Artist: ${context.identity.name}`)
    if (context?.identity?.city) contextParts.push(`From: ${context.identity.city}`)
    if (context?.sound?.genres?.length) contextParts.push(`Genres: ${context.sound.genres.join(', ')}`)
    if (context?.persona?.attitude) contextParts.push(`Attitude: ${context.persona.attitude}`)
    if (context?.persona?.traits?.length) contextParts.push(`Traits: ${context.persona.traits.join(', ')}`)

    const contextStr = contextParts.length > 0
      ? `\n\nArtist context:\n${contextParts.join('\n')}`
      : ''

    const excludeStr = exclude?.length
      ? `\n\nDo NOT suggest any of these (already used): ${exclude.join(', ')}`
      : ''

    const currentStr = currentValue
      ? `\n\nCurrent value: "${currentValue}"`
      : ''

    const systemPrompt = `You are a music industry creative consultant. Generate 10 unique, creative suggestions for an artist profile field.
Return ONLY a JSON array of 10 strings, no other text.
Be specific, authentic, and avoid generic/cliché suggestions.${contextStr}${currentStr}${excludeStr}`

    const userPrompt = `Generate 10 suggestions for the "${field}" field in the "${section}" section of a music artist profile.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Suggestions",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Suggestion generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const suggestions = JSON.parse(cleaned)
      return NextResponse.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] })
    } catch {
      console.error('Failed to parse suggestions:', content)
      return NextResponse.json({ suggestions: [] })
    }
  } catch (error) {
    console.error('Suggestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
