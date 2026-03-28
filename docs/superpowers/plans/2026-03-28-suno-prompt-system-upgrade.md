# Suno Prompt System Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Music Lab to produce Suno-compatible lyrics output with expanded sections, vocal delivery tags, duet support, style prompts, syllable awareness, and per-artist voice profiles.

**Architecture:** All changes are additive to existing code. New utilities handle Suno-specific formatting (delivery inference, style prompt building, lyrics formatting). Types are expanded, API routes get prompt improvements, and a new Suno Export Panel component surfaces the formatted output in the Writing Studio.

**Tech Stack:** TypeScript, Next.js 15 App Router, React 19, Zustand (persisted), Tailwind CSS v4, OpenRouter API

**Spec:** `docs/superpowers/specs/2026-03-28-suno-prompt-system-upgrade-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/features/music-lab/utils/suno-delivery-inference.ts` | Infer Suno delivery tags from melodyBias + vocalTextures |
| `src/features/music-lab/utils/suno-style-prompt-builder.ts` | Compile ArtistDNA into Suno "Style of Music" prompt |
| `src/features/music-lab/utils/suno-lyrics-formatter.ts` | Format sections into Suno-tagged lyrics string |
| `src/features/music-lab/utils/voice-description-generator.ts` | Auto-generate voice description from DNA fields |
| `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx` | Collapsible panel showing Suno-ready style prompt + formatted lyrics |
| `src/features/music-lab/components/artist-dna/VoiceSection.tsx` | Voice CRUD UI in Artist DNA Sound tab |

### Modified Files
| File | Changes |
|------|---------|
| `src/features/music-lab/types/writing-studio.types.ts` | Expand SectionType to 13, add FeatureArtist, add voice/deliveryTag to SongSection |
| `src/features/music-lab/types/artist-dna.types.ts` | Add ArtistVoice interface, add voices to ArtistDNA, update createEmptyDNA |
| `src/features/music-lab/store/writing-studio.store.ts` | Feature artist state, voice per section, persistence migration |
| `src/features/music-lab/store/artist-dna.store.ts` | Voice CRUD, update generateMix imports |
| `src/features/music-lab/services/suno-prompt-builder.ts` | Replace with new style prompt builder |
| `src/app/api/artist-dna/generate-options/route.ts` | New section guidance, syllable counts |
| `src/app/api/artist-dna/generate-full-song/route.ts` | New section guidance, syllable counts |
| `src/app/api/artist-dna/generate-mix/route.ts` | Full prompt rewrite — rhyme DNA, lexicon limits, syllables |
| `src/app/api/artist-dna/revise-section/route.ts` | Add syllable guidance |
| `src/app/api/artist-chat/message/route.ts` | Syllable guidance for lyrics in chat |
| `src/app/api/artist-dna/analyze-lyrics/route.ts` | Detect new section types on import |

---

## Task 1: Expand Section Types

**Files:**
- Modify: `src/features/music-lab/types/writing-studio.types.ts`

- [ ] **Step 1: Update SectionType union and BAR_COUNT_RANGES**

```typescript
// In writing-studio.types.ts

export type SectionType =
  | 'intro' | 'verse' | 'pre-chorus' | 'hook' | 'chorus'
  | 'post-chorus' | 'bridge' | 'interlude' | 'break'
  | 'drop' | 'build' | 'instrumental' | 'outro'

export const BAR_COUNT_RANGES: Record<SectionType, { min: number; max: number; default: number }> = {
  intro: { min: 2, max: 8, default: 4 },
  verse: { min: 8, max: 32, default: 20 },
  'pre-chorus': { min: 2, max: 8, default: 4 },
  hook: { min: 4, max: 12, default: 8 },
  chorus: { min: 4, max: 12, default: 8 },
  'post-chorus': { min: 2, max: 8, default: 4 },
  bridge: { min: 2, max: 8, default: 4 },
  interlude: { min: 2, max: 8, default: 4 },
  break: { min: 1, max: 4, default: 2 },
  drop: { min: 2, max: 8, default: 4 },
  build: { min: 2, max: 8, default: 4 },
  instrumental: { min: 4, max: 16, default: 8 },
  outro: { min: 2, max: 8, default: 4 },
}
```

- [ ] **Step 2: Add FeatureArtist type and update SongSection**

