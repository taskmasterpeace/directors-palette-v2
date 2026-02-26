/**
 * Prompt Organizer Parse API
 * 
 * Parses prompts using Gemini 2.0 Flash via OpenRouter.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free'

const SYSTEM_PROMPT = `You are a cinematic prompt parser for AI image/video generation. Extract components from the user's prompt into a comprehensive JSON structure.

EXTRACTION RULES:

CINEMATOGRAPHY:
- shotSize: ECU (extreme close-up), BCU (big close-up), CU (close-up), MCU (medium close-up), MS (medium shot), MCS (medium cowboy shot), KNEE (knee shot), MWS (medium wide), FS (full shot), WS (wide shot), EWS (extreme wide), EST (establishing)
- cameraAngle: eye-level, low-angle, high-angle, worms-eye, birds-eye, overhead, hip-level, dutch-angle
- subjectFacing: frontal, three-quarter, profile, three-quarter-back, from-behind
- shotType: single, two-shot, group-shot, over-shoulder, reaction, insert, pov
- framing: centered, rule-of-thirds, symmetrical, asymmetrical, leading-lines, frame-within-frame, negative-space, tight-framing

CONTENT:
- subject.reference: @tags like @marcus, @sarah
- subject.description: who/what the subject is (man, woman, person, child, group, etc.)
- subject.emotion: emotional state (contemplative, joyful, intense, determined, etc.)
- action: what they're DOING - standing, sitting, lying-down, leaning, crouching, kneeling, walking, running, jumping, climbing, falling, talking, listening, looking-at, reaching, holding, pointing, crying, laughing, screaming, thinking, fighting, dancing, embracing, kissing
- foreground: elements in front (out-of-focus-elements, foliage, silhouettes, glass, particles, smoke)
- background: setting/location (urban-city, nature, interior, studio, abstract, blurred) + description
- shotPurpose: moment, establishing, transition, broll, reaction, insert

VISUAL LOOK:
- lensEffect: sharp, soft-focus, anamorphic, vintage-lens, tilt-shift, macro, fisheye, telephoto-compression
- depthOfField: shallow-dof, deep-focus, rack-focus, split-diopter, bokeh
- lighting: natural, golden-hour, overcast, night, rembrandt, dramatic, soft, hard, rim-light + description
- colorGrade: neutral, warm, cool, desaturated, vibrant, teal-orange, monochromatic, cross-processed, bleach-bypass
- filmGrain: none, fine-grain, medium-grain, heavy-grain, 35mm, 16mm, 8mm

MOTION (for video only):
- cameraMovement: static, pan-left, pan-right, tilt-up, tilt-down, dolly-in, dolly-out, tracking-left, tracking-right, crane-up, crane-down, zoom-in, zoom-out, handheld, steadicam, orbit, push-in, pull-back
- movementIntensity: subtle, gentle, moderate, dynamic, aggressive
- subjectMotion: static, slight-movement, walking, running, gesturing, turning, dancing, fighting

STYLE & OTHER:
- stylePrefix: cinematic, photorealistic, dramatic, etc.
- styleSuffix: additional style modifiers
- wardrobe: clothing/outfit descriptions
- additional: anything else not categorized

OUTPUT FORMAT (JSON only, no markdown):
{
  "shotSize": "value or null",
  "cameraAngle": "value or null",
  "subjectFacing": "value or null",
  "shotType": "value or null",
  "framing": "value or null",
  "subject": {
    "reference": "@tag or null",
    "description": "subject description",
    "emotion": "emotional state or null"
  },
  "action": "what subject is doing or null",
  "foreground": "foreground elements or null",
  "background": "background/location or null",
  "shotPurpose": "value or null",
  "lensEffect": "value or null",
  "depthOfField": "value or null",
  "lighting": "lighting description or null",
  "colorGrade": "value or null",
  "filmGrain": "value or null",
  "cameraMovement": "value or null",
  "movementIntensity": "value or null",
  "subjectMotion": "value or null",
  "stylePrefix": "value or null",
  "styleSuffix": "value or null",
  "wardrobe": "clothing description or null",
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
            logger.api.error('OpenRouter error', { error })
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
            logger.api.error('JSON parse error', { error: parseError instanceof Error ? parseError.message : String(parseError), Content: 'Content:', content: content })
            return NextResponse.json({ error: 'Invalid JSON response' }, { status: 500 })
        }
    } catch (error) {
        logger.api.error('Prompt parse error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
