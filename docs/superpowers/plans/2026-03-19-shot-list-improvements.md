# Shot List Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the storyboard shot list generator from basic sequential output to documentary-grade quality with expanded shot types, dynamic character visibility, narrative summaries, chapter numbering, title card integration, and a coherence review pass.

**Architecture:** All changes touch the existing storyboard feature module. Phase 1 is pure prompt/type changes in the service layer and API route. Phase 2 plumbs chapter metadata through the documentary pipeline. Phase 3 adds a new coherence pass API endpoint and accept/reject UI.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, OpenRouter LLM API

**Spec:** `docs/superpowers/specs/2026-03-19-shot-list-improvements-design.md`

---

## File Map

| File | Responsibility | Phase |
|------|---------------|-------|
| `src/features/storyboard/types/storyboard.types.ts` | ShotType enum, GeneratedShotPrompt type, CoherenceSuggestion type | 1, 2, 3 |
| `src/features/storyboard/services/openrouter.service.ts` | System prompt, tool schema, `generateNarrativeSummary()` method | 1 |
| `src/app/api/storyboard/generate-prompts/route.ts` | Narrative summary pre-step, `chapterPrefix` param | 1, 2 |
| `src/features/storyboard/hooks/useDocumentaryPipeline.ts` | Title card injection, chapter prefix passing | 2 |
| `src/features/storyboard/services/title-card.service.ts` | Return `GeneratedShotPrompt` for title cards | 2 |
| `src/features/storyboard/components/shot-list/ShotTable.tsx` | CSV export with chapterLabel | 2 |
| `src/features/storyboard/components/shot-list/ShotBreakdown.tsx` | Coherence pass toggle + call | 3 |
| `src/app/api/storyboard/coherence-pass/route.ts` | New endpoint: review full shot list, return suggestions | 3 |
| `src/features/storyboard/store/storyboard.store.ts` | `coherencePassEnabled`, `coherenceSuggestions` state | 3 |
| `src/features/storyboard/components/shot-list/CoherenceSuggestions.tsx` | Accept/reject suggestion list UI | 3 |

---

## Chunk 1: Phase 1 — Prompt & Type Changes

### Task 1: Expand ShotType Enum

**Files:**
- Modify: `src/features/storyboard/types/storyboard.types.ts:641`

- [ ] **Step 1: Update the ShotType union**

In `storyboard.types.ts` at line 641, replace the existing ShotType:

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

- [ ] **Step 2: Add `chapterLabel` to GeneratedShotPrompt**

In `storyboard.types.ts` at line 646, add the `chapterLabel` field to `GeneratedShotPrompt`:

```typescript
export interface GeneratedShotPrompt {
    sequence: number
    chapterLabel?: string              // Display label like "C3-05" (computed, not used for sorting)
    originalText: string
    prompt: string
    shotType: ShotType
    characterRefs: StoryboardCharacter[]
    locationRef?: StoryboardLocation
    edited: boolean
    imageUrl?: string
    metadata?: {
        originalPromptWithWildcards?: string
        appliedWildcards?: Record<string, string>
        directorId?: string
        rating?: number
        isGreenlit?: boolean
        layoutData?: Record<string, unknown>
    }
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds (new type values are additive, nothing breaks)

- [ ] **Step 4: Commit**

```bash
git add src/features/storyboard/types/storyboard.types.ts
git commit -m "feat(storyboard): expand ShotType enum with 5 new shot types and add chapterLabel field"
```

---

### Task 2: Update Tool Schema Enum

**Files:**
- Modify: `src/features/storyboard/services/openrouter.service.ts:368`

- [ ] **Step 1: Update the shotType enum in the tool schema**

In `openrouter.service.ts` at line 368, replace:

```typescript
enum: ['establishing', 'wide', 'medium', 'close-up', 'detail'],
```

with:

```typescript
enum: ['establishing', 'wide', 'medium', 'close-up', 'detail', 'over_shoulder', 'title_card', 'text_overlay', 'abstract', 'montage'],
```

- [ ] **Step 2: Update the shotType description**

Same file, line 369. Replace:

```typescript
description: 'The type of camera shot'
```

with:

```typescript
description: 'The type of shot. Use establishing/wide/medium/close-up/detail for standard coverage. Use over_shoulder for conversations. Use title_card for chapter titles (NO characters). Use text_overlay for stats, quotes, social media. Use abstract for visual metaphors. Use montage for rapid-sequence composites.'
```

- [ ] **Step 3: Commit**

```bash
git add src/features/storyboard/services/openrouter.service.ts
git commit -m "feat(storyboard): update tool schema with expanded shot type enum"
```

---

### Task 3: Rewrite System Prompt — Shot Type Guide + Visual Storytelling + Dynamic Visibility

**Files:**
- Modify: `src/features/storyboard/services/openrouter.service.ts:288-340`

- [ ] **Step 1: Add SHOT TYPE GUIDE section**

In `openrouter.service.ts`, inside the system prompt string (after the opening paragraph at line 288, before DIRECTOR'S APPROACH), add:

```
SHOT TYPE GUIDE:
- establishing: Wide view introducing a new location or scene
- wide: Full scene with multiple subjects visible
- medium: Subject from waist up, standard conversational framing
- close-up: Face or single detail fills the frame
- detail: Extreme close on a prop, hand, texture, or object
- over_shoulder: Shot from behind one subject looking at another
- title_card: Chapter/section title text with atmospheric background, NO characters visible
- text_overlay: Social media posts, stats, quotes, documents rendered in the visual style
- abstract: Visual metaphor or symbolic imagery — not a literal depiction of the narration
- montage: Multi-panel or rapid-sequence composite showing progression or comparison
```

- [ ] **Step 2: Replace hardcoded 70% character visibility with dynamic instruction**

In the CHARACTER COVERAGE section (~line 299), replace:

```
- Main characters MUST appear in at least 70% of shots — they are the visual through-line
- Even when another character or object is the focus, try to include the main character reacting, observing, or in the background
```

with:

```
- Vary main character visibility based on genre and content type:
  - Documentaries and ensemble pieces: 40-50% character visibility
  - Character dramas and biopics: 60-70% character visibility
  - Choose the appropriate percentage for THIS story, then maintain it consistently
