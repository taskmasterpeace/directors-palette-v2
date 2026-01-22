import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { lognog } from '@/lib/lognog'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Model ID for image generation - Nano Banana Pro
const NANO_BANANA_PRO_MODEL = 'google/nano-banana-pro'

// Cost: Same as nano-banana-pro standard generation
const STYLE_GUIDE_GRID_COST_POINTS = 20

/**
 * Build the style guide grid prompt
 * Creates a 3x3 grid with diverse examples demonstrating a visual style
 *
 * Grid layout:
 *   TOP:    Title area | Character Close-Up | Action Scene
 *   MIDDLE: Environment Detail | Unusual Character | Dynamic Pose
 *   BOTTOM: Set/Location | Mood Shot | Key Prop Detail
 */
function buildStyleGuidePrompt(styleName: string): string {
  return `A professional 3x3 visual style guide reference sheet for "${styleName}" style.

Create a cohesive style guide grid showing DIVERSE examples that demonstrate the visual style. All cells must share the SAME artistic style, color palette, and visual treatment.

Grid layout (left to right, top to bottom):

TOP ROW:
1. TITLE CELL - Clean text banner with style name "${styleName}" in stylized typography that matches the aesthetic. Decorative border or frame elements.
2. CHARACTER CLOSE-UP - A detailed face portrait showing how characters look in this style. Focus on facial features, expressions, skin texture, and lighting treatment.
3. ACTION SCENE - A dynamic moment with movement and energy. Shows how motion, impact, and dramatic moments are rendered in this style.

MIDDLE ROW:
4. ENVIRONMENT DETAIL - A detailed background or setting element. Shows architectural details, nature elements, or world-building visuals in this style.
5. UNUSUAL CHARACTER/CREATURE - A fantastical, stylized, or unique being. Demonstrates how the style handles non-human or exaggerated designs.
6. DYNAMIC POSE - A full-body character in an expressive action pose. Shows anatomy, proportions, costume design, and movement.

BOTTOM ROW:
7. SET/LOCATION DESIGN - A wide establishing shot of a complete environment. Shows depth, atmosphere, scale, and world design.
8. MOOD/ATMOSPHERE SHOT - An evocative scene emphasizing lighting, color, and emotional tone. Could be a silhouette, dramatic lighting, or atmospheric moment.
9. KEY PROP/OBJECT DETAIL - A close-up of an important object, weapon, vehicle, or detailed item. Shows how props and details are rendered.

CRITICAL REQUIREMENTS:
- All 9 cells MUST share the SAME visual style, matching the reference
- Clean black separator lines between cells (thin borders)
- Consistent color palette and artistic treatment across all cells
- Professional style reference sheet aesthetic
- Square 1:1 aspect ratio for the overall grid
- Each cell is also square (equal width/height)
- The style name "${styleName}" should be clearly visible in the title cell

Use the reference image to match the visual style EXACTLY. Copy the color palette, line work, shading technique, and overall aesthetic.`
}

/**
 * Style Guide Grid Tool API
 *
 * Takes a reference image and style name, generates a 3x3 grid demonstrating
 * the visual style across diverse subjects (characters, environments, objects).
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
    const { imageUrl, styleName } = body

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

    console.log('[Style Guide Grid] Starting generation')
    console.log('  - Style name:', styleName)
    console.log('  - Reference image:', imageUrl)

    // Build the style guide grid prompt
    const gridPrompt = buildStyleGuidePrompt(styleName.trim())

    console.log('[Style Guide Grid] Using Nano Banana Pro model')
    console.log('[Style Guide Grid] Prompt length:', gridPrompt.length)

    // Call Replicate API using nano-banana-pro
    const rawOutput = await replicate.run(NANO_BANANA_PRO_MODEL, {
      input: {
        prompt: gridPrompt,
        reference_images: [imageUrl], // Reference image for style consistency
        aspect_ratio: '1:1', // Square for 3x3 grid
      },
    })

    console.log('[Style Guide Grid] Generation completed')
    console.log('  - rawOutput type:', typeof rawOutput)

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

    console.log('[Style Guide Grid] Extracted outputUrl:', outputUrl)

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
          console.error('[Style Guide Grid] Failed to deduct credits:', deductResult.error)
        } else {
          console.log(`[Style Guide Grid] Deducted ${STYLE_GUIDE_GRID_COST_POINTS} credits. New balance: ${deductResult.newBalance}`)
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
    console.error('[Style Guide Grid] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)

    console.error('[Style Guide Grid] Full error details:', errorDetails)

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
