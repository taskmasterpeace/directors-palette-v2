import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'

export const maxDuration = 180

const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY!
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- Pricing configs per model ---

const IDEOGRAM_QUALITY = {
  turbo:    { renderingSpeed: 'TURBO' as const,   costPts: 20 },
  balanced: { renderingSpeed: 'DEFAULT' as const,  costPts: 24 },
  quality:  { renderingSpeed: 'QUALITY' as const,  costPts: 28 },
}

const NB2_QUALITY = {
  turbo:    { resolution: '1K',  costPts: 13 },
  balanced: { resolution: '2K',  costPts: 20 },
  quality:  { resolution: '4K',  costPts: 30 },
}

type QualityTier = 'turbo' | 'balanced' | 'quality'
type DesignModel = 'ideogram' | 'nano-banana'

// Map design styles to aspect ratios
// T-shirt front: 2767×3362 (~4:5), Hoodie: 2919×1944 (~3:2), Mug: 2475×1155 (~2:1), Tote: 2102×4051 (~1:2)
const IDEOGRAM_ASPECT_RATIOS: Record<string, string> = {
  'center': '4x5',
  'left-chest': '1x1',
  'back': '4x5',
  'all-over': '1x1',
  'wrap': '2x1',
  'full-bleed': '3x4',
}

const NB2_ASPECT_RATIOS: Record<string, string> = {
  'center': '4:5',
  'left-chest': '1:1',
  'back': '4:5',
  'all-over': '1:1',
  'wrap': '2:1',
  'full-bleed': '3:4',
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const {
      prompt,
      designStyle,
      designColors,
      designModel = 'ideogram',
      count = 1,
      qualityTier = 'balanced',
    } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const batchCount = [1, 3, 5].includes(count) ? count : 1
    const tier: QualityTier = ['turbo', 'balanced', 'quality'].includes(qualityTier) ? qualityTier : 'balanced'
    const model: DesignModel = designModel === 'nano-banana' ? 'nano-banana' : 'ideogram'

    // Calculate cost based on model
    const costPts = model === 'ideogram'
      ? IDEOGRAM_QUALITY[tier].costPts
      : NB2_QUALITY[tier].costPts
    const totalPts = costPts * batchCount

    // Check balance
    const balance = await creditsService.getBalance(user.id)
    if ((balance?.balance ?? 0) < totalPts) {
      return NextResponse.json({ error: 'Insufficient pts', required: totalPts }, { status: 402 })
    }

    const enhancedPrompt = buildMerchPrompt(prompt.trim(), designStyle, designColors)

    // Generate all images in parallel
    const generateOne = model === 'ideogram'
      ? () => generateIdeogram(enhancedPrompt, tier, designStyle, user.id)
      : () => generateNanoBanana(enhancedPrompt, tier, designStyle, user.id)

    const results = await Promise.all(
      Array.from({ length: batchCount }, () => generateOne())
    )

    await creditsService.deductCredits(user.id, 'merch-design', {
      generationType: 'image',
      predictionId: results[0].id,
      description: `Merch Lab ${model} ${batchCount}x ${tier}: ${prompt.trim().slice(0, 40)}`,
      overrideAmount: totalPts,
      user_email: user.email,
    })

    lognog.info('merch_design_generated', {
      type: 'business',
      user_id: user.id,
      pts_charged: totalPts,
      batch_count: batchCount,
      quality_tier: tier,
      model,
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

// --- Ideogram V3 Transparent ---

async function generateIdeogram(prompt: string, tier: QualityTier, designStyle: string | undefined, userId: string) {
  const config = IDEOGRAM_QUALITY[tier]
  const aspectRatio = IDEOGRAM_ASPECT_RATIOS[designStyle ?? 'center'] ?? '4x5'

  const res = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate-transparent', {
    method: 'POST',
    headers: {
      'Api-Key': IDEOGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      rendering_speed: config.renderingSpeed,
      aspect_ratio: aspectRatio,
      upscale_factor: 'X2',
      magic_prompt: 'AUTO',
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

  return uploadToStorage(imageUrl, userId)
}

// --- Nano Banana 2 Transparent ---

async function generateNanoBanana(prompt: string, tier: QualityTier, designStyle: string | undefined, userId: string) {
  const config = NB2_QUALITY[tier]
  const aspectRatio = NB2_ASPECT_RATIOS[designStyle ?? 'center'] ?? '4:5'

  const output = await replicate.run(
    'jide/nano-banana-2-transparent:b05694d7b0ec33a9798688591a140c2b41491f6a7e99a789ab938686cfe14226',
    {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: config.resolution,
      },
    }
  )

  // Output is a URL string or ReadableStream
  const imageUrl = typeof output === 'string'
    ? output
    : Array.isArray(output)
      ? output[0]
      : String(output)

  if (!imageUrl) throw new Error('No image URL in Nano Banana response')

  return uploadToStorage(imageUrl, userId)
}

// --- Shared: download + upload to Supabase ---

async function uploadToStorage(imageUrl: string, userId: string) {
  const imgResponse = await fetch(imageUrl)
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer())
  const id = randomUUID()
  const storagePath = `merch-lab/${userId}/${id}.png`

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
    'full-bleed': 'full bleed edge-to-edge artwork, poster or canvas print',
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