- Fill non-character shots with: crowd reactions, location establishing shots, abstract visuals, text overlays, and atmospheric mood shots
- NOT every shot needs the main character — visual variety prevents fatigue
```

Also in the user message (~line 340), replace:

```
- The main character should appear in 70%+ of all shots
```

with:

```
- Apply the character visibility percentage you chose based on the story's genre
```

- [ ] **Step 3: Add VISUAL STORYTELLING section**

In the system prompt, after CHARACTER COVERAGE and before IMPORTANT RULES, add:

```
VISUAL STORYTELLING:
- Not every shot needs to literally depict what the narration describes
- When the narration uses metaphor, irony, or thematic reflection, consider an "abstract" shot that visualizes the MEANING rather than the literal scene
- Examples of abstract shots:
  - Narration about wasted potential → an untouched trophy under a spotlight in a dark room
  - Narration about gambling on reliability → a slot machine with the character's face on the reels
  - Narration about duality → split-frame composition with contrasting lighting on each half
  - Narration about online discourse → stylized social media feed rendered in the project's art style
- Use "text_overlay" for stats, quotes, social media reactions, and documents
- Use "abstract" for symbolic/metaphor shots
- Include abstract and metaphor shots where the story naturally calls for them — this creates breathing room and visual depth
```

- [ ] **Step 4: Update the shot description list**

In the system prompt at line 313-317, replace:

```
For each shot, describe:
1. Shot type (establishing, wide, medium, close-up, or detail)
2. Subject and action/pose — WHO is in this shot
3. Setting/environment details
4. Mood/atmosphere and lighting
5. Composition and framing
```

with:

```
For each shot, describe:
1. Shot type (use the full range: establishing, wide, medium, close-up, detail, over_shoulder, title_card, text_overlay, abstract, montage)
2. Subject and action/pose — WHO is in this shot (or what concept for abstract shots)
3. Setting/environment details
4. Mood/atmosphere and lighting
5. Composition and framing
```

- [ ] **Step 5: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/features/storyboard/services/openrouter.service.ts
git commit -m "feat(storyboard): rewrite system prompt with shot type guide, visual storytelling, and dynamic character visibility"
```

---

### Task 4: Add Narrative Summary Generation

**Files:**
- Modify: `src/features/storyboard/services/openrouter.service.ts` (add `callChat()` and `generateNarrativeSummary()` methods)
- Modify: `src/app/api/storyboard/generate-prompts/route.ts` (call summary before batches, return it in response)

- [ ] **Step 1: Add `callChat()` method to OpenRouterService**

The service only has `callWithTool()` for tool-calling. We need a plain chat completions method for narrative summary and coherence pass. In `openrouter.service.ts`, before `callWithTool()` (~line 578), add:

```typescript
/**
 * Plain chat completion call (no tools).
 */
async callChat(messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://directors-palette.app',
            'X-Title': 'Directors Palette'
        },
        body: JSON.stringify({
            model: this.model,
            messages,
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = errorText
        try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error?.message || errorJson.message || errorText
        } catch {
            // Keep raw text if not JSON
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`)
    }

    return response.json()
}
```

- [ ] **Step 2: Add `generateNarrativeSummary()` method to OpenRouterService**

In `openrouter.service.ts`, after the `generateShotPrompts()` method (after line 401), add:

```typescript
/**
 * Generate a narrative summary of the full story for cross-batch context.
 * Replaces the 2,000 char truncation with a structured director's brief.
 */
