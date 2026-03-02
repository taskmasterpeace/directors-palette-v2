/**
 * Photo Shoot Prompt Builder
 * Builds rich, dynamic prompts from the full artist DNA.
 * Every field matters — genre sets the aesthetic, personality sets the energy,
 * neighborhood sets the location, likes set the activities.
 *
 * Architecture: 22 scene groups × 4-5 sub-scenes each = 89 total sub-scenes.
 * Each sub-scene has recipe fields and a buildPrompt function.
 */

import type { ArtistDNA } from '../types/artist-dna.types'
import type {
  PhotoShootScene,
  PhotoShootCategory,
  PhotoShootCategoryInfo,
} from '../types/photo-shoot.types'
import { povToPrompt, lightingToPrompt, moodToPrompt, COMMON_FIELDS } from '../types/photo-shoot.types'

// =============================================================================
// DNA EXTRACTORS — pull context from every section
// =============================================================================

function location(dna: ArtistDNA): string {
  const parts: string[] = []
  if (dna.identity.neighborhood) parts.push(dna.identity.neighborhood)
  if (dna.identity.city) parts.push(dna.identity.city)
  return parts.join(', ') || 'an urban neighborhood'
}

function city(dna: ArtistDNA): string {
  return dna.identity.city || 'the city'
}

function hood(dna: ArtistDNA): string {
  return dna.identity.neighborhood || 'the neighborhood'
}

function ethnicity(dna: ArtistDNA): string {
  return dna.identity.ethnicity ? `${dna.identity.ethnicity} ` : ''
}

function appearance(dna: ArtistDNA): string {
  const parts: string[] = []
  if (dna.look.skinTone) parts.push(`${dna.look.skinTone} skin`)
  if (dna.look.hairStyle) parts.push(`${dna.look.hairStyle} hair`)
  if (dna.look.fashionStyle) parts.push(`wearing ${dna.look.fashionStyle}`)
  if (dna.look.jewelry) parts.push(dna.look.jewelry)
  if (dna.look.tattoos) parts.push(`${dna.look.tattoos} tattoos visible`)
  return parts.join(', ') || 'stylish urban outfit'
}

function genreTag(dna: ArtistDNA): string {
  return dna.sound.genres?.slice(0, 2).join('/') || 'music'
}

function personality(dna: ArtistDNA): string {
  const traits = dna.persona.traits?.slice(0, 3).join(', ')
  const attitude = dna.persona.attitude
  if (traits && attitude) return `${traits}, ${attitude}`
  return traits || attitude || 'confident and authentic'
}

function likes(dna: ArtistDNA): string[] {
  return dna.persona.likes || []
}

/**
 * Genre-aware aesthetic — the genre fundamentally changes the look/feel of every shot.
 * Returns lighting, color grading, and mood directives.
 */
function genreAesthetic(dna: ArtistDNA): string {
  const g = (dna.sound.genres || []).map(s => s.toLowerCase()).join(' ')

  if (g.includes('hip') || g.includes('rap') || g.includes('trap')) {
    return 'urban gritty aesthetic, high contrast, deep shadows with neon accent colors, cinematic street lighting, teal and orange color grading'
  }
  if (g.includes('r&b') || g.includes('rnb') || g.includes('soul')) {
    return 'warm sensual aesthetic, soft golden lighting, amber and burgundy tones, shallow depth of field, intimate mood, smooth color grading'
  }
  if (g.includes('rock') || g.includes('punk') || g.includes('metal')) {
    return 'raw gritty aesthetic, harsh directional lighting, desaturated with pops of red, high grain, edgy contrast, industrial textures'
  }
  if (g.includes('pop')) {
    return 'bright saturated aesthetic, clean even lighting, vibrant candy colors, polished commercial look, soft shadows, upbeat energy'
  }
  if (g.includes('country') || g.includes('folk') || g.includes('americana')) {
    return 'warm rustic aesthetic, golden hour natural light, earthy warm tones, film grain, nostalgic Kodak color science, open landscapes'
  }
  if (g.includes('electronic') || g.includes('edm') || g.includes('house') || g.includes('techno')) {
    return 'futuristic neon aesthetic, LED lighting, deep blues and electric purples, laser-like rim lighting, club atmosphere, high-tech sleek surfaces'
  }
  if (g.includes('jazz') || g.includes('blues')) {
    return 'moody smoky aesthetic, warm tungsten lighting, deep shadows, amber and cool blue contrast, intimate club atmosphere, classic film noir feel'
  }
  if (g.includes('reggae') || g.includes('dancehall') || g.includes('afrobeat')) {
    return 'vibrant tropical aesthetic, warm saturated colors, golden sunlight, green and gold tones, natural outdoor lighting, lively atmosphere'
  }
  if (g.includes('indie') || g.includes('alternative')) {
    return 'muted vintage aesthetic, soft natural light, slightly desaturated pastel tones, film grain, dreamy bokeh, analog camera feel'
  }
  if (g.includes('latin') || g.includes('reggaeton') || g.includes('salsa')) {
    return 'vibrant warm aesthetic, rich saturated colors, warm golden and red tones, dynamic motion feel, festive energy, warm night lighting'
  }
  // Default
  return 'cinematic photography aesthetic, balanced lighting, natural color grading, professional editorial look'
}

/**
 * Genre-aware camera style
 */
function genreCamera(dna: ArtistDNA): string {
  const g = (dna.sound.genres || []).map(s => s.toLowerCase()).join(' ')

  if (g.includes('hip') || g.includes('rap') || g.includes('trap')) {
    return '35mm lens, low angle, wide aperture f/1.8, urban street photography'
  }
  if (g.includes('r&b') || g.includes('rnb') || g.includes('soul')) {
    return '85mm portrait lens, f/1.4 creamy bokeh, intimate framing, soft focus edges'
  }
  if (g.includes('rock') || g.includes('punk')) {
    return '24mm wide angle, handheld feel, slight motion blur, documentary raw style'
  }
  if (g.includes('pop')) {
    return '50mm standard lens, clean sharp focus, studio-grade clarity, even exposure'
  }
  if (g.includes('country') || g.includes('folk')) {
    return '50mm prime lens, natural light only, warm film stock look, Kodak Portra feel'
  }
  if (g.includes('electronic') || g.includes('edm')) {
    return '35mm lens, slow shutter light trails, neon reflections, crisp modern digital'
  }
  return '50mm lens, f/2.0, balanced natural perspective, sharp focus, professional photography'
}

// =============================================================================
// IDENTITY LOCK — prefix for all prompts
// =============================================================================

const IDENTITY_LOCK = 'EXACT SAME PERSON as the reference image. Maintain identical: face structure, skin tone, body type, tattoo placement, hair style, all distinguishing features. '

// =============================================================================
// PROMPT SUFFIX
// =============================================================================

const REALISM_SUFFIX = 'Realistic photograph, NOT illustration, NOT cartoon, NOT AI-looking.'

// =============================================================================
// HELPER — build a complete prompt with all common elements
// =============================================================================

function buildPrompt(
  _dna: ArtistDNA,
  fieldValues: Record<string, string>,
  corePrompt: string,
): string {
  const pov = povToPrompt(fieldValues.pov || 'Professional editorial')
  const lighting = lightingToPrompt(fieldValues.lighting || 'Natural daylight')
  const mood = moodToPrompt(fieldValues.mood || 'Confident and powerful')
  const custom = fieldValues.customDetail ? ` ${fieldValues.customDetail}.` : ''

  return `${IDENTITY_LOCK}${corePrompt} ${pov}. ${lighting}. ${mood}.${custom} ${REALISM_SUFFIX}`
}

// =============================================================================
// COMMON FIELD SETS
// =============================================================================

const STANDARD_FIELDS = [
  COMMON_FIELDS.pov,
  COMMON_FIELDS.lighting,
  COMMON_FIELDS.mood,
  COMMON_FIELDS.customDetail,
]

