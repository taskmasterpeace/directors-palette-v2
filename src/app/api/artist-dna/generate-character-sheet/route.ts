/**
 * Artist DNA Generate Character Sheet API
 * Single model (Nano Banana Pro) — returns { url, prompt }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'

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
  const genreLabel = req.genres?.length
    ? req.genres.slice(0, 3).join('/')
    : null

  const parts: string[] = [
    `CHARACTER IDENTITY REFERENCE: @${name}`,
    'EXACT SAME PERSON in every panel, consistent tattoo placement, identical physical features across all views.',
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

  // COLOR REFERENCE — exact physical colors
  const colorRefs: string[] = []
  if (req.skinTone) colorRefs.push(`Skin: ${req.skinTone}`)
  if (req.hairStyle) colorRefs.push(`Hair: ${req.hairStyle}`)
  if (colorRefs.length > 0) {
    parts.push('')
    parts.push('COLOR REFERENCE (must match in every panel):')
    colorRefs.forEach(ref => parts.push(`- ${ref}`))
  }

  // BODY TYPE / BUILD from visual description
  if (req.visualDescription) {
    parts.push('')
    parts.push('BODY TYPE / BUILD:')
    parts.push(`- ${req.visualDescription}`)
  }

  // TATTOO MAP — explicit placement
  if (req.tattoos) {
    parts.push('')
    parts.push('TATTOO MAP (must appear in every relevant view):')
    parts.push(`- ${req.tattoos}`)
    parts.push('- Show tattoos clearly in front, side, and back views with IDENTICAL placement')
  }

  // DISTINGUISHING MARKS — jewelry, piercings, unique features
  const marks: string[] = []
  if (req.jewelry) marks.push(req.jewelry)
  if (marks.length > 0) {
    parts.push('')
    parts.push('DISTINGUISHING MARKS:')
    marks.forEach(mark => parts.push(`- ${mark}`))
  }

  parts.push('')
  parts.push('SECTION 2 - EXPRESSIONS & DETAILS:')
  parts.push(`- Header: "${name}"`)
  parts.push('- EXPRESSION GRID (2x3): Neutral | Performing | Intense | Relaxed | Laughing | Mysterious')

  const detailParts: string[] = []
  if (req.jewelry) detailParts.push(`${req.jewelry} jewelry close-ups`)
  if (req.tattoos) detailParts.push(`${req.tattoos} tattoo close-ups showing exact placement`)
  if (detailParts.length > 0) {
    parts.push(`- CLOSE-UP DETAILS: ${detailParts.join(', ')}`)
  }
  parts.push('- ACCESSORIES: microphone, sunglasses, chains, headphones')

  parts.push('')
  parts.push('SECTION 3 - PERFORMANCE POSES:')
  parts.push('- Stage performance pose, Studio recording pose, Music video glamour pose')
  parts.push('- WARDROBE VARIANTS: streetwear, stage outfit, casual')

  parts.push('')
  parts.push('STYLE: ultra realistic photograph, NOT illustration, NOT cartoon, NOT anime, NOT drawing, NOT painting. Photo quality, photorealistic, professional character reference sheet, studio photography, sharp focus, high detail, 8K resolution. EXACT SAME PERSON in every panel — identical face, body, skin tone, tattoos, and distinguishing features across all views.')

  return parts.join('\n')
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

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input: {
        prompt,
        aspect_ratio: '16:9',
        image_input: [CHARACTER_SHEET_TEMPLATE_URL],
        output_format: 'jpg',
      },
    })
    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const url = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output
      return NextResponse.json({ url, prompt })
    }

    return NextResponse.json({ error: 'Character sheet generation failed' }, { status: 500 })
  } catch (error) {
    logger.api.error('Character sheet generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
