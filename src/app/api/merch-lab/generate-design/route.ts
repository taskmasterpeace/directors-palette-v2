import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'

export const maxDuration = 120

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DESIGN_PTS = 5
const RECRAFT_MODEL = 'recraft-ai/recraft-v3'
const BG_REMOVER_MODEL = '851-labs/background-remover'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check balance
    const balance = await creditsService.getBalance(user.id)
    if ((balance?.balance ?? 0) < DESIGN_PTS) {
      return NextResponse.json({ error: 'Insufficient pts', required: DESIGN_PTS }, { status: 402 })
    }

    const { prompt, designStyle } = await request.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Step 1: Generate with Recraft V3 (native transparent background)
    // Prompt engineering: we're generating print-ready designs for merchandise
    // The model needs clear instructions about isolation and transparency
    const styleHints: Record<string, string> = {
      'center': 'single isolated centered graphic on empty transparent background, print-ready t-shirt design',
      'left-chest': 'small compact logo or emblem on empty transparent background, minimal clean pocket-sized design',
      'back': 'large bold graphic on empty transparent background, detailed illustration for back print',
      'all-over': 'seamless repeating pattern, tileable design for all-over print',
      'wrap': 'wide panoramic design on empty transparent background, wrapping mug artwork',
    }
    const hint = styleHints[designStyle ?? 'center'] ?? styleHints.center
    const enhancedPrompt = `${prompt.trim()}, ${hint}, no background, isolated on transparent, crisp clean edges, high contrast, vector art style, bold lines, print-ready`

    const output = await replicate.run(RECRAFT_MODEL, {
      input: {
        prompt: enhancedPrompt,
        output_format: 'png',
        style: 'digital_illustration',
      },
    })

    // Replicate SDK returns FileOutput objects — extract URL safely
    const imageUrl = extractUrl(output)
    if (!imageUrl) throw new Error('No image URL in Recraft output')

    // Step 2: Background removal cleanup pass
    let cleanUrl = imageUrl
    try {
      const bgOutput = await replicate.run(BG_REMOVER_MODEL, {
        input: { image: imageUrl },
      })
      const bgUrl = extractUrl(bgOutput)
      if (bgUrl) cleanUrl = bgUrl
    } catch (bgErr) {
      lognog.warn('merch_bg_removal_failed', { error: String(bgErr) })
    }

    // Step 3: Download and upload to Supabase Storage
    const imgResponse = await fetch(cleanUrl)
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer())
    const id = randomUUID()
    const storagePath = `merch-lab/${user.id}/${id}.png`

    const { error: uploadError } = await supabase.storage
      .from('directors-palette')
      .upload(storagePath, imgBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('directors-palette')
      .getPublicUrl(storagePath)

    // Step 4: Deduct pts
    await creditsService.deductCredits(user.id, 'merch-design', {
      generationType: 'image',
      predictionId: id,
      description: `Merch Lab design: ${prompt.trim().slice(0, 50)}`,
      overrideAmount: DESIGN_PTS,
      user_email: user.email,
    })

    lognog.info('merch_design_generated', {
      type: 'business',
      user_id: user.id,
      pts_charged: DESIGN_PTS,
    })

    return NextResponse.json({ id, url: publicUrl })
  } catch (error) {
    lognog.error('merch_design_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

/** Extract a URL string from Replicate output (handles string, FileOutput, array) */
function extractUrl(output: unknown): string | null {
  // Array output (some models return [url])
  if (Array.isArray(output) && output.length > 0) {
    return extractUrl(output[0])
  }
  // Plain string
  if (typeof output === 'string' && output.startsWith('http')) {
    return output
  }
  // FileOutput object — has .url property or toString() returns the URL
  if (output && typeof output === 'object') {
    if ('url' in output && typeof (output as Record<string, unknown>).url === 'string') {
      return (output as Record<string, unknown>).url as string
    }
    const str = String(output)
    if (str.startsWith('http')) return str
  }
  return null
}