// =============================================================================
// SCENE GROUPS — 22 groups × 4-5 sub-scenes each
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// WARDROBE CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const wardrobeStreetwear: PhotoShootScene = {
  id: 'wardrobe-streetwear',
  label: 'Streetwear Look',
  description: 'Fashion editorial on the block',
  category: 'wardrobe',
  subScenes: [
    {
      id: 'street-editorial',
      label: 'Street Editorial',
      description: 'Full-body fashion editorial on a street corner',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist, full-body fashion editorial shot standing on a street corner in ${location(dna)}. ${appearance(dna)}. Streetwear outfit matching their ${genreTag(dna)} aesthetic — oversized hoodie or designer jacket, fresh kicks, layered accessories. Urban backdrop with graffiti walls, parked cars, fire hydrants, neighborhood life in the background. The subject carries themselves with ${personality(dna)} energy, natural confident stance. ${genreAesthetic(dna)}. ${genreCamera(dna)}.`
      ),
    },
    {
      id: 'sneaker-closeup',
      label: 'Sneaker Close-Up',
      description: 'Ground-level close-up of sneakers on concrete',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Ground-level close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist's sneakers on cracked concrete sidewalk in ${hood(dna)}. Fresh kicks — clean, detailed, laces visible. Partial body visible from knees down, jeans or joggers breaking over the shoe. Street debris, gum stains, puddle reflections on the pavement. ${genreAesthetic(dna)}. Macro-style detail, 35mm low angle, shallow depth of field f/2.0.`
      ),
    },
    {
      id: 'full-outfit',
      label: 'Full Outfit',
      description: 'Full outfit turnaround on clean background',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist, full-body outfit shot against a clean minimalist background — white or light gray seamless backdrop. ${appearance(dna)}. Complete look visible head to toe: every layer, accessory, chain, watch, ring. Standing relaxed but styled, three-quarter turn showing the fit from multiple angles. Fashion lookbook quality, sharp detail on fabric textures and materials. ${genreAesthetic(dna)}. 50mm lens, even studio lighting, high detail.`
      ),
    },
    {
      id: 'against-wall',
      label: 'Against the Wall',
      description: 'Leaning against a graffiti or brick wall',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist leaning against a graffiti-covered brick wall in ${hood(dna)}, ${city(dna)}. ${appearance(dna)}. One foot flat on the wall behind them, arms crossed or thumbs hooked in pockets, head slightly tilted. The graffiti art and weathered brick provide raw texture. Late afternoon light casting warm directional shadows. ${personality(dna)} expression — effortless cool. ${genreAesthetic(dna)}. ${genreCamera(dna)}.`
      ),
    },
  ],
}

const wardrobeStageFit: PhotoShootScene = {
  id: 'wardrobe-stage-fit',
  label: 'Stage Outfit',
  description: 'Concert-ready under dramatic lights',
  category: 'wardrobe',
  subScenes: [
    {
      id: 'under-lights',
      label: 'Under the Lights',
      description: 'Bold stage outfit under dramatic concert lighting',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a bold, eye-catching stage outfit under dramatic concert lighting. ${appearance(dna)}. Standing center stage, smoke machine haze rolling across the floor, colored spotlights — red, blue, purple — cutting through the fog and creating rim lighting on the body. Sweat glistening under the hot lights. Dynamic power stance matching their ${personality(dna)} persona. ${genreAesthetic(dna)}. 50mm lens, concert photography, f/1.8, sharp subject against blown-out lights.`
      ),
    },
    {
      id: 'backstage-mirror',
      label: 'Backstage Mirror',
      description: 'Checking the look in a dressing room mirror',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist checking their look in a backstage dressing room mirror. ${appearance(dna)}. Warm Hollywood bulb lights framing the mirror, makeup and styling products on the counter. Reflection shows the full outfit from the front while the camera catches the back and side. Pre-show energy — focused, getting into character. Personal items scattered around: phone, drink, setlist. ${personality(dna)} aura. ${genreAesthetic(dna)}. 35mm lens, intimate backstage documentary, warm tungsten tones.`
      ),
    },
    {
      id: 'outfit-detail',
      label: 'Outfit Detail',
      description: 'Close-up of chains, fabric texture, accessories',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Extreme close-up detail shot of a ${ethnicity(dna)}${genreTag(dna)} music artist's stage outfit. Focus on the textures: chain links catching stage light, fabric weave of a custom jacket, embroidery detail, diamond-encrusted pendant, custom belt buckle or rings. ${appearance(dna)} — just the torso and accessories visible. Dramatic single-source sidelighting making the textures pop. Shallow depth of field, macro detail. ${genreAesthetic(dna)}. 100mm macro lens, f/2.8, extreme detail.`
      ),
    },
    {
      id: 'walking-to-stage',
      label: 'Walking to Stage',
      description: 'Walking down a dim corridor toward stage light',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist walking down a dim backstage corridor toward a bright rectangle of stage light at the end. ${appearance(dna)}. Shot from behind — broad shoulders, confident stride, stage outfit catching the light. Concrete corridor walls, cables on the floor, a security guard stepping aside. The crowd roar is almost visible in the blown-out bright opening ahead. ${personality(dna)} energy building. ${genreAesthetic(dna)}. 35mm wide angle, dramatic perspective, silhouette against bright stage opening.`
      ),
    },
  ],
}

const wardrobeStudioCasual: PhotoShootScene = {
  id: 'wardrobe-studio-casual',
  label: 'Studio Casual',
  description: 'Relaxed in the recording studio',
  category: 'wardrobe',
  subScenes: [
    {
      id: 'at-console',
      label: 'At the Console',
      description: 'Hands on faders, monitors glowing',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at a professional mixing console, hands resting on the faders, multiple studio monitors glowing with audio waveforms. ${appearance(dna)}, dressed casual — comfortable studio clothes. The room is dimly lit by monitor glow and LED strips along the desk. Soundproofing panels on the walls. Focused creative energy, ${personality(dna)} vibe. Coffee cup nearby, headphones draped around neck. ${genreAesthetic(dna)}. ${genreCamera(dna)}, warm tones.`
      ),
    },
    {
      id: 'headphones-on',
      label: 'Headphones On',
      description: 'Portrait with headphones, eyes closed, feeling the music',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist portrait, large over-ear headphones on, eyes closed, completely absorbed in the music. ${appearance(dna)}, dressed in comfortable studio casual. Head slightly tilted, expression showing deep emotional connection — ${personality(dna)} energy channeled inward. Studio background softly blurred, warm ambient lighting. Tight crop on face and headphones. 85mm portrait lens, f/1.4, creamy bokeh, warm color grading.`
      ),
    },
    {
      id: 'coffee-break',
      label: 'Coffee Break',
      description: 'Holding coffee, relaxed in studio chair',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on a coffee break in the recording studio, relaxed in a leather studio chair. ${appearance(dna)}, casual studio clothes. Holding a coffee cup with both hands, mid-conversation with someone off-camera, natural half-smile. Studio gear visible in the soft background — monitors, speakers, patch cables. Warm cozy atmosphere, late-night session vibes. ${personality(dna)} demeanor. 50mm lens, warm tungsten tones, documentary candid style.`
      ),
    },
    {
      id: 'writing-session',
      label: 'Writing Session',
      description: 'Notebook open, pen in hand, studio lounge',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a studio lounge area, notebook open on their lap, pen in hand, mid-thought. ${appearance(dna)}, dressed casual. Sitting on a worn leather couch, feet up on a coffee table littered with lyric sheets and a laptop. Dim warm lighting, the studio control room visible through glass in the background. Deep creative focus, ${personality(dna)} contemplative energy. ${genreAesthetic(dna)}. 35mm lens, environmental portrait, warm tones.`
      ),
    },
  ],
}

const wardrobePress: PhotoShootScene = {
  id: 'wardrobe-press',
  label: 'Press / Cover Shot',
  description: 'Magazine-ready editorial portrait',
  category: 'wardrobe',
  subScenes: [
    {
      id: 'magazine-cover',
      label: 'Magazine Cover',
      description: 'Three-quarter body magazine cover portrait',
      aspectRatio: '9:16',
      fields: [
        ...STANDARD_FIELDS,
        {
          id: 'publication',
          label: 'Publication',
          type: 'select',
          options: ['Vogue', 'GQ', 'Rolling Stone', 'XXL', 'Billboard', 'Complex'],
          defaultValue: 'Rolling Stone',
        },
      ],
      buildPrompt: (dna, fv) => {
        const pub = fv.publication || 'Rolling Stone'
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist, three-quarter body portrait styled for a ${pub} magazine cover shoot. ${appearance(dna)}. Styled sharp — every detail intentional, wardrobe fitted perfectly. Clean studio backdrop with dramatic single-source lighting creating bold sculpted shadows. Direct eye contact with camera, ${personality(dna)} energy radiating from the pose. The kind of image that makes you stop scrolling. ${genreAesthetic(dna)}. 85mm portrait lens, f/2.0, fashion editorial photography, ${pub}-quality production.`
        )
      },
    },
    {
      id: 'waiting-room',
      label: 'Waiting Room',
      description: 'Relaxed in a luxury lounge before press',
      aspectRatio: '16:9',
      fields: [
        ...STANDARD_FIELDS,
        {
          id: 'setting',
          label: 'Setting',
          type: 'select',
          options: ['luxury lounge', 'backstage green room', 'hotel lobby', 'label office'],
          defaultValue: 'luxury lounge',
        },
      ],
      buildPrompt: (dna, fv) => {
        const setting = fv.setting || 'luxury lounge'
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting in a ${setting}, waiting before a press interview. ${appearance(dna)}, dressed for the cameras. Relaxed but aware — checking phone, legs crossed, one arm draped over the chair. Expensive interior details: marble, velvet, polished wood, designer furniture. A publicist or assistant blurred in the background. ${personality(dna)} composure, celebrity at ease. ${genreAesthetic(dna)}. 35mm lens, editorial lifestyle photography, shallow depth of field.`
        )
      },
    },
    {
      id: 'signing-fans',
      label: 'Signing for Fans',
      description: 'Interacting with fans, signing autographs',
      aspectRatio: '16:9',
      fields: [
        ...STANDARD_FIELDS,
        {
          id: 'crowd',
          label: 'Crowd Type',
          type: 'select',
          options: ['small intimate group', 'line around the block', 'after-show backstage', 'record store'],
          defaultValue: 'small intimate group',
        },
      ],
      buildPrompt: (dna, fv) => {
        const crowd = fv.crowd || 'small intimate group'
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist signing autographs for fans — ${crowd}. ${appearance(dna)}. Leaning forward, pen in hand, genuine smile connecting with a fan. Phones raised around them capturing the moment, flash reflections visible. The energy is warm and real — not staged. Security nearby but not intrusive. ${personality(dna)} warmth showing through. ${genreAesthetic(dna)}. 50mm lens, candid event photography, fast shutter speed, authentic moment.`
        )
      },
    },
    {
      id: 'wardrobe-room',
      label: 'Wardrobe Room',
      description: 'Getting styled before a shoot',
      aspectRatio: '9:16',
      fields: [
        ...STANDARD_FIELDS,
        {
          id: 'outfitNote',
          label: 'Outfit Detail',
          type: 'text',
          placeholder: 'describe the outfit they\'re changing into...',
        },
      ],
      buildPrompt: (dna, fv) => {
        const outfitDetail = fv.outfitNote ? ` The next outfit: ${fv.outfitNote}.` : ''
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist in a wardrobe room getting styled before a photo shoot. ${appearance(dna)}. Racks of clothing options around them, a stylist adjusting their collar or cuff. Full-length mirror reflecting the look, garment bags and shoeboxes on the floor.${outfitDetail} Bright clean lighting, fashion industry behind-the-scenes. ${personality(dna)} energy — comfortable being fussed over. 35mm lens, behind-the-scenes editorial style.`
        )
      },
    },
    {
      id: 'selfie-posters',
      label: 'Selfie with Posters',
      description: 'Taking a selfie in front of their own posters',
      aspectRatio: '1:1',
      fields: [
        ...STANDARD_FIELDS,
        {
          id: 'posterDetail',
          label: 'Poster Detail',
          type: 'text',
          placeholder: 'describe what\'s on the posters behind them...',
        },
      ],
      buildPrompt: (dna, fv) => {
        const posterInfo = fv.posterDetail
          ? fv.posterDetail
          : `${genreTag(dna)} album artwork and concert promo featuring their ${personality(dna)} persona`
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a selfie with their own promotional posters on a wall behind them. ${appearance(dna)}. iPhone 16 Pro front camera selfie, arm extended, grinning with pride. The posters behind show ${posterInfo}. Maybe a record store or venue lobby. The moment feels real — an artist seeing their face on a wall. ${personality(dna)} pride. 24mm equivalent, front camera slight distortion, authentic social media moment.`
        )
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const locationTheBlock: PhotoShootScene = {
  id: 'location-the-block',
  label: 'The Block',
  description: 'Walking through the neighborhood',
  category: 'location',
  subScenes: [
    {
      id: 'walking-street',
      label: 'Walking the Street',
      description: 'Walking down the block, neighborhood life around',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist walking down the main street of ${hood(dna)}, ${city(dna)}, wide environmental portrait. ${appearance(dna)}. Mid-stride, authentic street scene — local corner stores with hand-painted signs, brownstones or row houses, people going about their day in the background, parked cars lining the curb. Golden hour sunlight casting long warm shadows down the block. The artist looks completely at home, ${personality(dna)} demeanor. ${genreAesthetic(dna)}. 28mm wide angle, street photography, documentary feel.`
      ),
    },
    {
      id: 'corner-store-front',
      label: 'Corner Store Front',
      description: 'Standing in front of the local bodega',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist standing in front of a corner store / bodega in ${hood(dna)}, ${city(dna)}. ${appearance(dna)}. Hand-painted signage overhead, produce crates out front, lottery and ATM signs in the window, cat in the doorway. The artist leaning against the door frame or standing with a bag in hand, casual as if they stop here every day — because they do. ${personality(dna)} neighborhood energy. ${genreAesthetic(dna)}. ${genreCamera(dna)}, authentic street portrait.`
      ),
    },
    {
      id: 'stoop-sitting',
      label: 'Stoop Sitting',
      description: 'Sitting on front steps, neighborhood visible',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting on the front stoop of a brownstone in ${hood(dna)}, ${city(dna)}. ${appearance(dna)}. Relaxed — elbows on knees, head slightly tilted, watching the block. Iron railing visible, potted plants on the steps, neighbors walking past, kids on bikes in the distance. Warm afternoon light dappled through street trees. The ultimate candid — this is where they grew up, where they think. ${personality(dna)} ease. ${genreAesthetic(dna)}. 35mm lens, documentary candid, warm tones.`
      ),
    },
    {
      id: 'car-leaning',
      label: 'Car Leaning',
      description: 'Leaning against a parked car, arms crossed',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist leaning against a parked car on a street in ${hood(dna)}, ${city(dna)}. ${appearance(dna)}. Arms crossed, one foot kicked up against the tire, head held high. The street stretches behind them — fire hydrants, street signs, a barbershop or bodega in the distance. Car could be a fresh whip or a neighborhood beater — either way the artist owns the frame. ${personality(dna)} attitude. ${genreAesthetic(dna)}. ${genreCamera(dna)}, environmental street portrait.`
      ),
    },
  ],
}

