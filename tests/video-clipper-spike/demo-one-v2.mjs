#!/usr/bin/env node
// v2 demo: improvements from first watch-through.
//
// Fixes vs demo-one.mjs:
//   1. Captions no longer overflow — max 2 words per chunk, 1 if any word
//      is >9 chars. Font 80, stronger outline, middle-center alignment.
//   2. Crop now ALWAYS pans — gentle sine drift of ±3% frame width layered
//      on top of face-aware tracking, so the frame breathes even during
//      face-detection gaps.
//   3. New audio — LLM generates a hype narrator opener, Gemini TTS voices
//      it, we prepend a 3s title card with that narration before the clip.
//
// Usage: node demo-one-v2.mjs <source-video> <slot-name>

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
const FACE_MODELS = join(SPIKE.root, 'node_modules', '@vladmandic', 'face-api', 'model')
await faceapi.nets.ssdMobilenetv1.loadFromDisk(FACE_MODELS)

// ---------- constants ----------
requireEnv(['REPLICATE_API_TOKEN', 'OPENROUTER_API_KEY'])

const WHISPERX =
  'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb'
const LLM_MODEL = 'openai/gpt-4o-mini'
const TTS_MODEL =
  'google/gemini-3.1-flash-tts:32b7a9aa2193530976b32268a165d4abc4e524aa75db9f33285e69f4c3a0926d'
const TTS_VOICE = 'Puck' // punchy, energetic
const OUTPUT_W = 1080
const OUTPUT_H = 1920
const INTRO_SEC = 3 // title card / narrator duration
const DRIFT_AMPLITUDE_PCT = 0.03 // ±3% of frame width
const DRIFT_PERIOD_SEC = 6 // one full cycle every 6s

// ---------- args ----------
const [, , srcArg, slotArg] = process.argv
if (!srcArg || !slotArg) {
  log.err('Usage: node demo-one-v2.mjs <source-video> <slot-name>')
  process.exit(1)
}
const SRC = resolve(srcArg)
const SLOT = slotArg
if (!existsSync(SRC)) {
  log.err(`Source not found: ${SRC}`)
  process.exit(1)
}

// ---------- ffmpeg helpers ----------
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
  const out = []
  for (const p of framePaths) {
    const img = await loadImage(p)
    const c = new Canvas(img.width, img.height)
    c.getContext('2d').drawImage(img, 0, 0)
    const dets = await faceapi.detectAllFaces(
      c,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
    )
    out.push({
      width: img.width,
      height: img.height,
      faces: dets.map((d) => ({
        x: d.box.x, y: d.box.y, w: d.box.width, h: d.box.height, score: d.score,
      })),
    })
  }
  return out
}

function primaryFaceSeries(frames, fps) {
  return frames.map((f, i) => {
    if (f.faces.length === 0) return { t: i / fps, cx: null }
    const big = [...f.faces].sort((a, b) => b.w * b.h - a.w * a.h)[0]
    return { t: i / fps, cx: big.x + big.w / 2 }
  })
}

function fillGaps(series) {
  const filled = series.map((s) => ({ ...s }))
  let last = null
  for (const s of filled) {
    if (s.cx == null) s.cx = last
    else last = s.cx
  }
  last = null
  for (let i = filled.length - 1; i >= 0; i--) {
    if (filled[i].cx == null) filled[i].cx = last
    else last = filled[i].cx
  }
  return filled
}

