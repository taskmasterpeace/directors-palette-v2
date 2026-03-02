/**
 * Wardrobe Wildcards
 * Random outfit selection for character sheet & portrait generation.
 * Focus on tops/outerwear + accessories (not pants/shoes — rarely visible in portraits).
 */

export const WARDROBE_STYLES = [
  { value: 'designer', label: 'Designer' },
  { value: 'streetwear', label: 'Streetwear' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'eccentric', label: 'Eccentric' },
] as const

export type WardrobeStyle = (typeof WARDROBE_STYLES)[number]['value']

// ---------------------------------------------------------------------------
// DESIGNER
// ---------------------------------------------------------------------------

const DESIGNER_MALE: string[] = [
  'Gucci monogram silk button-up, gold chain necklace',
  'Louis Vuitton leather bomber jacket, diamond stud earrings',
  'Versace baroque print shirt, gold Medusa pendant',
  'Prada Re-Nylon zip-up jacket, silver bracelet',
  'Balenciaga oversized denim jacket, chunky chain',
  'Dior oblique print hoodie, aviator sunglasses',
  'Fendi FF logo knit sweater, gold signet ring',
  'Givenchy star-print tee, leather cuff bracelet',
  'Burberry check cashmere scarf over black turtleneck',
  'Saint Laurent sequin blazer, slim black tie',
  'Tom Ford velvet smoking jacket, silk pocket square',
  'Off-White industrial belt over crisp white shirt',
  'Amiri tie-dye cashmere sweater, cross pendant necklace',
  'Balmain embroidered military jacket, gold buttons',
  'Valentino rockstud leather jacket, dark sunglasses',
  'Alexander McQueen skull-print silk shirt, silver rings',
  'Dolce & Gabbana floral brocade blazer, gold cufflinks',
  'Bottega Veneta intrecciato leather vest, minimalist watch',
  'Hermès silk scarf draped over camel cashmere coat',
  'Rick Owens draped asymmetric leather jacket',
  'Chrome Hearts cross hoodie, layered silver chains',
  'Kenzo tiger-embroidered bomber jacket, bucket hat',
  'Moschino logo print tee, gold frame sunglasses',
  'Moncler puffer vest over cashmere turtleneck',
  'Loro Piana cashmere half-zip, understated elegance',
]

const DESIGNER_FEMALE: string[] = [
  'Chanel tweed cropped jacket, pearl necklace and camellia brooch',
  'Gucci GG print blouse, gold horsebit chain belt',
  'Louis Vuitton monogram cropped top, stacked gold bangles',
  'Versace safety-pin draped top, gold Medusa earrings',
  'Prada Re-Nylon crop top, minimalist silver hoops',
  'Balenciaga oversized blazer, statement sunglasses',
  'Dior saddle corset top, silk scarf in hair',
  'Fendi FF logo mesh top, crystal-embellished choker',
  'Givenchy lace blouse, pearl drop earrings',
  'Burberry check silk blouse, gold charm bracelet',
  'Saint Laurent sequin camisole, velvet choker',
  'Tom Ford plunging silk blouse, gold cuff bracelet',
  'Off-White zip-tie crop top, industrial earrings',
  'Balmain structured blazer dress, gold chain belt',
  'Valentino sheer lace top with bow, rockstud bracelet',
  'Alexander McQueen corset top, skull-print scarf',
  'Dolce & Gabbana leopard-print bustier, gold cross earrings',
  'Bottega Veneta padded leather top, woven clutch',
  'Hermès silk blouse, Kelly watch',
  'Rick Owens draped jersey top, angular silver earrings',
  'Chrome Hearts gothic cross necklace over black mesh top',
  'Kenzo tiger-print wrap top, oversized sunglasses',
  'Moschino chain-detail crop top, logo earrings',
  'Moncler cropped puffer jacket, diamond studs',
  'Jacquemus asymmetric cutout top, straw sun hat',
]

// ---------------------------------------------------------------------------
// STREETWEAR
// ---------------------------------------------------------------------------

