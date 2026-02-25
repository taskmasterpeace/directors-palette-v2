import { NextRequest, NextResponse } from 'next/server'
import { generateChapterArcNames } from '@/features/storyboard/services/chapter-detection.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()
    try {
        const body = await request.json()
        const { chapters, storyText, model } = body

        if (!chapters || !Array.isArray(chapters)) {
            return NextResponse.json({ error: 'Chapters array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const names = await generateChapterArcNames({
            apiKey, model: model || 'openai/gpt-4.1-mini',
            chapters, storyText: storyText || '',
        })

        lognog.info(`POST /api/storyboard/chapter-names 200 (${Date.now() - apiStart}ms)`, {
            type: 'api', route: '/api/storyboard/chapter-names', method: 'POST',
            status_code: 200, duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({ names })
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'Chapter naming failed', {
            type: 'error', route: '/api/storyboard/chapter-names',
        })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chapter naming failed' },
            { status: 500 }
        )
    }
}
