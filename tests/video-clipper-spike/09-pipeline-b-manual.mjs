#!/usr/bin/env node
// Test 09: End-to-end Pipeline B (AI Recap / Narrated Short).
//
// Pipeline B ≠ Pipeline A. Instead of preserving source footage, we:
//   1. Take the best segment from 02-segment-picker output.
//   2. Rewrite the transcript of that segment as a punchy narration script
//      (OpenRouter gpt-4o-mini) — 45-60s spoken, hook-forward.
//   3. Generate 4-6 cinematic still images (Replicate flux-schnell) from the
//      script, one per "beat" — returned by the same LLM call.
//   4. TTS the narration via Gemini 2.5 Flash TTS (from Test 07).
//   5. Assemble: stills with Ken Burns pan/zoom, crossfade between beats,
//      narration audio on top, captions burned in.
//
// Requires: 01 (transcript) + 02 (segments) already run.
// Produces: <slot>.pipelineB.final.mp4 — a 9:16 narrated short with visuals.
//
// Picks the first slot that has all dependencies ready.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { env, requireEnv } from './lib/env.mjs'
import { replicate } from './lib/replicate.mjs'
import { ffmpeg } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

requireEnv(['OPENROUTER_API_KEY'])

const OUTPUT_W = 1080
const OUTPUT_H = 1920
const TTS_MODEL =
  'google/gemini-3.1-flash-tts:32b7a9aa2193530976b32268a165d4abc4e524aa75db9f33285e69f4c3a0926d'
const TTS_VOICE = 'Kore'
const IMAGE_MODEL = 'black-forest-labs/flux-schnell'
const IMAGE_ASPECT = '9:16'

// --- 1. Script + shot-list generation ----------------------------------------

async function generateRecapScript(transcriptText, topicHint) {
  const systemPrompt = `You are a short-form video editor writing punchy narration + a visual shot list.

Given a transcript excerpt, produce a 45-60 second spoken script (about 120-150 words) that:
- Opens with a hook in the first sentence.
- Summarizes the most interesting claim / story / insight.
- Ends with a payoff or memorable line.

Then produce a shot list of 4 to 6 cinematic still image prompts, one per beat of the script.
Each image prompt should be self-contained, describe a specific scene, and be photoreal/cinematic.

Return STRICT JSON:
{
  "title": "short 3-5 word title",
  "narration": "The full spoken script as one continuous paragraph.",
  "style_hint": "documentary | dramatic | upbeat_explainer",
  "shots": [
    { "beat": "one-line description of this moment", "image_prompt": "full cinematic image prompt, 9:16 aspect" }
  ]
}`

  const userPrompt = `Topic hint: ${topicHint}

Transcript excerpt:
"""
${transcriptText}
"""

Produce the recap.`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 400)}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in OpenRouter response')
  const parsed = JSON.parse(content)
  if (!parsed.narration || !Array.isArray(parsed.shots) || parsed.shots.length === 0) {
    throw new Error(`Bad recap shape: ${content.slice(0, 400)}`)
  }
  return parsed
}

// --- 2. TTS via Gemini -------------------------------------------------------

async function ttsGemini(text, styleHint, outPath) {
  const stylePrompt = {
    documentary: 'Narrate in a calm, professional documentary tone.',
    dramatic: 'Narrate in a dramatic, cinematic trailer voice with tension and pauses.',
    upbeat_explainer: 'Read with excited, upbeat energy like a YouTube explainer.',
  }[styleHint || 'documentary'] || 'Narrate naturally.'

  const output = await replicate.run(TTS_MODEL, {
    input: {
      text,
      voice: TTS_VOICE,
      prompt: stylePrompt,
      language_code: 'en-US',
    },
  })
  const url =
    typeof output === 'string'
      ? output
      : output?.url?.()
      ? output.url()
      : null
  if (!url) throw new Error(`Unexpected TTS output shape: ${JSON.stringify(output).slice(0, 200)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch narration audio: ${res.status}`)
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()))
  return outPath
}

// --- 3. Image generation via Replicate flux-schnell --------------------------

async function generateShotImage(prompt, outPath) {
  const output = await replicate.run(IMAGE_MODEL, {
    input: {
      prompt,
      aspect_ratio: IMAGE_ASPECT,
      num_outputs: 1,
      output_format: 'jpg',
      output_quality: 90,
    },
  })
  // flux-schnell returns an array of file outputs; newest SDK returns Readable streams.
  const first = Array.isArray(output) ? output[0] : output
  const url = typeof first === 'string' ? first : first?.url?.() ?? null
  if (url) {
    const res = await fetch(url)
    writeFileSync(outPath, Buffer.from(await res.arrayBuffer()))
  } else if (first && typeof first.arrayBuffer === 'function') {
    writeFileSync(outPath, Buffer.from(await first.arrayBuffer()))
  } else {
    throw new Error(`Unexpected image output shape: ${JSON.stringify(output).slice(0, 200)}`)
  }
  return outPath
}