const STREETWEAR_MALE: string[] = [
  'Nike tech fleece hoodie, Air Force 1 cap',
  'Supreme box logo tee, snapback hat',
  'Champion reverse weave hoodie, wristbands',
  'Carhartt WIP Detroit jacket, beanie',
  'Stüssy tie-dye tee, bucket hat',
  'Palace tri-ferg tee, gold chain',
  'A Bathing Ape shark hoodie, camo print',
  'Jordan brand warm-up jacket, retro headband',
  'Fear of God essentials hoodie, oversized fit',
  'Kith box logo crewneck, dad cap',
  'The North Face nuptse vest, fleece underneath',
  'Heron Preston turtleneck, carabiner chain',
  'Neighborhood military jacket, dog tag necklace',
  'WTAPS jungle shirt, silver chain',
  'Billionaire Boys Club astronaut hoodie, trucker hat',
  'Undefeated strike logo jersey, wristband',
  'ASSC anti-social hoodie, reflective accents',
  'HUF tie-dye hoodie, weed leaf cap',
  'Obey propaganda tee, beanie pulled low',
  'Aime Leon Dore quarter-zip, New Era fitted',
  'Noah cross logo hoodie, corduroy cap',
  'Brain Dead graphic tee, mismatched accessories',
  'Cactus Jack merch hoodie, backwards cap',
  'Gallery Dept painted denim jacket, bandana',
  'Rhude racing jacket, vintage sunglasses',
  'Eric Emanuel mesh shorts jersey tank, sweatband',
  'Stone Island crewneck with badge, compass patch',
  'CDG Play heart logo striped tee, Converse',
]

const STREETWEAR_FEMALE: string[] = [
  'Nike cropped hoodie, Air Max cap',
  'Supreme small box logo tee, choker chain',
  'Champion cropped reverse weave, hoop earrings',
  'Carhartt WIP crop jacket, gold nameplate necklace',
  'Stüssy oversized graphic tee, bucket hat',
  'Palace crop top, layered chains',
  'A Bathing Ape camo crop hoodie, gold hoops',
  'Jordan brand crop jersey, headband',
  'Fear of God essentials cropped hoodie, bike shorts',
  'Kith boxy crop tee, dad cap',
  'The North Face cropped puffer, fleece headband',
  'Heron Preston crop turtleneck, carabiner earrings',
  'Off-White crop hoodie, zip-tie bracelet',
  'Billionaire Boys Club crop tee, trucker hat',
  'ASSC cropped hoodie, reflective sunglasses',
  'Aime Leon Dore knit vest, pearl chain',
  'Brain Dead graphic crop top, mismatched earrings',
  'Cactus Jack oversized merch tee tied at waist',
  'Gallery Dept paint-splatter crop top, bandana',
  'Rhude racing crop jacket, vintage shades',
  'CDG Play heart striped crop tee',
  'Stone Island sweatshirt, compass badge, hoop earrings',
  'Corteiz cargo vest, bamboo earrings',
  'Aries tie-dye mesh top, chunky chain necklace',
  'Market smiley face crop hoodie, smiley ring',
]

// ---------------------------------------------------------------------------
// CASUAL
// ---------------------------------------------------------------------------

const CASUAL_MALE: string[] = [
  'plain white tee, silver chain necklace',
  'black henley shirt, leather wristband',
  'grey crewneck sweatshirt, simple watch',
  'denim jacket over graphic tee',
  'flannel button-up, rolled sleeves',
  'plain black hoodie, minimal jewelry',
  'olive green bomber jacket, dog tags',
  'navy blue polo shirt, leather bracelet',
  'cable-knit fisherman sweater, beanie',
  'corduroy overshirt, wooden bead bracelet',
  'linen camp collar shirt, shell necklace',
  'raglan baseball tee, snapback cap',
  'washed chambray shirt, rolled cuffs',
  'thermal waffle-knit henley, simple silver ring',
  'zip-up fleece jacket, dad cap',
  'oversized striped tee, rope bracelet',
  'quilted vest over long-sleeve tee',
  'faded band tee, worn-in look',
  'mock-neck sweater, minimalist earrings',
  'canvas chore jacket, enamel pin collection',
  'marled grey cardigan over plain tee',
  'tie-dye crewneck, festival wristbands',
  'waffle-knit thermal, layered bracelets',
  'pigment-dyed hoodie, vintage sunglasses',
  'terry cloth polo, retro sweatband',
]