const locationRooftop: PhotoShootScene = {
  id: 'location-rooftop',
  label: 'Rooftop at Sunset',
  description: 'City skyline backdrop, golden hour',
  category: 'location',
  subScenes: [
    {
      id: 'skyline-portrait',
      label: 'Skyline Portrait',
      description: 'Standing with city skyline behind at sunset',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist standing on a rooftop with the ${city(dna)} skyline stretching behind them at golden hour. ${appearance(dna)}. Warm amber sunlight backlighting the subject with natural lens flare, buildings silhouetted against an orange and purple gradient sky. Confident commanding stance, looking directly at camera. The city they came from, laid out behind them like a kingdom. ${personality(dna)} power. ${genreAesthetic(dna)}. 50mm lens, f/2.0, warm editorial color grading.`
      ),
    },
    {
      id: 'edge-shot',
      label: 'Edge Shot',
      description: 'At the rooftop edge, city below',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at the very edge of a rooftop in ${city(dna)}, dramatic wide framing. ${appearance(dna)}. Standing at the parapet looking out over the city below, buildings and streets stretching to the horizon. Wind catching their clothes slightly. The scale — one person against the entire cityscape — tells the story. Sunset light painting everything warm amber. ${personality(dna)} contemplation. ${genreAesthetic(dna)}. 24mm wide angle, dramatic composition, rule of thirds.`
      ),
    },
    {
      id: 'looking-down',
      label: 'Looking Down',
      description: 'Looking down at the streets from above',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on a rooftop looking down at the streets of ${hood(dna)} below. ${appearance(dna)}. Shot from behind/side, hands on the rooftop ledge, peering down at the tiny cars, tiny people, the blocks that made them. Environmental perspective shot showing the height and the neighborhood below. Late afternoon light. ${personality(dna)} reflective moment — where they came from, how far they've risen. ${genreAesthetic(dna)}. 35mm lens, environmental portrait, dramatic depth.`
      ),
    },
    {
      id: 'golden-silhouette',
      label: 'Golden Silhouette',
      description: 'Silhouetted against the sunset',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist silhouetted against a blazing sunset on a rooftop in ${city(dna)}. ${appearance(dna)} visible only as a dark outline against intense orange and magenta sky. Dramatic backlighting — the sun directly behind them creating a halo rim light. Arms might be slightly outstretched or hands in pockets. The outline alone tells you who this is. ${personality(dna)} presence even in silhouette. 50mm lens, expose for the sky, deep black silhouette, cinematic framing.`
      ),
    },
  ],
}

const locationRecordingStudio: PhotoShootScene = {
  id: 'location-recording-studio',
  label: 'Recording Studio',
  description: 'At the mixing console',
  category: 'location',
  subScenes: [
    {
      id: 'at-board',
      label: 'At the Board',
      description: 'At the mixing board, focused on the mix',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist seated at a massive mixing console in a professional recording studio. ${appearance(dna)}. Hands on the faders, eyes scanning multiple screens showing Pro Tools sessions, audio waveforms, and metering. The board stretches wide — dozens of channels lit up. Studio monitors flanking the screens, acoustic treatment panels on walls. Deep focus, crafting the sound. ${personality(dna)} creative intensity. ${genreAesthetic(dna)}. ${genreCamera(dna)}, warm monitor glow, music industry documentary style.`
      ),
    },
    {
      id: 'through-glass',
      label: 'Through the Glass',
      description: 'Seen through the vocal booth glass recording',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist visible through the vocal booth glass, recording a take. ${appearance(dna)}. Professional condenser microphone with pop filter, closed-back headphones on, eyes closed or looking at a lyrics sheet. The glass creates a frame-within-a-frame, studio reflections visible on the surface. Control room equipment in the foreground, slightly out of focus. Intimate creative moment captured through the barrier. ${personality(dna)} emotional delivery. ${genreAesthetic(dna)}. 85mm lens, shot from engineer's perspective.`
      ),
    },
    {
      id: 'monitor-glow',
      label: 'Monitor Glow',
      description: 'Face lit by studio monitor glow in darkness',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist's face lit only by the glow of studio monitors in an otherwise dark room. ${appearance(dna)}. The screen light paints their face in cool blue and warm amber, eyes reflecting the audio interface. Intimate, late-night session atmosphere — just them and the music. Everything beyond the monitor light falls into deep shadow. ${personality(dna)} focus in the quiet moment. 85mm portrait lens, f/1.4, available light only, moody intimate portrait.`
      ),
    },
    {
      id: 'session-break',
      label: 'Session Break',
      description: 'Taking a break, feet up, snacks around',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a break during a recording session. ${appearance(dna)}, looking relaxed and loose. Feet up on the mixing desk or a coffee table, snacks and empty energy drink cans scattered around, phone in hand scrolling. Studio behind them slightly blurred — cables, headphones hung up, mic stands. The lived-in mess of a real working session. ${personality(dna)} ease, comfortable in their element. 35mm lens, candid documentary style, warm tones.`
      ),
    },
  ],
}

const locationNightCity: PhotoShootScene = {
  id: 'location-night-city',
  label: 'City at Night',
  description: 'Neon lights and wet streets',
  category: 'location',
  subScenes: [
    {
      id: 'neon-walk',
      label: 'Neon Walk',
      description: 'Walking under neon signs, colorful reflections',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist walking under a row of neon signs on a busy street at night in ${city(dna)}. ${appearance(dna)}. Red, blue, pink, and green neon light spilling across their face and clothes, creating colorful reflections on skin. Other pedestrians as blurred motion. The city alive and electric around them. Mid-stride, purposeful walk, ${personality(dna)} energy cutting through the crowd. ${genreAesthetic(dna)}. 50mm lens, f/1.8, neon night photography, cinematic color.`
      ),
    },
    {
      id: 'wet-street-reflection',
      label: 'Wet Street Reflection',
      description: 'Standing on wet street, reflection in puddle',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist standing on a rain-slicked street in ${city(dna)} at night, full reflection visible in the wet pavement. ${appearance(dna)}. The puddles create perfect mirror pools of neon signs and streetlights, doubling the visual. Standing centered in the frame, the real person above and the reflected person below. Slight rain mist in the air catching colored light. ${personality(dna)} presence. ${genreAesthetic(dna)}. 35mm lens, low angle to catch the reflection, cinematic wet night aesthetic.`
      ),
    },
    {
      id: 'under-sign',
      label: 'Under the Sign',
      description: 'Beneath a large neon sign, bathed in color',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist standing directly beneath a large glowing neon sign at night in ${city(dna)}. ${appearance(dna)}. The sign bathes them entirely in a single dominant color — maybe red, or electric blue, or hot pink — washing out everything else. Looking up at the camera from below, or staring straight ahead. The sign text partially visible above their head. Dramatic color wash effect. ${personality(dna)} intensity under the glow. ${genreAesthetic(dna)}. ${genreCamera(dna)}, moody neon portrait.`
      ),
    },
    {
      id: 'taxi-shot',
      label: 'Taxi Shot',
      description: 'Stepping out of a cab, city behind',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist stepping out of a taxi on a busy ${city(dna)} street at night. ${appearance(dna)}. One foot on the wet curb, hand on the car door, the interior light spilling warm yellow into the cool blue night. City traffic and pedestrians blurred in the background. The arrival moment — showing up to something. Paparazzi flash feel, celebrity energy. ${personality(dna)} composure. ${genreAesthetic(dna)}. 50mm lens, f/1.8, street night photography, mixed lighting.`
      ),
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL MEDIA CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const socialMirrorSelfie: PhotoShootScene = {
  id: 'social-mirror-selfie',
  label: 'Mirror Selfie',
  description: 'Candid mirror shot',
  category: 'social',
  subScenes: [
    {
      id: 'bedroom-mirror',
      label: 'Bedroom Mirror',
      description: 'Bedroom full-length mirror, LED strips, sneaker collection',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a full-length mirror selfie in their bedroom. iPhone 16 Pro rear camera via mirror, 48MP sharp detail. ${appearance(dna)}. Bedroom reflects their ${genreTag(dna)} aesthetic — LED strip lights along the ceiling casting purple/blue glow, sneaker collection on wall-mounted shelves, posters and records on the wall, unmade bed visible. Casual confident pose, one hand holding phone, other hand relaxed. ${personality(dna)} energy, natural and unforced. Natural window light mixed with LED ambient.`
      ),
    },
    {
      id: 'bathroom-mirror',
      label: 'Bathroom Mirror',
      description: 'Fresh out the shower, steam, robe or towel',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a bathroom mirror selfie, fresh out the shower. iPhone 16 Pro front camera via mirror. ${appearance(dna)}, wearing a plush robe or towel around shoulders, skin still dewy. Bathroom mirror slightly steamed at the edges, marble or tile counter visible, grooming products arranged. The vanity lights around the mirror providing warm even illumination. ${personality(dna)} vibe — relaxed morning energy. Authentic candid social media moment, not styled.`
      ),
    },
    {
      id: 'dressing-room',
      label: 'Dressing Room',
      description: 'Clothing store dressing room, outfits around',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a mirror selfie in a designer clothing store dressing room. iPhone 16 Pro rear camera via mirror, crisp detail. ${appearance(dna)}, trying on a new outfit — tags still on, other options hanging on hooks around them. Multiple mirrors creating depth, bright overhead fitting room lighting. Shopping bags from other stores on the floor. The "should I cop this?" selfie energy. ${personality(dna)} style confidence. Authentic social media shopping moment.`
      ),
    },
    {
      id: 'gym-mirror',
      label: 'Gym Mirror',
      description: 'Gym wall mirror, workout clothes, post-workout',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a gym mirror selfie, post-workout. iPhone 16 Pro rear camera via mirror. ${appearance(dna)} in athletic wear — compression shirt or tank top, workout shorts, fresh sneakers, wireless earbuds. Visible sweat, muscles pumped, gym equipment (dumbbells, machines, weight rack) reflected in the mirror behind them. Overhead fluorescent gym lighting mixed with natural light from large windows. ${personality(dna)} discipline energy. Authentic gym selfie, slightly posed but real.`
      ),
    },
  ],
}

const socialCarSelfie: PhotoShootScene = {
  id: 'social-car-selfie',
  label: 'Car Selfie',
  description: 'Behind the wheel, casual vibes',
  category: 'social',
  subScenes: [
    {
      id: 'driver-seat',
      label: 'Driver Seat',
      description: 'Behind the wheel, sunglasses, casual vibes',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the driver seat of a car, candid selfie. iPhone 16 Pro front camera, 12MP, slight wide-angle distortion from arm's length. ${appearance(dna)}, sunglasses on or pushed up on forehead. One hand on the steering wheel, leather or suede interior visible, rearview mirror in frame. Natural sunlight through the windshield creating warm fill light on the face. ${personality(dna)} expression — not trying too hard, just vibing between destinations. Authentic social media selfie energy.`
      ),
    },
    {
      id: 'passenger-lean',
      label: 'Passenger Lean',
      description: 'Leaning from passenger side, relaxed angle',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist taking a selfie from the passenger seat of a car, leaning back relaxed. iPhone 16 Pro front camera, casual angle. ${appearance(dna)}. Seatbelt across chest, window showing passing scenery slightly blurred, dashboard and windshield visible. Head resting against the headrest, ${personality(dna)} chill energy. Someone else is driving — just riding, no worries. Natural mixed lighting from outside. Authentic candid car moment.`
      ),
    },
    {
      id: 'parked-up',
      label: 'Parked Up',
      description: 'Full body from outside, car door open',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist, full body shot from outside a parked car, driver door open, one foot on the ground, one still in the car. ${appearance(dna)}. The car itself is part of the look — could be a fresh luxury ride or a clean modded daily driver. Street or parking lot in ${hood(dna)} visible around them. Getting out or about to leave, transitional moment. ${personality(dna)} arrival energy. ${genreAesthetic(dna)}. ${genreCamera(dna)}, street fashion editorial.`
      ),
    },
    {
      id: 'through-windshield',
      label: 'Through Windshield',
      description: 'Shot from outside through the windshield',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist shot through the windshield from outside the car, sitting in the driver seat. ${appearance(dna)}. Reflections of clouds, trees, or buildings on the windshield glass layered over their face. Hands on the wheel, looking forward or at the camera through the glass. The glass creates a cinematic separation — we're looking in at their world. ${personality(dna)} focus. ${genreAesthetic(dna)}. 50mm lens, shooting through glass, layered reflections, cinematic feel.`
      ),
    },
  ],
}

