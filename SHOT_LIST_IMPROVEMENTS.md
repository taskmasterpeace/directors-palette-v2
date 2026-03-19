# Shot List Generator: Improvement Plan

**Date:** 2026-03-19
**Context:** Side-by-side comparison of DP's auto-generated shot list vs a hand-crafted 100-shot list for a 10-chapter battle rap documentary ("Nu Jerzey Twork: Consistently Inconsistent"). The DP list produced 243 shots with the main character visible in 80% of them, no title cards integrated into the sequence, no abstract/metaphor shots, no young-vs-mature character distinction across a 10-year timeline, and flat sequential numbering that didn't match the script's chapter structure.

This document describes 9 concrete improvements, ordered by implementation effort. Each includes the root cause, the affected files with line numbers, and the proposed fix.

---

## 1. Expand the Shot Type Vocabulary

**Problem:** The shot type enum only allows 5 types: `establishing | wide | medium | close-up | detail`. This prevents the LLM from generating title cards, text overlays, abstract/metaphor shots, montages, or over-the-shoulder shots — all of which are standard in documentary and narrative content.

**Root cause:** Hard-coded enum in types and enforced via the tool-calling schema.

**Files:**
- `src/features/storyboard/types/storyboard.types.ts` line 641
- `src/features/storyboard/services/openrouter.service.ts` line 368 (tool schema enum)

**Current code:**
```typescript
// storyboard.types.ts:641
export type ShotType = 'establishing' | 'wide' | 'medium' | 'close-up' | 'detail' | 'unknown'

// openrouter.service.ts:368
enum: ['establishing', 'wide', 'medium', 'close-up', 'detail'],
```

**Proposed change:**
```typescript
export type ShotType =
    | 'establishing'
    | 'wide'
    | 'medium'
    | 'close-up'
    | 'detail'
    | 'over_shoulder'
    | 'title_card'
    | 'text_overlay'
    | 'abstract'
    | 'montage'
    | 'unknown'
```

Add usage guidance to the system prompt (openrouter.service.ts ~line 313):
```
SHOT TYPE GUIDE:
- establishing: Wide view introducing a new location or scene
- wide: Full scene with multiple subjects visible
- medium: Subject from waist up, standard conversational framing
- close-up: Face or single detail fills the frame
- detail: Extreme close on a prop, hand, texture, or object
- over_shoulder: Shot from behind one subject looking at another
- title_card: Chapter/section title text with atmospheric background, NO characters
- text_overlay: Social media posts, stats, quotes, documents rendered in the visual style
- abstract: Visual metaphor or symbolic imagery — not a literal depiction of the narration
- montage: Multi-panel or rapid-sequence composite showing progression or comparison
```

**Effort:** ~30 minutes. Type change + enum update + prompt addition.

---

## 2. Make Main Character Visibility Configurable

**Problem:** The system prompt hardcodes "Main characters MUST appear in at least 70% of shots." For the Twork documentary, this produced 80% character saturation. The hand-crafted list used ~40% and felt better — more breathing room, more visual variety.

**Root cause:** Hardcoded in two places in the system prompt.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` line 299 and line 340

**Current code:**
```
// Line 299
- Main characters MUST appear in at least 70% of shots — they are the visual through-line

// Line 340
- The main character should appear in 70%+ of all shots
```

**Proposed change:** Accept a `characterVisibilityTarget` parameter (default: 50%) in `generateShotPrompts()`. Interpolate it into the prompt:

```
- Main characters should appear in approximately {characterVisibilityTarget}% of shots
- Fill remaining shots with: crowd reactions, location establishing shots, abstract visuals,
  text overlays, opponent/supporting character features, and atmospheric mood shots
- NOT every shot needs the main character — visual variety prevents fatigue
```

Pass this through from the API route (`/api/storyboard/generate-prompts`) so the UI can expose it as a slider (0-100%).

**Effort:** ~30 minutes. Add parameter to service function signature, API route body, and interpolate into prompt string.

---

## 3. Chapter-Based Shot Numbering

**Problem:** Shots are numbered sequentially (1, 2, 3... 243) regardless of chapter boundaries. The script has Prologue + 9 Chapters + Epilogue (11 sections), but the output had 16 flat sequences. This makes it impossible to navigate or reference shots by chapter.

**Root cause:** The prompt generation step doesn't receive chapter boundary information. It just numbers shots from 1. The chapter detection system (`chapter-detection.service.ts`) already detects boundaries, but that output isn't passed downstream to prompt generation.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` lines 311, 336-337
- `src/app/api/storyboard/generate-prompts/route.ts`
- `src/features/storyboard/hooks/useDocumentaryPipeline.ts`

