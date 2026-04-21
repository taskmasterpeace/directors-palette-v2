#!/usr/bin/env node
/**
 * AIOBR Title Card recipe — prompt lab
 *
 * Runs 5 LAYOUT_PRESET variants × 3 seeds = 15 generations, same chapter title
 * held constant, so Robert can A/B/C/D/E judge which preset produces the best
 * title cards. Writes results to test-assets/aiobr-title-cards/<timestamp>/
 * and prints a summary table at the end.
 *
 * No DB inserts. After picking a winner, we seed the recipe properly.
 */

import { config } from 'dotenv'
import { resolve, join } from 'path'
import { mkdirSync, writeFileSync, createWriteStream } from 'fs'
import Replicate from 'replicate'

config({ path: resolve('.env.local') })

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const MODEL = 'google/nano-banana-2'

// Shared constant — every test uses this chapter title so preset is the only variable
const CHAPTER_TITLE = 'THE CAREER SUICIDE OF LOSO'
const CHAPTER_NUMBER = 'CHAPTER 07'
const SUBTITLE = 'How one rookie round ended a battle rap career'
const MOOD = 'Damning'

// 6 title card layout refs + 2 existing AIOBR thumbs = 8 refs total (under 14 max)
const SUPABASE = 'https://tarohelkwuurakbxjyxm.supabase.co'
const REFS = [
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/text-first-pulp-comic-grid.jpg`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-32bit-pixel.png`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-action-figure.png`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/atmospheric-painterly-noir.jpg`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/diegetic-signs-in-scene.png`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-title-cards/typographic-poster-grid.png`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-thumbnails/drugz-the-crimes-against-him-oiwcztoke0.jpg`,
  `${SUPABASE}/storage/v1/object/public/templates/system/aiobr-thumbnails/the-horrific-nightmare-of-hitman-holla-abdiqwjwtlu.jpg`,
]

// Shared preamble — explains the refs and locks the universal rules
function buildPrompt(presetName, presetRules) {
  return `Design a cinematic documentary CHAPTER TITLE CARD.

=== REFERENCE IMAGES DIRECTIVE (READ FIRST) ===
The 8 attached reference images are EXAMPLES OF TITLE CARDS AND THUMBNAILS from UNRELATED content and different genres. They feature DIFFERENT subjects, DIFFERENT stories, DIFFERENT text. DO NOT reproduce the people, clothing, backgrounds, or captions from them. USE THEM STRICTLY AS A GUIDE FOR:
- Typographic hierarchy (title dominant, supporting text secondary)
- Layout conventions (how title, subtitle, chapter number are arranged)
- Compositional framing (negative space, balance, text placement)
- Overall visual energy and punch

=== THIS TITLE CARD ===
CHAPTER NUMBER: "${CHAPTER_NUMBER}"
CHAPTER TITLE (HERO — biggest text on screen): "${CHAPTER_TITLE}"
SUBTITLE: "${SUBTITLE}"
MOOD: ${MOOD}

=== LAYOUT PRESET: ${presetName} ===
${presetRules}

=== UNIVERSAL COMPOSITION RULES ===
- CHAPTER TITLE is the HERO text — biggest, highest contrast, dominant.
- CHAPTER NUMBER is a small marker, top-left or top-right.
- SUBTITLE is secondary, smaller, placed below or adjacent to the hero title.
- Leave clean negative space — do not overcrowd.
- 16:9 widescreen framing.

=== ACCURACY REQUIREMENT ===
All rendered text must be SPELLED EXACTLY as specified — no typos, no character swaps, no invented words.`
}

const PRESETS = {
  TEXT_FIRST: buildPrompt('TEXT-FIRST (PULP COMIC)', `
Render the card as a text-dominant pulp comic cover. Minimal or no illustration — the TYPE is the image.
- Flat saturated color background (deep crimson, mustard yellow, or navy — pick per MOOD)
- CHAPTER TITLE rendered as bold blocky geometric letterforms filling 60-70% of frame
- Thick black or white outline on all text for legibility
- Subtle comic-book halftone texture or ink spatter optional
- NO photographic elements, NO atmospheric scenes
- Reference the pulp comic grid ref for "text is the image" energy`),

  CINEMATIC: buildPrompt('CINEMATIC (PHOTO + OVERLAY TITLE)', `
Render the card as a cinematic establishing shot with title overlaid.
- Atmospheric documentary-style backdrop (empty venue, dim interior, cityscape, alleyway — chosen to reinforce MOOD)
- Backdrop photographed or rendered with cinematic color grading, dramatic lighting, 50mm feel
- CHAPTER TITLE rendered as clean bold sans-serif (Impact / Anton / Bebas) overlaid on the backdrop
- Thick white outline with subtle drop shadow for legibility against the photographic bg
- Reference the atmospheric painterly noir + style sheets for "title layered over scene" compositions`),

  ATMOSPHERIC: buildPrompt('ATMOSPHERIC (PAINTERLY NOIR)', `
Render the card as a moody painterly illustration — the title design is integrated into the atmosphere.
- Painterly noir backdrop with dramatic chiaroscuro, deep shadows, muted cinematic palette
- CHAPTER TITLE rendered in a custom stylized letterform that reinforces the mood (gothic, stenciled, broken, scratched)
- Supporting elements may include a silhouette, a rain-slick street, a single dramatic light source
- Think Batman: The Animated Series episode card — the type design CARRIES the mood
- Reference the atmospheric painterly noir ref directly for this preset's energy`),

  DIEGETIC: buildPrompt('DIEGETIC SIGN (TEXT IN SCENE)', `
Render the card so the title appears as an actual OBJECT in the scene — not an overlay.
- Choose a surface that fits the MOOD: police evidence board, courtroom placard, wooden plaque, engraved stone, chalkboard, neon sign, weathered newspaper
- CHAPTER TITLE is physically ON that surface, with realistic lighting, perspective, and material texture
- Camera framed on the object with environmental context visible around it
- Viewer reads the title as a thing they're looking at in the world
- Reference the diegetic signs ref for "text as in-world object" language`),

  TYPOGRAPHIC: buildPrompt('TYPOGRAPHIC (PURE TYPE, NO ILLUSTRATION)', `
Render the card as a pure typographic poster — no illustration at all.
- Solid or gradient background chosen per MOOD (deep red for Damning, black for Ominous, cream for Nostalgic)
- Title and supporting text rendered in expressive typography — can mix weights, cases, colors
- Optional graphic elements: a horizontal rule, a drop cap, a pullquote treatment
- Think prestige documentary end-card or a New Yorker article opener
- Reference the typographic poster grid for "40 ways to do just type" vocabulary`),
}

