import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'

export const maxDuration = 180

const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ideogram Direct API — transparent endpoint with X2 upscale (one call, print-ready)
// Pricing: https://ideogram.ai/features/api-pricing
const QUALITY_CONFIG = {
  turbo:    { renderingSpeed: 'TURBO' as const,   costPts: 20 },
  balanced: { renderingSpeed: 'DEFAULT' as const,  costPts: 24 },
  quality:  { renderingSpeed: 'QUALITY' as const,  costPts: 28 },
}

type QualityTier = keyof typeof QUALITY_CONFIG

// Map design styles to optimal aspect ratios for Printify print areas
// T-shirt front: 2767×3362 (~4:5), Hoodie: 2919×1944 (~3:2), Mug: 2475×1155 (~2:1), Tote: 2102×4051 (~1:2)
const STYLE_ASPECT_RATIOS: Record<string, string> = {
  'center': '4x5',       // Portrait — fits t-shirt/hoodie front
  'left-chest': '1x1',   // Square — small logo area
  'back': '4x5',         // Portrait — same as front
  'all-over': '1x1',     // Square — tileable pattern
  'wrap': '2x1',         // Landscape — mug wrap
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const { prompt, designStyle, designColors, count = 1, qualityTier = 'balanced' } = await request.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const batchCount = [1, 3, 5].includes(count) ? count : 1

    const tier: QualityTier = (qualityTier in QUALITY_CONFIG) ? qualityTier : 'balanced'
    const config = QUALITY_CONFIG[tier]
    const totalPts = config.costPts * batchCount

    // Check balance
    const balance = await creditsService.getBalance(user.id)
    if ((balance?.balance ?? 0) < totalPts) {
      return NextResponse.json({ error: 'Insufficient pts', required: totalPts }, { status: 402 })
    }

    const enhancedPrompt = buildMerchPrompt(prompt.trim(), designStyle, designColors)
    const aspectRatio = STYLE_ASPECT_RATIOS[designStyle ?? 'center'] ?? '4x5'

    // Generate all images in parallel — one Ideogram call per image
    const generateOne = async () => {
      // Single API call: transparent PNG + X2 upscale = print-ready output
      const res = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate-transparent', {
        method: 'POST',
        headers: {
          'Api-Key': IDEOGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          rendering_speed: config.renderingSpeed,
          aspect_ratio: aspectRatio,
          upscale_factor: 'X2',
          magic_prompt: 'Auto',
          num_images: 1,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Ideogram API error ${res.status}: ${errBody}`)
      }

      const data = await res.json()
      const imageUrl = data.data?.[0]?.url
      if (!imageUrl) throw new Error('No image URL in Ideogram response')

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

  if (designColors?.length) {
    parts.push(`using the colors: ${designColors.join(', ')}`)
  }

  const hint = styleHints[designStyle ?? 'center'] ?? styleHints.center
  parts.push(hint)
  parts.push('isolated graphic, crisp clean edges, high contrast, print-ready')

  return parts.join(', ')
}
