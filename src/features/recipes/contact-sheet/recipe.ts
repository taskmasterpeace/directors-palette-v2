/**
 * Contact Sheet Recipe — orchestrator
 *
 * 1. Load artist DNA + character sheet URL.
 * 2. Build 6 frame prompts (banned-words filtered).
 * 3. Generate 6 frames in parallel via Replicate (nano-banana-2), using the
 *    artist character sheet as a reference image for identity consistency.
 * 4. Download all 6 frame buffers.
 * 5. Composite with sharp into a single JPG.
 * 6. Upload to Supabase Storage under contact-sheets/{userId}/{artistId}/.
 * 7. Return the final URL + per-frame metadata.
 *
 * This deliberately bypasses the gallery (intermediate frames are internal
 * artifacts). Only the final composite is persisted.
 */

import { createClient } from '@supabase/supabase-js'
import Replicate from 'replicate'
import { randomUUID } from 'node:crypto'
import { creditsService } from '@/features/credits'
import { logger } from '@/lib/logger'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { buildFramePrompts } from './prompt-builder'
import { composeContactSheet } from './composer'
import type {
  ContactSheetFrame,
  ContactSheetInput,
  ContactSheetResult,
} from './types'

const BUCKET = 'directors-palette'
const MODEL_ENDPOINT = 'google/nano-banana-2'
const MODEL_ID = 'nano-banana-2'
const FRAME_ASPECT = '16:9'
const FRAME_RESOLUTION = '1K'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90_000

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`
}

function formatTitle(args: {
  artistName: string
  songId: string
  segmentLabel?: string
  segmentId: string
}): string {
  const label = args.segmentLabel?.trim() || args.segmentId
  return `${args.artistName} — ${args.songId} — ${label}`
}

function formatSubtitle(startS: number, endS: number): string {
  const dur = Math.max(0, endS - startS)
  return `${fmtTime(startS)} → ${fmtTime(endS)}  ·  ${dur.toFixed(2)}s  ·  6-frame brief`
}

interface ServiceClients {
  supabase: ReturnType<typeof createClient>
  replicate: Replicate
}

function getClients(): ServiceClients {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!url || !key) throw new Error('Supabase env vars missing')
  if (!replicateToken) throw new Error('REPLICATE_API_TOKEN missing')
  return {
    supabase: createClient(url, key),
    replicate: new Replicate({ auth: replicateToken }),
  }
}

interface ArtistRow {
  id: string
  name: string
  dna: ArtistDNA
  user_id: string
}

async function loadArtist(
  supabase: ServiceClients['supabase'],
  artistId: string,
  userId: string
): Promise<ArtistRow> {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id, name, dna, user_id')
    .eq('id', artistId)
    .eq('user_id', userId)
    .single()
  if (error || !data) {
    throw new Error(
      `Artist profile ${artistId} not found for user ${userId}: ${error?.message ?? 'no data'}`
    )
  }
  return data as unknown as ArtistRow
}

/**
 * Generate a single frame via Replicate and return its public URL.
 * Throws on failure so callers can Promise.allSettled.
 */
async function generateFrame(
  replicate: Replicate,
  prompt: string,
  referenceImages: string[]
): Promise<string> {
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: FRAME_ASPECT,
    resolution: FRAME_RESOLUTION,
    output_format: 'jpg',
  }
  if (referenceImages.length > 0) {
    input.image_input = referenceImages
  }

  let prediction = await replicate.predictions.create({
    model: MODEL_ENDPOINT,
    input,
  })

  const start = Date.now()
  while (
    prediction.status !== 'succeeded' &&
    prediction.status !== 'failed' &&
    prediction.status !== 'canceled' &&
    Date.now() - start < POLL_TIMEOUT_MS
  ) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    prediction = await replicate.predictions.get(prediction.id)
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(
      `Frame generation ${prediction.status}: ${prediction.error?.toString() ?? 'unknown'}`
    )
  }

  const output = prediction.output
  const url = Array.isArray(output) ? output[0] : output
  if (typeof url !== 'string') {
    throw new Error('Frame generation returned no URL')
  }
  return url
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) {
    throw new Error(`Failed to fetch frame ${url}: ${res.status} ${res.statusText}`)
  }
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

/**
 * Run the full contact sheet recipe.
 */
export async function runContactSheetRecipe(args: {
  userId: string
  input: ContactSheetInput
}): Promise<ContactSheetResult> {
  const { userId, input } = args
  const { supabase, replicate } = getClients()

  // --- 1. Validate timing
  if (input.endS <= input.startS) {
    throw new Error('endS must be greater than startS')
  }
  if (input.endS - input.startS > 15.001) {
    throw new Error('Contact sheet segment cannot exceed 15s')
  }
  if (!Array.isArray(input.beats) || input.beats.length !== 6) {
    throw new Error('Contact sheet requires exactly 6 beats')
  }

  // --- 2. Load artist
  const artist = await loadArtist(supabase, input.artistId, userId)
  const dna = artist.dna
  const characterRef = dna?.look?.characterSheetUrl || dna?.look?.portraitUrl || ''
  const referenceImages = characterRef ? [characterRef] : []

  // --- 3. Build prompts
  const prompts = buildFramePrompts({
    scene: input.scene,
    beats: input.beats,
    dna,
    globalStyleNotes: input.globalStyleNotes,
  })

  // --- 4. Upfront balance check so we fail fast on insufficient credits
  // BEFORE deducting anything. Otherwise a mid-loop deduction failure
  // would leave the user partially charged.
  const pricePerFrame = await creditsService.getPriceForModel(MODEL_ID, 'image')
  const totalRequired = pricePerFrame * 6
  const balanceRow = await creditsService.getBalance(userId, true)
  const currentBalance = balanceRow?.balance ?? 0
  if (currentBalance < totalRequired) {
    throw new Error(
      `Insufficient credits: contact sheet requires ${totalRequired} (6 × ${pricePerFrame}), balance ${currentBalance}`
    )
  }

  // --- 5. Deduct 6 × nano-banana-2 up front. If any later step fails the
  // frames that already ran stay charged, matching the rest of the app.
  for (let i = 0; i < 6; i++) {
    const deducted = await creditsService.deductCredits(userId, MODEL_ID, {
      generationType: 'image',
      useServiceRole: true,
      description: `Contact sheet frame ${i + 1}/6 — ${input.songId}:${input.segmentId}`,
    })
    if (!deducted.success) {
      throw new Error(
        `Credit deduction failed at frame ${i + 1}/6: ${deducted.error ?? 'unknown'}`
      )
    }
  }

  // --- 5. Generate 6 frames in parallel
  const frameResults = await Promise.allSettled(
    prompts.map((p) => generateFrame(replicate, p, referenceImages))
  )

  const frames: ContactSheetFrame[] = frameResults.map((r, i) => ({
    index: i,
    caption: input.beats[i].caption,
    prompt: prompts[i],
    frameUrl: r.status === 'fulfilled' ? r.value : undefined,
    error:
      r.status === 'rejected'
        ? r.reason instanceof Error
          ? r.reason.message
          : String(r.reason)
        : undefined,
  }))

  const successCount = frames.filter((f) => f.frameUrl).length
  if (successCount === 0) {
    throw new Error(
      'All 6 frame generations failed: ' +
        frames.map((f) => f.error).filter(Boolean).join(' | ')
    )
  }
  if (successCount < 6) {
    logger.recipe.warn(
      `Contact sheet: ${6 - successCount} frame(s) failed — continuing with placeholders`,
      { songId: input.songId, segmentId: input.segmentId }
    )
  }

  // --- 6. Download frame buffers (in parallel)
  const buffers = await Promise.all(
    frames.map(async (f) => (f.frameUrl ? downloadBuffer(f.frameUrl) : null))
  )

  // --- 7. Compose
  const composeFrames = frames.map((f, i) => ({
    buffer: buffers[i],
    caption: f.caption,
  }))

  const title = formatTitle({
    artistName: artist.name,
    songId: input.songId,
    segmentLabel: input.segmentLabel,
    segmentId: input.segmentId,
  })
  const subtitle = formatSubtitle(input.startS, input.endS)

  const { buffer: sheetBuffer } = await composeContactSheet({
    title,
    subtitle,
    frames: composeFrames,
  })

  // --- 8. Upload composite
  const id = randomUUID()
  const timestamp = Date.now()
  const storagePath = `contact-sheets/${userId}/${input.artistId}/${timestamp}_${id}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, sheetBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })
  if (uploadError) {
    throw new Error(`Contact sheet upload failed: ${uploadError.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  return {
    id,
    artistId: input.artistId,
    songId: input.songId,
    segmentId: input.segmentId,
    contactSheetUrl: publicUrl,
    storagePath,
    frames,
    creditsSpent: totalRequired,
    createdAt: new Date().toISOString(),
  }
}
