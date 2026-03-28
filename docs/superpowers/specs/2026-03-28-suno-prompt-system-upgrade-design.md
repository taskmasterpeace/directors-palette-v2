# Suno Prompt System Upgrade — Design Spec

## Goal

Upgrade the Music Lab's lyrics generation and export system to be fully Suno-compatible. Add expanded section types, vocal delivery tags, duet support, a Suno style prompt builder, syllable awareness, per-artist voice profiles, and align all generation routes to consistent quality.

## Architecture

Seven changes across types, API routes, UI components, and the artist DNA model. All changes are additive — no existing functionality is removed. The Writing Studio stays clean; Suno-specific formatting appears in a new collapsible preview panel at the bottom.

## Tech Stack

- TypeScript types (writing-studio.types.ts, artist-dna.types.ts)
- Next.js API routes (8 prompt-building routes)
- React components (Writing Studio, Artist DNA editor)
- Zustand stores (writing-studio.store.ts)
- Tailwind CSS v4

---

## 1. Expanded Section Types

### Current State

`SectionType = 'intro' | 'hook' | 'verse' | 'bridge' | 'outro'` — 5 types.

### New State

Add 8 new section types for a total of 13:

| Type | Suno Tag | Default Bars | Min/Max | Purpose |
|------|----------|-------------|---------|---------|
| `intro` | `[Intro]` | 4 | 2-8 | Set the scene, establish mood |
| `verse` | `[Verse]` | 20 | 8-32 | Storytelling, vivid detail |
| `pre-chorus` | `[Pre-Chorus]` | 4 | 2-8 | Build before chorus |
| `hook` | `[Hook]` | 8 | 4-12 | Short catchy phrase |
| `chorus` | `[Chorus]` | 8 | 4-12 | Big singalong, repeatable |
| `post-chorus` | `[Post-Chorus]` | 4 | 2-8 | Extension after chorus |
| `bridge` | `[Bridge]` | 4 | 2-8 | Shift perspective, build tension |
| `interlude` | `[Interlude]` | 4 | 2-8 | Musical break, minimal lyrics |
| `break` | `[Break]` | 2 | 1-4 | Stripped-down moment |
| `drop` | `[Drop]` | 4 | 2-8 | EDM energy release |
| `build` | `[Build]` | 4 | 2-8 | Rising intensity |
| `instrumental` | `[Instrumental]` | 8 | 4-16 | No vocals — solo, break, etc. |
| `outro` | `[Outro]` | 4 | 2-8 | Wrap up, lasting impression |

### Files to Change

- `src/features/music-lab/types/writing-studio.types.ts` — expand `SectionType` union, add to `BAR_COUNT_RANGES`
- `src/app/api/artist-dna/generate-options/route.ts` — update `getSectionGuidance()`
- `src/app/api/artist-dna/generate-full-song/route.ts` — update `getSectionGuidance()`
- `src/app/api/artist-dna/generate-mix/route.ts` — recognize new types in output
- Writing Studio UI — section type picker needs all 13 options
- `src/app/api/artist-dna/analyze-lyrics/route.ts` — detect new section types in imported lyrics

### Section Guidance Map

```typescript
const SECTION_GUIDANCE: Record<SectionType, string> = {
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
```

---

## 2. Vocal Delivery Tags (Hybrid System)

### Concept

Auto-infer Suno-compatible delivery tags from artist DNA. Tags appear only in the Suno preview panel (not in the Writing Studio editor). Users can override per section.

### Auto-Inference Logic

Based on `melodyBias` from `ArtistSound`:

| melodyBias Range | Default Delivery Tag | Reasoning |
|-----------------|---------------------|-----------|
| 0-20 (pure rap) | `[Rapped]` | They don't sing |
| 21-40 (mostly rap) | `[Rap]` | Primarily bars |
| 41-60 (blend) | _(none)_ | Let Suno decide from style prompt |
| 61-80 (mostly singing) | `[Smooth]` | Melodic delivery |
| 81-100 (pure singing) | Inferred from `vocalTextures` | `[Belted]`, `[Soulful]`, `[Breathy]`, etc. |

