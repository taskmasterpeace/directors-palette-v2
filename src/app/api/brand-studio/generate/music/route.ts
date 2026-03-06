import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 180

const log = createLogger('BrandStudio:MusicGen')
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const CREDIT_COST = 15
const MODEL = 'minimax/music-01'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { prompt, brandId, brandBoost, duration = 30, instrumental = true } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance: currentBalance }, { status: 402 })
    }

    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const supabase = await getAPIClient()
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) finalPrompt = BrandBoostService.enrichMusicPrompt(finalPrompt, brand as unknown as Brand)
    }

    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: finalPrompt,
        duration,
        instrumental,
      },
    })

    log.info('Music generation started', { predictionId: prediction.id, userId: auth.user.id })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 3000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      log.error('Music generation failed', { predictionId: result.id, error: result.error })
      return NextResponse.json({ error: 'Music generation failed', details: result.error }, { status: 500 })
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output from model' }, { status: 500 })
    }

    // Download and persist
    const { buffer } = await StorageService.downloadAsset(outputUrl)
    const { publicUrl } = await StorageService.uploadToStorage(
      buffer, auth.user.id, result.id, 'mp3', 'audio/mpeg'
    )

    // Gallery entry
    const supabase = await getAPIClient()
    await supabase.from('gallery').insert({
      user_id: auth.user.id,
      prediction_id: result.id,
      generation_type: 'image', // DB enum only supports image|video; metadata.source distinguishes audio
      status: 'completed',
      public_url: publicUrl,
      mime_type: 'audio/mpeg',
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model: MODEL,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        duration,
        instrumental,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(auth.user.id, MODEL, {
      generationType: 'audio',
      predictionId: result.id,
      description: 'Brand Studio music generation',
      overrideAmount: CREDIT_COST,
      user_email: auth.user.email,
    })

    log.info('Music generation complete', { predictionId: result.id, publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId: result.id,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Music generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