const socialCelebrating: PhotoShootScene = {
  id: 'social-celebrating',
  label: 'Celebrating with Friends',
  description: 'Night out with the squad',
  category: 'social',
  subScenes: [
    {
      id: 'vip-section',
      label: 'VIP Section',
      description: 'VIP section, bottle service, friends around',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist celebrating in a VIP section at a club in ${city(dna)}, friends and crew around them. ${appearance(dna)}. Bottle service on the table — champagne, premium liquor, sparklers fizzing. Flash photography giving that authentic party feel, slightly overexposed highlights. Friends laughing, toasting, phones out. The artist at the center, ${personality(dna)} energy amplified by the crew. Ambient colored club lighting, deep purples and golds. ${genreAesthetic(dna)}. Smartphone flash candid party photography.`
      ),
    },
    {
      id: 'toast-shot',
      label: 'Toast Shot',
      description: 'Close-up toast moment, glasses raised',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist's hand raising a glass in a toast, other glasses clinking in from the edges of frame. ${appearance(dna)} — face partially visible, big genuine smile. Champagne or dark liquor in crystal glasses, bubbles visible. Beautiful bokeh background of club lights — warm amber and cool blue orbs. The celebration is real — maybe a release, a deal, a milestone. ${personality(dna)} joy. 85mm lens, f/1.4, extreme shallow depth of field, warm tones.`
      ),
    },
    {
      id: 'dance-floor',
      label: 'Dance Floor',
      description: 'On the dance floor, motion blur, colored lights',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on the dance floor at a club in ${city(dna)}, surrounded by people, moving to the music. ${appearance(dna)}. Slight motion blur on the body capturing the movement energy, colored stage lights sweeping through the crowd — red, purple, blue. Sweat and energy, packed floor, bass you can feel. The artist lost in the moment, not performing just living. ${personality(dna)} uninhibited. ${genreAesthetic(dna)}. 35mm lens, slow shutter 1/30s, motion blur, nightclub photography.`
      ),
    },
    {
      id: 'group-outside',
      label: 'Group Outside',
      description: 'Group photo outside the venue',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist with their crew outside a venue or club at night in ${city(dna)}, group photo energy. ${appearance(dna)}. Everyone looking fresh, lined up or clustered, some throwing signs, some laughing. Venue signage or neon behind them, bouncer rope visible. Street visible, maybe a line of people waiting. Someone's phone flash going off. The whole squad looking good. ${personality(dna)} crew energy. Smartphone flash group photo, authentic night-out documentation.`
      ),
    },
  ],
}

