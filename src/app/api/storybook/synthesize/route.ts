/**
 * Storybook TTS Synthesis API Endpoint
 * Uses ElevenLabs to generate narration for storybook pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

// ElevenLabs voice options
const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: 'EXAVITQu4vr4xnSDxMaL',
  adam: 'IKne3meq5aSn9XLyUdCD',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  dorothy: 'ThT5KcBeYPX3keUQqHPh',
}

interface SynthesizeRequest {
  text: string
  voiceId?: string
  projectId?: string // For storing audio in Supabase
  pageNumber?: number
}

interface SynthesizeResponse {
  audioUrl: string
  duration?: number
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication FIRST
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    console.log(`[Storybook API] synthesize (ElevenLabs TTS) called by user ${user.id}`)

    const body: SynthesizeRequest = await request.json()
    const { text, voiceId = 'rachel', projectId, pageNumber } = body

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
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

    // Get voice ID
    const elevenLabsVoiceId = ELEVENLABS_VOICES[voiceId] || ELEVENLABS_VOICES.rachel

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      return NextResponse.json(
        { error: 'Failed to synthesize speech' },
        { status: 500 }
      )
    }

    // Get audio as array buffer
    const audioBuffer = await response.arrayBuffer()

    // If projectId is provided, upload to Supabase Storage
    if (projectId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const fileName = `storybook/${projectId}/audio_page_${pageNumber || Date.now()}.mp3`

        const { error: uploadError } = await supabase.storage
          .from('generations')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('generations')
            .getPublicUrl(fileName)

          return NextResponse.json({
            audioUrl: urlData.publicUrl,
          } as SynthesizeResponse)
        }

        // Log detailed error for debugging in production
        console.error('[storybook/synthesize] Supabase storage FAILED:', {
          error: uploadError.message,
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          projectId,
          fileName,
        })
      } else {
        console.warn('[storybook/synthesize] Missing Supabase env vars:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          projectId,
        })
      }
    }

    // Fallback to base64 only for small audio (< 500KB) to prevent memory issues
    // Large audio files should always be stored in Supabase
    const MAX_BASE64_SIZE = 500 * 1024 // 500KB limit for base64 fallback

    if (audioBuffer.byteLength > MAX_BASE64_SIZE) {
      console.error('[storybook/synthesize] Audio too large for base64 fallback:', {
        size: audioBuffer.byteLength,
        maxSize: MAX_BASE64_SIZE,
        projectId,
      })
      return NextResponse.json(
        { error: 'Audio storage failed and file too large for fallback' },
        { status: 500 }
      )
    }

    // Return audio as base64 data URL for small files only
    console.warn('[storybook/synthesize] Using base64 fallback (storage unavailable):', {
      size: audioBuffer.byteLength,
      projectId,
    })
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

    return NextResponse.json({
      audioUrl,
      isBase64Fallback: true, // Let client know this is a fallback
    } as SynthesizeResponse & { isBase64Fallback?: boolean })

  } catch (error) {
    console.error('Error in synthesize:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
