/**
 * Sound Studio Build Prompt API Route
 * Converts natural language description into SoundStudioSettings + Suno prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { soundStudioService } from '@/features/music-lab/services/sound-studio.service'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { description, artistDna } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    const artistContext = artistDna
      ? `The artist is ${artistDna.identity?.stageName || 'unknown'}, known for ${artistDna.sound?.genres?.join(', ') || 'various genres'}. Production preferences: ${artistDna.sound?.productionPreferences?.join(', ') || 'none specified'}.`
      : ''

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Sound Studio Prompt Builder",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a music production expert that converts natural language descriptions into structured sound settings for instrumental music production. ${artistContext}

Return ONLY valid JSON (no markdown, no code fences):
{
  "genres": ["main genre(s)"],
  "subgenres": ["subgenre(s)"],
  "microgenres": ["microgenre(s)"],
  "bpm": 120,
  "moods": ["mood descriptors"],
  "energy": 50,
  "era": "decade/era or null",
  "drumDesign": ["kick/snare/hat descriptors"],
  "grooveFeel": ["groove descriptors"],
  "bassStyle": ["bass descriptors"],
  "synthTexture": ["synth/keys descriptors"],
  "harmonyColor": ["harmony descriptors"],
  "key": "C minor or null",
  "spaceFx": ["reverb/delay/processing descriptors"],
  "earCandy": ["embellishment descriptors"],
  "structure": "structure description or null",
  "instruments": ["list", "of", "instruments"],
  "productionTags": ["production", "qualities"],
  "negativeTags": ["no vocals", "no singing", "no humming", "no choir", "no spoken words"]
}

Energy is 0-100 (0=very calm, 100=maximum intensity). Always include the 5 default negative tags to ensure instrumental output. BPM should be realistic for the genre (trap: 130-160, house: 120-130, hip-hop: 80-100, etc.).`
          },
          { role: 'user', content: description },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to build prompt' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()

    let settings
    try {
      settings = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse build-prompt response', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse settings' }, { status: 500 })
    }

    // Build the Suno prompt from the settings
    const sunoPrompt = soundStudioService.buildSunoPrompt(settings)

    return NextResponse.json({ settings, sunoPrompt })
  } catch (error) {
    logger.api.error('Build prompt error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
