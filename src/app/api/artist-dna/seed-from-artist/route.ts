/**
 * Artist DNA Seed API — 2-Pass Architecture
 *
 * Pass 1: GPT-4.1 generates the initial profile from training data
 * Pass 2: Perplexity Sonar (web search) fact-checks, fills gaps, and corrects errors
 *
 * This produces significantly more accurate profiles than a single-pass approach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const GENERATION_MODEL = 'openai/gpt-4.1'
const REFINEMENT_MODEL = 'perplexity/sonar-pro'

// ─── Pass 1: Generate initial profile ────────────────────────────────────────

const GENERATION_PROMPT = `You are a deeply knowledgeable music industry expert, biographer, and sonic analyst. Given a real artist name, create an exhaustive artist DNA profile. Fill every field with rich, specific, authentic details.

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
    "genres": ["2-4 primary genres — use more for genre-fluid artists"],
    "subgenres": ["3-5 specific subgenres they operate in"],
    "microgenres": ["1-2 niche microgenres if applicable, empty array if mainstream"],
    "genreEvolution": [{"era": "period description", "genres": ["genres in this era"]}],
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
    "signaturePhrases": ["4-6 actual catchphrases, mottos, or recurring lines from their music/interviews — these must be phrases the artist ACTUALLY says, not generic rap/music phrases. If the artist has no widely known catchphrases, use an empty array."],
    "slang": ["4-6 slang terms, regional expressions, or invented words they use — include regional dialect specific to their city/area"],
    "bannedWords": [],
    "adLibs": ["ACTUAL vocal ad-libs unique to this artist (e.g. Michael Jackson's 'Hee-hee!', Lil Wayne's lighter flick, Rick Ross's 'HUHH!'). If the artist is not known for signature ad-libs (many lyrical/underground rappers are not), use an EMPTY ARRAY [] rather than inventing generic ones. Only include ad-libs a fan would immediately associate with this specific artist."]
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
  },
  "lowConfidenceFields": ["list field paths where you are UNCERTAIN or guessing (e.g. 'identity.realName', 'identity.neighborhood', 'lexicon.adLibs'). Be honest — this helps the user know what to verify."]
}

CRITICAL GUIDELINES:

MELODY BIAS CALIBRATION — use these anchors to be precise:
  0-10 = Pure lyrical rapper, never sings (e.g. Ransom, Pusha T, Freddie Gibbs)
  15-25 = Rapper who occasionally sings hooks or uses auto-tune (e.g. Lil Wayne ~25, Eminem ~15)
  30-45 = Rap-dominant but significant melodic elements (e.g. Drake ~40, Juice WRLD ~45)
  50-60 = True hybrid, equal rap and singing (e.g. Lauryn Hill ~55)
  65-75 = Sing-rap / melodic dominant (e.g. Bad Bunny ~65, Post Malone ~70)
  80-90 = Primarily singer who occasionally raps (e.g. Beyoncé ~85, Michael Jackson ~90)
  95-100 = Pure singer, never raps (e.g. Adele ~98, Whitney Houston ~95)

GENRE EVOLUTION — for genre-fluid artists, the genreEvolution array tracks how their sound changed:
  Example for Beyoncé: [{"era": "Destiny's Child (1997-2004)", "genres": ["R&B", "pop"]}, {"era": "Solo debut to Sasha Fierce (2003-2010)", "genres": ["R&B", "pop", "dance-pop"]}, {"era": "Self-titled to Lemonade (2013-2016)", "genres": ["R&B", "trap", "soul", "rock"]}, {"era": "Renaissance (2022)", "genres": ["house", "disco", "dance"]}, {"era": "Cowboy Carter (2024)", "genres": ["country", "Americana", "folk"]}]
  For artists with consistent sound, use a single entry or empty array.

OTHER RULES:
- ACCURACY OVER COMPLETENESS. Every fact must be real and verifiable. Do not fill fields with plausible-sounding fabrications.
- For city: use the ACTUAL city/town, not the nearest metropolitan area.
- For neighborhood: must be a subdivision WITHIN the city field.
- For significantEvents: use actual milestones with years. Include their MOST RECENT major project too.
- For adLibs: use an EMPTY ARRAY if the artist has no signature ad-libs. Many lyrical/underground rappers do not have them. Do NOT invent generic ones.
- For signaturePhrases: same rule — empty array if the artist has no widely recognized catchphrases.
- For artistInfluences: prefer artists they've actually named in interviews. Do NOT include rivals.
- For keyCollaborators: list real, verified working relationships.
- For productionPreferences: name SPECIFIC producers by name alongside the sonic signature.
- For vocalTextures: be evocative and specific. Must have exactly 5.
- For ethnicity: include heritage details when relevant.
- For hairStyle: describe their SIGNATURE look, the one most associated with their image.
- For lowConfidenceFields: be HONEST about what you're uncertain about. Include any field where you had to guess.
- Leave portraitUrl and characterSheetUrl as empty strings always.
- Leave catalog entries as empty array always.
- Leave bannedWords as empty array (user will set their own).
- If the artist name is ambiguous, profile the MOST FAMOUS one.
- If the artist is obscure, be accurate about what IS known. Leave realName as empty string if not publicly documented.`

// ─── Pass 2: Web search refinement ───────────────────────────────────────────

const REFINEMENT_PROMPT = `You are a music industry fact-checker with access to web search. You've been given an AI-generated artist DNA profile. Your job is to VERIFY and CORRECT it using current web sources.

Search the web for the latest information about this artist and return a JSON object with ONLY the fields that need correction. Do not repeat fields that are already accurate.

Return ONLY a valid JSON object (no markdown, no code fences) with this structure:

{
  "corrections": {
    "field.path": "corrected value"
  },
  "additions": {
    "field.path": "new value to add"
  },
  "removedLowConfidence": ["field paths that are actually correct and should be removed from lowConfidenceFields"],
  "addedLowConfidence": ["field paths that are wrong and should be flagged"],
  "notes": "brief summary of what you found and changed"
}

RULES:
- Use dot notation for field paths: "identity.realName", "sound.melodyBias", "identity.significantEvents"
- For array fields, provide the COMPLETE corrected array, not individual items
- Focus on: real name accuracy, city/neighborhood, significant events (especially recent ones), melody bias, ad-libs accuracy, genre evolution, key collaborators
- If the profile looks accurate, return {"corrections": {}, "additions": {}, "removedLowConfidence": [], "addedLowConfidence": [], "notes": "Profile verified as accurate"}
- Add any major recent albums, tours, or events that are missing from significantEvents
- Verify the genreEvolution covers the artist's full career including most recent work
- Check if ad-libs are accurate — remove fabricated ones`

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistName } = await request.json()

    if (!artistName?.trim()) {
      return NextResponse.json({ error: 'artistName is required' }, { status: 400 })
    }

    const trimmedName = artistName.trim()

    // ─── Pass 1: Generate initial profile ──────────────────────────────

    const pass1Response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Seed",
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: GENERATION_PROMPT },
          { role: 'user', content: `Create a full artist DNA profile for: ${trimmedName}` },
        ],
        temperature: 0.4,
        max_tokens: 5000,
      }),
    })

    if (!pass1Response.ok) {
      const error = await pass1Response.text()
      console.error('Pass 1 error:', error)
      return NextResponse.json({ error: 'Failed to generate artist profile' }, { status: 500 })
    }

    const pass1Data = await pass1Response.json()
    const pass1Content = pass1Data.choices?.[0]?.message?.content || ''

    if (!pass1Content.trim()) {
      return NextResponse.json({ error: 'Empty response from generation model' }, { status: 500 })
    }

    let dna: Record<string, unknown>
    try {
      const cleaned = pass1Content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      dna = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Pass 1 DNA:', pass1Content.substring(0, 500))
      return NextResponse.json({ error: 'Failed to parse artist profile' }, { status: 500 })
    }

    // Ensure all required fields exist with defaults
    if (!dna.identity) dna.identity = {}
    if (!dna.sound) dna.sound = {}
    if (!dna.persona) dna.persona = {}
    if (!dna.lexicon) dna.lexicon = {}
    if (!dna.look) dna.look = {}
    if (!dna.catalog) dna.catalog = { entries: [] }
    if (!dna.lowConfidenceFields) dna.lowConfidenceFields = []

    const identity = dna.identity as Record<string, unknown>
    if (!identity.stageName) {
      identity.stageName = trimmedName
    }

    // Ensure genreEvolution exists
    const sound = dna.sound as Record<string, unknown>
    if (!sound.genreEvolution) sound.genreEvolution = []

    // ─── Pass 2: Web search refinement ─────────────────────────────────

    try {
      const pass2Response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': "Director's Palette - Artist DNA Refinement",
        },
        body: JSON.stringify({
          model: REFINEMENT_MODEL,
          messages: [
            { role: 'system', content: REFINEMENT_PROMPT },
            {
              role: 'user',
              content: `Fact-check and refine this AI-generated artist DNA profile for "${trimmedName}":\n\n${JSON.stringify(dna, null, 2)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 3000,
        }),
      })

      if (pass2Response.ok) {
        const pass2Data = await pass2Response.json()
        const pass2Content = pass2Data.choices?.[0]?.message?.content || ''

        if (pass2Content.trim()) {
          try {
            const cleaned2 = pass2Content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const refinement = JSON.parse(cleaned2)

            // Apply corrections
            if (refinement.corrections && typeof refinement.corrections === 'object') {
              for (const [path, value] of Object.entries(refinement.corrections)) {
                setNestedValue(dna, path, value)
              }
            }

            // Apply additions
            if (refinement.additions && typeof refinement.additions === 'object') {
              for (const [path, value] of Object.entries(refinement.additions)) {
                setNestedValue(dna, path, value)
              }
            }

            // Update lowConfidenceFields
            let lcf = (dna.lowConfidenceFields as string[]) || []
            if (Array.isArray(refinement.removedLowConfidence)) {
              lcf = lcf.filter((f: string) => !refinement.removedLowConfidence.includes(f))
            }
            if (Array.isArray(refinement.addedLowConfidence)) {
              lcf = [...lcf, ...refinement.addedLowConfidence]
            }
            dna.lowConfidenceFields = [...new Set(lcf)]

            console.log(`Pass 2 refinement for "${trimmedName}": ${refinement.notes || 'no notes'}`)
          } catch (e) {
            // Pass 2 parse failed — still return Pass 1 result
            console.warn('Pass 2 parse failed, using Pass 1 result:', e)
          }
        }
      } else {
        console.warn('Pass 2 request failed, using Pass 1 result')
      }
    } catch (e) {
      // Pass 2 entirely failed — still return Pass 1 result
      console.warn('Pass 2 failed, using Pass 1 result:', e)
    }

    return NextResponse.json({ dna, seededFrom: trimmedName })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Set a nested value using dot notation path (e.g. "identity.realName")
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}