async generateNarrativeSummary(storyText: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
        {
            role: 'system',
            content: `You are a script supervisor preparing a director's brief. Summarize the provided script into a structured overview that will be used as context for shot-by-shot planning. Keep under 1,500 characters.`
        },
        {
            role: 'user',
            content: `Summarize this script for a visual director. Include:
- Overall arc (1 sentence)
- Key characters and their roles (2-3 sentences)
- Major visual themes and metaphors mentioned in the text (2-3 sentences)
- Emotional progression chapter by chapter (1 sentence per chapter, or 1 sentence per act for non-chapter stories)
- Any visual callbacks or parallels the text explicitly sets up

Keep under 1,500 characters total.

SCRIPT:
${storyText}`
        }
    ]

    const response = await this.callChat(messages)
    const content = response.choices[0]?.message?.content
    if (!content) {
        throw new Error('No content in narrative summary response')
    }
    return content.substring(0, 1500)
}
```

- [ ] **Step 3: Update the generate-prompts API route to generate narrative summary before batches**

In `src/app/api/storyboard/generate-prompts/route.ts`, after line 42 (`const service = ...`), add the narrative summary step:

```typescript
// Generate narrative summary for cross-batch context (replaces 2,000 char truncation)
let narrativeSummary = storyContext || ''
if (storyContext && storyContext.length > 2000) {
    try {
        narrativeSummary = await service.generateNarrativeSummary(storyContext)
        logger.api.info('Generated narrative summary', { length: narrativeSummary.length })
    } catch (summaryError) {
        logger.api.warn('Narrative summary failed, falling back to truncated context', {
            error: summaryError instanceof Error ? summaryError.message : String(summaryError)
        })
        narrativeSummary = storyContext.substring(0, 2000)
    }
}
```

Then update the `service.generateShotPrompts()` call at line 60-64 to pass `narrativeSummary` instead of `storyContext`:

Replace:
```typescript
const batchResults = await service.generateShotPrompts(
    batch,
    stylePrompt,
    characterDescriptions,
    storyContext
)
```

With:
```typescript
const batchResults = await service.generateShotPrompts(
    batch,
    stylePrompt,
    characterDescriptions,
    narrativeSummary
)
```

- [ ] **Step 4: Return the narrative summary in the API response**

The frontend needs the narrative summary for the coherence pass. Update the response at line 106:

```typescript
return NextResponse.json({
    shots: allResults,
    narrativeSummary: narrativeSummary !== storyContext ? narrativeSummary : undefined,
    totalRequested: segments.length,
    totalProcessed: allResults.length,
    errors: errors.length > 0 ? errors : undefined,
    complete: allResults.length === segments.length
})
```

- [ ] **Step 5: Update the storyOverview construction in openrouter.service.ts**

In `openrouter.service.ts` at line 281-283, replace the truncation logic:

```typescript
const storyOverview = storyContext
    ? `\n\nFull story context for reference:\n${storyContext.substring(0, 2000)}${storyContext.length > 2000 ? '...' : ''}`
    : ''
```

with:

```typescript
const storyOverview = storyContext
    ? `\n\nStory context (director's brief):\n${storyContext}`
    : ''
```

The truncation/summarization now happens upstream in the API route. The service receives either the full short text or the pre-generated summary.

- [ ] **Step 6: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/features/storyboard/services/openrouter.service.ts src/app/api/storyboard/generate-prompts/route.ts
git commit -m "feat(storyboard): add callChat method, narrative summary generation, return summary in API response"
```

- [ ] **Step 8: Push Phase 1**

```bash
git push origin main
```

---

## Chunk 2: Phase 2 — Chapter Numbering + Title Card Integration

### Task 5: Accept `chapterPrefix` in Generate-Prompts API

**Files:**
- Modify: `src/app/api/storyboard/generate-prompts/route.ts`
- Modify: `src/features/storyboard/services/openrouter.service.ts`

- [ ] **Step 1: Add `chapterPrefix` to the API route request body**

In `route.ts` at line 25, update the destructuring:

```typescript
const { segments, stylePrompt, characterDescriptions, storyContext, model, startFrom = 0, chapterPrefix } = body
```

- [ ] **Step 2: Pass `chapterPrefix` to the service**

Update the `generateShotPrompts` call to pass `chapterPrefix`:

```typescript
const batchResults = await service.generateShotPrompts(
    batch,
    stylePrompt,
    characterDescriptions,
    narrativeSummary,
    undefined, // locationDescriptions
    chapterPrefix
)
```

Note: The current signature has `locationDescriptions` as a parameter but the API route doesn't pass it. We need to check if it's used. The route currently calls with 4 args (segments, stylePrompt, characterDescriptions, storyContext). We need to add `locationDescriptions` (from body or undefined) and `chapterPrefix`.

- [ ] **Step 3: Update `generateShotPrompts()` signature to accept `chapterPrefix`**

In `openrouter.service.ts` at line 247-253, update:

```typescript
async generateShotPrompts(
    segments: Array<{ text: string; sequence: number; directorNote?: string }>,
    stylePrompt?: string,
    characterDescriptions?: Record<string, string>,
    storyContext?: string,
    locationDescriptions?: Record<string, string>,
    chapterPrefix?: string
): Promise<Array<{ sequence: number; prompt: string; shotType: string; characterTags?: string[] }>> {
```

- [ ] **Step 4: Update the numbering instruction in the system prompt**

In the system prompt (IMPORTANT RULES section, ~line 311), replace:

```
- Number your output shots sequentially starting from 1 (total count will exceed input segment count)
```

with:

```typescript
`- Number your output shots sequentially starting from 1 (total count will exceed input segment count)${chapterPrefix ? `\n- Prefix each shot number with "${chapterPrefix}-" (e.g., ${chapterPrefix}-01, ${chapterPrefix}-02)` : ''}`
```