function smooth(series, window = 7) {
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

// Build a piecewise-linear expression for the base x (face-tracking)
// and layer a sine drift on top so the frame always breathes.
function buildCropXExpr(series, cropW, srcW) {
  const valid = series.filter((s) => s.cx != null)
  const maxX = srcW - cropW
  const center = Math.max(0, Math.round(maxX / 2))

  let baseExpr
  if (valid.length === 0) {
    baseExpr = String(center)
  } else {
    const points = valid.map((s) => {
      let x = s.cx - cropW / 2
      x = Math.max(0, Math.min(x, maxX))
      return { t: s.t, x: Math.round(x) }
    })
    if (points.length === 1) {
      baseExpr = String(points[0].x)
    } else {
      let expr = String(points[points.length - 1].x)
      for (let i = points.length - 2; i >= 0; i--) {
        const a = points[i]
        const b = points[i + 1]
        const dt = b.t - a.t || 0.001
        const slope = (b.x - a.x) / dt
        expr = `if(between(t,${a.t.toFixed(3)},${b.t.toFixed(3)}), ${a.x}+${slope.toFixed(2)}*(t-${a.t.toFixed(3)}), ${expr})`
      }
      baseExpr = expr
    }
  }

  // Sine drift on top — gives constant gentle pan even when face is static.
  const amp = Math.round(srcW * DRIFT_AMPLITUDE_PCT)
  const driftExpr = `${amp}*sin(2*PI*t/${DRIFT_PERIOD_SEC})`

  // Clamp combined to [0, maxX]
  return `max(0,min(${maxX}, (${baseExpr})+(${driftExpr})))`
}

// ---------- captions ----------
function secToAssTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`
}

function wordsInWindow(transcript, startSec, endSec) {
  const out = []
  for (const seg of transcript.segments || []) {
    for (const w of seg.words || []) {
      if (w.end >= startSec && w.start <= endSec) {
        out.push({
          start: Math.max(0, w.start - startSec),
          end: Math.max(0, w.end - startSec),
          word: (w.word || '').trim(),
        })
      }
    }
  }
  return out
}

// Adaptive chunking: 2 words max, but 1 if either is long (>9 chars).
function chunkWordsAdaptive(words) {
  const chunks = []
  let i = 0
  while (i < words.length) {
    const w1 = words[i]
    if (!w1) break
    const w2 = words[i + 1]
    const longSolo = w1.word.length > 9
    if (longSolo || !w2 || w1.word.length + w2.word.length > 14) {
      chunks.push([w1])
      i += 1
    } else {
      chunks.push([w1, w2])
      i += 2
    }
  }
  return chunks
}

// Offset all caption timings by introSec so they align to the main clip
// that starts after the title card.
function buildHormoziAss(words, introOffsetSec) {
  const header = `[Script Info]
Title: Demo Captions v2
ScriptType: v4.00+
PlayResX: ${OUTPUT_W}
PlayResY: ${OUTPUT_H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Impact,80,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,5,2,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const events = []
  const chunks = chunkWordsAdaptive(words)
  for (const chunk of chunks) {
    if (chunk.length === 0) continue
    const start = secToAssTime(chunk[0].start + introOffsetSec)
    const end = secToAssTime(chunk[chunk.length - 1].end + introOffsetSec)
    const fullText = chunk.map((w) => w.word.toUpperCase()).join(' ')
    events.push(`Dialogue: 0,${start},${end},Hormozi,,0,0,0,,${fullText}`)
    if (chunk.length > 1) {
      for (const w of chunk) {
        const wStart = secToAssTime(w.start + introOffsetSec)
        const wEnd = secToAssTime(w.end + introOffsetSec)
        const highlighted = chunk
          .map((x) =>
            x === w
              ? `{\\c&H0000FFFF&}${x.word.toUpperCase()}{\\c&H00FFFFFF&}`
              : x.word.toUpperCase()
          )
          .join(' ')
        events.push(`Dialogue: 1,${wStart},${wEnd},Hormozi,,0,0,0,,${highlighted}`)
      }
    } else {
      // Single word — still highlight it yellow the whole time.
      const wStart = secToAssTime(chunk[0].start + introOffsetSec)
      const wEnd = secToAssTime(chunk[0].end + introOffsetSec)
      events.push(
        `Dialogue: 1,${wStart},${wEnd},Hormozi,,0,0,0,,{\\c&H0000FFFF&}${chunk[0].word.toUpperCase()}`
      )
    }
  }
  return header + events.join('\n') + '\n'
}

// Title card captions (intro overlay text, large, centered).
function buildTitleCardAss(title, hook, durationSec) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${OUTPUT_W}
PlayResY: ${OUTPUT_H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Impact,110,&H0000FFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,6,3,5,80,80,0,1
Style: Hook,Arial,50,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,5,120,120,-300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,${secToAssTime(durationSec)},Title,,0,0,0,,${title.toUpperCase()}
Dialogue: 0,0:00:00.30,${secToAssTime(durationSec)},Hook,,0,0,0,,${hook}
`
}

// ---------- TTS ----------
async function ttsNarrate(text, outPath) {
  const output = await replicate.run(TTS_MODEL, {
    input: {
      text,
      voice: TTS_VOICE,
      prompt:
        'Read this as a hyped-up battle rap announcer introducing the bar of the night. Short, punchy, energetic. High energy, clean diction.',
      language_code: 'en-US',
    },
  })
  const url = typeof output === 'string' ? output : output?.url?.()
  if (!url) throw new Error('Gemini TTS returned no URL')
  const res = await fetch(url)
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()))
  return outPath
}

// ---------- main ----------
async function main() {
  log.step(`v2 demo pipeline: ${SRC}`)

  // 1. Stage source.
  const srcCopy = join(SPIKE.videos, `${SLOT}.mp4`)
  if (!existsSync(srcCopy)) copyFileSync(SRC, srcCopy)

  // 2. Transcribe (cached from v1).
  const transcriptPath = join(SPIKE.outputs, `${SLOT}.transcript.json`)
  if (!existsSync(transcriptPath)) {
    const audioPath = join(SPIKE.outputs, `${SLOT}.mp3`)
    if (!existsSync(audioPath)) await extractAudio(srcCopy, audioPath)
    log.step('Transcribing via WhisperX')
    const audioUrl = await uploadFile(audioPath)
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
    writeFileSync(transcriptPath, JSON.stringify(out, null, 2))
  }
  const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'))

  // 3. LLM picks segments AND a narrator intro line for the top one.
  log.step('Picking viral segments + narrator line')
  const tagged = (transcript.segments || [])
    .map((s) => `(${Math.round(s.start)}s) ${(s.text || '').trim()}`)
    .join(' ')
  const prompt = `You are a World-Class Viral Video Editor AND a battle-rap hype announcer. Find the TOP 3 "gold nugget" segments in the transcript below.

### RULES
1. Start each segment with a HOOK — never filler.
2. Stranger-test: understandable with no context.
3. Arc: hook → value → satisfying end. Never cut mid-sentence.
4. Each segment MUST be 20–60 seconds — enforce strictly.
5. For the TOP pick, also write a 7-12 word HYPE intro line (battle rap announcer voice) that sets up the bar. Example: "Geechi Gotti just exposed the blueprint — watch this."

### TRANSCRIPT
${tagged}

### OUTPUT (JSON only)
{
  "segments": [
    { "title": "...", "hook_reason": "...", "start_sec": N, "end_sec": N, "duration_sec": N, "confidence": 1-10 }
  ],
  "top_narrator_line": "7-12 word hype announcer intro for the top pick"
}`
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://directorspalette.com',
      'X-Title': 'Video Clipper Demo v2',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  const picks = (parsed.segments || []).filter((p) => p.duration_sec <= 60)
  if (picks.length === 0) throw new Error('No valid picks returned')
  const pick = picks.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
  const narratorLine = parsed.top_narrator_line || `Watch what Geechi Gotti just said.`
  log.ok(`  pick: "${pick.title}" (${pick.start_sec}-${pick.end_sec}s, conf ${pick.confidence})`)
  log.dim(`  narrator: "${narratorLine}"`)

  // 4. Generate narrator TTS.
  log.step('Generating narrator audio (Gemini TTS)')
  const narratorPath = join(SPIKE.outputs, `${SLOT}.v2.narrator.wav`)
  await ttsNarrate(narratorLine, narratorPath)
  const narratorDur = await probeDuration(narratorPath)
  // Pad 0.5s of silence after narrator for breathing room before the bar hits.
  const introDur = Number((narratorDur + 0.5).toFixed(2))
  log.dim(`  narrator ${narratorDur.toFixed(1)}s → intro ${introDur}s (w/ 0.5s pad)`)

  // 5. Cut the pick.
  const clipPath = join(SPIKE.outputs, `${SLOT}.v2.clip.mp4`)
  log.step(`Cutting pick`)
  await cutClip(srcCopy, pick.start_sec, pick.end_sec, clipPath)

  // 6. Face detection @ 2fps.
  const framesDir = join(SPIKE.outputs, `${SLOT}.v2.frames-tmp`)
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true })
  log.step('Face detection at 2 fps')
  const framePaths = await extractFramesFps(clipPath, framesDir, 2)
  const frameDets = await detectFacesInFrames(framePaths)
  const faceSeries = primaryFaceSeries(frameDets, 2)
  const hits = faceSeries.filter((s) => s.cx != null).length
  log.ok(`  hit rate: ${hits}/${faceSeries.length} (${((hits / faceSeries.length) * 100).toFixed(0)}%)`)
  rmSync(framesDir, { recursive: true, force: true })

  // 7. Dynamic crop with sine drift.
  const { w: srcW, h: srcH } = await sourceDims(clipPath)
  const cropH = srcH
  const cropW = Math.min(srcW, Math.round(srcH * (OUTPUT_W / OUTPUT_H)))
  const filled = fillGaps(faceSeries)
  const smoothed = smooth(filled, 7)
  const cropX = buildCropXExpr(smoothed, cropW, srcW)
  log.dim(`  src ${srcW}x${srcH} → crop ${cropW}x${cropH} + ±${Math.round(srcW * DRIFT_AMPLITUDE_PCT)}px sine drift`)

  const croppedPath = join(SPIKE.outputs, `${SLOT}.v2.cropped.mp4`)
  log.step('Cropping to 9:16 (face-aware + drift)')
  await ffmpeg([
    '-y',
    '-i', clipPath,
    '-vf', `crop=${cropW}:${cropH}:x='${cropX}':y=0,scale=${OUTPUT_W}:${OUTPUT_H}`,
    '-c:a', 'copy',
    '-preset', 'fast',
    '-crf', '20',
    croppedPath,
  ])

  // 8. Build a title card video (static gradient + title text) with narrator audio.
  log.step('Building title card intro')
  const titleCardAss = join(SPIKE.outputs, `${SLOT}.v2.titlecard.ass`)
  writeFileSync(titleCardAss, buildTitleCardAss(pick.title, narratorLine, introDur))
  const titleCardPath = join(SPIKE.outputs, `${SLOT}.v2.titlecard.mp4`)
  const escTitle = titleCardAss.replace(/\\/g, '/').replace(/:/g, '\\:')
  await ffmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0a0a0a:s=${OUTPUT_W}x${OUTPUT_H}:d=${introDur}:r=25`,
    '-i', narratorPath,
    '-filter_complex',
    `[0:v]subtitles='${escTitle}'[v];[1:a]apad=whole_dur=${introDur},asetpts=PTS-STARTPTS[a]`,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-t', String(introDur),
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    titleCardPath,
  ])

  // 9. Concat title card + cropped clip via filter_complex (handles codec
  // parameter differences; concat demuxer was doubling durations).
  const mergedPath = join(SPIKE.outputs, `${SLOT}.v2.merged.mp4`)
  log.step('Concatenating intro + clip')
  await ffmpeg([
    '-y',
    '-i', titleCardPath,
    '-i', croppedPath,
    '-filter_complex',
    '[0:v]setsar=1,fps=25[v0];[1:v]setsar=1,fps=25[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]',
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    mergedPath,
  ])

  // 10. Burn main-clip captions (offset by introDur).
  const words = wordsInWindow(transcript, pick.start_sec, pick.end_sec)
  log.step(`Building Hormozi captions (${words.length} words, offset +${introDur}s)`)
  const assPath = join(SPIKE.outputs, `${SLOT}.v2.captions.ass`)
  writeFileSync(assPath, buildHormoziAss(words, introDur))

  const finalPath = join(SPIKE.outputs, `${SLOT}.v2.final.mp4`)
  const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  log.step('Burning captions → final')
  await ffmpeg([
    '-y',
    '-i', mergedPath,
    '-vf', `subtitles='${escaped}'`,
    '-c:a', 'copy',
    '-preset', 'fast',
    finalPath,
  ])

  log.ok(`\nFINAL v2 → ${finalPath}`)
  log.dim(`  Intro (${introDur}s): narrator — "${narratorLine}"`)
  log.dim(`  Clip (${pick.duration_sec}s): "${pick.title}"`)
  log.dim(`  Total: ${introDur + pick.duration_sec}s`)
}

main().catch((err) => {
  log.err(err.message || err)
  console.error(err)
  process.exit(1)
})
