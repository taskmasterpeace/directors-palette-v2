import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 120

const log = createLogger('BrandStudio:VideoGen')
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

const COSTS: Record<string, number> = { 'seedance-lite': 25, 'seedance-pro': 40 }
const MODELS: Record<string, string> = {
  'seedance-lite': 'seedance-community/seedance-lite:latest',
  'seedance-pro': 'seedance-community/seedance:latest',
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { prompt, brandId, brandBoost, model = 'seedance-lite', duration = 5, imageUrl } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const creditCost = COSTS[model] || 25
    const modelId = MODELS[model] || MODELS['seedance-lite']

    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < creditCost) {
      return NextResponse.json({ error: 'Insufficient credits', required: creditCost, balance: currentBalance }, { status: 402 })
    }

    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const supabase = await getAPIClient()
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) finalPrompt = BrandBoostService.enrichVideoPrompt(finalPrompt, brand as unknown as Brand)
    }

    const input: Record<string, unknown> = { prompt: finalPrompt, duration }
    if (imageUrl) input.image = imageUrl

    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : undefined

    const prediction = await replicate.predictions.create({
      model: modelId,
      input,
      ...(webhookUrl ? { webhook: webhookUrl, webhook_events_filter: ['completed'] } : {}),
    })

    log.info('Video generation started', { predictionId: prediction.id, model, userId: auth.user.id })

    // Create gallery entry (pending — webhook will finalize)
    const supabase = await getAPIClient()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('gallery').insert({
      user_id: auth.user.id,
      prediction_id: prediction.id,
      generation_type: 'video',
      status: 'pending',
      expires_at: expiresAt,
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model: modelId,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        duration,
        source: 'brand-studio',
      },
    })

    // Log generation event
    await supabase.from('generation_events').insert({
      user_id: auth.user.id,
      prediction_id: prediction.id,
      generation_type: 'video',
      model_id: modelId,
      credits_cost: creditCost,
      prompt: finalPrompt,
    })

    // Deduct credits immediately for video
    await creditsService.deductCredits(auth.user.id, modelId, {
      generationType: 'video',
      predictionId: prediction.id,
      description: `Brand Studio video generation (${model})`,
      overrideAmount: creditCost,
      user_email: auth.user.email,
    })

    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: 'pending',
      creditsUsed: creditCost,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Video generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
