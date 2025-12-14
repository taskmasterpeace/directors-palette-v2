/**
 * Music Lab Transcription API
 * 
 * Transcribes audio using Replicate's whisper-diarization model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const WHISPER_MODEL = 'thomasmol/whisper-diarization:b9fd8313c0d492bf1ce501b3d188f945389327730773ec1deb6ef233df6ea119'

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

        // Run transcription
        const output = await replicate.run(WHISPER_MODEL, {
            input: {
                file: audioUrl,
                file_url: audioUrl,
                num_speakers: 1,
                group_segments: true,
                offset_seconds: 0,
                prompt: 'Song lyrics transcription'
            }
        }) as {
            segments: Array<{
                text: string
                start: number
                end: number
                words: Array<{
                    word: string
                    start: number
                    end: number
                    probability: number
                }>
            }>
        }

        // Extract full text and words
        let fullText = ''
        const words: Array<{
            word: string
            startTime: number
            endTime: number
            confidence: number
        }> = []

        for (const segment of output.segments) {
            fullText += segment.text.trim() + '\n'

            if (segment.words) {
                for (const word of segment.words) {
                    words.push({
                        word: word.word,
                        startTime: word.start,
                        endTime: word.end,
                        confidence: word.probability
                    })
                }
            }
        }

        return NextResponse.json({
            fullText: fullText.trim(),
            words,
            segments: output.segments
        })
    } catch (error) {
        console.error('Transcription error:', error)
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }
}
