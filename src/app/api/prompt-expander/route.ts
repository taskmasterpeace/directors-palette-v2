/**
 * Prompt Expander API
 *
 * Expands prompts with cinematographic detail using GPT-4o-mini via OpenRouter.
 * Preserves user's original text as the core while adding visual modifiers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

const MODEL = 'openai/gpt-4o-mini'

const SYSTEM_PROMPT = `You are a prompt expansion specialist for AI image generation.

TASK: Expand the user's prompt while preserving their exact words as the core.

RULES:
1. User's original text MUST appear verbatim in output (this is the "seed")
2. ADD descriptive modifiers around their text
3. Use structured format: [Cinematography], [USER'S CORE], [Atmosphere/Style]
4. Use comma-separated descriptors, natural language
5. Do NOT change, rephrase, or remove any of the user's original words

LEVEL 2x (Enhanced) - Add around user's text:
- Shot framing (close-up, medium shot, wide establishing shot)
- Camera angle (eye-level, low angle, high angle, dutch angle)
- Key lighting direction (soft natural light, dramatic side lighting)

LEVEL 3x (Cinematic) - Add all of 2x plus:
- Color palette (warm golden tones, cool blue tones, muted earth tones)
- Atmosphere (hazy morning light, crisp clarity, moody shadows)
- Lens characteristics (shallow depth of field, anamorphic bokeh)
- Film texture (subtle film grain, cinematic color grading)

DIRECTOR STYLES (if specified, use THEIR visual vocabulary):
- ryan: intimate framing, close-up, warm golden lighting, subjective POV, earned vulnerability
- clint: minimal composition, detached wide shot, cool desaturated tones, static, observational
- david: symmetric framing, visual compression, controlled dread, precise locked camera
- wes: center-framed tableaux, pastel curated palette, deadpan, whimsical symmetry
- hype: fisheye distortion, extreme heroic angles, high-contrast shine, frantic energy

OUTPUT: Return ONLY the expanded prompt text, nothing else. No explanations, no JSON, just the prompt.`

interface ExpandRequest {
    prompt: string
    level: '2x' | '3x'
    director?: 'ryan' | 'clint' | 'david' | 'wes' | 'hype' | 'none'
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

        const body: ExpandRequest = await request.json()
        const { prompt, level, director } = body

        if (!prompt) {
            return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
        }

        if (!level || !['2x', '3x'].includes(level)) {
            return NextResponse.json({ error: 'Invalid level. Use "2x" or "3x"' }, { status: 400 })
        }

        // Build the user message
        let userMessage = `Expand this prompt to LEVEL ${level}:\n\n"${prompt}"`

        if (director && director !== 'none') {
            userMessage += `\n\nUse the visual style of director: ${director}`
        }

        // Call OpenRouter with GPT-4o-mini
        const openRouterStart = Date.now()
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette Prompt Expander'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.3, // Slightly higher for creative variation
                max_tokens: 300
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

            return NextResponse.json({ error: 'Expansion failed' }, { status: 500 })
        }

        // Log OpenRouter success
        lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
            type: 'integration',
            integration: 'openrouter',
            latency_ms: Date.now() - openRouterStart,
            http_status: 200,
            model: MODEL,
            prompt_length: prompt.length,
            user_id: userId,
            user_email: userEmail,
        })

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return NextResponse.json({ error: 'No response from model' }, { status: 500 })
        }

        // Clean up the response (remove any quotes or extra whitespace)
        const expanded = content
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .trim()

        // Log prompt expansion success
        lognog.info('prompt_expanded', {
            type: 'business',
            event: 'prompt_expanded',
            user_id: userId,
            user_email: userEmail,
            detail_level: level,
            director_style: director || 'none',
            original_prompt_length: prompt.length,
            expanded_prompt_length: expanded.length,
        })

        lognog.info(`POST /api/prompt-expander 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/prompt-expander',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
            user_id: userId,
            user_email: userEmail,
            integration: 'openrouter',
            model: MODEL,
        })

        return NextResponse.json({
            original: prompt,
            expanded,
            level,
            director: director || 'none'
        })
    } catch (error) {
        console.error('Prompt expansion error:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        lognog.error(errorMessage, {
            type: 'error',
            route: '/api/prompt-expander',
            user_id: userId,
            user_email: userEmail,
        })

        lognog.info(`POST /api/prompt-expander 500 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/prompt-expander',
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
