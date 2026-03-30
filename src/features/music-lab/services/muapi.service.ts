import { createLogger } from '@/lib/logger'
import type { GenerateRequest } from '../types/generation.types'

const log = createLogger('MuAPI')

const MUAPI_BASE = 'https://muapi.ai/api/v1'

function getApiKey(): string {
  const key = process.env.MUAPI_KEY
  if (!key) throw new Error('MUAPI_KEY env var is not set')
  return key
}

interface MuAPIGenerateResponse {
  id: string
  status: string
}

interface MuAPIPollResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio?: Array<{ url: string; duration?: number }>
  error?: string
}

/**
 * Submit a music generation request to MuAPI (Suno proxy)
 */
export async function submitGeneration(req: GenerateRequest): Promise<{ requestId: string }> {
  const body: Record<string, unknown> = {
    style: req.stylePrompt,
    custom_mode: true,
    title: req.title,
    model: 'v4',
  }

  if (req.mode === 'song') {
    body.prompt = req.lyricsPrompt
    body.instrumental = false
    if (req.vocalGender) body.vocal_gender = req.vocalGender
  } else {
    body.prompt = ''
    body.instrumental = true
  }

  if (req.excludePrompt) {
    body.negative_tags = req.excludePrompt
  }

  log.info('Submitting generation', { mode: req.mode, title: req.title })

  const response = await fetch(`${MUAPI_BASE}/suno-create-music`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    log.error('MuAPI generate failed', { status: response.status, error: errText })
    throw new Error(`MuAPI generation failed: ${response.status} - ${errText}`)
  }

  const data: MuAPIGenerateResponse = await response.json()
  log.info('Generation submitted', { requestId: data.id })

  return { requestId: data.id }
}

/**
 * Poll MuAPI for generation status
 */
export async function pollGenerationStatus(requestId: string): Promise<MuAPIPollResponse> {
  const response = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    method: 'GET',
    headers: {
      'x-api-key': getApiKey(),
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    log.error('MuAPI poll failed', { requestId, status: response.status, error: errText })
    throw new Error(`MuAPI poll failed: ${response.status}`)
  }

  return response.json()
}
