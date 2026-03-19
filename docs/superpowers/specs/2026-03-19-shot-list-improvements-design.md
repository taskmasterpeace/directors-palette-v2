# Shot List Generator Improvements — Design Spec

**Date:** 2026-03-19
**Status:** Approved
**Context:** Side-by-side comparison of DP's auto-generated shot list vs a hand-crafted 100-shot list for a 10-chapter battle rap documentary revealed major gaps: limited shot types, over-saturated character visibility, no chapter numbering, no title cards in sequence, truncated context, no abstract shots, and no cross-batch coherence.

---

## Scope — 7 Fixes

### Phase 1: Prompt & Type Changes (immediate quality boost)

**Fix 1 — Expand Shot Type Enum**
- Add 5 new shot types: `over_shoulder`, `title_card`, `text_overlay`, `abstract`, `montage`
- Update type definition in `storyboard.types.ts` (line 641)
- Update tool schema enum in `openrouter.service.ts` (line 368)
- Add shot type usage guide to system prompt

**Fix 2 — Dynamic Character Visibility**
- Remove hardcoded "70% of shots" rule from system prompt (lines 299, 340)
- Replace with instruction: "Assess this story and decide the appropriate main character visibility percentage. State your chosen percentage, then stick to it across all shots. Consider: documentaries need more breathing room (40-50%), character dramas need more presence (60-70%). Fill non-character shots with crowd reactions, locations, abstract visuals, text overlays, and atmospheric mood shots."
- No UI — LLM decides dynamically per story

**Fix 6 — Abstract/Metaphor Shot Instructions**
- Add VISUAL STORYTELLING section to system prompt
- Instruct LLM to visualize meaning, not just literal scenes
- Provide examples of abstract shots (untouched trophy, slot machine metaphor, split-frame duality)
- Target 10-15% of shots as abstract or text_overlay
- Depends on Fix 1 for the `abstract` and `text_overlay` shot types

### Phase 2: Pipeline & Data Flow

**Fix 3 — Chapter-Based Shot Numbering**
- Pass chapter metadata from documentary pipeline to prompt generation
- Accept `chapterPrefix` parameter in generate-prompts API (e.g., "C3")
- Number shots as C1-01, C1-02, C2-01, etc.
- `sequence` field becomes string in GeneratedShotPrompt type (or add `chapteredSequence` field)

**Fix 5 — Narrative Summary Context**
- Before first shot generation batch, make one LLM call to summarize the full script into a structured ~1,500 char brief
- Brief includes: overall arc, key characters, visual themes, emotional progression per chapter, explicit callbacks
- Replace the 2,000 char truncation with: narrative summary (global) + current chapter text (local)
- Cache the summary so all batches share the same context

### Phase 3: New Features

**Fix 4 — Title Card Integration**
- After title cards are created (pipeline step 4), inject them into the shot sequence as `shotType: 'title_card'` entries
- Each title card becomes the first shot of its chapter (e.g., C1-00 or C1-01)
- Title cards appear in CSV export and gallery
- No longer stored separately from shots

**Fix 7 — Coherence Pass**
- New toggle switch in the shot generation UI (off by default)
- When enabled, after all shot batches complete, runs one final LLM call reviewing the FULL shot list
- LLM returns up to **10 suggestions max** covering:
  - Visual callbacks/parallels between early and late shots
  - Missing shot types (no title cards? no abstract shots?)
  - Pacing issues (5+ consecutive same-character shots)
  - Motif consistency
- UI: Simple accept/reject list — each suggestion has a checkbox toggle
- Accepted suggestions are applied to the shot list automatically
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
| `src/features/storyboard/types/storyboard.types.ts` | Expand ShotType enum, possibly add chapteredSequence |
| `src/features/storyboard/services/openrouter.service.ts` | System prompt rewrite (visibility, abstract shots, shot type guide), tool schema enum, narrative summary generation |
| `src/app/api/storyboard/generate-prompts/route.ts` | Accept chapterPrefix, pass narrative summary |
| `src/features/storyboard/hooks/useDocumentaryPipeline.ts` | Inject title cards into shot sequence, pass chapter metadata, add coherence pass step |
| `src/features/storyboard/services/title-card.service.ts` | Build title card as GeneratedShotPrompt |
| `src/app/api/storyboard/coherence-pass/route.ts` | New endpoint — reviews full shot list, returns 10 max suggestions |
| Shot generation UI component | Add coherence pass toggle switch |
| CSV export logic | Include title_card shots |

---

## Implementation Order

1. **Phase 1** (Fixes 1, 2, 6): Type + prompt changes. ~90 min. Immediate quality improvement.
2. **Phase 2** (Fixes 3, 5): Chapter numbering + narrative summary. ~3 hrs. Structural awareness.
3. **Phase 3** (Fixes 4, 7): Title card injection + coherence pass. ~4 hrs. Full documentary-grade upgrade.

---

## Test Case

Re-run the Twork script after each phase. Compare against `stories/twork/shot_list.csv`.

| Metric | Current (DP) | Target |
|--------|-------------|--------|
| Main character visibility | 80% | 40-50% (LLM-decided) |
| Title cards in sequence | 0 | 11 |
| Abstract/metaphor shots | 0 | 10-15% |
| Shot types used | 5 | 10 |
| Chapter-based numbering | No | Yes |
| Context awareness | 2,000 char truncation | Full narrative summary |
| Cross-batch coherence | None | 10 suggestions max |
