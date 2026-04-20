/**
 * POST /api/recipes/audio-wrap/generate
 *
 * Wraps a ~15s audio segment into a black-screen MP4. Idempotent — a
 * repeat request with identical (user, audioUrl, start, end) returns
 * the cached file instead of re-encoding.
 *
 * Body:
 * {
 *   audioUrl: string,
 *   startS: number,
 *   endS: number,        // <= startS + 15
 *   label: string        // free-form tag, e.g. `${songId}_${segmentId}`
 * }
 *
 * Response 200:
 * { id, audioClipUrl, storagePath, durationS, fileSize, cached, createdAt }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { wrapAudioToMp4 } from '@/features/recipes/audio-wrap'
import type { AudioWrapInput } from '@/features/recipes/audio-wrap'
import { logger } from '@/lib/logger'

// ffmpeg encoding + download can take a minute for a 15s clip on a cold start
export const maxDuration = 300
export const runtime = 'nodejs'

function validate(
  body: unknown
): { ok: true; input: AudioWrapInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be JSON object' }
  const b = body as Record<string, unknown>

  if (typeof b.audioUrl !== 'string' || !/^https?:\/\//.test(b.audioUrl)) {
    return { ok: false, error: 'audioUrl must be an http(s) URL' }
  }
  if (typeof b.startS !== 'number' || !Number.isFinite(b.startS) || b.startS < 0) {
    return { ok: false, error: 'startS must be a non-negative number' }
  }
  if (typeof b.endS !== 'number' || !Number.isFinite(b.endS)) {
    return { ok: false, error: 'endS must be a number' }
  }
  if (b.endS <= b.startS) return { ok: false, error: 'endS must be > startS' }
  if (b.endS - b.startS > 15.001) {
    return { ok: false, error: 'Segment duration cannot exceed 15s' }
  }
  if (typeof b.label !== 'string' || !b.label.trim()) {
    return { ok: false, error: 'label required' }
  }

  return {
    ok: true,
    input: {
      audioUrl: b.audioUrl,
      startS: b.startS,
      endS: b.endS,
      label: b.label.trim(),
    },
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const v = validate(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  try {
    const result = await wrapAudioToMp4({ userId: auth.user.id, input: v.input })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.recipe.error('Audio wrap failed', {
      userId: auth.user.id,
      audioUrl: v.input.audioUrl,
      startS: v.input.startS,
      endS: v.input.endS,
      error: message,
    })
    if (/failed to download/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
