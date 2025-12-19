/**
 * ElevenLabs Service for TTS and Sound Effects
 *
 * Provides text-to-speech narration and sound effects for storybooks
 */

// ElevenLabs voice options - child-friendly voices
export const ELEVENLABS_VOICES = {
  rachel: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel', description: 'Warm, nurturing female' },
  adam: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Adam', description: 'Friendly male' },
  charlotte: { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Expressive, animated female' },
  dorothy: { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'Pleasant, friendly female' },
  bella: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, soothing female' },
} as const

export type VoiceId = keyof typeof ELEVENLABS_VOICES

export interface TTSOptions {
  text: string
  voiceId?: VoiceId
  stability?: number // 0-1, default 0.5
  similarityBoost?: number // 0-1, default 0.5
  style?: number // 0-1, default 0
  speakerBoost?: boolean // default true
}

export interface TTSResult {
  audioBlob: Blob
  audioUrl: string
  duration?: number
}

export interface SoundEffectOptions {
  description: string
  duration?: number // seconds, default 10
}

export interface SoundEffectResult {
  audioBlob: Blob
  audioUrl: string
}

/**
 * ElevenLabs Text-to-Speech Service
 */
export class ElevenLabsService {
  private apiKey: string
  private baseUrl = 'https://api.elevenlabs.io/v1'

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required')
    }
    this.apiKey = apiKey
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(options: TTSOptions): Promise<TTSResult> {
    const {
      text,
      voiceId = 'rachel',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      speakerBoost = true,
    } = options

    const voice = ELEVENLABS_VOICES[voiceId]
    if (!voice) {
      throw new Error(`Unknown voice ID: ${voiceId}`)
    }

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voice.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    return {
      audioBlob,
      audioUrl,
    }
  }

  /**
   * Generate sound effects using ElevenLabs
   */
  async generateSoundEffect(options: SoundEffectOptions): Promise<SoundEffectResult> {
    const { description, duration = 10 } = options

    const response = await fetch(`${this.baseUrl}/sound-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: description,
        duration_seconds: duration,
        prompt_influence: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ElevenLabs Sound Effects error: ${response.status} - ${error}`)
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    return {
      audioBlob,
      audioUrl,
    }
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch voices')
    }

    const data = await response.json()
    return data.voices
  }

  /**
   * Check remaining characters in subscription
   */
  async getSubscriptionInfo(): Promise<{ character_count: number; character_limit: number }> {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch subscription info')
    }

    return response.json()
  }
}

/**
 * Create ElevenLabs service instance
 */
export function createElevenLabsService(apiKey?: string): ElevenLabsService {
  const key = apiKey || process.env.ELEVENLABS_API_KEY || ''
  return new ElevenLabsService(key)
}

/**
 * Pre-defined sound effects for storybooks
 */
export const STORYBOOK_SOUND_EFFECTS = {
  pageTurn: 'Gentle paper page turning sound',
  bookOpen: 'Book opening with soft creak',
  bookClose: 'Book closing with satisfying thud',
  magicSparkle: 'Magical sparkling fairy dust sound',
  forestAmbiance: 'Peaceful forest with birds chirping',
  oceanWaves: 'Gentle ocean waves on beach',
  raindrops: 'Light rain on window',
  thunderstorm: 'Distant thunder and rain',
  happyMusic: 'Light cheerful happy music box',
  mysteryMusic: 'Mysterious magical music',
} as const
