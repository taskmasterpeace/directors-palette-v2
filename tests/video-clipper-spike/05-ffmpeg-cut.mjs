#!/usr/bin/env node
// Test 05: Frame-accurate cut via local ffmpeg. Trivial but confirms tooling.
// Cuts segment 1 from each .segments.json file.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { cutSegment, probeDuration } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

async function cutOne(slot) {
  log.step(`Cutting ${slot}`)
  const videoPath = join(SPIKE.videos, `${slot}.mp4`)
  const segmentsPath = join(SPIKE.outputs, `${slot}.segments.json`)

  if (!existsSync(videoPath) || !existsSync(segmentsPath)) {
    return { slot, status: 'skipped', reason: 'missing video or segments' }
  }

  const { picks } = JSON.parse(readFileSync(segmentsPath, 'utf8'))
  if (!picks?.length) return { slot, status: 'skipped', reason: 'no picks' }

  const pick = picks[0]
  const outPath = join(SPIKE.outputs, `${slot}.clip1.mp4`)

  const started = Date.now()
  await cutSegment(videoPath, pick.start_sec, pick.end_sec, outPath)
  const elapsedSec = (Date.now() - started) / 1000
  const duration = await probeDuration(outPath)

  log.ok(`  ${outPath} (${duration.toFixed(1)}s, cut in ${elapsedSec.toFixed(1)}s)`)

  return {
    slot,
    status: 'ok',
    outPath,
    expectedDuration: pick.duration_sec,
    actualDuration: duration,
    elapsedSec,
  }
}

async function main() {
  const segmentsFiles = readdirSync(SPIKE.outputs)
    .filter((f) => f.endsWith('.segments.json'))
  if (segmentsFiles.length === 0) {
    log.err('No .segments.json. Run 02-segment-picker.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const f of segmentsFiles) {
    const slot = basename(f, '.segments.json')
    try {
      results.push(await cutOne(slot))
    } catch (err) {
      log.err(`${slot}: ${err.message?.slice(0, 300)}`)
      results.push({ slot, status: 'failed', error: err.message })
    }
  }

  const lines = [
    'Local ffmpeg cut + re-encode (h264/aac, crf 20).',
    '',
    '| Slot | Expected | Actual | Cut time |',
    '|------|---------:|-------:|---------:|',
    ...results
      .filter((r) => r.status === 'ok')
      .map(
        (r) =>
          `| ${r.slot} | ${r.expectedDuration}s | ${r.actualDuration.toFixed(1)}s | ${r.elapsedSec.toFixed(1)}s |`
      ),
  ]
  recordFinding('Test 05 — ffmpeg cut', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
