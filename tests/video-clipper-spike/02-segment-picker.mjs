#!/usr/bin/env node
// Test 02: Pick viral segments from each transcript via OpenRouter LLM.
// Reuses the ViralCutter prompt philosophy, outputs structured JSON.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { env, requireEnv } from './lib/env.mjs'
import { log, recordFinding } from './lib/log.mjs'

requireEnv(['OPENROUTER_API_KEY'])

const MODEL = 'openai/gpt-4o-mini'
const MIN_DURATION = 20
const MAX_DURATION = 75
const TARGET_SEGMENT_COUNT = 5

// Condense transcript to text with embedded time tags every ~10s.
function transcriptToTimeTaggedText(segments) {
  const parts = []
  for (const seg of segments) {
    const start = Math.round(seg.start)
    parts.push(`(${start}s) ${(seg.text || '').trim()}`)
  }
  return parts.join(' ')
}

function buildPrompt({ transcriptTagged, amount, minDuration, maxDuration }) {
  return `You are a World-Class Viral Video Editor. Find ${amount} "gold nugget" segments in the transcript below that can stand alone as viral TikToks/Reels/Shorts.

### TIME TAGS
Tags like (12s) indicate the timestamp of the text that follows. Use them to compute segment start/end.

### RULES
1. **No garbage starts.** Never start with filler ("Um", "So", "And then", "Hi guys"). Start with a hook.
2. **Standalone test.** A stranger must understand it with no prior context.
3. **Arc.** Hook (0-3s) → value → satisfying ending. Never cut mid-sentence.
4. **Duration.** Each segment MUST be ${minDuration}–${maxDuration} seconds.

### TRANSCRIPT
${transcriptTagged}

### OUTPUT (JSON only, no prose)
{
  "segments": [
    {
      "title": "Short punchy title (max 8 words)",
      "hook_reason": "Why this works as a viral short (one sentence)",
      "start_sec": number,
      "end_sec": number,
      "duration_sec": number,
      "confidence": 1-10
    }
  ]
}`
}

async function pickSegments(transcriptPath) {
  const slot = basename(transcriptPath, '.transcript.json')
  log.step(`Picking segments for ${slot}`)

  const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'))
  const segments = transcript.segments || []
  if (segments.length === 0) {
    log.warn(`  no segments in transcript`)
    return { slot, status: 'no_transcript' }
  }

  const tagged = transcriptToTimeTaggedText(segments)
  log.dim(`  transcript length: ${tagged.length} chars, ${segments.length} segments`)

  const prompt = buildPrompt({
    transcriptTagged: tagged,
    amount: TARGET_SEGMENT_COUNT,
    minDuration: MIN_DURATION,
    maxDuration: MAX_DURATION,
  })

  const started = Date.now()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://directorspalette.com',
      'X-Title': 'Video Clipper Spike',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  })
  const elapsedSec = (Date.now() - started) / 1000

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  const usage = data.usage || {}

  const parsed = JSON.parse(content)
  const picks = parsed.segments || []

  const outPath = join(SPIKE.outputs, `${slot}.segments.json`)
  writeFileSync(outPath, JSON.stringify({ model: MODEL, picks, usage, elapsedSec }, null, 2))
  log.ok(`  ${picks.length} segments in ${elapsedSec.toFixed(1)}s → ${outPath}`)

  for (const p of picks) {
    log.dim(`  • ${p.start_sec}–${p.end_sec}s (${p.duration_sec}s) "${p.title}"`)
  }

  return {
    slot,
    status: 'ok',
    pickCount: picks.length,
    picks,
    elapsedSec,
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
  }
}

async function main() {
  const transcripts = readdirSync(SPIKE.outputs)
    .filter((f) => f.endsWith('.transcript.json'))
    .map((f) => join(SPIKE.outputs, f))

  if (transcripts.length === 0) {
    log.err('No transcripts in outputs/. Run 01-whisperx-transcribe.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const t of transcripts) {
    try {
      const r = await pickSegments(t)
      results.push(r)
    } catch (err) {
      log.err(`${basename(t)} failed: ${err.message?.slice(0, 300)}`)
      results.push({ slot: basename(t, '.transcript.json'), status: 'failed', error: err.message })
    }
  }

  const lines = [
    `Model: \`${MODEL}\`, target ${TARGET_SEGMENT_COUNT} picks, duration ${MIN_DURATION}-${MAX_DURATION}s`,
    '',
    '| Slot | Picks | Elapsed | In tokens | Out tokens |',
    '|------|------:|--------:|----------:|-----------:|',
    ...results
      .filter((r) => r.status === 'ok')
      .map(
        (r) =>
          `| ${r.slot} | ${r.pickCount} | ${r.elapsedSec.toFixed(1)}s | ${r.inputTokens} | ${r.outputTokens} |`
      ),
    '',
    '### Sample picks',
    '',
    ...results
      .filter((r) => r.status === 'ok')
      .flatMap((r) => [
        `**${r.slot}**`,
        ...r.picks.map(
          (p) =>
            `- \`${p.start_sec}s–${p.end_sec}s\` (${p.duration_sec}s, conf ${p.confidence}): "${p.title}" — ${p.hook_reason}`
        ),
        '',
      ]),
  ]
  recordFinding('Test 02 — Viral segment picking', lines.join('\n'))

  log.step(`Done. ${results.filter(r => r.status === 'ok').length}/${results.length} succeeded.`)
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
