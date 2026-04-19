#!/usr/bin/env node
// Test 08: End-to-end Pipeline A (Talking Head Clipper).
// Chains prior test outputs + adds a STATIC face-centered 9:16 crop.
//
// Requires: 01 (transcript) + 02 (segments) + 05 (clip) + 06 (caption) already run.
// Produces: <slot>.pipelineA.final.mp4 — a 9:16 captioned short.
//
// Reframing strategy for this test:
//   1. Grab clip1.
//   2. Ask Replicate yolo-world (quick pass, 1 frame via image path) for bbox
//      around "person" in the MIDDLE frame of the clip.
//   3. Compute a 9:16 static crop centered on that bbox, ffmpeg crop+scale.
//   4. Burn Hormozi captions on top.
//
// Picks the first slot that has all dependencies ready.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { replicate, uploadFile } from './lib/replicate.mjs'
import { ffmpeg, extractFrame, probeDuration } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

const OUTPUT_W = 1080
const OUTPUT_H = 1920

async function detectPersonBbox(videoPath, midtime) {
  // Extract middle frame, run yolo-world on it.
  const framePath = join(SPIKE.outputs, `${basename(videoPath, '.mp4')}.pipelineA.midframe.jpg`)
  await extractFrame(videoPath, midtime, framePath)
  const url = await uploadFile(framePath)

  const output = await replicate.run(
    'zsxkib/yolo-world:07aee09fc38bc4459409caa872ea416717712f4e6e875f8751a0d0d5bbea902f',
    {
    input: {
      input_media: url,
      class_names: 'person, face',
      nms_thr: 0.5,
      score_thr: 0.1,
      max_num_boxes: 3,
      return_json: true,
    },
  })

  // Output shape: we saw in Test 04 that output may be { media_path, json_path }
  // Try multiple shapes.
  if (output?.json_path) {
    const res = await fetch(output.json_path)
    const detections = await res.json()
    return extractBestBbox(detections)
  }
  if (Array.isArray(output?.detections)) return extractBestBbox(output)
  if (typeof output === 'object' && output?.boxes) return extractBestBbox(output)
  // If we can't parse, return null and caller falls back to center crop.
  return null
}

function extractBestBbox(detections) {
  // Accept multiple shapes. Prefer largest "face", fall back to largest "person".
  const dets = detections?.detections || detections?.boxes || detections || []
  const arr = Array.isArray(dets) ? dets : []
  if (arr.length === 0) return null
  const normalized = arr.map((d) => ({
    bbox: d.bbox || d.box || d,
    label: (d.label || d.class_name || d.name || '').toLowerCase(),
    score: d.score || d.confidence || 0,
  }))
  const faces = normalized.filter((d) => d.label.includes('face'))
  const people = normalized.filter((d) => d.label.includes('person'))
  const pick =
    faces.sort((a, b) => bboxArea(b.bbox) - bboxArea(a.bbox))[0] ||
    people.sort((a, b) => bboxArea(b.bbox) - bboxArea(a.bbox))[0] ||
    null
  return pick?.bbox || null
}

function bboxArea(b) {
  if (!b) return 0
  const [x1, y1, x2, y2] = b
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
}

async function sourceDims(videoPath) {
  // Use ffprobe to get width/height.
  const { stdout } = await (await import('./lib/ffmpeg.mjs')).ffprobe([
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0',
    videoPath,
  ])
  const [w, h] = stdout.trim().split(',').map(Number)
  return { w, h }
}

