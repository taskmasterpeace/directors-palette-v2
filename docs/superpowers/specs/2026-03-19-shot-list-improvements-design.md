# Shot List Generator Improvements — Design Spec

**Date:** 2026-03-19
**Status:** Approved
**Context:** Side-by-side comparison of DP's auto-generated shot list vs a hand-crafted 100-shot list for a 10-chapter battle rap documentary revealed major gaps: limited shot types, over-saturated character visibility, no chapter numbering, no title cards in sequence, truncated context, no abstract shots, and no cross-batch coherence.

---

## Scope — 6 Fixes (3 Phases)

### Phase 1: Prompt & Type Changes (immediate quality boost)

**Fix 1 — Expand Shot Types + Abstract/Metaphor Instructions**
- Add 5 new shot types: `over_shoulder`, `title_card`, `text_overlay`, `abstract`, `montage`
- Update type definition in `storyboard.types.ts` (line 641)
- Update tool schema enum in `openrouter.service.ts` (line 368)
- Add shot type usage guide to system prompt
- Add VISUAL STORYTELLING section to system prompt:
  - Instruct LLM to visualize meaning, not just literal scenes
  - Provide examples of abstract shots (untouched trophy, slot machine metaphor, split-frame duality)
  - Use `text_overlay` for stats, quotes, social media reactions, documents
  - Include abstract and metaphor shots where the story calls for them

**Fix 2 — Dynamic Character Visibility**
- Remove hardcoded "70% of shots" rule from system prompt (lines 299, 340)
- Replace with: "Vary main character visibility based on genre. Documentaries: 40-50%. Character dramas: 60-70%. Fill remaining shots with crowd reactions, locations, abstract visuals, text overlays, and atmospheric mood shots."
- No UI — LLM decides dynamically per story
- No output field needed — this is a behavioral prompt instruction, not a declared value

**Fix 5 — Narrative Summary Context**
- Before first shot generation batch, make one LLM call to summarize the full script into a structured ~1,500 char brief
- Brief includes: overall arc, key characters, visual themes, emotional progression per chapter, explicit callbacks
- Replace the 2,000 char truncation with: narrative summary (global) + current chapter text (local)
- Summary is generated once in the API route before the batch loop, held in a local variable, and passed into each batch call. No new caching infrastructure.
- **Short script optimization:** If storyText is under 2,000 chars, skip the summary call and pass the full text directly

### Phase 2: Pipeline & Data Flow

**Fix 3 — Chapter-Based Shot Numbering**
- Pass chapter metadata from documentary pipeline to prompt generation
- Accept `chapterPrefix` parameter in generate-prompts API (e.g., "C3")
- Number shots as C1-01, C1-02, C2-01, etc.
- Keep `sequence: number` for sorting. Add `chapterLabel: string` as a display-only field (e.g., "C3-05"). This avoids breaking every sort comparison in the codebase.

**Fix 4 — Title Card Integration**
- After title cards are created (pipeline step 4), inject them into the shot sequence as `shotType: 'title_card'` entries
- **Convention:** Title cards are always `CX-00` (zero-indexed preamble). Real shots start at `CX-01`.
- Title cards appear in CSV export and gallery
- No longer stored separately from shots
- Title card images are generated through the same shot generation queue (they already have prompts from `buildTitleCardPrompt`)

### Phase 3: Coherence Review

**Fix 7 — Coherence Pass**
- New toggle switch in the shot generation UI (off by default)
- When enabled, after all shot batches complete, runs one final LLM call reviewing the FULL shot list with the narrative summary
- LLM returns up to **10 suggestions max**, each as a structured object:

```typescript
interface CoherenceSuggestion {
  id: string
  type: 'edit' | 'insert'
  targetSequence: number        // which shot to edit or insert after
  description: string           // human-readable explanation
  newPrompt?: string            // for edits: replacement prompt
  newShot?: {                   // for inserts: new shot to add
    prompt: string
    shotType: ShotType
    characterTags: string[]
  }
}
```

- Suggestions cover: visual callbacks/parallels, missing shot types, pacing issues (5+ consecutive same-character), motif consistency
- **UI: Display-only with accept/reject.** Each suggestion shows the description + a checkbox. Accepted edits update the shot prompt. Accepted inserts add a new shot at the specified position.
- New API endpoint: `/api/storyboard/coherence-pass`

---

## What's OUT (explicitly excluded)

- Character visibility slider (LLM decides dynamically)
- Visual motifs UI (style sheets / LoRAs handle visual consistency)
- Color palette selector (styles cover this)
- Multi-look character variants (character sheet + prompt description is sufficient)

---

## Files Affected

| File | Changes |
|------|---------|
| `src/features/storyboard/types/storyboard.types.ts` | Expand ShotType enum, add `chapterLabel` field |
| `src/features/storyboard/services/openrouter.service.ts` | System prompt rewrite (visibility, abstract shots, shot type guide, visual storytelling), tool schema enum, add `generateNarrativeSummary()` method |
| `src/app/api/storyboard/generate-prompts/route.ts` | Accept `chapterPrefix`, generate narrative summary before batch loop, pass to each batch |
| `src/features/storyboard/hooks/useDocumentaryPipeline.ts` | Inject title cards into shot sequence, pass chapter prefix per batch, add coherence pass step |
| `src/features/storyboard/services/title-card.service.ts` | Return `GeneratedShotPrompt` instead of `TitleCard` |
| `src/app/api/storyboard/coherence-pass/route.ts` | New endpoint — reviews full shot list, returns max 10 structured suggestions |
| Shot generation UI component | Add coherence pass toggle switch |
| CSV export logic | Include title_card shots |

---

## Implementation Order

1. **Phase 1** (Fixes 1, 2, 5): Shot types + prompts + narrative summary. Immediate quality improvement.
2. **Phase 2** (Fixes 3, 4): Chapter numbering + title card injection. Structural awareness.
3. **Phase 3** (Fix 7): Coherence pass with accept/reject UI. Full documentary-grade upgrade.

---

## Test Case

Re-run the Twork script after each phase. Compare against `stories/twork/shot_list.csv`.

| Metric | Current (DP) | Target |
|--------|-------------|--------|
| Main character visibility | 80% | 40-50% (LLM-decided) |
| Title cards in sequence | 0 | 11 |
| Abstract/metaphor shots | 0 | Where story calls for them |
| Shot types used | 5 | 10 |
| Chapter-based numbering | No | Yes (CX-00 for title cards, CX-01+ for shots) |
| Context awareness | 2,000 char truncation | Full narrative summary |
| Cross-batch coherence | None | 10 suggestions max |
