#!/usr/bin/env node
// Test 07: Google Gemini 3.1 Flash TTS via Replicate — 3 style prompts, same text.
// Replicate model: google/gemini-3.1-flash-tts
// Validates narrator quality + style control without needing a direct Gemini API key.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { replicate } from './lib/replicate.mjs'
import { log, recordFinding } from './lib/log.mjs'

const MODEL =
  'google/gemini-3.1-flash-tts:32b7a9aa2193530976b32268a165d4abc4e524aa75db9f33285e69f4c3a0926d'
const VOICE = 'Kore'

const SAMPLE_TEXT = `The old fisherman stared at the empty sea for hours. Every day for 84 days, he had returned with nothing. But on the 85th morning, something felt different. The water was still. Too still. And then he felt the tug on his line that would change his life forever.`

const STYLES = [
  {
    name: 'documentary',
    prompt: 'Narrate in a calm, professional documentary tone.',
  },
  {
    name: 'upbeat_explainer',
    prompt: 'Read with excited, upbeat energy like a YouTube explainer.',
  },
  {
    name: 'dramatic',
    prompt: 'Narrate in a dramatic, cinematic trailer voice with tension and pauses.',
  },
]

async function generate(style) {
  log.step(`Generating "${style.name}"`)

  const started = Date.now()
  const output = await replicate.run(MODEL, {
    input: {
      text: SAMPLE_TEXT,
      voice: VOICE,
      prompt: style.prompt,
      language_code: 'en-US',
    },
  })
  const elapsedSec = (Date.now() - started) / 1000

  // Output is a URI string (or a FileOutput with .url()).
  const url =
    typeof output === 'string'
      ? output
      : output?.url?.()
      ? output.url()
      : null
  if (!url) throw new Error(`Unexpected output shape: ${JSON.stringify(output).slice(0, 200)}`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())

  // Infer extension from content-type or URL.
  const ct = res.headers.get('content-type') || ''
  const ext =
    ct.includes('wav') || url.endsWith('.wav')
      ? 'wav'
      : ct.includes('mpeg') || url.endsWith('.mp3')
      ? 'mp3'
      : 'bin'
  const outPath = join(SPIKE.outputs, `narrator-${style.name}.${ext}`)
  writeFileSync(outPath, buf)

  log.ok(`  ${outPath} (${(buf.length / 1024).toFixed(1)} KB, ${elapsedSec.toFixed(1)}s)`)
  return {
    name: style.name,
    outPath,
    bytes: buf.length,
    elapsedSec,
    contentType: ct,
  }
}

async function main() {
  const results = []
  for (const style of STYLES) {
    try {
      results.push(await generate(style))
    } catch (err) {
      log.err(`${style.name}: ${err.message?.slice(0, 400)}`)
      results.push({ name: style.name, status: 'failed', error: err.message })
    }
  }

  const lines = [
    `Model: \`google/gemini-3.1-flash-tts\` (Replicate), voice: ${VOICE}`,
    '',
    '| Style | Elapsed | Size | Type | Output |',
    '|-------|--------:|-----:|------|--------|',
    ...results
      .filter((r) => r.outPath)
      .map(
        (r) =>
          `| ${r.name} | ${r.elapsedSec.toFixed(1)}s | ${(r.bytes / 1024).toFixed(0)} KB | ${r.contentType || '?'} | \`${r.outPath}\` |`
      ),
    '',
    'Listen to each `narrator-*.{wav,mp3}` in `outputs/` and evaluate voice naturalness + style control.',
    '',
    'Note: Gemini 3.1 Flash TTS supports inline tags like `[sigh]`, `[laughing]`, `[whispering]`, `[shouting]`, `[extremely fast]` inside the text itself for fine-grained delivery control.',
  ]
  recordFinding('Test 07 — Gemini TTS narrator (Replicate)', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
