/**
 * POST /api/video/crop
 *
 * Accepts a user-supplied video clip + start/end timestamps, trims it to the
 * requested range (≤ 14.5 seconds) with ffmpeg, uploads the result to R2, and
 * returns a public URL.
 *
 * Used by Shot Animator's Reference Video UI so users can attach motion/style
 * reference clips to Seedance 2.0 generations without hitting Replicate's
 * 15-second hard cap.
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadReferenceVideo } from '@/features/shot-animator/services/reference-video-upload.service'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
// Bigger videos can take a moment to transcode on modest hardware
export const maxDuration = 120

const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 MB ceiling for input clips
const MAX_TRIM_SECONDS = 14.5
const MIN_TRIM_SECONDS = 0.5
const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/mpeg',
])

// Rate limit: 20 crop requests per minute per user
const CROP_RATE_LIMIT = { maxRequests: 20, windowSeconds: 60 }

function resolveFfmpegBinary(): string {
  // Windows dev machines won't have ffmpeg on PATH; fall back to env var.
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg'
}

interface FfmpegResult {
  code: number
  stderr: string
}

/**
 * Run ffmpeg as a child process and resolve with exit code + stderr tail.
 * Stdout is discarded — we only use ffmpeg for its side effect (writing the
 * trimmed file to disk).
 */
function runFfmpeg(args: string[]): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpegBinary(), args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      // Keep only the tail so we don't retain huge progress logs
      stderr = (stderr + chunk.toString('utf8')).slice(-8000)
    })
    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => resolve({ code: code ?? -1, stderr }))
  })
}

export async function POST(request: NextRequest) {
  const started = Date.now()

  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  // Rate limit (admins bypass)
  if (!isAdminEmail(user.email)) {
    const rl = checkRateLimit(`video-crop:${user.id}`, CROP_RATE_LIMIT)
    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many crop requests. Please slow down.', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }
  }

  let tempDir: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    const startRaw = form.get('startSec')
    const endRaw = form.get('endSec')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum 200MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 413 }
      )
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        {
          error: 'Unsupported video format',
          details: `Allowed: mp4, mov, webm, mkv. Got: ${file.type}`,
        },
        { status: 415 }
      )
    }

    const startSec = Number(startRaw)
    const endSec = Number(endRaw)
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      return NextResponse.json(
        { error: 'startSec and endSec must be numbers' },
        { status: 400 }
      )
    }
    if (startSec < 0 || endSec <= startSec) {
      return NextResponse.json(
        { error: 'endSec must be greater than startSec' },
        { status: 400 }
      )
    }
    const duration = endSec - startSec
    if (duration < MIN_TRIM_SECONDS) {
      return NextResponse.json(
        { error: `Minimum clip length is ${MIN_TRIM_SECONDS}s` },
        { status: 400 }
      )
    }
    if (duration > MAX_TRIM_SECONDS) {
      return NextResponse.json(
        { error: `Maximum clip length is ${MAX_TRIM_SECONDS}s` },
        { status: 400 }
      )
    }

    // Stage input + output in a per-request temp dir so concurrent requests
    // don't clobber each other.
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dp-crop-'))
    const inputPath = path.join(tempDir, `in-${randomUUID()}${extForMime(file.type)}`)
    const outputPath = path.join(tempDir, `out-${randomUUID()}.mp4`)

    const inputBuffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(inputPath, inputBuffer)

    // Re-encode instead of stream copy: guarantees exact cut points + a clean
    // keyframe at 0, which is important because Seedance rejects some streams
    // that start mid-GOP.
    const ffmpegArgs = [
      '-y',
      '-ss', startSec.toFixed(3),
      '-i', inputPath,
      '-t', duration.toFixed(3),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-ar', '48000',
      outputPath,
    ]

    const result = await runFfmpeg(ffmpegArgs)
    if (result.code !== 0) {
      logger.api.error('ffmpeg crop failed', {
        code: result.code,
        stderrTail: result.stderr,
      })
      return NextResponse.json(
        { error: 'Video processing failed', details: 'ffmpeg returned non-zero exit' },
        { status: 500 }
      )
    }

    const outBuffer = await fs.readFile(outputPath)
    if (outBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Video processing produced empty output' },
        { status: 500 }
      )
    }

    const uploadId = randomUUID()
    const uploaded = await uploadReferenceVideo(outBuffer, user.id, uploadId, 'video/mp4')

    logger.api.info('video crop success', {
      userId: user.id,
      durationSec: duration,
      inputBytes: inputBuffer.length,
      outputBytes: outBuffer.length,
      elapsedMs: Date.now() - started,
    })

    return NextResponse.json({
      url: uploaded.publicUrl,
      duration,
      fileSize: uploaded.fileSize,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.api.error('video crop route error', { error: message })

    // ENOENT on the ffmpeg binary is the most common "works on my machine" failure
    // in dev — surface a hint rather than a generic 500.
    if (message.includes('ENOENT')) {
      return NextResponse.json(
        {
          error: 'ffmpeg not found',
          details: 'Install ffmpeg or set FFMPEG_PATH in .env.local',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Video crop failed', details: message },
      { status: 500 }
    )
  } finally {
    if (tempDir) {
      // Best-effort cleanup — don't block the response on it
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'video/quicktime':
      return '.mov'
    case 'video/webm':
      return '.webm'
    case 'video/x-matroska':
      return '.mkv'
    case 'video/mpeg':
      return '.mpeg'
    default:
      return '.mp4'
  }
}
