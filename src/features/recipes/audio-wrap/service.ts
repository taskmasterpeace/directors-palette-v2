/**
 * Audio-to-MP4 Wrap — service
 *
 * ffmpeg-driven: downloads the audio source to a tmp file, trims to the
 * requested window, muxes with a black 1280x720 h264 video track, uploads
 * the resulting MP4 to Supabase under audio-wraps/<userId>/<hash>.mp4.
 *
 * Idempotent: the storage path is deterministic from (userId, audioUrl,
 * startS, endS), so a retry returns the cached file instead of re-encoding.
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegStatic from 'ffmpeg-static'
import type { AudioWrapInput, AudioWrapResult } from './types'

const BUCKET = 'directors-palette'
const STORAGE_PREFIX = 'audio-wraps'
const VIDEO_W = 1280
const VIDEO_H = 720
const FPS = 24
const AUDIO_BITRATE = '192k'
const MAX_DURATION_S = 15

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

function getFfmpegPath(): string {
  const path = ffmpegStatic
  if (!path) throw new Error('ffmpeg-static binary not available on this platform')
  return path as unknown as string
}

/** Derive a deterministic id for the (userId, audioUrl, start, end) tuple. */
function buildCacheId(userId: string, audioUrl: string, startS: number, endS: number): string {
  const h = createHash('sha256')
  h.update(userId)
  h.update('|')
  h.update(audioUrl)
  h.update('|')
  h.update(startS.toFixed(3))
  h.update('|')
  h.update(endS.toFixed(3))
  return h.digest('hex').slice(0, 32)
}

function buildStoragePath(userId: string, id: string): string {
  return `${STORAGE_PREFIX}/${userId}/${id}.mp4`
}

type SupabaseLike = ReturnType<typeof getSupabase>

async function existingUrl(
  supabase: SupabaseLike,
  storagePath: string
): Promise<string | null> {
  const segments = storagePath.split('/')
  const file = segments.pop() as string
  const folder = segments.join('/')
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: file,
    limit: 1,
  })
  if (error) return null
  const hit = data?.find((entry) => entry.name === file)
  if (!hit) return null
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return publicUrl
}

async function downloadToTmp(audioUrl: string, tmpPath: string): Promise<void> {
  const res = await fetch(audioUrl, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) {
    throw new Error(`Failed to download audio (${res.status} ${res.statusText}): ${audioUrl}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(tmpPath, buf)
}

function runFfmpeg(args: string[]): Promise<void> {
  const bin = getFfmpegPath()
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => {
      if (code === 0) return resolve()
      reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-800)}`))
    })
  })
}

/**
 * Wrap a segment of an audio file into a black-screen MP4.
 * Safe to call repeatedly — returns `cached: true` if the output
 * already exists at the deterministic storage path.
 */
export async function wrapAudioToMp4(args: {
  userId: string
  input: AudioWrapInput
}): Promise<AudioWrapResult> {
  const { userId, input } = args

  if (input.endS <= input.startS) {
    throw new Error('endS must be greater than startS')
  }
  const duration = input.endS - input.startS
  if (duration > MAX_DURATION_S + 0.001) {
    throw new Error(`Audio clip cannot exceed ${MAX_DURATION_S}s (got ${duration.toFixed(2)}s)`)
  }

  const supabase = getSupabase()
  const id = buildCacheId(userId, input.audioUrl, input.startS, input.endS)
  const storagePath = buildStoragePath(userId, id)

  // 1. Cache hit?
  const cached = await existingUrl(supabase, storagePath)
  if (cached) {
    return {
      id,
      audioClipUrl: cached,
      storagePath,
      durationS: duration,
      fileSize: 0, // not queried for cache hits
      cached: true,
      createdAt: new Date().toISOString(),
    }
  }

  // 2. Encode fresh
  const workDir = join(tmpdir(), 'dp-audio-wrap', id)
  await mkdir(workDir, { recursive: true })
  const inputPath = join(workDir, 'source.audio')
  const outputPath = join(workDir, 'output.mp4')

  try {
    await downloadToTmp(input.audioUrl, inputPath)

    // ffmpeg args:
    //  -f lavfi -i color=c=black:s=WxH:r=FPS   (black video source)
    //  -ss start -to end -i audio              (trimmed audio)
    //  -shortest                               (stop at audio length)
    //  -c:v libx264 -pix_fmt yuv420p -preset veryfast -tune stillimage
    //  -c:a aac -b:a 192k
    //  -movflags +faststart
    const args: string[] = [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=black:s=${VIDEO_W}x${VIDEO_H}:r=${FPS}`,
      '-ss', input.startS.toFixed(3),
      '-to', input.endS.toFixed(3),
      '-i', inputPath,
      '-map', '0:v',
      '-map', '1:a',
      '-shortest',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', AUDIO_BITRATE,
      '-movflags', '+faststart',
      outputPath,
    ]
    await runFfmpeg(args)

    // 3. Upload
    const mp4 = await readFile(outputPath)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, mp4, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      })
    if (uploadError) {
      throw new Error(`Audio wrap upload failed: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    return {
      id,
      audioClipUrl: publicUrl,
      storagePath,
      durationS: duration,
      fileSize: mp4.length,
      cached: false,
      createdAt: new Date().toISOString(),
    }
  } finally {
    // Best-effort cleanup; ignore errors.
    try { await unlink(inputPath) } catch { /* ignore */ }
    try { await unlink(outputPath) } catch { /* ignore */ }
  }
}
