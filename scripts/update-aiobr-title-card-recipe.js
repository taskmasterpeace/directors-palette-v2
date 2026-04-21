#!/usr/bin/env node
/**
 * Update the seeded AIOBR Title Card recipe with the pure-LAYOUT rewrite
 * (separated layout from style — style now comes from Shot Creator dropdown).
 *
 * Re-running this is safe: it overwrites the stages/description/recipe_note
 * on the existing row by matching on name + is_system=true.
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
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const RECIPE_NAME = 'AIOBR Title Card'

const REFS = [
  { id: 'aiobr_tc_ref_1', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/text-first-pulp-comic-grid.jpg`, name: 'Full-Bleed Type layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_2', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/diegetic-signs-in-scene.png`, name: 'Diegetic In-Scene layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_3', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/typographic-poster-grid.png`, name: 'Text Only layout ref', isStatic: true },
  { id: 'aiobr_tc_ref_4', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/drugz-the-crimes-against-him-oiwcztoke0.jpg`, name: 'Text Over Image layout ref (AIOBR)', isStatic: true },
  { id: 'aiobr_tc_ref_5', url: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-thumbnails/the-horrific-nightmare-of-hitman-holla-abdiqwjwtlu.jpg`, name: 'Text Over Image layout ref (AIOBR)', isStatic: true },
]

const TEMPLATE = `Design a documentary CHAPTER TITLE CARD.

=== REFERENCE IMAGES DIRECTIVE (READ FIRST) ===
The attached reference images are LAYOUT examples from UNRELATED content. They feature different subjects, different stories, different text. DO NOT reproduce the people, clothing, backgrounds, or captions from them. DO NOT copy their visual style. USE THEM STRICTLY AS A GUIDE FOR:
- Typographic hierarchy (title dominant, supporting text secondary)
- Text placement and negative-space balance
- Overall compositional energy

Visual rendering style (painterly, cinematic, comic, 3D, photographic, etc.) is controlled by the user's selected app-level style — NOT by these refs and NOT by this prompt.

=== THIS TITLE CARD ===
CHAPTER NUMBER: "<<CHAPTER_NUMBER:text:row1>>"
CHAPTER TITLE (HERO — biggest text on screen): "<<CHAPTER_TITLE:text!:row1>>"
SUBTITLE: "<<SUBTITLE:text:row2>>"
MOOD: <<MOOD:select(Damning,Gritty,Cinematic,Triumphant,Ominous,Tragic,Defiant,Electric,Nostalgic,Somber)!>>

=== LAYOUT: <<LAYOUT:select(Text Over Image,Text Only,Diegetic In-Scene,Full-Bleed Type)!>> ===

ACTIVE LAYOUT RULES (apply ONLY the block matching the selected LAYOUT above — ignore the others):

[IF LAYOUT = "Text Over Image"]
- The image fills the frame as the backdrop. Subject/environment is chosen to reinforce MOOD.
- CHAPTER TITLE is overlaid ON TOP of the image — not integrated into the scene, not part of the world.
- Use a clean bold sans-serif for legibility against the background (treatment adapts to selected style).
- Add a subtle outline or drop shadow so the title stays readable against whatever is behind it.
- Negative space: leave one clear zone where the title lives — don't fight the focal point of the image.

[IF LAYOUT = "Text Only"]
- NO illustration, NO photograph, NO scene. Pure typographic card.
- Solid or gradient background chosen to reinforce MOOD (deep red for Damning, black for Ominous, cream for Nostalgic, etc.).
- Title and supporting text rendered with expressive typography — weight, case, and graphic elements (rules, drop caps, pullquotes) can vary.
- Think prestige-doc end card or a magazine article opener.

[IF LAYOUT = "Diegetic In-Scene"]
- CHAPTER TITLE appears as an ACTUAL OBJECT in the world — not an overlay.
- Choose a surface that fits the MOOD: police evidence board, courtroom placard, wooden plaque, engraved stone, chalkboard, neon sign, weathered newspaper, manila tag, etched glass.
- Title is physically ON that surface with correct perspective, lighting, and material texture.
- Camera is framed on the object with environmental context visible around it.
- Viewer reads the title as a thing they're looking at in the scene.

[IF LAYOUT = "Full-Bleed Type"]
- Type IS the image. Title fills 60-70% of the frame as dominant geometric letterforms.
- Minimal or no illustration. Background is a flat color or subtle gradient chosen per MOOD.
- Thick outline on the letterforms for punch.
- Supporting text (chapter number, subtitle) reads as small trim around the massive title.

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

const description = 'Documentary chapter title card creator. Pick ONE LAYOUT per project and use it for every chapter — consistency keeps the whole doc on theme. Visual style (painterly, cinematic, comic, 3D, etc.) comes from the Shot Creator Style dropdown — not baked in here.'
const recipeNote = 'This recipe controls LAYOUT (where the title sits, how it relates to the image). STYLE (painterly, cinematic, comic, etc.) comes from the Shot Creator Style dropdown — pick whatever matches your project. Use the SAME layout across all chapter title cards for visual consistency. The 5 attached images are composition references from unrelated content — use only for layout hierarchy, not subject or style.'

async function main() {
  const { data: existing, error: fetchErr } = await supabase
    .from('user_recipes')
    .select('id, stages')
    .eq('name', RECIPE_NAME)
    .eq('is_system', true)

  if (fetchErr) { console.error('Fetch failed:', fetchErr.message); process.exit(1) }
  if (!existing || existing.length === 0) {
    console.error(`No system recipe named "${RECIPE_NAME}" found. Run seed script first.`)
    process.exit(1)
  }

  const recipeId = existing[0].id
  const existingStages = existing[0].stages || []
  const stageId = existingStages[0]?.id || `stage_${Math.random().toString(36).slice(2, 11)}`

  const newStages = [{
    id: stageId,
    order: 0,
    template: TEMPLATE,
    fields: [],
    referenceImages: REFS,
  }]

  const { error: updateErr } = await supabase
    .from('user_recipes')
    .update({
      description,
      recipe_note: recipeNote,
      stages: newStages,
    })
    .eq('id', recipeId)

  if (updateErr) { console.error('Update failed:', updateErr.message); process.exit(1) }
  console.log(`✅ user_recipes row ${recipeId} updated with new LAYOUT-only template.`)

  // Mirror the update into community_items
  const { data: commRows, error: commFetchErr } = await supabase
    .from('community_items')
    .select('id')
    .eq('type', 'recipe')
    .eq('name', RECIPE_NAME)

  if (commFetchErr) { console.error('community_items fetch failed:', commFetchErr.message); return }
  if (!commRows || commRows.length === 0) { console.log('   (no community_items row to update)'); return }

  const { error: commUpdateErr } = await supabase
    .from('community_items')
    .update({
      description,
      content: {
        stages: newStages,
        suggestedAspectRatio: '16:9',
        recipeNote,
        referenceImages: [],
      },
    })
    .eq('id', commRows[0].id)

  if (commUpdateErr) { console.error('   community_items update failed:', commUpdateErr.message) }
  else { console.log(`   ✅ community_items row ${commRows[0].id} updated.`) }
}

main().catch(err => { console.error(err); process.exit(1) })