And in the user message (~line 336), replace:

```
- Number shots sequentially starting from 1
```

with:

```typescript
`- Number shots sequentially starting from 1${chapterPrefix ? ` with prefix "${chapterPrefix}-"` : ''}`
```

- [ ] **Step 5: Add `chapterLabel` to the API response**

After the tool call parsing at line 394-397, add chapterLabel computation:

```typescript
return result.shots.map(shot => ({
    ...shot,
    chapterLabel: chapterPrefix ? `${chapterPrefix}-${String(shot.sequence).padStart(2, '0')}` : undefined
}))
```

Update the return type to include `chapterLabel?: string`.

- [ ] **Step 6: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 7: Commit**

```bash
git add src/app/api/storyboard/generate-prompts/route.ts src/features/storyboard/services/openrouter.service.ts
git commit -m "feat(storyboard): add chapterPrefix support for chapter-based shot numbering"
```

---

### Task 6: Inject Title Cards Into Shot Sequence

**Files:**
- Modify: `src/features/storyboard/services/title-card.service.ts`
- Modify: `src/features/storyboard/hooks/useDocumentaryPipeline.ts`

- [ ] **Step 1: Add a function to create title card as GeneratedShotPrompt**

In `title-card.service.ts`, add after the existing functions:

```typescript
import type { GeneratedShotPrompt, ShotType } from '../types/storyboard.types'

/**
 * Create a title card as a GeneratedShotPrompt for injection into the shot sequence.
 * Convention: title cards use sequence 0 within their chapter (CX-00).
 */
export function createTitleCardShot(
    chapterIndex: number,
    chapterName: string,
    stylePrompt?: string
): GeneratedShotPrompt {
    return {
        sequence: 0, // Will be renumbered when inserted into global sequence
        chapterLabel: `C${chapterIndex + 1}-00`,
        originalText: `Chapter title: ${chapterName}`,
        prompt: buildTitleCardPrompt(chapterName, stylePrompt),
        shotType: 'title_card' as ShotType,
        characterRefs: [],
        edited: false,
    }
}
```

Also update the import at the top of the file to include `GeneratedShotPrompt` and `ShotType`:

```typescript
import type { TitleCard, GeneratedShotPrompt, ShotType } from '../types/storyboard.types'
```

- [ ] **Step 2: Update useDocumentaryPipeline to inject title card shots**

In `useDocumentaryPipeline.ts`, import the new function:

```typescript
import { createTitleCards, createTitleCardShot } from '../services/title-card.service'
```

After step 4 (line 103, `const titleCards = createTitleCards(chapterNames, stylePrompt)`), add a store for title card shots:

```typescript
// Create title card shots for injection into the shot sequence
const titleCardShots: GeneratedShotPrompt[] = chapterNames.map((ch) =>
    createTitleCardShot(ch.index, ch.name, stylePrompt)
)
```

Add the import for `GeneratedShotPrompt`:

```typescript
import type { ClassifiedSegment, DocumentaryChapter, BRollPoolCategory, GeneratedShotPrompt } from '../types/storyboard.types'
```

Store `titleCardShots` on the pipeline result or in the Zustand store so `ShotBreakdown.tsx` can prepend them when generating prompts. The simplest approach: add `titleCardShots` to the documentary chapter data.

In the `documentaryChapters.push()` block (~line 157), add:

```typescript
documentaryChapters.push({
    index: i,
    name: chapterName?.name || chapter.title || `Chapter ${i + 1}`,
    nameEdited: false,
    startIndex: chapter.startIndex,
    endIndex: chapter.endIndex,
    titleCard: titleCards[i] || {
        chapterIndex: i,
        chapterName: chapterName?.name || `Chapter ${i + 1}`,
        prompt: '',
        status: 'pending' as const,
    },
    titleCardShot: titleCardShots[i], // NEW: title card as a GeneratedShotPrompt
    brollPool: brollCategories,
    segments: assignedSegments,
})
```

- [ ] **Step 3: Add `titleCardShot` to DocumentaryChapter type**

In `storyboard.types.ts`, find the `DocumentaryChapter` interface and add:

```typescript
titleCardShot?: GeneratedShotPrompt  // Title card as a shot for injection into the sequence
```

- [ ] **Step 4: Update ShotBreakdown to prepend title card shots**

In `ShotBreakdown.tsx`, in the `generatePrompts` function (~line 196), after all batches complete and before setting final prompts, inject title card shots at the appropriate positions.

After the batch loop ends (after the for loop around line 243), before the final toast:

