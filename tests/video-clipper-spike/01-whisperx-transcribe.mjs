#!/usr/bin/env node
// Test 01: Transcribe each video with WhisperX on Replicate.
// Produces word-level timestamps and SRT.

import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { replicate, uploadFile } from './lib/replicate.mjs'
import { extractAudio, probeDuration } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

// victor-upmeet/whisperx — returns segments + word-level timestamps.
// Pinned to current version hash (model has no :latest tag).
const MODEL = 'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb'

async function transcribeOne(videoPath) {
  const slot = basename(videoPath, '.mp4')
  log.step(`Transcribing ${slot}`)

  // Extract audio first — cheaper upload, faster inference.
  const audioPath = join(SPIKE.outputs, `${slot}.mp3`)
  if (!existsSync(audioPath)) {
    log.dim(`  extracting audio...`)
    await extractAudio(videoPath, audioPath)
  }

  const durationSec = await probeDuration(audioPath)
  log.dim(`  audio duration: ${durationSec.toFixed(1)}s`)

  log.dim(`  uploading to Replicate...`)
  const audioUrl = await uploadFile(audioPath)

  log.dim(`  running ${MODEL}...`)
  const started = Date.now()
  const output = await replicate.run(MODEL, {
    input: {
      audio_file: audioUrl,
      language: 'en',
      align_output: true,
      diarization: false, // turn on later if Test 02 needs it
      batch_size: 64,
      temperature: 0,
    },
  })
  const elapsedSec = (Date.now() - started) / 1000
  log.ok(`  transcribed in ${elapsedSec.toFixed(1)}s`)

  // Save raw JSON + derived SRT.
  const jsonPath = join(SPIKE.outputs, `${slot}.transcript.json`)
  writeFileSync(jsonPath, JSON.stringify(output, null, 2))
  log.dim(`  → ${jsonPath}`)

  const srt = segmentsToSrt(output.segments || [])
  const srtPath = join(SPIKE.outputs, `${slot}.srt`)
  writeFileSync(srtPath, srt)
  log.dim(`  → ${srtPath}`)

  return {
    slot,
    durationSec,
    elapsedSec,
    segmentCount: (output.segments || []).length,
    wordCount: (output.segments || [])
      .flatMap((s) => s.words || [])
      .length,
    hasWordTimestamps: (output.segments || [])
      .some((s) => (s.words || []).length > 0),
    jsonPath,
    srtPath,
  }
}

function segmentsToSrt(segments) {
  return segments
    .map((s, i) => {
      const start = secToTimestamp(s.start)
      const end = secToTimestamp(s.end)
      return `${i + 1}\n${start} --> ${end}\n${(s.text || '').trim()}\n`
    })
    .join('\n')
}

function secToTimestamp(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`
}
function pad(n) { return String(n).padStart(2, '0') }

async function main() {
  const videos = readdirSync(SPIKE.videos).filter((f) => f.endsWith('.mp4'))
  if (videos.length === 0) {
    log.err('No videos in videos/. Run 00-download-videos.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const v of videos) {
    try {
      const r = await transcribeOne(join(SPIKE.videos, v))
      results.push({ ...r, status: 'ok' })
    } catch (err) {
      log.err(`${v} failed: ${err.message?.slice(0, 300)}`)
      results.push({ slot: basename(v, '.mp4'), status: 'failed', error: err.message })
    }
  }

  const lines = [
    `Model: \`${MODEL}\``,
    '',
    '| Slot | Duration | Elapsed | Segments | Words | Word TS |',
    '|------|---------:|--------:|---------:|------:|:-------:|',
    ...results
      .filter((r) => r.status === 'ok')
      .map(
        (r) =>
          `| ${r.slot} | ${r.durationSec.toFixed(1)}s | ${r.elapsedSec.toFixed(1)}s | ${r.segmentCount} | ${r.wordCount} | ${r.hasWordTimestamps ? '✅' : '❌'} |`
      ),
    ...results
      .filter((r) => r.status !== 'ok')
      .map((r) => `| ${r.slot} | **FAILED** | — | — | — | — |`),
  ]
  recordFinding('Test 01 — WhisperX transcription', lines.join('\n'))

  log.step(`Done. ${results.filter(r => r.status === 'ok').length}/${results.length} succeeded.`)
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
