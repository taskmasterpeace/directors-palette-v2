/**
 * Artist DNA Generate Photo Shoot API
 * Takes a scene ID + artist DNA, builds the dynamic prompt, generates with nano-banana-2.
 * Uses the character sheet as reference image for identity lock.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'
import { persistToLibrary } from '../persist-to-library'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { buildPhotoShootPrompt } from '@/features/music-lab/services/photo-shoot.service'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface PhotoShootRequest {
  sceneId: string
  dna: ArtistDNA
  characterSheetUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as PhotoShootRequest

    if (!body.sceneId || !body.dna) {
      return NextResponse.json(
        { error: 'sceneId and dna are required' },
        { status: 400 }
      )
    }

    const result = buildPhotoShootPrompt(body.sceneId, body.dna)
    if (!result) {
      return NextResponse.json(
        { error: `Unknown scene: ${body.sceneId}` },
        { status: 400 }
      )
    }

    const input: Record<string, unknown> = {
      prompt: result.prompt,
      aspect_ratio: result.aspectRatio,
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
    const completed = await replicate.wait(prediction, { interval: 1000 })

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
        aspectRatio: result.aspectRatio,
        prompt: result.prompt,
        addToReferenceLibrary: false,
      })

      const url = persisted?.publicUrl || replicateUrl
      return NextResponse.json({ url, prompt: result.prompt, aspectRatio: result.aspectRatio, galleryId: persisted?.galleryId })
    }

    return NextResponse.json({ error: 'Photo shoot generation failed' }, { status: 500 })
  } catch (error) {
    logger.api.error('Photo shoot generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
