/**
 * Artist DNA Generate Header Background API
 * Generates an atmospheric environment image via nano-banana-2 based on artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'
import { creditsService } from '@/features/credits/services/credits.service'
import { persistToLibrary } from '../persist-to-library'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Genre → visual aesthetic mapping
const GENRE_AESTHETICS: Record<string, string> = {
  'hip-hop': 'urban grit, concrete textures, graffiti walls, streetlight glow',
  'rap': 'urban grit, concrete textures, graffiti walls, streetlight glow',
  'r&b': 'neon luxury, velvet textures, warm amber lighting, city nightlife',
  'rock': 'dark stage, smoke machines, guitar amp glow, raw industrial',
  'pop': 'vibrant colors, glossy surfaces, bright stadium lights, modern',
  'jazz': 'smoky lounge, warm wood tones, dim spotlight, vintage elegance',
  'soul': 'golden hour warmth, vinyl textures, intimate venue, rich tones',
  'trap': 'dark neon, purple haze, bass-heavy atmosphere, late night city',
  'country': 'dusty roads, golden fields, barn wood, sunset warmth',
  'electronic': 'laser grids, circuit board patterns, digital void, cyan glow',
  'latin': 'tropical warmth, vibrant murals, sunset colors, passionate energy',
  'reggae': 'island vibes, green and gold, beach sunset, laid-back paradise',
  'metal': 'fire and steel, dark forge, molten sparks, apocalyptic sky',
  'indie': 'lo-fi film grain, pastel walls, bedroom studio, soft natural light',
  'gospel': 'stained glass light, golden rays, cathedral interior, divine glow',
  'afrobeats': 'vibrant patterns, warm earth tones, festival energy, sunset',
}

// Attitude → mood mapping
const ATTITUDE_MOODS: Record<string, string> = {
  'aggressive': 'intense, high contrast, dramatic shadows, fiery undertones',
  'chill': 'muted tones, soft focus, hazy atmosphere, calm and serene',
  'confident': 'bold lighting, strong shadows, powerful stance atmosphere',
  'introspective': 'moody, contemplative, blue hour, solitary atmosphere',
  'playful': 'bright, colorful, dynamic, energetic pop art vibes',
  'rebellious': 'dark, defiant, underground, raw and unpolished',
  'spiritual': 'ethereal light, cosmic, transcendent, soft golden glow',
  'vulnerable': 'intimate, soft, delicate lighting, raw emotion',
  'luxurious': 'opulent, gold accents, marble textures, crystal clarity',
  'street': 'gritty, real, unfiltered, raw urban documentary feel',
}

function buildPrompt(dna: ArtistDNA): string {
  const parts: string[] = ['Atmospheric cinematic environment']

  // Location atmosphere
  const { city, neighborhood } = dna.identity
  if (city) {
    parts.push(neighborhood ? `${city} ${neighborhood}` : city)
  }

  // Genre-derived aesthetic (use first matching genre)
  const allGenres = [...dna.sound.genres, ...dna.sound.subgenres]
  for (const genre of allGenres) {
    const key = genre.toLowerCase()
    const aesthetic = GENRE_AESTHETICS[key]
    if (aesthetic) {
      parts.push(aesthetic)
      break
    }
  }

  // Mood from attitude
  if (dna.persona.attitude) {
    const key = dna.persona.attitude.toLowerCase()
    const mood = ATTITUDE_MOODS[key]
    if (mood) {
      parts.push(mood)
    } else {
      parts.push(`${dna.persona.attitude} mood`)
    }
  }

  // Worldview color
  if (dna.persona.worldview) {
    parts.push(`${dna.persona.worldview} atmosphere`)
  }

  // Fashion-derived visual cues
  if (dna.look.fashionStyle) {
    parts.push(`${dna.look.fashionStyle} aesthetic`)
  }

  // Cinematic quality suffix
  parts.push('moody lighting, wide shot, no people, no text, no faces, ambient atmosphere, film grain, cinematic, 8k')

  return parts.join(', ')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { dna } = await request.json() as { dna: ArtistDNA }
    if (!dna) {
      return NextResponse.json({ error: 'Missing dna' }, { status: 400 })
    }

    // Deduct credits (nano-banana-2 = 10 pts)
    const deductResult = await creditsService.deductCredits(auth.user.id, 'nano-banana-2', {
      generationType: 'image',
      description: 'Artist DNA: header background generation',
      overrideAmount: 10,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: deductResult.error || 'Insufficient credits' }, { status: 402 })
    }

    const prompt = buildPrompt(dna)

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input: {
        prompt,
        aspect_ratio: '21:9',
        output_format: 'jpg',
      },
    })

    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const replicateUrl = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output

      // Persist to Supabase storage (no reference library entry needed)
      const artistName = dna.identity.stageName || dna.identity.realName || 'Artist'
      const persisted = await persistToLibrary({
        imageUrl: replicateUrl,
        userId: auth.user.id,
        artistName,
        type: 'header-bg',
        aspectRatio: '21:9',
        prompt,
        addToReferenceLibrary: false,
      })

      const url = persisted?.publicUrl || replicateUrl
      return NextResponse.json({ url })
    }

    return NextResponse.json({ error: 'Header background generation failed' }, { status: 500 })
  } catch (error) {
    logger.api.error('Header background generation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
