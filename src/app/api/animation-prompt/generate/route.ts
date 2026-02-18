/**
 * Animation Prompt Generator API
 *
 * Uses Gemini 2.0 Flash (free, vision-capable) to analyze an image
 * and generate natural motion/animation descriptions for video generation.
 *
 * Supports two modes:
 * - generate: Create a new prompt from image analysis (empty prompt box)
 * - enhance: Refine existing user-written text (has text in prompt box)
 *
 * Supports two prompt styles per model type:
 * - specific: Short, camera-first prompts for WAN/Kling models
 * - reasoning: Longer, directorial prompts for Seedance models
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

const PRIMARY_MODEL = 'google/gemini-2.0-flash-exp:free'
const FALLBACK_MODEL = 'google/gemini-2.0-flash-001'

// --- 4 System Prompts: [generate|enhance] × [specific|reasoning] ---

const SYSTEM_GENERATE_SPECIFIC = `You are a cinematic motion director. Given an image (and optionally its original generation prompt), write a short animation direction for a video generation model.

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
4. NEVER describe what is in the image — ONLY describe how things MOVE
5. Match the energy of the scene
6. If director camera direction is provided, use THAT specific camera movement

OUTPUT: Return ONLY the animation direction. No quotes, no explanation.`

const SYSTEM_GENERATE_REASONING = `You are a cinematic motion director creating animation directions for a reasoning-capable video model (like Seedance). Given an image (and optionally its original generation prompt), write a rich directorial animation prompt.

FORMAT: Subject + Action + Camera + Scene atmosphere
Structure: "[Subject does action], [camera movement], [atmosphere/environment detail]"

RULES:
1. 30-80 words — this model benefits from more detail
2. Describe the subject's ACTION first, then camera, then scene atmosphere
3. Present tense, active voice
4. Include character emotion or physical movement where visible
5. Add atmospheric details: lighting shifts, weather, environmental particles
6. NEVER just describe what is in the image — describe what HAPPENS next
7. If director camera direction is provided, use THAT specific camera movement

GOOD:
- "The warrior slowly draws their sword, cape billowing in the wind, as the camera tracks forward into a slow push-in. Golden hour light shifts across the cliff face, dust particles drift in the warm air."
- "The figure turns to face the camera with a slight smile, hair catching the breeze, as a gentle orbital drift reveals the cityscape behind them. Neon reflections ripple on wet pavement."

BAD:
- "A warrior on a cliff at sunset" (just describes the scene)
- "Slow push-in, cape ripples" (too short for reasoning model — add atmosphere)

OUTPUT: Return ONLY the animation direction. No quotes, no explanation.`

const SYSTEM_ENHANCE_SPECIFIC = `You are a cinematic motion editor. The user has written an animation prompt for a video generation model. Your job is to REFINE it — fix grammar, add a missing camera move if needed, and make vague descriptions specific.

RULES:
1. Keep it under 30 words
2. CAMERA FIRST — ensure a camera instruction leads the prompt
3. If the user's prompt has no camera move, add one that fits the described action
4. Fix any grammar or awkward phrasing
5. Make vague verbs specific (e.g., "moves" → "walks forward", "goes up" → "crane up")
6. Do NOT add entirely new content the user didn't mention
7. Present tense, active voice

OUTPUT: Return ONLY the refined animation direction. No quotes, no explanation.`

const SYSTEM_ENHANCE_REASONING = `You are a cinematic motion editor. The user has written an animation prompt for a reasoning-capable video model (like Seedance). Your job is to EXPAND it — add atmosphere, cinematic detail, and character action while keeping the user's core intent.

RULES:
1. Expand to 30-80 words
2. Keep the user's described action and camera move as the foundation
3. Add atmospheric details: lighting, weather, particles, environmental motion
4. Add character emotion or physical nuance where it fits
5. Fix grammar or vague descriptions
6. Do NOT contradict or remove what the user wrote — enhance it
7. Present tense, active voice

OUTPUT: Return ONLY the enhanced animation direction. No quotes, no explanation.`

type PromptMode = 'generate' | 'enhance'
type PromptStyle = 'specific' | 'reasoning'

function getSystemPrompt(mode: PromptMode, style: PromptStyle): string {
    if (mode === 'generate' && style === 'specific') return SYSTEM_GENERATE_SPECIFIC
    if (mode === 'generate' && style === 'reasoning') return SYSTEM_GENERATE_REASONING
    if (mode === 'enhance' && style === 'specific') return SYSTEM_ENHANCE_SPECIFIC
    return SYSTEM_ENHANCE_REASONING
}

interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt?: string
    existingPrompt?: string
    mode: PromptMode
    promptStyle?: PromptStyle
    storyContext?: string
    directorMotion?: string
}

async function callOpenRouter(
    model: string,
    systemPrompt: string,
    userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>,
    userId?: string,
    userEmail?: string,
) {
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
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature: 0.4,
            max_tokens: 250
        })
    })

    const latency = Date.now() - openRouterStart

    if (!response.ok) {
        const error = await response.text()
        console.error(`OpenRouter error (${model}):`, error)
        lognog.warn(`openrouter FAIL ${latency}ms`, {
            type: 'integration',
            integration: 'openrouter',
            latency_ms: latency,
            http_status: response.status,
            model,
            error,
            user_id: userId,
            user_email: userEmail,
        })
        return null
    }

    lognog.debug(`openrouter OK ${latency}ms`, {
        type: 'integration',
        integration: 'openrouter',
        latency_ms: latency,
        http_status: 200,
        model,
        user_id: userId,
        user_email: userEmail,
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
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
        const { imageUrl, originalPrompt, existingPrompt, mode, promptStyle, storyContext, directorMotion } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
        }

        if (!mode) {
            return NextResponse.json({ error: 'No mode specified' }, { status: 400 })
        }

        const effectiveStyle: PromptStyle = promptStyle || 'specific'
        const systemPrompt = getSystemPrompt(mode, effectiveStyle)

        // Build user message
        const textParts: string[] = []

        if (mode === 'enhance' && existingPrompt) {
            textParts.push(`User's current animation prompt to enhance:\n"${existingPrompt}"`)
        }

        if (originalPrompt) {
            textParts.push(`Original prompt used to generate this image:\n"${originalPrompt}"`)
        }

        if (storyContext) {
            textParts.push(`Story context (what's happening in this scene):\n"${storyContext}"`)
        }

        if (directorMotion) {
            textParts.push(`Director's camera direction for this shot:\n"${directorMotion}"`)
        }

        if (mode === 'generate') {
            textParts.push('Analyze the image and create an animation direction that feels natural for this scene.')
        } else {
            textParts.push('Analyze the image and enhance the user\'s animation prompt while keeping their core intent.')
        }

        if (storyContext) {
            textParts.push('Incorporate the story action described above.')
        }
        if (directorMotion) {
            textParts.push('Use the director\'s camera style as your primary camera movement guide.')
        }

        const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
            { type: 'text', text: textParts.join('\n\n') },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }
        ]

        // Try primary model (free), fall back to paid model
        let content = await callOpenRouter(PRIMARY_MODEL, systemPrompt, userContent, userId, userEmail)
        let usedModel = PRIMARY_MODEL

        if (!content) {
            content = await callOpenRouter(FALLBACK_MODEL, systemPrompt, userContent, userId, userEmail)
            usedModel = FALLBACK_MODEL
        }

        if (!content) {
            return NextResponse.json({ error: 'Animation prompt generation failed' }, { status: 500 })
        }

        // Clean up the response
        const animationPrompt = content
            .replace(/^["']|["']$/g, '')
            .trim()

        // Log success
        lognog.info('animation_prompt_generated', {
            type: 'business',
            event: 'animation_prompt_generated',
            user_id: userId,
            user_email: userEmail,
            mode,
            prompt_style: effectiveStyle,
            original_prompt_length: originalPrompt?.length || 0,
            existing_prompt_length: existingPrompt?.length || 0,
            animation_prompt_length: animationPrompt.length,
            model: usedModel,
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
            model: usedModel,
        })

        return NextResponse.json({
            animationPrompt,
            originalPrompt: originalPrompt || '',
            imageUrl,
            mode,
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
