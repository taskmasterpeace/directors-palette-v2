/**
 * Artist DNA Generate Character Sheet API
 * Generates a full character reference sheet via Replicate nano-banana-pro at 16:9
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const CHARACTER_SHEET_TEMPLATE_URL =
  'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp'

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

function buildPrompt(req: CharacterSheetRequest): string {
  const name = req.stageName || req.realName || 'Artist'

  // Build the artist type descriptor from genres
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

  // Build front view description with natural grammar
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
  parts.push('- COLOR PALETTE strip: skin, hair, outfit, accent, jewelry colors')

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
  parts.push('STYLE: photo quality, photo realistic, professional character reference sheet with full body views, expressions grid, close-up details, accessories, performance poses')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as CharacterSheetRequest

    // Validate: must have a name and at least one visual field
    const hasName = body.stageName || body.realName
    const hasVisual = body.skinTone || body.hairStyle || body.fashionStyle || body.visualDescription
    if (!hasName || !hasVisual) {
      return NextResponse.json(
        { error: 'A name and at least one visual field (skin tone, hair, fashion, or description) are required' },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(body)

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'jpg',
        image_input: CHARACTER_SHEET_TEMPLATE_URL,
      },
    })

    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const url = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output
      return NextResponse.json({ url })
    }

    return NextResponse.json({ error: 'Character sheet generation failed' }, { status: 500 })
  } catch (error) {
    console.error('Character sheet generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
