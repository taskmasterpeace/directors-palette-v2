import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { storyText, model } = body

        if (!storyText || typeof storyText !== 'string') {
            return NextResponse.json(
                { error: 'Story text is required' },
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
        const result = await service.extractEntities(storyText)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Extraction error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Extraction failed' },
            { status: 500 }
        )
    }
}
