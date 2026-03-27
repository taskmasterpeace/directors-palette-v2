# Music Lab — Artist DNA Field Audit

**Date:** 2026-03-27
**Purpose:** Every field in the Artist DNA system, where it's used, and what's NOT being used.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **W** | Written/set (editor, seed, API) |
| **R** | Read/consumed in prompts or logic |
| **UI** | Displayed in the interface |
| **--** | NOT used (dead field) |

---

## 1. IDENTITY TAB

| Field | Type | Writing Studio | Sound Studio | Artist Chat | Image Gen | Suno Prompt | UI Display | Verdict |
|-------|------|---------------|-------------|-------------|-----------|-------------|------------|---------|
| `stageName` | string | R (all 4 endpoints) | -- | R (system prompt) | R (character sheet naming) | -- | R (card, context bar, constellation) | **ACTIVE — core field** |
| `realName` | string | R (fallback for stageName) | -- | R (fallback) | R (fallback) | -- | R (editor only) | **ACTIVE — fallback only** |
| `ethnicity` | string | -- | -- | -- | R (portrait, character sheet, photo shoot, chat photo) | -- | R (editor only) | **ACTIVE — image gen only** |
| `city` | string | R (generate-options, full-song) | -- | R (system prompt) | R (header bg) | -- | R (card badge, context bar) | **ACTIVE** |
| `state` | string | R (generate-options, full-song) | -- | R (system prompt) | R (header bg) | -- | R (editor only) | **ACTIVE** |
| `neighborhood` | string | R (generate-options, full-song) | -- | R (system prompt) | R (header bg, photo shoot) | -- | R (editor only) | **ACTIVE** |
| `backstory` | string | R (generate-options, full-song, judge, concepts) | -- | R (system prompt, living context) | -- | -- | R (editor only) | **ACTIVE — heavily used** |
| `significantEvents` | string[] | R (concepts, mix only) | -- | -- | -- | -- | R (editor only) | **LIGHT USE — only 2 endpoints** |

### Identity Findings
- All fields are used somewhere. No dead fields.
- `significantEvents` is the least used — only referenced in concept suggestions and mix generation. Not used in Writing Studio core (generate-options, judge-drafts, revise-section, full-song).
- `realName` is purely a fallback when `stageName` is empty.

---

## 2. SOUND TAB

