/**
 * Artist DNA Generate Character Sheet API
 * Fires multiple models in parallel, returns all results so user can pick the best.
 * Models: SeeDance, Qwen, Z-Image, Nano Banana
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const CHARACTER_SHEET_TEMPLATE_URL =
  'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp'

const MODELS = [
  { id: 'nano-banana-pro', endpoint: 'google/nano-banana-pro', label: 'Nano Banana Pro', icon: '🔥' },
  { id: 'seedream-4.5', endpoint: 'bytedance/seedream-4.5', label: 'SeeDance', icon: '🌱' },
  { id: 'qwen-image-2512', endpoint: 'qwen/qwen-image-2512', label: 'Qwen', icon: '🚀' },
  { id: 'z-image-turbo', endpoint: 'prunaai/z-image-turbo', label: 'Z-Image', icon: '⚡' },
] as const

interface CharacterSheetRequest {
  stageName: string
  realName: string
  ethnicity: string
  genres: string[]
  skinTone: string
  hairStyle: string
  fashionStyle: string
  jewelry: string
  tattoos: string
  visualDescription: string
}

interface ModelResult {
  model: string
  label: string
  icon: string
  url: string | null
  error: string | null
}

function buildPrompt(req: CharacterSheetRequest): string {
  const name = req.stageName || req.realName || 'Artist'
  const genreLabel = req.genres?.length
    ? req.genres.slice(0, 3).join('/')
    : null

  const parts: string[] = [
    `CHARACTER @${name}`,
    '',
    'LAYOUT (Left to Right):',
    '',
    'SECTION 1 - FULL BODY VIEWS:',
  ]

  const descriptors: string[] = []
  if (req.ethnicity) descriptors.push(req.ethnicity)
  if (genreLabel) descriptors.push(genreLabel)
  descriptors.push('music artist')

  let frontView = `- Large front view of a ${descriptors.join(' ')}`
  if (req.skinTone) frontView += `, ${req.skinTone} skin`
  if (req.hairStyle) frontView += `, ${req.hairStyle} hair`
  if (req.fashionStyle) frontView += `, wearing ${req.fashionStyle}`
  parts.push(frontView)

  parts.push('- Side profile view, Back view')

  parts.push('')
  parts.push('SECTION 2 - EXPRESSIONS & DETAILS:')
  parts.push(`- Header: "${name}"`)
  parts.push('- EXPRESSION GRID (2x3): Neutral | Performing | Intense | Relaxed | Laughing | Mysterious')

  const detailParts: string[] = []
  if (req.jewelry) detailParts.push(`${req.jewelry} jewelry`)
  if (req.tattoos) detailParts.push(`${req.tattoos} tattoos`)
  if (detailParts.length > 0) {
    parts.push(`- CLOSE-UP DETAILS: ${detailParts.join(', ')}`)
  }
  parts.push('- ACCESSORIES: microphone, sunglasses, chains, headphones')

  parts.push('')
  parts.push('SECTION 3 - PERFORMANCE POSES:')
  parts.push('- Stage performance pose, Studio recording pose, Music video glamour pose')
  parts.push('- WARDROBE VARIANTS: streetwear, stage outfit, casual')

  if (req.visualDescription) {
    parts.push('')
    parts.push(req.visualDescription)
  }

  parts.push('')
  parts.push('STYLE: ultra realistic photograph, NOT illustration, NOT cartoon, NOT anime, NOT drawing, NOT painting. Photo quality, photorealistic, professional character reference sheet, studio photography, sharp focus, high detail, 8K resolution')

  return parts.join('\n')
}

function buildModelInput(
  modelId: string,
  prompt: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    prompt,
    output_format: 'jpg',
  }

  switch (modelId) {
    case 'seedream-4.5':
      base.aspect_ratio = '16:9'
      base.image_input = [CHARACTER_SHEET_TEMPLATE_URL]
      base.resolution = '2K'
      return base

    case 'qwen-image-2512':
      base.aspect_ratio = '16:9'
      base.image = CHARACTER_SHEET_TEMPLATE_URL
      base.strength = 0.65
      return base

    case 'z-image-turbo': {
      // Text-only — no image input, use width/height instead of aspect_ratio
      base.width = 1344
      base.height = 768
      return base
    }

    case 'nano-banana-pro':
      base.aspect_ratio = '16:9'
      base.image_input = CHARACTER_SHEET_TEMPLATE_URL
      return base

    default:
      base.aspect_ratio = '16:9'
      return base
  }
}

async function generateWithModel(
  modelId: string,
  endpoint: string,
  label: string,
  icon: string,
  prompt: string
): Promise<ModelResult> {
  try {
    const input = buildModelInput(modelId, prompt)
    const prediction = await replicate.predictions.create({
      model: endpoint,
      input,
    })
    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const url = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output
      return { model: modelId, label, icon, url: url as string, error: null }
    }

    return { model: modelId, label, icon, url: null, error: 'Generation failed' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Character sheet [${label}] error:`, msg)
    return { model: modelId, label, icon, url: null, error: msg }
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as CharacterSheetRequest

    const hasName = body.stageName || body.realName
    const hasVisual = body.skinTone || body.hairStyle || body.fashionStyle || body.visualDescription
    if (!hasName || !hasVisual) {
      return NextResponse.json(
        { error: 'A name and at least one visual field (skin tone, hair, fashion, or description) are required' },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(body)

    // Fire all models in parallel
    const results = await Promise.all(
      MODELS.map(m => generateWithModel(m.id, m.endpoint, m.label, m.icon, prompt))
    )

    return NextResponse.json({ results, prompt })
  } catch (error) {
    console.error('Character sheet generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
