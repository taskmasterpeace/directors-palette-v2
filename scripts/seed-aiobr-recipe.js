#!/usr/bin/env node
/**
 * Seed the AIOBR system recipe directly into Supabase.
 * Idempotent — skips if a system recipe with this name already exists.
 *
 * This mirrors what POST /api/admin/seed-recipes does, but runs as a one-off
 * without requiring an admin session cookie.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
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

const AIOBR_REFS = [
  { id: 'aiobr_ref_1', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/drugz-the-crimes-against-him-oiwcztoke0.jpg`, name: 'AIOBR layout ref 1', isStatic: true },
  { id: 'aiobr_ref_2', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/geechi-roc-the-career-suicide-of-loso-3scj70lst-y.jpg`, name: 'AIOBR layout ref 2', isStatic: true },
  { id: 'aiobr_ref_3', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/math-hoffa-bully-battler-or-both-19tjof-1mri.jpg`, name: 'AIOBR layout ref 3', isStatic: true },
  { id: 'aiobr_ref_4', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/smack-white-url-s-weakest-link-wfwq-jfjype.jpg`, name: 'AIOBR layout ref 4', isStatic: true },
  { id: 'aiobr_ref_5', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/the-attempted-assassination-of-big-t-k0to-k-8gmy.jpg`, name: 'AIOBR layout ref 5', isStatic: true },
  { id: 'aiobr_ref_6', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/the-horrific-nightmare-of-hitman-holla-abdiqwjwtlu.jpg`, name: 'AIOBR layout ref 6', isStatic: true },
  { id: 'aiobr_ref_7', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/tsu-surf-s-rollin-60-s-who-told-on-surf-w3-5irl5eim.jpg`, name: 'AIOBR layout ref 7', isStatic: true },
  { id: 'aiobr_ref_8', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/who-will-win-2024-s-woty-kqklycqihcq.jpg`, name: 'AIOBR layout ref 8', isStatic: true },
  { id: 'aiobr_ref_9', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/young-x-the-hilarious-legacy-v63okwbxlus.jpg`, name: 'AIOBR layout ref 9', isStatic: true },
]

const TEMPLATE = `Design a bold, high-contrast documentary-style thumbnail for a musical artist.

=== REFERENCE IMAGES DIRECTIVE (READ FIRST) ===
The attached reference images are EXAMPLES OF PREVIOUS THUMBNAILS FOR UNRELATED CONTENT. They feature DIFFERENT subjects, DIFFERENT stories, and DIFFERENT text. DO NOT reproduce the people, clothing, backgrounds, captions, or subject matter from them. USE THEM STRICTLY AS A GUIDE FOR:
- Layout and composition (subject placement, text sizing, negative space, balance)
- Typography treatment (huge artist name, outline weight, color contrast)
- Headline hierarchy (artist name dominant, optional tagline/question smaller)
- Supporting-character framing (circular medallions with bold name labels in corners)
- Optional inset panel conventions (evidence imagery with annotation circles/arrows)
- Overall visual energy, color grading, and punch

=== THIS THUMBNAIL ===

CONTEXT (story backdrop):
<<CONTEXT:text!>>

WHAT THE THUMBNAIL COMMUNICATES:
<<WHAT_IT_COMMUNICATES:text!>>

MAIN SUBJECT (character sheet attached via @):
@<<WHO:name!>>

ARTIST NAME (render as the LARGEST, MOST DOMINANT text on screen — stacked or wrapped for maximum impact):
"<<ARTIST_NAME:text!>>"

VIBE:
<<VIBE:select(Dramatic,Cinematic,Gritty,Mysterious,Triumphant,Vulnerable,Aggressive,Nostalgic,Explosive,Somber)!>>

OPTIONAL TAGLINE (smaller text, often a question or quote — leave blank to skip):
<<TAGLINE:text>>

OPTIONAL BACKGROUND / SETTING (leave blank to let the model invent a fitting scene):
<<BACKGROUND:text>>

SUPPORTING CHARACTERS (optional — attach character sheets via @; each appears in a circular medallion with bold name label):
- Supporting 1: @<<SUPPORTING_1:name>> — label text: "<<SUPPORTING_1_LABEL:text>>"
- Supporting 2: @<<SUPPORTING_2:name>> — label text: "<<SUPPORTING_2_LABEL:text>>"
- Supporting 3: @<<SUPPORTING_3:name>> — label text: "<<SUPPORTING_3_LABEL:text>>"

ADDITIONAL ASSET NOTE (optional — describe auxiliary imagery, e.g. "annotated surveillance still in lower-right panel with red circle highlighting figures"):
<<ADDITIONAL_ASSETS:text>>

=== COMPOSITION RULES ===
- ARTIST NAME is the HERO text. Biggest, boldest, highest contrast. Stacked or wrapped for punch.
- Main subject portrait is rendered in the app's selected illustration style. Face expressive and clear.
- Supporting characters (if provided) appear in circular medallions at top-left / top-right / mid-right with bold NAME LABELS directly below each medallion.
- Tagline (if provided) sits ABOVE the artist name in smaller text, or inside a dark ribbon/pill at the very top.
- Background reinforces mood — cityscape, interior, abstract graffiti, atmospheric lighting — or model-invented if left blank.
- Leave the ARTIST NAME and subject face from being obstructed by other elements.

=== TEXT TREATMENT (INDEPENDENT OF ILLUSTRATION STYLE) ===
All on-screen text renders as clean, modern, bold sans-serif (Impact / Anton / Bebas family). Thick white or black outline. Flat high-saturation fill (red, blue, or yellow). DO NOT stylize the lettering — NO comic-book hand-drawn text, NO painterly or rendered letterforms, NO 3D/extruded text — REGARDLESS of the illustration style applied to the subject. The character and scene follow the selected app style; the typography does NOT. Text must remain crisp and legible at small thumbnail sizes.

=== ASPECT ===
16:9 YouTube thumbnail framing (override in Shot Creator settings if needed).`

async function main() {
  // Check if already exists
  const { data: existing } = await supabase
    .from('user_recipes')
    .select('id, name')
    .eq('name', 'AIOBR')
    .eq('is_system', true)

  if (existing && existing.length > 0) {
    console.log(`AIOBR recipe already exists (id=${existing[0].id}). Skipping insert.`)
    return
  }

  const stageId = `stage_${Math.random().toString(36).slice(2, 11)}`

  const recipe = {
    user_id: null,
    name: 'AIOBR',
    description: 'Algorithm Institute of Battle Rap — documentary-style thumbnail creator for music-artist content. Big artist name, supporting characters in circular medallions, optional tagline.',
    recipe_note: 'The 9 attached images are PREVIOUS AIOBR thumbnails from OTHER content — the model uses them for layout/typography/composition only, NOT subject matter. Pick your illustration style from the Shot Creator Style dropdown (3D render, comic-book inked, etc.) — the recipe keeps typography consistent regardless.',
    stages: [{
      id: stageId,
      order: 0,
      template: TEMPLATE,
      fields: [],
      referenceImages: AIOBR_REFS,
    }],
    suggested_aspect_ratio: '16:9',
    suggested_model: 'nano-banana-2',
    suggested_resolution: null,
    quick_access_label: 'AIOBR',
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

  console.log(`✅ AIOBR recipe seeded (id=${data[0].id})`)

  // Also sync to community_items so it shows up in Browse Catalog
  const { data: existingCommunity } = await supabase
    .from('community_items')
    .select('id')
    .eq('type', 'recipe')
    .eq('name', 'AIOBR')

  if (existingCommunity && existingCommunity.length > 0) {
    console.log('   (community_items entry already exists)')
    return
  }

  const { error: commErr } = await supabase.from('community_items').insert({
    type: 'recipe',
    name: 'AIOBR',
    description: recipe.description,
    category: 'storyboards',
    tags: ['system', 'thumbnail', 'battle-rap', 'documentary'],
    content: {
      stages: recipe.stages,
      suggestedAspectRatio: '16:9',
      recipeNote: recipe.recipe_note,
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
    console.log('   ✅ Also synced to community_items')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
