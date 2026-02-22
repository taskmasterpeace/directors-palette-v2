/**
 * Artist DNA Generate Mix API
 * Generates lyrics template via LLM from ArtistDNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'moonshotai/kimi-k2.5'

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

function buildSystemPrompt(dna: ArtistDNA): string {
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push('Generate a lyrics template that matches this artist\'s DNA exactly.')
  parts.push('Return ONLY the lyrics text with section headers like [Verse 1], [Chorus], etc.')

  // Identity context
  if (dna.identity.name) {
    parts.push(`Writing for: ${dna.identity.name}`)
  }
  if (dna.identity.city || dna.identity.region) {
    parts.push(`From: ${[dna.identity.city, dna.identity.region].filter(Boolean).join(', ')}`)
  }
  if (dna.identity.ethnicity) {
    parts.push(`Background: ${dna.identity.ethnicity}`)
  }
  if (dna.identity.backstory) {
    parts.push(`Backstory: ${dna.identity.backstory.substring(0, 400)}`)
  }
  if (dna.identity.significantEvents?.length > 0) {
    parts.push(`Life events to draw from: ${dna.identity.significantEvents.join(', ')}`)
  }

  // Sound context
  if (dna.sound.melodyBias <= 30) {
    parts.push('This is primarily a rap/spoken-word track. Focus on lyrical density, multisyllabic rhymes, and wordplay.')
  } else if (dna.sound.melodyBias >= 70) {
    parts.push('This is primarily a sung track. Focus on melodic phrasing, vocal hooks, and singable melodies.')
  } else {
    parts.push('This blends rapping and singing. Alternate between lyrical sections and melodic hooks.')
  }

  if (dna.sound.genres?.length > 0) {
    parts.push(`Genres: ${dna.sound.genres.join(', ')}`)
  }
  if (dna.sound.subgenres?.length > 0) {
    parts.push(`Sub-genres: ${dna.sound.subgenres.join(', ')}`)
  }
  if (dna.sound.productionPreferences.length > 0) {
    parts.push(`Production style: ${dna.sound.productionPreferences.join(', ')}`)
  }
  if (dna.sound.artistInfluences.length > 0) {
    parts.push(`Influenced by: ${dna.sound.artistInfluences.join(', ')}. Channel their energy without copying.`)
  }
  if (dna.sound.vocalTextures?.length > 0) {
    parts.push(`Vocal texture: ${dna.sound.vocalTextures.join(', ')}`)
  }
  if (dna.sound.soundDescription) {
    parts.push(`Sound description: ${dna.sound.soundDescription}`)
  }

  // Lexicon rules
  if (dna.lexicon.signaturePhrases.length > 0) {
    parts.push(`Incorporate signature phrases naturally: ${dna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (dna.lexicon.slang.length > 0) {
    parts.push(`Use slang: ${dna.lexicon.slang.join(', ')}`)
  }
  if (dna.lexicon.bannedWords.length > 0) {
    parts.push(`NEVER use these words: ${dna.lexicon.bannedWords.join(', ')}`)
  }
  if (dna.lexicon.adLibs.length > 0) {
    parts.push(`Include ad-libs: ${dna.lexicon.adLibs.join(', ')}`)
  }

  // Persona
  if (dna.persona.attitude) {
    parts.push(`Attitude/tone: ${dna.persona.attitude}`)
  }
  if (dna.persona.worldview) {
    parts.push(`Worldview: ${dna.persona.worldview}`)
  }
  if (dna.persona.traits.length > 0) {
    parts.push(`Key traits: ${dna.persona.traits.join(', ')}`)
  }
  if (dna.persona.likes?.length > 0) {
    parts.push(`Themes they love: ${dna.persona.likes.join(', ')}`)
  }
  if (dna.persona.dislikes?.length > 0) {
    parts.push(`Themes they avoid: ${dna.persona.dislikes.join(', ')}`)
  }

  // Discography/catalog — learn from existing songs
  if (dna.catalog.entries.length > 0) {
    parts.push(`\nDISCOGRAPHY (${dna.catalog.entries.length} existing songs):`)
    dna.catalog.entries.forEach((entry) => {
      const meta = [entry.mood, entry.tempo].filter(Boolean).join(', ')
      parts.push(`  "${entry.title}"${meta ? ` — ${meta}` : ''}`)
      if (entry.lyrics) {
        // Include up to 200 chars of lyrics for style reference
        parts.push(`    Lyrics excerpt: ${entry.lyrics.substring(0, 200)}`)
      }
    })
    parts.push('Study these songs for patterns: rhyme schemes, vocabulary, storytelling approach.')
    parts.push('The new song should feel like it belongs in this catalog but covers NEW ground.')
  }

  // Banned AI phrases
  parts.push(`NEVER use these overused AI words: ${BANNED_AI_PHRASES.join(', ')}`)

  // Human-voice directive
  parts.push('Use concrete, specific imagery. Reference real places, objects, and sensations.')
  parts.push('Write like a human songwriter, not an AI. No purple prose.')
  parts.push('Vary rhyme schemes across sections (AABB, ABAB, ABCB). Make rhymes feel natural, not forced.')

  // Section structure
  parts.push('Structure: 2 verses (8-16 bars each), 1 chorus (4-8 bars), 1 bridge (4 bars).')
  parts.push('Keep total lyrics under 3000 characters (Suno limit).')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { dna } = await request.json() as { dna: ArtistDNA }

    if (!dna) {
      return NextResponse.json({ error: 'dna is required' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(dna)
    const artistName = dna.identity.name || 'this artist'
    const genre = dna.sound.genres[0] || 'music'
    const city = dna.identity.city || 'the city'
    const influences = dna.sound.artistInfluences.length > 0
      ? ` Their sound channels ${dna.sound.artistInfluences.slice(0, 3).join(', ')}.`
      : ''

    const userPrompt = `Write a lyrics template for ${artistName}, a ${genre} artist from ${city}.${influences} The song should reflect their persona and storytelling style.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Mix Generation",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Mix generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    let lyricsTemplate = message?.content || ''
    // Kimi K2.5 reasoning model fallback
    if (!lyricsTemplate.trim() && message?.reasoning) {
      // Extract anything that looks like lyrics from reasoning
      const lines = (message.reasoning as string).split('\n')
      const lyricsLines = lines.filter((l: string) => l.startsWith('[') || (l.trim().length > 0 && !l.startsWith(' ')))
      if (lyricsLines.length > 4) {
        lyricsTemplate = lyricsLines.join('\n')
      }
    }

    return NextResponse.json({ lyricsTemplate })
  } catch (error) {
    console.error('Mix generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