const socialFoodSpot: PhotoShootScene = {
  id: 'social-food-spot',
  label: 'At the Food Spot',
  description: 'Local restaurant, keeping it real',
  category: 'social',
  subScenes: [
    {
      id: 'table-shot',
      label: 'Table Shot',
      description: 'At the table, food spread, looking at camera',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at a restaurant table in ${hood(dna)}, ${city(dna)}, looking at the camera mid-meal. ${appearance(dna)}. Food spread on the table — plates, drinks, condiments, napkins, the real mess of a good meal. Fork or chopsticks in hand, mid-bite smile or talking with mouth slightly full. Warm interior restaurant lighting, other diners in the soft background. This is their spot — they come here all the time. ${personality(dna)} ease. 50mm lens, warm tones, casual food photography.`
      ),
    },
    {
      id: 'counter-seat',
      label: 'Counter Seat',
      description: 'Sitting at a counter, casual diner, eating',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting at a counter in a casual diner or local restaurant in ${hood(dna)}. ${appearance(dna)}. Hunched over a plate, eating, a cup of coffee or soda beside them. The counter shows character — laminate top, napkin dispensers, salt and pepper, a menu board above. The cook visible in the background through the pass window. Just a regular Tuesday lunch. ${personality(dna)} comfort. ${genreAesthetic(dna)}. 35mm lens, documentary candid, warm overhead lighting.`
      ),
    },
    {
      id: 'takeout-walk',
      label: 'Takeout Walk',
      description: 'Walking with takeout, streets, casual',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist walking down a sidewalk in ${hood(dna)}, ${city(dna)}, carrying a takeout bag and a drink. ${appearance(dna)}. Mid-stride on the sidewalk, the takeout bag swinging slightly, straw in mouth from the drink. Casual everyday moment — not styled, just hungry. Storefronts and parked cars in the background, neighborhood life continuing around them. ${personality(dna)} unbothered walk. ${genreAesthetic(dna)}. ${genreCamera(dna)}, street photography, candid.`
      ),
    },
    {
      id: 'kitchen-peek',
      label: 'Kitchen Peek',
      description: 'Behind the counter, chef hat joke, tasting food',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist behind the counter of a restaurant kitchen, wearing a chef hat or apron as a joke, tasting food from a spoon. ${appearance(dna)}, plus the comedic chef outfit layered on top. Kitchen environment — stainless steel, burners, hanging utensils, the actual cooks laughing in the background. The artist hamming it up, making a "chef's kiss" face or giving a thumbs up. ${personality(dna)} playful side. 35mm lens, behind-the-scenes candid, bright kitchen fluorescent mixed with warm cooking light.`
      ),
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// EVERYDAY LIFE CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const everydayBarbershop: PhotoShootScene = {
  id: 'everyday-barbershop',
  label: 'At the Barbershop',
  description: 'Getting a fresh cut',
  category: 'everyday',
  subScenes: [
    {
      id: 'in-chair',
      label: 'In the Chair',
      description: 'In the barber chair, cape on, barber working',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting in a barber chair getting a haircut at a local barbershop in ${hood(dna)}. ${appearance(dna)}, barber cape draped over them. The barber working with clippers, focused on the line-up, hair clippings on the cape. Classic barbershop interior — big mirrors, barber supplies lined up, magazines, a TV playing in the corner. Other customers waiting, conversation flowing. ${personality(dna)} relaxation. 50mm lens, warm fluorescent interior, candid documentary barbershop photography.`
      ),
    },
    {
      id: 'fresh-cut-reveal',
      label: 'Fresh Cut Reveal',
      description: 'Just finished, checking the fresh cut',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist standing up from the barber chair, fresh cut just finished, looking sharp. ${appearance(dna)}, hairline crispy clean, edges perfect. Running a hand over the fresh cut, satisfied expression — that "they killed it" face. Barber in the background putting away tools, proud of the work. The cape being removed, transformation moment. ${personality(dna)} confidence boosted by the fresh look. ${genreAesthetic(dna)}. 50mm lens, barbershop portrait, warm lighting.`
      ),
    },
    {
      id: 'waiting-area',
      label: 'Waiting Area',
      description: 'Waiting their turn, scrolling phone',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the waiting area of a barbershop in ${hood(dna)}, waiting their turn. ${appearance(dna)}. Sitting in a worn waiting chair, scrolling their phone, one leg crossed. Other guys waiting too, barbershop chatter in the air. Sports on the TV, barber calendar on the wall, the familiar neighborhood barbershop scene. ${personality(dna)} patience, comfortable in the ritual. 35mm lens, environmental documentary candid, warm tones, authentic moment.`
      ),
    },
    {
      id: 'mirror-check',
      label: 'Mirror Check',
      description: 'Close-up mirror check of the hairline',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist checking their fresh hairline in the barbershop mirror, hand mirror held at an angle. ${appearance(dna)}, hairline sharp and crispy. Satisfied expression — slight nod, maybe a grin. The barbershop mirror framing the shot, warm vanity-style lighting. Just the head, shoulders, and the hand mirror visible. The universal "check the cut" moment that transcends fame. ${personality(dna)} approval. 85mm portrait lens, f/2.0, tight crop, warm tones.`
      ),
    },
  ],
}

