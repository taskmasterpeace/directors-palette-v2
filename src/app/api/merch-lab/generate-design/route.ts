import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'

export const maxDuration = 180

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ideogram V3 pricing on Replicate (per image)
// Turbo: $0.03, Balanced: $0.06, Quality: $0.09
const QUALITY_CONFIG = {
  turbo:    { model: 'ideogram-ai/ideogram-v3-turbo' as const,    costPts: 3 },
  balanced: { model: 'ideogram-ai/ideogram-v3-balanced' as const, costPts: 6 },
  quality:  { model: 'ideogram-ai/ideogram-v3-quality' as const,  costPts: 9 },
}

type QualityTier = keyof typeof QUALITY_CONFIG

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const { prompt, designStyle, designColors, count = 1, qualityTier = 'balanced' } = await request.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Validate count (1, 3, or 5)
    const batchCount = [1, 3, 5].includes(count) ? count : 1

    // Validate quality tier
    const tier: QualityTier = (qualityTier in QUALITY_CONFIG) ? qualityTier : 'balanced'
    const config = QUALITY_CONFIG[tier]
    const totalPts = config.costPts * batchCount

    // Check balance
    const balance = await creditsService.getBalance(user.id)
    if ((balance?.balance ?? 0) < totalPts) {
      return NextResponse.json({ error: 'Insufficient pts', required: totalPts }, { status: 402 })
    }

    // Build enhanced prompt with design context
    const enhancedPrompt = buildMerchPrompt(prompt.trim(), designStyle, designColors)

    // Generate all images in parallel
    const generateOne = async () => {
      const output = await replicate.run(config.model, {
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: '1:1',
          magic_prompt_option: 'AUTO',
        },
      })

      const imageUrl = extractUrl(output)
      if (!imageUrl) throw new Error('No image URL in Ideogram output')

      // Download and upload to Supabase Storage
      const imgResponse = await fetch(imageUrl)
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

      return { id, url: publicUrl }
    }

    const results = await Promise.all(
      Array.from({ length: batchCount }, () => generateOne())
    )

    // Deduct pts for all generations
    await creditsService.deductCredits(user.id, 'merch-design', {
      generationType: 'image',
      predictionId: results[0].id,
      description: `Merch Lab ${batchCount}x ${tier}: ${prompt.trim().slice(0, 40)}`,
      overrideAmount: totalPts,
      user_email: user.email,
    })

    lognog.info('merch_design_generated', {
      type: 'business',
      user_id: user.id,
      pts_charged: totalPts,
      batch_count: batchCount,
      quality_tier: tier,
    })

    return NextResponse.json({ designs: results })
  } catch (error) {
    lognog.error('merch_design_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

/** Build a merch-optimized prompt with style and color context */
function buildMerchPrompt(
  prompt: string,
  designStyle?: string,
  designColors?: string[]
): string {
  const styleHints: Record<string, string> = {
    'center': 'single isolated centered graphic, print-ready t-shirt design',
    'left-chest': 'small compact logo or emblem, minimal clean pocket-sized design',
    'back': 'large bold graphic, detailed illustration for back print',
    'all-over': 'seamless repeating pattern, tileable design for all-over print',
    'wrap': 'wide panoramic design, wrapping mug artwork',
  }

  const parts: string[] = [prompt]

  // Add color guidance if user selected design colors
  if (designColors?.length) {
    parts.push(`using the colors: ${designColors.join(', ')}`)
  }

  // Add style context
  const hint = styleHints[designStyle ?? 'center'] ?? styleHints.center
  parts.push(hint)

  // Add transparency and quality instructions
  parts.push('on transparent background, isolated graphic, crisp clean edges, high contrast, print-ready')

  return parts.join(', ')
}

/** Extract a URL string from Replicate output (handles string, FileOutput, array) */
function extractUrl(output: unknown): string | null {
  if (Array.isArray(output) && output.length > 0) {
    return extractUrl(output[0])
  }
  if (typeof output === 'string' && output.startsWith('http')) {
    return output
  }
  if (output && typeof output === 'object') {
    if ('url' in output && typeof (output as Record<string, unknown>).url === 'string') {
      return (output as Record<string, unknown>).url as string
    }
    const str = String(output)
    if (str.startsWith('http')) return str
  }
  return null
}