const CASUAL_FEMALE: string[] = [
  'plain white crop top, delicate gold chain',
  'oversized band tee knotted at waist, hoop earrings',
  'grey cropped sweatshirt, layered necklaces',
  'denim jacket over camisole, charm bracelet',
  'flannel shirt tied at waist, stud earrings',
  'black cropped hoodie, anklet',
  'olive utility jacket, dog tag pendant',
  'striped breton top, simple watch',
  'cable-knit cropped sweater, beanie',
  'corduroy overshirt, wooden bead bracelet',
  'linen wrap top, shell necklace',
  'ribbed tank top, layered gold chains',
  'washed chambray shirt dress, belt',
  'thermal henley crop, simple silver rings',
  'zip-up fleece crop jacket, hair clips',
  'oversized striped tee, rope bracelet',
  'cropped quilted vest over turtleneck',
  'vintage-wash graphic tee, scrunchie on wrist',
  'mock-neck cropped sweater, minimalist studs',
  'relaxed cardigan, enamel pin',
  'tie-front blouse, dainty pendant necklace',
  'tie-dye crop top, festival wristbands',
  'waffle-knit crop top, stacked rings',
  'pigment-dyed oversized hoodie, messy bun clip',
  'terry cloth crop polo, retro sunglasses',
]

// ---------------------------------------------------------------------------
// FORMAL
// ---------------------------------------------------------------------------

const FORMAL_MALE: string[] = [
  'tailored black suit jacket, white dress shirt, silk tie',
  'navy double-breasted blazer, pocket square',
  'charcoal three-piece suit vest, gold tie bar',
  'tuxedo jacket with satin lapels, bow tie',
  'cream linen suit jacket, tortoiseshell sunglasses',
  'pinstripe blazer, french cuff shirt with cufflinks',
  'velvet dinner jacket, black silk shirt',
  'tweed sport coat, knit tie',
  'windowpane check blazer, silk pocket square',
  'mandarin collar suit jacket, minimalist elegance',
  'herringbone overcoat, cashmere scarf',
  'dark grey slim-fit blazer, thin black tie',
  'burgundy smoking jacket, tassel loafer accents',
  'peak-lapel tuxedo, diamond cufflinks',
  'camel hair blazer, open-collar white shirt',
  'midnight blue suit, silver tie clip',
  'glen plaid sport coat, knit square-end tie',
  'black mock turtleneck under sharp blazer',
  'ivory dinner jacket, black cummerband',
  'houndstooth blazer, leather-strap watch',
  'shawl-collar cardigan over dress shirt, elegant casual',
  'silk-blend bomber jacket, ascot tie',
  'linen blazer, panama hat, tortoiseshell frames',
  'fitted waistcoat, rolled-sleeve dress shirt',
  'black on black suit, matte black accessories',
]

const FORMAL_FEMALE: string[] = [
  'tailored black blazer, silk camisole, diamond studs',
  'navy structured blazer, statement pearl necklace',
  'sequin evening top, delicate chain bracelet',
  'velvet wrap blouse, art deco earrings',
  'white silk button-down, gold bar necklace',
  'off-shoulder cocktail top, chandelier earrings',
  'fitted tuxedo vest, bow tie, power look',
  'lace overlay blouse, vintage brooch',
  'satin draped top, crystal drop earrings',
  'cashmere turtleneck, statement cuff bracelet',
  'pinstripe blazer, cameo pendant',
  'brocade cropped jacket, pearl cluster earrings',
  'high-neck embellished top, cocktail ring',
  'structured cape blazer, gold ear cuff',
  'silk charmeuse blouse, delicate chain necklace',
  'beaded evening top, opera-length gloves',
  'metallic knit top, geometric earrings',
  'feather-trim blouse, stackable diamond rings',
  'sharp-shouldered blazer dress, minimalist watch',
  'organza ruffle top, vintage crystal brooch',
  'plunging V-neck bodysuit, layered pendant necklaces',
  'double-breasted cropped blazer, slim belt',
  'silk scarf blouse, tortoiseshell clip earrings',
  'crystal-embellished mesh top, statement bracelet',
  'black tailored jumpsuit top, gold collar necklace',
]

// ---------------------------------------------------------------------------
// VINTAGE
// ---------------------------------------------------------------------------

const VINTAGE_MALE: string[] = [
  'worn leather motorcycle jacket, band patches',
  'vintage band tee (faded Nirvana print), silver rings',
  'retro track jacket with racing stripes, aviator sunglasses',
  'Hawaiian shirt, gold chain, open collar',
  '70s suede fringe jacket, peace sign pendant',
  'varsity letterman jacket, retro headband',
  'bowling shirt with embroidered back panel',
  'acid-wash denim vest, layered chains',
  'military surplus field jacket, dog tags',
  'striped knit polo, vintage watch',
  'corduroy blazer, turtleneck, professor vibe',
  'western pearl-snap shirt, bolo tie',
  'velour track top, gold rope chain',
  '80s windbreaker, color-blocked neon',
  'cable-knit cricket sweater, preppy vibe',
  'faded Grateful Dead tee, woven friendship bracelets',
  'satin tour jacket, embroidered back',
  'double-rider leather jacket, white tee underneath',
  'retro ringer tee, terry cloth headband',
  '50s-style camp collar shirt, rockabilly vibe',
  'oversized vintage denim jacket, pin collection',
  'argyle sweater vest, round wire-frame glasses',
  'Cuban guayabera shirt, cigar-lounge vibe',
  'mechanic work shirt with name patch',
  'old-school Adidas tracksuit top, original trefoil logo',
]