| Field | Type | Writing Studio | Sound Studio | Artist Chat | Image Gen | Suno Prompt | UI Display | Verdict |
|-------|------|---------------|-------------|-------------|-----------|-------------|------------|---------|
| `genres` | string[] | R (generate-options, full-song) | R (loads into settings, genre picker) | -- | R (header bg) | R (style prompt) | R (card badges, constellation, genre cascade) | **ACTIVE — most used field** |
| `subgenres` | string[] | R (generate-options, full-song) | R (loads into settings) | -- | R (header bg) | R (style prompt) | R (constellation, genre cascade) | **ACTIVE** |
| `microgenres` | string[] | -- | R (loads into settings) | -- | -- | -- | R (constellation, genre cascade) | **LIGHT USE — Sound Studio + UI only** |
| `genreEvolution` | GenreEra[] | -- | -- | -- | -- | -- | R (SoundTab timeline display only) | **DEAD — display only, never consumed by any API** |
| `vocalTextures` | string[] | R (generate-options, full-song) | -- | -- | -- | R (vocal prompt) | R (SoundTab editor, constellation) | **ACTIVE** |
| `flowStyle` | string | -- | -- | -- | -- | -- | W (SoundTab editor only) | **DEAD — editable but never read by any API or prompt** |
| `productionPreferences` | string[] | R (generate-options, full-song) | R (loads as productionTags, artist fit matching) | -- | -- | R (style prompt) | R (constellation) | **ACTIVE** |
| `keyCollaborators` | string[] | -- | -- | -- | -- | -- | W (SoundTab editor only) | **DEAD — editable but never read by any API or prompt** |
| `artistInfluences` | string[] | R (generate-options, full-song) | -- | -- | -- | R (style prompt) | R (constellation, magic wand context) | **ACTIVE** |
| `melodyBias` | number (0-100) | R (generate-options, full-song, mix) | -- | -- | -- | R (vocal prompt: rap vs singing) | R (MelodyBiasSlider) | **ACTIVE** |
| `language` | string | -- | -- | -- | -- | -- | W (SoundTab editor), R (suggest context only) | **BARELY USED — only in suggestion context** |
| `secondaryLanguages` | string[] | -- | -- | -- | -- | -- | W (SoundTab editor only) | **DEAD — editable but never read anywhere** |
| `soundDescription` | string | -- | -- | -- | -- | -- | R (mix, concepts, constellation fill %) | **LIGHT USE — 2 endpoints + UI** |
| `instruments` | string[] | R (generate-options, full-song) | R (loads into settings, artist fit) | -- | -- | -- | R (SoundTab grid) | **ACTIVE** |
| `rhymeTypes` | RhymeType[] | R (generate-options, full-song, judge, revise) | -- | -- | -- | -- | R (SoundTab toggles) | **ACTIVE — all Writing Studio endpoints** |
| `rhymePatterns` | RhymePattern[] | R (generate-options, full-song, judge, revise) | -- | -- | -- | -- | R (SoundTab toggles) | **ACTIVE — all Writing Studio endpoints** |
| `rhymeDensity` | number (0-100) | R (generate-options, full-song, judge, revise) | -- | -- | -- | -- | R (SoundTab slider) | **ACTIVE — all Writing Studio endpoints** |

### Sound Findings
- **3 DEAD FIELDS:**
  - `flowStyle` — user can edit it, but NO API or prompt ever reads it
  - `keyCollaborators` — user can edit it, but NO API or prompt ever reads it
  - `secondaryLanguages` — user can edit it, but NO API or prompt ever reads it
- `genreEvolution` is display-only — shown as a timeline in the UI but never consumed by any generation endpoint
- `language` is barely used — only passed as context to the suggestion endpoint
- `microgenres` only feeds Sound Studio settings and constellation display; not used in Writing Studio

---

## 3. PERSONA TAB

| Field | Type | Writing Studio | Sound Studio | Artist Chat | Image Gen | Suno Prompt | Other | Verdict |
|-------|------|---------------|-------------|-------------|-----------|-------------|-------|---------|
| `traits` | string[] | R (generate-options, full-song, concepts) | R (artist fit mood matching) | R (system prompt, living context) | R (photo shoot personality) | -- | R (constellation, suggest context) | **ACTIVE — heavily used** |
| `likes` | string[] | R (generate-options, full-song, concepts) | -- | R (system prompt, living context) | R (photo shoot activity context) | -- | R (constellation) | **ACTIVE** |
| `dislikes` | string[] | R (generate-options, full-song, concepts) | -- | -- | -- | -- | R (constellation, low importance 0.4) | **ACTIVE but limited** |
| `attitude` | string | R (generate-options, full-song, judge, concepts) | R (artist fit mood matching) | R (system prompt) | R (header bg mood mapping, photo shoot) | R (vocal prompt: "{attitude} tone") | R (constellation atmosphere) | **ACTIVE — most connected persona field** |
| `worldview` | string | R (generate-options, full-song, judge, concepts) | -- | -- | R (header bg atmosphere) | -- | R (constellation glow, suggest context) | **ACTIVE** |

### Persona Findings
- All 5 fields are actively used. No dead fields.
- `attitude` is the most connected — feeds Writing Studio, Sound Studio mood matching, Chat, Suno vocal prompt, header bg generation, constellation atmosphere, and photo shoots.
- `dislikes` is the weakest — used in Writing Studio ("themes they avoid") and constellation only. Not used in Chat or image gen.

---

## 4. LEXICON TAB

