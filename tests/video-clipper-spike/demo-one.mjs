#!/usr/bin/env node
// End-to-end demo for ONE source video.
// Usage: node demo-one.mjs <absolute-path-to-source-video> <slot-name>
//
// Runs the full pipeline as envisioned for the production feature:
//   1. Transcribe (WhisperX)
//   2. Pick top viral moments (LLM)
//   3. Cut the best segment
//   4. Detect faces across the cut (local, no Replicate)
//   5. Face-aware 9:16 crop (smoothed mean-face centering)
//   6. Burn Hormozi captions
//   7. Write final 9:16 MP4

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { env, requireEnv } from './lib/env.mjs'
import { replicate, uploadFile } from './lib/replicate.mjs'
import { ffmpeg, extractAudio, probeDuration, ffprobe } from './lib/ffmpeg.mjs'
import { log } from './lib/log.mjs'

// ---------- face-api (node-wasm) ----------
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')
const { setWasmPaths } = require('@tensorflow/tfjs-backend-wasm')
import canvasPkg from 'canvas'
const { Canvas, Image, ImageData, loadImage } = canvasPkg
setWasmPaths(
  join(SPIKE.root, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/'
)
await faceapi.tf.setBackend('wasm')
await faceapi.tf.ready()
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
const FACE_MODELS = join(
  SPIKE.root,
  'node_modules',
  '@vladmandic',
  'face-api',
  'model'
)
await faceapi.nets.ssdMobilenetv1.loadFromDisk(FACE_MODELS)

// ---------- constants ----------
requireEnv(['REPLICATE_API_TOKEN', 'OPENROUTER_API_KEY'])

const WHISPERX =
  'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb'
const LLM_MODEL = 'openai/gpt-4o-mini'
const OUTPUT_W = 1080
const OUTPUT_H = 1920

// ---------- args ----------
const [, , srcArg, slotArg] = process.argv
if (!srcArg || !slotArg) {
  log.err('Usage: node demo-one.mjs <source-video> <slot-name>')
  process.exit(1)
}
const SRC = resolve(srcArg)
const SLOT = slotArg
if (!existsSync(SRC)) {
  log.err(`Source not found: ${SRC}`)
  process.exit(1)
}

// ---------- helpers ----------
async function sourceDims(path) {
  const { stdout } = await ffprobe([
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0',
    path,
  ])
  const [w, h] = stdout.trim().split(',').map(Number)
  return { w, h }
}

async function cutClip(srcPath, start, end, out) {
  await ffmpeg([
    '-y',
    '-ss', String(start),
    '-i', srcPath,
    '-t', String(end - start),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    '-crf', '20',
    out,
  ])
}

async function extractFramesFps(clipPath, outDir, fps) {
  mkdirSync(outDir, { recursive: true })
  await ffmpeg([
    '-y',
    '-i', clipPath,
    '-vf', `fps=${fps}`,
    '-q:v', '2',
    join(outDir, 'frame-%04d.jpg'),
  ])
  return readdirSync(outDir).filter((f) => f.startsWith('frame-')).sort()
    .map((f) => join(outDir, f))
}

async function detectFacesInFrames(framePaths) {
  const results = []
  for (const p of framePaths) {
    const img = await loadImage(p)
    const c = new Canvas(img.width, img.height)
    c.getContext('2d').drawImage(img, 0, 0)
    const dets = await faceapi.detectAllFaces(
      c,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
    )
    results.push({
      width: img.width,
      height: img.height,
      faces: dets.map((d) => ({
        x: d.box.x, y: d.box.y, w: d.box.width, h: d.box.height, score: d.score,
      })),
    })
  }
  return results
}

// Pick the largest face per frame, return series of {t, cx}.
function primaryFaceSeries(frames, fps) {
  return frames.map((f, i) => {
    if (f.faces.length === 0) return { t: i / fps, cx: null }
    const big = [...f.faces].sort((a, b) => b.w * b.h - a.w * a.h)[0]
    return { t: i / fps, cx: big.x + big.w / 2 }
  })
}

// Forward/backward fill NaN centers from nearest known frame.
function fillGaps(series) {
  const n = series.length
  const filled = series.map((s) => ({ ...s }))
  // forward fill
  let last = null
  for (let i = 0; i < n; i++) {
    if (filled[i].cx == null) filled[i].cx = last
    else last = filled[i].cx
  }
  // backward fill for leading nulls
  last = null
  for (let i = n - 1; i >= 0; i--) {
    if (filled[i].cx == null) filled[i].cx = last
    else last = filled[i].cx
  }
  return filled
}

// Rolling median smoothing to kill jitter.
function smooth(series, window = 5) {
  const n = series.length
  const out = []
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - Math.floor(window / 2))
    const hi = Math.min(n, i + Math.ceil(window / 2))
    const vals = series.slice(lo, hi).map((s) => s.cx).filter((v) => v != null).sort((a, b) => a - b)
    if (vals.length === 0) {
      out.push({ t: series[i].t, cx: null })
      continue
    }
    const mid = Math.floor(vals.length / 2)
    const cx = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid]
    out.push({ t: series[i].t, cx })
  }
  return out
}

