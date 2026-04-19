#!/usr/bin/env node
// Test 00: Download 5 short test videos (~5 min slices) from YouTube.
// Edit SOURCES below to change.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { downloadYouTube } from './lib/youtube.mjs'
import { log, recordFinding } from './lib/log.mjs'

const SOURCES = [
  {
    slot: 'podcast',
    // Lex Fridman — short segment, 2 speakers
    url: 'https://www.youtube.com/watch?v=lG7Uxts9SXs',
    slice: '5:00-10:00',
    description: 'Podcast / interview, 2 speakers',
  },
  {
    slot: 'keynote',
    // TED Talk — single speaker, stage
    url: 'https://www.youtube.com/watch?v=arj7oStGLkU',
    slice: '0:30-5:30',
    description: 'Single-speaker keynote (TED Talk, Tim Urban "Procrastinator")',
  },
  {
    slot: 'vlog',
    // Casey Neistat style vlog (or similar moving-camera vlog)
    url: 'https://www.youtube.com/watch?v=_Z5-P9v3F8w',
    slice: '0:30-5:30',
    description: 'Vlog, moving camera, 1 speaker',
  },
  {
    slot: 'tutorial',
    // Fireship (Jeff Delaney) — short, high-energy tech tutorial
    url: 'https://www.youtube.com/watch?v=lsMQRaeKNDk',
    slice: '0:00-4:00',
    description: 'Tutorial / explainer, voiceover + code screen',
  },
  {
    slot: 'music_event',
    // Live concert / event with multiple people
    url: 'https://www.youtube.com/watch?v=YykjpeuMNEk',
    slice: '0:30-5:30',
    description: 'Music event, multiple people',
  },
]

async function main() {
  log.step(`Downloading ${SOURCES.length} test videos`)

  const results = []
  for (const src of SOURCES) {
    const outPath = join(SPIKE.videos, `${src.slot}.mp4`)

    if (existsSync(outPath)) {
      log.ok(`${src.slot}.mp4 already exists, skipping`)
      results.push({ ...src, outPath, status: 'skipped' })
      continue
    }

    try {
      await downloadYouTube(src.url, outPath, { slice: src.slice })
      log.ok(`${src.slot}.mp4 downloaded`)
      results.push({ ...src, outPath, status: 'ok' })
    } catch (err) {
      log.err(`${src.slot} failed: ${err.message?.slice(0, 300)}`)
      results.push({ ...src, outPath, status: 'failed', error: err.message })
    }
  }

  const lines = results.map((r) => {
    const icon = r.status === 'ok' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌'
    return `- ${icon} **${r.slot}** (${r.description}) — ${r.status}${
      r.error ? `\n  - error: ${r.error.slice(0, 200)}` : ''
    }`
  })
  recordFinding('Test 00 — Download source videos', lines.join('\n'))

  log.step('Done. See videos/ directory.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