| Field | Type | Writing Studio | Sound Studio | Artist Chat | Image Gen | Suno Prompt | Other | Verdict |
|-------|------|---------------|-------------|-------------|-----------|-------------|-------|---------|
| `signaturePhrases` | string[] | R (generate-options, full-song, judge, revise, concepts, mix) | -- | R (system prompt) | -- | -- | R (constellation, importance 1.0) | **ACTIVE — all endpoints** |
| `slang` | string[] | R (generate-options, full-song, judge, concepts, mix) | -- | R (system prompt) | -- | -- | R (constellation) | **ACTIVE** |
| `bannedWords` | string[] | R (generate-options, full-song, concepts, mix, revise) — **HARD CONSTRAINT: "NEVER use"** | -- | -- | -- | -- | R (constellation, low importance 0.3) | **ACTIVE — critical constraint** |
| `adLibs` | string[] | R (generate-options, full-song, concepts, mix) | -- | R (system prompt) | -- | R (vocal prompt: first 3 ad-libs) | R (constellation) | **ACTIVE** |

### Lexicon Findings
- All 4 fields are actively used. No dead fields.
- `bannedWords` is treated as a hard constraint ("NEVER use these words") in all generation endpoints.
- `signaturePhrases` has the highest constellation importance (1.0).
- `adLibs` feeds into the Suno vocal prompt (first 3 only).
- `bannedWords` is NOT enforced in Artist Chat — the chat personality does not receive banned words as a constraint.

---

## 5. LOOK TAB

| Field | Type | Portrait Gen | Character Sheet | Photo Shoot | Chat Photo | Header BG | Living Context | UI | Verdict |
|-------|------|-------------|----------------|-------------|------------|-----------|---------------|-----|---------|
| `skinTone` | string | R | R | R | R | -- | -- | R (ProfileSubTab) | **ACTIVE — all image gen** |
| `hairStyle` | string | R | R (+ color reference) | R | R | -- | -- | R (ProfileSubTab) | **ACTIVE — all image gen** |
| `fashionStyle` | string | R | R (fallback if no wardrobeStyle) | R | R | R | R | R (ProfileSubTab) | **ACTIVE — most used look field** |
| `wardrobeStyle` | string | R (random outfit override) | R (random outfit override) | -- | -- | -- | -- | R (ProfileSubTab) | **ACTIVE but limited — only portrait + character sheet** |
| `jewelry` | string | R | R | R | R (conditional: skip if "minimal") | -- | -- | R (ProfileSubTab) | **ACTIVE** |
| `tattoos` | string | R | R (explicit tattoo map) | R | R (conditional: skip if "none") | -- | -- | R (ProfileSubTab) | **ACTIVE** |
| `visualDescription` | string | R | R (body type/build) | R | R (implied) | -- | -- | R (ProfileSubTab) | **ACTIVE** |
| `portraitUrl` | string | -- | -- | -- | R (reference image fallback) | -- | -- | R (ProfileSubTab thumbnail, ArtistCard avatar) | **ACTIVE — display + reference** |
| `characterSheetUrl` | string | -- | -- | R (identity reference) | R (identity reference) | -- | -- | R (ProfileSubTab thumbnail, CharacterSheetSubTab) | **CRITICAL — identity lock for all subsequent images** |
| `gallery` | ArtistGalleryItem[] | APPENDS | APPENDS | APPENDS | APPENDS | -- | -- | R (GallerySubTab: filter, view, download, delete) | **ACTIVE — all image gen writes to it** |

### Look Findings
- All fields are actively used. No dead fields.
- `characterSheetUrl` is the most critical — it's passed as a reference image to portrait gen, photo shoot gen, and chat photo gen to maintain "same person" visual consistency.
- `wardrobeStyle` is a wildcard override — when set, it generates random outfits instead of using `fashionStyle`.
- `gallery` is append-only from 4 sources: character sheet, portrait, photo shoot, chat photo.

