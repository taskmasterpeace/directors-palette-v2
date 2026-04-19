#!/usr/bin/env node
// Test 06: Generate ASS subtitle file from word-level JSON with 3 style presets
// and burn into the clip.
//
// Styles:
//   - hormozi    (big, white w/ yellow highlight per word, bottom-center)
//   - minimal    (clean white, bottom-third)
//   - karaoke    (word-by-word fill animation)
//
// Picks first .clip1.mp4 in outputs/ to caption. Uses word timestamps
// from <slot>.transcript.json.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SPIKE } from './lib/paths.mjs'
import { ffmpeg } from './lib/ffmpeg.mjs'
import { log, recordFinding } from './lib/log.mjs'

// Pull word list in {start,end,word} within time window from transcript.
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

function secToAssTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`
}

// Chunk words into 3-4 word lines to avoid overflow.
function chunkWords(words, maxPerLine = 4) {
  const chunks = []
  for (let i = 0; i < words.length; i += maxPerLine) {
    chunks.push(words.slice(i, i + maxPerLine))
  }
  return chunks
}

function buildAssHeader(style) {
  const common = `[Script Info]
Title: Spike Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
`
  if (style === 'hormozi') {
    return (
      common +
      `Style: Hormozi,Impact,96,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,6,0,2,60,60,240,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
    )
  }
  if (style === 'minimal') {
    return (
      common +
      `Style: Minimal,Arial,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2,2,2,60,60,160,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
    )
  }
  // karaoke
  return (
    common +
    `Style: Karaoke,Impact,88,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,5,0,2,60,60,200,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
  )
}

function buildAssEvents(words, style) {
  const chunks = chunkWords(words, 4)
  const events = []

  for (const chunk of chunks) {
    if (chunk.length === 0) continue
    const start = secToAssTime(chunk[0].start)
    const end = secToAssTime(chunk[chunk.length - 1].end)

    if (style === 'minimal') {
      const text = chunk.map((w) => w.word).join(' ')
      events.push(`Dialogue: 0,${start},${end},Minimal,,0,0,0,,${text}`)
      continue
    }

    if (style === 'hormozi') {
      // Emit one dialogue per word, each styled with a highlight color,
      // plus a base line showing the whole chunk.
      const fullText = chunk.map((w) => w.word).join(' ')
      events.push(`Dialogue: 0,${start},${end},Hormozi,,0,0,0,,${fullText}`)
      for (const w of chunk) {
        const wStart = secToAssTime(w.start)
        const wEnd = secToAssTime(w.end)
        // Overlay: same line, but current word colored yellow.
        const highlighted = chunk
          .map((x) => (x === w ? `{\\c&H0000FFFF&}${x.word}{\\c&H00FFFFFF&}` : x.word))
          .join(' ')
        events.push(`Dialogue: 1,${wStart},${wEnd},Hormozi,,0,0,0,,${highlighted}`)
      }
      continue
    }

    if (style === 'karaoke') {
      // Use ASS \k tags for karaoke timing.
      const kTags = chunk
        .map((w) => {
          const cs = Math.max(1, Math.round((w.end - w.start) * 100))
          return `{\\kf${cs}}${w.word}`
        })
        .join(' ')
      events.push(`Dialogue: 0,${start},${end},Karaoke,,0,0,0,,${kTags}`)
    }
  }

  return events.join('\n') + '\n'
}

async function burn(clipPath, assPath, outPath) {
  // Windows ffmpeg needs escaped path for subtitles filter.
  const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  await ffmpeg([
    '-y',
    '-i', clipPath,
    '-vf', `subtitles='${escaped}'`,
    '-c:a', 'copy',
    '-preset', 'fast',
    outPath,
  ])
}

async function main() {
  const clips = readdirSync(SPIKE.outputs).filter((f) => /\.clip1\.mp4$/.test(f))
  if (clips.length === 0) {
    log.err('No .clip1.mp4 files in outputs/. Run 05-ffmpeg-cut.mjs first.')
    process.exit(1)
  }

  const results = []
  for (const clip of clips) {
    const slot = clip.replace('.clip1.mp4', '')
    log.step(`Burning captions: ${slot}`)

    const transcriptPath = join(SPIKE.outputs, `${slot}.transcript.json`)
    const segmentsPath = join(SPIKE.outputs, `${slot}.segments.json`)
    if (!existsSync(transcriptPath) || !existsSync(segmentsPath)) {
      log.warn(`  missing transcript or segments; skipping`)
      continue
    }

    const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'))
    const { picks } = JSON.parse(readFileSync(segmentsPath, 'utf8'))
    const pick = picks[0]
    const words = wordsInWindow(transcript, pick.start_sec, pick.end_sec)

    if (words.length === 0) {
      log.warn(`  no word-level timestamps in window ${pick.start_sec}-${pick.end_sec}s`)
      results.push({ slot, status: 'no_words' })
      continue
    }
    log.dim(`  ${words.length} words in window`)

    const clipPath = join(SPIKE.outputs, clip)
    const styleResults = {}
    for (const style of ['hormozi', 'minimal', 'karaoke']) {
      const assPath = join(SPIKE.outputs, `${slot}.captions.${style}.ass`)
      const outPath = join(SPIKE.outputs, `${slot}.captioned.${style}.mp4`)
      const ass = buildAssHeader(style) + buildAssEvents(words, style)
      writeFileSync(assPath, ass)
      try {
        await burn(clipPath, assPath, outPath)
        styleResults[style] = { status: 'ok', outPath }
        log.ok(`  ${style} → ${outPath}`)
      } catch (err) {
        styleResults[style] = { status: 'failed', error: err.message?.slice(0, 300) }
        log.err(`  ${style} failed: ${err.message?.slice(0, 200)}`)
      }
    }

    results.push({ slot, status: 'ok', wordCount: words.length, styles: styleResults })
  }

  const lines = [
    'Captions built locally via ASS subtitle format + ffmpeg subtitles filter.',
    '',
    '| Slot | Words | Hormozi | Minimal | Karaoke |',
    '|------|------:|:-------:|:-------:|:-------:|',
    ...results
      .filter((r) => r.status === 'ok')
      .map((r) => {
        const ok = (s) => (r.styles[s]?.status === 'ok' ? '✅' : '❌')
        return `| ${r.slot} | ${r.wordCount} | ${ok('hormozi')} | ${ok('minimal')} | ${ok('karaoke')} |`
      }),
    '',
    'Review output MP4s visually: `outputs/<slot>.captioned.<style>.mp4`',
  ]
  recordFinding('Test 06 — Caption burn-in', lines.join('\n'))

  log.step('Done.')
}

main().catch((err) => {
  log.err(err)
  process.exit(1)
})
