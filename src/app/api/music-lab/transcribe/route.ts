/**
 * Music Lab Transcription API
 * 
 * Transcribes audio using OpenAI Whisper large-v3 model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { readFile } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

// Using official OpenAI Whisper large-v3 - much better quality than whisper-diarization
const WHISPER_MODEL = 'openai/whisper:4d50db2a3dbc86e2eeeed463f29d0c15d319f1b8c3cdae41f8f2cbe59c3a23be'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { user: _user } = auth

        const { audioUrl } = await request.json()

        if (!audioUrl) {
            return NextResponse.json({ error: 'No audio URL provided' }, { status: 400 })
        }

        // Initialize Replicate
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN
        })

        // Build input object for openai/whisper
        const input: Record<string, unknown> = {
            model: 'large-v3',
            language: 'auto',          // Auto-detect language (handles Creole)
            translate: false,          // Keep original language, don't translate
            temperature: 0,            // Lower = more accurate
            transcription: 'plain text',
            suppress_tokens: '-1',
            logprob_threshold: -1,
            no_speech_threshold: 0.6,
            condition_on_previous_text: true,
            compression_ratio_threshold: 2.4,
            temperature_increment_on_fallback: 0.2,
        }

        // Handle Local File vs Remote URL
        if (audioUrl.startsWith('/')) {
            // Local file in public/ - read and upload to Replicate
            const filePath = path.join(process.cwd(), 'public', audioUrl)
            const fileBuffer = await readFile(filePath)

            // Replicate SDK handles Buffer -> Upload automatically
            input.audio = fileBuffer
        } else {
            // Remote URL - pass directly
            input.audio = audioUrl
        }

        // Run transcription
        logger.api.info('Transcribe: Running Whisper large-v3...')
        const output = await replicate.run(WHISPER_MODEL, { input }) as {
            transcription: string
            segments?: Array<{
                id: number
                seek: number
                start: number
                end: number
                text: string
                tokens: number[]
                temperature: number
                avg_logprob: number
                compression_ratio: number
                no_speech_prob: number
            }>
            translation?: string
            language?: string
            detected_language?: string
        }

        logger.api.info('Transcribe: Done. Language', { language: output.detected_language || output.language })

        // Format response to match expected interface
        const fullText = output.transcription || ''

        // Convert segments to words format with estimated timing
        // Whisper large-v3 doesn't provide word-level timestamps, so we estimate them
        const words: Array<{
            word: string
            startTime: number
            endTime: number
            confidence: number
        }> = []

        const segments = output.segments?.map(seg => {
            const segmentWords = seg.text.trim().split(/\s+/).filter(w => w.length > 0)
            const segmentDuration = seg.end - seg.start
            const wordDuration = segmentWords.length > 0 ? segmentDuration / segmentWords.length : 0

            // Create estimated word-level timestamps for this segment
            const estimatedWords = segmentWords.map((word, idx) => ({
                word,
                startTime: seg.start + (idx * wordDuration),
                endTime: seg.start + ((idx + 1) * wordDuration),
                confidence: 0.9 // Estimated confidence for segment-level transcription
            }))

            // Add to global words array
            words.push(...estimatedWords)

            return {
                text: seg.text,
                start: seg.start,
                end: seg.end,
                words: estimatedWords
            }
        }) || []

        return NextResponse.json({
            fullText: fullText.trim(),
            words,
            segments,
            language: output.detected_language || output.language
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.api.error('Transcription error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({
            error: `Transcription failed: ${message}`
        }, { status: 500 })
    }
}
