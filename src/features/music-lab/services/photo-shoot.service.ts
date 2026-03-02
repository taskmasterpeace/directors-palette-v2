/**
 * Photo Shoot Prompt Builder
 * Builds rich, dynamic prompts from the full artist DNA.
 * Every field matters — genre sets the aesthetic, personality sets the energy,
 * neighborhood sets the location, likes set the activities.
 */

import type { ArtistDNA } from '../types/artist-dna.types'

export type PhotoShootCategory = 'wardrobe' | 'location' | 'social' | 'performance' | 'everyday'

export interface PhotoShootScene {
  id: string
  label: string
  description: string
  category: PhotoShootCategory
  aspectRatio: '16:9' | '9:16' | '1:1'
  buildPrompt: (dna: ArtistDNA) => string
}

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
// SCENES — organized by category, each one pulls from full DNA
// =============================================================================

export const PHOTO_SHOOT_SCENES: PhotoShootScene[] = [

  // =========================================================================
  // WARDROBE / OUTFITS
  // =========================================================================
  {
    id: 'wardrobe-streetwear',
    label: 'Streetwear Look',
    description: 'Fashion editorial on the block',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist, full-body fashion editorial shot standing on a street corner in ${location(dna)}. ${appearance(dna)}. Streetwear outfit matching their ${genreTag(dna)} aesthetic. Urban backdrop — graffiti walls, parked cars, fire hydrants. The subject carries themselves with ${personality(dna)} energy. ${genreAesthetic(dna)}. ${genreCamera(dna)}. Sharp focus, high detail. Realistic photograph, NOT illustration, NOT cartoon, NOT AI-looking.`,
  },
  {
    id: 'wardrobe-stage-fit',
    label: 'Stage Outfit',
    description: 'Concert-ready under dramatic lights',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist in a bold stage performance outfit, full-body shot under dramatic concert lighting. ${appearance(dna)}. Standing on a dark stage with colored spotlights and backlight creating rim lighting, smoke machine haze rolling across the floor. Dynamic confident pose matching their ${personality(dna)} persona. ${genreAesthetic(dna)}. 50mm lens, concert photography, high detail, sharp focus. Realistic photograph.`,
  },
  {
    id: 'wardrobe-studio-casual',
    label: 'Studio Casual',
    description: 'Relaxed in the recording studio',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist in casual studio attire, leaning against a recording studio wall in ${city(dna)}. ${appearance(dna)}. Relaxed pose, headphones around neck, cup of coffee nearby. Warm interior lighting from studio monitors, soundproofing foam panels visible. Comfortable and creative energy, ${personality(dna)} vibe. 35mm lens, shallow depth of field, warm color temperature. Realistic photograph.`,
  },
  {
    id: 'wardrobe-press',
    label: 'Press / Cover Shot',
    description: 'Magazine-ready editorial portrait',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist, three-quarter body magazine cover portrait. ${appearance(dna)}. Styled sharp for a major publication shoot. Clean studio backdrop with dramatic single-source lighting creating bold shadows. Direct eye contact with camera, ${personality(dna)} energy radiating. 85mm portrait lens, f/2.0, fashion editorial photography, Vogue/GQ quality. ${genreAesthetic(dna)}. Realistic photograph.`,
  },

  // =========================================================================
  // LOCATIONS
  // =========================================================================
  {
    id: 'location-the-block',
    label: 'The Block',
    description: `Walking through the neighborhood`,
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist walking through ${hood(dna)} in ${city(dna)}, wide environmental portrait. ${appearance(dna)}. Authentic street scene — local corner stores, brownstones or row houses, people going about their day in the background. Golden hour sunlight casting long warm shadows. The artist looks comfortable and at home, ${personality(dna)} demeanor. 28mm wide angle, street photography, documentary feel. ${genreAesthetic(dna)}. Realistic photograph.`,
  },
  {
    id: 'location-rooftop',
    label: 'Rooftop at Sunset',
    description: 'City skyline backdrop, golden hour',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist standing on a city rooftop at golden hour, ${city(dna)} skyline stretching behind them. ${appearance(dna)}. Warm golden sunlight backlighting the subject with lens flare, buildings silhouetted against an orange and purple sky. Confident stance at the edge, overlooking their city. ${genreAesthetic(dna)}. 35mm lens, shallow depth of field, warm editorial color grading. Realistic photograph.`,
  },
  {
    id: 'location-recording-studio',
    label: 'Recording Studio',
    description: 'At the mixing console',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist in a professional recording studio, seated at a large mixing console with dozens of faders. ${appearance(dna)}. Studio monitors glowing, vocal booth visible through glass behind them. Warm low amber lighting with LED accent strips. Focused expression, reviewing a mix. Multiple screens showing audio waveforms. ${genreCamera(dna)}, warm tones, music industry documentary style. Realistic photograph.`,
  },
  {
    id: 'location-night-city',
    label: 'City at Night',
    description: 'Neon lights and wet streets',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist standing under neon signs on a busy street at night in ${city(dna)}. ${appearance(dna)}. Neon reflections on wet pavement creating mirror pools of color, bokeh city lights in background, car headlights streaking past. Moody cinematic atmosphere. ${genreAesthetic(dna)}. 50mm lens, f/1.8 wide open, cinematic night photography. Realistic photograph.`,
  },

  // =========================================================================
  // SOCIAL MEDIA
  // =========================================================================
  {
    id: 'social-mirror-selfie',
    label: 'Mirror Selfie',
    description: 'Candid bedroom mirror shot',
    category: 'social',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist taking a mirror selfie in a stylish bedroom, smartphone held up. ${appearance(dna)}. Modern bedroom reflecting their ${genreTag(dna)} aesthetic — LED strip lights, posters on wall, sneaker collection or records visible. Smartphone rear camera via mirror, natural deep depth of field, 26mm equivalent. Casual confident pose, ${personality(dna)} energy. Natural window lighting. Instagram-style candid. Realistic photograph, NOT illustration.`,
  },
  {
    id: 'social-car-selfie',
    label: 'Car Selfie',
    description: 'Behind the wheel, casual vibes',
    category: 'social',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist in the driver seat of a car, candid selfie angle from slightly above. ${appearance(dna)}. Car interior visible, sunglasses on or pushed up. Natural sunlight through windshield creating warm fill light. ${personality(dna)} expression — not posed, just vibing. Smartphone front camera, 24mm equivalent, casual candid energy. Realistic photograph.`,
  },
  {
    id: 'social-celebrating',
    label: 'Celebrating with Friends',
    description: 'Night out with the squad',
    category: 'social',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist celebrating with friends at a lounge in ${city(dna)}, candid group photo. The artist in center, ${appearance(dna)}. Friends laughing, toasting drinks. VIP section with bottle service, ambient colored lighting. Flash photography giving authentic party feel, slightly overexposed highlights. Real candid nightlife energy, ${personality(dna)} vibe. Realistic photograph.`,
  },
  {
    id: 'social-food-spot',
    label: 'At the Food Spot',
    description: 'Local restaurant, keeping it real',
    category: 'social',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist at a local restaurant in ${hood(dna)}, ${city(dna)}, candid dining photo. ${appearance(dna)}. Food on the table, relaxed expression, looking at camera mid-conversation. Warm interior lighting, bokeh background with other diners. Neighborhood spot — not fancy, just real. 35mm lens, warm tones, social media candid style. Realistic photograph.`,
  },

  // =========================================================================
  // EVERYDAY LIFE — real stuff, not just promo
  // =========================================================================
  {
    id: 'everyday-barbershop',
    label: 'At the Barbershop',
    description: 'Getting a fresh cut',
    category: 'everyday',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist sitting in a barber chair getting a fresh haircut at a local barbershop in ${hood(dna)}. ${appearance(dna)}. Classic barbershop interior — mirrors, clippers, barber supplies, other customers waiting. The barber working on their hair. Relaxed expression, scrolling phone. Warm fluorescent interior lighting, authentic everyday moment. 35mm documentary photography, candid and real. Realistic photograph.`,
  },
  {
    id: 'everyday-corner-store',
    label: 'Corner Store Run',
    description: 'Quick stop at the bodega',
    category: 'everyday',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist stepping out of a corner store / bodega in ${hood(dna)}, ${city(dna)}, carrying a plastic bag and a drink. ${appearance(dna)}. Authentic neighborhood storefront with hand-painted signs, produce displays, lottery sign in window. Casual everyday moment — just running errands. Natural daylight, ${personality(dna)} walk. 35mm street photography, candid documentary feel. ${genreAesthetic(dna)}. Realistic photograph.`,
  },
  {
    id: 'everyday-morning-coffee',
    label: 'Morning Coffee',
    description: 'Starting the day, no filter',
    category: 'everyday',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist sitting by a window in the morning holding a cup of coffee, candid portrait. ${appearance(dna)} but dressed down — comfortable morning clothes. Soft morning window light illuminating their face, slightly sleepy but content expression. ${city(dna)} visible through the window. Intimate quiet moment before the day starts. 50mm lens, f/1.8, soft natural light, warm tones. Realistic photograph.`,
  },
  {
    id: 'everyday-working-out',
    label: 'Working Out',
    description: 'At the gym, staying disciplined',
    category: 'everyday',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist working out at a gym, mid-exercise with focused intensity. ${appearance(dna)} in athletic wear, wireless earbuds in. Gym environment with weights, mirrors, other people in background. Sweat visible, determined expression showing ${personality(dna)} discipline. Overhead fluorescent gym lighting with warm fill. 35mm lens, action photography, sharp focus. Realistic photograph.`,
  },
  {
    id: 'everyday-writing-lyrics',
    label: 'Writing Lyrics',
    description: 'Notebook out, crafting bars',
    category: 'everyday',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist sitting on a couch writing in a notebook, pen in hand, deep in thought. ${appearance(dna)} dressed casual. Living room or bedroom setting with personal touches — records on the wall, speakers, a laptop open nearby. Concentrated creative expression, ${personality(dna)} focus. Warm interior lamp lighting, evening atmosphere. ${genreCamera(dna)}, intimate documentary style. Realistic photograph.`,
  },
  {
    id: 'everyday-hanging-out',
    label: 'Just Hanging Out',
    description: 'Doing their thing in the neighborhood',
    category: 'everyday',
    aspectRatio: '16:9',
    buildPrompt: (dna) => {
      const artistLikes = likes(dna)
      const activity = artistLikes.length > 0
        ? `enjoying ${artistLikes[Math.floor(Math.random() * artistLikes.length)]}`
        : 'hanging out on the stoop'
      return `A ${ethnicity(dna)}music artist ${activity} in ${hood(dna)}, ${city(dna)}, candid environmental portrait. ${appearance(dna)}. Authentic neighborhood setting, everyday life, not posed. Other people and street life in the background. Natural afternoon light, warm relaxed atmosphere. ${personality(dna)} energy but low-key. 35mm street photography, documentary candid. ${genreAesthetic(dna)}. Realistic photograph.`
    },
  },

  // =========================================================================
  // PERFORMANCE
  // =========================================================================
  {
    id: 'performance-live-stage',
    label: 'Live on Stage',
    description: 'Commanding the crowd',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist performing live on a large concert stage, massive crowd visible as silhouettes with hands raised in foreground. ${appearance(dna)}. Holding microphone, dynamic mid-performance pose, mouth open mid-lyric. Dramatic stage lighting — colored spotlights cutting through haze, ${genreAesthetic(dna)}. Pyro or LED screens in background. 70-200mm telephoto, concert photography, fast shutter freezing the motion, slight high-ISO grain. Realistic photograph.`,
  },
  {
    id: 'performance-in-the-booth',
    label: 'In the Booth',
    description: 'Recording vocals, eyes closed',
    category: 'performance',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${ethnicity(dna)}music artist recording vocals in an isolated vocal booth, shot through the studio glass. ${appearance(dna)}. Professional condenser microphone with pop filter, closed-back headphones on, eyes closed, emotionally invested in the take. Warm booth lighting, soundproofing panels visible. 85mm portrait lens through studio window, shallow DOF, intimate moment captured. Realistic photograph.`,
  },
  {
    id: 'performance-festival',
    label: 'Festival Shot',
    description: 'Outdoor festival, crowd energy',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist on an outdoor festival stage, wide shot from crowd perspective. ${appearance(dna)}. Massive outdoor stage, huge crowd with hands up, water cannons spraying mist catching colorful stage lights. Palm trees or open sky in background. Peak energy moment, commanding the festival. ${genreAesthetic(dna)}. 35mm wide angle, festival photography, vibrant saturated. Realistic photograph.`,
  },
  {
    id: 'performance-music-video',
    label: 'Music Video Moment',
    description: 'Cinematic hero shot',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${ethnicity(dna)}${genreTag(dna)} music artist in a cinematic music video shot, art-directed pose against a dramatic backdrop. ${appearance(dna)}. 2.39:1 cinematic framing feel, anamorphic lens with horizontal flare from a practical light. Atmospheric smoke and colored lighting gels. Environment designed around their ${genreTag(dna)} aesthetic and ${personality(dna)} persona. 40mm anamorphic, shallow DOF, film grain, music video production photography. ${genreAesthetic(dna)}. Realistic photograph.`,
  },
]

// =============================================================================
// PUBLIC API
// =============================================================================

export function getScenesByCategory(category: PhotoShootCategory): PhotoShootScene[] {
  return PHOTO_SHOOT_SCENES.filter(s => s.category === category)
}

const IDENTITY_LOCK_PREFIX = 'EXACT SAME PERSON as the reference image. Maintain identical: face structure, skin tone, body type, tattoo placement, hair style, all distinguishing features. '

export function buildPhotoShootPrompt(sceneId: string, dna: ArtistDNA): { prompt: string; aspectRatio: string } | null {
  const scene = PHOTO_SHOOT_SCENES.find(s => s.id === sceneId)
  if (!scene) return null
  return {
    prompt: IDENTITY_LOCK_PREFIX + scene.buildPrompt(dna),
    aspectRatio: scene.aspectRatio,
  }
}

export const PHOTO_SHOOT_CATEGORIES: { id: PhotoShootCategory; label: string; icon: string }[] = [
  { id: 'wardrobe', label: 'Wardrobe', icon: '👔' },
  { id: 'location', label: 'Locations', icon: '📍' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'everyday', label: 'Everyday Life', icon: '☕' },
  { id: 'performance', label: 'Performance', icon: '🎤' },
]