```typescript
// Add after SongSection definition

export interface FeatureArtist {
  id: string | null        // null = manual entry, string = picked from artist profiles
  name: string
  voiceType: 'male' | 'female'
  voiceDescription: string
}

// Update SongSection — add two fields:
export interface SongSection {
  id: string
  type: SectionType
  tone: ToneSettings
  selectedDraft: DraftOption | null
  isLocked: boolean
  voice: 'lead' | 'feature' | 'both' | 'adlib'  // NEW — default: 'lead'
  deliveryTag: string | null  // NEW — Suno delivery override, null = auto-infer
}
```

- [ ] **Step 3: Add SECTION_GUIDANCE constant**

```typescript
// Add at bottom of file

export const SECTION_GUIDANCE: Record<SectionType, string> = {
  'intro': 'Set the scene, establish mood.',
  'verse': 'Storytelling, vivid detail, narrative progression. Pack each line with meaning.',
  'pre-chorus': 'Build tension toward the chorus. Shorter lines, rising energy.',
  'hook': 'Catchy, memorable, repeatable. The emotional anchor of the song.',
  'chorus': 'Big, singable, repeatable. The part everyone remembers and sings along to.',
  'post-chorus': 'Extend the chorus energy. A chant, ad-lib section, or melodic extension.',
  'bridge': 'Shift perspective, build tension, offer new insight.',
  'interlude': 'Musical break. Minimal or no lyrics — a breathing moment.',
  'break': 'Stripped-down moment. Sparse, raw, exposed.',
  'drop': 'Energy release. Heavy instrumental impact. Minimal lyrics if any.',
  'build': 'Rising intensity. Lines get shorter and more urgent.',
  'instrumental': 'No vocals. Instrumental solo or musical passage.',
  'outro': 'Wrap up, leave a lasting impression.',
}

export const SUNO_SECTION_TAGS: Record<SectionType, string> = {
  'intro': '[Intro]',
  'verse': '[Verse]',
  'pre-chorus': '[Pre-Chorus]',
  'hook': '[Hook]',
  'chorus': '[Chorus]',
  'post-chorus': '[Post-Chorus]',
  'bridge': '[Bridge]',
  'interlude': '[Interlude]',
  'break': '[Break]',
  'drop': '[Drop]',
  'build': '[Build]',
  'instrumental': '[Instrumental]',
  'outro': '[Outro]',
}
```

- [ ] **Step 4: Build and fix any type errors**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

Fix any errors from existing code that uses `SectionType`. Key files with hardcoded `Record<SectionType, ...>` maps that WILL break:
- `src/features/music-lab/components/writing-studio/SectionPicker.tsx` — has `SECTION_LABELS`, `SECTION_COLORS` maps
- `src/features/music-lab/components/writing-studio/FullSongBuilder.tsx` — has `SECTION_CHIP_STYLES` map
- `src/app/api/artist-dna/generate-options/route.ts` — `getSectionGuidance()` switch
- `src/app/api/artist-dna/generate-full-song/route.ts` — `getSectionGuidance()` switch

Add entries for all 8 new types in each map/switch. For `getSectionGuidance()`, replace the switch with a lookup against the `SECTION_GUIDANCE` constant exported from `writing-studio.types.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(music-lab): expand SectionType to 13 types, add FeatureArtist, voice/delivery on SongSection"
```

---

## Task 2: Add ArtistVoice to DNA Types

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

- [ ] **Step 1: Add ArtistVoice interface**

```typescript
// Add before ArtistDNA interface

export interface ArtistVoice {
  id: string
  name: string           // "Dark Raspy Trap", "Singing Drake"
  description: string    // "deep male voice, aggressive, Southern drawl"
  isDefault: boolean
}
```

- [ ] **Step 2: Add voices field to ArtistDNA**

```typescript
// In ArtistDNA interface, add after phone field:
voices: ArtistVoice[]
```

- [ ] **Step 3: Update createEmptyDNA()**

Add `voices: []` to the return object. **Important:** All code accessing `dna.voices` must use `dna.voices || []` defensively, since existing artist records in Supabase will not have this field.

- [ ] **Step 4: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add ArtistVoice type and voices field to ArtistDNA"
```

---

## Task 3: Create Suno Utility Functions

**Files:**
- Create: `src/features/music-lab/utils/suno-delivery-inference.ts`
- Create: `src/features/music-lab/utils/suno-style-prompt-builder.ts`
- Create: `src/features/music-lab/utils/suno-lyrics-formatter.ts`
- Create: `src/features/music-lab/utils/voice-description-generator.ts`

- [ ] **Step 1: Create suno-delivery-inference.ts**

```typescript
/**
 * Infer Suno vocal delivery tags from ArtistDNA
 */

