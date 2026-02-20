/**
 * Artist DNA Generate Mix API
 * Generates lyrics template via LLM from ArtistDNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1-mini'

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

  // Flow rules
  if (dna.flow.rhymeDensity) {
    parts.push(`Rhyme density: ${dna.flow.rhymeDensity}`)
  }
  if (dna.flow.flowPatterns.length > 0) {
    parts.push(`Flow patterns: ${dna.flow.flowPatterns.join(', ')}`)
  }
  if (dna.flow.avgLineLength) {
    parts.push(`Average line length: ${dna.flow.avgLineLength}`)
  }

  // Lexicon rules
  if (dna.lexicon.signaturePhrases.length > 0) {
    parts.push(`Incorporate signature phrases: ${dna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (dna.lexicon.slang.length > 0) {
    parts.push(`Use slang: ${dna.lexicon.slang.join(', ')}`)
  }
  if (dna.lexicon.bannedWords.length > 0) {
    parts.push(`NEVER use these words: ${dna.lexicon.bannedWords.join(', ')}`)
  }
  if (dna.lexicon.vocabularyLevel) {
    parts.push(`Vocabulary level: ${dna.lexicon.vocabularyLevel}`)
  }
  if (dna.lexicon.adLibs.length > 0) {
    parts.push(`Include ad-libs: ${dna.lexicon.adLibs.join(', ')} (placement: ${dna.lexicon.adLibPlacement || 'natural'})`)
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

  // Anti-repetition from catalog
  if (dna.catalog.entries.length > 0) {
    const usedThemes = dna.catalog.entries.map((e) => e.title).join(', ')
    parts.push(`Avoid themes already used in catalog: ${usedThemes}`)
  }

  // Banned AI phrases
  parts.push(`NEVER use these overused AI words: ${BANNED_AI_PHRASES.join(', ')}`)

  // Human-voice directive
  parts.push('Use concrete imagery, varied structure, no purple prose.')
  parts.push('Write like a human songwriter, not an AI.')

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

    const userPrompt = `Write a lyrics template for ${artistName}, a ${genre} artist from ${dna.identity.city || 'the city'}. The song should reflect their persona and storytelling style.`

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
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Mix generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const lyricsTemplate = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ lyricsTemplate })
  } catch (error) {
    console.error('Mix generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