For melodyBias 81-100, map from `vocalTextures` array:
- Contains "raspy" → `[Raspy]`
- Contains "smooth" → `[Smooth]`
- Contains "soulful" → `[Soulful]`
- Contains "breathy" → `[Breathy]`
- Default fallback → `[Belted]`

### Available Delivery Tags (User Override)

**Rap deliveries:** `Rapped`, `Fast Rap`, `Slow Flow`, `Melodic Rap`, `Trap Flow`, `Double Time`, `Spoken Word`

**Sung deliveries:** `Smooth`, `Belted`, `Whispered`, `Falsetto`, `Breathy`, `Raspy`, `Soulful`, `Crooning`

**Special:** `Spoken`, `Growled`, `Chant`, `A Cappella`

### Where Tags Appear

- NOT in the Writing Studio editing view
- YES in the Suno preview panel (collapsible, bottom of Writing Studio)
- Each section row in the preview shows: `[Section Tag] [Delivery Tag]` — editable via dropdown
- Tags injected before the section lyrics on a separate line in the export

**Storage:** Delivery tag overrides are persisted on `SongSection.deliveryTag` in the Zustand store so they survive panel collapse/expand. The Writing Studio editor simply does not render this field — it only appears in the Suno preview panel.

### Files to Change

- New utility: `src/features/music-lab/utils/suno-delivery-inference.ts`
- New component: Suno preview panel (see Section 4)
- No changes to the LLM prompt routes — delivery tags are for Suno export only

---

## 3. Duets & Voice Assignment

### Feature Artist System

When building a song, the user can add a **featured artist**. Two paths:

**Path 1 — Pick from artist profiles:**
- Select from a dropdown of user's other artist profiles
- Auto-pulls: name, default voice description, gender (inferred from DNA)

**Path 2 — Manual label:**
- Type a name
- Pick a voice type: Male Vocal, Female Vocal
- Optionally type a voice description

### Per-Section Voice Selector

When a feature artist is present, each section in the Writing Studio shows a voice selector:

| Option | Suno Tag | Meaning |
|--------|----------|---------|
| Lead (default) | `[Section: ArtistName]` | Main artist sings/raps |
| Feature | `[Section: FeatureName]` | Featured artist performs |
| Both | `[Section: Both]` | Duet/unison |
| Ad-lib | _(no tag — goes in parentheses)_ | Background vocals |

When no feature artist is added, the voice selector is hidden entirely.

**Cross-store dependency:** The feature artist picker reads available artists from `useArtistDnaStore().artists`. When selecting a profile artist, `voiceDescription` is populated from their `voices[default].description` if available, otherwise falls back to a description compiled from `sound.vocalTextures` + `sound.flowStyle` + `sound.melodyBias`.

### Export Format

```
[Verse 1: Drake] [Rapped]
Started from the bottom now we here...

[Chorus: Both] [Smooth]
We made it, we made it...

[Verse 2: 21 Savage] [Slow Flow]
Straight up, no chaser...
```

### Voice Descriptions in Style Prompt

When a feature is present, both voices get included:

> deep raspy male vocal, confident conversational flow; smooth female feature vocal, R&B melodic delivery

### Files to Change

- `src/features/music-lab/types/writing-studio.types.ts` — add `FeatureArtist` type, add `voice` field to `SongSection`, add `featureArtist` to store state
- `src/features/music-lab/store/writing-studio.store.ts` — add feature artist state + per-section voice assignment
- Writing Studio UI — feature artist picker, per-section voice dropdown
- Suno preview panel — voice tags in export

### Types

