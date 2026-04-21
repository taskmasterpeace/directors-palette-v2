#!/usr/bin/env node
/**
 * Seed the AIOBR Title Card system recipe into production Supabase.
 * Idempotent — skips if a system recipe with this name already exists.
 *
 * Ships with 5 LAYOUT_PRESET options (Text-First Pulp, Cinematic Photo,
 * Atmospheric Painterly, Diegetic Sign, Typographic Poster). Users pick one
 * when they start their project and every chapter title card stays on theme.
 *
 * 8 layout refs baked in: 6 per-style examples + 2 AIOBR thumbs for brand continuity.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const RECIPE_NAME = 'AIOBR Title Card'

const REFS = [
  { id: 'aiobr_tc_ref_1', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/text-first-pulp-comic-grid.jpg`, name: 'Text-First layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_2', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-32bit-pixel.png`, name: 'Style-sheet meta-pattern (32bit)', isStatic: true },
  { id: 'aiobr_tc_ref_3', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-action-figure.png`, name: 'Style-sheet meta-pattern (action figure)', isStatic: true },
  { id: 'aiobr_tc_ref_4', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/atmospheric-painterly-noir.jpg`, name: 'Atmospheric painterly layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_5', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/diegetic-signs-in-scene.png`, name: 'Diegetic-sign layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_6', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/typographic-poster-grid.png`, name: 'Typographic layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_7', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/drugz-the-crimes-against-him-oiwcztoke0.jpg`, name: 'AIOBR brand-continuity ref 1', isStatic: true },
  { id: 'aiobr_tc_ref_8', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/the-horrific-nightmare-of-hitman-holla-abdiqwjwtlu.jpg`, name: 'AIOBR brand-continuity ref 2', isStatic: true },
]

const TEMPLATE = `Design a cinematic documentary CHAPTER TITLE CARD.

=== REFERENCE IMAGES DIRECTIVE (READ FIRST) ===
The 8 attached reference images are EXAMPLES OF TITLE CARDS AND THUMBNAILS from UNRELATED content and different genres. They feature DIFFERENT subjects, DIFFERENT stories, DIFFERENT text. DO NOT reproduce the people, clothing, backgrounds, or captions from them. USE THEM STRICTLY AS A GUIDE FOR:
- Typographic hierarchy (title dominant, supporting text secondary)
- Layout conventions (how title, subtitle, chapter number are arranged)
- Compositional framing (negative space, balance, text placement)
- Overall visual energy and punch

=== THIS TITLE CARD ===
CHAPTER NUMBER: "<<CHAPTER_NUMBER:text:row1>>"
CHAPTER TITLE (HERO — biggest text on screen): "<<CHAPTER_TITLE:text!:row1>>"
SUBTITLE: "<<SUBTITLE:text:row2>>"
MOOD: <<MOOD:select(Damning,Gritty,Cinematic,Triumphant,Ominous,Tragic,Defiant,Electric,Nostalgic,Somber)!>>

=== LAYOUT PRESET: <<LAYOUT_PRESET:select(Text-First Pulp,Cinematic Photo,Atmospheric Painterly,Diegetic Sign,Typographic Poster)!>> ===

ACTIVE STYLE RULES (apply ONLY the block matching the selected LAYOUT_PRESET above — ignore the others):

[IF LAYOUT_PRESET = "Text-First Pulp"]
Render the card as a text-dominant pulp comic cover. Minimal or no illustration — the TYPE is the image.
- Flat saturated color background (deep crimson, mustard yellow, or navy — pick per MOOD)
- CHAPTER TITLE rendered as bold blocky geometric letterforms filling 60-70% of frame
- Thick black or white outline on all text for legibility
- Subtle comic-book halftone texture or ink spatter optional
- NO photographic elements, NO atmospheric scenes

[IF LAYOUT_PRESET = "Cinematic Photo"]
Render the card as a cinematic establishing shot with title overlaid.
- Atmospheric documentary-style backdrop (empty venue, dim interior, cityscape, alleyway — chosen to reinforce MOOD)
- Backdrop photographed or rendered with cinematic color grading, dramatic lighting, 50mm feel
- CHAPTER TITLE rendered as clean bold sans-serif (Impact / Anton / Bebas) overlaid on the backdrop
- Thick white outline with subtle drop shadow for legibility against the photographic background

[IF LAYOUT_PRESET = "Atmospheric Painterly"]
Render the card as a moody painterly illustration — the title design is integrated into the atmosphere.
- Painterly noir backdrop with dramatic chiaroscuro, deep shadows, muted cinematic palette
- CHAPTER TITLE rendered in a custom stylized letterform that reinforces the mood (gothic, stenciled, broken, scratched)
- Supporting elements may include a silhouette, a rain-slick street, a single dramatic light source
- Think Batman: The Animated Series episode card — the type design CARRIES the mood

[IF LAYOUT_PRESET = "Diegetic Sign"]
Render the card so the title appears as an actual OBJECT in the scene — not an overlay.
- Choose a surface that fits the MOOD: police evidence board / courtroom placard / wooden plaque / engraved stone / chalkboard / neon sign / weathered newspaper / manila paper tag
- CHAPTER TITLE is physically ON that surface, with realistic lighting, perspective, and material texture
- Camera framed on the object with environmental context visible around it
- Viewer reads the title as a thing they're looking at in the world

[IF LAYOUT_PRESET = "Typographic Poster"]
Render the card as a pure typographic poster — no illustration at all.
- Solid or gradient background chosen per MOOD (deep red for Damning, black for Ominous, cream for Nostalgic)
- Title and supporting text rendered in expressive typography — can mix weights, cases, colors
- Optional graphic elements: a horizontal rule, a drop cap, a pullquote treatment
- Think prestige documentary end-card or a New Yorker article opener

=== UNIVERSAL COMPOSITION RULES ===
- CHAPTER TITLE is the HERO text — biggest, highest contrast, dominant.
- CHAPTER NUMBER is a small marker, top-left or top-right.
- SUBTITLE is secondary, smaller, placed below or adjacent to the hero title.
- Leave clean negative space — do not overcrowd.
- 16:9 widescreen framing.

=== ACCURACY REQUIREMENT ===
All rendered text must be SPELLED EXACTLY as specified — no typos, no character swaps, no invented words.

=== OPTIONAL EXTRAS ===
<<NARRATIVE_CONTEXT:text:collapsed>>`

async function main() {
  const { data: existing } = await supabase
    .from('user_recipes')
    .select('id, name')
    .eq('name', RECIPE_NAME)
    .eq('is_system', true)

  if (existing && existing.length > 0) {
    console.log(`"${RECIPE_NAME}" already exists (id=${existing[0].id}). Skipping insert.`)
    return
  }

  const stageId = `stage_${Math.random().toString(36).slice(2, 11)}`
  const description = 'Documentary chapter title card creator — pick one LAYOUT_PRESET and every chapter stays on theme. Five layout families: Text-First pulp, Cinematic photo, Atmospheric painterly, Diegetic sign, and Typographic poster. Illustration rendering is driven by the Shot Creator Style dropdown.'
  const recipeNote = 'Pick a LAYOUT_PRESET when you start your project and use it for EVERY chapter title card — that\'s how you keep a consistent theme across the whole documentary. The 8 attached images are layout/typography references from different unrelated content — the model uses them to learn composition and title hierarchy, NOT subject matter. Illustration rendering still comes from the Shot Creator Style dropdown.'

  const recipe = {
    user_id: null,
    name: RECIPE_NAME,
    description,
    recipe_note: recipeNote,
    stages: [{
      id: stageId,
      order: 0,
      template: TEMPLATE,
      fields: [],
      referenceImages: REFS,
    }],
    suggested_aspect_ratio: '16:9',
    suggested_model: 'nano-banana-2',
    suggested_resolution: null,
    quick_access_label: 'Title Card',
    is_quick_access: true,
    category_id: 'scenes',
    is_system: true,
    is_system_only: false,
  }

  const { data, error } = await supabase
    .from('user_recipes')
    .insert(recipe)
    .select('id')

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`✅ "${RECIPE_NAME}" recipe seeded (id=${data[0].id})`)

  // Also add to community_items catalog
  const { data: existingCommunity } = await supabase
    .from('community_items')
    .select('id')
    .eq('type', 'recipe')
    .eq('name', RECIPE_NAME)

  if (existingCommunity && existingCommunity.length > 0) {
    console.log('   (community_items entry already exists)')
    return
  }

  const { error: commErr } = await supabase.from('community_items').insert({
    type: 'recipe',
    name: RECIPE_NAME,
    description,
    category: 'storyboards',
    tags: ['system', 'title-card', 'documentary', 'aiobr'],
    content: {
      stages: recipe.stages,
      suggestedAspectRatio: '16:9',
      recipeNote,
      referenceImages: [],
    },
    submitted_by: null,
    submitted_by_name: 'System',
    status: 'approved',
    approved_at: new Date().toISOString(),
    is_featured: false,
  })

  if (commErr) {
    console.error('   community_items insert failed:', commErr.message)
  } else {
    console.log('   ✅ community_items catalog entry added')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