import type { ArtistSound } from '../types/artist-dna.types'
import type { SectionType } from '../types/writing-studio.types'

const RAP_DELIVERIES = [
  'Rap', 'Rapped', 'Fast Rap', 'Slow Flow', 'Melodic Rap',
  'Trap Flow', 'Double Time', 'Spoken Word',
] as const

const SUNG_DELIVERIES = [
  'Smooth', 'Belted', 'Whispered', 'Falsetto',
  'Breathy', 'Raspy', 'Soulful', 'Crooning',
] as const

const SPECIAL_DELIVERIES = ['Spoken', 'Growled', 'Chant', 'A Cappella'] as const

export const ALL_DELIVERY_TAGS = [
  ...RAP_DELIVERIES, ...SUNG_DELIVERIES, ...SPECIAL_DELIVERIES,
] as const

export type DeliveryTag = typeof ALL_DELIVERY_TAGS[number]

/** No-vocal section types that should not get delivery tags */
const NO_VOCAL_SECTIONS: SectionType[] = ['instrumental', 'interlude']

/**
 * Infer the default delivery tag for a section based on melodyBias and vocalTextures.
 * Returns null if no tag should be applied (blend range or no-vocal section).
 */
export function inferDeliveryTag(
  sound: Pick<ArtistSound, 'melodyBias' | 'vocalTextures'>,
  sectionType: SectionType
): DeliveryTag | null {
  if (NO_VOCAL_SECTIONS.includes(sectionType)) return null

  const { melodyBias, vocalTextures } = sound
  const textures = (vocalTextures || []).map(t => t.toLowerCase())

  if (melodyBias <= 20) return 'Rapped'
  if (melodyBias <= 40) return 'Rap'
  if (melodyBias >= 81) {
    if (textures.includes('raspy')) return 'Raspy'
    if (textures.includes('smooth')) return 'Smooth'
    if (textures.includes('soulful')) return 'Soulful'
    if (textures.includes('breathy')) return 'Breathy'
    return 'Belted'
  }
  if (melodyBias >= 61) return 'Smooth'

  // 41-60 blend — no tag, let Suno decide
  return null
}
```

- [ ] **Step 2: Create suno-style-prompt-builder.ts**

```typescript
/**
 * Build a Suno-compatible "Style of Music" prompt from ArtistDNA + tone settings
 */

import type { ArtistDNA, ArtistVoice } from '../types/artist-dna.types'

interface StylePromptOptions {
  emotion?: string
  bpm?: number
  key?: string
  featureVoice?: { name: string; description: string } | null
}

const MAX_CHARS = 1000

/**
 * Compile ArtistDNA into a Suno "Style of Music" prompt string.
 * Front-loads genres (Suno weights early words most).
 */
export function buildSunoStylePrompt(
  dna: ArtistDNA,
  activeVoice: ArtistVoice | null,
  options: StylePromptOptions = {}
): string {
  const parts: string[] = []

  // 1. Genres (front-loaded — most important)
  const genres = [...(dna.sound?.genres || []), ...(dna.sound?.subgenres || [])].slice(0, 4)
  if (genres.length) parts.push(genres.join(', '))

  // 2. Mood/emotion from tone
  if (options.emotion) parts.push(options.emotion.toLowerCase())

  // 3. Key instruments (2-3 max)
  const instruments = (dna.sound?.instruments || []).slice(0, 3)
  if (instruments.length) parts.push(instruments.join(', '))

  // 4. Vocal description — from active voice or inferred
  if (activeVoice?.description) {
    parts.push(activeVoice.description)
  } else if (dna.sound?.vocalTextures?.length) {
    const bias = dna.sound.melodyBias ?? 50
    const vocalType = bias <= 30 ? 'rap vocal' : bias >= 70 ? 'singing vocal' : 'vocal'
    parts.push(`${dna.sound.vocalTextures.slice(0, 3).join(', ')} ${vocalType}`)
  }

  // 5. Feature voice
  if (options.featureVoice?.description) {
    parts.push(`feature: ${options.featureVoice.description}`)
  }

  // 6. Production preferences
  const production = (dna.sound?.productionPreferences || []).slice(0, 3)
  if (production.length) parts.push(production.join(', '))

  // 7. BPM
  if (options.bpm) parts.push(`${options.bpm} BPM`)

  // 8. Key
  if (options.key) parts.push(options.key)

  let result = parts.join(', ')

  // Truncate if over limit — drop from the end
  if (result.length > MAX_CHARS) {
    result = result.substring(0, MAX_CHARS - 3) + '...'
  }

  return result
}

