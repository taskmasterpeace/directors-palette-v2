/**
 * Artist DNA Generate Portrait API
 * Generates an artist portrait via Replicate nano-banana
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'
import { persistToLibrary } from '../persist-to-library'
import { pickRandomWardrobe } from '@/features/music-lab/data/wardrobe-wildcards'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface PortraitRequest {
  skinTone: string
  hairStyle: string
  fashionStyle: string
  wardrobeStyle?: string  // wardrobe wildcard category — overrides fashionStyle with random outfit
  jewelry: string
  tattoos: string
  visualDescription: string
  ethnicity: string
  stageName?: string
  realName?: string
  characterSheetUrl?: string  // reference image to maintain character consistency
}

function buildPrompt(req: PortraitRequest): string {
  // Build natural-reading description
  const descriptors: string[] = []
  if (req.ethnicity) descriptors.push(req.ethnicity)
  descriptors.push('music artist')

  let description = `Portrait of a ${descriptors.join(' ')}`
  if (req.skinTone) description += ` with ${req.skinTone} skin`
  if (req.hairStyle) description += `, ${req.hairStyle} hair`

  // Resolve wardrobe: if wardrobeStyle is set, pick a random outfit; else fall back to fashionStyle
  const outfit = req.wardrobeStyle
    ? pickRandomWardrobe(req.wardrobeStyle) || req.fashionStyle
    : req.fashionStyle

  const details: string[] = []
  if (outfit) details.push(`Wearing ${outfit}`)
  if (req.jewelry) details.push(req.jewelry)
  if (req.tattoos) details.push(req.tattoos)
  if (req.visualDescription) details.push(req.visualDescription)

  const suffix = req.characterSheetUrl
    ? 'Portrait headshot of EXACT SAME PERSON from the character reference sheet, identical face and features, studio lighting, high quality portrait photography'
    : 'Professional headshot, studio lighting, high quality portrait photography'
  const allParts = [description, ...details, suffix]
  return allParts.filter(Boolean).join('. ') + '.'
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as PortraitRequest

    const prompt = buildPrompt(body)

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: '1:1',
      output_format: 'jpg',
    }

    // Use character sheet as reference so portrait matches the same character
    if (body.characterSheetUrl) {
      input.image_input = [body.characterSheetUrl]
    }

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input,
    })

    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const replicateUrl = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output

      // Persist to Supabase storage (no reference library — character sheet is the identity anchor)
      const artistName = body.stageName || body.realName || 'Artist'
      const persisted = await persistToLibrary({
        imageUrl: replicateUrl,
        userId: auth.user.id,
        artistName,
        type: 'portrait',
        aspectRatio: '1:1',
        prompt,
        addToReferenceLibrary: false,
      })

      const url = persisted?.publicUrl || replicateUrl
      return NextResponse.json({ url, galleryId: persisted?.galleryId })
    }

    return NextResponse.json({ error: 'Portrait generation failed' }, { status: 500 })
  } catch (error) {
    logger.api.error('Portrait generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
