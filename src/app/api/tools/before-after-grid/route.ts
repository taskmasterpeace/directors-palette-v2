/**
 * Before/After Location Grid Tool
 * Generates a 3x3 grid showing the same location in different states/time periods
 *
 * Grid concept:
 * - Shows transformation of a location before/after an event
 * - Or different time periods (morning/noon/night, seasons, decades, etc.)
 * - Maintains exact same camera angle and composition
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cost in credit points (same as nano-banana-pro)
const TOOL_COST = 20

interface BeforeAfterGridRequest {
  referenceImageUrl: string
  transformationType: 'time-of-day' | 'seasons' | 'decades' | 'event' | 'construction' | 'custom'
  customStates?: string[] // For custom transformation type
  locationDescription?: string
}

function buildBeforeAfterPrompt(
  transformationType: string,
  customStates?: string[],
  locationDescription?: string
): string {
  const locationDesc = locationDescription || 'the location shown in the reference image'

  let stateDescriptions: string[]

  switch (transformationType) {
    case 'time-of-day':
      stateDescriptions = [
        'PRE-DAWN - dark blue hour, stars fading, first hints of light on horizon',
        'SUNRISE - golden hour, warm orange/pink sky, long shadows',
        'MORNING - bright clear daylight, crisp shadows, fresh atmosphere',
        'MIDDAY - harsh overhead sun, minimal shadows, bright exposure',
        'AFTERNOON - warm golden light, lengthening shadows',
        'SUNSET - golden hour, dramatic orange/red sky, silhouettes',
        'DUSK - blue hour, city lights turning on, purple/blue tones',
        'NIGHT - full darkness, artificial lights, stars visible',
        'MOONLIT NIGHT - silver moonlight, dramatic shadows, ethereal glow'
      ]
      break

    case 'seasons':
      stateDescriptions = [
        'EARLY SPRING - first buds, melting snow patches, fresh green',
        'LATE SPRING - full bloom, flowers everywhere, vibrant green',
        'EARLY SUMMER - lush green, long days, warm sunlight',
        'MID SUMMER - peak vegetation, hazy heat, intense colors',
        'LATE SUMMER - golden tones beginning, harvest time',
        'EARLY AUTUMN - first leaves changing, orange and gold appearing',
        'PEAK AUTUMN - full fall colors, red/orange/gold foliage',
        'LATE AUTUMN - bare branches, fallen leaves, grey tones',
        'WINTER - snow covered, bare trees, cold blue/white tones'
      ]
      break

    case 'decades':
      stateDescriptions = [
        '1920s - vintage sepia, old architecture, period vehicles',
        '1940s - wartime era, black and white aesthetic',
        '1960s - mid-century modern, vintage color palette',
        '1970s - warm earth tones, period styling',
        '1980s - neon accents, early modern development',
        '1990s - transitional period, subtle modernization',
        '2000s - early digital era, contemporary updates',
        '2010s - modern development, current technology',
        '2030s FUTURE - futuristic interpretation, advanced technology, clean energy'
      ]
      break

    case 'event':
      stateDescriptions = [
        'BEFORE EVENT - pristine original state, peaceful, undisturbed',
        'MOMENTS BEFORE - subtle signs of change, anticipation',
        'EVENT BEGINNING - first visible changes occurring',
        'EVENT IN PROGRESS - dramatic transformation underway',
        'PEAK OF EVENT - maximum impact, most dramatic moment',
        'EVENT SUBSIDING - intensity decreasing, aftermath beginning',
        'IMMEDIATE AFTER - fresh aftermath, raw state',
        'RECOVERY PHASE - cleanup or natural recovery in progress',
        'FULLY RESTORED/TRANSFORMED - final state, new normal'
      ]
      break

    case 'construction':
      stateDescriptions = [
        'EMPTY LOT - bare land before construction, natural state',
        'GROUNDBREAKING - excavation beginning, foundation work',
        'FOUNDATION - concrete foundation laid, basic structure',
        'FRAMING - structural skeleton visible, building shape emerging',
        'EXTERIOR COMPLETE - outer walls done, windows installed',
        'INTERIOR WORK - finishing touches, details being added',
        'LANDSCAPING - outdoor areas being developed',
        'FINAL TOUCHES - nearly complete, final details',
        'COMPLETED - fully finished building, landscaped, occupied'
      ]
      break

    case 'custom':
      stateDescriptions = customStates || [
        'State 1', 'State 2', 'State 3',
        'State 4', 'State 5', 'State 6',
        'State 7', 'State 8', 'State 9'
      ]
      break

    default:
      stateDescriptions = [
        'BEFORE - original state',
        'TRANSITION 1', 'TRANSITION 2', 'TRANSITION 3',
        'MIDPOINT - halfway transformed',
        'TRANSITION 4', 'TRANSITION 5', 'TRANSITION 6',
        'AFTER - final transformed state'
      ]
  }

  return `A professional 3x3 grid contact sheet showing the EXACT SAME location (${locationDesc}) from the EXACT SAME camera angle in 9 different states/time periods.

CRITICAL: The camera position, angle, and framing must be IDENTICAL in all 9 cells. Only the state/condition of the location changes.

Grid layout (left to right, top to bottom):

TOP ROW:
1. ${stateDescriptions[0]}
2. ${stateDescriptions[1]}
3. ${stateDescriptions[2]}

MIDDLE ROW:
4. ${stateDescriptions[3]}
5. ${stateDescriptions[4]}
6. ${stateDescriptions[5]}

BOTTOM ROW:
7. ${stateDescriptions[6]}
8. ${stateDescriptions[7]}
9. ${stateDescriptions[8]}

STRICT REQUIREMENTS:
- EXACT same camera angle and position in every cell
- EXACT same composition and framing
- Clean thin BLACK separator lines between all cells
- Each cell must be perfectly square within the grid
- Professional before/after comparison aesthetic
- Consistent perspective throughout
- The ONLY thing that changes is the state/time/condition of the location
- No text labels or overlays in the image
- High quality, detailed rendering in each cell
- Photorealistic style maintaining reference image aesthetics`
}

export async function POST(request: NextRequest) {
  try {
    const body: BeforeAfterGridRequest = await request.json()
    const { referenceImageUrl, transformationType, customStates, locationDescription } = body

    if (!referenceImageUrl) {
      return NextResponse.json(
        { error: 'Reference image URL is required' },
        { status: 400 }
      )
    }

    // Get user from auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check credits
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (!credits || credits.balance < TOOL_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: TOOL_COST, available: credits?.balance || 0 },
        { status: 402 }
      )
    }

    // Build the prompt
    const prompt = buildBeforeAfterPrompt(transformationType, customStates, locationDescription)

    // Call Replicate API with Nano Banana Pro
    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'google/nano-banana-pro',
        input: {
          prompt,
          image: referenceImageUrl,
          aspect_ratio: '1:1', // Square for grid
          safety_tolerance: 5,
          output_format: 'png'
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('Replicate API error', { error })
      return NextResponse.json({ error: 'Failed to generate grid' }, { status: 500 })
    }

    const prediction = await response.json()

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      result = await pollResponse.json()
    }

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Generation failed', details: result.error }, { status: 500 })
    }

    // Extract output URL
    let outputUrl: string
    if (Array.isArray(result.output)) {
      outputUrl = result.output[0]
    } else if (typeof result.output === 'object' && result.output?.url) {
      outputUrl = result.output.url
    } else {
      outputUrl = result.output
    }

    // Deduct credits
    await supabase
      .from('user_credits')
      .update({ balance: credits.balance - TOOL_COST })
      .eq('user_id', user.id)

    // Log the generation
    await supabase.from('generation_events').insert({
      user_id: user.id,
      type: 'before-after-grid',
      model: 'nano-banana-pro',
      credits_used: TOOL_COST,
      metadata: {
        transformation_type: transformationType,
        reference_image: referenceImageUrl,
        output_url: outputUrl
      }
    })

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      creditsUsed: TOOL_COST,
      transformationType
    })

  } catch (error) {
    logger.api.error('Before/After Grid error', { error: error instanceof Error ? error.message : String(error) })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    lognog.error('tool_before_after_grid_failed', {
      error: errorMessage,
      tool: 'before-after-grid',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