/**
 * Build the "Exclude" field from banned words and production exclusions.
 */
export function buildSunoExcludePrompt(dna: ArtistDNA): string {
  const excludes: string[] = []
  if (dna.lexicon?.bannedWords?.length) {
    excludes.push(...dna.lexicon.bannedWords.map(w => `no ${w}`))
  }
  return excludes.join(', ')
}
```

- [ ] **Step 3: Create suno-lyrics-formatter.ts**

```typescript
/**
 * Format Writing Studio sections into Suno-compatible tagged lyrics
 */

import type { SongSection, SectionType, FeatureArtist } from '../types/writing-studio.types'
import { SUNO_SECTION_TAGS } from '../types/writing-studio.types'
import type { ArtistDNA } from '../types/artist-dna.types'
import { inferDeliveryTag } from './suno-delivery-inference'

interface FormatOptions {
  artistName: string
  featureArtist: FeatureArtist | null
  sound: ArtistDNA['sound']
}

/**
 * Build Suno-formatted lyrics string from song sections.
 */
export function formatLyricsForSuno(
  sections: SongSection[],
  options: FormatOptions
): string {
  const lines: string[] = []
  const verseCounts: Record<string, number> = {}

  for (const section of sections) {
    if (!section.selectedDraft?.content && section.type !== 'instrumental') continue

    // Build section tag with numbering for verses
    let tag = SUNO_SECTION_TAGS[section.type] || `[${section.type}]`
    if (['verse', 'chorus'].includes(section.type)) {
      verseCounts[section.type] = (verseCounts[section.type] || 0) + 1
      if (verseCounts[section.type] > 1 || sections.filter(s => s.type === section.type).length > 1) {
        tag = tag.replace(']', ` ${verseCounts[section.type]}]`)
      }
    }

    // Add voice assignment for duets
    if (options.featureArtist && section.voice !== 'lead') {
      const voiceName = section.voice === 'feature'
        ? options.featureArtist.name
        : section.voice === 'both'
          ? 'Both'
          : options.artistName
      tag = tag.replace(']', `: ${voiceName}]`)
    }

    // Add delivery tag
    const delivery = section.deliveryTag || inferDeliveryTag(options.sound, section.type)
    const deliveryStr = delivery ? ` [${delivery}]` : ''

    lines.push(`${tag}${deliveryStr}`)

    // Add lyrics content (skip for instrumental)
    if (section.type !== 'instrumental' && section.selectedDraft?.content) {
      lines.push(section.selectedDraft.content)
    }

    lines.push('') // blank line between sections
  }

  return lines.join('\n').trim()
}
```

- [ ] **Step 4: Create voice-description-generator.ts**

```typescript
/**
 * Auto-generate a voice description from ArtistDNA fields
 */

import type { ArtistDNA } from '../types/artist-dna.types'

/**
 * Compile a natural-language voice description from DNA sound fields.
 */
export function generateVoiceDescription(dna: ArtistDNA): string {
  const parts: string[] = []

  // Vocal textures
  const textures = dna.sound?.vocalTextures || []
  if (textures.length) {
    parts.push(textures.slice(0, 3).join(', '))
  }

  // Vocal type from melodyBias
  const bias = dna.sound?.melodyBias ?? 50
  if (bias <= 20) parts.push('rap vocal')
  else if (bias <= 40) parts.push('mostly rapping')
  else if (bias >= 80) parts.push('singing vocal')
  else if (bias >= 60) parts.push('melodic vocal')
  else parts.push('versatile vocal')

  // Flow style
  if (dna.sound?.flowStyle) {
    parts.push(dna.sound.flowStyle)
  }

  // Primary genre flavor
  const genres = dna.sound?.genres || []
  if (genres.length) {
    parts.push(`${genres.slice(0, 2).join('/')} style`)
  }

  return parts.join(', ')
}
```

- [ ] **Step 5: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add Suno utility functions — delivery inference, style prompt, lyrics formatter, voice generator"
```

---

## Task 4: Update Writing Studio Store

**Files:**
- Modify: `src/features/music-lab/store/writing-studio.store.ts`

- [ ] **Step 1: Add feature artist state and section defaults**

Add to state interface:
```typescript
featureArtist: FeatureArtist | null
```

Add to initial state:
```typescript
featureArtist: null,
```

- [ ] **Step 2: Update addSection to include new fields**

Wherever `SongSection` objects are created (in `addSection`, `importSections`, `generateFullSong`), ensure they include:
```typescript
voice: 'lead',
deliveryTag: null,
```

