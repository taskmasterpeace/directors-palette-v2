import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 120

const log = createLogger('BrandStudio:ImageGen')
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const CREDIT_COST = 10
const MODEL = 'fofr/nano-banana-2'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { prompt, brandId, brandBoost, aspectRatio = '1:1' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Check credits
    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance: currentBalance }, { status: 402 })
    }

    // Brand boost enrichment
    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const supabase = await getAPIClient()
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) {
        finalPrompt = BrandBoostService.enrichImagePrompt(finalPrompt, brand as unknown as Brand)
        log.info('Brand boost applied', { brandId, originalLength: prompt.length, enrichedLength: finalPrompt.length })
      }
    }

    // Generate via Replicate
    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        output_format: 'jpg',
        output_quality: 90,
      },
    })

    log.info('Image generation started', { predictionId: prediction.id, userId: auth.user.id })

    // Poll for completion (nano-banana is fast, ~10-30s)
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      log.error('Image generation failed', { predictionId: result.id, error: result.error })
      return NextResponse.json({ error: 'Image generation failed', details: result.error }, { status: 500 })
    }

    // Get output URL
    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output from model' }, { status: 500 })
    }

    // Download and persist to Supabase storage
    const { buffer } = await StorageService.downloadAsset(outputUrl)
    const { ext, mimeType } = StorageService.getMimeType(outputUrl, 'jpg')
    const { publicUrl } = await StorageService.uploadToStorage(buffer, auth.user.id, result.id, ext, mimeType)

    // Create gallery entry
    const supabase = await getAPIClient()
    await supabase.from('gallery').insert({
      user_id: auth.user.id,
      prediction_id: result.id,
      generation_type: 'image',
      status: 'completed',
      public_url: publicUrl,
      mime_type: mimeType,
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model: MODEL,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        aspect_ratio: aspectRatio,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(auth.user.id, MODEL, {
      generationType: 'image',
      predictionId: result.id,
      description: 'Brand Studio image generation',
      overrideAmount: CREDIT_COST,
      user_email: auth.user.email,
    })

    log.info('Image generation complete', { predictionId: result.id, publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId: result.id,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Image generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
