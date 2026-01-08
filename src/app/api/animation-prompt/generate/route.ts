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

const SYSTEM_PROMPT = `You are a cinematic motion director. Given an image and its original generation prompt, create a brief animation direction.

TASK: Describe natural, subtle motion that brings this still image to life.

MOTION CATEGORIES (pick 1-2 that fit best):
- Camera: slow pan, gentle zoom, drift, push in, pull out
- Subject: breathing, blinking, subtle movement, gesture
- Environment: wind, flowing water, drifting clouds, floating particles
- Atmosphere: light shifts, shadows moving, flickering, haze

RULES:
1. Be BRIEF - 1-2 sentences max
2. Match the mood of the original image/prompt
3. Prefer subtle, natural motion over dramatic action
4. Don't describe what's IN the image - focus ONLY on how it should MOVE
5. Use present tense, active voice

EXAMPLES:
- "Gentle camera push-in, subject's hair moves slightly in the breeze"
- "Slow pan right, clouds drift lazily across the sky"
- "Subject breathes softly, candlelight flickers in background"
- "Camera slowly zooms out, dust particles float in the light beams"

OUTPUT: Return ONLY the animation direction. No explanations, no quotes, just the motion description.`

interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt: string
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
        const { imageUrl, originalPrompt } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
        }

        if (!originalPrompt) {
            return NextResponse.json({ error: 'No original prompt provided' }, { status: 400 })
        }

        // Build the user message with both image and text context
        const userMessage = `Original prompt used to generate this image:
"${originalPrompt}"

Analyze the image and create an animation direction that feels natural for this scene.`

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