- [ ] **Step 3: Add feature artist actions**

```typescript
setFeatureArtist: (artist: FeatureArtist | null) => set({ featureArtist: artist }),
setSectionVoice: (sectionId: string, voice: SongSection['voice']) =>
  set(state => ({
    sections: state.sections.map(s =>
      s.id === sectionId ? { ...s, voice } : s
    ),
  })),
setSectionDeliveryTag: (sectionId: string, tag: string | null) =>
  set(state => ({
    sections: state.sections.map(s =>
      s.id === sectionId ? { ...s, deliveryTag: tag } : s
    ),
  })),
```

- [ ] **Step 4: Update persistence migration**

In the `merge` function, add migration for sections missing new fields:
```typescript
// In the persist merge function:
if (persisted.sections) {
  persisted.sections = persisted.sections.map((s: SongSection) => ({
    ...s,
    voice: s.voice || 'lead',
    deliveryTag: s.deliveryTag ?? null,
  }))
}
```

- [ ] **Step 5: Add featureArtist to persist partialize**

Include `featureArtist` in the list of persisted fields.

- [ ] **Step 6: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add feature artist, voice/delivery to Writing Studio store"
```

---

## Task 5: Add Syllable Guidance to All Generation Routes

**Files:**
- Modify: `src/app/api/artist-dna/generate-options/route.ts`
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts`
- Modify: `src/app/api/artist-dna/revise-section/route.ts`
- Modify: `src/app/api/artist-chat/message/route.ts`

- [ ] **Step 1: Add shared syllable guidance helper**

Add this function to each route file (or create a shared module if preferred — but keeping it inline per route avoids cross-dependency). The function:

```typescript
function getSyllableGuidance(sectionType: string, melodyBias: number): string {
  const noVocalSections = ['instrumental', 'interlude']
  if (noVocalSections.includes(sectionType)) return ''

  const isRap = melodyBias <= 40
  const isSung = melodyBias >= 60

  const targets: Record<string, { rap: string; sung: string; blend: string }> = {
    'verse': { rap: '10-14', sung: '8-10', blend: '8-12' },
    'hook': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'chorus': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'pre-chorus': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'build': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'bridge': { rap: '8-12', sung: '8-10', blend: '8-10' },
    'post-chorus': { rap: '6-8', sung: '6-8', blend: '6-8' },
    'intro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'outro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'break': { rap: '4-8', sung: '4-6', blend: '4-8' },
    'drop': { rap: '4-8', sung: '4-6', blend: '4-8' },
  }

  const t = targets[sectionType] || targets['verse']
  const range = isRap ? t.rap : isSung ? t.sung : t.blend

  return `SYLLABLE CONSISTENCY: Target ${range} syllables per line for this ${sectionType}. Keep syllable counts consistent within the section — lines that vary wildly sound rushed or awkward when performed.`
}
```

- [ ] **Step 2: Inject into generate-options**

In `buildSystemPrompt`, after the section guidance line, add:
```typescript
const syllableNote = getSyllableGuidance(sectionType, artistDna.sound?.melodyBias ?? 50)
if (syllableNote) parts.push(syllableNote)
```

Also update `getSectionGuidance()` to use the new `SECTION_GUIDANCE` map from writing-studio.types (import it or duplicate the map — the route already has its own `getSectionGuidance` function, just expand it to cover all 13 types).

- [ ] **Step 3: Inject into generate-full-song**

In `buildFullSongPrompt`, after the structure listing, add per-section syllable notes:
```typescript
structure.forEach((s, i) => {
  const syllableNote = getSyllableGuidance(s.type, artistDna.sound?.melodyBias ?? 50)
  if (syllableNote) parts.push(`  Section ${i + 1} syllables: ${syllableNote}`)
})
```

Also update `getSectionGuidance()` to cover all 13 types.

- [ ] **Step 4: Inject into revise-section**

In `buildRevisionPrompt`, add after the rhyme section:
```typescript
const syllableNote = getSyllableGuidance(body.sectionType, body.artistDna?.sound?.melodyBias ?? 50)
if (syllableNote) parts.push(syllableNote)
```

- [ ] **Step 5: Inject into artist-chat lyrics rule**

In `buildSystemPrompt` in the chat route, update the LYRICS VARIETY rule to include syllable guidance:
```typescript
lines.push('- LYRICS VARIETY: When writing lyrics, do NOT overuse signature phrases, ad-libs, or catchphrases. Use them at most once in an entire verse. Focus on fresh, original wordplay and imagery each time.')
lines.push('- SYLLABLE CONSISTENCY: When writing lyrics, keep syllable counts consistent within each section. Target 8-12 syllables per line. Avoid cramming too many words into a single bar.')
```

