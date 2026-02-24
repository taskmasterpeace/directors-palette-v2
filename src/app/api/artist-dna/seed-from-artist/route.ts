/**
 * Artist DNA Seed API
 * Takes a real artist name and returns a pre-filled ArtistDNA profile
 * based on public knowledge of that artist.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const MODEL = 'openai/gpt-4.1'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistName } = await request.json()

    if (!artistName?.trim()) {
      return NextResponse.json({ error: 'artistName is required' }, { status: 400 })
    }

    const systemPrompt = `You are a deeply knowledgeable music industry expert, biographer, and sonic analyst. Given a real artist name, create an exhaustive artist DNA profile. Fill every field with rich, specific, authentic details.

ABSOLUTE RULE: NEVER fabricate or guess facts. If you are uncertain about a detail (birth name, city, specific event), say so honestly — use "unknown" or "unverified" rather than inventing plausible-sounding false information. Accuracy is paramount. A profile with honest gaps is infinitely better than one with confident lies.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "their stage/performer name",
    "realName": "verified birth/legal name — if you are not certain, use empty string rather than guessing",
    "ethnicity": "specific ethnic background with nuance (e.g. 'African American with Creole heritage', 'Puerto Rican', 'Korean American', 'Afro-Latina')",
    "city": "the actual city/town they grew up in — NOT the nearest major city (e.g. use 'Vega Baja' not 'San Juan', use 'Gary' not 'Chicago')",
    "state": "state, province, or territory (e.g. 'California', 'Puerto Rico', 'Ontario')",
    "neighborhood": "specific neighborhood, borough, housing project, or area WITHIN the city above (e.g. 'Hollygrove', 'Third Ward', 'Queensbridge Houses'). This must be a subdivision of the city field, not a different city.",
    "backstory": "3-4 sentence origin story covering childhood, how they got into music, and their breakthrough moment. Include specific names of groups, labels, or mentors.",
    "significantEvents": ["5-7 REAL career milestones with years — debut album, Grammy wins, iconic performances, major collaborations, controversies, cultural moments. Each must be specific and verifiable."]
  },
  "sound": {
    "genres": ["2-3 primary genres"],
    "subgenres": ["3-4 specific subgenres they operate in"],
    "microgenres": ["1-2 niche microgenres if applicable, empty array if mainstream"],
    "vocalTextures": ["exactly 5 descriptive vocal qualities, each 2-4 words (e.g. 'nasal raspy tenor', 'breathy controlled falsetto', 'gritty Southern drawl')"],
    "flowStyle": "for rappers: describe their rap flow (e.g. 'complex multisyllabic rhyme schemes with pause-heavy delivery'). For singers: describe their phrasing approach (e.g. 'melismatic runs with gospel-rooted belting'). 1-2 sentences.",
    "productionPreferences": ["5-6 specific production elements they favor — name specific producers they work with AND sonic signatures (e.g. 'Mannie Fresh bounce beats', 'Metro Boomin dark 808s', 'Quincy Jones orchestral funk arrangements')"],
    "keyCollaborators": ["4-6 real artists/producers they frequently work with — these should be VERIFIED collaborative relationships"],
    "artistInfluences": ["5-6 real artists they've cited as influences in interviews or are widely documented as predecessors. Do NOT guess — only include well-documented influences."],
    "melodyBias": 50,
    "language": "primary language they perform in",
    "secondaryLanguages": ["any other languages they use in music"],
    "soundDescription": "3-4 sentences painting a vivid picture of their sonic identity — what does their music FEEL like? Reference specific production textures, emotional tones, and sonic signatures that make them instantly recognizable."
  },
  "persona": {
    "traits": ["5-6 personality traits, 1-2 words each"],
    "likes": ["4-5 things they're genuinely passionate about — include known hobbies and interests outside music"],
    "dislikes": ["3-4 things they publicly oppose or avoid"],
    "attitude": "6-10 word encapsulation of their energy/demeanor",
    "worldview": "3-4 sentences about their philosophy, what they stand for, recurring themes in their work"
  },
  "lexicon": {
    "signaturePhrases": ["4-6 actual catchphrases, mottos, or recurring lines from their music/interviews — these must be phrases the artist ACTUALLY says, not generic rap/music phrases"],
    "slang": ["4-6 slang terms, regional expressions, or invented words they use — include regional dialect specific to their city/area"],
    "bannedWords": [],
    "adLibs": ["3-5 ACTUAL vocal ad-libs unique to this artist (e.g. Michael Jackson's 'Hee-hee!', Lil Wayne's lighter flick, Rick Ross's 'HUHH!', Young Jeezy's 'YEAHHH!'). Do NOT use generic ad-libs like 'Yeah' or 'Let's go' unless that artist is specifically famous for them."]
  },
  "look": {
    "skinTone": "descriptive skin tone (2-4 words, e.g. 'deep mahogany', 'warm olive', 'light caramel')",
    "hairStyle": "their MOST ICONIC/SIGNATURE hairstyle (4-8 words — e.g. Lil Wayne's dreads, Bad Bunny's dyed styles)",
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
- ACCURACY OVER COMPLETENESS. Every fact must be real and verifiable. Do not fill fields with plausible-sounding fabrications.
- For city: use the ACTUAL city/town, not the nearest metropolitan area. If someone grew up in Gary, Indiana — the city is "Gary", not "Chicago".
- For neighborhood: must be a subdivision WITHIN the city field. If city is "New Orleans", neighborhood could be "Hollygrove". If city is "Vega Baja", neighborhood could be "Almirante Sur".
- For significantEvents: use actual milestones with years (e.g. "Released debut 'Illmatic' to critical acclaim (1994)"). Include their MOST RECENT major project too.
- For signaturePhrases/slang/adLibs: use ACTUAL phrases the artist is known for. These are signature identifiers. A fan should immediately recognize the artist from these. Do NOT use generic phrases like "Real recognize real" or "Let's go" unless that specific artist actually popularized them.
- For artistInfluences: prefer artists they've actually named in interviews. Do NOT include rivals or feuding artists as influences.
- For keyCollaborators: list real, verified working relationships (producers, featured artists, songwriting partners).
- For productionPreferences: name SPECIFIC producers by name alongside the sonic signature. (e.g. "Timbaland's stuttering rhythms" not just "innovative beats").
- For vocalTextures: be evocative and specific. Must have exactly 5. "Smooth R&B tenor with gritty edges" not just "good singer".
- For flowStyle: this is about HOW they deliver, not what they sound like. Punchline rapper? Storyteller? Stream-of-consciousness? Multisyllabic? Double/triple time?
- For soundDescription: paint a picture. Reference specific sonic elements, moods, and production signatures.
- For ethnicity: include heritage details when relevant (e.g. "African American with Louisiana Creole heritage" not just "African American").
- For hairStyle: describe their SIGNATURE look, the one most associated with their image.
- Leave portraitUrl and characterSheetUrl as empty strings always.
- Leave catalog entries as empty array always.
- Leave bannedWords as empty array (user will set their own).
- If the artist name is ambiguous (multiple artists share the name), profile the MOST FAMOUS one.
- If the artist is obscure or underground, still be accurate about what IS known. Leave realName as empty string if their birth name is not publicly documented. Do not invent biographical details.`

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
        temperature: 0.4,
        max_tokens: 5000,
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