const everydayCornerStore: PhotoShootScene = {
  id: 'everyday-corner-store',
  label: 'Corner Store Run',
  description: 'Quick stop at the bodega',
  category: 'everyday',
  subScenes: [
    {
      id: 'walking-out',
      label: 'Walking Out',
      description: 'Walking out the door with a bag and drink',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist stepping out of a corner store / bodega in ${hood(dna)}, ${city(dna)}, plastic bag in one hand, cold drink in the other. ${appearance(dna)}. Pushing the door open with their back, the store interior visible behind — shelves of snacks, lotto counter, fluorescent lights. Stepping onto the sidewalk into natural daylight. Everyday errand, not a photo op. ${personality(dna)} casual energy. ${genreAesthetic(dna)}. ${genreCamera(dna)}, street photography, candid documentary.`
      ),
    },
    {
      id: 'inside-browsing',
      label: 'Inside Browsing',
      description: 'Browsing the aisles, checking products',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist inside a corner store in ${hood(dna)}, browsing the aisles. ${appearance(dna)}. Standing in front of the drink cooler or chip wall, reading a label or reaching for something. Narrow aisles, crowded shelves, fluorescent overhead lighting, security mirror in the corner. The store owner at the register in the background. Authentic everyday moment — just grabbing something. ${personality(dna)} normalcy. 35mm lens, interior documentary, overhead fluorescent lighting, candid.`
      ),
    },
    {
      id: 'at-counter',
      label: 'At the Counter',
      description: 'At the register, chatting with the owner',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at the register counter of a corner store in ${hood(dna)}, chatting with the owner. ${appearance(dna)}. Money or card on the counter, items being rung up — a drink, chips, maybe a loose cigarette or candy. The plexiglass barrier, lottery tickets behind the counter, hanging air fresheners. Leaning on the counter, familiar banter with someone they've known for years. ${personality(dna)} neighborly warmth. 35mm lens, documentary candid, warm convenience store lighting.`
      ),
    },
    {
      id: 'outside-leaning',
      label: 'Outside Leaning',
      description: 'Leaning against the storefront outside',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist leaning against the outside of a corner store in ${hood(dna)}, ${city(dna)}, eating a snack. ${appearance(dna)}. Back against the storefront window, biting into a sandwich or opening a bag of chips. Store signage above, sidewalk life around — someone walking past, a kid on a bike. Just posted up, killing time, watching the block. ${personality(dna)} neighborhood presence. ${genreAesthetic(dna)}. ${genreCamera(dna)}, street portrait, afternoon light.`
      ),
    },
  ],
}

const everydayMorningCoffee: PhotoShootScene = {
  id: 'everyday-morning-coffee',
  label: 'Morning Coffee',
  description: 'Starting the day, no filter',
  category: 'everyday',
  subScenes: [
    {
      id: 'window-seat',
      label: 'Window Seat',
      description: 'By the window, morning light, coffee in hand',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting by a window in the morning, holding a coffee cup with both hands. ${appearance(dna)} but dressed down — comfortable morning clothes, maybe a hoodie or robe. Soft morning window light illuminating their face from the side, ${city(dna)} visible through the window — buildings, sky, morning traffic. Slightly sleepy but content expression, steam rising from the mug. ${personality(dna)} at peace before the day starts. 50mm lens, f/1.8, soft natural light, warm intimate morning tones.`
      ),
    },
    {
      id: 'kitchen-counter',
      label: 'Kitchen Counter',
      description: 'In the kitchen, making coffee, morning routine',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in their kitchen making coffee in the morning. ${appearance(dna)} but dressed casual — sweats, T-shirt, slides on. Standing at the counter, pouring from a coffee maker or French press. Kitchen details: fruit bowl, mail on the counter, fridge magnets, cereal box left out. Morning light through the kitchen window. The mundane morning routine of someone whose nights are extraordinary. ${personality(dna)} morning ease. 35mm lens, lifestyle documentary, warm morning tones.`
      ),
    },
    {
      id: 'balcony-morning',
      label: 'Balcony Morning',
      description: 'On a balcony or fire escape with coffee',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on a balcony or fire escape in ${city(dna)}, coffee in hand, morning. ${appearance(dna)} but underdressed for public — pajama pants, old hoodie, no chains. Leaning on the railing, looking out at the city waking up. Morning haze in the air, buildings catching first light, sounds of the city starting. A private moment with the city. ${personality(dna)} contemplation. ${genreAesthetic(dna)}. 50mm lens, environmental morning portrait, golden morning light.`
      ),
    },
    {
      id: 'still-waking-up',
      label: 'Still Waking Up',
      description: 'Just woke up, messy, no filter, authentic',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist who clearly just woke up, raw and unfiltered morning portrait. ${appearance(dna)} but stripped back — pillow lines on face, eyes still adjusting, hair messy. Holding a coffee mug, squinting at the light. Bed visible in the background, sheets rumpled, phone on the nightstand. No filter, no styling, no pretense — this is the artist before the artist. ${personality(dna)} vulnerability. 50mm lens, f/2.0, soft morning window light, intimate.`
      ),
    },
  ],
}

const everydayWorkingOut: PhotoShootScene = {
  id: 'everyday-working-out',
  label: 'Working Out',
  description: 'At the gym, staying disciplined',
  category: 'everyday',
  subScenes: [
    {
      id: 'mid-set',
      label: 'Mid-Set',
      description: 'Mid-exercise, weights, focused intensity',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist mid-exercise at the gym, focused intensity. ${appearance(dna)} in athletic wear — compression top, shorts, fresh training shoes, wireless earbuds in. Dumbbells in hand mid-curl, or pushing on a bench press, veins visible, muscles engaged. Determined grimace, eyes locked forward. Gym environment: weight rack, mirrors, other people working out in the background. ${personality(dna)} discipline showing through the effort. 35mm lens, fitness photography, sharp focus on the subject, overhead gym lighting.`
      ),
    },
    {
      id: 'post-workout',
      label: 'Post-Workout',
      description: 'Post-workout, towel, breathing heavy, satisfied',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist post-workout, sitting on a bench in the gym catching their breath. ${appearance(dna)} in sweat-soaked athletic wear, towel draped around neck, water bottle in hand. Sweat on the forehead, chest heaving slightly, but satisfied expression — they crushed it. Gym background, weights racked, the workout complete. ${personality(dna)} satisfaction. 50mm portrait lens, shallow depth of field, warm tones, post-exertion glow.`
      ),
    },
    {
      id: 'locker-room',
      label: 'Locker Room',
      description: 'In the locker room, changing, gym bag',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a gym locker room, mid-transition between workout and regular clothes. ${appearance(dna)}, partially changed — athletic wear mixed with street clothes. Gym bag open on the bench, phone out, checking messages. Locker room details: metal lockers, wooden bench, concrete or tile floor. The between-worlds moment of gym to life. ${personality(dna)} casual energy. 35mm lens, candid locker room documentary, overhead fluorescent lighting, authentic moment.`
      ),
    },
    {
      id: 'jump-rope',
      label: 'Jump Rope',
      description: 'Jump rope session, dynamic action shot',
      aspectRatio: '9:16',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist doing a jump rope session, dynamic action shot. ${appearance(dna)} in athletic wear, mid-jump, feet off the ground, rope blurred in a circular arc around them. Could be outside on a rooftop or in a gym. Sweat droplets caught mid-air, intense focused expression, athletic grace. ${personality(dna)} work ethic in motion. ${genreAesthetic(dna)}. 35mm lens, fast shutter 1/1000s freezing the action, slightly low angle for dramatic effect.`
      ),
    },
  ],
}

const everydayWritingLyrics: PhotoShootScene = {
  id: 'everyday-writing-lyrics',
  label: 'Writing Lyrics',
  description: 'Notebook out, crafting bars',
  category: 'everyday',
  subScenes: [
    {
      id: 'notebook-closeup',
      label: 'Notebook Close-Up',
      description: 'Close-up of hand writing, pen moving, lyrics blurred',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Extreme close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist's hand writing lyrics in a notebook, pen mid-stroke on paper. ${appearance(dna)} — just the hand, wrist, sleeve visible. The notebook shows handwritten text — crossed-out lines, arrows, annotations in the margins — blurred just enough to suggest lyrics without being readable. Ink stains on the fingers, the pen pressing into the page. This is where the songs start. 100mm macro lens, f/2.8, shallow depth of field, warm desk lamp lighting.`
      ),
    },
    {
      id: 'couch-session',
      label: 'Couch Session',
      description: 'On a couch, notebook on knee, thinking',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on a couch in a living room, notebook balanced on one knee, pen touching their lip in thought. ${appearance(dna)}, dressed casual — home clothes. Looking up and to the side, searching for the right word. The living room tells their story — ${genreTag(dna)} records on the shelf, photos on the wall, a speaker, personal artifacts. Phone on the couch cushion, a drink on the side table. ${personality(dna)} creative contemplation. 35mm lens, lifestyle documentary, warm afternoon interior light.`
      ),
    },
    {
      id: 'studio-floor',
      label: 'Studio Floor',
      description: 'Sitting on studio floor, papers around',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting cross-legged on the floor of a recording studio, scattered papers and notebooks around them. ${appearance(dna)}, comfortable in the creative mess. Lyric sheets, some crumpled, some with scribbles, pens scattered. Leaning back against the wall or a speaker. Studio equipment visible above — monitors, cables. The floor is where the magic happens when the desk isn't enough. ${personality(dna)} deep creative mode. ${genreAesthetic(dna)}. 28mm wide angle, documentary overhead-ish angle, warm studio lighting.`
      ),
    },
    {
      id: 'late-night-desk',
      label: 'Late Night Desk',
      description: 'Late night, desk lamp, empty cups, deep focus',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at a desk late at night, single desk lamp casting a warm pool of light. ${appearance(dna)}, looking tired but locked in. Multiple empty coffee cups, crumpled paper around the desk, a laptop with a dull screen glow, the notebook front and center. The window behind shows the city at night — dark blue sky, distant lights. It's 3 AM and the verse is almost right. ${personality(dna)} dedication burning through the fatigue. 50mm lens, available light photography, the desk lamp as primary source, moody late-night intimate.`
      ),
    },
  ],
}

