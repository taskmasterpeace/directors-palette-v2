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
    const styleHints: Record<string, string> = {
      'center': 'isolated centered graphic, print-ready design',
      'left-chest': 'small compact logo design, minimal, clean',
      'back': 'large bold graphic design, detailed illustration',
      'all-over': 'seamless repeating pattern, tileable design',
      'wrap': 'wide panoramic design, wrapping artwork',
    }
    const hint = styleHints[designStyle ?? 'center'] ?? styleHints.center
    const enhancedPrompt = `${prompt.trim()}, transparent background, clean edges, vector art style, bold lines, ${hint}`

    const output = await replicate.run(RECRAFT_MODEL, {
      input: {
        prompt: enhancedPrompt,
        output_format: 'png',
        style: 'digital_illustration',
      },
    })

    const imageUrl = typeof output === 'string' ? output : (output as { url?: string })?.url ?? String(output)

    // Step 2: Background removal cleanup pass
    let cleanUrl = imageUrl
    try {
      const bgOutput = await replicate.run(BG_REMOVER_MODEL, {
        input: { image: imageUrl },
      })
      cleanUrl = typeof bgOutput === 'string' ? bgOutput : (bgOutput as { url?: string })?.url ?? String(bgOutput)
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
