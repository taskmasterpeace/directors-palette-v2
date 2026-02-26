/**
 * Wardrobe White-Background Reference Generation API
 * 
 * Generates a clean, white-background wardrobe reference image
 * using the wardrobe description (for lookbook display).
 */

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

// Use nano-banana-pro for clean wardrobe generation
const IMAGE_MODEL = 'fofr/nano-banana-pro'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const {
            wardrobeName,
            wardrobeDescription,
            aspectRatio = '3:4' // Portrait for wardrobe
        } = await request.json()

        if (!wardrobeDescription) {
            return NextResponse.json({ error: 'Wardrobe description required' }, { status: 400 })
        }

        // Initialize Replicate
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN!
        })

        // Build the generation prompt for white-background fashion reference
        const prompt = `Fashion lookbook photograph, ${wardrobeDescription}, 
displayed on invisible mannequin or flat lay, 
pure white background, studio lighting, 
professional fashion photography, 
clean and minimal, high quality product shot, 
no person visible, clothing only`

        const negativePrompt = 'person, face, human, model, busy background, text, watermark, low quality'

        // Run image generation
        const output = await replicate.run(IMAGE_MODEL, {
            input: {
                prompt,
                negative_prompt: negativePrompt,
                aspect_ratio: aspectRatio,
                num_outputs: 1
            }
        }) as string[]

        const resultUrl = output?.[0]

        if (!resultUrl) {
            return NextResponse.json({ error: 'No output from image generation' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            referenceUrl: resultUrl,
            wardrobeName,
            wardrobeDescription
        })

    } catch (error) {
        logger.api.error('Wardrobe reference generation error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({
            error: 'Failed to generate wardrobe reference',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