**Proposed change:**

1. When the documentary pipeline detects chapters (step 2, line 80-81), pass chapter metadata to the prompt generation step.

2. In the generate-prompts API route, accept an optional `chapterPrefix` parameter (e.g., `"C3"`).

3. In the system prompt, replace:
   ```
   Number shots sequentially starting from 1
   ```
   with:
   ```
   Number shots as {chapterPrefix}-01, {chapterPrefix}-02, etc.
   ```

4. When generating shots per-chapter in documentary mode, pass the chapter prefix for each batch.

**Effort:** ~1 hour. Plumb the chapter prefix through the pipeline and update the prompt + tool schema (sequence becomes string).

---

## 4. Integrate Title Cards Into the Shot Pipeline

**Problem:** `title-card.service.ts` exists and the documentary pipeline creates title cards (step 4, line 101-103), but they are stored separately from the shot sequence. The shot list CSV export doesn't include them. When you export a shot list, there are no chapter breaks.

**Root cause:** Title cards live in `DocumentaryChapter.titleCard` as a separate object, not as a `GeneratedShotPrompt` in the shots array.

**Files:**
- `src/features/storyboard/services/title-card.service.ts`
- `src/features/storyboard/hooks/useDocumentaryPipeline.ts` lines 101-103
- Shot list export logic (CSV generation)

**Proposed change:**

After title cards are created (step 4), inject them into the segments array as shots with `shotType: 'title_card'` before prompt generation begins. Each title card becomes the first shot of its chapter:

```typescript
// After step 4 (line 103), before step 5:
// Inject title cards as shot segments at the start of each chapter
for (const chapter of chaptersWithSegments) {
    const titleCardSegment: GeneratedShotPrompt = {
        sequence: 0, // will be renumbered
        originalText: `Chapter title: ${chapter.name}`,
        prompt: buildTitleCardPrompt(chapter.name, stylePrompt),
        shotType: 'title_card',
        characterRefs: [],
        edited: false,
    }
    // Insert at the beginning of this chapter's shot sequence
}
```

This ensures title cards appear in the exported CSV and maintain proper sequencing.

**Effort:** ~1-2 hours. Modify pipeline to inject title card shots, update CSV export to include them.

---

## 5. Add Visual Motif Injection

**Problem:** There's no way to define recurring visual rules like "choke scenes use cold blue lighting" or "peak performance uses warm gold lighting." Each batch of 15 shots is generated independently without shared visual language.

**Root cause:** No dedicated motif/rule input. The `stylePrompt` parameter exists but is meant for general art style, not scene-specific rules.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` lines 247-318 (system prompt)
- `src/app/api/storyboard/generate-prompts/route.ts` (API input)

**Proposed change:**

1. Add a `visualMotifs` parameter to the generate-prompts API:

```typescript
interface VisualMotif {
    trigger: string      // keyword or theme that activates this rule
    rule: string         // visual treatment to apply
}

// Example input:
visualMotifs: [
    { trigger: "choke", rule: "Cold blue lighting, character searching ceiling, tense atmosphere" },
    { trigger: "peak performance", rule: "Warm gold lighting, locked-in posture, crowd erupting" },
    { trigger: "no-show", rule: "Empty spotlight on stage, cold harsh lighting, disappointed crowd" },
    { trigger: "preparation", rule: "Show unfinished notebook, dim room, clock visible" }
]
```

2. Append to the system prompt:

```
VISUAL MOTIFS (apply these when the trigger theme appears in a segment):
${visualMotifs.map(m => `- When the scene involves "${m.trigger}": ${m.rule}`).join('\n')}
```

This ensures every batch of 15 shots knows the visual language without relying on truncated story context.

**Effort:** ~1 hour. New parameter, prompt injection, API route update.

---

## 6. Multi-Look Character Support

**Problem:** The character extraction endpoint produces one visual description per character. For a documentary spanning 10 years, the main character needs multiple looks (e.g., "young Twork 2016-2018" vs "mature Twork 2023-2025"). Currently there's no way to express this.

**Root cause:** The extract endpoint (`/api/storyboard/extract`) asks the LLM for one description string per character. The `@character_name` system supports arbitrary entries, but doesn't auto-detect appearance changes.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` lines 120-150 (extraction prompt)
- `src/features/storyboard/types/storyboard.types.ts` (StoryboardCharacter type)

