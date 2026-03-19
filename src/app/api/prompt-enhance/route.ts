/**
 * Prompt Enhance API
 *
 * Model-aware automatic prompt enhancement using GPT-4.1-mini via OpenRouter.
 * Adds missing cinematographic details without touching the user's core intent.
 * Does NOT add subjects, characters, or elements that could conflict with LoRAs/styles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const MODEL = 'openai/gpt-4.1-mini'

const BASE_RULES = `You are a prompt enhancement specialist for AI image generation.

TASK: Enhance the user's prompt by filling in missing visual details. Keep their words and intent intact.

CRITICAL RULES:
1. NEVER add new subjects, characters, people, animals, or objects the user didn't mention
2. NEVER change the user's described scene or subject matter
3. NEVER add style keywords (anime, oil painting, etc.) — those come from a separate system
4. NEVER add LoRA trigger words or technical tokens
5. DO add: lighting, camera angle, composition, atmosphere, lens, color palette, texture, mood
6. Keep output under 200 words
7. Return ONLY the enhanced prompt text — no explanations, no JSON, no quotes`

const MODEL_PROMPTS: Record<string, string> = {
    'nano-banana-2': `${BASE_RULES}

MODEL: Nano Banana 2 (Google) — excels at text rendering, high detail, photorealism, 4K clarity.

ENHANCEMENT FOCUS:
- Emphasize crisp detail, texture, and surface quality
- Add resolution/fidelity keywords: "sharp detail", "4K clarity", "crisp textures"
- Specify precise lighting direction and quality
- Add lens characteristics: depth of field, focal length feel
- If text is present in scene, emphasize "clearly legible", "crisp typography"
- Use rich world-detail and composition cues`,

    'flux-2-klein-9b': `${BASE_RULES}

MODEL: Flux 2 Klein (Black Forest Labs) — fast, strong composition, coherent lighting/materials.

ENHANCEMENT FOCUS:
- Emphasize composition: rule of thirds, leading lines, visual hierarchy
- Add lighting and material descriptions: reflections, shadows, surface qualities
- Keep descriptions structured but not overly dense (respect smaller model capacity)
- Focus on spatial relationships and camera framing
- Add color grading and mood descriptors
- Avoid ultra-dense micro-detail (keep it clean and structured)`,

    'qwen-image-edit': `${BASE_RULES}

MODEL: Qwen Image Edit — editing/transform model with camera angle control.

ENHANCEMENT FOCUS:
- Keep enhancements minimal — this model transforms existing images
- Focus on atmosphere, mood, and lighting changes
- Add quality descriptors: "clean rendering", "consistent lighting"
- Do NOT add complex scene descriptions (model works from input image)
- Keep enhancement brief and focused on visual quality`,
}

interface EnhanceRequest {
    prompt: string
    model: string
}

export async function POST(request: NextRequest) {
    const apiStart = Date.now()
    let userId: string | undefined
    let userEmail: string | undefined

    try {
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth
        userId = auth.user.id
        userEmail = auth.user.email

        const rl = checkRateLimit(`prompt-enhance:${userId}`, RATE_LIMITS.PROMPT_EXPANSION)
        if (!rl.allowed) {
            const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
            return NextResponse.json(
                { error: 'Too many requests. Please slow down.', retryAfter },
                { status: 429, headers: { 'Retry-After': String(retryAfter) } }
            )
        }

        const body: EnhanceRequest = await request.json()
        const { prompt, model } = body

        if (!prompt) {
            return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
        }

        const systemPrompt = MODEL_PROMPTS[model] || MODEL_PROMPTS['nano-banana-2']

        const openRouterStart = Date.now()
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette Prompt Enhance'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Enhance this prompt:\n\n${prompt}` }
                ],
                temperature: 0.2,
                max_tokens: 300
            })
        })

        if (!response.ok) {
            const error = await response.text()
            logger.api.error('OpenRouter error', { error })
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
            return NextResponse.json({ error: 'Enhancement failed' }, { status: 500 })
        }

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

        const enhanced = content
            .replace(/^["']|["']$/g, '')
            .trim()

        lognog.info('prompt_enhanced', {
            type: 'business',
            event: 'prompt_enhanced',
            user_id: userId,
            user_email: userEmail,
            target_model: model,
            original_length: prompt.length,
            enhanced_length: enhanced.length,
        })

        lognog.info(`POST /api/prompt-enhance 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/prompt-enhance',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
            user_id: userId,
            user_email: userEmail,
        })

        return NextResponse.json({ original: prompt, enhanced })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.api.error('Prompt enhancement error', { error: errorMessage })
        lognog.error(errorMessage, {
            type: 'error',
            route: '/api/prompt-enhance',
            user_id: userId,
            user_email: userEmail,
        })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
