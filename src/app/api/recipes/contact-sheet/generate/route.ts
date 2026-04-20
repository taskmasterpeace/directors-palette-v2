/**
 * POST /api/recipes/contact-sheet/generate
 *
 * Generates a 6-frame contact sheet JPG for a song segment.
 *
 * Body (JSON):
 * {
 *   artistId: string,
 *   songId: string,
 *   segmentId: string,
 *   segmentLabel?: string,
 *   startS: number,
 *   endS: number,       // <= startS + 15
 *   scene: string,      // one-line brief
 *   beats: { caption: string, promptExtra?: string }[]   // length 6
 *   globalStyleNotes?: string
 * }
 *
 * Response:
 *   200 { contactSheetUrl, storagePath, frames, creditsSpent, id, createdAt }
 *   400 validation error
 *   401 unauthorized
 *   402 insufficient credits
 *   500 generation failure
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { runContactSheetRecipe } from '@/features/recipes/contact-sheet'
import type { ContactSheetInput } from '@/features/recipes/contact-sheet'
import { logger } from '@/lib/logger'

export const maxDuration = 300 // up to 5 min for 6 parallel nano-banana calls + composite

function validate(body: unknown): { ok: true; input: ContactSheetInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be JSON object' }
  const b = body as Record<string, unknown>

  if (typeof b.artistId !== 'string' || !b.artistId) return { ok: false, error: 'artistId required' }
  if (typeof b.songId !== 'string' || !b.songId) return { ok: false, error: 'songId required' }
  if (typeof b.segmentId !== 'string' || !b.segmentId) return { ok: false, error: 'segmentId required' }
  if (typeof b.startS !== 'number' || !Number.isFinite(b.startS)) return { ok: false, error: 'startS must be number' }
  if (typeof b.endS !== 'number' || !Number.isFinite(b.endS)) return { ok: false, error: 'endS must be number' }
  if (b.endS <= b.startS) return { ok: false, error: 'endS must be > startS' }
  if (b.endS - b.startS > 15.001) return { ok: false, error: 'Segment duration cannot exceed 15s' }
  if (typeof b.scene !== 'string' || !b.scene.trim()) return { ok: false, error: 'scene required' }
  if (!Array.isArray(b.beats) || b.beats.length !== 6) {
    return { ok: false, error: 'beats must be an array of exactly 6 items' }
  }
  for (let i = 0; i < 6; i++) {
    const beat = b.beats[i]
    if (!beat || typeof beat !== 'object') return { ok: false, error: `beats[${i}] invalid` }
    const beatObj = beat as Record<string, unknown>
    if (typeof beatObj.caption !== 'string' || !beatObj.caption.trim()) {
      return { ok: false, error: `beats[${i}].caption required` }
    }
    if (beatObj.promptExtra !== undefined && typeof beatObj.promptExtra !== 'string') {
      return { ok: false, error: `beats[${i}].promptExtra must be string` }
    }
  }

  return {
    ok: true,
    input: {
      artistId: b.artistId,
      songId: b.songId,
      segmentId: b.segmentId,
      segmentLabel: typeof b.segmentLabel === 'string' ? b.segmentLabel : undefined,
      startS: b.startS,
      endS: b.endS,
      scene: b.scene.trim(),
      beats: b.beats as ContactSheetInput['beats'],
      globalStyleNotes:
        typeof b.globalStyleNotes === 'string' ? b.globalStyleNotes : undefined,
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
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 })
  }

  try {
    const result = await runContactSheetRecipe({
      userId: auth.user.id,
      input: v.input,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.recipe.error('Contact sheet generation failed', {
      userId: auth.user.id,
      artistId: v.input.artistId,
      songId: v.input.songId,
      segmentId: v.input.segmentId,
      error: message,
    })

    // Map known business errors to HTTP codes
    if (/insufficient credits/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
