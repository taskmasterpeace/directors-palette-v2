#!/usr/bin/env node
/**
 * Seed three waist-up wardrobe wildcards owned by admin with is_shared=true.
 *
 * Naming convention matches existing outfits wildcards (e.g. blkmen_waistup).
 * Invoke in any prompt or recipe template as: _athletic_upper_, _casual_luxe_upper_,
 * _graphic_tee_urban_ — the runtime picks one line at random.
 *
 * Upsert-safe: updates existing rows by (user_id, name) instead of duplicating.
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

// Admin = Battle Rap recipe owner (Robert). Shared wildcards are readable by all users.
const ADMIN_USER_ID = 'd3a01f94-671e-483a-89f6-0284f7aaaf85'

const ATHLETIC_UPPER = [
  'Wearing a black Nike Tech Fleece hoodie zipped three-quarters up with a small embroidered chest swoosh.',
  'Wearing an oversized grey Fear of God Essentials hoodie with the hood partially up casting a soft shadow across the eyes.',
  'Wearing a navy Adidas Y-3 full-zip track jacket with three bonded stripes down the sleeves and an asymmetric collar.',
  'Wearing a black Dri-FIT compression long sleeve under an open black puffer vest with a tonal North Face logo.',
  'Wearing a cream Stone Island crewneck sweatshirt with the signature compass patch on the left sleeve.',
  'Wearing a charcoal Lululemon ABC pullover hoodie with a minimal matte silicone logo on the chest.',
  'Wearing a washed black Nike x Travis Scott Cactus Jack reverse-weave hoodie with a distressed raw-cut hem.',
  'Wearing a forest green North Face Denali fleece with a contrasting black yoke and zippered chest pocket.',
  'Wearing a burgundy Champion reverse-weave heavyweight crewneck with the tonal script logo across the chest.',
  'Wearing a black Jordan 23 Engineered hoodie with a tonal oversized 23 graphic across the chest.',
  'Wearing a white Puma Archive T7 full-zip track jacket with a single black contrast stripe down the shoulder.',
  'Wearing a heather grey Carhartt WIP hooded sweatshirt with a small C-logo embroidered on the chest pocket.',
  'Wearing a black athleisure mock-neck long sleeve with subtle silicone piping across the shoulders and chest.',
  'Wearing an olive tech-fabric anorak half-zip with a horizontal zippered chest pocket and elasticated hood.',
  'Wearing a black Under Armour compression mock-neck under an open black denim vest with silver hardware.',
  'Wearing a royal blue Nike ACG smock hoodie with reflective logo detail and a single front kangaroo pocket.',
  'Wearing a heather charcoal Alo Yoga oversized crewneck with tonal stitching and a relaxed drop-shoulder fit.',
  'Wearing a jet black Represent 247 tapered fleece hoodie with a tonal embroidered bolt logo on the chest.',
  'Wearing a cream Gymshark Legacy tapered pullover hoodie with a minimal tonal logo on the left chest.',
  'Wearing a faded black vintage-style Russell Athletic crewneck with a small embroidered R on the chest.',
]

const CASUAL_LUXE_UPPER = [
  'Wearing an Amiri MA bar logo heavyweight cotton tee in off-white with subtly distressed collar and hem.',
  'Wearing a Fear of God Essentials cream oversized crewneck sweatshirt with a small tonal chest graphic.',
  'Wearing a Rhude tie-dye vintage-wash oversized tee with a boxy silhouette and retro motorsport graphic.',
  'Wearing a Visvim Jumbo natural-cotton tee with a subtle tonal logo stamp on the left chest.',
  'Wearing a rust-red Gallery Dept distressed pocket tee with hand-painted paint splatter details.',
  'Wearing a Saint Laurent black silk-blend Henley with the top three buttons casually unfastened.',
  'Wearing a Celine Triomphe short-sleeve knit polo in cream with navy contrast trim at collar and sleeve.',
  'Wearing a Bottega Veneta intrecciato-textured short-sleeve shirt in dark chocolate with mother-of-pearl buttons.',
  'Wearing a forest green Loewe oversized anagram-embroidered hooded sweatshirt with a relaxed fit.',
  'Wearing a faded black Chrome Hearts cross-pocket thermal long sleeve with the signature dagger motif on the sleeve.',
  'Wearing an Off-White cream oversized hoodie with a single diagonal stripe across the chest and tonal back print.',
  'Wearing a washed black Rick Owens DRKSHDW boxy drop-shoulder tee with an elongated body and raw-cut neckline.',
  'Wearing a faded lavender Acne Studios oversized crewneck with the iconic face-logo patch on the chest.',
  'Wearing a bleached grey Balenciaga oversized distressed tee with the small logo printed at the back neck.',
  'Wearing a cream Stussy 8-ball heavyweight hoodie with a vintage heather texture and tonal embroidered logo.',
  'Wearing a Jacquemus Le Polo knit in tonal cream with a cropped boxy silhouette and ribbed collar.',
  'Wearing a Maison Margiela four-stitch number-embroidered long sleeve in washed charcoal.',
  'Wearing a Dior Oblique jacquard hooded sweatshirt in navy with tonal CD hardware on the drawstrings.',
  'Wearing a Brunello Cucinelli tipped cashmere polo in dusty olive with a tonal three-button placket.',
  'Wearing a Burberry Vintage Check silk-blend shirt with mother-of-pearl buttons, half-tucked and casual.',
]

const GRAPHIC_TEE_URBAN = [
  'Wearing a black oversized tee with a vintage boombox graphic surrounded by hand-drawn chrome "TURN IT UP" lettering across the chest.',
  'Wearing a cream heavyweight tee featuring a photorealistic portrait of an anonymous masked emcee with "FACELESS" in gothic blackletter script beneath.',
  'Wearing a washed grey tee printed with a faded subway-map overlay and "BIRTHPLACE" rendered in hand-spray-painted lettering.',
  'Wearing a vintage black tee with a screen-printed graphic of a classic Cadillac on gold rims and "RIDE OR DIE" in chrome bevel text.',
  'Wearing a forest green boxy tee with stacked collegiate text reading "FROM THE ALLEY TO THE ARENA" in gold-on-green block font.',
  'Wearing an off-white heavyweight tee with a hand-drawn skyline silhouette and "NIGHT SHIFT" in dripping red ink across the bottom.',
  'Wearing a charcoal tee featuring a headphone-wearing silhouette against a sunset gradient with "DEMO TAPES" in flowing script.',
  'Wearing a faded burgundy tee with a pair of vintage Timberlands illustrated in ink and "CONCRETE POETS" in bold all-caps beneath.',
  'Wearing a black tee with a glowing neon bodega storefront graphic and "OPEN 24/7" rendered in buzzing pink neon typography.',
  'Wearing a cream tee featuring a gothic crest emblem reading "KINGDOM OF THE UNDERDOG" with crossed microphones forming a coat of arms.',
  'Wearing a heather grey tee with a detailed pen-and-ink drawing of stacked cassette tapes labeled "MIXTAPE ERA" in handwritten marker script.',
  'Wearing a washed black oversized tee with a fractured American-flag halftone graphic and "LOYAL TO THE GRIND" in riot-fist font.',
  'Wearing a vintage cream tee with handwritten numerology "516 → 718 → 646" above block text reading "EVERY EXIT COUNTS."',
  'Wearing a faded navy tee with a VHS-glitch portrait of two silhouettes dapping and "SEE YOU AT THE TOP" in distorted chromatic text.',
  'Wearing an off-white tee with chrome-typography "OFF-PEAK" above a detailed subway car graphic rendered in spray-paint realism.',
  'Wearing a charcoal tee with a hand-drawn lotus breaking through cracked concrete and "BLOOM HERE OR NOWHERE" in elegant serif.',
  'Wearing a black heavyweight tee with a retro 8-bit arcade portrait of a crowned silhouette and "GAME RECOGNIZE" in pixel font.',
  'Wearing a washed sand-colored tee with a faded hand-sketched lion in a crown and "KING WITHOUT A THRONE" in letterpress-style caps.',
  'Wearing a faded forest green tee with a silkscreened vinyl record graphic and "SPIN CYCLE" in bold carved-woodcut type.',
  'Wearing a cream oversized tee with a weathered baseball-card-style portrait of an unknown emcee and stat line reading "ROOKIE OF THE STREET, YEAR 1."',
]

const WILDCARDS = [
  {
    name: 'athletic_upper',
    category: 'outfits',
    description: 'Waist-up athletic wear — hoodies, tech fleece, track jackets, compression pieces (urban).',
    content: ATHLETIC_UPPER.join('\n'),
  },
  {
    name: 'casual_luxe_upper',
    category: 'outfits',
    description: 'Waist-up casual luxury — designer tees, knits, and hoodies (Amiri, FOG, Loewe, Rhude, etc.).',
    content: CASUAL_LUXE_UPPER.join('\n'),
  },
  {
    name: 'graphic_tee_urban',
    category: 'outfits',
    description: 'Fictional but urban-resonant graphic tees — concepts, slogans, and artwork that look real but aren\'t.',
    content: GRAPHIC_TEE_URBAN.join('\n'),
  },
]

async function main() {
  console.log(`Seeding ${WILDCARDS.length} wildcards for admin (${ADMIN_USER_ID})`)

  for (const w of WILDCARDS) {
    // Upsert by (user_id, name) — constraint enforces uniqueness
    const { data: existing } = await supabase
      .from('wildcards')
      .select('id')
      .eq('user_id', ADMIN_USER_ID)
      .eq('name', w.name)
      .maybeSingle()

    const payload = {
      user_id: ADMIN_USER_ID,
      name: w.name,
      category: w.category,
      description: w.description,
      content: w.content,
      is_shared: true,
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('wildcards')
        .update(payload)
        .eq('id', existing.id)
      if (error) { console.error(`  ✗ update ${w.name}: ${error.message}`); continue }
      console.log(`  ↻ updated ${w.name} (${w.content.split('\n').length} entries, category=${w.category}, shared=true)`)
    } else {
      const { error } = await supabase
        .from('wildcards')
        .insert(payload)
      if (error) { console.error(`  ✗ insert ${w.name}: ${error.message}`); continue }
      console.log(`  + inserted ${w.name} (${w.content.split('\n').length} entries, category=${w.category}, shared=true)`)
    }
  }

  console.log('\nInvocation examples (drop into any prompt or recipe template):')
  console.log('  _athletic_upper_')
  console.log('  _casual_luxe_upper_')
  console.log('  _graphic_tee_urban_')
}

main().catch(err => { console.error(err); process.exit(1) })
