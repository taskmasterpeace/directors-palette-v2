/**
 * Prompt builder for the build-from-pins API route.
 *
 * Kept in its own module (no Next.js imports) so it can be unit-tested
 * directly with tsx / vitest without pulling in the server runtime.
 */

import { findGenreEntry } from '../data/genre-taxonomy.data'

export type GenreLevel = 'base' | 'sub' | 'micro'

export interface BuildFromPinsPins {
  genre?: {
    base?: string
    sub?: string
    micro?: string
    lockedLevel?: GenreLevel
    custom?: boolean
  }
  region?: { city?: string; state?: string; country?: string }
  ethnicity?: string
  gender?: string
  vocalStyle?: string
  signatureLook?: string
  vibe?: string
  era?: string
  language?: string
  stageName?: string
}

export interface BuildFromPinsRequest {
  description?: string
  pins?: BuildFromPinsPins
}

export const BUILD_FROM_PINS_SYSTEM_PROMPT = `You are inventing a fictional music artist from scratch. Given a free-form description and/or a set of hard-constraint pins, create a complete artist DNA profile. Fill every field with rich, specific, coherent details that respect every pin as an absolute requirement.

ABSOLUTE RULE: Every pin the user provides is a HARD CONSTRAINT. If they pin genre="Trap", the artist must be a trap artist. If they pin region="Houston, TX", the artist must be from Houston. If they pin stageName="Lil Stardust", the stage name is Lil Stardust. Do not override, reinterpret, or ignore any pin.

GENRE LOCK RULE: When a genre pin includes a "PRIMARY LOCK", the named subgenre or microgenre is the specific thing the artist belongs to — not just the broader parent. A UK Drill artist is a UK Drill artist, not a generic hip-hop artist. A Phonk artist is a Phonk artist, not a generic trap artist. Resist the pull toward generalization.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "fictional stage name (use the pinned one if provided)",
    "realName": "invented birth name",
    "ethnicity": "ethnic background (use the pinned one if provided)",
    "city": "city they grew up in (use the pinned one if provided)",
    "state": "state or region (use the pinned one if provided)",
    "neighborhood": "specific neighborhood within the city above",
    "backstory": "3-4 sentence invented origin story",
    "significantEvents": ["5-7 fictional career milestones with years"]
  },
  "sound": {
    "genres": ["2-4 primary genres. If the user pinned a specific subgenre or microgenre, the first entry MUST be that exact subgenre/microgenre name — NOT a generic parent."],
    "subgenres": ["3-5 specific subgenres. If a subgenre was pinned, it must appear here first."],
    "microgenres": ["1-2 niche microgenres. If a microgenre was pinned, it must appear here first."],
    "genreEvolution": [],
    "vocalTextures": ["exactly 5 descriptive vocal qualities, each 2-4 words"],
    "flowStyle": "1-2 sentence description of their rap flow or singing phrasing",
    "productionPreferences": ["5-6 production elements they favor"],
    "keyCollaborators": ["4-6 fictional collaborators"],
    "artistInfluences": ["5-6 influences (can be real artists)"],
    "melodyBias": 50,
    "language": "primary language (use the pinned one if provided)",
    "secondaryLanguages": [],
    "soundDescription": "3-4 sentences painting their sonic identity"
  },
  "persona": {
    "traits": ["5-6 personality traits, 1-2 words each"],
    "likes": ["4-5 things they care about"],
    "dislikes": ["3-4 things they oppose"],
    "attitude": "6-10 word encapsulation (should reflect pinned vibe if provided)",
    "worldview": "3-4 sentences about their philosophy"
  },
  "lexicon": {
    "signaturePhrases": ["4-6 invented catchphrases"],
    "slang": ["4-6 slang terms or invented words"],
    "bannedWords": [],
    "adLibs": ["2-4 invented ad-libs, or empty array"]
  },
  "look": {
    "skinTone": "descriptive skin tone (must match pinned ethnicity)",
    "hairStyle": "signature hairstyle (use pinned look hint if provided)",
    "fashionStyle": "fashion aesthetic in 5-10 words",
    "jewelry": "signature jewelry (4-8 words or 'minimal')",
    "tattoos": "tattoo style (5-10 words or 'none')",
    "visualDescription": "3-4 sentences about their visual presence",
    "portraitUrl": "",
    "characterSheetUrl": ""
  },
  "catalog": {
    "entries": []
  },
  "lowConfidenceFields": []
}

RULES:
- Everything is invented — do not use a real artist's identity.
- Every pin is non-negotiable. If the user pins stageName, that's the stage name.
- melodyBias: 0-10=pure rapper, 30-45=rap-dominant melodic, 50-60=hybrid, 65-75=sing-rap, 80-90=primarily singer, 95-100=pure singer. Pick a value that matches the pinned genre and vocal style.
- Leave portraitUrl, characterSheetUrl, bannedWords, genreEvolution, catalog.entries, lowConfidenceFields empty/default — the user fills these later.
- vocalTextures must be EXACTLY 5 entries.
- The description field (if provided) is additional free-form guidance — weave it in alongside the pins.`

