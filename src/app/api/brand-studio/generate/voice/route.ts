import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 60

const log = createLogger('BrandStudio:VoiceGen')
const CREDIT_COST = 5
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB' // Adam

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { text, brandId, brandBoost, voiceId = DEFAULT_VOICE_ID, modelId = 'eleven_multilingual_v2' } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance: currentBalance }, { status: 402 })
    }

    // Get brand voice settings if brand boost is on
    let voiceSettings = { stability: 0.5, similarity_boost: 0.75 }
    if (brandBoost && brandId) {
      const supabase = await getAPIClient()
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) voiceSettings = BrandBoostService.getVoiceSettings(brand as unknown as Brand)
    }

    // Call ElevenLabs TTS
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      log.error('ElevenLabs TTS failed', { status: response.status, error: errText })
      return NextResponse.json({ error: 'Voice generation failed', details: errText }, { status: 500 })
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer()
    const predictionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Upload to Supabase storage
    const { publicUrl } = await StorageService.uploadToStorage(
      audioBuffer, auth.user.id, predictionId, 'mp3', 'audio/mpeg'
    )

    // Gallery entry
    const supabase = await getAPIClient()
    await supabase.from('gallery').insert({
      user_id: auth.user.id,
      prediction_id: predictionId,
      generation_type: 'image', // DB enum only supports image|video; metadata.source distinguishes audio
      status: 'completed',
      public_url: publicUrl,
      mime_type: 'audio/mpeg',
      metadata: {
        text: text.trim(),
        voice_id: voiceId,
        model_id: modelId,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        voice_settings: voiceSettings,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(auth.user.id, 'elevenlabs-tts', {
      generationType: 'audio',
      predictionId,
      description: 'Brand Studio voice generation',
      overrideAmount: CREDIT_COST,
      user_email: auth.user.email,
    })

    log.info('Voice generation complete', { predictionId, publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Voice generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
