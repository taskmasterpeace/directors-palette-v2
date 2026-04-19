#!/usr/bin/env node
// Test 03: Extract 5 evenly-spaced frames from each video, run through
// ahmdyassr/detect-crop-face. Output is cropped face images we inspect visually.
// Goal: see if faces are present + stable enough that a STATIC crop per clip
// could work (vs needing per-frame tracking in Test 04).

import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { replicate, uploadFile } from './lib/replicate.mjs'
import { extractFrame, probeDuration } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

const MODEL = 'ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d'
const FRAMES_PER_VIDEO = 5

async function detectOne(videoPath) {
  const slot = basename(videoPath, '.mp4')
  log.step(`Face detection on ${slot}`)

  const framesDir = join(SPIKE.outputs, `${slot}-frames`)
  mkdirSync(framesDir, { recursive: true })

  const duration = await probeDuration(videoPath)
  const times = Array.from({ length: FRAMES_PER_VIDEO }, (_, i) =>
    Math.floor(((i + 0.5) / FRAMES_PER_VIDEO) * duration)
  )

  const perFrame = []
  for (const [idx, t] of times.entries()) {
    const framePath = join(framesDir, `frame-${idx + 1}-at-${t}s.jpg`)
    const cropPath = join(framesDir, `crop-${idx + 1}-at-${t}s.png`)

    try {
      log.dim(`  frame ${idx + 1}/${FRAMES_PER_VIDEO} @ ${t}s`)
      await extractFrame(videoPath, t, framePath)

      const url = await uploadFile(framePath)
      const output = await replicate.run(MODEL, {
        input: { image: url, padding: 0.3 },
      })

      // Output is a URL (or ReadableStream of URL contents) to the cropped image.
      const outUrl = typeof output === 'string' ? output : output?.url?.() || null

      if (outUrl) {
        const res = await fetch(outUrl)
        const buf = Buffer.from(await res.arrayBuffer())
        writeFileSync(cropPath, buf)
        perFrame.push({ t, status: 'face', framePath, cropPath })
        log.dim(`    face detected → ${cropPath}`)
      } else {
        // Some builds return a stream. Try to read it.
        try {
          const chunks = []
          for await (const chunk of output) chunks.push(chunk)
          writeFileSync(cropPath, Buffer.concat(chunks))
          perFrame.push({ t, status: 'face', framePath, cropPath })
          log.dim(`    face detected (stream) → ${cropPath}`)
        } catch {
          perFrame.push({ t, status: 'no_face', framePath })
          log.dim(`    no face detected`)
        }
      }
    } catch (err) {
      // The model errors when no face detected.
      const msg = err.message?.slice(0, 200) || String(err)
      perFrame.push({ t, status: 'error_or_no_face', error: msg, framePath })
      log.dim(`    no face / error: ${msg}`)
    }
  }

  const faceFrames = perFrame.filter((p) => p.status === 'face').length
  return {
    slot,
    framesSampled: FRAMES_PER_VIDEO,
    faceFrames,
    perFrame,
  }
}

async function main() {
  const videos = readdirSync(SPIKE.videos).filter((f) => f.endsWith('.mp4'))
  if (videos.length === 0) {
    log.err('No videos in videos/. Run 00-download-videos.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const v of videos) {
    try {
      const r = await detectOne(join(SPIKE.videos, v))
      results.push({ ...r, status: 'ok' })
    } catch (err) {
      log.err(`${v} failed: ${err.message?.slice(0, 300)}`)
      results.push({ slot: basename(v, '.mp4'), status: 'failed', error: err.message })
    }
  }

  const lines = [
    `Model: \`${MODEL}\` (returns cropped face image; note: no bbox coords in output)`,
    '',
    `Sampled **${FRAMES_PER_VIDEO}** evenly-spaced frames per video.`,
    '',
    '| Slot | Faces found | Per-frame |',
    '|------|:-----------:|-----------|',
    ...results
      .filter((r) => r.status === 'ok')
      .map((r) => {
        const perFrameStr = r.perFrame
          .map((p) => (p.status === 'face' ? '✅' : '❌'))
          .join('')
        return `| ${r.slot} | ${r.faceFrames}/${r.framesSampled} | ${perFrameStr} |`
      }),
    '',
    '### Visual inspection',
    '',
    'Open the `outputs/<slot>-frames/` directories to compare:',
    '- Source frames (`frame-*.jpg`)',
    '- Cropped faces (`crop-*.png`)',
    '',
    'Key question: do the crops look like the SAME face position across frames? If yes → static crop works. If faces move a lot → need per-frame tracking (Test 04).',
  ]
  recordFinding('Test 03 — Single-frame face detection', lines.join('\n'))

  log.step(`Done. Inspect outputs/*-frames/ visually.`)
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
