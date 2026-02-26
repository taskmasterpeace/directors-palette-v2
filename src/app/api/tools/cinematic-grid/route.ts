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

// Model ID for image generation - Nano Banana Pro
const NANO_BANANA_PRO_MODEL = 'google/nano-banana-pro'

// Cost: Same as nano-banana-pro standard generation
const CINEMATIC_GRID_COST_POINTS = 20

/**
 * Build the fixed 3x3 grid prompt with cinematic camera angles
 * Grid layout:
 *   TOP:    extreme wide | full body | medium-long
 *   MIDDLE: waist-up | chest-up | tight face
 *   BOTTOM: macro detail | low angle | high angle
 */
function buildCinematicGridPrompt(): string {
  return `A professional 3x3 grid contact sheet showing the SAME character from 9 different cinematic camera angles. The character/subject should be IDENTICAL in all 9 cells, only the camera angle changes.

Grid layout (left to right, top to bottom):

TOP ROW:
1. EXTREME WIDE SHOT - distant establishing view, full environment visible, subject small in frame
2. WIDE SHOT - full body visible with environmental context, head to toe
3. MEDIUM-LONG SHOT - knee-up framing, subject dominates but environment visible

MIDDLE ROW:
4. MEDIUM SHOT - waist-up framing, conversational distance
5. MEDIUM CLOSE-UP - chest-up framing, intimate
6. CLOSE-UP - face filling frame, emotional, details visible

BOTTOM ROW:
7. EXTREME CLOSE-UP - macro detail shot, eyes or specific feature
8. LOW ANGLE - looking up at subject, heroic/powerful perspective
9. HIGH ANGLE - looking down at subject, vulnerable/contemplative

CRITICAL REQUIREMENTS:
- All 9 cells show the EXACT SAME character/subject
- Clean black separator lines between cells (thin borders)
- Consistent lighting and style across all cells
- Professional cinematography reference sheet aesthetic
- Square 1:1 aspect ratio for the overall grid
- Each cell is also square (equal width/height)

Use the reference image as the character to depict in all 9 angles.`
}

/**
 * Cinematic Grid Tool API
 *
 * Takes a reference image and generates a 3x3 grid with 9 cinematic camera angles.
 * Uses Nano Banana Pro for high-quality generation.
 *
 * Cost: 20 points (same as nano-banana-pro)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const body = await request.json()
    const { imageUrl } = body

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Reference image URL is required' },
        { status: 400 }
      )
    }

    // Check if user is admin (bypass credit check)
    const userIsAdmin = isAdminEmail(user.email || '')

    // Check if user has enough credits (unless admin)
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      if (!balance || balance.balance < CINEMATIC_GRID_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${CINEMATIC_GRID_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        )
      }
    }

    logger.api.info('Cinematic Grid: Starting generation with reference', { detail: imageUrl })

    // Build the fixed cinematic grid prompt
    const gridPrompt = buildCinematicGridPrompt()

    logger.api.info('Cinematic Grid: Using Nano Banana Pro model')
    logger.api.info('Cinematic Grid: Prompt length', { length: gridPrompt.length })

    // Call Replicate API using nano-banana-pro
    // Nano Banana Pro accepts: prompt, reference_images (array), aspect_ratio
    const rawOutput = await replicate.run(NANO_BANANA_PRO_MODEL, {
      input: {
        prompt: gridPrompt,
        reference_images: [imageUrl], // Reference image for character consistency
        aspect_ratio: '1:1', // Square for 3x3 grid
      },
    })

    logger.api.info('Cinematic Grid: Generation completed')
    logger.api.info('  - rawOutput type', { detail: typeof rawOutput })
    logger.api.info('  - rawOutput constructor', { name: (rawOutput as object)?.constructor?.name })

    // Extract URL from output
    // Replicate SDK v1 returns FileOutput objects which have toString() -> URL
    let outputUrl: string | undefined

    if (typeof rawOutput === 'string') {
      logger.api.info('  - Detected: string output')
      outputUrl = rawOutput
    } else if (Array.isArray(rawOutput) && rawOutput.length > 0) {
      // Some models return array of outputs
      const firstOutput = rawOutput[0]
      logger.api.info('  - Detected: array output, first item type', { detail: typeof firstOutput })
      if (typeof firstOutput === 'string') {
        outputUrl = firstOutput
      } else {
        const stringified = String(firstOutput)
        if (stringified && stringified.startsWith('http')) {
          outputUrl = stringified
        }
      }
    } else if (rawOutput && typeof rawOutput === 'object') {
      // FileOutput objects have toString() which returns the URL
      const stringified = String(rawOutput)
      logger.api.info('  - Detected: object output, toString() =', { detail: stringified })

      if (stringified && stringified.startsWith('http')) {
        outputUrl = stringified
      }
    }

    logger.api.info('Cinematic Grid: Extracted outputUrl', { detail: outputUrl })

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {
      // Deduct credits after successful completion (admins bypass)
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -CINEMATIC_GRID_COST_POINTS, {
          type: 'usage',
          description: 'Cinematic Grid generation',
          metadata: {
            referenceImage: imageUrl,
            tool: 'cinematic-grid',
          },
        })
        if (!deductResult.success) {
          logger.api.error('Cinematic Grid: Failed to deduct credits', { error: deductResult.error })
        } else {
          logger.api.info('Cinematic Grid: Deducted credits', { points: CINEMATIC_GRID_COST_POINTS, newBalance: deductResult.newBalance })
        }
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : CINEMATIC_GRID_COST_POINTS,
      })
    } else {
      return NextResponse.json(
        { error: 'No output from cinematic grid generation' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.api.error('Cinematic Grid: Error', { error: error instanceof Error ? error.message : String(error) })

    // Better error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)

    logger.api.error('Cinematic Grid: Full error details', { detail: errorDetails })

    lognog.error('tool_cinematic_grid_failed', {
      error: errorMessage,
      tool: 'cinematic-grid',
    })

    return NextResponse.json(
      {
        error: 'Failed to generate cinematic grid',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    )
  }
}
