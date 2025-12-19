/**
 * Storybook Sound Effects API Endpoint
 * Uses ElevenLabs to generate sound effects for storybooks
 */

import { NextRequest, NextResponse } from 'next/server'

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
  try {
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
      return NextResponse.json(
        { error: 'Failed to generate sound effect' },
        { status: 500 }
      )
    }

    // Return audio as base64 data URL
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

    return NextResponse.json({
      audioUrl,
    } as SoundEffectResponse)

  } catch (error) {
    console.error('Error in sound-effects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
