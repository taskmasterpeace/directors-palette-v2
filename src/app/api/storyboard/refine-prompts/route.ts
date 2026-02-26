import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

interface PromptToRefine {
    sequence: number
    prompt: string
    originalText: string
}

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const body = await request.json()
        const { prompts, locationDescriptions, characterDescriptions, model } = body as {
            prompts: PromptToRefine[]
            locationDescriptions: Record<string, string>
            characterDescriptions: Record<string, string>
            model: string
        }

        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return NextResponse.json(
                { error: 'Prompts array is required' },
                { status: 400 }
            )
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            )
        }

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

        const refined = await service.refineShotPrompts(
            prompts,
            locationDescriptions || {},
            characterDescriptions || {}
        )

        lognog.info(`POST /api/storyboard/refine-prompts 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/refine-prompts',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({
            shots: refined,
            totalRefined: refined.length,
        })
    } catch (error) {
        logger.api.error('Prompt refinement error', { error: error instanceof Error ? error.message : String(error) })

        lognog.error(error instanceof Error ? error.message : 'Prompt refinement failed', {
            type: 'error',
            route: '/api/storyboard/refine-prompts',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Prompt refinement failed' },
            { status: 500 }
        )
    }
}
