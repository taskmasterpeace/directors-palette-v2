/**
 * Director Proposal Generation API
 * 
 * Uses Gemini 2.0 Flash via OpenRouter for full context proposal generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { directorId, directorName, prompt } = await request.json()

        if (!prompt) {
            return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
        }

        // Call OpenRouter with Gemini 2.0 Flash
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette - Proposal Generation'
            },
            body: JSON.stringify({
                model: GEMINI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a creative music video director. Generate proposals in JSON format only, no markdown. Be specific and creative while staying true to your director style.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7, // Higher for creative output
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)
            return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return NextResponse.json({ error: 'No response from model' }, { status: 500 })
        }

        // Parse the JSON response
        try {
            // Clean up the response (remove markdown code blocks if present)
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const proposal = JSON.parse(cleanContent)

            return NextResponse.json({
                ...proposal,
                directorId,
                directorName
            })
        } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Content:', content)
            return NextResponse.json({
                error: 'Invalid JSON response',
                raw: content
            }, { status: 500 })
        }
    } catch (error) {
        console.error('Proposal generation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
