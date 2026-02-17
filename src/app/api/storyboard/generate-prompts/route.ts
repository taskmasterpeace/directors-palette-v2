import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { lognog } from '@/lib/lognog'

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
    const apiStart = Date.now()

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

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

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
                const batchStart = Date.now()
                const batchResults = await service.generateShotPrompts(
                    batch,
                    stylePrompt,
                    characterDescriptions,
                    storyContext
                )
                allResults.push(...batchResults)

                // Log OpenRouter integration success for this batch
                lognog.debug(`openrouter OK ${Date.now() - batchStart}ms ${model || 'openai/gpt-4.1-mini'}`, {
                    type: 'integration',
                    integration: 'openrouter',
                    latency_ms: Date.now() - batchStart,
                    success: true,
                    model: model || 'openai/gpt-4.1-mini',
                    prompt_length: batch.reduce((sum, s) => sum + (s.text?.length || 0), 0),
                })
            } catch (batchError) {
                console.error(`Batch ${batchNumber} failed:`, batchError)
                errors.push(`Batch ${batchNumber} (shots ${batch[0].sequence}-${batch[batch.length - 1].sequence}) failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`)

                // Log OpenRouter integration failure
                lognog.warn(`openrouter FAIL ${Date.now() - apiStart}ms ${model || 'openai/gpt-4.1-mini'}`, {
                    type: 'integration',
                    integration: 'openrouter',
                    latency_ms: Date.now() - apiStart,
                    success: false,
                    error: batchError instanceof Error ? batchError.message : 'Unknown error',
                    model: model || 'openai/gpt-4.1-mini',
                })
                // Continue with next batch instead of failing completely
            }
        }

        // Sort results by sequence number
        allResults.sort((a, b) => a.sequence - b.sequence)

        // Log API success
        lognog.info(`POST /api/storyboard/generate-prompts 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/generate-prompts',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({
            shots: allResults,
            totalRequested: segments.length,
            totalProcessed: allResults.length,
            errors: errors.length > 0 ? errors : undefined,
            complete: allResults.length === segments.length
        })
    } catch (error) {
        console.error('Shot prompt generation error:', error)

        // Log error
        lognog.error(error instanceof Error ? error.message : 'Shot prompt generation failed', {
            type: 'error',
            route: '/api/storyboard/generate-prompts',
        })

        // Log API failure
        lognog.info(`POST /api/storyboard/generate-prompts 500 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/generate-prompts',
            method: 'POST',
            status_code: 500,
            duration_ms: Date.now() - apiStart,
            error: error instanceof Error ? error.message : 'Unknown error',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Shot prompt generation failed' },
            { status: 500 }
        )
    }
}