```typescript
interface FeatureArtist {
  id: string | null        // null = manual entry
  name: string
  voiceType: 'male' | 'female'
  voiceDescription: string // pulled from DNA or manually entered
}

// Add to SongSection:
interface SongSection {
  // ...existing fields
  voice: 'lead' | 'feature' | 'both' | 'adlib'  // default: 'lead'
  deliveryTag: string | null  // override from Suno preview, null = auto-infer
}
```

---

## 4. Suno Style Prompt Builder & Preview Panel

### Style Prompt Compilation

Compiles the artist's DNA + current song settings into a Suno "Style of Music" prompt.

**Formula (front-loaded — Suno weights early words heaviest):**

```
[genres], [subgenres], [mood/emotion], [key instruments], [vocal description], [production style], [BPM], [key]
```

**Data sources:**

| Element | Source |
|---------|--------|
| Genres | `sound.genres` + `sound.subgenres` (first 3-4) |
| Mood | `ToneSettings.emotion` from the song's current tone |
| Instruments | `sound.instruments` (first 2-3) |
| Vocal description | Active voice's `description`, or inferred from `sound.vocalTextures` + `melodyBias` |
| Production | `sound.productionPreferences` (first 2-3) |
| BPM | Sound Studio BPM setting (if set) |
| Key | Sound Studio key setting (if set) |

**Example output:**

> trap, southern hip-hop, aggressive, 808 bass, hi-hats, deep raspy male vocal, raw gritty production, 140 BPM, E minor

**Character count:** Display character count with warning at 900+ (Suno limit ~1,000). Auto-truncate less important elements if over limit.

**Negative prompts / Exclude:** Compile from `lexicon.bannedWords` and any explicit production exclusions. Shown as a separate "Exclude" field in the preview.

### The Preview Panel

**Location:** Collapsible panel at the bottom of the Writing Studio.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ▼ Suno Export Preview                    [Copy All] │
├─────────────────────────────────────────────────────┤
│ Style of Music:                          [Copy] 📋  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ trap, southern hip-hop, aggressive, 808 bass... │ │  ← editable textarea
│ └─────────────────────────────────────────────────┘ │
│ 142/1000 chars                                      │
│                                                     │
│ Exclude:                                 [Copy] 📋  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ no autotune, no corny lyrics                    │ │  ← editable textarea
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Formatted Lyrics:                        [Copy] 📋  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Verse 1: Drake] [Rapped]                       │ │
│ │ Started from the bottom now we here...          │ │  ← editable textarea
│ │                                                 │ │
│ │ [Chorus: Both] [Smooth]                         │ │
│ │ We made it, we made it...                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Per-Section Delivery:                               │
│ Verse 1    [Rapped ▼]     Voice: [Lead ▼]          │
│ Chorus     [Smooth ▼]     Voice: [Both ▼]          │
│ Verse 2    [Slow Flow ▼]  Voice: [Feature ▼]       │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Updates in real-time as sections are added/edited
- Style prompt auto-regenerates when DNA or tone changes
- All text areas are editable for last-mile tweaks
- Copy buttons on each field + a "Copy All" that packages everything
- Collapsed by default, user expands when ready to export

### Files to Change

- New component: `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx`
- New utility: `src/features/music-lab/utils/suno-style-prompt-builder.ts`
- New utility: `src/features/music-lab/utils/suno-lyrics-formatter.ts`
- Modify: Writing Studio layout to include collapsible panel

---

## 5. Syllable Count Guidance

### Concept

Add syllable density instructions to LLM prompts. No UI changes — purely backend prompt improvement.

### Syllable Targets by Section Type and Melody Bias