// Build a piecewise-linear ffmpeg expression for x as a function of t.
function buildCropXExpr(series, cropW, srcW) {
  const valid = series.filter((s) => s.cx != null)
  if (valid.length === 0) return String(Math.max(0, Math.round((srcW - cropW) / 2)))
  // Convert face-cx to crop-x, clamp to valid range.
  const points = valid.map((s) => {
    let x = s.cx - cropW / 2
    x = Math.max(0, Math.min(x, srcW - cropW))
    return { t: s.t, x: Math.round(x) }
  })
  if (points.length === 1) return String(points[0].x)
  // Piecewise linear via nested if(): if(lte(t,t0),x0, if(lte(t,t1), lerp, ...))
  // This expression can get long. For ~60 points it's ~2KB which is fine.
  let expr = String(points[points.length - 1].x)
  for (let i = points.length - 2; i >= 0; i--) {
    const a = points[i]
    const b = points[i + 1]
    const dt = b.t - a.t || 0.001
    const slope = (b.x - a.x) / dt
    // if t <= a.t  → a.x + slope*(t-a.t)  else previous
    // We use between(t,a.t,b.t) for the interpolation segment.
    expr = `if(between(t,${a.t.toFixed(3)},${b.t.toFixed(3)}), ${a.x}+${slope.toFixed(2)}*(t-${a.t.toFixed(3)}), ${expr})`
  }
  // Clamp final value to [0, srcW-cropW] for safety.
  return `max(0,min(${srcW - cropW}, ${expr}))`
}

// ---------- ASS captions ----------
function secToAssTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`
}

function wordsInWindow(transcript, startSec, endSec) {
  const words = []
  for (const seg of transcript.segments || []) {
    for (const w of seg.words || []) {
      if (w.end >= startSec && w.start <= endSec) {
        words.push({
          start: Math.max(0, w.start - startSec),
          end: Math.max(0, w.end - startSec),
          word: (w.word || '').trim(),
        })
      }
    }
  }
  return words
}

function buildHormoziAss(words) {
  const header = `[Script Info]
Title: Demo Captions
ScriptType: v4.00+
PlayResX: ${OUTPUT_W}
PlayResY: ${OUTPUT_H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Impact,96,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,6,0,2,60,60,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const events = []
  const chunks = []
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4))
  for (const chunk of chunks) {
    if (chunk.length === 0) continue
    const start = secToAssTime(chunk[0].start)
    const end = secToAssTime(chunk[chunk.length - 1].end)
    const fullText = chunk.map((w) => w.word).join(' ')
    events.push(`Dialogue: 0,${start},${end},Hormozi,,0,0,0,,${fullText}`)
    for (const w of chunk) {
      const wStart = secToAssTime(w.start)
      const wEnd = secToAssTime(w.end)
      const highlighted = chunk
        .map((x) => (x === w ? `{\\c&H0000FFFF&}${x.word}{\\c&H00FFFFFF&}` : x.word))
        .join(' ')
      events.push(`Dialogue: 1,${wStart},${wEnd},Hormozi,,0,0,0,,${highlighted}`)
    }
  }
  return header + events.join('\n') + '\n'
}

