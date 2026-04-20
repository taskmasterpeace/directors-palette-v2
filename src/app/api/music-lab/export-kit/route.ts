/**
 * POST /api/music-lab/export-kit
 *
 * Builds a per-segment export ZIP for the music-lab "pre-production kit"
 * workflow. Returns a public ZIP URL the UI can redirect to.
 *
 * Body:
 * {
 *   artistId: string,
 *   songId: string,
 *   segmentId: string,
 *   segmentLabel?: string,
 *   startS: number,
 *   endS: number,
 *   scene: string,
 *   beats: { caption: string, promptExtra?: string }[],  // length 6
 *   audioUrl: string,
 *   globalStyleNotes?: string
 * }
 *
 * Response 200:
 *   { exportId, zipUrl, zipStoragePath, contactSheetUrl, audioClipUrl,
 *     characterSheetUrl, downloadCount, createdAt }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { buildExportKit } from '@/features/music-lab/services/export-kit.service'
import type { ExportKitInput } from '@/features/music-lab/services/export-kit.service'
import { logger } from '@/lib/logger'

export const maxDuration = 300
export const runtime = 'nodejs'

function validate(
  body: unknown
): { ok: true; input: ExportKitInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be JSON object' }
  const b = body as Record<string, unknown>

  const require = (k: string, expected: string) =>
    ({ ok: false as const, error: `${k} must be ${expected}` })

  if (typeof b.artistId !== 'string' || !b.artistId) return require('artistId', 'non-empty string')
  if (typeof b.songId !== 'string' || !b.songId) return require('songId', 'non-empty string')
  if (typeof b.segmentId !== 'string' || !b.segmentId) return require('segmentId', 'non-empty string')
  if (typeof b.startS !== 'number' || !Number.isFinite(b.startS) || b.startS < 0) {
    return require('startS', 'a non-negative number')
  }
  if (typeof b.endS !== 'number' || !Number.isFinite(b.endS)) return require('endS', 'a number')
  if (b.endS <= b.startS) return { ok: false, error: 'endS must be > startS' }
  if (b.endS - b.startS > 15.001) return { ok: false, error: 'Segment duration cannot exceed 15s' }
  if (typeof b.scene !== 'string' || !b.scene.trim()) return require('scene', 'non-empty string')
  if (!Array.isArray(b.beats) || b.beats.length !== 6) {
    return { ok: false, error: 'beats must be an array of exactly 6 items' }
  }
  for (let i = 0; i < 6; i++) {
    const beat = b.beats[i] as Record<string, unknown> | null
    if (!beat || typeof beat !== 'object') return { ok: false, error: `beats[${i}] invalid` }
    if (typeof beat.caption !== 'string' || !beat.caption.trim()) {
      return { ok: false, error: `beats[${i}].caption required` }
    }
  }
  if (typeof b.audioUrl !== 'string' || !/^https?:\/\//.test(b.audioUrl)) {
    return require('audioUrl', 'an http(s) URL')
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
      beats: b.beats as ExportKitInput['beats'],
      audioUrl: b.audioUrl,
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
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  try {
    const result = await buildExportKit({ userId: auth.user.id, input: v.input })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.musicLab.error('Export kit failed', {
      userId: auth.user.id,
      artistId: v.input.artistId,
      songId: v.input.songId,
      segmentId: v.input.segmentId,
      error: message,
    })
    if (/insufficient credits/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (/failed to download/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
