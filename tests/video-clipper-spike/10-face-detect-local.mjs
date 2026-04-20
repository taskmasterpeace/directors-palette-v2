#!/usr/bin/env node
// Test 10: Local per-frame face detection via @vladmandic/face-api.
// This is the make-or-break test that decides whether we need a Cog model.
// If this gives us reliable bboxes on real clips, Pipeline A's face-aware
// crop is back on the table WITHOUT any external model.
//
// Strategy:
//   1. For each <slot>.clip1.mp4 in outputs/, extract frames at 2 fps to a
//      temp dir using ffmpeg.
//   2. Load each frame with node-canvas, run SsdMobilenetv1 detector.
//   3. Record bboxes over time; compute hit rate + centroid jitter.
//
// Output: outputs/<slot>.face-track-local.json per slot, and a summary in
// findings.md.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { ffmpeg } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// Use the node-wasm build of face-api so we avoid native tfjs-node (which
// doesn't ship Node-25 binaries). node-wasm pulls in @tensorflow/tfjs +
// @tensorflow/tfjs-backend-wasm directly.
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm')
import canvasPkg from 'canvas'
const { Canvas, Image, ImageData, loadImage } = canvasPkg

setWasmPaths(
  join(SPIKE.root, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/'
)
await faceapi.tf.setBackend('wasm')
await faceapi.tf.ready()

// Monkey-patch faceapi env to use node-canvas.
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

const MODELS_DIR = join(
  SPIKE.root,
  'node_modules',
  '@vladmandic',
  'face-api',
  'model'
)
const SAMPLE_FPS = 2

async function loadModels() {
  log.dim(`  loading models from ${MODELS_DIR}`)
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR)
  log.ok('  models loaded')
}

async function extractFrames(clipPath, outDir, fps) {
  mkdirSync(outDir, { recursive: true })
  await ffmpeg([
    '-y',
    '-i',
    clipPath,
    '-vf',
    `fps=${fps}`,
    '-q:v',
    '2',
    join(outDir, 'frame-%04d.jpg'),
  ])
  return readdirSync(outDir)
    .filter((f) => f.startsWith('frame-'))
    .sort()
    .map((f) => join(outDir, f))
}

async function detectFaces(framePath) {
  const img = await loadImage(framePath)
  const canvas = new Canvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const detections = await faceapi.detectAllFaces(
    canvas,
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
  )
  return {
    width: img.width,
    height: img.height,
    faces: detections.map((d) => ({
      x: d.box.x,
      y: d.box.y,
      w: d.box.width,
      h: d.box.height,
      score: d.score,
    })),
  }
}

function computeStats(frames) {
  const total = frames.length
  const withFaces = frames.filter((f) => f.faces.length > 0).length
  const primaryCentroids = frames.map((f) => {
    if (f.faces.length === 0) return null
    // Largest face by area.
    const face = [...f.faces].sort((a, b) => b.w * b.h - a.w * a.h)[0]
    return { cx: face.x + face.w / 2, cy: face.y + face.h / 2 }
  })

  // Centroid jitter: avg px movement between consecutive frames that both
  // have a face. Normalize by frame width for comparability.
  let totalJitter = 0
  let jitterSamples = 0
  let maxJitter = 0
  for (let i = 1; i < primaryCentroids.length; i++) {
    const a = primaryCentroids[i - 1]
    const b = primaryCentroids[i]
    if (!a || !b) continue
    const dx = b.cx - a.cx
    const dy = b.cy - a.cy
    const d = Math.sqrt(dx * dx + dy * dy)
    totalJitter += d
    maxJitter = Math.max(maxJitter, d)
    jitterSamples++
  }
  const avgJitterPx = jitterSamples === 0 ? 0 : totalJitter / jitterSamples
  const frameW = frames[0]?.width || 1
  return {
    total,
    withFaces,
    hitRate: total === 0 ? 0 : withFaces / total,
    avgJitterPx,
    avgJitterPct: (avgJitterPx / frameW) * 100,
    maxJitterPx: maxJitter,
    maxJitterPct: (maxJitter / frameW) * 100,
  }
}