// ---------- main pipeline ----------
async function main() {
  log.step(`Demo pipeline for: ${SRC}`)

  // 1. Stage source into videos/
  const srcCopy = join(SPIKE.videos, `${SLOT}.mp4`)
  if (!existsSync(srcCopy)) {
    log.dim(`  staging → ${srcCopy}`)
    copyFileSync(SRC, srcCopy)
  }

  // 2. Extract audio + transcribe (skip if already done)
  const audioPath = join(SPIKE.outputs, `${SLOT}.mp3`)
  const transcriptPath = join(SPIKE.outputs, `${SLOT}.transcript.json`)
  if (!existsSync(transcriptPath)) {
    if (!existsSync(audioPath)) {
      log.step('Extracting audio')
      await extractAudio(srcCopy, audioPath)
    }
    const dur = await probeDuration(audioPath)
    log.dim(`  ${dur.toFixed(1)}s of audio`)
    log.step('Uploading audio to Replicate')
    const audioUrl = await uploadFile(audioPath)
    log.step('Transcribing via WhisperX')
    const t0 = Date.now()
    const out = await replicate.run(WHISPERX, {
      input: {
        audio_file: audioUrl,
        language: 'en',
        align_output: true,
        diarization: false,
        batch_size: 64,
        temperature: 0,
      },
    })
    log.ok(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    writeFileSync(transcriptPath, JSON.stringify(out, null, 2))
  } else {
    log.dim(`Transcript already exists → ${transcriptPath}`)
  }

  const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'))

  // 3. LLM pick top 3 segments
  log.step('Picking viral segments via LLM')
  const tagged = (transcript.segments || [])
    .map((s) => `(${Math.round(s.start)}s) ${(s.text || '').trim()}`)
    .join(' ')
  const prompt = `You are a World-Class Viral Video Editor. Find the TOP 3 "gold nugget" segments in the transcript below that can stand alone as viral TikToks.

### TIME TAGS
Tags like (12s) are timestamps. Use them for start/end.

### RULES
1. Start with a HOOK — never filler.
2. A stranger must understand it with no prior context.
3. Arc: hook → value → satisfying end. Never cut mid-sentence.
4. Each segment MUST be 20–75 seconds.

### TRANSCRIPT
${tagged}

### OUTPUT (JSON only)
{
  "segments": [
    { "title": "...", "hook_reason": "...", "start_sec": N, "end_sec": N, "duration_sec": N, "confidence": 1-10 }
  ]
}`
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://directorspalette.com',
      'X-Title': 'Video Clipper Demo',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const { segments: picks } = JSON.parse(data.choices[0].message.content)
  writeFileSync(
    join(SPIKE.outputs, `${SLOT}.segments.json`),
    JSON.stringify({ picks, usage: data.usage }, null, 2)
  )
  log.ok(`  ${picks.length} picks`)
  for (const p of picks) {
    log.dim(`  • ${p.start_sec}–${p.end_sec}s (${p.duration_sec}s, conf ${p.confidence}): "${p.title}"`)
  }

  // 4. Cut the top pick
  const pick = picks.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
  const clipPath = join(SPIKE.outputs, `${SLOT}.clip.mp4`)
  log.step(`Cutting top pick: "${pick.title}" (${pick.start_sec}-${pick.end_sec}s)`)
  await cutClip(srcCopy, pick.start_sec, pick.end_sec, clipPath)

  // 5. Face detection across the clip at 2fps
  const framesDir = join(SPIKE.outputs, `${SLOT}.frames-tmp`)
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true })
  log.step('Detecting faces at 2 fps')
  const framePaths = await extractFramesFps(clipPath, framesDir, 2)
  const frameDets = await detectFacesInFrames(framePaths)
  const faceSeries = primaryFaceSeries(frameDets, 2)
  const hits = faceSeries.filter((s) => s.cx != null).length
  log.ok(`  face hit rate: ${hits}/${faceSeries.length} (${((hits / faceSeries.length) * 100).toFixed(0)}%)`)
  rmSync(framesDir, { recursive: true, force: true })

  // 6. Smooth + fill gaps, build dynamic crop expression
  const { w: srcW, h: srcH } = await sourceDims(clipPath)
  const cropH = srcH
  const cropW = Math.min(srcW, Math.round(srcH * (OUTPUT_W / OUTPUT_H)))
  const filled = fillGaps(faceSeries)
  const smoothed = smooth(filled, 7)
  const cropX = buildCropXExpr(smoothed, cropW, srcW)
  log.dim(`  src ${srcW}x${srcH} → crop ${cropW}x${cropH}, dynamic x`)

  // 7. Apply dynamic crop + scale to 9:16
  const croppedPath = join(SPIKE.outputs, `${SLOT}.cropped.mp4`)
  log.step('Applying face-aware crop + scale to 9:16')
  await ffmpeg([
    '-y',
    '-i', clipPath,
    '-vf', `crop=${cropW}:${cropH}:x='${cropX}':y=0,scale=${OUTPUT_W}:${OUTPUT_H}`,
    '-c:a', 'copy',
    '-preset', 'fast',
    '-crf', '20',
    croppedPath,
  ])

  // 8. Build Hormozi captions from word timings in segment window
  const words = wordsInWindow(transcript, pick.start_sec, pick.end_sec)
  log.step(`Building Hormozi captions (${words.length} words)`)
  const assPath = join(SPIKE.outputs, `${SLOT}.captions.ass`)
  writeFileSync(assPath, buildHormoziAss(words))

  // 9. Burn captions
  const finalPath = join(SPIKE.outputs, `${SLOT}.final.mp4`)
  const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  log.step('Burning captions')
  await ffmpeg([
    '-y',
    '-i', croppedPath,
    '-vf', `subtitles='${escaped}'`,
    '-c:a', 'copy',
    '-preset', 'fast',
    finalPath,
  ])

  log.ok(`\nFINAL → ${finalPath}`)
  log.dim(`  Title: "${pick.title}"`)
  log.dim(`  Hook: ${pick.hook_reason}`)
  log.dim(`  Duration: ${pick.duration_sec}s`)
}

main().catch((err) => {
  log.err(err.message || err)
  console.error(err)
  process.exit(1)
})