const VINTAGE_FEMALE: string[] = [
  'vintage band tee cropped (Fleetwood Mac), layered chains',
  'leather motorcycle jacket, graphic band tee underneath',
  'retro fitted track jacket, hoop earrings',
  'Hawaiian print crop top, cat-eye sunglasses',
  '70s suede fringe vest, peace sign necklace',
  'varsity crop jacket, vintage headband',
  'rockabilly polka-dot tied blouse, cherry earrings',
  'acid-wash denim vest, festival jewelry',
  'military surplus cropped jacket, dog tag necklace',
  'striped mod-style top, go-go earrings',
  'corduroy blazer, turtleneck, retro chic',
  'western embroidered crop top, turquoise jewelry',
  'velour zip-up crop top, gold hoops',
  '80s off-shoulder sweatshirt, neon accessories',
  'vintage silk slip camisole, delicate chain',
  'tie-dye Grateful Dead crop tee, stacked bracelets',
  'satin tour jacket, embroidered roses',
  'vintage leather vest, white crop top underneath',
  'retro ringer crop tee, sweatband',
  '50s halter top, polka dot scarf in hair',
  'oversized vintage denim jacket, pin collection',
  'crochet crop top, flower crown',
  'disco-era halter top, platform-era vibe',
  "vintage Levi's trucker jacket, enamel pins",
  'old-school Adidas crop tracksuit top, retro vibes',
]

// ---------------------------------------------------------------------------
// ATHLETIC
// ---------------------------------------------------------------------------

const ATHLETIC_MALE: string[] = [
  'basketball jersey (throwback design), headband, arm sleeve',
  'Nike Dri-FIT compression top, sweatband',
  'Adidas track jacket, three stripes, retro fit',
  'Under Armour sleeveless hoodie, taped wrists',
  'boxing robe-style satin jacket, championship belt',
  'mesh basketball tank, gold chain over jersey',
  'cycling jersey, aerodynamic sunglasses',
  'football jersey, eye black war paint',
  'windbreaker half-zip, running visor',
  'PUMA T7 track jacket, old-school fit',
  'sleeveless compression shirt, athletic tape on fingers',
  'vintage Olympic warm-up jacket, country patches',
  'soccer jersey, captain armband',
  'moisture-wicking polo, tennis visor',
  'cropped training hoodie, weight-lifting gloves',
  'triathlon suit top, race number bib',
  'Reebok classic track top, retro colors',
  'performance tank with mesh panels, fitness tracker',
  'MMA rash guard, cauliflower-ear look',
  'ski base layer half-zip, goggles on forehead',
  'rugby striped jersey, mouth guard hanging',
  'skateboarding tee, elbow pads, helmet',
  'wrestling singlet straps down, towel over shoulders',
  'ice hockey jersey, face cage helmet tilted up',
  'Fila vintage tennis sweater, wristbands',
]

const ATHLETIC_FEMALE: string[] = [
  'sports bra and mesh overlay crop top, headband',
  'Nike Dri-FIT crop hoodie, running armband',
  'Adidas track crop jacket, three stripes',
  'Under Armour training tank, wrist wraps',
  'boxing-inspired satin robe, hand wraps',
  'mesh basketball crop jersey, gold chain',
  'cycling crop jersey, sport sunglasses',
  'soccer crop jersey, captain armband',
  'windbreaker crop half-zip, running visor',
  'PUMA crop track jacket, retro fit',
  'compression sports crop top, athletic tape',
  'vintage Olympic crop warm-up, country colors',
  'tennis crop polo, sport visor',
  'cropped training hoodie, lifting gloves',
  'Reebok classic crop track top, retro colors',
  'performance crop tank, mesh panels, fitness band',
  'yoga wrap top, zen bracelet',
  'swim cover-up mesh crop, sport earrings',
  'ski base layer crop half-zip, goggles perched on head',
  'dance crop top, leg warmers as arm warmers',
  'martial arts gi top tied at waist, black belt',
  'volleyball jersey crop, kneepads as wrist accessories',
  'Fila vintage tennis crop sweater, terry wristbands',
  'trail running vest, hydration pack, sport watch',
  'surf rash guard crop top, shell necklace',
]