const everydayHangingOut: PhotoShootScene = {
  id: 'everyday-hanging-out',
  label: 'Just Hanging Out',
  description: 'Doing their thing in the neighborhood',
  category: 'everyday',
  subScenes: [
    {
      id: 'activity-from-likes',
      label: 'Doing Their Thing',
      description: 'Activity based on their interests',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => {
        const artistLikes = likes(dna)
        const activity = artistLikes.length > 0
          ? artistLikes[Math.floor(Math.random() * artistLikes.length)]
          : 'chilling on the block'
        return buildPrompt(dna, fv,
          `A ${ethnicity(dna)}${genreTag(dna)} music artist ${activity} in ${hood(dna)}, ${city(dna)}, candid environmental portrait. ${appearance(dna)}. Authentic neighborhood setting, everyday life happening around them, completely natural and unposed. Other people in the background going about their day, the texture of the neighborhood visible — buildings, signs, street furniture. Natural afternoon light, warm relaxed atmosphere. ${personality(dna)} energy but low-key, just living. ${genreAesthetic(dna)}. 35mm lens, street photography, documentary candid.`
        )
      },
    },
    {
      id: 'porch-stoop',
      label: 'Porch / Stoop',
      description: 'On a porch or stoop, neighbors around',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting on a porch or stoop in ${hood(dna)}, ${city(dna)}, afternoon. ${appearance(dna)}. Neighbors passing by, maybe someone else sitting on the next stoop, kids playing down the street. A cooler or drinks nearby, music playing from a portable speaker. The front steps that hold a thousand conversations. Relaxed, feet on the lower step, watching the neighborhood move. ${personality(dna)} at home. ${genreAesthetic(dna)}. 35mm lens, warm afternoon light, neighborhood documentary.`
      ),
    },
    {
      id: 'park-bench',
      label: 'Park Bench',
      description: 'Park bench, peaceful, relaxing',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist sitting on a park bench in a neighborhood park near ${hood(dna)}, ${city(dna)}. ${appearance(dna)}. Peaceful moment — leaning back, arm over the bench back, watching people walk dogs or kids playing basketball in the distance. Trees overhead dappling the sunlight, worn park path, pigeons nearby. The quiet version of the artist, no stage, no studio. ${personality(dna)} serenity. 50mm lens, f/2.0, beautiful natural light through leaves, peaceful environmental portrait.`
      ),
    },
    {
      id: 'phone-scroll',
      label: 'Phone Scroll',
      description: 'Close-up scrolling phone, candid, absorbed',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist scrolling their phone, completely absorbed. ${appearance(dna)}. The phone screen casting a slight glow on their face, thumb mid-scroll. Expression shifting — maybe smiling at something, or furrowed brow reading comments. The background soft and blurred, could be anywhere. This is where the modern artist lives half the time — in the phone, in the comments, in the DMs. ${personality(dna)} digital life. 85mm portrait lens, f/1.4, tight crop face and phone, natural light.`
      ),
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const performanceLiveStage: PhotoShootScene = {
  id: 'performance-live-stage',
  label: 'Live on Stage',
  description: 'Commanding the crowd',
  category: 'performance',
  subScenes: [
    {
      id: 'crowd-shot',
      label: 'Crowd Shot',
      description: 'Massive crowd in foreground, artist commanding',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist performing live on a large concert stage, shot from the crowd — massive audience in the foreground as silhouettes with hands raised, phones glowing like stars. ${appearance(dna)}. The artist on stage in the mid-ground, microphone in hand, mid-performance, commanding every person in the room. Dramatic stage lighting — colored spotlights cutting through haze and smoke. LED screens flanking the stage. ${personality(dna)} peak energy. ${genreAesthetic(dna)}. 70-200mm telephoto from crowd, concert photography, fast shutter, high ISO grain.`
      ),
    },
    {
      id: 'closeup-mic',
      label: 'Close-Up Mic',
      description: 'Extreme close-up, mic to lips, sweat, emotion',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Extreme close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist's face performing, microphone pressed to their lips. ${appearance(dna)}. Sweat drops on the forehead and jawline catching the stage lights, veins in the neck from the vocal effort, eyes shut tight or locked on the crowd with raw intensity. Every pore, every bead of sweat, every emotion visible. The most honest version of the artist — in the music. ${personality(dna)} fire. 85mm portrait lens, f/1.4, extremely tight crop, concert lighting, emotional delivery captured.`
      ),
    },
    {
      id: 'side-stage',
      label: 'Side Stage',
      description: 'Side stage angle, silhouette against lights',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist performing, shot from the side of the stage — a dramatic silhouette against a wall of stage lights. ${appearance(dna)} in outline form, the powerful stance recognizable even in shadow. Cables on the stage floor, a monitor wedge in frame, a stage tech visible in the wings. The crowd beyond, a sea of raised arms and phone lights. The backstage perspective that fans never see. ${personality(dna)} command. ${genreAesthetic(dna)}. 35mm wide angle, side stage photography, dramatic silhouette.`
      ),
    },
    {
      id: 'hands-raised',
      label: 'Hands Raised',
      description: 'Artist hands raised, crowd following, peak moment',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on stage with both hands raised high above their head, and the entire crowd mirroring the gesture — thousands of hands up in unison. ${appearance(dna)}. The peak moment of the show, the drop about to hit or the chorus reaching its climax. Massive stage lighting behind them — strobes, lasers, and colored spots creating a cathedral of light. The connection between artist and crowd is electric, physical. ${personality(dna)} transcendence. ${genreAesthetic(dna)}. 24mm wide angle, capturing both artist and crowd in one epic frame.`
      ),
    },
  ],
}