- [ ] **Step 6: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add syllable count guidance to all lyrics generation routes"
```

---

## Task 6: Rewrite generate-mix Route

**Files:**
- Modify: `src/app/api/artist-dna/generate-mix/route.ts`

- [ ] **Step 1: Add rhyme DNA block**

In `buildSystemPrompt`, after the catalog genome section, add the full rhyme block (copy the pattern from generate-options):

```typescript
const rhymeTypes = dna.sound?.rhymeTypes
const rhymePatterns = dna.sound?.rhymePatterns
const rhymeDensity = dna.sound?.rhymeDensity

if (rhymeTypes?.length || rhymePatterns?.length || rhymeDensity !== undefined) {
  parts.push('RHYMING STYLE:')
  if (rhymeTypes?.length) {
    const typeDescriptions: Record<string, string> = {
      'perfect': 'Perfect rhymes (exact ending sounds)',
      'multi-syllable': 'Multi-syllable rhymes (2+ syllables match)',
      'slant': 'Slant/near rhymes (close sounds, not exact)',
      'internal': 'Internal rhymes (within lines, not just at endings)',
      'compound': 'Compound/mosaic rhymes (multiple words rhyming together)',
      'assonance': 'Assonance rhymes (matching vowel sounds)',
    }
    parts.push(`Preferred rhyme types: ${rhymeTypes.map(t => typeDescriptions[t] || t).join('. ')}`)
  }
  if (rhymePatterns?.length) {
    const patternDescriptions: Record<string, string> = {
      'aabb': 'AABB (couplets)', 'abab': 'ABAB (alternating)',
      'abcb': 'ABCB (only 2 and 4)', 'abba': 'ABBA (enclosed)',
      'free': 'Free form', 'chain': 'Chain rhyme',
    }
    parts.push(`Preferred rhyme patterns: ${rhymePatterns.map(p => patternDescriptions[p] || p).join('. ')}`)
  }
  if (rhymeDensity !== undefined) {
    if (rhymeDensity <= 25) parts.push('Rhyme density: SPARSE')
    else if (rhymeDensity <= 50) parts.push('Rhyme density: MODERATE')
    else if (rhymeDensity <= 75) parts.push('Rhyme density: DENSE')
    else parts.push('Rhyme density: EVERY LINE')
  }
}
```

- [ ] **Step 2: Tighten lexicon instructions**

Replace the existing loose lexicon lines with strict limits:

```typescript
if (dna.lexicon?.signaturePhrases?.length)
  parts.push(`Signature phrases (use at most 1-2 in the ENTIRE song, not in every section): ${dna.lexicon.signaturePhrases.join(', ')}`)
if (dna.lexicon?.slang?.length)
  parts.push(`Slang/vocabulary (distribute naturally, don't repeat the same slang in every verse): ${dna.lexicon.slang.join(', ')}`)
if (dna.lexicon?.adLibs?.length)
  parts.push(`Ad-libs (use at most 2-3 total across the whole song): ${dna.lexicon.adLibs.join(', ')}`)
if (dna.lexicon?.bannedWords?.length)
  parts.push(`NEVER use these words: ${dna.lexicon.bannedWords.join(', ')}`)
```

- [ ] **Step 3: Accept optional structure parameter**

Update the request body type:
```typescript
interface GenerateMixBody {
  dna: ArtistDNA
  structure?: { type: string; barCount: number }[]
}
```

If `structure` is provided, use it. Otherwise fall back to default:
```typescript
const structure = body.structure || [
  { type: 'verse', barCount: 16 },
  { type: 'chorus', barCount: 8 },
  { type: 'verse', barCount: 16 },
  { type: 'bridge', barCount: 4 },
  { type: 'chorus', barCount: 8 },
]
```

Use expanded section tags in the structure description sent to the LLM.

- [ ] **Step 4: Add syllable guidance**

Use the identical `getSyllableGuidance()` function from Task 5. Inject per-section:
```typescript
structure.forEach((s) => {
  const syllableNote = getSyllableGuidance(s.type, dna.sound?.melodyBias ?? 50)
  if (syllableNote) parts.push(syllableNote)
})
```

- [ ] **Step 5: Ensure BANNED_AI_PHRASES matches other routes**

Verify the list is identical to generate-options and generate-full-song.

- [ ] **Step 6: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(music-lab): rewrite generate-mix prompt — rhyme DNA, strict lexicon, syllable guidance"
```

