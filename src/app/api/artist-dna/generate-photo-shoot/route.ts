/**
 * Artist DNA Generate Photo Shoot API
 * Accepts either a pre-built prompt + aspectRatio from the client,
 * or a sceneId to build the prompt server-side from artist DNA.
 * Generates with nano-banana-2. Uses the character sheet as reference image for identity lock.
 */

export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'
import { creditsService } from '@/features/credits/services/credits.service'
import { persistToLibrary } from '../persist-to-library'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { buildPhotoShootPrompt } from '@/features/music-lab/services/photo-shoot.service'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface PhotoShootRequest {
  sceneId?: string          // Legacy: look up scene by ID
  prompt?: string           // New: pre-built prompt from client
  aspectRatio?: string      // New: comes with prompt
  dna: ArtistDNA
  characterSheetUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as PhotoShootRequest

    if (!body.dna) {
      return NextResponse.json(
        { error: 'dna is required' },
        { status: 400 }
      )
    }

    // Deduct credits (nano-banana-2 @ 1K = 10 pts)
    const deductResult = await creditsService.deductCredits(auth.user.id, 'nano-banana-2', {
      generationType: 'image',
      description: 'Artist DNA: photo shoot generation',
      overrideAmount: 10,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: deductResult.error || 'Insufficient credits' }, { status: 402 })
    }

    let finalPrompt: string
    let finalAspectRatio: string

    if (body.prompt && body.aspectRatio) {
      // New path: prompt built client-side with recipe field values
      finalPrompt = body.prompt
      finalAspectRatio = body.aspectRatio
    } else if (body.sceneId) {
      // Legacy path: build prompt from scene ID
      const result = buildPhotoShootPrompt(body.sceneId, body.dna)
      if (!result) {
        return NextResponse.json(
          { error: `Unknown scene: ${body.sceneId}` },
          { status: 400 }
        )
      }
      finalPrompt = result.prompt
      finalAspectRatio = result.aspectRatio
    } else {
      return NextResponse.json(
        { error: 'prompt+aspectRatio or sceneId required' },
        { status: 400 }
      )
    }

    const input: Record<string, unknown> = {
      prompt: finalPrompt,
      aspect_ratio: finalAspectRatio,
      output_format: 'jpg',
    }

    // Use character sheet as identity reference if available
    if (body.characterSheetUrl) {
      input.image_input = [body.characterSheetUrl]
    }

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input,
    })
    const completed = await replicate.wait(prediction, { interval: 2000 })

    if (completed.status === 'succeeded' && completed.output) {
      const replicateUrl = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output

      // Persist to Supabase storage (permanent URL) but NOT to reference library
      const artistName = body.dna.identity?.stageName || body.dna.identity?.realName || 'Artist'
      const persisted = await persistToLibrary({
        imageUrl: replicateUrl,
        userId: auth.user.id,
        artistName,
        type: 'photo-shoot',
        aspectRatio: finalAspectRatio,
        prompt: finalPrompt,
        addToReferenceLibrary: false,
      })

      const url = persisted?.publicUrl || replicateUrl
      return NextResponse.json({ url, prompt: finalPrompt, aspectRatio: finalAspectRatio, galleryId: persisted?.galleryId })
    }

    return NextResponse.json({ error: 'Photo shoot generation failed' }, { status: 500 })
  } catch (error) {
    logger.api.error('Photo shoot generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