const performanceInTheBooth: PhotoShootScene = {
  id: 'performance-in-the-booth',
  label: 'In the Booth',
  description: 'Recording vocals, eyes closed',
  category: 'performance',
  subScenes: [
    {
      id: 'through-glass',
      label: 'Through the Glass',
      description: 'Through vocal booth glass, recording, focused',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist visible through the vocal booth glass, recording a vocal take. ${appearance(dna)}. Professional condenser microphone with pop filter, closed-back headphones on, one hand on the headphone cup, the other gesturing with the lyrics. Studio glass creates a frame-within-a-frame, control room reflections layered on the surface. The engineer's perspective — watching the magic happen through the window. ${personality(dna)} vocal intensity. ${genreAesthetic(dna)}. 85mm lens, shot through glass, studio documentary.`
      ),
    },
    {
      id: 'eyes-closed',
      label: 'Eyes Closed',
      description: 'Eyes closed, feeling the lyrics, emotional take',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the vocal booth, eyes closed, completely lost in the emotional delivery of a verse. ${appearance(dna)}. Close-up portrait, microphone slightly to one side, headphones on, face showing raw emotion — maybe pain, maybe joy, maybe both. The soundproofing panels visible behind them, warm booth lighting creating an intimate cocoon. This is the take that ends up on the album. ${personality(dna)} vulnerability channeled through music. 85mm portrait lens, f/1.4, warm intimate lighting, emotional close-up.`
      ),
    },
    {
      id: 'headphones-adjust',
      label: 'Headphones Adjust',
      description: 'Adjusting headphones, about to start a take',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the vocal booth adjusting their headphones, about to start a take. ${appearance(dna)}. One hand on the headphone cup pressing it to the ear, the other hand free, body posture shifting into performance mode. The microphone waiting in front of them, pop filter between artist and mic. Eyes looking down at the lyrics or up at the booth window. The "here we go" moment. ${personality(dna)} focus building. 50mm lens, available studio light, the anticipation captured.`
      ),
    },
    {
      id: 'lyrics-sheet',
      label: 'Lyrics Sheet',
      description: 'Looking at lyrics sheet on music stand',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the vocal booth looking at a lyrics sheet on a music stand, preparing for a take. ${appearance(dna)}. The lyrics visible but slightly blurred — handwritten annotations, highlighted sections, cross-outs. One hand touching the page, head tilted reading. Microphone and headphones ready. The process behind the product — studying the words before giving them life. ${personality(dna)} preparation. ${genreAesthetic(dna)}. 35mm lens, environmental booth portrait, warm lighting on the lyrics page.`
      ),
    },
  ],
}

const performanceFestival: PhotoShootScene = {
  id: 'performance-festival',
  label: 'Festival Shot',
  description: 'Outdoor festival, crowd energy',
  category: 'performance',
  subScenes: [
    {
      id: 'main-stage-wide',
      label: 'Main Stage Wide',
      description: 'Wide shot of huge outdoor festival stage',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist on a massive outdoor festival main stage, ultra-wide shot showing the full scale. ${appearance(dna)}. Huge LED screens flanking the stage showing their close-up, massive speaker arrays stacked high, festival crowd stretching back for hundreds of yards — a sea of people under open sky. Flags, totems, tents in the far distance. The scale is the story — one person commanding fifty thousand. ${personality(dna)} festival dominance. ${genreAesthetic(dna)}. 16mm ultra-wide angle, festival documentary, vibrant saturated.`
      ),
    },
    {
      id: 'crowd-surf',
      label: 'Crowd Surf',
      description: 'Crowd surfing or reaching into the crowd',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist at a festival, leaning off the stage reaching into the crowd or crowd surfing over raised hands. ${appearance(dna)}. Extreme energy — faces screaming below, hands reaching up, security guards bracing. Sweat and mist in the air catching colored stage lights. The barrier between artist and audience dissolving into pure chaos and joy. ${personality(dna)} reckless energy. ${genreAesthetic(dna)}. 24mm wide angle, fast shutter, chaotic concert photography, maximum energy.`
      ),
    },
    {
      id: 'backstage-tent',
      label: 'Backstage Tent',
      description: 'Backstage tent area, relaxed, other artists',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a festival backstage tent area, relaxed between sets. ${appearance(dna)}, festival lanyard and backstage pass visible. Folding chairs, catering table, other artists and crew members in the background chatting. Festival wristbands on their arm. The distant sound of another act performing, muffled bass through the tent walls. Cool shade after the hot stage. ${personality(dna)} relaxed social energy. 35mm lens, backstage documentary photography, dappled tent light.`
      ),
    },
    {
      id: 'artist-tent',
      label: 'Artist Tent',
      description: 'Candid in artist tent, reviewing setlist',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in the artist tent at a festival, reviewing a setlist on paper or phone, the calm before the storm. ${appearance(dna)}. Sitting in a folding chair or on a equipment case, focused inward while chaos moves around them. A water bottle, a towel, maybe stretching or doing a vocal warm-up. Festival sounds filtering in. The private moment of preparation that no fan sees. ${personality(dna)} quiet intensity. 50mm portrait lens, f/2.0, candid backstage intimate moment.`
      ),
    },
  ],
}

const performanceMusicVideo: PhotoShootScene = {
  id: 'performance-music-video',
  label: 'Music Video Moment',
  description: 'Cinematic hero shot',
  category: 'performance',
  subScenes: [
    {
      id: 'hero-shot',
      label: 'Hero Shot',
      description: 'Cinematic hero shot, art-directed, dramatic',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a cinematic music video hero shot — fully art-directed, dramatic backdrop designed around their ${genreTag(dna)} aesthetic. ${appearance(dna)}. Anamorphic lens flare from a practical light, 2.39:1 cinematic feel within the frame. Atmospheric smoke and carefully placed colored lighting gels. Power pose — this is the shot that opens the video, the one on the thumbnail. Everything in frame is intentional and epic. ${personality(dna)} persona at maximum. ${genreAesthetic(dna)}. 40mm anamorphic, shallow DOF, film grain, music video production.`
      ),
    },
    {
      id: 'walking-scene',
      label: 'Walking Scene',
      description: 'Walking down a road, slow-motion feel, cinematic',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist walking down a long empty road or corridor, cinematic music video walking shot — slow-motion feel. ${appearance(dna)}. Shot from slightly ahead, tracking backward as they walk toward camera. Every step deliberate, clothes moving with the stride, the background sliding past. Could be a desert highway, a city alley, a warehouse corridor. Cinematic lighting, art-directed environment. ${personality(dna)} cinematic presence. ${genreAesthetic(dna)}. Steadicam tracking, 50mm anamorphic, shallow depth of field, 24fps motion cadence.`
      ),
    },
    {
      id: 'car-scene',
      label: 'Car Scene',
      description: 'In or on a car, luxury or convertible, cinematic',
      aspectRatio: '16:9',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `A ${ethnicity(dna)}${genreTag(dna)} music artist in a cinematic music video car scene — riding in a convertible or luxury vehicle, wind in their hair, city or landscape scrolling past. ${appearance(dna)}. The camera mounted on the car or tracking alongside, cinematic movement and blur. One hand on the wheel or arm hanging out the window. Sunset or magic hour light painting everything gold. The classic music video driving shot — freedom, power, motion. ${personality(dna)} liberated energy. ${genreAesthetic(dna)}. Gimbal-mounted car rig, 35mm lens, cinematic motion blur.`
      ),
    },
    {
      id: 'dramatic-closeup',
      label: 'Dramatic Close-Up',
      description: 'Extreme close-up face, emotional, cinematic grading',
      aspectRatio: '1:1',
      fields: [...STANDARD_FIELDS],
      buildPrompt: (dna, fv) => buildPrompt(dna, fv,
        `Extreme close-up of a ${ethnicity(dna)}${genreTag(dna)} music artist's face for a cinematic music video, raw emotional intensity. ${appearance(dna)}. Every pore, every eyelash, every scar visible in hyper-detail. Cinematic color grading pushed to the extreme — teal shadows, warm highlights, filmic grain. Eyes telling a story — could be defiance, heartbreak, rage, or triumph. A single tear, or a clenched jaw, or the smallest smile. ${personality(dna)} distilled into one frame. 100mm macro anamorphic, extreme close-up, cinematic grading, film grain, 2K+ resolution detail.`
      ),
    },
  ],
}

// =============================================================================
// PUBLIC API
// =============================================================================

export const PHOTO_SHOOT_SCENES: PhotoShootScene[] = [
  // Wardrobe
  wardrobeStreetwear,
  wardrobeStageFit,
  wardrobeStudioCasual,
  wardrobePress,
  // Locations
  locationTheBlock,
  locationRooftop,
  locationRecordingStudio,
  locationNightCity,
  // Social Media
  socialMirrorSelfie,
  socialCarSelfie,
  socialCelebrating,
  socialFoodSpot,
  // Everyday Life
  everydayBarbershop,
  everydayCornerStore,
  everydayMorningCoffee,
  everydayWorkingOut,
  everydayWritingLyrics,
  everydayHangingOut,
  // Performance
  performanceLiveStage,
  performanceInTheBooth,
  performanceFestival,
  performanceMusicVideo,
]

export const PHOTO_SHOOT_CATEGORIES: PhotoShootCategoryInfo[] = [
  { id: 'wardrobe', label: 'Wardrobe', icon: '👔' },
  { id: 'location', label: 'Locations', icon: '📍' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'everyday', label: 'Everyday Life', icon: '☕' },
  { id: 'performance', label: 'Performance', icon: '🎤' },
]

export function getScenesByCategory(category: PhotoShootCategory): PhotoShootScene[] {
  return PHOTO_SHOOT_SCENES.filter(s => s.category === category)
}

export function buildSubScenePrompt(
  sceneId: string,
  subSceneId: string,
  dna: ArtistDNA,
  fieldValues: Record<string, string>
): { prompt: string; aspectRatio: string } | null {
  const scene = PHOTO_SHOOT_SCENES.find(s => s.id === sceneId)
  if (!scene) return null
  const sub = scene.subScenes.find(s => s.id === subSceneId)
  if (!sub) return null
  return {
    prompt: sub.buildPrompt(dna, fieldValues),
    aspectRatio: sub.aspectRatio,
  }
}

// Keep legacy function for backwards compat with API route
export function buildPhotoShootPrompt(_sceneId: string, _dna: ArtistDNA): { prompt: string; aspectRatio: string } | null {
  // Legacy scenes won't exist in new structure, but keep for API backwards compat
  return null
}
