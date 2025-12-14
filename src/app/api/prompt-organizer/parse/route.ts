/**
 * Prompt Organizer Parse API
 * 
 * Parses prompts using Gemini 2.0 Flash via OpenRouter.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free'

const SYSTEM_PROMPT = `You are a prompt parser for AI image generation. Extract components from the user's prompt into JSON.

RULES:
1. Identify @references (e.g., @marcus, @sarah) - these are character tags
2. Extract wardrobe/clothing descriptions
3. Extract location/setting descriptions  
4. Extract lighting descriptions (golden hour, dramatic lighting, etc.)
5. Extract framing terms (close-up, wide shot, medium shot, etc.)
6. Extract camera angles (low angle, high angle, dutch angle, etc.)
7. Extract camera movement for video (dolly, pan, tracking, etc.) - null for stills
8. Extract emotional state (contemplative, joyful, intense, etc.)
9. Put anything else in "additional"

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject": {
    "reference": "@tag or null",
    "description": "subject description without the @tag",
    "emotion": "emotional state or null"
  },
  "wardrobe": "clothing description or null",
  "location": "setting description or null", 
  "lighting": "lighting description or null",
  "framing": "shot framing or null",
  "angle": "camera angle or null",
  "cameraMovement": null,
  "additional": "other details or null"
}`

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { prompt } = await request.json()

        if (!prompt) {
            return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
        }

        // Call OpenRouter with Gemini 2.0 Flash (free)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette Prompt Organizer'
            },
            body: JSON.stringify({
                model: GEMINI_MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Parse this prompt:\n\n${prompt}` }
                ],
                temperature: 0.1, // Low temperature for consistent parsing
                max_tokens: 500
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)
            return NextResponse.json({ error: 'Parse failed' }, { status: 500 })
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

            const structured = JSON.parse(cleanContent)

            return NextResponse.json({
                structured,
                confidence: 0.85
            })
        } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Content:', content)
            return NextResponse.json({ error: 'Invalid JSON response' }, { status: 500 })
        }
    } catch (error) {
        console.error('Prompt parse error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