```typescript
// Inject title card shots from documentary chapters and renumber globally
if (isDocumentaryMode && chapters?.length) {
    const titleCardShots: GeneratedShotPrompt[] = chapters
        .filter(ch => ch.titleCardShot)
        .map(ch => ch.titleCardShot!)

    // Insert title cards at the beginning
    allPrompts.unshift(...titleCardShots)

    // Renumber all shots globally to fix sequence after injection
    allPrompts.sort((a, b) => {
        // Sort by chapter label if available, else by original sequence
        const aChapter = a.chapterLabel ? parseInt(a.chapterLabel.split('-')[0].replace('C', '')) : 0
        const bChapter = b.chapterLabel ? parseInt(b.chapterLabel.split('-')[0].replace('C', '')) : 0
        if (aChapter !== bChapter) return aChapter - bChapter
        const aSeq = a.chapterLabel ? parseInt(a.chapterLabel.split('-')[1]) : a.sequence
        const bSeq = b.chapterLabel ? parseInt(b.chapterLabel.split('-')[1]) : b.sequence
        return aSeq - bSeq
    })
    allPrompts.forEach((p, i) => { p.sequence = i + 1 })
}
```

Access `chapters` from the store (it's already imported as `chapters` from `useStoryboardStore`).

- [ ] **Step 5: Update CSV export to include chapterLabel**

In `ShotTable.tsx` at line 116, update the CSV header and rows:

```typescript
const header = 'Label,Sequence,Shot Type,Description,Characters'
const rows = filteredPrompts.map(p => {
    const charTags = p.characterRefs.map(c =>
        '@' + c.name.toLowerCase().replace(/\s+/g, '_')
    ).join('; ')
    const escapedPrompt = `"${p.prompt.replace(/"/g, '""')}"`
    return `${p.chapterLabel || ''},${p.sequence},${p.shotType},${escapedPrompt},"${charTags}"`
})
```

- [ ] **Step 6: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 7: Commit**

```bash
git add src/features/storyboard/types/storyboard.types.ts src/features/storyboard/services/title-card.service.ts src/features/storyboard/hooks/useDocumentaryPipeline.ts src/features/storyboard/components/shot-list/ShotBreakdown.tsx src/features/storyboard/components/shot-list/ShotTable.tsx
git commit -m "feat(storyboard): inject title cards into shot sequence with CX-00 convention"
```

---

### Task 7: Pass Chapter Prefix From Documentary Pipeline to Shot Generation

**Files:**
- Modify: `src/features/storyboard/components/shot-list/ShotBreakdown.tsx`

- [ ] **Step 1: Update generatePrompts to pass chapterPrefix per batch in documentary mode**

In `ShotBreakdown.tsx`, the `generatePrompts` function currently sends ALL segments in one go with no chapter awareness. In documentary mode, it should send segments per-chapter with the correct prefix.

Replace the batch loop section (lines 243-273) with chapter-aware batching when in documentary mode:

```typescript
if (isDocumentaryMode && chapters?.length) {
    // Documentary mode: generate per-chapter with chapter prefix
    for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
        const chapter = chapters[chIdx]
        const chapterPrefix = `C${chIdx + 1}`
        const chapterSegments = breakdownResult.segments.filter(s =>
            chapter.segments?.some(cs => cs.sequence === s.sequence)
        )

        if (chapterSegments.length === 0) continue

        // Update progress
        setGenerationProgress({
            total: totalSegments,
            processed: allPrompts.length,
            complete: false,
            currentBatch: chIdx + 1,
            totalBatches: chapters.length
        })

        try {
            const response = await fetch('/api/storyboard/generate-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segments: chapterSegments.map(s => ({
                        text: s.text,
                        sequence: s.sequence,
                        directorNote: shotNotes[s.sequence] || undefined
                    })),
                    stylePrompt: currentStyleGuide?.style_prompt,
                    characterDescriptions,
                    storyContext: storyText,
                    model: selectedModel,
                    chapterPrefix
                })
            })

            const data = await safeJsonParse<{
                shots: Array<{ sequence?: number; prompt?: string; shotType?: string; chapterLabel?: string }>
                error?: string
            }>(response)

            if (!response.ok) throw new Error(data.error || 'Failed to generate prompts')

            const chapterPrompts: GeneratedShotPrompt[] = data.shots
                .filter((shot): shot is { sequence: number; prompt: string; shotType?: string; chapterLabel?: string } =>
                    !!shot && typeof shot.sequence === 'number' && !!shot.prompt
                )
                .map(shot => {
                    const segment = chapterSegments.find(s => s.sequence === shot.sequence)
                    const processedPrompt = replaceTagsWithDescriptions(shot.prompt)
                    const promptLower = processedPrompt.toLowerCase()
                    return {
                        sequence: shot.sequence,
                        chapterLabel: shot.chapterLabel || `${chapterPrefix}-${String(shot.sequence).padStart(2, '0')}`,
                        originalText: segment?.text || '',
                        prompt: processedPrompt,
                        shotType: (shot.shotType || 'unknown') as GeneratedShotPrompt['shotType'],
                        characterRefs: characters.filter(c => {
                            const tag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                            return promptLower.includes(c.name.toLowerCase()) || processedPrompt.includes(tag)
                        }),
                        edited: false,
                    }
                })

            allPrompts.push(...chapterPrompts)
            addGeneratedPrompts(chapterPrompts)
        } catch (err) {
            errors.push(`Chapter ${chIdx + 1} failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }
} else {
    // Standard mode: existing batch logic (unchanged)
    // ... keep the existing for loop here
}
```

This is a significant refactor of the generation loop. The key change: in documentary mode, iterate over chapters instead of fixed-size batches, passing `chapterPrefix` per chapter.

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotBreakdown.tsx
git commit -m "feat(storyboard): chapter-aware shot generation with chapter prefix in documentary mode"
```

- [ ] **Step 4: Push Phase 2**

```bash
git push origin main
```

---

## Chunk 3: Phase 3 — Coherence Pass

### Task 8: Add Coherence Types and Store State

**Files:**
- Modify: `src/features/storyboard/types/storyboard.types.ts`
- Modify: `src/features/storyboard/store/storyboard.store.ts`

- [ ] **Step 1: Add CoherenceSuggestion type**

In `storyboard.types.ts`, after the `GeneratedShotPrompt` interface, add:

```typescript
/**
 * A suggestion from the coherence pass review
 */
export interface CoherenceSuggestion {
    id: string
    type: 'edit' | 'insert'
    targetSequence: number
    description: string
    newPrompt?: string
    newShot?: {
        prompt: string
        shotType: ShotType
        characterTags: string[]
    }
    accepted?: boolean  // User's accept/reject decision
}
```

- [ ] **Step 2: Add coherence state to the store**

In `storyboard.store.ts`, find the state interface and add:

```typescript
coherencePassEnabled: boolean
coherenceSuggestions: CoherenceSuggestion[]
isRunningCoherencePass: boolean
narrativeSummary: string | null  // Stored from generate-prompts API for coherence pass
setCoherencePassEnabled: (enabled: boolean) => void
setCoherenceSuggestions: (suggestions: CoherenceSuggestion[]) => void
setIsRunningCoherencePass: (running: boolean) => void
setNarrativeSummary: (summary: string | null) => void
toggleCoherenceSuggestion: (id: string) => void
applyCoherenceSuggestions: () => void
```

And the implementations:

```typescript
coherencePassEnabled: false,
coherenceSuggestions: [],
isRunningCoherencePass: false,
narrativeSummary: null,
setCoherencePassEnabled: (enabled) => set({ coherencePassEnabled: enabled }),
setCoherenceSuggestions: (suggestions) => set({ coherenceSuggestions: suggestions }),
setIsRunningCoherencePass: (running) => set({ isRunningCoherencePass: running }),
setNarrativeSummary: (summary) => set({ narrativeSummary: summary }),
toggleCoherenceSuggestion: (id) => set((state) => ({
    coherenceSuggestions: state.coherenceSuggestions.map(s =>
        s.id === id ? { ...s, accepted: !s.accepted } : s
    )
})),
applyCoherenceSuggestions: () => set((state) => {
    const accepted = state.coherenceSuggestions.filter(s => s.accepted)
    let updatedPrompts = [...state.generatedPrompts]

    for (const suggestion of accepted) {
        if (suggestion.type === 'edit' && suggestion.newPrompt) {
            updatedPrompts = updatedPrompts.map(p =>
                p.sequence === suggestion.targetSequence
                    ? { ...p, prompt: suggestion.newPrompt!, edited: true }
                    : p
            )
        } else if (suggestion.type === 'insert' && suggestion.newShot) {
            const insertAfterIdx = updatedPrompts.findIndex(p => p.sequence === suggestion.targetSequence)
            if (insertAfterIdx !== -1) {
                const newShot: GeneratedShotPrompt = {
                    sequence: suggestion.targetSequence + 0.5, // Will be renumbered
                    originalText: suggestion.description,
                    prompt: suggestion.newShot.prompt,
                    shotType: suggestion.newShot.shotType,
                    characterRefs: [],
                    edited: false,
                }
                updatedPrompts.splice(insertAfterIdx + 1, 0, newShot)
            }
        }
    }

    // Renumber sequences
    updatedPrompts = updatedPrompts
        .sort((a, b) => a.sequence - b.sequence)
        .map((p, i) => ({ ...p, sequence: i + 1 }))

    return {
        generatedPrompts: updatedPrompts,
        coherenceSuggestions: [] // Clear after applying
    }
}),
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add src/features/storyboard/types/storyboard.types.ts src/features/storyboard/store/storyboard.store.ts
git commit -m "feat(storyboard): add CoherenceSuggestion type and store state for coherence pass"
```

---

### Task 9: Create Coherence Pass API Endpoint

**Files:**
- Create: `src/app/api/storyboard/coherence-pass/route.ts`

- [ ] **Step 1: Create the coherence-pass API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

export const maxDuration = 120

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const body = await request.json()
        const { shots, narrativeSummary, model } = body

        if (!shots || !Array.isArray(shots) || shots.length === 0) {
            return NextResponse.json({ error: 'Shots array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

        // Build the shot list summary for the LLM
        const shotListText = shots.map((s: { sequence: number; chapterLabel?: string; prompt: string; shotType: string; characterTags?: string[] }) =>
            `[${s.chapterLabel || s.sequence}] (${s.shotType}) ${s.prompt}${s.characterTags?.length ? ` | Characters: ${s.characterTags.join(', ')}` : ''}`
        ).join('\n')

        const messages = [
            {
                role: 'system' as const,
                content: `You are a film editor reviewing a complete shot list for visual coherence. Analyze ALL shots and suggest up to 10 high-impact improvements. Focus on:

1. CALLBACKS: Visual parallels between early and late shots. If two shots share a theme, suggest making them visual mirrors (same framing, different lighting).
2. MISSING TYPES: If there are no title_card, text_overlay, or abstract shots, suggest where to add them.
3. PACING: Flag sequences of 5+ consecutive shots with the same character — suggest inserting a reaction, location, or abstract shot.
4. VARIETY: Ensure the shot list uses a range of shot types, not just medium and close-up.

Return EXACTLY a JSON array of suggestions. Maximum 10 suggestions.`
            },
            {
                role: 'user' as const,
                content: `Review this shot list for coherence and suggest improvements.

${narrativeSummary ? `STORY CONTEXT:\n${narrativeSummary}\n\n` : ''}SHOT LIST (${shots.length} shots):
${shotListText}

Return up to 10 suggestions as a JSON array. Each suggestion must have:
- id: unique string (e.g., "s1", "s2")
- type: "edit" or "insert"
- targetSequence: the shot sequence number to edit or insert after
- description: human-readable explanation of what to change and why
- newPrompt: (for edits) the replacement prompt text
- newShot: (for inserts) object with { prompt, shotType, characterTags }

Return ONLY the JSON array, no other text.`
            }
        ]

        // Uses callChat (plain completions, no tools) — added in Task 4 Step 1
        const response = await service.callChat(messages)
        const content = response.choices[0]?.message?.content

        if (!content) {
            throw new Error('No content in coherence pass response')
        }

        // Parse the JSON from the response (handle markdown code blocks)
        let suggestionsText = content.trim()
        if (suggestionsText.startsWith('```')) {
            suggestionsText = suggestionsText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        const suggestions = JSON.parse(suggestionsText)

        // Validate and cap at 10
        const validSuggestions = Array.isArray(suggestions)
            ? suggestions.slice(0, 10).map((s: Record<string, unknown>, i: number) => ({
                id: String(s.id || `s${i + 1}`),
                type: s.type === 'insert' ? 'insert' : 'edit',
                targetSequence: Number(s.targetSequence) || 1,
                description: String(s.description || ''),
                newPrompt: s.type === 'edit' ? String(s.newPrompt || '') : undefined,
                newShot: s.type === 'insert' && s.newShot ? {
                    prompt: String((s.newShot as Record<string, unknown>).prompt || ''),
                    shotType: String((s.newShot as Record<string, unknown>).shotType || 'abstract'),
                    characterTags: Array.isArray((s.newShot as Record<string, unknown>).characterTags)
                        ? (s.newShot as Record<string, unknown>).characterTags as string[]
                        : []
                } : undefined,
                accepted: false,
            }))
            : []

        lognog.info(`POST /api/storyboard/coherence-pass 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/coherence-pass',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
            suggestion_count: validSuggestions.length,
        })

        return NextResponse.json({ suggestions: validSuggestions })
    } catch (error) {
        logger.api.error('Coherence pass error', { error: error instanceof Error ? error.message : String(error) })

        lognog.error(error instanceof Error ? error.message : 'Coherence pass failed', {
            type: 'error',
            route: '/api/storyboard/coherence-pass',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Coherence pass failed' },
            { status: 500 }
        )
    }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/storyboard/coherence-pass/route.ts
git commit -m "feat(storyboard): add coherence-pass API endpoint for post-generation review"
```

---

### Task 10: Create Coherence Suggestions UI Component

**Files:**
- Create: `src/features/storyboard/components/shot-list/CoherenceSuggestions.tsx`

- [ ] **Step 1: Create the accept/reject suggestion list component**

```typescript
'use client'

import { useStoryboardStore } from '../../store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Sparkles, PenLine, Plus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function CoherenceSuggestions() {
    const {
        coherenceSuggestions,
        isRunningCoherencePass,
        toggleCoherenceSuggestion,
        applyCoherenceSuggestions,
    } = useStoryboardStore()

    if (isRunningCoherencePass) {
        return (
            <Card className="border-cyan-500/30 bg-cyan-950/20">
                <CardContent className="flex items-center gap-3 py-4">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-cyan-300">Running coherence review...</span>
                </CardContent>
            </Card>
        )
    }

    if (coherenceSuggestions.length === 0) return null

    const acceptedCount = coherenceSuggestions.filter(s => s.accepted).length

    return (
        <Card className="border-cyan-500/30 bg-cyan-950/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Coherence Suggestions ({coherenceSuggestions.length})
                    </CardTitle>
                    {acceptedCount > 0 && (
                        <Button
                            size="sm"
                            onClick={applyCoherenceSuggestions}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Apply {acceptedCount} selected
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {coherenceSuggestions.map(suggestion => (
                    <div
                        key={suggestion.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            suggestion.accepted
                                ? 'border-cyan-500/50 bg-cyan-950/40'
                                : 'border-zinc-700/50 bg-zinc-900/40 hover:border-zinc-600/50'
                        }`}
                        onClick={() => toggleCoherenceSuggestion(suggestion.id)}
                    >
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            suggestion.accepted
                                ? 'border-cyan-500 bg-cyan-500'
                                : 'border-zinc-600'
                        }`}>
                            {suggestion.accepted && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    variant="outline"
                                    className={suggestion.type === 'edit'
                                        ? 'border-amber-500/50 text-amber-400'
                                        : 'border-green-500/50 text-green-400'
                                    }
                                >
                                    {suggestion.type === 'edit'
                                        ? <><PenLine className="w-3 h-3 mr-1" />Edit</>
                                        : <><Plus className="w-3 h-3 mr-1" />Insert</>
                                    }
                                </Badge>
                                <span className="text-xs text-zinc-500">
                                    Shot {suggestion.targetSequence}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-300">{suggestion.description}</p>
                            {suggestion.newPrompt && (
                                <p className="text-xs text-zinc-500 mt-1 truncate">
                                    New prompt: {suggestion.newPrompt}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add src/features/storyboard/components/shot-list/CoherenceSuggestions.tsx
git commit -m "feat(storyboard): add CoherenceSuggestions accept/reject UI component"
```

---

### Task 11: Add Coherence Toggle and Wire It Up

**Files:**
- Modify: `src/features/storyboard/components/shot-list/ShotBreakdown.tsx`

- [ ] **Step 1: Add the coherence toggle switch to the generate UI**

Import the toggle component and coherence suggestions:

```typescript
import { Switch } from '@/components/ui/switch'
import { CoherenceSuggestions } from './CoherenceSuggestions'
```

Add store access:

```typescript
const {
    // ... existing destructured values
    coherencePassEnabled,
    narrativeSummary,
    setCoherencePassEnabled,
    setCoherenceSuggestions,
    setIsRunningCoherencePass,
    setNarrativeSummary,
} = useStoryboardStore()
```

Add the toggle switch in the UI, near the Generate button:

```tsx
<div className="flex items-center gap-2">
    <Switch
        checked={coherencePassEnabled}
        onCheckedChange={setCoherencePassEnabled}
        id="coherence-toggle"
    />
    <label htmlFor="coherence-toggle" className="text-xs text-zinc-400 cursor-pointer">
        Coherence review
    </label>
</div>
```

- [ ] **Step 2: Store narrative summary from generate-prompts API response**

In the `generatePrompts` function in `ShotBreakdown.tsx`, after the first successful batch API call, extract and store the narrative summary. After parsing `data` from the first batch response, add:

```typescript
// Store narrative summary from first batch (API generates it once for all batches)
if (batchIndex === 0 && data.narrativeSummary) {
    setNarrativeSummary(data.narrativeSummary)
}
```

For documentary mode (Task 7's chapter loop), do the same after the first chapter's response:

```typescript
if (chIdx === 0 && data.narrativeSummary) {
    setNarrativeSummary(data.narrativeSummary)
}
```

Update the `safeJsonParse` type to include `narrativeSummary?: string` in the response type.

- [ ] **Step 3: Add coherence pass call after generation completes**

At the end of the `generatePrompts` function, after all batches complete and before the final `setIsGeneratingPrompts(false)`, add:

```typescript
// Run coherence pass if enabled
if (coherencePassEnabled && allPrompts.length > 0) {
    setIsRunningCoherencePass(true)
    try {
        const coherenceRes = await fetch('/api/storyboard/coherence-pass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shots: allPrompts.map(p => ({
                    sequence: p.sequence,
                    chapterLabel: p.chapterLabel,
                    prompt: p.prompt,
                    shotType: p.shotType,
                    characterTags: p.characterRefs.map(c =>
                        '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                    ),
                })),
                narrativeSummary, // From store — set during generation from API response
                model: selectedModel,
            })
        })

        const coherenceData = await safeJsonParse<{
            suggestions: CoherenceSuggestion[]
            error?: string
        }>(coherenceRes)

        if (coherenceRes.ok && coherenceData.suggestions) {
            setCoherenceSuggestions(coherenceData.suggestions)
            toast.info(`Coherence review: ${coherenceData.suggestions.length} suggestions`)
        }
    } catch (err) {
        logger.storyboard.warn('Coherence pass failed', { error: err instanceof Error ? err.message : String(err) })
        toast.warning('Coherence review failed — shot list is still usable')
    } finally {
        setIsRunningCoherencePass(false)
    }
}
```

- [ ] **Step 4: Render the CoherenceSuggestions component**

In the JSX return of ShotBreakdown, after the shot table/list and before the closing card, add:

```tsx
<CoherenceSuggestions />
```

- [ ] **Step 5: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotBreakdown.tsx
git commit -m "feat(storyboard): wire coherence pass toggle and suggestions into shot generation flow"
```

- [ ] **Step 7: Push Phase 3**

```bash
git push origin main
```

---

## Final Verification

- [ ] **Full clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Manual test: Start dev server and run Twork script through documentary pipeline**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Check:
1. Shot types now include all 10 types in generated output
2. Character visibility is NOT hardcoded at 70%
3. Documentary mode numbers shots as C1-01, C2-01, etc.
4. Title cards appear in the shot sequence as CX-00 entries
5. CSV export includes chapterLabel column and title cards
6. Coherence toggle appears, and when enabled, suggestions appear after generation
7. Accepting and applying suggestions modifies the shot list correctly