// --- 4. Narration timing (probe audio duration) ------------------------------

async function audioDuration(wavPath) {
  const { ffprobe } = await import('./lib/ffmpeg.mjs')
  const { stdout } = await ffprobe([
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    wavPath,
  ])
  return Number.parseFloat(stdout.trim())
}

// --- 5. Ken-Burns assemble ---------------------------------------------------

async function kenBurnsClip(imagePath, durationSec, outPath, direction = 'in') {
  // Zoompan: 25 fps, gradual zoom in or zoom out on the 9:16 canvas.
  const fps = 25
  const frames = Math.max(1, Math.round(durationSec * fps))
  const zoomExpr =
    direction === 'in'
      ? `zoom='min(zoom+0.0015,1.3)'`
      : `zoom='if(eq(on,0),1.3,max(zoom-0.0015,1.0))'`
  // Pan: keep center.
  const filter = [
    `scale=${OUTPUT_W * 2}:${OUTPUT_H * 2}:flags=lanczos`,
    `zoompan=${zoomExpr}:d=${frames}:s=${OUTPUT_W}x${OUTPUT_H}:fps=${fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    `format=yuv420p`,
  ].join(',')

  await ffmpeg([
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-t', String(durationSec),
    '-vf', filter,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    outPath,
  ])
  return outPath
}

async function concatClips(clips, outPath) {
  // Build concat list file.
  const listPath = outPath + '.list.txt'
  const listContent = clips.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
  writeFileSync(listPath, listContent)
  await ffmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    outPath,
  ])
  return outPath
}

async function muxAudio(videoPath, audioPath, outPath) {
  await ffmpeg([
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-map', '0:v:0',
    '-map', '1:a:0',
    outPath,
  ])
  return outPath
}

// --- 6. Simple narration captions (synthesize from timing, not word-level) ---

function buildSimpleAss(narration, durationSec) {
  // Split narration into ~4-word chunks, distribute evenly across duration.
  const words = narration.trim().split(/\s+/)
  const chunkSize = 4
  const chunks = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }
  const perChunk = durationSec / chunks.length

  const header = `[Script Info]
Title: Pipeline B captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Recap,Impact,84,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,5,0,2,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const toAssTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`
  }
  const events = chunks
    .map((c, i) => {
      const start = toAssTime(i * perChunk)
      const end = toAssTime((i + 1) * perChunk)
      return `Dialogue: 0,${start},${end},Recap,,0,0,0,,${c}`
    })
    .join('\n')
  return header + events + '\n'
}

async function burnAss(videoPath, assPath, outPath) {
  const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  await ffmpeg([
    '-y',
    '-i', videoPath,
    '-vf', `subtitles='${escaped}'`,
    '-c:a', 'copy',
    '-preset', 'fast',
    outPath,
  ])
}

// --- Main --------------------------------------------------------------------

async function runPipelineB(slot) {
  log.step(`Pipeline B: ${slot}`)
  const transcriptPath = join(SPIKE.outputs, `${slot}.transcript.json`)
  const segmentsPath = join(SPIKE.outputs, `${slot}.segments.json`)
  if (!existsSync(transcriptPath) || !existsSync(segmentsPath)) {
    return { slot, status: 'skipped', reason: 'missing transcript or segments' }
  }

  const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'))
  const { picks } = JSON.parse(readFileSync(segmentsPath, 'utf8'))
  if (!picks?.length) return { slot, status: 'skipped', reason: 'no picks' }
  const pick = picks[0]

  // Gather transcript text within the pick window.
  const words = []
  for (const seg of transcript.segments || []) {
    for (const w of seg.words || []) {
      if (w.end >= pick.start_sec && w.start <= pick.end_sec) {
        words.push((w.word || '').trim())
      }
    }
  }
  const excerpt = words.join(' ').trim() || (transcript.segments || []).map((s) => s.text).join(' ')
  if (!excerpt) return { slot, status: 'skipped', reason: 'no transcript text' }

  log.dim(`  excerpt: ${excerpt.length} chars`)

  // 1. Recap script + shot list.
  log.dim(`  generating recap script + shot list`)
  const recap = await generateRecapScript(excerpt.slice(0, 4000), pick.title || slot)
  writeFileSync(
    join(SPIKE.outputs, `${slot}.pipelineB.recap.json`),
    JSON.stringify(recap, null, 2)
  )
  log.dim(`  ${recap.shots.length} shots, style=${recap.style_hint}`)

  // 2. TTS narration.
  log.dim(`  TTS narration (${recap.narration.length} chars)`)
  const narrationPath = join(SPIKE.outputs, `${slot}.pipelineB.narration.wav`)
  await ttsGemini(recap.narration, recap.style_hint, narrationPath)
  const narrDur = await audioDuration(narrationPath)
  log.dim(`  narration duration: ${narrDur.toFixed(1)}s`)

  // 3. Generate one image per shot, in parallel.
  log.dim(`  generating ${recap.shots.length} images (parallel)`)
  const imagePaths = await Promise.all(
    recap.shots.map(async (shot, i) => {
      const outPath = join(SPIKE.outputs, `${slot}.pipelineB.shot${i + 1}.jpg`)
      try {
        await generateShotImage(shot.image_prompt, outPath)
        return outPath
      } catch (err) {
        log.warn(`  shot ${i + 1} failed: ${err.message?.slice(0, 150)}`)
        return null
      }
    })
  )
  const validImages = imagePaths.filter(Boolean)
  if (validImages.length === 0) {
    throw new Error('No shot images generated')
  }
  log.dim(`  ${validImages.length}/${recap.shots.length} images ok`)

  // 4. Ken-Burns each image for (narrDur / N) seconds.
  const perShotDur = narrDur / validImages.length
  log.dim(`  ken-burns per shot: ${perShotDur.toFixed(2)}s`)
  const clipPaths = []
  for (let i = 0; i < validImages.length; i++) {
    const clip = join(SPIKE.outputs, `${slot}.pipelineB.kb${i + 1}.mp4`)
    await kenBurnsClip(validImages[i], perShotDur, clip, i % 2 === 0 ? 'in' : 'out')
    clipPaths.push(clip)
  }

  // 5. Concat clips.
  const concatPath = join(SPIKE.outputs, `${slot}.pipelineB.visuals.mp4`)
  await concatClips(clipPaths, concatPath)

  // 6. Mux narration.
  const muxedPath = join(SPIKE.outputs, `${slot}.pipelineB.muxed.mp4`)
  await muxAudio(concatPath, narrationPath, muxedPath)

  // 7. Burn simple captions.
  const assPath = join(SPIKE.outputs, `${slot}.pipelineB.captions.ass`)
  writeFileSync(assPath, buildSimpleAss(recap.narration, narrDur))
  const finalPath = join(SPIKE.outputs, `${slot}.pipelineB.final.mp4`)
  await burnAss(muxedPath, assPath, finalPath)

  log.ok(`  → ${finalPath}`)
  return {
    slot,
    status: 'ok',
    finalPath,
    shotCount: validImages.length,
    narrationSec: narrDur,
    title: recap.title,
    styleHint: recap.style_hint,
  }
}

async function main() {
  const segmentsFiles = readdirSync(SPIKE.outputs).filter((f) => f.endsWith('.segments.json'))
  if (segmentsFiles.length === 0) {
    log.err('No .segments.json files. Run 02-segment-picker.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const f of segmentsFiles) {
    const slot = basename(f, '.segments.json')
    try {
      results.push(await runPipelineB(slot))
    } catch (err) {
      log.err(`${slot}: ${err.message?.slice(0, 300)}`)
      results.push({ slot, status: 'failed', error: err.message })
    }
  }

  const lines = [
    'End-to-end Pipeline B: transcript → LLM recap + shot list → Gemini TTS + flux-schnell stills → Ken-Burns + captions.',
    '',
    '| Slot | Title | Style | Shots | Narration | Final |',
    '|------|-------|-------|------:|----------:|:-----:|',
    ...results.map((r) => {
      if (r.status !== 'ok') return `| ${r.slot} | — | — | — | — | ❌ ${r.reason || r.error?.slice(0, 80) || ''} |`
      return `| ${r.slot} | ${r.title} | ${r.styleHint} | ${r.shotCount} | ${r.narrationSec.toFixed(1)}s | ✅ ${basename(r.finalPath)} |`
    }),
    '',
    'Review each `<slot>.pipelineB.final.mp4` in outputs/. Check: narration timing vs. visuals, Ken-Burns feel, caption readability.',
  ]
  recordFinding('Test 09 — Pipeline B end-to-end (AI Recap)', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
