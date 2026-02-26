import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Model ID for image generation - Nano Banana 2
const NANO_BANANA_PRO_MODEL = 'google/nano-banana-2'

// Cost: Free (nano-banana-2)
const STYLE_GUIDE_GRID_COST_POINTS = 20

/**
 * Build the style guide grid prompt
 * Creates a title banner + 3x3 grid (16:9) with diverse examples demonstrating a visual style
 *
 * Layout:
 *   TOP: Title banner with @stylename
 *   BELOW: 3x3 grid of 9 panels showing diverse subjects
 */
function buildStyleGuidePrompt(styleName: string, styleDescription?: string): string {
  const styleDetails = styleDescription
    ? `\n\nSTYLE CHARACTERISTICS TO CAPTURE:\n${styleDescription}`
    : ''

  return `Professional visual style guide sheet with this EXACT layout:

TOP SECTION: A dark gray horizontal banner spanning the full width containing centered white text "@${styleName}" as the title. This title banner is ABOVE and SEPARATE from the image grid.

BELOW THE BANNER: A 3x3 grid of 9 image panels, each showing DIFFERENT unique characters and scenes in identical artistic style matching the reference image. Each panel has a white label bar at the bottom with black text describing the shot type.

ANALYZE THE REFERENCE IMAGE and replicate its style EXACTLY in all 9 panels:
- Art style, rendering technique, and visual aesthetic
- Color palette and lighting approach
- Line work and shading technique
- Level of detail and stylization${styleDetails}

THE 9 PANELS (left to right, top to bottom):
1. CHARACTER CLOSE-UP - Face portrait with expressive features
2. EVERYDAY SCENE - Character in a casual daily activity
3. ENVIRONMENT DETAIL - Interior or exterior setting with atmosphere
4. ANIMAL/CREATURE - A stylized animal or fantastical creature in this style
5. DYNAMIC POSE - Character mid-action with energy and movement
6. SET DESIGN - Wide establishing shot of a location
7. CHARACTER INTERACTION - Two characters together
8. VEHICLE/OBJECT - A vehicle, machine, or detailed prop
9. GROUP SHOT - Three or more diverse characters together

CRITICAL REQUIREMENTS:
- Title banner at TOP shows "@${styleName}" in large white text on dark gray
- Each panel shows DIFFERENT unique characters (not the same person repeated)
- Black border lines separating all 9 panels
- White label bars with shot type text at bottom of each panel
- ALL panels match the reference image style EXACTLY
- 16:9 aspect ratio overall`
}

/**
 * Style Guide Grid Tool API
 *
 * Takes a reference image, style name, and optional style description.
 * Generates a 2x4 ultrawide (21:9) grid demonstrating the visual style
 * across diverse subjects (characters, environments, objects).
 * Uses Nano Banana Pro for high-quality generation.
 *
 * Cost: 20 points (same as nano-banana-pro)
 *
 * Tip: Use /api/styles/analyze first to auto-generate styleDescription from the reference image
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const body = await request.json()
    const { imageUrl, styleName, styleDescription } = body

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Reference image URL is required' },
        { status: 400 }
      )
    }

    if (!styleName || typeof styleName !== 'string' || styleName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Style name is required' },
        { status: 400 }
      )
    }

    // Check if user is admin (bypass credit check)
    const userIsAdmin = isAdminEmail(user.email || '')

    // Check if user has enough credits (unless admin)
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      if (!balance || balance.balance < STYLE_GUIDE_GRID_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${STYLE_GUIDE_GRID_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        )
      }
    }

    logger.api.info('Style Guide Grid: Starting generation')
    logger.api.info('  - Style name', { detail: styleName })
    logger.api.info('  - Style description', { detail: styleDescription || '(none - will analyze from reference)' })
    logger.api.info('  - Reference image', { detail: imageUrl })

    // Build the style guide grid prompt
    const gridPrompt = buildStyleGuidePrompt(styleName.trim(), styleDescription?.trim())

    logger.api.info('Style Guide Grid: Using Nano Banana Pro model')
    logger.api.info('Style Guide Grid: Prompt length', { length: gridPrompt.length })

    // Call Replicate API using nano-banana-pro
    // Using 16:9 for title banner + 3x3 grid layout
    const rawOutput = await replicate.run(NANO_BANANA_PRO_MODEL, {
      input: {
        prompt: gridPrompt,
        reference_images: [imageUrl], // Reference image for style consistency
        aspect_ratio: '16:9', // 16:9 for title + 3x3 grid
      },
    })

    logger.api.info('Style Guide Grid: Generation completed')
    logger.api.info('  - rawOutput type', { detail: typeof rawOutput })

    // Extract URL from output
    let outputUrl: string | undefined

    if (typeof rawOutput === 'string') {
      outputUrl = rawOutput
    } else if (Array.isArray(rawOutput) && rawOutput.length > 0) {
      const firstOutput = rawOutput[0]
      if (typeof firstOutput === 'string') {
        outputUrl = firstOutput
      } else {
        const stringified = String(firstOutput)
        if (stringified && stringified.startsWith('http')) {
          outputUrl = stringified
        }
      }
    } else if (rawOutput && typeof rawOutput === 'object') {
      const stringified = String(rawOutput)
      if (stringified && stringified.startsWith('http')) {
        outputUrl = stringified
      }
    }

    logger.api.info('Style Guide Grid: Extracted outputUrl', { detail: outputUrl })

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {
      // Deduct credits after successful completion (admins bypass)
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -STYLE_GUIDE_GRID_COST_POINTS, {
          type: 'usage',
          description: 'Style Guide Grid generation',
          metadata: {
            styleName,
            referenceImage: imageUrl,
            tool: 'style-guide-grid',
          },
        })
        if (!deductResult.success) {
          logger.api.error('Style Guide Grid: Failed to deduct credits', { error: deductResult.error })
        } else {
          logger.api.info('Style Guide Grid: Deducted credits', { points: STYLE_GUIDE_GRID_COST_POINTS, newBalance: deductResult.newBalance })
        }
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : STYLE_GUIDE_GRID_COST_POINTS,
      })
    } else {
      return NextResponse.json(
        { error: 'No output from style guide grid generation' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.api.error('Style Guide Grid: Error', { error: error instanceof Error ? error.message : String(error) })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)

    logger.api.error('Style Guide Grid: Full error details', { detail: errorDetails })

    lognog.error('tool_style_guide_grid_failed', {
      error: errorMessage,
      tool: 'style-guide-grid',
    })

    return NextResponse.json(
      {
        error: 'Failed to generate style guide grid',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    )
  }
}