| Section Type | Rapped (melodyBias 0-40) | Sung (melodyBias 60-100) | Blend (41-59) |
|-------------|-------------------------|------------------------|---------------|
| Verse | 10-14 syllables/line | 8-10 syllables/line | 8-12 syllables/line |
| Hook/Chorus | 6-10 syllables/line | 6-8 syllables/line | 6-10 syllables/line |
| Pre-Chorus/Build | 6-10 syllables/line | 6-8 syllables/line | 6-8 syllables/line |
| Bridge | 8-12 syllables/line | 8-10 syllables/line | 8-10 syllables/line |
| Post-Chorus | 6-8 syllables/line | 6-8 syllables/line | 6-8 syllables/line |
| Intro/Outro | 6-10 syllables/line | 6-8 syllables/line | 6-10 syllables/line |
| Break | 4-8 syllables/line | 4-6 syllables/line | 4-8 syllables/line |
| Drop | 4-8 syllables/line | 4-6 syllables/line | 4-8 syllables/line |
| Interlude | _(suppress — minimal/no lyrics)_ | _(suppress)_ | _(suppress)_ |
| Instrumental | _(suppress — no vocals)_ | _(suppress)_ | _(suppress)_ |

### Prompt Instruction

Added to all generation routes (generate-options, generate-full-song, generate-mix, artist-chat lyrics):

```
SYLLABLE CONSISTENCY: Keep syllable counts consistent within each section.
Target {X}-{Y} syllables per line for {sectionType}.
Lines that vary wildly in length will sound rushed or awkward when performed.
Avoid cramming too many words into a single line.
```

### Files to Change

- `src/app/api/artist-dna/generate-options/route.ts`
- `src/app/api/artist-dna/generate-full-song/route.ts`
- `src/app/api/artist-dna/generate-mix/route.ts`
- `src/app/api/artist-chat/message/route.ts` (for lyrics in chat)
- `src/app/api/artist-dna/revise-section/route.ts` (revision must match generation quality)

---

## 6. Voice Name & Description

### Data Model

New field on `ArtistDNA`:

```typescript
interface ArtistVoice {
  id: string
  name: string           // "Dark Raspy Trap", "Singing Drake"
  description: string    // "deep male voice, aggressive, Southern drawl, raw energy"
  isDefault: boolean     // which one gets used by default
}

// Added to ArtistDNA:
interface ArtistDNA {
  // ...existing fields
  voices: ArtistVoice[]
}
```

### Two Creation Paths

**1. Auto-generate from DNA:**
- Button: "Generate Voice from DNA"
- Compiles: `sound.vocalTextures` + `sound.flowStyle` + `sound.melodyBias` + `sound.genres` → natural language description
- Example input: vocalTextures=["raspy","deep"], flowStyle="fast-paced triplet flow", melodyBias=20, genres=["trap","hip-hop"]
- Example output: "deep raspy male vocal, fast aggressive rap delivery, trap style"
- User can edit the generated description

**2. Paste existing:**
- User types a name and pastes/types a description
- For users who already have a voice description from Suno

### Multi-Voice per Artist (Drake Scenario)

An artist can have multiple voices for different vocal modes:
- "Drizzy Rap" — "confident male rapper, conversational, mid-range"
- "Singing Drake" — "smooth R&B male vocal, melodic, emotional, Auto-Tune light"
- "Dark Drake" — "deep aggressive delivery, menacing, low register"

One voice is marked `isDefault: true`. Per-section voice selection in the Writing Studio allows picking which voice to use for each section — this ties into the delivery tag system (a rap voice auto-infers `[Rapped]`, a singing voice infers `[Smooth]`).

### Where in UI

New section in the Artist DNA editor under the **Sound** tab:
- List of voices with name, description, default star
- Add/edit/delete voice
- "Generate from DNA" button

### How Voices Feed into Generation

- **Style prompt builder:** The active voice's description gets included as the vocal component
- **Suno export:** Voice description is part of the style prompt
- **Per-section:** When a section uses a specific voice, that voice's description shapes the delivery tag inference
- **Duets:** Lead artist's voice + feature artist's voice both go into style prompt

### Files to Change

- `src/features/music-lab/types/artist-dna.types.ts` — add `ArtistVoice` interface, add `voices` to `ArtistDNA`, update `createEmptyDNA()`
- `src/features/music-lab/store/artist-dna.store.ts` — voice CRUD operations
- New component: `src/features/music-lab/components/artist-dna/VoiceSection.tsx`
- Sound tab UI — include voice section
- New utility: `src/features/music-lab/utils/voice-description-generator.ts`

