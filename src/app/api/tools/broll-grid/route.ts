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

const NANO_BANANA_MODEL = 'google/nano-banana-2'
const BROLL_GRID_COST_POINTS = 20

/**
 * B-Roll grid prompt — 9 complementary shots from the same visual world.
 * Different subjects, same color palette / lighting / mood as the reference.
 * Explicitly bans any text/label overlays so the grid can be reused as
 * animator start-frame without having on-screen titles bleed through.
 */
function buildBrollGridPrompt(): string {
  return `A 3x3 grid collage of 9 different B-roll shots that complement and extend the provided reference image.

IMPORTANT: Use the provided reference image to match the exact color palette, lighting conditions, and visual setting. All 9 cells should feel like they belong to the same scene.

The 9 cells show diverse scene elements: an establishing wide shot, a foreground detail close-up, a background element with depth, a key object or prop close-up, a texture or material macro shot, a hands or action insert, ambient background activity, a symbolic or thematic element, and an architectural framing element.

Each cell shows a different element from the same visual world - not different angles of the same subject, but different subjects that share the same look and feel. Clear separation between cells with thin black borders.

CRITICAL RULES:
- ABSOLUTELY NO TEXT, labels, captions, titles, or overlays of any kind on the image
- No words, letters, or descriptions rendered on any cell
- Pure photographic/cinematic imagery only
- The color temperature, lighting direction, and overall mood must match across all 9 cells`
}

/**
 * B-Roll Grid Tool API
 *
 * Takes a reference image and generates a 3x3 grid of 9 complementary B-roll shots.
 * Session-authed so in-app features (Shot Animator) can call it without an API key.
 *
 * Cost: 20 points (same as nano-banana-2).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Reference image URL is required' },
        { status: 400 }
      )
    }

    const userIsAdmin = isAdminEmail(user.email || '')

    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      if (!balance || balance.balance < BROLL_GRID_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${BROLL_GRID_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        )
      }
    }

    logger.api.info('B-Roll Grid: Starting generation')

    const gridPrompt = buildBrollGridPrompt()

    const rawOutput = await replicate.run(NANO_BANANA_MODEL, {
      input: {
        prompt: gridPrompt,
        image_input: [imageUrl],
        aspect_ratio: '16:9',
      },
    })

    // Extract URL using the same FileOutput-tolerant logic as cinematic-grid
    let outputUrl: string | undefined
    if (typeof rawOutput === 'string') {
      outputUrl = rawOutput
    } else if (Array.isArray(rawOutput) && rawOutput.length > 0) {
      const firstOutput = rawOutput[0]
      if (typeof firstOutput === 'string') {
        outputUrl = firstOutput
      } else {
        const stringified = String(firstOutput)
        if (stringified.startsWith('http')) outputUrl = stringified
      }
    } else if (rawOutput && typeof rawOutput === 'object') {
      const stringified = String(rawOutput)
      if (stringified.startsWith('http')) outputUrl = stringified
    }

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -BROLL_GRID_COST_POINTS, {
          type: 'usage',
          description: 'B-Roll Grid generation',
          metadata: {
            referenceImage: imageUrl,
            tool: 'broll-grid',
          },
        })
        if (!deductResult.success) {
          logger.api.error('B-Roll Grid: Failed to deduct credits', { error: deductResult.error })
        }
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : BROLL_GRID_COST_POINTS,
      })
    }

    return NextResponse.json(
      { error: 'No output from b-roll grid generation' },
      { status: 500 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.api.error('B-Roll Grid: Error', { error: errorMessage })
    lognog.error('tool_broll_grid_failed', {
      error: errorMessage,
      tool: 'broll-grid',
    })
    return NextResponse.json(
      { error: 'Failed to generate b-roll grid', message: errorMessage },
      { status: 500 }
    )
  }
}