async function generate(preset, presetName, runIdx, outDir) {
  const startedAt = Date.now()
  console.log(`  [${preset}] run ${runIdx + 1}/3 — starting...`)

  const input = {
    prompt: presetName,
    image_input: REFS,
    aspect_ratio: '16:9',
    resolution: '2K',
    output_format: 'jpg',
  }

  // Write prompt to a dedicated field (nano-banana-2 expects 'prompt')
  input.prompt = PRESETS[preset]

  let output
  try {
    output = await replicate.run(MODEL, { input })
  } catch (err) {
    console.log(`  [${preset}] run ${runIdx + 1}/3 — FAILED: ${err.message}`)
    return { preset, runIdx, error: err.message }
  }

  // nano-banana-2 returns a single URL or array
  const url = Array.isArray(output) ? output[0] : (typeof output === 'string' ? output : output?.url?.() || output)
  const finalUrl = typeof url === 'object' && url.href ? url.href : url
  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`  [${preset}] run ${runIdx + 1}/3 — done in ${durationSec}s`)
  console.log(`    ${finalUrl}`)

  // Download locally
  try {
    const res = await fetch(finalUrl)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const filename = `${preset.toLowerCase()}-run${runIdx + 1}.jpg`
      writeFileSync(join(outDir, filename), buf)
    }
  } catch (e) {
    console.log(`    (local download failed: ${e.message})`)
  }

  return { preset, runIdx, url: finalUrl, durationSec }
}

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN missing')
    process.exit(1)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = resolve(`test-assets/aiobr-title-cards/${ts}`)
  mkdirSync(outDir, { recursive: true })
  console.log(`Output dir: ${outDir}`)
  console.log(`Chapter title (constant): "${CHAPTER_TITLE}"`)
  console.log(`Running 5 presets × 3 seeds = 15 generations...\n`)

  const results = []
  for (const preset of Object.keys(PRESETS)) {
    console.log(`\n=== ${preset} ===`)
    // Fire 3 sequentially (nano-banana-2 runs fast enough; avoids rate-limit weirdness)
    for (let i = 0; i < 3; i++) {
      const r = await generate(preset, preset, i, outDir)
      results.push(r)
    }
  }

  // Summary
  const summaryPath = join(outDir, 'summary.json')
  writeFileSync(summaryPath, JSON.stringify({ chapter_title: CHAPTER_TITLE, results }, null, 2))

  console.log('\n\n===== ALL RESULTS =====\n')
  for (const preset of Object.keys(PRESETS)) {
    console.log(`\n${preset}:`)
    for (const r of results.filter(r => r.preset === preset)) {
      if (r.error) console.log(`  run ${r.runIdx + 1}: ERROR — ${r.error}`)
      else console.log(`  run ${r.runIdx + 1}: ${r.url}`)
    }
  }
  console.log(`\nLocal files + summary.json saved to: ${outDir}`)
}

main().catch(err => { console.error(err); process.exit(1) })
