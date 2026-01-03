/**
 * Storybook Sound Effects API Endpoint
 * Uses ElevenLabs to generate sound effects for storybooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

interface SoundEffectRequest {
  description: string
  duration?: number // seconds, default 5
}

interface SoundEffectResponse {
  audioUrl: string
}

// Pre-defined sound effects for common storybook needs
const PRESET_EFFECTS: Record<string, string> = {
  'page-turn': 'Gentle paper page turning sound, subtle and satisfying',
  'book-open': 'Book opening with soft pages rustling',
  'book-close': 'Book closing with gentle thud',
  'magic-sparkle': 'Magical sparkling fairy dust sound, whimsical',
  'happy-ending': 'Joyful triumphant magical chime, happy ending',
  'once-upon-a-time': 'Dreamy harp glissando, story beginning',
  'the-end': 'Soft chime bells, gentle story ending',
}

export async function POST(request: NextRequest) {
  const apiStart = Date.now()
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    // Verify authentication FIRST
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    userId = user.id
    userEmail = user.email

    console.log(`[Storybook API] sound-effects (ElevenLabs) called by user ${user.id}`)

    const body: SoundEffectRequest = await request.json()
    let { description } = body
    const { duration = 5 } = body

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Check for preset effects
    const preset = PRESET_EFFECTS[description.toLowerCase()]
    if (preset) {
      description = preset
    }

    // Call ElevenLabs Sound Generation API
    const elevenLabsStart = Date.now()
    const response = await fetch(
      'https://api.elevenlabs.io/v1/sound-generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: description,
          duration_seconds: Math.min(duration, 22), // Max 22 seconds
          prompt_influence: 0.3,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs Sound Effects error:', error)

      lognog.warn(`elevenlabs FAIL ${Date.now() - elevenLabsStart}ms`, {
        type: 'integration',
        integration: 'elevenlabs',
        latency_ms: Date.now() - elevenLabsStart,
        http_status: response.status,
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to generate sound effect' },
        { status: 500 }
      )
    }

    lognog.debug(`elevenlabs OK ${Date.now() - elevenLabsStart}ms`, {
      type: 'integration',
      integration: 'elevenlabs',
      latency_ms: Date.now() - elevenLabsStart,
      http_status: 200,
      prompt_length: description.length,
      user_id: userId,
      user_email: userEmail,
    })

    // Return audio as base64 data URL
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

    lognog.info(`POST /api/storybook/sound-effects 200 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/sound-effects',
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      integration: 'elevenlabs',
    })

    return NextResponse.json({
      audioUrl,
    } as SoundEffectResponse)

  } catch (error) {
    console.error('Error in sound-effects:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/sound-effects',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.info(`POST /api/storybook/sound-effects 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/sound-effects',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
