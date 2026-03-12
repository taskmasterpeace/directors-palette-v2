import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'

export const maxDuration = 180

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ideogram Direct API pricing (transparent endpoint X1) + Real-ESRGAN upscale ($0.01)
// Turbo: $0.04 + $0.01 = $0.05, Default: $0.07 + $0.01 = $0.08, Quality: $0.10 + $0.01 = $0.11
const QUALITY_CONFIG = {
  turbo:    { renderingSpeed: 'TURBO' as const,   costPts: 6 },
  balanced: { renderingSpeed: 'DEFAULT' as const,  costPts: 8 },
  quality:  { renderingSpeed: 'QUALITY' as const,  costPts: 11 },
}

type QualityTier = keyof typeof QUALITY_CONFIG

// Map design styles to optimal aspect ratios for Printify print areas
// T-shirt front: 2767×3362 (~4:5), Hoodie front: 2919×1944 (~3:2), Mug: 2475×1155 (~2:1), Tote: 2102×4051 (~1:2)
const STYLE_ASPECT_RATIOS: Record<string, string> = {
  'center': '4x5',       // Portrait — fits t-shirt/hoodie front center
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

    // Build enhanced prompt
    const enhancedPrompt = buildMerchPrompt(prompt.trim(), designStyle, designColors)
    const aspectRatio = STYLE_ASPECT_RATIOS[designStyle ?? 'center'] ?? '4x5'

    // Generate all images in parallel
    const generateOne = async () => {
      // Step 1: Generate transparent image via Ideogram Direct API
      const ideogramRes = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate-transparent', {
        method: 'POST',
        headers: {
          'Api-Key': IDEOGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          rendering_speed: config.renderingSpeed,
          aspect_ratio: aspectRatio,
          magic_prompt: 'Auto',
          num_images: 1,
        }),
      })

      if (!ideogramRes.ok) {
        const errBody = await ideogramRes.text()
        throw new Error(`Ideogram API error ${ideogramRes.status}: ${errBody}`)
      }

      const ideogramData = await ideogramRes.json()
      const generatedUrl = ideogramData.data?.[0]?.url
      if (!generatedUrl) throw new Error('No image URL in Ideogram response')

      // Step 2: Upscale with Real-ESRGAN via Replicate for print-ready resolution
      const upscaleOutput = await replicate.run('nightmareai/real-esrgan:b3ef194191d13140337468c916c2c5b96dd0cb06dffc032a022a31807f6a5ea8', {
        input: {
          image: generatedUrl,
          scale: 2,
          face_enhance: false,
        },
      })

      const upscaledUrl = extractUrl(upscaleOutput)
      if (!upscaledUrl) throw new Error('Upscale failed — no output URL')

      // Step 3: Download upscaled image and upload to Supabase Storage
      const imgResponse = await fetch(upscaledUrl)
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

  // Add quality instructions (no need to mention transparent — the endpoint handles it)
  parts.push('isolated graphic, crisp clean edges, high contrast, print-ready')

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