// ---------------------------------------------------------------------------
// ECCENTRIC
// ---------------------------------------------------------------------------

const ECCENTRIC_MALE: string[] = [
  'holographic vinyl jacket, LED chain necklace',
  'sheer mesh top with embroidered stars, crystal rings',
  'oversized deconstructed blazer, one sleeve missing',
  'fur-trimmed cape over bare chest, statement crown',
  'neon PVC trench coat, mirrored visor sunglasses',
  'hand-painted denim jacket, mismatched earrings',
  'sequined baseball jacket, rhinestone-encrusted shades',
  'patchwork quilt coat, vintage brooches everywhere',
  'metallic gold turtleneck, face gems',
  'bondage-strap harness over silk shirt, spiked bracelet',
  'kimono-style wrap jacket, jade pendant',
  'crochet mesh top, body chain',
  'inflatable puffer jacket, futuristic goggles',
  'hand-dyed shibori wrap, wooden beaded necklace',
  'asymmetric origami-fold blazer, geometric earring',
  'full mirror-tile vest, disco ball pendant',
  'cyberpunk techwear jacket, utility straps, gas mask necklace',
  'Victorian ruffled shirt, velvet choker, gothic rings',
  'space-age metallic bomber, antenna headpiece',
  'matador-inspired embroidered bolero, rose in lapel',
  'feathered epaulette jacket, masquerade mask on forehead',
  'tie-dye lab coat, mad scientist goggles',
  'oversized knit poncho, folk art jewelry',
  'chainmail mesh top, medieval ring collection',
  'LED-wired jacket, fiber optic accessories',
]

const ECCENTRIC_FEMALE: string[] = [
  'holographic vinyl crop jacket, LED choker',
  'sheer organza blouse with celestial embroidery, star earrings',
  'deconstructed asymmetric blazer, safety-pin brooches',
  'feathered bolero over metallic bodysuit, tiara',
  'neon PVC crop top, mirrored visor shades',
  'hand-painted leather jacket, mismatched chandelier earrings',
  'sequined bomber jacket, rhinestone face gems',
  'patchwork fur crop coat, vintage brooch collection',
  'metallic gold mesh top, body chain harness',
  'bondage-strap crop top, spiked choker',
  'kimono wrap crop top, jade hair pins',
  'crochet mesh dress top, shell and bead necklace',
  'inflatable sculptural crop top, futuristic visor',
  'shibori-dyed silk wrap, artisan wood jewelry',
  'origami-fold structured crop top, geometric drop earrings',
  'mirror-tile bustier, disco ball earrings',
  'cyberpunk techwear crop jacket, LED arm cuff',
  'Victorian corset top, cameo choker, lace gloves',
  'space-age metallic halter, antenna headband',
  'matador-inspired cropped bolero, rose hair clip',
  'feathered cape crop top, masquerade eye mask',
  'artist smock crop top, paint-splatter accessories',
  'oversized avant-garde knit poncho, statement rings',
  'chainmail crop top, medieval pendant',
  'fiber optic woven crop top, glowing accessories',
]

// ---------------------------------------------------------------------------
// REGISTRY + PICKER
// ---------------------------------------------------------------------------

const WARDROBE_REGISTRY: Record<string, Record<string, string[]>> = {
  designer:   { male: DESIGNER_MALE,   female: DESIGNER_FEMALE },
  streetwear: { male: STREETWEAR_MALE, female: STREETWEAR_FEMALE },
  casual:     { male: CASUAL_MALE,     female: CASUAL_FEMALE },
  formal:     { male: FORMAL_MALE,     female: FORMAL_FEMALE },
  vintage:    { male: VINTAGE_MALE,    female: VINTAGE_FEMALE },
  athletic:   { male: ATHLETIC_MALE,   female: ATHLETIC_FEMALE },
  eccentric:  { male: ECCENTRIC_MALE,  female: ECCENTRIC_FEMALE },
}

/**
 * Pick a random wardrobe outfit from a style category.
 * Falls back to 'male' if gender not found, and returns null if style not found.
 */
export function pickRandomWardrobe(style: string, gender: 'male' | 'female' = 'male'): string | null {
  const genderLists = WARDROBE_REGISTRY[style]
  if (!genderLists) return null

  const list = genderLists[gender] || genderLists['male']
  if (!list || list.length === 0) return null

  return list[Math.floor(Math.random() * list.length)]
}