**Proposed change (Phase 1 — manual):**

Allow users to split a character into variants in the extraction UI. When the user clicks "Add variant" on a character:
- Clone the character entry
- Append a suffix: `@nu_jerzey_twork` becomes `@nu_jerzey_twork_young` and `@nu_jerzey_twork_mature`
- Each variant gets its own description and an optional chapter range (e.g., "Prologue through Chapter 6" vs "Chapter 7 onward")
- Pass chapter ranges to prompt generation so the LLM uses the correct variant per chapter

**Proposed change (Phase 2 — auto-detect):**

Update the extraction prompt to ask:
```
For each character, assess whether their appearance changes significantly across the story
(aging, costume changes, before/after transformation). If so, create SEPARATE entries for
each distinct look with a chapter_range field indicating when each look applies.

Example: A character who ages from teenager to adult across the story should have two entries:
- @character_name_young (chapters 1-5): "teenage boy, 16, school uniform, baby-faced"
- @character_name_adult (chapters 6-10): "adult man, 30s, business suit, weathered face"
```

**Effort:** Phase 1: ~2-3 hours (UI + extraction logic). Phase 2: ~1 hour additional (prompt update + post-processing to split entries).

---

## 7. Replace Truncated Context With Narrative Summary

**Problem:** Story context is truncated to 2,000 characters (openrouter.service.ts line 282). For a 10-chapter documentary script, this means the LLM generating shots for Chapter 9 has zero awareness of Chapters 1-8. Cross-references ("callback to the opening shot"), thematic arcs, and character development are invisible.

**Root cause:** Raw text truncation as a token-saving measure.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` line 282

**Current code:**
```typescript
const storyOverview = storyContext
    ? `\n\nFull story context for reference:\n${storyContext.substring(0, 2000)}${storyContext.length > 2000 ? '...' : ''}`
    : ''
```

**Proposed change:**

Add a pre-processing step that generates a narrative summary before shot generation begins. This could be:

**Option A — LLM-generated summary (recommended):**
Before the first batch of shot generation, make one LLM call to summarize the full script into a structured 1,500-char brief:
```
Summarize this script for a visual director. Include:
- Overall arc (1 sentence)
- Key characters and their roles (2-3 sentences)
- Major visual themes and metaphors mentioned in the text (2-3 sentences)
- Emotional progression chapter by chapter (1 sentence per chapter)
- Any visual callbacks or parallels the text explicitly sets up

Keep under 1,500 characters. This will be used as context for every shot generation batch.
```

**Option B — Chapter-aware sliding window:**
Instead of truncating the full script, pass:
- The narrative summary (global context, ~800 chars)
- The current chapter's full text (local context, variable)
- Adjacent chapter summaries (transitional context, ~400 chars)

This gives each batch both the big picture and the local detail.

**Effort:** Option A: ~1-2 hours (new LLM call + caching the result). Option B: ~2-3 hours (summary generation + windowing logic).

---

## 8. Abstract/Metaphor Shot Generation

**Problem:** The system prompt never instructs the LLM to create non-literal visual interpretations. When the narration says "the lights went out," the LLM generates a literal shot of Twork on a dim stage — not an abstract shot of a stage going dark as a metaphor for his career. The hand-crafted list included ~10 abstract shots (burning money, slot machines, split compositions, trophy cases) that added significant visual depth.

**Root cause:** The system prompt focuses entirely on literal scene coverage. Combined with the limited shot type enum (fix #1), the model has no vocabulary or instruction for symbolic imagery.

**Files:**
- `src/features/storyboard/services/openrouter.service.ts` lines 290-311 (DIRECTOR'S APPROACH and IMPORTANT RULES)

**Proposed change:**

Add a new section to the system prompt between DIRECTOR'S APPROACH and CHARACTER COVERAGE:

```
VISUAL STORYTELLING:
- Not every shot needs to literally depict what the narration describes
- When the narration uses metaphor, irony, or thematic reflection, consider an "abstract" shot
  that visualizes the MEANING rather than the literal scene
- Examples of abstract shots:
  - Narration about wasted potential → an untouched trophy under a spotlight in a dark room
  - Narration about gambling on someone's reliability → a slot machine with the character's face
  - Narration about duality → split-frame composition with contrasting lighting on each half
  - Narration about online discourse → stylized social media feed rendered in the project's art style
