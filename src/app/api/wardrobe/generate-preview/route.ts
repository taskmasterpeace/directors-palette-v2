/**
 * Wardrobe Preview Generation API (P-Edit)
 * 
 * Uses prunaai/p-image-edit on Replicate to generate wardrobe previews.
 * Takes an artist reference image and wardrobe description, outputs
 * the artist wearing the described wardrobe.
 */

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

// P-Edit model on Replicate
const P_EDIT_MODEL = 'prunaai/p-image-edit'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const {
            artistImageUrl,      // Reference image of the artist
            wardrobeDescription, // Description of the wardrobe to apply
            aspectRatio = 'match_input_image',
            seed = -1            // -1 for random
        } = await request.json()

        if (!artistImageUrl) {
            return NextResponse.json({ error: 'Artist image URL required' }, { status: 400 })
        }

        if (!wardrobeDescription) {
            return NextResponse.json({ error: 'Wardrobe description required' }, { status: 400 })
        }

        // Initialize Replicate
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN!
        })

        // Build the editing prompt
        const editPrompt = `Change the person's clothing to: ${wardrobeDescription}. 
Keep the same person, face, and pose. Only change the wardrobe/outfit.
Professional fashion photography style, clean, high quality.`

        // Run P-Edit
        const output = await replicate.run(P_EDIT_MODEL, {
            input: {
                images: [artistImageUrl],
                prompt: editPrompt,
                aspect_ratio: aspectRatio,
                seed: seed
            }
        }) as string[] | string

        // P-Edit returns array of image URLs or single URL
        const resultUrl = Array.isArray(output) ? output[0] : output

        if (!resultUrl) {
            return NextResponse.json({ error: 'No output from P-Edit' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            previewUrl: resultUrl,
            wardrobeDescription
        })

    } catch (error) {
        console.error('Wardrobe preview generation error:', error)
        return NextResponse.json({
            error: 'Failed to generate wardrobe preview',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
