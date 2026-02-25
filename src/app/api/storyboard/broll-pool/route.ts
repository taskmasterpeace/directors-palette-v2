import { NextRequest, NextResponse } from 'next/server'
import { generateBRollPool, assignBRollToSegments } from '@/features/storyboard/services/broll-pool.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()
    try {
        const body = await request.json()
        const { chapterText, chapterIndex, storyContext, stylePrompt, characterDescriptions, narrationSegments, model } = body

        if (!chapterText) {
            return NextResponse.json({ error: 'Chapter text is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const selectedModel = model || 'openai/gpt-4.1-mini'

        // Step 1: Generate B-roll pool
        const poolResult = await generateBRollPool({
            apiKey, model: selectedModel, chapterText,
            chapterIndex: chapterIndex || 0,
            storyContext: storyContext || chapterText,
            stylePrompt, characterDescriptions,
        })

        if (!poolResult.success) {
            return NextResponse.json({ error: poolResult.error }, { status: 500 })
        }

        // Step 2: Auto-assign B-roll to narration segments
        let assignments: Array<{ sequence: number; categoryId: string }> = []
        if (narrationSegments?.length > 0 && poolResult.categories.length > 0) {
            assignments = await assignBRollToSegments({
                apiKey, model: selectedModel,
                narrationSegments, categories: poolResult.categories,
            })
            for (const assignment of assignments) {
                const category = poolResult.categories.find((c) => c.id === assignment.categoryId)
                if (category) category.assignedSegments.push(assignment.sequence)
            }
        }

        lognog.info(`POST /api/storyboard/broll-pool 200 (${Date.now() - apiStart}ms)`, {
            type: 'api', route: '/api/storyboard/broll-pool', method: 'POST',
            status_code: 200, duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({
            categories: poolResult.categories, assignments,
            totalCategories: poolResult.categories.length,
        })
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'B-roll pool generation failed', {
            type: 'error', route: '/api/storyboard/broll-pool',
        })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'B-roll pool generation failed' },
            { status: 500 }
        )
    }
}