---

## 6. CATALOG TAB

| Field | Type | Writing Studio | Sound Studio | Artist Chat | Other | Verdict |
|-------|------|---------------|-------------|-------------|-------|---------|
| `entries` | CatalogEntry[] | R (generate-options: shows existing titles) | -- | -- | R (concept suggestions: avoid duplicates) | **ACTIVE** |
| `entries[].title` | string | R | -- | -- | R (concepts) | **ACTIVE** |
| `entries[].lyrics` | string | R (triggers analysis) | -- | -- | -- | **ACTIVE** |
| `entries[].mood` | string | R (analysis input) | -- | -- | -- | **ACTIVE** |
| `entries[].tempo` | string | R (analysis input) | -- | -- | -- | **ACTIVE** |
| `entries[].analysis` | CatalogSongAnalysis | R (genome calculation input) | -- | -- | -- | **ACTIVE** |
| `entries[].analysisStatus` | AnalysisStatus | -- | -- | -- | R (UI status indicator) | **ACTIVE (UI)** |
| `genome` | CatalogGenome | R (all 5 Writing Studio endpoints) | -- | -- | R (mix generation) | **ACTIVE — critical for writing quality** |
| `genome.essenceStatement` | string | R (generate-options, full-song, judge, revise) | -- | -- | R (mix) | **ACTIVE — the core "ghostwriter instructions"** |
| `genome.rhymeProfile` | string | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.storytellingProfile` | string | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.vocabularyProfile` | string | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.blueprint.mustInclude` | string[] | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.blueprint.shouldInclude` | string[] | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.blueprint.avoidRepeating` | string[] | R (generate-options, full-song) | -- | -- | R (mix) | **ACTIVE** |
| `genome.blueprint.suggestExploring` | string[] | -- | -- | -- | -- | **DEAD — defined but never read by any API** |
| `genome.signatures` | GenomeTrait[] | -- | -- | -- | -- | **UI ONLY — displayed in CatalogTab GenomePanel** |
| `genome.tendencies` | GenomeTrait[] | -- | -- | -- | -- | **UI ONLY — displayed in CatalogTab GenomePanel** |
| `genome.experiments` | GenomeTrait[] | -- | -- | -- | -- | **UI ONLY — displayed in CatalogTab GenomePanel** |
| `genome.dominantThemes` | string[] | -- | -- | -- | -- | **UI ONLY — displayed in GenomePanel** |
| `genome.dominantMood` | string | -- | -- | -- | -- | **UI ONLY — displayed in GenomePanel** |
| `genome.songCount` | number | -- | -- | -- | -- | **UI ONLY** |
| `genome.calculatedAt` | string | -- | -- | -- | -- | **UI ONLY** |
| `genomeStatus` | GenomeStatus | -- | -- | -- | -- | **UI ONLY — loading spinner** |

### Catalog Findings
- `genome.blueprint.suggestExploring` is DEAD — defined in the type, calculated by the genome API, displayed in the GenomePanel UI, but **never consumed by any generation endpoint**.
- Several genome sub-fields (`signatures`, `tendencies`, `experiments`, `dominantThemes`, `dominantMood`, `songCount`, `calculatedAt`) are **display-only** — shown in the UI but not fed into any Writing Studio prompts. The generation endpoints only use `essenceStatement`, `rhymeProfile`, `storytellingProfile`, `vocabularyProfile`, and `blueprint.mustInclude/shouldInclude/avoidRepeating`.

---

## 7. TOP-LEVEL DNA FIELDS

| Field | Type | Used By | Verdict |
|-------|------|---------|---------|
| `headerBackgroundUrl` | string | Generated by generate-header-bg API. Displayed as editor header background. | **ACTIVE (cosmetic)** |
| `lowConfidenceFields` | string[] | Written by seed-from-artist (Pass 1+2). Displayed as warning badges in editor. | **ACTIVE (guidance)** |
| `socialCircle` | ArtistSocialCircle | R (living-context.service.ts: entourage, hangout spots, transportation) | **ACTIVE — living context only** |
| `phone` | PhoneProfile | R (chat photo: determines image quality grainy vs pro) | **ACTIVE — chat photo quality only** |

---

## DEAD / UNDERUSED FIELDS SUMMARY

### Completely Dead (editable but never consumed)
| Field | Section | What It Is | Recommendation |
|-------|---------|-----------|----------------|
| `flowStyle` | Sound | Rap flow or singing phrasing style | **Wire into Writing Studio prompts** — should influence how lyrics are structured |
| `keyCollaborators` | Sound | Known musical collaborators | **Wire into concept suggestions** — could suggest collaboration-themed concepts |
| `secondaryLanguages` | Sound | Additional languages the artist uses | **Wire into Writing Studio** — could trigger bilingual lyrics generation |

### Display-Only (calculated but not consumed by generation)
| Field | Section | What It Is | Recommendation |
|-------|---------|-----------|----------------|
| `genreEvolution` | Sound | How artist's sound changed over eras | **Wire into Writing Studio** — could influence era-appropriate writing |
| `genome.signatures` | Catalog | Traits in 80%+ of songs | **Already covered by essenceStatement** — low priority |
| `genome.tendencies` | Catalog | Traits in 40-79% of songs | **Already covered by essenceStatement** — low priority |
| `genome.experiments` | Catalog | Traits in <40% of songs | **Could feed "suggestExploring" in prompts** |
| `genome.dominantThemes` | Catalog | Top recurring themes | **Wire into concept suggestions** — avoid suggesting these again |
| `genome.dominantMood` | Catalog | Overall emotional character | **Wire into tone defaults** in Writing Studio |
| `genome.blueprint.suggestExploring` | Catalog | New creative directions | **Wire into concept suggestions** — actively recommend these |

### Barely Used
| Field | Section | Current Use | Recommendation |
|-------|---------|-------------|----------------|
| `significantEvents` | Identity | Only concept suggestions + mix | **Wire into Writing Studio** — events should be available as lyric material |
| `language` | Sound | Only suggestion context | **Wire into Writing Studio** — should set output language |
| `microgenres` | Sound | Sound Studio settings + constellation | **Wire into Suno prompt builder** |
| `dislikes` | Persona | Writing Studio + constellation | **Wire into Chat** — artist should express dislikes in conversation |
| `soundDescription` | Sound | Mix + concepts + constellation fill | **Wire into header bg** — could influence visual atmosphere |

### Missing from Chat Constraints
| Field | Section | Issue |
|-------|---------|-------|
| `bannedWords` | Lexicon | **NOT enforced in Artist Chat** — artist personality doesn't receive banned words, so chat responses may use words the artist would never say |

---

## FEATURE GAPS IDENTIFIED

### 1. Artist Deletion — Incomplete Cascade
Current delete removes `artist_profiles` row only. Orphaned data remains in:
- `artist_chat_messages`
- `artist_memories`
- `artist_personality_prints`
- `sound_studio_presets`
- Supabase Storage images (portraits, character sheets, photos, headers)

### 2. No Artist Export
No way to export an artist as JSON for backup, sharing, or migration.

### 3. Dead Fields Waste User Input
Users can fill in `flowStyle`, `keyCollaborators`, and `secondaryLanguages` but the data goes nowhere. Either wire them into prompts or remove them from the editor.

### 4. Genome Sub-Fields Underutilized
The genome calculation produces rich data (`signatures`, `tendencies`, `experiments`, `dominantThemes`, `dominantMood`, `suggestExploring`) that is displayed in the UI but never fed back into generation. Only `essenceStatement` and the text profiles are actually consumed.

### 5. bannedWords Not in Chat
Artist Chat doesn't enforce `bannedWords` — the chat persona may use words the artist explicitly bans.