async function processOne(slot) {
  log.step(`Local face detect: ${slot}`)
  const clipPath = join(SPIKE.outputs, `${slot}.clip1.mp4`)
  if (!existsSync(clipPath)) {
    log.warn(`  missing ${clipPath}; skipping`)
    return { slot, status: 'skipped' }
  }

  const framesDir = join(SPIKE.outputs, `${slot}.local-frames`)
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true })

  log.dim(`  extracting frames at ${SAMPLE_FPS} fps`)
  const frames = await extractFrames(clipPath, framesDir, SAMPLE_FPS)
  log.dim(`  ${frames.length} frames to scan`)

  const started = Date.now()
  const results = []
  for (let i = 0; i < frames.length; i++) {
    const r = await detectFaces(frames[i])
    results.push({
      t: i / SAMPLE_FPS,
      width: r.width,
      height: r.height,
      faces: r.faces,
    })
  }
  const elapsedMs = Date.now() - started
  const msPerFrame = elapsedMs / frames.length

  const stats = computeStats(results)
  const outPath = join(SPIKE.outputs, `${slot}.face-track-local.json`)
  writeFileSync(
    outPath,
    JSON.stringify({ slot, fps: SAMPLE_FPS, stats, frames: results }, null, 2)
  )

  log.ok(
    `  hit ${stats.withFaces}/${stats.total} (${(stats.hitRate * 100).toFixed(0)}%), ` +
      `jitter avg ${stats.avgJitterPx.toFixed(1)}px (${stats.avgJitterPct.toFixed(1)}%), ` +
      `${msPerFrame.toFixed(0)}ms/frame`
  )

  // Clean up frames dir to save disk.
  rmSync(framesDir, { recursive: true, force: true })

  return {
    slot,
    status: 'ok',
    frames: stats.total,
    hits: stats.withFaces,
    hitRate: stats.hitRate,
    avgJitterPx: stats.avgJitterPx,
    avgJitterPct: stats.avgJitterPct,
    maxJitterPct: stats.maxJitterPct,
    msPerFrame,
    elapsedMs,
  }
}

async function main() {
  await loadModels()

  const slots = readdirSync(SPIKE.outputs)
    .filter((f) => /\.clip1\.mp4$/.test(f))
    .map((f) => f.replace('.clip1.mp4', ''))

  if (slots.length === 0) {
    log.err('No .clip1.mp4 files. Run 05-ffmpeg-cut.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const slot of slots) {
    try {
      results.push(await processOne(slot))
    } catch (err) {
      log.err(`${slot} failed: ${err.message?.slice(0, 300)}`)
      results.push({ slot, status: 'failed', error: err.message })
    }
  }

  const ok = results.filter((r) => r.status === 'ok')
  const lines = [
    'Local face detection via `@vladmandic/face-api` (SsdMobilenetv1, no Replicate, no Cog).',
    '',
    '| Slot | Frames | Hits | Hit rate | Avg jitter | Max jitter | ms/frame |',
    '|------|-------:|-----:|---------:|-----------:|-----------:|---------:|',
    ...ok.map(
      (r) =>
        `| ${r.slot} | ${r.frames} | ${r.hits} | ${(r.hitRate * 100).toFixed(0)}% | ` +
        `${r.avgJitterPx.toFixed(1)}px (${r.avgJitterPct.toFixed(1)}%) | ` +
        `${r.maxJitterPct.toFixed(1)}% | ${r.msPerFrame.toFixed(0)} |`
    ),
    ...results
      .filter((r) => r.status !== 'ok')
      .map((r) => `| ${r.slot} | — | — | — | — | — | ${r.status}${r.error ? ': ' + r.error.slice(0, 80) : ''} |`),
    '',
    'Interpretation:',
    '- **Hit rate** — % of sampled frames with ≥1 face. Talking-head should be near 100%.',
    '- **Avg jitter** — how much the largest face\'s center moves between consecutive frames.',
    '  Under ~3% of frame width means the crop window will be stable with light smoothing.',
    '- **ms/frame** — inference speed. At 2 fps sampling, we scan 1 min of video per',
    '  (30 frames × ms/frame)ms.',
    '',
    'Per-frame bboxes saved to `outputs/<slot>.face-track-local.json`.',
  ]
  recordFinding('Test 10 — Local face detection (no Replicate)', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
