import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'

const BATCH_SIZE = 15 // Process 15 shots at a time to avoid token limits

interface Segment {
    text: string
    sequence: number
    directorNote?: string
}

interface GeneratedShot {
    sequence: number
    prompt: string
    shotType: string
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { segments, stylePrompt, characterDescriptions, storyContext, model, startFrom = 0 } = body

        if (!segments || !Array.isArray(segments)) {
            return NextResponse.json(
                { error: 'Segments array is required' },
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

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4o-mini')

        // Filter to segments we need to process (starting from startFrom)
        const segmentsToProcess: Segment[] = segments.filter((s: Segment) => s.sequence >= startFrom)
        const totalSegments = segmentsToProcess.length
        const allResults: GeneratedShot[] = []
        const errors: string[] = []

        // Process in batches
        for (let i = 0; i < totalSegments; i += BATCH_SIZE) {
            const batch = segmentsToProcess.slice(i, i + BATCH_SIZE)
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1
            const totalBatches = Math.ceil(totalSegments / BATCH_SIZE)

            console.log(`Processing batch ${batchNumber}/${totalBatches} (shots ${batch[0].sequence}-${batch[batch.length - 1].sequence})`)

            try {
                const batchResults = await service.generateShotPrompts(
                    batch,
                    stylePrompt,
                    characterDescriptions,
                    storyContext
                )
                allResults.push(...batchResults)
            } catch (batchError) {
                console.error(`Batch ${batchNumber} failed:`, batchError)
                errors.push(`Batch ${batchNumber} (shots ${batch[0].sequence}-${batch[batch.length - 1].sequence}) failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`)
                // Continue with next batch instead of failing completely
            }
        }

        // Sort results by sequence number
        allResults.sort((a, b) => a.sequence - b.sequence)

        return NextResponse.json({
            shots: allResults,
            totalRequested: segments.length,
            totalProcessed: allResults.length,
            errors: errors.length > 0 ? errors : undefined,
            complete: allResults.length === segments.length
        })
    } catch (error) {
        console.error('Shot prompt generation error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Shot prompt generation failed' },
            { status: 500 }
        )
    }
}
