/**
 * Music Lab Demucs Stem Separation API
 * 
 * Isolates vocals from audio using Demucs for cleaner transcription.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const DEMUCS_MODEL = 'cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81571f87f7e83f5e'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { audioUrl } = await request.json()

        if (!audioUrl) {
            return NextResponse.json({ error: 'No audio URL provided' }, { status: 400 })
        }

        // Initialize Replicate
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN
        })

        // Run Demucs stem separation
        const output = await replicate.run(DEMUCS_MODEL, {
            input: {
                audio: audioUrl,
                stems: 'vocals' // Only extract vocals for transcription
            }
        }) as {
            vocals: string
            drums?: string
            bass?: string
            other?: string
        }

        if (!output.vocals) {
            return NextResponse.json({ error: 'Vocal extraction failed' }, { status: 500 })
        }

        return NextResponse.json({
            vocalsUrl: output.vocals,
            success: true
        })
    } catch (error) {
        console.error('Demucs error:', error)
        return NextResponse.json({ error: 'Stem separation failed' }, { status: 500 })
    }
}
