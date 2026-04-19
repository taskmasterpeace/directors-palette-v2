#!/usr/bin/env node
// Test 04: Per-frame face/person tracking via zsxkib/yolo-world over a short clip.
// Outputs a JSON of bbox-per-frame so we can evaluate jitter and build a
// smoothed crop path.
//
// Picks the FIRST segment from <slot>.segments.json as the test clip.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { replicate, uploadFile } from './lib/replicate.mjs'
import { cutSegment } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

const MODEL = 'zsxkib/yolo-world:07aee09fc38bc4459409caa872ea416717712f4e6e875f8751a0d0d5bbea902f'
const CLASS_NAMES = 'person, face'

async function trackOne(slot) {
  log.step(`Per-frame tracking: ${slot}`)

  const videoPath = join(SPIKE.videos, `${slot}.mp4`)
  const segmentsPath = join(SPIKE.outputs, `${slot}.segments.json`)
  if (!existsSync(videoPath) || !existsSync(segmentsPath)) {
    log.warn(`  missing ${videoPath} or ${segmentsPath}; skipping`)
    return { slot, status: 'skipped' }
  }

  const { picks } = JSON.parse(readFileSync(segmentsPath, 'utf8'))
  if (!picks?.length) {
    log.warn(`  no picks; skipping`)
    return { slot, status: 'skipped' }
  }

  const pick = picks[0]
  const clipPath = join(SPIKE.outputs, `${slot}.clip1.mp4`)
  if (!existsSync(clipPath)) {
    log.dim(`  cutting clip ${pick.start_sec}s→${pick.end_sec}s`)
    await cutSegment(videoPath, pick.start_sec, pick.end_sec, clipPath)
  }

  log.dim(`  uploading clip to Replicate`)
  const url = await uploadFile(clipPath)

  log.dim(`  running ${MODEL} with return_json=true`)
  const started = Date.now()
  const output = await replicate.run(MODEL, {
    input: {
      input_media: url,
      class_names: CLASS_NAMES,
      nms_thr: 0.5,
      score_thr: 0.05,
      max_num_boxes: 10,
      return_json: true,
    },
  })
  const elapsedSec = (Date.now() - started) / 1000

  // Output shape varies: could be { media_path, json_path } or a single URI.
  const outPath = join(SPIKE.outputs, `${slot}.track.raw.json`)
  writeFileSync(outPath, JSON.stringify(output, null, 2))
  log.dim(`  raw output saved → ${outPath}`)

  // Try to download media if URI-shaped.
  const mediaUrl = output?.media_path || (typeof output === 'string' ? output : null)
  const jsonUrl = output?.json_path || null

  let detectionsFile = null
  if (jsonUrl) {
    const res = await fetch(jsonUrl)
    detectionsFile = join(SPIKE.outputs, `${slot}.track.detections.json`)
    writeFileSync(detectionsFile, await res.text())
    log.ok(`  detections → ${detectionsFile}`)
  }

  let annotatedVideo = null
  if (mediaUrl) {
    const res = await fetch(mediaUrl)
    annotatedVideo = join(SPIKE.outputs, `${slot}.track.annotated.mp4`)
    writeFileSync(annotatedVideo, Buffer.from(await res.arrayBuffer()))
    log.ok(`  annotated video → ${annotatedVideo}`)
  }

  return {
    slot,
    status: 'ok',
    elapsedSec,
    clipDurationSec: pick.duration_sec,
    detectionsFile,
    annotatedVideo,
  }
}

async function main() {
  const segmentsFiles = readdirSync(SPIKE.outputs)
    .filter((f) => f.endsWith('.segments.json'))

  if (segmentsFiles.length === 0) {
    log.err('No .segments.json in outputs/. Run 02-segment-picker.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const f of segmentsFiles) {
    const slot = basename(f, '.segments.json')
    try {
      results.push(await trackOne(slot))
    } catch (err) {
      log.err(`${slot} failed: ${err.message?.slice(0, 300)}`)
      results.push({ slot, status: 'failed', error: err.message })
    }
  }

  const lines = [
    `Model: \`${MODEL}\`, classes: "${CLASS_NAMES}", return_json: true`,
    '',
    '| Slot | Clip len | Elapsed | Detections file | Annotated video |',
    '|------|---------:|--------:|:---------------:|:---------------:|',
    ...results
      .filter((r) => r.status === 'ok')
      .map(
        (r) =>
          `| ${r.slot} | ${r.clipDurationSec}s | ${r.elapsedSec.toFixed(1)}s | ${r.detectionsFile ? '✅' : '❌'} | ${r.annotatedVideo ? '✅' : '❌'} |`
      ),
    '',
    'Open `outputs/*.track.annotated.mp4` to see bounding boxes drawn on the clip.',
    'Inspect `outputs/*.track.detections.json` for bbox arrays per frame.',
  ]
  recordFinding('Test 04 — Per-frame face tracking (video)', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
