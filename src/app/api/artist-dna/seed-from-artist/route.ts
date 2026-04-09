/**
 * Artist DNA Seed API — 3-Pass Architecture
 *
 * Pass 1: GPT-4.1 generates the initial profile from training data
 * Pass 2: Perplexity Sonar (web search) fact-checks, fills gaps, and corrects errors
 * Pass 3: GPT-4.1-mini fictionalizes — invents new names, rewrites backstory and
 *         events, strips real-artist references so the result is a legally distinct
 *         persona inspired by (not a copy of) the source.
 *
 * The user arrives at the review screen with a fully fictionalized artist and can
 * still edit anything they want.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

const GENERATION_MODEL = 'openai/gpt-4.1'
const REFINEMENT_MODEL = 'perplexity/sonar-pro'
const FICTIONALIZE_MODEL = 'openai/gpt-4.1-mini'

// 2-pass cost: GPT-4.1 (~$0.035) + Perplexity Sonar Pro (~$0.053) = ~$0.09 actual cost
// Price: 25 credits ($0.25) — ~2.8x margin, consistent with image gen pricing
const SEED_ARTIST_COST_CENTS = 25

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

// ─── Pass 3: Fictionalization (force rename + scrub real-person refs) ────────

const FICTIONALIZE_PROMPT = `You are a creative ghostwriter. You've been given a fact-checked artist DNA profile built from a REAL artist. Your job is to transform it into a FICTIONAL persona that is clearly inspired by — but legally distinct from — the source.

You MUST:
1. Invent a NEW stage name (2-3 words max, memorable, genre-appropriate, NOT a direct riff on the real name — no "Lil X" if the source is "Lil Y").
2. Invent a NEW real/birth name (plausible, culturally coherent with the ethnicity/region in the profile).
3. Rewrite the backstory so it tells the fictional artist's origin — same vibe, same city/region/genre energy, but with the new names and NO mention of the real artist, their real labels, their real groups, or their real mentors. Invent plausible fictional equivalents where needed.
4. Rewrite every significantEvents entry so it describes the FICTIONAL artist's career milestones — keep the tone, years, and scale similar, but never name-drop the real artist's actual albums, real collaborators, or real labels. Invent fictional project names.
5. Scrub signaturePhrases and adLibs of anything that is a real trademark phrase of the source artist. Replace with generic or invented phrases that fit the persona, or use an empty array if nothing fits.
6. Rewrite soundDescription, visualDescription, and worldview to remove any mentions of the real artist's name, real album titles, or real collaborators. Keep the sonic/visual/philosophical essence.
7. Clear keyCollaborators and artistInfluences — replace keyCollaborators with [] and artistInfluences with 2-3 vague genre descriptors instead of real names (e.g. "90s Memphis underground rap", "early 2000s Bay Area hyphy").

DO NOT change: genres, subgenres, microgenres, vocalTextures, flowStyle, melodyBias, language, persona.traits, persona.likes, persona.dislikes, persona.attitude, look.skinTone, look.hairStyle, look.fashionStyle, look.jewelry, look.tattoos, identity.ethnicity, identity.city, identity.state, identity.neighborhood. The whole point is that the sound and look carry over — only the identity is rewritten.

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:

{
  "identity.stageName": "new fictional stage name",
  "identity.realName": "new fictional real name",
  "identity.backstory": "rewritten 3-4 sentence backstory",
  "identity.significantEvents": ["rewritten milestone 1", "rewritten milestone 2", ...],
  "sound.soundDescription": "rewritten 3-4 sentence sound description",
  "sound.keyCollaborators": [],
  "sound.artistInfluences": ["vague descriptor 1", "vague descriptor 2", "vague descriptor 3"],
  "persona.worldview": "rewritten 3-4 sentence worldview",
  "lexicon.signaturePhrases": [...],
  "lexicon.adLibs": [...],
  "look.visualDescription": "rewritten 3-4 sentence visual description"
}

CRITICAL: Every string you return must be free of the source artist's real name and any of their real project/label/collaborator names. Double-check before returning.`

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { artistName } = await request.json()

    if (!artistName?.trim()) {
      return NextResponse.json({ error: 'artistName is required' }, { status: 400 })
    }

    const trimmedName = artistName.trim()
    const { user } = auth

    // ─── Credit deduction ─────────────────────────────────────────────

    const deductResult = await creditsService.deductCredits(user.id, 'artist-dna-seed', {
      generationType: 'text',
      description: `Artist DNA seed: ${trimmedName} (2-pass with web search)`,
      overrideAmount: SEED_ARTIST_COST_CENTS,
      user_email: user.email,
    })

    if (!deductResult.success) {
      return NextResponse.json(
        { error: deductResult.error || 'Insufficient credits' },
        { status: 402 }
      )
    }

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
      logger.api.error('Pass 1 error', { error })
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
      logger.api.error('Failed to parse Pass 1 DNA', { detail: pass1Content.substring(0, 500) })
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

            logger.api.info('Pass 2 refinement', { artist: trimmedName, notes: refinement.notes || 'no notes' })
          } catch (e) {
            // Pass 2 parse failed — still return Pass 1 result
            logger.api.warn('Pass 2 parse failed, using Pass 1 result', { error: e instanceof Error ? e.message : String(e) })
          }
        }
      } else {
        logger.api.warn('Pass 2 request failed, using Pass 1 result')
      }
    } catch (e) {
      // Pass 2 entirely failed — still return Pass 1 result
      logger.api.warn('Pass 2 failed, using Pass 1 result', { error: e instanceof Error ? e.message : String(e) })
    }

    // ─── Pass 3: Fictionalization (force rename + scrub real-person refs) ──

    try {
      const pass3Response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': "Director's Palette - Artist DNA Fictionalize",
        },
        body: JSON.stringify({
          model: FICTIONALIZE_MODEL,
          messages: [
            { role: 'system', content: FICTIONALIZE_PROMPT },
            {
              role: 'user',
              content: `Source artist: "${trimmedName}"\n\nFact-checked DNA to fictionalize:\n\n${JSON.stringify(dna, null, 2)}`,
            },
          ],
          temperature: 0.9,
          max_tokens: 2500,
        }),
      })

      if (pass3Response.ok) {
        const pass3Data = await pass3Response.json()
        const pass3Content = pass3Data.choices?.[0]?.message?.content || ''

        if (pass3Content.trim()) {
          try {
            const cleaned3 = pass3Content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const fictionalization = JSON.parse(cleaned3) as Record<string, unknown>

            for (const [path, value] of Object.entries(fictionalization)) {
              setNestedValue(dna, path, value)
            }

            // Belt-and-suspenders: strip any lingering mentions of the real name
            // from the rewritten text fields. Simple case-insensitive replacement.
            const newStageName = (dna.identity as Record<string, unknown>)?.stageName as string | undefined
            if (newStageName && typeof newStageName === 'string') {
              const textFields: Array<[string, string]> = [
                ['identity', 'backstory'],
                ['sound', 'soundDescription'],
                ['persona', 'worldview'],
                ['look', 'visualDescription'],
              ]
              const nameRegex = new RegExp(escapeRegex(trimmedName), 'gi')
              for (const [section, field] of textFields) {
                const sec = dna[section] as Record<string, unknown> | undefined
                const val = sec?.[field]
                if (typeof val === 'string') {
                  sec![field] = val.replace(nameRegex, newStageName)
                }
              }
              const identity = dna.identity as Record<string, unknown>
              const events = identity.significantEvents
              if (Array.isArray(events)) {
                identity.significantEvents = events.map((e) =>
                  typeof e === 'string' ? e.replace(nameRegex, newStageName) : e
                )
              }
            }

            // Clear lowConfidenceFields for fields we rewrote — they're fictional now
            const fictionalized = new Set([
              'identity.stageName',
              'identity.realName',
              'identity.backstory',
              'identity.significantEvents',
              'sound.keyCollaborators',
              'sound.artistInfluences',
              'lexicon.adLibs',
              'lexicon.signaturePhrases',
            ])
            if (Array.isArray(dna.lowConfidenceFields)) {
              dna.lowConfidenceFields = (dna.lowConfidenceFields as string[]).filter(
                (f) => !fictionalized.has(f)
              )
            }

            logger.api.info('Pass 3 fictionalization', {
              source: trimmedName,
              newStage: newStageName,
            })
          } catch (e) {
            logger.api.warn('Pass 3 parse failed, returning fact-checked DNA as-is', {
              error: e instanceof Error ? e.message : String(e),
            })
          }
        }
      } else {
        logger.api.warn('Pass 3 request failed, returning fact-checked DNA as-is')
      }
    } catch (e) {
      logger.api.warn('Pass 3 failed, returning fact-checked DNA as-is', {
        error: e instanceof Error ? e.message : String(e),
      })
    }

    return NextResponse.json({ dna, seededFrom: trimmedName })
  } catch (error) {
    logger.api.error('Seed error', { error: error instanceof Error ? error.message : String(error) })
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