- Use the "text_overlay" type for stats, quotes, social media reactions, and documents
- Use the "abstract" type for symbolic/metaphor shots
- Aim for 10-15% of shots to be abstract or text_overlay — this creates breathing room
```

This works in combination with fix #1 (expanded shot type enum) to give the LLM both the vocabulary and the instruction.

**Effort:** ~30 minutes. Prompt text addition only.

---

## 9. Post-Generation Coherence Pass

**Problem:** Shots are generated in batches of 15 segments. Batch 1 doesn't know what batch 5 will produce. This makes visual callbacks impossible — the hand-crafted list had shots like "mirror of P-05" (a teen watching battles at home in the Prologue is echoed by a fan watching Twork at home in Chapter 9). The DP list has no such cross-references.

**Root cause:** Each batch is an independent LLM call with only 2,000 chars of truncated context. No post-generation review step exists.

**Files:**
- `src/app/api/storyboard/refine-prompts/route.ts` (existing refinement endpoint — potential extension point)
- `src/features/storyboard/services/openrouter.service.ts` `refineShotPrompts()` method (~line 406)

**Proposed change:**

Add an optional "coherence pass" after all shot batches are generated. This would be a new endpoint or an extension of `refine-prompts`:

1. Collect ALL generated shots (the full list, not batched)
2. Send them to the LLM with the narrative summary (from fix #7) and visual motifs (from fix #5)
3. The prompt asks:

```
You are reviewing a complete shot list for visual coherence. Analyze ALL shots and:

1. CALLBACKS: Identify opportunities for visual parallels/callbacks between early and late shots.
   If shot C1-05 shows the character nervous backstage, and C9-02 shows a similar theme,
   suggest making them visual mirrors (same framing, different lighting).

2. MOTIF CONSISTENCY: Verify that recurring visual motifs are applied consistently.
   Flag any shots that should use a motif but don't.

3. GAPS: Identify missing shot types. If there are no title_card, text_overlay, or abstract
   shots, suggest where to add them.

4. PACING: Flag sequences of 5+ consecutive shots with the same character — suggest inserting
   a crowd reaction, location, or abstract shot to break monotony.

Return a list of suggested modifications (add, modify, or reorder shots).
```

This is the most complex fix but has the highest impact on narrative quality.

**Effort:** ~3-4 hours. New LLM call, response parsing, UI for accepting/rejecting suggestions.

---

## Implementation Priority

| # | Fix | Effort | Impact | Dependencies |
|---|-----|--------|--------|-------------|
| 1 | Expand shot type enum | 30 min | High | None |
| 2 | Configurable character visibility | 30 min | High | None |
| 8 | Abstract/metaphor shot instructions | 30 min | High | #1 |
| 3 | Chapter-based numbering | 1 hr | Medium | None |
| 5 | Visual motif injection | 1 hr | High | None |
| 4 | Title card integration | 1-2 hr | Medium | #1 |
| 7 | Narrative summary context | 1-2 hr | High | None |
| 6 | Multi-look character support | 2-3 hr | Medium | None |
| 9 | Coherence pass | 3-4 hr | Very High | #7, #5 |

**Recommended first PR:** Fixes 1, 2, and 8 together — all prompt/config changes, no architectural work, ~90 minutes total. This alone would dramatically improve the Twork shot list output.

**Recommended second PR:** Fixes 3, 5, and 7 — chapter numbering, visual motifs, and narrative summary. ~3-4 hours. This gives the system structural awareness.

**Recommended third PR:** Fixes 4, 6, and 9 — title card integration, multi-look characters, and the coherence pass. ~6-9 hours. This is the full documentary-grade upgrade.

---

## Test Case

Re-run the Twork script through the shot list generator after each PR and compare against the hand-crafted 100-shot list at `stories/twork/shot_list.csv`. Target metrics:

| Metric | Current (DP) | Target | Hand-crafted |
|--------|-------------|--------|-------------|
| Total shots | 243 | 110-130 | 100 |
| Main character visibility | 80% | 40-50% | 40% |
| Title cards | 0 | 11 | 11 |
| Abstract/metaphor shots | 0 | 10-15 | ~10 |
| Text overlay shots | ~8 | 12-15 | ~15 |
| Shot types used | 5 | 10+ | 8 |
| Chapter-based numbering | No | Yes | Yes |
| Young/mature distinction | No | Yes | Yes |