export function buildUserPrompt(body: BuildFromPinsRequest): string {
  const parts: string[] = []
  if (body.description?.trim()) {
    parts.push(`User description:\n${body.description.trim()}`)
  }
  if (body.pins) {
    const pinLines: string[] = []
    const p = body.pins

    // Genre: accept ANY level (base, sub, or micro). Hydrate ancestry from taxonomy
    // so a standalone "Drill (UK)" still carries its parent context to the model.
    if (p.genre && (p.genre.base || p.genre.sub || p.genre.micro)) {
      let base = p.genre.base
      let sub = p.genre.sub
      const micro = p.genre.micro
      const locked: GenreLevel =
        p.genre.lockedLevel ?? (micro ? 'micro' : sub ? 'sub' : 'base')

      // Hydrate missing ancestors from taxonomy (unless custom)
      if (!p.genre.custom) {
        const primaryName = micro || sub || base
        if (primaryName) {
          const entry = findGenreEntry(primaryName)
          if (entry) {
            base = base || entry.base
            if (entry.level !== 'base') sub = sub || entry.sub
          }
        }
      }

      const primary = locked === 'micro' ? micro : locked === 'sub' ? sub : base
      const hierarchy = [base, sub, micro].filter(Boolean).join(' → ')

      if (p.genre.custom) {
        pinLines.push(
          `- genre: ${primary} (CUSTOM — user-supplied, not in our taxonomy. Treat as the primary genre anchor; invent plausible subgenre/micro details that fit the name.)`,
        )
      } else if (locked === 'base') {
        pinLines.push(`- genre: ${hierarchy} (primary: ${primary})`)
      } else {
        pinLines.push(
          `- genre: ${hierarchy} (PRIMARY LOCK: ${primary} — this is the ${locked === 'micro' ? 'microgenre' : 'subgenre'} the artist MUST belong to. The parent hierarchy is context; do not reduce the artist to a generic ${base ?? 'parent'} act.)`,
        )
      }
    }

    if (p.region) {
      const r = [p.region.city, p.region.state, p.region.country].filter(Boolean).join(', ')
      if (r) pinLines.push(`- region: ${r}`)
    }
    if (p.ethnicity) pinLines.push(`- ethnicity: ${p.ethnicity}`)
    if (p.gender) pinLines.push(`- gender/presentation: ${p.gender}`)
    if (p.vocalStyle) pinLines.push(`- vocal style: ${p.vocalStyle}`)
    if (p.signatureLook) pinLines.push(`- signature look: ${p.signatureLook}`)
    if (p.vibe) pinLines.push(`- vibe/energy: ${p.vibe}`)
    if (p.era) pinLines.push(`- era/time period: ${p.era}`)
    if (p.language) pinLines.push(`- language: ${p.language}`)
    if (p.stageName) pinLines.push(`- stage name: ${p.stageName} (USE THIS EXACT NAME)`)

    if (pinLines.length) {
      parts.push(`Hard-constraint pins (every one of these is non-negotiable):\n${pinLines.join('\n')}`)
    }
  }

  if (parts.length === 0) {
    parts.push('No description or pins provided — invent a completely random, coherent artist.')
  }
  return parts.join('\n\n')
}
