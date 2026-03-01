/**
 * Photo Generation API Route
 * Artist sends photos via chat using Nano Banana 2
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { LivingContext } from '@/features/music-lab/types/living-context.types'

const REPLICATE_API = 'https://api.replicate.com/v1/predictions'
const NANO_BANANA_MODEL = 'bingbangboom-lab/flux-nano-banana-2'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, dna, livingContext, photoContext } = await request.json() as {
      artistId: string
      dna: ArtistDNA
      livingContext: LivingContext | null
      photoContext: string
    }

    if (!artistId || !dna) {
      return NextResponse.json({ error: 'artistId and dna are required' }, { status: 400 })
    }

    // Deduct credits
    const deductResult = await creditsService.deductCredits(user.id, 'chat-photo', {
      generationType: 'image',
      description: `Chat photo for ${dna.identity.stageName}`,
      overrideAmount: 5,
      user_email: user.email,
    })

    if (!deductResult.success) {
      return NextResponse.json({ error: deductResult.error || 'Insufficient credits' }, { status: 402 })
    }

    // Build image prompt from artist DNA + living context
    const promptParts: string[] = []

    // Base description from Look DNA
    promptParts.push(`Photo of ${dna.identity.stageName}, a music artist.`)
    promptParts.push(`Skin tone: ${dna.look.skinTone}. Hair: ${dna.look.hairStyle}.`)
    promptParts.push(`Fashion: ${dna.look.fashionStyle}.`)
    if (dna.look.jewelry && dna.look.jewelry !== 'minimal') {
      promptParts.push(`Jewelry: ${dna.look.jewelry}.`)
    }
    if (dna.look.tattoos && dna.look.tattoos !== 'none known') {
      promptParts.push(`Tattoos: ${dna.look.tattoos}.`)
    }

    // Living context for environment
    if (livingContext) {
      promptParts.push(`Setting: ${livingContext.environment.setting}, ${livingContext.environment.vibe} vibe.`)
      promptParts.push(`Wearing: ${livingContext.environment.clothing}.`)
    }

    // Photo context (selfie, group, environment)
    if (photoContext) {
      promptParts.push(photoContext)
    }

    // Phone style affects photo quality
    if (livingContext?.phone) {
      if (livingContext.phone.photoStyle.includes('grainy') || livingContext.phone.photoStyle.includes('lo-fi')) {
        promptParts.push('Lo-fi phone camera quality, slight grain.')
      } else {
        promptParts.push('High quality phone camera selfie.')
      }
    }

    const imagePrompt = promptParts.join(' ')

    // Check for reference image
    const referenceUrl = dna.look.characterSheetUrl || dna.look.portraitUrl || null

    // Call Replicate
    const replicateBody: Record<string, unknown> = {
      version: 'latest',
      input: {
        prompt: imagePrompt,
        aspect_ratio: '1:1',
        num_outputs: 1,
      },
    }

    if (referenceUrl) {
      replicateBody.input = {
        ...replicateBody.input as Record<string, unknown>,
        image: referenceUrl,
        prompt_strength: 0.7,
      }
    }

    const replicateResponse = await fetch(REPLICATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        model: NANO_BANANA_MODEL,
        input: (replicateBody.input as Record<string, unknown>),
      }),
    })

    if (!replicateResponse.ok) {
      const error = await replicateResponse.text()
      logger.api.error('Replicate photo generation failed', { error })
      return NextResponse.json({ error: 'Failed to generate photo' }, { status: 500 })
    }

    const prediction = await replicateResponse.json()
    const imageUrl = prediction.output?.[0] || prediction.output || null

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    }

    return NextResponse.json({ imageUrl, prompt: imagePrompt })
  } catch (error) {
    logger.api.error('Photo generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
