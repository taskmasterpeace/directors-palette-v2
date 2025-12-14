/**
 * Music Lab Analyze Structure API
 * 
 * Analyzes song structure using Replicate's music structure analyzer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const STRUCTURE_MODEL = 'sakemin/all-in-one-music-structure-analyzer:8d0c1a1aca1e15848acc43c3ee26201e09af58f94e9c8c96c668ef82e6de5e7b'

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

        // Run structure analysis
        const output = await replicate.run(STRUCTURE_MODEL, {
            input: {
                audio_input: audioUrl
            }
        }) as {
            bpm: number
            key?: string
            time_signature?: string
            sections: Array<{
                label: string
                start: number
                end: number
            }>
            beats?: number[]
        }

        return NextResponse.json({
            bpm: output.bpm,
            key: output.key,
            time_signature: output.time_signature,
            sections: output.sections,
            beats: output.beats || []
        })
    } catch (error) {
        console.error('Structure analysis error:', error)
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    }
}
