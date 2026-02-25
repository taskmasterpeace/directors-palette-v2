import { NextRequest, NextResponse } from 'next/server'
import { classifySegments } from '@/features/storyboard/services/segment-classification.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()
    try {
        const body = await request.json()
        const { segments, storyText, model } = body

        if (!segments || !Array.isArray(segments)) {
            return NextResponse.json({ error: 'Segments array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const result = await classifySegments({
            apiKey,
            model: model || 'openai/gpt-4.1-mini',
            segments,
            storyText: storyText || '',
        })

        lognog.info(`POST /api/storyboard/classify-segments 200 (${Date.now() - apiStart}ms)`, {
            type: 'api', route: '/api/storyboard/classify-segments', method: 'POST',
            status_code: 200, duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json(result)
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'Segment classification failed', {
            type: 'error', route: '/api/storyboard/classify-segments',
        })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Classification failed' },
            { status: 500 }
        )
    }
}
