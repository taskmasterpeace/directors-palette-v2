/**
 * Music Lab Export Kit — orchestrator
 *
 * Produces a downloadable ZIP for a ~15s song segment containing:
 *   - character-sheet.jpg  (existing artist identity reference)
 *   - contact-sheet.jpg    (6-frame recipe for what should happen in the 15s)
 *   - audio-15s.mp4        (black-screen video wrapping the audio clip)
 *   - kit-notes.txt        (metadata + suggested prompt text)
 *
 * On success, upserts a row in music_lab_exports so the UI can show
 * song coverage and increments download_count on repeat downloads.
 */

import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { randomUUID } from 'node:crypto'
import { runContactSheetRecipe } from '@/features/recipes/contact-sheet'
import { wrapAudioToMp4 } from '@/features/recipes/audio-wrap'
import type {
  ContactSheetBeat,
  ContactSheetResult,
} from '@/features/recipes/contact-sheet'
import type { AudioWrapResult } from '@/features/recipes/audio-wrap'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import { logger } from '@/lib/logger'

const BUCKET = 'directors-palette'
const EXPORT_PREFIX = 'export-kits'
const MAX_DURATION_S = 15

export interface ExportKitInput {
  artistId: string
  songId: string
  segmentId: string
  segmentLabel?: string
  startS: number
  endS: number
  scene: string
  beats: ContactSheetBeat[]
  audioUrl: string
  globalStyleNotes?: string
}

export interface ExportKitResult {
  exportId: string
  zipUrl: string
  zipStoragePath: string
  contactSheetUrl: string
  audioClipUrl: string
  characterSheetUrl: string | null
  downloadCount: number
  createdAt: string
}

interface ArtistRow {
  id: string
  name: string
  user_id: string
  dna: ArtistDNA
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

async function loadArtist(
  supabase: ReturnType<typeof getSupabase>,
  artistId: string,
  userId: string
): Promise<ArtistRow> {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id, name, user_id, dna')
    .eq('id', artistId)
    .eq('user_id', userId)
    .single()
  if (error || !data) {
    throw new Error(`Artist ${artistId} not found: ${error?.message ?? 'no data'}`)
  }
  return data as unknown as ArtistRow
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`
}

function buildKitNotes(args: {
  artist: ArtistRow
  input: ExportKitInput
  contactSheet: ContactSheetResult
}): string {
  const { artist, input, contactSheet } = args
  const durationS = input.endS - input.startS
  const lines = [
    `# Music Lab Export Kit`,
    ``,
    `Artist: ${artist.name}`,
    `Song:   ${input.songId}`,
    `Segment: ${input.segmentLabel || input.segmentId}`,
    `Time:   ${formatTime(input.startS)} → ${formatTime(input.endS)} (${durationS.toFixed(2)}s)`,
    ``,
    `Scene brief:`,
    `  ${input.scene}`,
    ``,
    `6 frames:`,
    ...contactSheet.frames.map(
      (f, i) => `  ${i + 1}. ${f.caption}${f.error ? ' [GENERATION FAILED]' : ''}`
    ),
    ``,
    `Files:`,
    `  - character-sheet.jpg   Who — artist identity reference`,
    `  - contact-sheet.jpg     What happens — 6-frame beat-by-beat brief`,
    `  - audio-15s.mp4         The ${durationS.toFixed(1)}s audio as black-screen video`,
    ``,
    `Usage:`,
    `  Upload contact-sheet.jpg + character-sheet.jpg as reference images,`,
    `  audio-15s.mp4 as the scene reference, and paste the scene brief above`,
    `  as the text prompt. Adjust per tool's reference-image capacity.`,
    ``,
    `Generated: ${new Date().toISOString()}`,
  ]
  return lines.join('\n')
}

/**
 * Main entrypoint. Runs the full kit in sequence (contact sheet -> audio
 * wrap -> zip -> upsert row). No partial caching of the zip itself — the
 * individual recipes handle their own idempotency where they can.
 */
