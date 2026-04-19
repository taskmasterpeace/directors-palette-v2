#!/usr/bin/env node
/**
 * Update existing AIOBR system recipe in prod Supabase with the latest template
 * from recipe-samples.ts. Run when the recipe template or supporting-char
 * structure changes.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
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
@<<WHO:name!:row1>>

ARTIST NAME (render as the LARGEST, MOST DOMINANT text on screen — stacked or wrapped for maximum impact):
"<<ARTIST_NAME:text!:row1>>"

VIBE:
<<VIBE:select(Dramatic,Cinematic,Gritty,Mysterious,Triumphant,Vulnerable,Aggressive,Nostalgic,Explosive,Somber)!>>

OPTIONAL TAGLINE (smaller text, often a question or quote — leave blank to skip):
<<TAGLINE:text:collapsed>>

OPTIONAL BACKGROUND / SETTING (leave blank to let the model invent a fitting scene):
<<BACKGROUND:text:collapsed>>

SUPPORTING CHARACTERS (optional — leave blank if not needed. When used, each appears in a circular medallion with bold name label):
- Supporting 1: @<<SUPPORTING_1:name:collapsed:row10>> — label text: "<<SUPPORTING_1_LABEL:text:collapsed:row10>>"
- Supporting 2: @<<SUPPORTING_2:name:collapsed:row11>> — label text: "<<SUPPORTING_2_LABEL:text:collapsed:row11>>"

ADDITIONAL ASSET NOTE (optional — describe auxiliary imagery, e.g. "annotated surveillance still in lower-right panel with red circle highlighting figures"):
<<ADDITIONAL_ASSETS:text:collapsed>>

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
  const { data: existing } = await supabase
    .from('user_recipes')
    .select('id, stages')
    .eq('name', 'AIOBR')
    .eq('is_system', true)

  if (!existing || existing.length === 0) {
    console.error('AIOBR recipe not found — run seed-aiobr-recipe.js first')
    process.exit(1)
  }

  const stageId = existing[0].stages?.[0]?.id || `stage_${Math.random().toString(36).slice(2, 11)}`

  const { error } = await supabase
    .from('user_recipes')
    .update({
      stages: [{
        id: stageId,
        order: 0,
        template: TEMPLATE,
        fields: [],
        referenceImages: AIOBR_REFS,
      }],
    })
    .eq('id', existing[0].id)

  if (error) {
    console.error('Update failed:', error.message)
    process.exit(1)
  }

  console.log(`✅ AIOBR recipe updated (id=${existing[0].id})`)

  // Keep community_items in sync
  const { error: commErr } = await supabase
    .from('community_items')
    .update({
      content: {
        stages: [{
          id: stageId,
          order: 0,
          template: TEMPLATE,
          fields: [],
          referenceImages: AIOBR_REFS,
        }],
        suggestedAspectRatio: '16:9',
        recipeNote: 'The 9 attached images are PREVIOUS AIOBR thumbnails from OTHER content — the model uses them for layout/typography/composition only, NOT subject matter. Pick your illustration style from the Shot Creator Style dropdown (3D render, comic-book inked, etc.) — the recipe keeps typography consistent regardless.',
        referenceImages: [],
      },
    })
    .eq('type', 'recipe')
    .eq('name', 'AIOBR')

  if (commErr) {
    console.error('community_items update failed:', commErr.message)
  } else {
    console.log('   ✅ community_items synced')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
