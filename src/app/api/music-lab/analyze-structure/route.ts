/**
 * Music Lab Section Detection API
 * 
 * Uses LLM to analyze lyrics and detect song sections (chorus, verse, bridge, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface TranscriptionSegment {
    text: string
    start: number
    end: number
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { lyrics, segments } = await request.json() as {
            lyrics: string
            segments: TranscriptionSegment[]
        }

        if (!lyrics) {
            return NextResponse.json({ error: 'No lyrics provided' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        // Build prompt with timestamps
        const lyricsWithTimestamps = segments
            .map(seg => `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}`)
            .join('\n')

        const systemPrompt = `You are a music analyst. Analyze the following song lyrics with timestamps and identify the song sections.

For each section, determine:
- type: one of "intro", "verse", "pre-chorus", "chorus", "post-chorus", "bridge", "breakdown", "outro"
- startTime: start timestamp in seconds
- endTime: end timestamp in seconds  
- lyrics: the lyrics in that section

Look for patterns like:
- Repeated lyrics = likely chorus
- Narrative/story = likely verse
- Transitional shorter sections = pre-chorus or bridge
- Instrumental or minimal lyrics at start = intro
- Fade out or ending = outro

Return ONLY valid JSON array, no markdown, no explanation.`

        const userPrompt = `Analyze these lyrics and return sections as JSON array:

${lyricsWithTimestamps}

Return format:
[
  {"type": "intro", "startTime": 0, "endTime": 15, "lyrics": "..."},
  {"type": "verse", "startTime": 15, "endTime": 45, "lyrics": "..."},
  ...
]`

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://directors-palette.app',
                'X-Title': 'Directors Palette Music Lab'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            const error = await response.text()
            logger.api.error('OpenRouter error', { error })
            return NextResponse.json({ error: 'LLM analysis failed' }, { status: 500 })
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || '[]'

        // Parse the JSON response
        let sections
        try {
            // Clean up potential markdown wrapping
            const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            sections = JSON.parse(cleaned)
        } catch {
            logger.api.error('Failed to parse LLM response', { detail: content })
            return NextResponse.json({ error: 'Failed to parse section analysis' }, { status: 500 })
        }

        // Add IDs to each section
        const sectionsWithIds = sections.map((section: { type?: string; startTime?: number; endTime?: number; lyrics?: string }, index: number) => ({
            id: `section-${index}`,
            type: section.type || 'verse',
            startTime: section.startTime || 0,
            endTime: section.endTime || 0,
            lyrics: section.lyrics || '',
            customName: undefined
        }))

        return NextResponse.json({ sections: sectionsWithIds })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.api.error('Section detection error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: `Section detection failed: ${message}` }, { status: 500 })
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
