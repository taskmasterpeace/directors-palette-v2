#!/usr/bin/env node
/**
 * Sync the Battle Rap recipe (id 16c2b9cc-...) in the DB with the current
 * code-side template from recipe-samples.ts. Fixes AIOBR work request #001
 * — the DB version was frozen at 2026-03-03 without a STYLE field, so every
 * execution forced photoreal output regardless of overrides.
 *
 * Strategy: surgical update of stages[0].template only. Leaves everything
 * else (ownership, referenceImages, metadata) untouched.
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

const RECIPE_ID = '16c2b9cc-ff46-4f0c-a251-8c4d2aac1101'

const NEW_TEMPLATE = `A professional high-definition <<CAMERA_ANGLE:select(Over-the-shoulder shot,Low-angle side profile,Tight extreme close-up,Wide master shot,Eye-level centered shot,Dutch angle dramatic tilt,Ground-level looking up,Profile silhouette shot,Rack focus between battlers,Handheld shaky-cam close)!>> of an acappella battle rap event. The camera is positioned behind Person B, looking over their shoulder at Person A who is standing face-to-face in a high-intensity verbal battle. Crucially, there are NO microphones; both performers have completely empty hands, using wild hand gestures and aggressive facial expressions.

PERSON A: @<<PERSON_A:name!>>
PERSON A ACTION: <<ACTION_A:select(---Aggressive---,Pointing directly at opponent's face with index finger extended and thumb up like a gun,Jabbing thumb over shoulder dismissively while mean-mugging,Slapping back of one hand into palm for emphasis on every bar,Leaning forward into opponent's space with hands spread wide open,Pounding fist into open palm with each word,---Confident---,Arms crossed over chest with chin tilted up looking down at opponent,One hand raised palm-out in a stop gesture while smirking,Counting off points on fingers while delivering bars,Thumb pointing at own chest with head cocked sideways,Brushing shoulder off casually mid-bar like dusting dirt away,---Explosive---,Both arms thrown wide open challenging the crowd to react,Cupping hand behind ear telling opponent to speak up,Waving hand dismissively like swatting away a fly,Grabbing own shirt collar and pulling it while gritting teeth,Mimicking a knockout punch in slow motion then pointing at opponent,---Theatrical---,Walking in a slow circle around opponent with finger wagging,Pulling imaginary trigger with finger gun aimed at opponent then blowing smoke off fingertip,Holding invisible microphone drop then letting hand fall,Shrugging with palms up and confused face as if opponent said nothing,Pretending to check a watch impatiently while opponent speaks)!>>
PERSON A OUTFIT: <<OUTFIT_A:wildcard(blkmen_fullbody, browse)>>
PERSON A HAIR: <<HAIR_A:wildcard(blkmen_hair, browse)>>

PERSON B: @<<PERSON_B:name!>>
PERSON B ACTION: <<ACTION_B:select(---Reacting---,Stepping back with hand on chest looking genuinely shocked by the bar,Shaking head slowly with eyes closed refusing to accept the point,Laughing and slapping own knee while bent over,Biting lower lip and nodding reluctantly giving respect to the bar,Wincing and turning away like the bar physically hurt,---Firing Back---,Pointing at opponent with thumb up and finger extended straight at their forehead,Getting nose-to-nose with veins visible in neck yelling without a mic,Chopping the air with flat hand like cutting through opponent's argument,Holding up three fingers counting down opponent's mistakes,Rolling up sleeves dramatically preparing to destroy,---Crowd Work---,Turning to the crowd with arms out asking them if they heard that,Pushing opponent's shoulder lightly and looking at crowd for validation,Walking along the crowd line high-fiving while delivering bars sideways,Spinning back to face opponent after playing to the crowd,Pointing at specific crowd members recruiting them to his side,---Dominance---,Standing completely still and stone-faced letting silence land the bar,Slow clapping sarcastically after opponent finishes,Hand on chin stroking it thoughtfully like analyzing something pathetic,Stepping on opponent's imaginary grave and brushing off shoes,Looking at opponent's feet then slowly up to their face with a disgusted expression)!>>
PERSON B OUTFIT: <<OUTFIT_B:wildcard(blkmen_fullbody, browse)>>
PERSON B HAIR: <<HAIR_B:wildcard(blkmen_hair, browse)>>

SETTING: <<LOCATION:select(---Battle League Stage---,Professional battle rap stage with large LED screen backdrop and league banner logos hanging from ceiling and crowd pressed against stage edge,Elevated platform stage with metal barricades and a branded backdrop banner reading battle league name in bold letters,Small raised stage in a packed nightclub with sponsor banners flanking both sides and ring lights overhead,Convention center stage with professional lighting rig and massive banner wall covered in sponsor logos behind the battlers,---Iconic Venues---,URL TV-style setup with plain black backdrop and tight crowd forming a circle around battlers under harsh white light,URL stage with red branded backdrop and dense crowd behind metal barriers under harsh stage spotlights with hip-hop arena energy,SMACK URL classic outdoor street setting with crowd circling battlers and chain-link fence backdrop,Summer Madness arena setup with massive LED screen backdrop and packed amphitheater crowd at night,KOTD-style outdoor stage with chain-link fence backdrop and street art murals visible behind the crowd,Caffeine TV studio setup with multiple camera angles visible and branded podiums on each side of the stage,RBE-style intimate room with low ceiling and crowd so close they could touch the battlers,---Street Settings---,Dimly lit back alley with brick walls and fire escapes overhead and crowd spilling out from both ends,Underground parking garage with concrete pillars and headlights from parked cars illuminating the circle,Rooftop at night with city skyline glowing behind and crowd gathered in a tight semicircle,Graffiti-covered underpass with puddles reflecting the action and boombox sitting on a milk crate,---Indoor Venues---,Barbershop after hours with neon OPEN sign buzzing and chairs pushed back to make room for the crowd,Abandoned warehouse with industrial shelving and a single hanging work light swinging slightly,Boxing gym with ring ropes visible in background and heavy bags pushed aside for the crowd,Pool hall with green felt tables pushed to walls and Budweiser neon signs glowing in the haze,---Outdoor---,Basketball court at night under buzzing amber floodlights with chain-net hoops visible behind the crowd,Park bandshell amphitheater with concrete steps packed with spectators looking down at the battlers,Gas station parking lot at midnight with fluorescent canopy lights and crowd leaning against cars)>>

<<STAGE_BANNER:text>> visible on backdrop banners behind the battlers.

STYLE: <<STYLE:select(Match character reference style,---Photoreal---,Photoreal cinematic realism,Documentary photography 35mm grain,---Animated---,Boondocks-style cel-shaded animation with bold black outlines and flat colors,Saturday-morning cartoon flat colors with thick outlines,Comic book illustration with halftone dots and ink lines,Anime illustration,Pixar-style 3D rendered)>>

LIGHTING: <<LIGHTING_STYLE:select(Match character reference lighting,---Photoreal---,Chiaroscuro high-contrast creating deep shadows,Harsh overhead spotlight creating deep shadows,Flickering industrial fluorescent,Natural golden-hour sunlight,Stark monochromatic grayscale,Ring light glow on faces,Red and blue gel stage lights,Single bare bulb dramatic,LED panel white wash,Backlit silhouette rim light,---Animated---,Flat cel-shaded lighting with no gradient,Saturday-cartoon flat colors with hard-edged shadows,Comic-book ink shadows with halftone shading,Animated key light with painted shadow shapes,Boondocks-style flat fill with single hard rim shadow)>>.

Surround them with a dense, diverse crowd of spectators with blurred faces. Authentic hip-hop aesthetic. Hands visible and empty. No microphones anywhere in the scene.`

async function main() {
  const { data: row, error: fetchErr } = await supabase
    .from('user_recipes')
    .select('id, name, user_id, stages, updated_at')
    .eq('id', RECIPE_ID)
    .single()
  if (fetchErr) {
    console.error('Fetch failed:', fetchErr.message)
    process.exit(1)
  }

  console.log(`Found: "${row.name}" owned by ${row.user_id}`)
  console.log(`Last updated: ${row.updated_at}`)

  const stages = Array.isArray(row.stages) ? [...row.stages] : []
  if (stages.length === 0) {
    console.error('Recipe has no stages — aborting')
    process.exit(1)
  }

  const oldLen = stages[0].template?.length || 0
  stages[0] = { ...stages[0], template: NEW_TEMPLATE }
  const newLen = NEW_TEMPLATE.length
  console.log(`Replacing stage 0 template: ${oldLen} → ${newLen} chars`)
  console.log(`- added fields: STYLE, STAGE_BANNER, OUTFIT_A, OUTFIT_B, HAIR_A, HAIR_B`)
  console.log(`- removed hardcoded "Cinematic realism" / "high contrast, gritty texture"`)

  const { error: upErr } = await supabase
    .from('user_recipes')
    .update({ stages, updated_at: new Date().toISOString() })
    .eq('id', RECIPE_ID)

  if (upErr) {
    console.error('Update failed:', upErr.message)
    process.exit(1)
  }
  console.log('\n✓ DB updated. AIOBR can now pass fields.STYLE to override photoreal.')
}

main().catch(err => { console.error(err); process.exit(1) })
