import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { storyText, count, model } = body

        if (!storyText || typeof storyText !== 'string') {
            return NextResponse.json(
                { error: 'Story text is required' },
                { status: 400 }
            )
        }

        const shotCount = Math.min(Math.max(count || 5, 1), 10)

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            )
        }

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4o-mini')
        const prompts = await service.generateBRollPrompts(storyText, shotCount)

        return NextResponse.json({ prompts })
    } catch (error) {
        console.error('B-Roll generation error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'B-Roll generation failed' },
            { status: 500 }
        )
    }
}