---

## Task 7: Update analyze-lyrics to Detect New Section Types

**Files:**
- Modify: `src/app/api/artist-dna/analyze-lyrics/route.ts`

- [ ] **Step 1: Update the section detection prompt**

In the system prompt that tells the LLM to detect sections, update the allowed section types:
```
Allowed section types: intro, verse, pre-chorus, hook, chorus, post-chorus, bridge, interlude, break, drop, build, instrumental, outro
```

Previously it only listed 5 types. Now it should recognize all 13.

- [ ] **Step 2: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(music-lab): detect all 13 section types in lyrics import"
```

---

## Task 8: Voice CRUD in Artist DNA Store

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`
- Modify: `src/features/music-lab/services/suno-prompt-builder.ts`

- [ ] **Step 1: Add voice actions to artist-dna store**

```typescript
addVoice: (voice: Omit<ArtistVoice, 'id'>) => {
  const id = `voice-${Date.now()}`
  set(state => {
    const voices = [...(state.draft.voices || []), { ...voice, id }]
    // If this is the first voice, make it default
    if (voices.length === 1) voices[0].isDefault = true
    return { draft: { ...state.draft, voices } }
  })
},

updateVoice: (id: string, updates: Partial<ArtistVoice>) => {
  set(state => ({
    draft: {
      ...state.draft,
      voices: (state.draft.voices || []).map(v =>
        v.id === id ? { ...v, ...updates } : v
      ),
    },
  }))
},

removeVoice: (id: string) => {
  set(state => {
    const voices = (state.draft.voices || []).filter(v => v.id !== id)
    // If removed voice was default and others exist, make first one default
    if (voices.length && !voices.some(v => v.isDefault)) {
      voices[0].isDefault = true
    }
    return { draft: { ...state.draft, voices } }
  })
},

setDefaultVoice: (id: string) => {
  set(state => ({
    draft: {
      ...state.draft,
      voices: (state.draft.voices || []).map(v => ({
        ...v,
        isDefault: v.id === id,
      })),
    },
  }))
},
```

- [ ] **Step 2: Update suno-prompt-builder.ts to use new builder**

Replace the contents of `src/features/music-lab/services/suno-prompt-builder.ts` to re-export from the new utility:

```typescript
/**
 * Suno Prompt Builder — re-exports from new utility
 * Kept for backward compatibility with artist-dna.store.ts imports
 */

export { buildSunoStylePrompt, buildSunoExcludePrompt } from '../utils/suno-style-prompt-builder'
export { generateVoiceDescription } from '../utils/voice-description-generator'

import type { ArtistDNA } from '../types/artist-dna.types'

/** @deprecated Use buildSunoStylePrompt instead */
export function buildVocalPrompt(dna: ArtistDNA): string {
  const parts: string[] = []
  const textures = dna.sound?.vocalTextures || []
  if (textures.length) parts.push(textures.join(', '))
  const bias = dna.sound?.melodyBias ?? 50
  if (bias <= 30) parts.push('rap-focused delivery')
  else if (bias >= 70) parts.push('melodic, singing-focused delivery')
  else parts.push('versatile delivery mixing rap and melody')
  if (dna.persona?.attitude) parts.push(dna.persona.attitude)
  if (dna.lexicon?.adLibs?.length) parts.push(`Ad-libs: ${dna.lexicon.adLibs.join(', ')}`)
  return parts.join(', ')
}

/** @deprecated Use buildSunoStylePrompt instead */
export function buildMusicStylePrompt(dna: ArtistDNA): string {
  const tags: string[] = []
  ;(dna.sound?.genres || []).forEach(g => tags.push(g))
  ;(dna.sound?.subgenres || []).forEach(g => tags.push(g))
  ;(dna.sound?.microgenres || []).forEach(g => tags.push(g))
  ;(dna.sound?.instruments || []).forEach(i => tags.push(i))
  ;(dna.sound?.productionPreferences || []).forEach(p => tags.push(p))
  ;(dna.sound?.artistInfluences || []).forEach(a => tags.push(`${a} inspired`))
  return tags.join(', ')
}

/** @deprecated Use buildSunoStylePrompt instead */
export function buildCombinedPrompt(vocal: string, style: string): string {
  return [vocal, style].filter(Boolean).join(', ')
}
```

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add voice CRUD to artist-dna store, update suno-prompt-builder"
```

---

## Task 9: VoiceSection UI Component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/VoiceSection.tsx`
- Modify: Sound tab UI component to include VoiceSection

