# Artist Judge — Writing Studio Quality Upgrade

**Date:** 2026-03-05
**Status:** Approved
**Feature:** Music Lab → Writing Studio

---

## Problem

The Writing Studio generates 4 draft options per section, but:
1. Rhyme schemes are requested in the prompt but not enforced — the LLM often ignores AABB/ABAB patterns
2. No quality scoring on generated drafts — users must manually evaluate all 4
3. No artist voice in the review process — drafts feel generic despite DNA injection
4. No way to give creative direction before or after generation

## Solution: Artist-as-Judge System

Add a post-generation scoring pass where the AI, acting as the artist persona, reviews all 4 drafts. Add pre-generation creative direction and post-selection revision notes.

## Design

### 1. Pre-Generation: Artist Direction

New text input in StudioTab — "What vibe are you going for?"

- Free text, 1-3 sentences
- Examples: "Late night confession", "Victory lap energy", "Conversational, like telling a friend"
- Injected into generation prompt as `ARTIST DIRECTION: [text]`
- Per-section direction also available in FullSongBuilder section cards

### 2. Generation (Unchanged)

Same 4-draft generation. Same model (gpt-4.1), same prompt structure. Only addition is the artist direction text.

### 3. Post-Generation: Artist Judge Pass

**New API route:** `POST /api/artist-dna/judge-drafts`

Second LLM call where AI becomes the artist and reviews their own work.

**Prompt context:**
- Full artist identity (name, city, backstory, attitude, worldview)
- Artist direction text (the vibe they were going for)
- Rhyming DNA (types, patterns, density)
- Catalog genome essence statement
- The 4 generated drafts

**Per-draft output:**
- `vibe` — 1-2 sentence gut reaction in the artist's voice
- `score` — 1-10 overall quality
- `rhymeScore` — 1-10 rhyme adherence to their style
- `lineNotes` — specific lines that need work with suggestions
- `wouldKeep` — boolean, would the artist actually use this?
- Ranking of all 4 with reasoning

**Model:** gpt-4.1 via OpenRouter, temperature 0.7

### 4. UI: Scored Draft Grid

Upgrade existing OptionGrid:
- Drafts sorted by artist preference (best first)
- Score badges (overall + rhyme) as colored pills
- Artist vibe quote at top of each card in italics
- Line highlights — hover to see artist's note and suggestion
- "Would Keep" indicator on approved drafts

### 5. Post-Selection: Revision Notes

After selecting a draft (Keep), new input: "Any notes for revision?"

- Free text for targeted feedback
- Examples: "Make verse 2 punchier", "Extend to 24 bars", "Swap the metaphor in line 3"

**New API route:** `POST /api/artist-dna/revise-section`

Targeted rewrite using:
- Selected draft as base
- Artist's revision notes
- Judge's line notes for context
- Original artist DNA + genome

### 6. Data Flow

```
User sets vibe direction (optional)
    ↓
Generate 4 drafts (existing + direction injected)
    ↓
Artist Judge scores & ranks all 4
    ↓
UI shows ranked drafts with scores + artist notes
    ↓
User selects best → optionally gives revision notes
    ↓
Revision pass (targeted rewrite with critique context)
    ↓
Final draft locked into song
```

### 7. New Types

```typescript
interface ArtistJudgment {
  draftIndex: number
  vibe: string
  score: number
  rhymeScore: number
  lineNotes: LineNote[]
  wouldKeep: boolean
}

interface LineNote {
  lineNumber: number
  note: string
  suggestion?: string
}

interface JudgeResult {
  judgments: ArtistJudgment[]
  ranking: number[]
  rankingReason: string
}
```

### 8. Files to Create/Modify

**New files:**
- `src/app/api/artist-dna/judge-drafts/route.ts` — Judge API route
- `src/app/api/artist-dna/revise-section/route.ts` — Revision API route

**Modified files:**
- `src/features/music-lab/types/writing-studio.types.ts` — Add judge types
- `src/features/music-lab/store/writing-studio.store.ts` — Add judge state, direction state
- `src/features/music-lab/components/writing-studio/StudioTab.tsx` — Add direction input
- `src/features/music-lab/components/writing-studio/OptionGrid.tsx` — Scored cards with notes
- `src/features/music-lab/components/writing-studio/FullSongBuilder.tsx` — Per-section direction
- `src/app/api/artist-dna/generate-full-song/route.ts` — Inject artist direction into prompt

## Approach

Approach A: Artist Judge Layer — chosen over prompt-only fixes (B) and phonetic validator (C) because it creates a feedback loop where the artist's voice shapes output quality, without over-engineering.