async function crop9x16WithFace(clipPath, bbox, outPath) {
  const { w, h } = await sourceDims(clipPath)
  const targetAR = OUTPUT_W / OUTPUT_H

  // We preserve source height when possible, crop width to match 9:16.
  const cropH = h
  const cropW = Math.round(h * targetAR)

  let faceCenterX
  if (bbox) {
    const [x1, , x2] = bbox
    faceCenterX = (x1 + x2) / 2
  } else {
    faceCenterX = w / 2
    log.warn('  no bbox, using center crop')
  }

  let cropX = Math.round(faceCenterX - cropW / 2)
  cropX = Math.max(0, Math.min(cropX, w - cropW))

  log.dim(`  src ${w}x${h}, crop ${cropW}x${cropH} at x=${cropX}`)

  await ffmpeg([
    '-y',
    '-i', clipPath,
    '-vf', `crop=${cropW}:${cropH}:${cropX}:0,scale=${OUTPUT_W}:${OUTPUT_H}`,
    '-c:a', 'copy',
    '-preset', 'fast',
    '-crf', '20',
    outPath,
  ])
}

async function main() {
  // Pick first slot that has all deps.
  const slots = readdirSync(SPIKE.outputs)
    .filter((f) => /\.clip1\.mp4$/.test(f))
    .map((f) => f.replace('.clip1.mp4', ''))

  if (slots.length === 0) {
    log.err('No .clip1.mp4 files. Run 05-ffmpeg-cut.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const slot of slots) {
    log.step(`Pipeline A: ${slot}`)
    const clipPath = join(SPIKE.outputs, `${slot}.clip1.mp4`)
    const captionedPath = join(SPIKE.outputs, `${slot}.captioned.hormozi.mp4`)
    if (!existsSync(clipPath)) {
      log.warn(`  missing ${clipPath}; skipping`)
      continue
    }

    try {
      // Face bbox from middle frame.
      const duration = await probeDuration(clipPath)
      const mid = duration / 2
      log.dim(`  probing face bbox at ${mid.toFixed(1)}s`)
      const bbox = await detectPersonBbox(clipPath, mid).catch((e) => {
        log.warn(`  yolo-world failed: ${e.message?.slice(0, 200)}`)
        return null
      })

      // Crop + scale to 9:16.
      const cropped = join(SPIKE.outputs, `${slot}.pipelineA.cropped.mp4`)
      await crop9x16WithFace(clipPath, bbox, cropped)

      // Use existing captioned clip if present. Otherwise burn fresh.
      // For simplicity, re-burn captions on the cropped clip by regenerating
      // the ASS over the same words. (Captions scale with video.)
      const finalPath = join(SPIKE.outputs, `${slot}.pipelineA.final.mp4`)
      if (existsSync(captionedPath)) {
        // Re-apply the same ASS file to the cropped clip.
        const assPath = join(SPIKE.outputs, `${slot}.captions.hormozi.ass`)
        if (existsSync(assPath)) {
          const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
          await ffmpeg([
            '-y',
            '-i', cropped,
            '-vf', `subtitles='${escaped}'`,
            '-c:a', 'copy',
            '-preset', 'fast',
            finalPath,
          ])
        } else {
          // No ASS → just rename cropped.
          await ffmpeg(['-y', '-i', cropped, '-c', 'copy', finalPath])
        }
      } else {
        await ffmpeg(['-y', '-i', cropped, '-c', 'copy', finalPath])
      }

      log.ok(`  → ${finalPath}`)
      results.push({ slot, status: 'ok', finalPath, bboxFound: !!bbox })
    } catch (err) {
      log.err(`  ${slot}: ${err.message?.slice(0, 300)}`)
      results.push({ slot, status: 'failed', error: err.message })
    }
  }

  const lines = [
    'End-to-end Pipeline A: Source video → cut → face-centered 9:16 crop → Hormozi captions.',
    '',
    '| Slot | bbox detected | Final |',
    '|------|:-------------:|:-----:|',
    ...results.map(
      (r) =>
        `| ${r.slot} | ${r.bboxFound ? '✅' : '❌ (fallback: center)'} | ${r.status === 'ok' ? '✅ ' + basename(r.finalPath) : '❌'} |`
    ),
    '',
    'Visually review each `<slot>.pipelineA.final.mp4` in outputs/.',
  ]
  recordFinding('Test 08 — Pipeline A end-to-end (Talking Head)', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