- [ ] **Step 1: Create VoiceSection.tsx**

Build a component that:
- Lists existing voices with name, description, default star
- "Add Voice" button opens inline form (name + description fields)
- "Generate from DNA" button calls `generateVoiceDescription()` and pre-fills description
- Edit/delete buttons per voice
- Star icon to set default voice
- Uses Tailwind CSS v4 with the project's cyan accent color scheme

The component should use `useArtistDnaStore` for voice CRUD actions.

- [ ] **Step 2: Add VoiceSection to Sound tab**

Add `<VoiceSection />` at the bottom of `src/features/music-lab/components/artist-dna/tabs/SoundTab.tsx`, below existing sound fields.

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add VoiceSection component to Artist DNA Sound tab"
```

---

## Task 10: Feature Artist Picker UI

**Files:**
- Modify: Writing Studio layout (find the main component that renders the sections list)

- [ ] **Step 1: Create Feature Artist Picker**

Add a compact "Add Feature Artist" control above the sections list in the Writing Studio. When clicked, show two options:
1. **From My Artists** — dropdown populated from `useArtistDnaStore().artists` (cross-store read). On select, populate `FeatureArtist` with: `id`, `name`, `voiceType` (inferred from DNA or defaulted to 'male'), `voiceDescription` (from `artist.dna.voices?.find(v => v.isDefault)?.description` or fallback to `generateVoiceDescription(artist.dna)`)
2. **Manual Entry** — inline form: name text input, male/female toggle, optional voice description

Show the selected feature artist as a small chip with name + "X" to remove. When removed, call `setFeatureArtist(null)`.

When feature artist is present, each section in the sections list should show a small voice selector: Lead / Feature / Both / Ad-lib (defaults to 'lead').

- [ ] **Step 2: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add feature artist picker UI to Writing Studio"
```

---

## Task 11: Suno Export Panel Component (depends on Tasks 3, 4, 10)

**Files:**
- Create: `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx`
- Modify: Writing Studio layout to include the panel

- [ ] **Step 1: Create SunoExportPanel.tsx**

Build a collapsible panel component with:
- **Style of Music** — editable textarea, auto-generated from `buildSunoStylePrompt()`, character count display (warn at 900+), copy button
- **Exclude** — editable textarea, auto-generated from `buildSunoExcludePrompt()`, copy button
- **Formatted Lyrics** — editable textarea, generated by `formatLyricsForSuno()`, copy button
- **Per-Section Delivery** — row per section showing section type, delivery tag dropdown (from `ALL_DELIVERY_TAGS`), voice dropdown (only when feature artist present)
- **Copy All** button that packages style + exclude + lyrics
- Collapsed by default, toggle with chevron header

The panel reads from `useWritingStudioStore` (sections, featureArtist) and `useArtistDnaStore` (active artist DNA, voices).

Style: dark theme, monospace for the textareas, cyan accent, consistent with project design system.

- [ ] **Step 2: Add panel to Writing Studio layout**

Add `<SunoExportPanel />` at the bottom of the Writing Studio tab container (`src/features/music-lab/components/writing-studio/StudioTab.tsx` or the equivalent root component — grep for the component that renders `SectionPicker`). Place below the sections list.

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add Suno Export Panel to Writing Studio"
```

---

## Task 12: Update Section Picker UI for 13 Types

**Files:**
- Modify: Writing Studio section type picker/selector components

- [ ] **Step 1: Find and update section type picker**

The section type picker in the Writing Studio needs to show all 13 section types. Find the component that renders the section type dropdown/selector and update it to use all types from `SectionType`.

Group them logically in the UI:
- **Core:** Intro, Verse, Pre-Chorus, Hook, Chorus, Post-Chorus, Bridge, Outro
- **Dynamic:** Break, Build, Drop, Interlude, Instrumental

- [ ] **Step 2: Update FullSongBuilder section selector**

If `FullSongBuilder.tsx` has its own section type selector, update it to match.

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(music-lab): update section type pickers to show all 13 types"
```

---

## Task 13: Final Build + Push

- [ ] **Step 1: Full clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1
```

Fix any remaining errors.

- [ ] **Step 2: Manual smoke test**

Start dev server and verify:
1. Writing Studio shows all 13 section types
2. Suno Export Panel appears and generates style prompt
3. Voice section appears in Artist DNA Sound tab
4. Lyrics generation includes syllable-appropriate output

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 > /dev/null 2>&1 &
```

- [ ] **Step 3: Push to production**

```bash
git push origin main
```
