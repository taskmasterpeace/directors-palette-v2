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
 * Creates a 2x4 ultrawide grid (21:9) with diverse examples demonstrating a visual style
 *
 * Grid layout (2 rows x 4 columns):
 *   TOP:    Title + Style Name | Character Close-Up | Action Scene | Environment
 *   BOTTOM: Creature/Fantasy | Dynamic Pose | Location/Set | Props & Details
 */
function buildStyleGuidePrompt(styleName: string, styleDescription?: string): string {
  const styleDetails = styleDescription
    ? `\n\nSTYLE CHARACTERISTICS TO CAPTURE:\n${styleDescription}`
    : ''

  return `Create a professional 21:9 ultrawide visual style guide reference sheet for "${styleName}" style.

ANALYZE THE REFERENCE IMAGE CAREFULLY and replicate its visual style EXACTLY:
- Color palette and color relationships
- Line work quality (thick/thin, clean/sketchy, visible/invisible)
- Shading technique (cel-shaded, soft gradients, crosshatch, flat)
- Texture treatment (smooth, grainy, painterly, digital)
- Lighting approach (dramatic, soft, stylized, realistic)
- Level of detail and stylization
- Overall mood and atmosphere${styleDetails}

Create a cohesive 2-row × 4-column style guide grid. All 8 cells must share the IDENTICAL artistic style matching the reference.

GRID LAYOUT (left to right):

TOP ROW (4 cells):
1. TITLE BANNER - Style name "${styleName}" in decorative typography matching the aesthetic. Include ornamental borders or design elements that reflect the style.
2. CHARACTER PORTRAIT - Detailed face/head shot of a character. Show how the style renders facial features, expressions, skin, hair, and lighting on faces.
3. ACTION MOMENT - Dynamic scene with movement and energy. Demonstrate how the style handles motion blur, impact effects, and dramatic compositions.
4. ENVIRONMENT WIDE - Panoramic landscape or interior establishing shot. Show depth, atmosphere, architectural details, and how backgrounds are rendered.

BOTTOM ROW (4 cells):
5. FANTASY CREATURE - A stylized non-human being (dragon, robot, alien, or mythical creature). Show how the style handles unusual anatomy and imaginative designs.
6. FULL BODY POSE - Character in expressive action stance. Demonstrate anatomy proportions, costume design, and full-figure rendering in this style.
7. LOCATION DETAIL - Medium shot of a specific place (room corner, street scene, forest clearing). Show environmental storytelling and mid-ground details.
8. OBJECTS & PROPS - Collection of 3-4 detailed items (weapons, tools, artifacts, vehicles). Show how the style renders hard surfaces, materials, and fine details.

CRITICAL TECHNICAL REQUIREMENTS:
- 21:9 ultrawide aspect ratio (cinematic format)
- 2 rows × 4 columns = 8 total cells
- Clean BLACK separator lines between all cells (4-6 pixels wide)
- Each cell is roughly square within the grid
- ALL cells must use IDENTICAL visual style from the reference
- Professional style reference sheet aesthetic
- Style name "${styleName}" clearly visible in title cell

MATCH THE REFERENCE IMAGE EXACTLY. Every cell must look like it came from the same artist/production.`
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

    console.log('[Style Guide Grid] Starting generation')
    console.log('  - Style name:', styleName)
    console.log('  - Style description:', styleDescription || '(none - will analyze from reference)')
    console.log('  - Reference image:', imageUrl)

    // Build the style guide grid prompt
    const gridPrompt = buildStyleGuidePrompt(styleName.trim(), styleDescription?.trim())

    console.log('[Style Guide Grid] Using Nano Banana Pro model')
    console.log('[Style Guide Grid] Prompt length:', gridPrompt.length)

    // Call Replicate API using nano-banana-pro
    // Using 21:9 ultrawide for cinematic style guide layout
    const rawOutput = await replicate.run(NANO_BANANA_PRO_MODEL, {
      input: {
        prompt: gridPrompt,
        reference_images: [imageUrl], // Reference image for style consistency
        aspect_ratio: '21:9', // Ultrawide for 2x4 grid layout
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
