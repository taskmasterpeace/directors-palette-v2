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

    const systemPrompt = `You are a music industry expert. Given a real artist name, create a detailed artist DNA profile based on your knowledge of that artist.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "their stage name",
    "realName": "their real/birth name if known, otherwise empty string",
    "ethnicity": "their ethnic background",
    "city": "city they're from",
    "region": "state/country",
    "backstory": "2-3 sentence origin story",
    "significantEvents": ["key career moment 1", "key career moment 2", "key career moment 3"]
  },
  "sound": {
    "genres": ["primary genre", "secondary genre"],
    "subgenres": ["subgenre1", "subgenre2"],
    "microgenres": ["microgenre if applicable"],
    "vocalTextures": ["texture1", "texture2", "texture3"],
    "productionPreferences": ["pref1", "pref2", "pref3"],
    "artistInfluences": ["influence1", "influence2", "influence3"],
    "melodyBias": 50,
    "language": "English",
    "secondaryLanguages": [],
    "soundDescription": "2-3 sentence sonic description"
  },
  "persona": {
    "traits": ["trait1", "trait2", "trait3", "trait4"],
    "likes": ["like1", "like2", "like3"],
    "dislikes": ["dislike1", "dislike2"],
    "attitude": "5-8 word attitude description",
    "worldview": "2-3 sentence worldview"
  },
  "lexicon": {
    "signaturePhrases": ["phrase1", "phrase2", "phrase3"],
    "slang": ["slang1", "slang2"],
    "bannedWords": [],
    "adLibs": ["adlib1", "adlib2"]
  },
  "look": {
    "skinTone": "descriptive skin tone",
    "hairStyle": "hair description",
    "fashionStyle": "fashion aesthetic",
    "jewelry": "jewelry/accessories",
    "tattoos": "tattoo description or 'none'",
    "visualDescription": "2-3 sentence visual presence",
    "portraitUrl": "",
    "characterSheetUrl": ""
  },
  "catalog": {
    "entries": []
  }
}

Guidelines:
- melodyBias: 0 = pure rap, 100 = pure singing. Set based on artist's actual style.
- Be specific and authentic. Use real details you know about the artist.
- For backstory, focus on their actual origin story and rise.
- For significantEvents, use real career milestones.
- For artistInfluences, list artists they've actually cited or are commonly associated with.
- For slang/adLibs, use their actual signature phrases and ad-libs.
- Leave portraitUrl and characterSheetUrl as empty strings.
- Leave catalog entries as empty array (user will add their own).
- If you don't know something, make a reasonable guess based on their genre/era rather than leaving it blank.`

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

      return NextResponse.json({ dna })
    } catch {
      console.error('Failed to parse seed DNA:', content.substring(0, 500))
      return NextResponse.json({ error: 'Failed to parse artist profile' }, { status: 500 })
    }
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