---

## 7. Align `generate-mix` Route

### Current Problems

The `generate-mix` route (`src/app/api/artist-dna/generate-mix/route.ts`) is the oldest generation route and has drifted from the newer routes:

1. **No rhyme DNA** — doesn't use `rhymeTypes`, `rhymePatterns`, `rhymeDensity`
2. **Loose lexicon rules** — "Incorporate naturally" / "Use slang" / "Include ad-libs" with no per-count limits
3. **Hardcoded structure** — always generates "2 verses, 1 chorus, 1 bridge" regardless of input
4. **No syllable guidance**
5. **Missing `BANNED_AI_PHRASES` updates** if any were added

### Fixes

1. Add full rhyme DNA block (same as generate-options):
   - `rhymeTypes` with human-readable descriptions
   - `rhymePatterns` with descriptions + distribution instruction
   - `rhymeDensity` with 4-tier labels

2. Tighten lexicon instructions:
   - Signature phrases: "max 1-2 in the ENTIRE song, not in every section"
   - Slang: "distribute naturally, don't repeat the same slang in every verse"
   - Ad-libs: "max 2-3 total across the whole song"
   - Same limits as `generate-full-song`

3. Accept optional `structure` parameter. If provided, use expanded section types. If absent (backward compat with "The Mix" feature), use default structure: `[{type:'verse',barCount:16}, {type:'chorus',barCount:8}, {type:'verse',barCount:16}, {type:'bridge',barCount:4}, {type:'chorus',barCount:8}]`

4. Add syllable count guidance per section type

5. Ensure `BANNED_AI_PHRASES` list is identical to other routes

6. Output should use Suno-compatible section tags (`[Verse 1]`, `[Chorus]`, `[Pre-Chorus]`, etc.)

### Files to Change

- `src/app/api/artist-dna/generate-mix/route.ts` — rewrite prompt builder
- `src/features/music-lab/store/artist-dna.store.ts` — update `generateMix()` call if structure param is added
- Existing `src/features/music-lab/services/suno-prompt-builder.ts` — update or replace with new `suno-style-prompt-builder.ts`. The new builder supersedes the old one; update imports in `artist-dna.store.ts` accordingly.

---

## Summary of All Files to Change

### New Files
- `src/features/music-lab/utils/suno-delivery-inference.ts`
- `src/features/music-lab/utils/suno-style-prompt-builder.ts`
- `src/features/music-lab/utils/suno-lyrics-formatter.ts`
- `src/features/music-lab/utils/voice-description-generator.ts`
- `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx`
- `src/features/music-lab/components/artist-dna/VoiceSection.tsx`

### Modified Files
- `src/features/music-lab/types/writing-studio.types.ts` — expanded SectionType, FeatureArtist, voice/delivery on SongSection
- `src/features/music-lab/types/artist-dna.types.ts` — ArtistVoice, voices field
- `src/features/music-lab/store/writing-studio.store.ts` — feature artist, voice assignment. **Migration note:** The store `merge` function must default `voice` to `'lead'` and `deliveryTag` to `null` for any persisted `SongSection` objects missing these fields.
- `src/features/music-lab/store/artist-dna.store.ts` — voice CRUD
- `src/app/api/artist-dna/generate-options/route.ts` — new section guidance, syllable counts
- `src/app/api/artist-dna/generate-full-song/route.ts` — new section guidance, syllable counts
- `src/app/api/artist-dna/generate-mix/route.ts` — full rewrite of prompt builder
- `src/app/api/artist-chat/message/route.ts` — syllable guidance for lyrics
- `src/app/api/artist-dna/analyze-lyrics/route.ts` — detect new section types
- Writing Studio UI components — section type picker, feature artist picker, Suno preview panel
- Artist DNA Sound tab UI — voice section