export async function buildExportKit(args: {
  userId: string
  input: ExportKitInput
}): Promise<ExportKitResult> {
  const { userId, input } = args

  // --- 0. Validate timing
  if (input.endS <= input.startS) {
    throw new Error('endS must be greater than startS')
  }
  if (input.endS - input.startS > MAX_DURATION_S + 0.001) {
    throw new Error(`Segment duration cannot exceed ${MAX_DURATION_S}s`)
  }
  if (!Array.isArray(input.beats) || input.beats.length !== 6) {
    throw new Error('beats must be an array of exactly 6 items')
  }

  const supabase = getSupabase()
  const artist = await loadArtist(supabase, input.artistId, userId)
  const characterSheetUrl =
    artist.dna?.look?.characterSheetUrl || artist.dna?.look?.portraitUrl || null

  // --- 1. Contact sheet
  const contactSheet = await runContactSheetRecipe({
    userId,
    input: {
      artistId: input.artistId,
      songId: input.songId,
      segmentId: input.segmentId,
      segmentLabel: input.segmentLabel,
      startS: input.startS,
      endS: input.endS,
      scene: input.scene,
      beats: input.beats,
      globalStyleNotes: input.globalStyleNotes,
    },
  })

  // --- 2. Audio wrap (in parallel would race the character-sheet fetch,
  // but contact sheet is the slow path — do audio concurrently with kit
  // asset downloads instead).
  const audioWrap = await wrapAudioToMp4({
    userId,
    input: {
      audioUrl: input.audioUrl,
      startS: input.startS,
      endS: input.endS,
      label: `${input.songId}_${input.segmentId}`,
    },
  })

  // --- 3. Download all 3 asset buffers in parallel
  const fetches: Array<Promise<Buffer | null>> = [
    fetchBuffer(contactSheet.contactSheetUrl),
    fetchBuffer(audioWrap.audioClipUrl),
    characterSheetUrl ? fetchBuffer(characterSheetUrl) : Promise.resolve(null),
  ]
  const [contactBuf, audioBuf, characterBuf] = await Promise.all(fetches)

  // --- 4. Build ZIP
  const zip = new JSZip()
  if (characterBuf) {
    zip.file('character-sheet.jpg', characterBuf)
  } else {
    zip.file(
      'character-sheet.MISSING.txt',
      'This artist has no characterSheetUrl or portraitUrl in their DNA.\n' +
        'Generate a character sheet in the artist studio to include one here.'
    )
  }
  zip.file('contact-sheet.jpg', contactBuf!)
  zip.file('audio-15s.mp4', audioBuf!)
  zip.file(
    'kit-notes.txt',
    buildKitNotes({ artist, input, contactSheet })
  )

  const zipBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // --- 5. Upload ZIP
  const exportId = randomUUID()
  const timestamp = Date.now()
  const zipPath = `${EXPORT_PREFIX}/${userId}/${input.songId}/${input.segmentId}_${timestamp}_${exportId}.zip`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(zipPath, zipBuf, {
      contentType: 'application/zip',
      upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })
  if (uploadError) {
    throw new Error(`Export kit ZIP upload failed: ${uploadError.message}`)
  }
  const {
    data: { publicUrl: zipUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(zipPath)

  // --- 6. Upsert music_lab_exports row. Increment download_count via
  // a read-then-write since Supabase v2 js client has no atomic increment.
  // Race window is tiny (single-user per (song,segment) key), acceptable.
  let downloadCount = 1
  const { data: existing } = await supabase
    .from('music_lab_exports')
    .select('id, download_count')
    .eq('user_id', userId)
    .eq('artist_id', input.artistId)
    .eq('song_id', input.songId)
    .eq('segment_id', input.segmentId)
    .maybeSingle()

  if (existing) {
    downloadCount = ((existing as { download_count?: number }).download_count ?? 1) + 1
    const { error: updateError } = await supabase
      .from('music_lab_exports')
      .update({
        segment_label: input.segmentLabel ?? null,
        start_s: input.startS,
        end_s: input.endS,
        contact_sheet_url: contactSheet.contactSheetUrl,
        audio_clip_url: audioWrap.audioClipUrl,
        exported_at: new Date().toISOString(),
        download_count: downloadCount,
      })
      .eq('id', (existing as { id: string }).id)
    if (updateError) {
      logger.musicLab.warn('export_kit: row update failed (non-fatal)', {
        error: updateError.message,
      })
    }
  } else {
    const { error: insertError } = await supabase
      .from('music_lab_exports')
      .insert({
        user_id: userId,
        artist_id: input.artistId,
        song_id: input.songId,
        segment_id: input.segmentId,
        segment_label: input.segmentLabel ?? null,
        start_s: input.startS,
        end_s: input.endS,
        contact_sheet_url: contactSheet.contactSheetUrl,
        audio_clip_url: audioWrap.audioClipUrl,
      })
    if (insertError) {
      logger.musicLab.warn('export_kit: row insert failed (non-fatal)', {
        error: insertError.message,
      })
    }
  }

  return {
    exportId,
    zipUrl,
    zipStoragePath: zipPath,
    contactSheetUrl: contactSheet.contactSheetUrl,
    audioClipUrl: audioWrap.audioClipUrl,
    characterSheetUrl,
    downloadCount,
    createdAt: new Date().toISOString(),
  }
}

export type { ContactSheetResult, AudioWrapResult }
