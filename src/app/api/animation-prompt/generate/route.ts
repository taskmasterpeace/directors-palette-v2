/**
 * Animation Prompt Generator API
 *
 * Uses GPT-4o-mini vision to analyze an image AND its original prompt
 * to generate natural motion/animation descriptions for video generation.
 *
 * Approach 4: Hybrid Vision + Original Prompt
 * - Sees what was actually generated (image)
 * - Knows the original intent (prompt)
 * - Generates contextually appropriate motion
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

const MODEL = 'openai/gpt-4o-mini'

const SYSTEM_PROMPT = `You are a cinematic motion director. Convert a still image into a short animation direction for a video generation model.

FORMAT: Always lead with the camera move, then subject/environment motion.
Structure: "[Camera movement], [subject action and/or environment motion]"

CAMERA MOVES (pick one):
slow push-in, gentle pull-out, slow pan left/right, tracking shot, crane up/down, dolly forward, orbital drift, locked static frame, slow zoom, handheld drift

SUBJECT MOTION (pick 0-1):
breathing, hair/cloth moving, walking, turning, gesturing, blinking, subtle body sway

ENVIRONMENT MOTION (pick 0-1):
wind in foliage, drifting clouds, flowing water, flickering light, floating particles, shifting shadows

RULES:
1. CAMERA FIRST — the camera instruction must be the first thing in your output
2. One sentence only, under 30 words
3. Present tense, active voice
4. NEVER describe what is in the image (no "a warrior on a cliff" or "a city at night")
5. ONLY describe how things MOVE — camera, subject, environment
6. Match the energy of the scene — still/contemplative scenes get subtle motion, action scenes get dynamic motion
7. If director camera direction is provided, use THAT specific camera movement

GOOD:
- "Slow push-in, subject's cape ripples in the wind"
- "Locked static frame, leaves drift across the foreground"
- "Gentle pan right, clouds move slowly overhead"
- "Tracking shot follows subject walking forward, dust rises from footsteps"

BAD (never do this):
- "A warrior stands on a cliff at sunset, the sky is beautiful" (describes the scene, not motion)
- "The character is wearing armor and looking at the horizon" (describes contents)
- "Beautiful cinematic shot of the landscape" (no motion instruction)

OUTPUT: Return ONLY the animation direction. No quotes, no explanation.`

interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt: string
    storyContext?: string
    directorMotion?: string
}

export async function POST(request: NextRequest) {
    const apiStart = Date.now()
    let userId: string | undefined
    let userEmail: string | undefined

    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth
        userId = auth.user.id
        userEmail = auth.user.email

        const body: AnimationPromptRequest = await request.json()
        const { imageUrl, originalPrompt, storyContext, directorMotion } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
        }

        if (!originalPrompt) {
            return NextResponse.json({ error: 'No original prompt provided' }, { status: 400 })
        }

        // Build the user message with image, text context, and optional story/director info
        let userMessage = `Original prompt used to generate this image:
"${originalPrompt}"`

        if (storyContext) {
            userMessage += `\n\nStory context (what's happening in this scene):
"${storyContext}"`
        }

        if (directorMotion) {
            userMessage += `\n\nDirector's camera direction for this shot:
"${directorMotion}"`
        }

        userMessage += '\n\nAnalyze the image and create an animation direction that feels natural for this scene.'
        if (storyContext) {
            userMessage += ' Incorporate the story action described above.'
        }
        if (directorMotion) {
            userMessage += ' Use the director\'s camera style as your primary camera movement guide.'
        }

        // Call OpenRouter with GPT-4o-mini vision
        const openRouterStart = Date.now()
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette Animation Prompt'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userMessage
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                    detail: 'low' // Use low detail for faster/cheaper processing
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.4, // Slightly creative but consistent
                max_tokens: 150  // Animation prompts should be short
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)

            lognog.warn(`openrouter FAIL ${Date.now() - openRouterStart}ms`, {
                type: 'integration',
                integration: 'openrouter',
                latency_ms: Date.now() - openRouterStart,
                http_status: response.status,
                model: MODEL,
                error,
                user_id: userId,
                user_email: userEmail,
            })

            return NextResponse.json({ error: 'Animation prompt generation failed' }, { status: 500 })
        }

        // Log OpenRouter success
        lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
            type: 'integration',
            integration: 'openrouter',
            latency_ms: Date.now() - openRouterStart,
            http_status: 200,
            model: MODEL,
            user_id: userId,
            user_email: userEmail,
        })

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return NextResponse.json({ error: 'No response from model' }, { status: 500 })
        }

        // Clean up the response
        const animationPrompt = content
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .trim()

        // Log success
        lognog.info('animation_prompt_generated', {
            type: 'business',
            event: 'animation_prompt_generated',
            user_id: userId,
            user_email: userEmail,
            original_prompt_length: originalPrompt.length,
            animation_prompt_length: animationPrompt.length,
        })

        lognog.info(`POST /api/animation-prompt/generate 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/animation-prompt/generate',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
            user_id: userId,
            user_email: userEmail,
            integration: 'openrouter',
            model: MODEL,
        })

        return NextResponse.json({
            animationPrompt,
            originalPrompt,
            imageUrl
        })
    } catch (error) {
        console.error('Animation prompt generation error:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        lognog.error(errorMessage, {
            type: 'error',
            route: '/api/animation-prompt/generate',
            user_id: userId,
            user_email: userEmail,
        })

        lognog.info(`POST /api/animation-prompt/generate 500 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/animation-prompt/generate',
            method: 'POST',
            status_code: 500,
            duration_ms: Date.now() - apiStart,
            user_id: userId,
            user_email: userEmail,
            error: errorMessage,
        })

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
