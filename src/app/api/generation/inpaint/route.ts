/**
 * Inpaint API - Nano Banana Integration via Replicate
 * 
 * Uses google/nano-banana on Replicate for AI image editing.
 * 
 * How it works:
 * 1. User draws annotations on image (visible mask)
 * 2. Frontend creates composited image with mask burned in
 * 3. We combine user prompt with system instructions
 * 4. Nano Banana sees the annotations AND understands the prompt
 * 5. Returns edited image with annotations removed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'

// Initialize Replicate client
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
})

// Comprehensive instruction prompt for Nano Banana Pro
// Explicitly defines how to interpret each annotation type
const NANO_BANANA_SYSTEM_PROMPT = `ANNOTATION INTERPRETATION INSTRUCTIONS:

The user has marked this image with visual annotations in CYAN color (#00d2d3). Each annotation type has a specific meaning:

1. CYAN BRUSH/MASK AREAS: These are painted regions that indicate areas to be edited. Apply the user's requested changes ONLY to these masked areas.

2. CYAN ARROWS: These point to specific objects or regions. The arrow indicates "this is the target" - apply changes to the object the arrow is pointing at.

3. CYAN TEXT LABELS: These provide specific instructions or descriptions. Read the text and apply those exact changes to the nearby/indicated area.

4. OVERLAID REFERENCE IMAGES: These show what the user wants to add or replace. Use these images as visual references for style, appearance, or objects to insert into the scene.

5. CYAN FREEHAND DRAWINGS: These highlight or circle areas of interest. Apply changes to the regions enclosed or highlighted by these drawings.

YOUR TASK:
- Carefully analyze all cyan annotations to understand what the user wants to change
- Apply the user's requested edits precisely to the indicated areas
- After making the edits, remove ALL cyan annotations, text labels, arrows, and overlaid elements
- Preserve all unmarked areas of the image exactly as they are
- Ensure the final result is clean, seamless, and photorealistic with no visible annotation artifacts

The final image should look natural as if the edits were always part of the original photo.`

// Model IDs on Replicate
const MODELS = {
    'nano-banana-2': 'google/nano-banana-2' as const,
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { image, prompt, model = 'nano-banana-2', systemPrompt } = await request.json()

        if (!image || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: image and prompt'
            }, { status: 400 })
        }

        // Check for Replicate API token
        if (!process.env.REPLICATE_API_TOKEN) {
            return NextResponse.json({
                error: 'REPLICATE_API_TOKEN not configured'
            }, { status: 500 })
        }

        const modelId = MODELS[model as keyof typeof MODELS] || MODELS['nano-banana-2']

        logger.api.info('Inpaint: Using model', { detail: modelId })
        logger.api.info('Inpaint: User prompt', { detail: prompt.substring(0, 100) })

        // Use custom system prompt if provided, otherwise use default
        const effectiveSystemPrompt = systemPrompt || NANO_BANANA_SYSTEM_PROMPT

        // Construct the full prompt with system instructions
        const fullPrompt = `${prompt}. ${effectiveSystemPrompt}`

        // Convert base64 data URL to File and upload to Replicate
        logger.api.info('Inpaint: Converting base64 to File...')
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!base64Match) {
            return NextResponse.json({
                error: 'Invalid image format. Expected base64 data URL.'
            }, { status: 400 })
        }

        const mimeType = `image/${base64Match[1]}`
        const base64Data = base64Match[2]

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64')

        // Create a File object from the buffer
        const file = new File([buffer], 'inpaint-image.png', { type: mimeType })

        logger.api.info('Inpaint: Uploading image to Replicate...')
        const uploadedFile = await replicate.files.create(file)
        const imageUrl = uploadedFile.urls.get

        logger.api.info('Inpaint: Image uploaded', { detail: imageUrl.substring(0, 100) })

        // Build input for Replicate with uploaded image URL
        // Nano Banana 2 uses single 'image' parameter (not 'image_input' array)
        const input: Record<string, unknown> = {
            prompt: fullPrompt,
            image: imageUrl,
        }

        logger.api.info('Inpaint: Calling Replicate model with input', { detail: JSON.stringify({ prompt: fullPrompt.substring(0, 100), image: 'uploaded' }) })

        // Run the model
        const output = await replicate.run(modelId, { input })

        logger.api.info('Inpaint: Raw output', { type: typeof output, output })

        // Handle output - Replicate returns FileOutput which can be converted to string URL
        let resultUrl: string | null = null

        if (typeof output === 'string') {
            resultUrl = output
        } else if (Array.isArray(output) && output.length > 0) {
            // Some models return array of outputs
            resultUrl = String(output[0])
        } else if (output && typeof output === 'object') {
            // Handle FileOutput object
            resultUrl = String(output)
        }

        if (!resultUrl) {
            logger.api.info('Inpaint: No valid output received')
            return NextResponse.json({
                error: 'No image generated from model',
                details: 'The model returned an empty response'
            }, { status: 400 })
        }

        logger.api.info('Inpaint: Success! Generated URL', { detail: resultUrl.substring(0, 100) })

        return NextResponse.json({
            url: resultUrl,
            success: true,
            model: modelId
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.api.error('Inpaint: Error', { error: error instanceof Error ? error.message : String(error) })

        // Check for specific Replicate errors
        if (message.includes('Invalid version') || message.includes('not found')) {
            return NextResponse.json({
                error: 'Model not available on Replicate',
                details: message
            }, { status: 400 })
        }

        return NextResponse.json({
            error: `Inpainting failed: ${message}`
        }, { status: 500 })
    }
}
