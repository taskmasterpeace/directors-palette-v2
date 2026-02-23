/**
 * Artist DNA Seed API
 * Takes a real artist name and returns a pre-filled ArtistDNA profile
 * based on public knowledge of that artist.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const MODEL = 'openai/gpt-4.1-mini'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistName } = await request.json()

    if (!artistName?.trim()) {
      return NextResponse.json({ error: 'artistName is required' }, { status: 400 })
    }

    const systemPrompt = `You are a deeply knowledgeable music industry expert and biographer. Given a real artist name, create an exhaustive artist DNA profile. Fill every field with rich, specific, authentic details.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "their stage/performer name",
    "realName": "birth/legal name (research this — most artists' real names are publicly known)",
    "ethnicity": "specific ethnic background (e.g. 'African American', 'Puerto Rican', 'Korean American')",
    "city": "city they grew up in or are most associated with",
    "region": "state/province and country (e.g. 'California, USA')",
    "backstory": "3-4 sentence origin story covering childhood, how they got into music, and their breakthrough moment",
    "significantEvents": ["5-7 real career milestones — debut album, awards, controversies, collaborations, cultural moments"]
  },
  "sound": {
    "genres": ["2-3 primary genres"],
    "subgenres": ["3-4 specific subgenres they operate in"],
    "microgenres": ["1-2 niche microgenres if applicable, empty array if mainstream"],
    "vocalTextures": ["4-5 descriptive vocal qualities, 1-3 words each (e.g. 'raspy baritone', 'airy falsetto', 'nasal drawl')"],
    "productionPreferences": ["4-5 production styles/techniques they favor (e.g. 'minimalist 808s', 'live instrumentation', 'jazz samples')"],
    "artistInfluences": ["5-6 real artists they've cited as influences or are commonly compared to"],
    "melodyBias": 50,
    "language": "primary language they perform in",
    "secondaryLanguages": ["any other languages they use in music"],
    "soundDescription": "3-4 sentences painting a vivid picture of their sonic identity — what does their music FEEL like?"
  },
  "persona": {
    "traits": ["5-6 personality traits, 1-2 words each"],
    "likes": ["4-5 things they're passionate about, known interests"],
    "dislikes": ["3-4 things they publicly oppose or avoid"],
    "attitude": "6-10 word encapsulation of their energy/demeanor",
    "worldview": "3-4 sentences about their philosophy, what they stand for, recurring themes in their work"
  },
  "lexicon": {
    "signaturePhrases": ["4-6 actual catchphrases, mottos, or recurring lines from their music/interviews"],
    "slang": ["4-6 slang terms, regional expressions, or invented words they use"],
    "bannedWords": [],
    "adLibs": ["3-5 actual vocal ad-libs they're known for (e.g. 'YUGH', 'It's lit!', 'Skrrt')"]
  },
  "look": {
    "skinTone": "descriptive skin tone (2-4 words, e.g. 'deep mahogany', 'warm olive')",
    "hairStyle": "signature hairstyle description (4-8 words)",
    "fashionStyle": "fashion aesthetic in 5-10 words",
    "jewelry": "signature jewelry/accessories (4-8 words, or 'minimal' if applicable)",
    "tattoos": "notable tattoos and placements (5-10 words, or 'none known')",
    "visualDescription": "3-4 sentences describing their overall visual presence, stage presence, and iconic imagery",
    "portraitUrl": "",
    "characterSheetUrl": ""
  },
  "catalog": {
    "entries": []
  }
}

CRITICAL GUIDELINES:
- melodyBias: 0 = pure rap, 100 = pure singing, 50 = balanced. Be precise — a rapper who sometimes sings hooks might be 25, a pop singer who occasionally raps might be 80.
- USE REAL, VERIFIABLE DETAILS. Real birth names, real cities, real events, real ad-libs, real influences.
- For significantEvents: use actual milestones with enough detail to be recognizable (e.g. "Released debut 'Illmatic' to critical acclaim (1994)" not just "released first album").
- For signaturePhrases/slang/adLibs: use ACTUAL phrases the artist is known for. These are signature identifiers.
- For artistInfluences: prefer artists they've actually named in interviews. Supplement with clear stylistic predecessors.
- For vocalTextures: be evocative and specific. "Smooth R&B tenor with gritty edges" not just "good singer".
- For soundDescription: paint a picture. Reference specific sonic elements, moods, and production signatures.
- Leave portraitUrl and characterSheetUrl as empty strings always.
- Leave catalog entries as empty array always.
- Leave bannedWords as empty array (user will set their own).
- If the artist name is unrecognized, still return valid JSON but set stageName to the input name, leave realName empty, and fill other fields with reasonable genre-appropriate defaults based on any context clues in the name.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Seed",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a full artist DNA profile for: ${artistName.trim()}` },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Failed to generate artist profile' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content.trim()) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 500 })
    }

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const dna = JSON.parse(cleaned)

      // Ensure all required fields exist with defaults
      if (!dna.identity) dna.identity = {}
      if (!dna.sound) dna.sound = {}
      if (!dna.persona) dna.persona = {}
      if (!dna.lexicon) dna.lexicon = {}
      if (!dna.look) dna.look = {}
      if (!dna.catalog) dna.catalog = { entries: [] }

      // Ensure stageName is set even if LLM left it empty
      if (!dna.identity.stageName) {
        dna.identity.stageName = artistName.trim()
      }

      return NextResponse.json({ dna, seededFrom: artistName.trim() })
    } catch {
      console.error('Failed to parse seed DNA:', content.substring(0, 500))
      return NextResponse.json({ error: 'Failed to parse artist profile' }, { status: 500 })
    }
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
