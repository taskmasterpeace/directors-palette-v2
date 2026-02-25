# Documentary Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Documentary Mode to the storyboard that classifies segments as action/narration/transition, generates themed B-roll pools, names chapters cinematically, creates title cards, and renders an interleaved timeline gallery.

**Architecture:** Enhance the existing storyboard pipeline with a mode toggle. When Documentary Mode is on, shot breakdown adds a classification pass, a B-roll pool is generated per chapter, chapters get LLM-named titles with generated title card images, and the gallery switches to a vertical interleaved timeline. All new logic lives alongside existing code — zero changes to the standard storyboard flow.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand (store), OpenRouter (LLM via tool calling), Replicate (image generation), Tailwind CSS v4, Lucide icons, shadcn/ui components.

---

## Task 1: Add Documentary Types to the Data Model

**Files:**
- Modify: `src/features/storyboard/types/storyboard.types.ts` (after line 663)

**Step 1: Add the new type definitions**

Add these types after the `GeneratedShotPrompt` interface (line 663) in `storyboard.types.ts`:

```typescript
/**
 * Documentary Mode — Segment classification
 */
export type SegmentClassification = 'action' | 'narration' | 'transition'

/**
 * Enhanced segment with documentary classification
 */
export interface ClassifiedSegment extends ShotBreakdownSegment {
    classification: SegmentClassification
    brollCategoryId?: string  // Linked B-roll pool category for narration segments
}

/**
 * B-Roll pool prompt variant
 */
export interface BRollPoolPrompt {
    id: string
    prompt: string           // Full cinematic prompt ready for image generation
    imageUrl?: string        // Generated image URL
    status: 'pending' | 'generating' | 'completed' | 'failed'
    selected: boolean        // Active variant for display in timeline
}

/**
 * Themed B-Roll pool category (e.g., "Ohio Winter Atmosphere")
 */
export interface BRollPoolCategory {
    id: string
    theme: string            // Human-readable theme name
    chapterIndex: number
    prompts: BRollPoolPrompt[]       // 4 prompt variants
    assignedSegments: number[]       // Segment sequence numbers this covers
}

/**
 * Chapter title card
 */
export interface TitleCard {
    chapterIndex: number
    chapterName: string      // "Four Doors in the Snow"
    prompt: string           // Full image generation prompt
    imageUrl?: string
    status: 'pending' | 'generating' | 'completed' | 'failed'
}

/**
 * Documentary chapter (enhanced from StoryChapter)
 */
export interface DocumentaryChapter {
    index: number
    name: string             // LLM-generated cinematic arc name
    nameEdited: boolean      // User renamed?
    startIndex: number       // Text position start
    endIndex: number         // Text position end
    titleCard: TitleCard
    brollPool: BRollPoolCategory[]
    segments: ClassifiedSegment[]
}
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (types are just added, not yet consumed)

**Step 3: Commit**

```bash
git add src/features/storyboard/types/storyboard.types.ts
git commit -m "feat(storyboard): add documentary mode type definitions"
git push origin main
```

---

## Task 2: Add Documentary Mode State to the Store

**Files:**
- Modify: `src/features/storyboard/store/storyboard.store.ts`

**Step 1: Add imports for the new types**

At the top of the file (line 3-18), add to the existing type import block:

```typescript
import type {
    // ... existing imports ...
    SegmentClassification,
    ClassifiedSegment,
    BRollPoolPrompt,
    BRollPoolCategory,
    TitleCard,
    DocumentaryChapter,
} from "../types/storyboard.types";
```

**Step 2: Add documentary state fields to the `StoryboardStore` interface**

After line 107 (`chapterDetectionReason: string`), add:

```typescript
    // ---- Documentary Mode State ----
    isDocumentaryMode: boolean
    documentaryChapters: DocumentaryChapter[]
    isClassifyingSegments: boolean
    isGeneratingBrollPool: boolean
    isGeneratingTitleCards: boolean
```

**Step 3: Add documentary actions to the interface**

After the Chapter Actions section (line 242), add:

```typescript
    // ---- Documentary Mode Actions ----
    setDocumentaryMode: (enabled: boolean) => void
    setDocumentaryChapters: (chapters: DocumentaryChapter[]) => void
    updateDocumentaryChapter: (index: number, updates: Partial<DocumentaryChapter>) => void
    updateChapterName: (index: number, name: string) => void
    setBrollPoolCategory: (chapterIndex: number, categoryId: string, updates: Partial<BRollPoolCategory>) => void
    updateBrollPromptStatus: (categoryId: string, promptId: string, updates: Partial<BRollPoolPrompt>) => void
    selectBrollVariant: (categoryId: string, promptId: string) => void
    updateTitleCard: (chapterIndex: number, updates: Partial<TitleCard>) => void
    setIsClassifyingSegments: (classifying: boolean) => void
    setIsGeneratingBrollPool: (generating: boolean) => void
    setIsGeneratingTitleCards: (generating: boolean) => void
    clearDocumentaryData: () => void
```

**Step 4: Add default values in the store create block**

In the `create(persist(...))` block where initial state is set, add these defaults:

```typescript
    isDocumentaryMode: false,
    documentaryChapters: [],
    isClassifyingSegments: false,
    isGeneratingBrollPool: false,
    isGeneratingTitleCards: false,
```

**Step 5: Add action implementations**

Add these action implementations in the store's set/get block:

```typescript
    setDocumentaryMode: (enabled) => set({ isDocumentaryMode: enabled }),

    setDocumentaryChapters: (chapters) => set({ documentaryChapters: chapters }),

    updateDocumentaryChapter: (index, updates) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === index ? { ...ch, ...updates } : ch
        ),
    })),

    updateChapterName: (index, name) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === index ? { ...ch, name, nameEdited: true } : ch
        ),
    })),

    setBrollPoolCategory: (chapterIndex, categoryId, updates) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === chapterIndex
                ? {
                    ...ch,
                    brollPool: ch.brollPool.map((cat) =>
                        cat.id === categoryId ? { ...cat, ...updates } : cat
                    ),
                }
                : ch
        ),
    })),

    updateBrollPromptStatus: (categoryId, promptId, updates) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) => ({
            ...ch,
            brollPool: ch.brollPool.map((cat) =>
                cat.id === categoryId
                    ? {
                        ...cat,
                        prompts: cat.prompts.map((p) =>
                            p.id === promptId ? { ...p, ...updates } : p
                        ),
                    }
                    : cat
            ),
        })),
    })),

    selectBrollVariant: (categoryId, promptId) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) => ({
            ...ch,
            brollPool: ch.brollPool.map((cat) =>
                cat.id === categoryId
                    ? {
                        ...cat,
                        prompts: cat.prompts.map((p) => ({
                            ...p,
                            selected: p.id === promptId,
                        })),
                    }
                    : cat
            ),
        })),
    })),

    updateTitleCard: (chapterIndex, updates) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === chapterIndex
                ? { ...ch, titleCard: { ...ch.titleCard, ...updates } }
                : ch
        ),
    })),

    setIsClassifyingSegments: (classifying) => set({ isClassifyingSegments: classifying }),
    setIsGeneratingBrollPool: (generating) => set({ isGeneratingBrollPool: generating }),
    setIsGeneratingTitleCards: (generating) => set({ isGeneratingTitleCards: generating }),

    clearDocumentaryData: () => set({
        documentaryChapters: [],
        isClassifyingSegments: false,
        isGeneratingBrollPool: false,
        isGeneratingTitleCards: false,
    }),
```

**Step 6: Add `isDocumentaryMode` to the persisted fields list**

In the `partialize` function (around line 375-398), add `isDocumentaryMode` to the persisted fields. Do NOT persist `documentaryChapters` (too large for localStorage — same pattern as `generatedPrompts`).

**Step 7: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/features/storyboard/store/storyboard.store.ts
git commit -m "feat(storyboard): add documentary mode state and actions to store"
git push origin main
```

---

## Task 3: Segment Classification Service

**Files:**
- Create: `src/features/storyboard/services/segment-classification.service.ts`
- Modify: `src/features/storyboard/services/openrouter.service.ts` (add classify tool-call)

**Step 1: Add the classification tool to OpenRouter service**

In `openrouter.service.ts`, add a new method to the `OpenRouterService` class (after `refineShotPrompts`, around line 460):

```typescript
/**
 * Classify story segments as action/narration/transition for documentary mode
 */
async classifySegments(
    segments: Array<{ sequence: number; text: string }>,
    storyContext: string
): Promise<Array<{ sequence: number; classification: 'action' | 'narration' | 'transition' }>> {
    const tools = [{
        type: 'function' as const,
        function: {
            name: 'classify_segments',
            description: 'Classify each story segment for documentary production',
            parameters: {
                type: 'object',
                properties: {
                    classifications: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                sequence: { type: 'number', description: 'Segment sequence number' },
                                classification: {
                                    type: 'string',
                                    enum: ['action', 'narration', 'transition'],
                                    description: 'action = filmable visual action (someone doing something visible). narration = expository/explanatory text that needs B-roll coverage (legal analysis, backstory, statistics). transition = time jumps or scene bridges between story sections.'
                                }
                            },
                            required: ['sequence', 'classification']
                        }
                    }
                },
                required: ['classifications']
            }
        }
    }]

    const systemPrompt = `You are a documentary film editor classifying story segments for shot planning.

For each segment, decide:
- ACTION: The text describes something that can be FILMED as a direct visual. People doing things, physical events, visible actions. Example: "four doors flew open and they scattered into the snow"
- NARRATION: The text is explanatory, analytical, or provides context that cannot be directly filmed. Legal explanations, statistics, background information, character analysis. Example: "Ohio's sentencing grid for felony drug possession looks at two things"
- TRANSITION: The text bridges between scenes or time periods. Time jumps, "meanwhile", "if you rewind", "from here". Example: "Because if you rewind further back, you see that this Ohio situation doesn't exist in a vacuum"

Classify EVERY segment. When in doubt between action and narration, lean toward action if there's any visual element at all.`

    const response = await this.callWithTools(
        systemPrompt,
        `Story context:\n${storyContext.substring(0, 500)}...\n\nClassify these segments:\n${segments.map(s => `[${s.sequence}] ${s.text}`).join('\n')}`,
        tools
    )

    return this.extractToolResult(response, 'classify_segments')?.classifications || []
}
```

**Step 2: Create the segment classification service**

Create `src/features/storyboard/services/segment-classification.service.ts`:

```typescript
import type { ShotBreakdownSegment, ClassifiedSegment, SegmentClassification } from '../types/storyboard.types'
import { createOpenRouterService } from './openrouter.service'

const CLASSIFICATION_BATCH_SIZE = 20

export interface ClassificationConfig {
    apiKey: string
    model: string
    segments: ShotBreakdownSegment[]
    storyText: string
}

export interface ClassificationResult {
    success: boolean
    segments: ClassifiedSegment[]
    error?: string
}

/**
 * Classify story segments as action/narration/transition for documentary mode.
 * Processes in batches to avoid token limits.
 */
export async function classifySegments(config: ClassificationConfig): Promise<ClassificationResult> {
    const { apiKey, model, segments, storyText } = config

    try {
        const service = createOpenRouterService(apiKey, model)
        const allClassifications: Array<{ sequence: number; classification: SegmentClassification }> = []

        // Process in batches
        for (let i = 0; i < segments.length; i += CLASSIFICATION_BATCH_SIZE) {
            const batch = segments.slice(i, i + CLASSIFICATION_BATCH_SIZE)
            const batchInput = batch.map((s) => ({ sequence: s.sequence, text: s.text }))

            const results = await service.classifySegments(batchInput, storyText)
            allClassifications.push(...results)
        }

        // Merge classifications into segments
        const classificationMap = new Map(allClassifications.map((c) => [c.sequence, c.classification]))

        const classified: ClassifiedSegment[] = segments.map((seg) => ({
            ...seg,
            classification: classificationMap.get(seg.sequence) || 'action', // Default to action
        }))

        return { success: true, segments: classified }
    } catch (err) {
        return {
            success: false,
            segments: segments.map((seg) => ({ ...seg, classification: 'action' as const })),
            error: err instanceof Error ? err.message : 'Classification failed',
        }
    }
}
```

**Step 3: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/features/storyboard/services/segment-classification.service.ts src/features/storyboard/services/openrouter.service.ts
git commit -m "feat(storyboard): add segment classification service for documentary mode"
git push origin main
```

---

## Task 4: B-Roll Pool Service

**Files:**
- Create: `src/features/storyboard/services/broll-pool.service.ts`

**Step 1: Create the B-roll pool generation service**

Create `src/features/storyboard/services/broll-pool.service.ts`:

```typescript
import type { BRollPoolCategory, BRollPoolPrompt } from '../types/storyboard.types'
import { createOpenRouterService } from './openrouter.service'

export interface BRollPoolConfig {
    apiKey: string
    model: string
    chapterText: string
    chapterIndex: number
    storyContext: string
    stylePrompt?: string
    characterDescriptions?: string
}

export interface BRollPoolResult {
    success: boolean
    categories: BRollPoolCategory[]
    error?: string
}

let poolIdCounter = 0
function generatePoolId(): string {
    return `broll-pool-${Date.now()}-${++poolIdCounter}`
}

function generatePromptId(): string {
    return `broll-prompt-${Date.now()}-${++poolIdCounter}`
}

/**
 * Generate a themed B-roll pool for a documentary chapter.
 * Analyzes the chapter text and creates 8-12 themed categories
 * with 4 cinematic prompt variants each.
 */
export async function generateBRollPool(config: BRollPoolConfig): Promise<BRollPoolResult> {
    const { apiKey, model, chapterText, chapterIndex, storyContext, stylePrompt, characterDescriptions } = config

    try {
        const service = createOpenRouterService(apiKey, model)

        const tools = [{
            type: 'function' as const,
            function: {
                name: 'generate_broll_pool',
                description: 'Generate themed B-roll categories with cinematic prompt variants',
                parameters: {
                    type: 'object',
                    properties: {
                        categories: {
                            type: 'array',
                            description: 'B-roll categories, 8-12 per chapter',
                            items: {
                                type: 'object',
                                properties: {
                                    theme: {
                                        type: 'string',
                                        description: 'Human-readable theme name, e.g., "Ohio Winter Atmosphere"'
                                    },
                                    prompts: {
                                        type: 'array',
                                        description: '4 full cinematic prompt variants for this theme',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                prompt: {
                                                    type: 'string',
                                                    description: 'Complete cinematic image generation prompt. Be specific: camera angle, lighting, composition, textures, atmosphere. 2-3 sentences.'
                                                }
                                            },
                                            required: ['prompt']
                                        },
                                        minItems: 4,
                                        maxItems: 4
                                    }
                                },
                                required: ['theme', 'prompts']
                            }
                        }
                    },
                    required: ['categories']
                }
            }
        }]

        const systemPrompt = `You are a documentary cinematographer creating a B-roll shot list.

Analyze the story chapter text and generate 8-12 THEMED B-roll categories. Each category represents a visual motif that covers narration segments where there is no direct filmable action.

For each category, generate exactly 4 DIFFERENT prompt variants — each must be a complete, ready-to-use image generation prompt with:
- Specific camera angle (wide, medium, close-up, overhead, low-angle, POV)
- Lighting description (natural, fluorescent, neon, golden hour, overcast)
- Composition details (shallow depth of field, symmetrical, rule of thirds)
- Textures and atmosphere (gritty, clean, sterile, warm, cold)
- 2-3 sentences, vivid and specific

${stylePrompt ? `Visual style to match: ${stylePrompt}` : ''}
${characterDescriptions ? `Characters for reference: ${characterDescriptions}` : ''}

IMPORTANT: These are still images, not video. No camera movement terms (no dolly, pan, track, crane). Describe the FROZEN MOMENT.`

        // Use the service's internal callWithTools method via a public generateBRollPool method
        // Since we need direct tool calling, we'll use the chat completion endpoint
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://directors-palette.vercel.app',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Chapter text:\n${chapterText}\n\nFull story context (truncated):\n${storyContext.substring(0, 1000)}` },
                ],
                tools,
                tool_choice: { type: 'function', function: { name: 'generate_broll_pool' } },
            }),
        })

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`)
        }

        const data = await response.json()
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        const parsed = JSON.parse(toolCall.function.arguments)
        const rawCategories = parsed.categories || []

        // Transform into typed categories
        const categories: BRollPoolCategory[] = rawCategories.map((cat: { theme: string; prompts: Array<{ prompt: string }> }) => ({
            id: generatePoolId(),
            theme: cat.theme,
            chapterIndex,
            prompts: cat.prompts.map((p: { prompt: string }, i: number): BRollPoolPrompt => ({
                id: generatePromptId(),
                prompt: stylePrompt ? `${p.prompt}. ${stylePrompt}` : p.prompt,
                status: 'pending',
                selected: i === 0, // First variant selected by default
            })),
            assignedSegments: [],
        }))

        return { success: true, categories }
    } catch (err) {
        return {
            success: false,
            categories: [],
            error: err instanceof Error ? err.message : 'B-roll pool generation failed',
        }
    }
}

/**
 * Auto-assign B-roll categories to narration segments.
 * Uses LLM to match narration text to the best-fitting B-roll theme.
 */
export async function assignBRollToSegments(config: {
    apiKey: string
    model: string
    narrationSegments: Array<{ sequence: number; text: string }>
    categories: BRollPoolCategory[]
}): Promise<Array<{ sequence: number; categoryId: string }>> {
    const { apiKey, model, narrationSegments, categories } = config

    if (narrationSegments.length === 0 || categories.length === 0) return []

    const tools = [{
        type: 'function' as const,
        function: {
            name: 'assign_broll',
            description: 'Match narration segments to B-roll categories',
            parameters: {
                type: 'object',
                properties: {
                    assignments: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                sequence: { type: 'number' },
                                categoryIndex: {
                                    type: 'number',
                                    description: 'Index into the categories array (0-based)'
                                }
                            },
                            required: ['sequence', 'categoryIndex']
                        }
                    }
                },
                required: ['assignments']
            }
        }
    }]

    const categoryList = categories.map((cat, i) => `[${i}] ${cat.theme}`).join('\n')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://directors-palette.vercel.app',
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a documentary editor assigning B-roll coverage to narration segments. Match each narration segment to the single best-fitting B-roll category.'
                },
                {
                    role: 'user',
                    content: `B-roll categories:\n${categoryList}\n\nNarration segments:\n${narrationSegments.map(s => `[${s.sequence}] ${s.text}`).join('\n')}`
                },
            ],
            tools,
            tool_choice: { type: 'function', function: { name: 'assign_broll' } },
        }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall) return []

    const parsed = JSON.parse(toolCall.function.arguments)
    return (parsed.assignments || []).map((a: { sequence: number; categoryIndex: number }) => ({
        sequence: a.sequence,
        categoryId: categories[a.categoryIndex]?.id || '',
    })).filter((a: { sequence: number; categoryId: string }) => a.categoryId)
}
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/services/broll-pool.service.ts
git commit -m "feat(storyboard): add B-roll pool generation service for documentary mode"
git push origin main
```

---

## Task 5: Enhanced Chapter Detection with Arc Naming

**Files:**
- Modify: `src/features/storyboard/services/chapter-detection.service.ts`

**Step 1: Add an LLM chapter naming function**

After the existing `getChapterForIndex` function (around line 351), add:

```typescript
/**
 * Generate cinematic documentary arc names for chapters using LLM.
 * Each chapter gets a 2-5 word cinematic title based on its content.
 */
export async function generateChapterArcNames(config: {
    apiKey: string
    model: string
    chapters: StoryChapter[]
    storyText: string
}): Promise<Array<{ index: number; name: string }>> {
    const { apiKey, model, chapters, storyText } = config

    if (chapters.length <= 1) {
        return [{ index: 0, name: chapters[0]?.title || 'Full Story' }]
    }

    const tools = [{
        type: 'function' as const,
        function: {
            name: 'name_chapters',
            description: 'Generate cinematic documentary chapter titles',
            parameters: {
                type: 'object',
                properties: {
                    chapters: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                index: { type: 'number' },
                                name: {
                                    type: 'string',
                                    description: 'Cinematic documentary chapter title, 2-5 words. Evocative, specific, not generic.'
                                }
                            },
                            required: ['index', 'name']
                        }
                    }
                },
                required: ['chapters']
            }
        }
    }]

    const chapterPreviews = chapters.map((ch, i) => {
        const text = storyText.substring(ch.startIndex, ch.endIndex)
        const preview = text.substring(0, 300).trim()
        return `[Chapter ${i}] ${preview}...`
    }).join('\n\n')

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://directors-palette.vercel.app',
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a documentary filmmaker naming chapters for a film. Give each chapter a cinematic title (2-5 words) that captures its emotional core. Be specific and evocative — not generic titles like "The Beginning" or "The End". Think like a Netflix documentary producer.'
                    },
                    { role: 'user', content: `Name these chapters:\n\n${chapterPreviews}` },
                ],
                tools,
                tool_choice: { type: 'function', function: { name: 'name_chapters' } },
            }),
        })

        if (!response.ok) {
            return chapters.map((ch, i) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))
        }

        const data = await response.json()
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
        if (!toolCall) {
            return chapters.map((ch, i) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))
        }

        const parsed = JSON.parse(toolCall.function.arguments)
        return parsed.chapters || chapters.map((ch: StoryChapter, i: number) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))
    } catch {
        return chapters.map((ch, i) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))
    }
}
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/services/chapter-detection.service.ts
git commit -m "feat(storyboard): add LLM chapter arc naming for documentary mode"
git push origin main
```

---

## Task 6: Title Card Service

**Files:**
- Create: `src/features/storyboard/services/title-card.service.ts`

**Step 1: Create the title card prompt generator**

Create `src/features/storyboard/services/title-card.service.ts`:

```typescript
import type { TitleCard } from '../types/storyboard.types'

/**
 * Generate a title card image prompt for a documentary chapter.
 * The prompt instructs the image model to render the chapter name
 * as large, readable text within the image composition.
 */
export function buildTitleCardPrompt(chapterName: string, stylePrompt?: string): string {
    const basePrompt = `Documentary title card. Large, bold, centered text reading "${chapterName}" in elegant cinematic typography. The text is the primary visual element, clearly legible against the background. Professional film production quality, clean composition, dramatic lighting.`

    if (stylePrompt) {
        return `${basePrompt} ${stylePrompt}`
    }

    return `${basePrompt} Dark cinematic background with subtle texture, warm accent lighting on the text.`
}

/**
 * Create initial TitleCard objects for documentary chapters.
 */
export function createTitleCards(
    chapters: Array<{ index: number; name: string }>,
    stylePrompt?: string
): TitleCard[] {
    return chapters.map((ch) => ({
        chapterIndex: ch.index,
        chapterName: ch.name,
        prompt: buildTitleCardPrompt(ch.name, stylePrompt),
        status: 'pending',
    }))
}

/**
 * Rebuild a title card prompt when the chapter name changes.
 */
export function rebuildTitleCardPrompt(titleCard: TitleCard, newName: string, stylePrompt?: string): TitleCard {
    return {
        ...titleCard,
        chapterName: newName,
        prompt: buildTitleCardPrompt(newName, stylePrompt),
        imageUrl: undefined, // Clear old image since name changed
        status: 'pending',
    }
}
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/services/title-card.service.ts
git commit -m "feat(storyboard): add title card prompt service for documentary mode"
git push origin main
```

---

## Task 7: Documentary Pipeline API Route

**Files:**
- Create: `src/app/api/storyboard/classify-segments/route.ts`
- Create: `src/app/api/storyboard/broll-pool/route.ts`
- Create: `src/app/api/storyboard/chapter-names/route.ts`

**Step 1: Create the segment classification API route**

Create `src/app/api/storyboard/classify-segments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { classifySegments } from '@/features/storyboard/services/segment-classification.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const body = await request.json()
        const { segments, storyText, model } = body

        if (!segments || !Array.isArray(segments)) {
            return NextResponse.json({ error: 'Segments array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const result = await classifySegments({
            apiKey,
            model: model || 'openai/gpt-4.1-mini',
            segments,
            storyText: storyText || '',
        })

        lognog.info(`POST /api/storyboard/classify-segments 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/classify-segments',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json(result)
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'Segment classification failed', {
            type: 'error',
            route: '/api/storyboard/classify-segments',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Classification failed' },
            { status: 500 }
        )
    }
}
```

**Step 2: Create the B-roll pool API route**

Create `src/app/api/storyboard/broll-pool/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateBRollPool, assignBRollToSegments } from '@/features/storyboard/services/broll-pool.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const body = await request.json()
        const { chapterText, chapterIndex, storyContext, stylePrompt, characterDescriptions, narrationSegments, model } = body

        if (!chapterText) {
            return NextResponse.json({ error: 'Chapter text is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const selectedModel = model || 'openai/gpt-4.1-mini'

        // Step 1: Generate the B-roll pool
        const poolResult = await generateBRollPool({
            apiKey,
            model: selectedModel,
            chapterText,
            chapterIndex: chapterIndex || 0,
            storyContext: storyContext || chapterText,
            stylePrompt,
            characterDescriptions,
        })

        if (!poolResult.success) {
            return NextResponse.json({ error: poolResult.error }, { status: 500 })
        }

        // Step 2: Auto-assign B-roll to narration segments if provided
        let assignments: Array<{ sequence: number; categoryId: string }> = []
        if (narrationSegments && narrationSegments.length > 0 && poolResult.categories.length > 0) {
            assignments = await assignBRollToSegments({
                apiKey,
                model: selectedModel,
                narrationSegments,
                categories: poolResult.categories,
            })

            // Apply assignments to categories
            for (const assignment of assignments) {
                const category = poolResult.categories.find((c) => c.id === assignment.categoryId)
                if (category) {
                    category.assignedSegments.push(assignment.sequence)
                }
            }
        }

        lognog.info(`POST /api/storyboard/broll-pool 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/broll-pool',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({
            categories: poolResult.categories,
            assignments,
            totalCategories: poolResult.categories.length,
        })
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'B-roll pool generation failed', {
            type: 'error',
            route: '/api/storyboard/broll-pool',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'B-roll pool generation failed' },
            { status: 500 }
        )
    }
}
```

**Step 3: Create the chapter names API route**

Create `src/app/api/storyboard/chapter-names/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateChapterArcNames } from '@/features/storyboard/services/chapter-detection.service'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const body = await request.json()
        const { chapters, storyText, model } = body

        if (!chapters || !Array.isArray(chapters)) {
            return NextResponse.json({ error: 'Chapters array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const names = await generateChapterArcNames({
            apiKey,
            model: model || 'openai/gpt-4.1-mini',
            chapters,
            storyText: storyText || '',
        })

        lognog.info(`POST /api/storyboard/chapter-names 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/chapter-names',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
        })

        return NextResponse.json({ names })
    } catch (error) {
        lognog.error(error instanceof Error ? error.message : 'Chapter naming failed', {
            type: 'error',
            route: '/api/storyboard/chapter-names',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chapter naming failed' },
            { status: 500 }
        )
    }
}
```

**Step 4: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/api/storyboard/classify-segments/route.ts src/app/api/storyboard/broll-pool/route.ts src/app/api/storyboard/chapter-names/route.ts
git commit -m "feat(storyboard): add documentary mode API routes (classify, broll-pool, chapter-names)"
git push origin main
```

---

## Task 8: Documentary Mode Toggle in StoryInput

**Files:**
- Modify: `src/features/storyboard/components/story-input/StoryInput.tsx`

**Step 1: Add the documentary mode toggle**

In `StoryInput.tsx`, add the store hooks for documentary mode:

```typescript
// Add to the destructured store values (line 26-40):
const {
    // ... existing ...
    isDocumentaryMode,
    setDocumentaryMode,
} = useStoryboardStore()
```

Add a toggle card BEFORE the Story Input card (between the AI Model card and Story Input card, around line 106):

```tsx
{/* Documentary Mode Toggle */}
<Card className="bg-card/50 border-primary/20">
    <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Mode</span>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                    onClick={() => setDocumentaryMode(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        !isDocumentaryMode
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Storyboard
                </button>
                <button
                    onClick={() => setDocumentaryMode(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        isDocumentaryMode
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Documentary
                </button>
            </div>
        </div>
        {isDocumentaryMode && (
            <p className="text-xs text-muted-foreground mt-2">
                Documentary mode classifies segments, generates B-roll pools, and creates chapter title cards.
            </p>
        )}
    </CardContent>
</Card>
```

Add `Film` to the lucide-react import at line 17:

```typescript
import { Sparkles, FileText, AlertCircle, Trash2, Film } from 'lucide-react'
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/components/story-input/StoryInput.tsx
git commit -m "feat(storyboard): add documentary mode toggle to story input"
git push origin main
```

---

## Task 9: Documentary Pipeline Orchestration Hook

**Files:**
- Create: `src/features/storyboard/hooks/useDocumentaryPipeline.ts`

**Step 1: Create the orchestration hook**

This hook ties the whole documentary pipeline together — called from the Shots tab when documentary mode is active. It runs: classify segments → detect chapters → name chapters → generate B-roll pools → create title cards.

Create `src/features/storyboard/hooks/useDocumentaryPipeline.ts`:

```typescript
'use client'

import { useCallback } from 'react'
import { useStoryboardStore } from '../store'
import { detectChapters, mapSegmentsToChapters } from '../services/chapter-detection.service'
import { createTitleCards } from '../services/title-card.service'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { toast } from 'sonner'
import type { ClassifiedSegment, DocumentaryChapter, BRollPoolCategory } from '../types/storyboard.types'

export function useDocumentaryPipeline() {
    const {
        storyText,
        selectedModel,
        breakdownResult,
        currentStyleGuide,
        selectedPresetStyle,
        characters,
        isDocumentaryMode,
        setDocumentaryChapters,
        setIsClassifyingSegments,
        setIsGeneratingBrollPool,
        setIsGeneratingTitleCards,
    } = useStoryboardStore()

    const runPipeline = useCallback(async () => {
        if (!isDocumentaryMode || !breakdownResult) return
        const segments = breakdownResult.segments

        // Resolve style prompt
        let stylePrompt = ''
        if (currentStyleGuide?.style_prompt) {
            stylePrompt = currentStyleGuide.style_prompt
        }

        const characterDescriptions = characters
            .map((c) => `${c.name}: ${c.description || 'no description'}`)
            .join('; ')

        try {
            // === Step 1: Classify segments ===
            setIsClassifyingSegments(true)
            toast.info('Classifying segments...')

            const classifyRes = await fetch('/api/storyboard/classify-segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segments: segments.map((s) => ({ sequence: s.sequence, text: s.text, start_index: s.start_index, end_index: s.end_index })),
                    storyText,
                    model: selectedModel,
                }),
            })

            const classifyResult = await safeJsonParse<{ success: boolean; segments: ClassifiedSegment[]; error?: string }>(classifyRes)
            if (!classifyResult.success) {
                toast.error(`Classification failed: ${classifyResult.error}`)
                return
            }

            const classifiedSegments = classifyResult.segments
            setIsClassifyingSegments(false)

            const actionCount = classifiedSegments.filter((s) => s.classification === 'action').length
            const narrationCount = classifiedSegments.filter((s) => s.classification === 'narration').length
            const transitionCount = classifiedSegments.filter((s) => s.classification === 'transition').length
            toast.success(`Classified: ${actionCount} action, ${narrationCount} narration, ${transitionCount} transition`)

            // === Step 2: Detect chapters ===
            const chapterResult = detectChapters(storyText)
            const chaptersWithSegments = mapSegmentsToChapters(chapterResult.chapters, classifiedSegments)

            // === Step 3: Name chapters via LLM ===
            toast.info('Naming chapters...')
            const namesRes = await fetch('/api/storyboard/chapter-names', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapters: chaptersWithSegments,
                    storyText,
                    model: selectedModel,
                }),
            })

            const namesResult = await safeJsonParse<{ names: Array<{ index: number; name: string }> }>(namesRes)
            const chapterNames = namesResult.names || chaptersWithSegments.map((ch, i) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))

            // === Step 4: Create title cards ===
            setIsGeneratingTitleCards(true)
            const titleCards = createTitleCards(chapterNames, stylePrompt)

            // === Step 5: Generate B-roll pools per chapter ===
            setIsGeneratingBrollPool(true)
            toast.info('Generating B-roll pools...')

            const documentaryChapters: DocumentaryChapter[] = []

            for (let i = 0; i < chaptersWithSegments.length; i++) {
                const chapter = chaptersWithSegments[i]
                const chapterName = chapterNames.find((n) => n.index === i)
                const chapterText = storyText.substring(chapter.startIndex, chapter.endIndex)

                // Get narration segments for this chapter
                const chapterClassified = classifiedSegments.filter((s) =>
                    chapter.segmentIndices.includes(s.sequence)
                )
                const narrationSegs = chapterClassified
                    .filter((s) => s.classification === 'narration')
                    .map((s) => ({ sequence: s.sequence, text: s.text }))

                // Generate B-roll pool
                let brollCategories: BRollPoolCategory[] = []
                try {
                    const poolRes = await fetch('/api/storyboard/broll-pool', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chapterText,
                            chapterIndex: i,
                            storyContext: storyText,
                            stylePrompt,
                            characterDescriptions,
                            narrationSegments: narrationSegs,
                            model: selectedModel,
                        }),
                    })
                    const poolResult = await safeJsonParse<{ categories: BRollPoolCategory[] }>(poolRes)
                    brollCategories = poolResult.categories || []
                } catch {
                    console.error(`B-roll pool generation failed for chapter ${i}`)
                }

                // Apply B-roll assignments to classified segments
                const assignedSegments = chapterClassified.map((seg) => {
                    if (seg.classification === 'narration') {
                        // Find if any category is assigned to this segment
                        const assignedCat = brollCategories.find((cat) =>
                            cat.assignedSegments.includes(seg.sequence)
                        )
                        return assignedCat
                            ? { ...seg, brollCategoryId: assignedCat.id }
                            : seg
                    }
                    return seg
                })

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
                        status: 'pending',
                    },
                    brollPool: brollCategories,
                    segments: assignedSegments,
                })
            }

            setDocumentaryChapters(documentaryChapters)
            setIsGeneratingBrollPool(false)
            setIsGeneratingTitleCards(false)

            const totalBroll = documentaryChapters.reduce((sum, ch) => sum + ch.brollPool.length, 0)
            toast.success(`Documentary pipeline complete: ${documentaryChapters.length} chapters, ${totalBroll} B-roll categories`)
        } catch (err) {
            console.error('Documentary pipeline error:', err)
            toast.error(err instanceof Error ? err.message : 'Documentary pipeline failed')
            setIsClassifyingSegments(false)
            setIsGeneratingBrollPool(false)
            setIsGeneratingTitleCards(false)
        }
    }, [
        isDocumentaryMode, breakdownResult, storyText, selectedModel,
        currentStyleGuide, selectedPresetStyle, characters,
        setDocumentaryChapters, setIsClassifyingSegments,
        setIsGeneratingBrollPool, setIsGeneratingTitleCards,
    ])

    return { runPipeline }
}
```

**Step 2: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/hooks/useDocumentaryPipeline.ts
git commit -m "feat(storyboard): add documentary pipeline orchestration hook"
git push origin main
```

---

## Task 10: Wire Documentary Pipeline into Shots Tab

**Files:**
- Modify: `src/features/storyboard/components/shot-list/ShotBreakdown.tsx` (or wherever the "Generate Prompts" button lives in the shots tab)

This task requires reading the actual shots tab component to find where prompt generation is triggered, then adding a conditional call to `useDocumentaryPipeline().runPipeline()` when documentary mode is active.

**Step 1: Identify the shot generation trigger**

Read the shots tab component (likely `ShotBreakdown.tsx` or a parent) to find the "Generate Prompts" button handler.

**Step 2: Add documentary pipeline call**

After the normal prompt generation completes, if `isDocumentaryMode` is true, call `runPipeline()` to classify segments, generate chapters, B-roll pools, and title cards.

The integration pattern:

```typescript
// In the component that handles prompt generation:
import { useDocumentaryPipeline } from '../../hooks/useDocumentaryPipeline'

// Inside the component:
const { runPipeline } = useDocumentaryPipeline()
const { isDocumentaryMode } = useStoryboardStore()

// After normal prompt generation succeeds:
const handleGeneratePrompts = async () => {
    // ... existing prompt generation logic ...

    // If documentary mode, run the classification + B-roll pipeline
    if (isDocumentaryMode) {
        await runPipeline()
    }
}
```

**Step 3: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(storyboard): wire documentary pipeline into shots tab prompt generation"
git push origin main
```

---

## Task 11: Documentary Timeline Gallery Component

**Files:**
- Create: `src/features/storyboard/components/gallery/DocumentaryTimeline.tsx`
- Modify: `src/features/storyboard/components/gallery/StoryboardGallery.tsx`

**Step 1: Create the DocumentaryTimeline component**

Create `src/features/storyboard/components/gallery/DocumentaryTimeline.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useStoryboardStore } from '../../store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Film,
    Camera,
    ImageIcon,
    ArrowLeftRight,
    ChevronDown,
    ChevronRight,
    Pencil,
    Check,
    X,
} from 'lucide-react'
import type { DocumentaryChapter, ClassifiedSegment, BRollPoolCategory } from '../../types/storyboard.types'

interface TimelineItemProps {
    type: 'title-card' | 'action' | 'narration' | 'transition'
    segment?: ClassifiedSegment
    imageUrl?: string
    brollCategory?: BRollPoolCategory
    prompt?: string
    sequence?: number
    onSelectBrollVariant?: (categoryId: string, promptId: string) => void
}

function TimelineItem({ type, segment, imageUrl, brollCategory, prompt, onSelectBrollVariant }: TimelineItemProps) {
    const [showVariants, setShowVariants] = useState(false)

    const badgeColor = {
        'title-card': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'action': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'narration': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'transition': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }[type]

    const badgeLabel = {
        'title-card': 'TITLE CARD',
        'action': 'ACTION',
        'narration': 'B-ROLL',
        'transition': 'TRANSITION',
    }[type]

    const isNarration = type === 'narration'
    const selectedPrompt = brollCategory?.prompts.find((p) => p.selected)

    return (
        <div className={`relative ${isNarration ? 'ml-8 max-w-[70%]' : ''}`}>
            <Card className={`overflow-hidden ${isNarration ? 'border-blue-500/30' : ''}`}>
                {/* Image area */}
                <div className="relative aspect-video bg-muted">
                    {imageUrl || selectedPrompt?.imageUrl ? (
                        <img
                            src={imageUrl || selectedPrompt?.imageUrl}
                            alt={prompt || segment?.text || 'Shot'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {type === 'title-card' ? (
                                <Film className="w-8 h-8" />
                            ) : (
                                <Camera className="w-8 h-8" />
                            )}
                        </div>
                    )}

                    {/* Badge */}
                    <Badge className={`absolute top-2 left-2 text-[10px] font-semibold ${badgeColor}`}>
                        {badgeLabel}
                    </Badge>

                    {/* B-roll theme badge */}
                    {isNarration && brollCategory && (
                        <Badge className="absolute top-2 right-2 text-[10px] bg-black/60 text-white border-none">
                            {brollCategory.theme}
                        </Badge>
                    )}
                </div>

                {/* Text area */}
                <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {segment?.text || prompt || ''}
                    </p>

                    {/* B-roll variant picker */}
                    {isNarration && brollCategory && brollCategory.prompts.length > 1 && (
                        <div className="mt-2">
                            <button
                                onClick={() => setShowVariants(!showVariants)}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                {showVariants ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                {brollCategory.prompts.length} variants
                            </button>

                            {showVariants && (
                                <div className="mt-2 space-y-1">
                                    {brollCategory.prompts.map((p, i) => (
                                        <button
                                            key={p.id}
                                            onClick={() => onSelectBrollVariant?.(brollCategory.id, p.id)}
                                            className={`w-full text-left text-xs p-2 rounded border transition-colors ${
                                                p.selected
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                                    : 'border-border hover:border-blue-500/50 text-muted-foreground'
                                            }`}
                                        >
                                            <span className="font-medium">Variant {i + 1}:</span>{' '}
                                            <span className="line-clamp-2">{p.prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export function DocumentaryTimeline() {
    const {
        documentaryChapters,
        generatedImages,
        generatedPrompts,
        updateChapterName,
        selectBrollVariant,
    } = useStoryboardStore()

    const [editingChapter, setEditingChapter] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [collapsedChapters, setCollapsedChapters] = useState<Set<number>>(new Set())

    if (documentaryChapters.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Film className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No documentary data yet.</p>
                <p className="text-xs mt-1">Generate prompts with Documentary Mode enabled to see the timeline.</p>
            </div>
        )
    }

    const toggleChapter = (index: number) => {
        setCollapsedChapters((prev) => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    const startEditName = (index: number, currentName: string) => {
        setEditingChapter(index)
        setEditName(currentName)
    }

    const saveEditName = (index: number) => {
        if (editName.trim()) {
            updateChapterName(index, editName.trim())
        }
        setEditingChapter(null)
    }

    return (
        <div className="space-y-8">
            {documentaryChapters.map((chapter) => {
                const isCollapsed = collapsedChapters.has(chapter.index)

                return (
                    <div key={chapter.index} className="space-y-3">
                        {/* Chapter header */}
                        <div className="flex items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
                            <button
                                onClick={() => toggleChapter(chapter.index)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            <Film className="w-4 h-4 text-amber-400" />

                            {editingChapter === chapter.index ? (
                                <div className="flex items-center gap-1">
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="h-7 text-sm w-64"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEditName(chapter.index)
                                            if (e.key === 'Escape') setEditingChapter(null)
                                        }}
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEditName(chapter.index)}>
                                        <Check className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingChapter(null)}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-sm font-semibold">
                                        Chapter {chapter.index + 1}: &ldquo;{chapter.name}&rdquo;
                                    </h3>
                                    <button
                                        onClick={() => startEditName(chapter.index, chapter.name)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </>
                            )}

                            <span className="text-xs text-muted-foreground ml-auto">
                                {chapter.segments.length} segments &middot; {chapter.brollPool.length} B-roll categories
                            </span>
                        </div>

                        {!isCollapsed && (
                            <div className="space-y-3 pl-6 border-l-2 border-muted">
                                {/* Title card */}
                                <TimelineItem
                                    type="title-card"
                                    imageUrl={chapter.titleCard.imageUrl}
                                    prompt={chapter.titleCard.prompt}
                                />

                                {/* Segments */}
                                {chapter.segments.map((segment) => {
                                    const image = generatedImages[segment.sequence]
                                    const prompt = generatedPrompts.find((p) => p.sequence === segment.sequence)
                                    const brollCategory = segment.brollCategoryId
                                        ? chapter.brollPool.find((cat) => cat.id === segment.brollCategoryId)
                                        : undefined

                                    return (
                                        <TimelineItem
                                            key={segment.sequence}
                                            type={segment.classification}
                                            segment={segment}
                                            imageUrl={image?.imageUrl}
                                            prompt={prompt?.prompt}
                                            sequence={segment.sequence}
                                            brollCategory={brollCategory}
                                            onSelectBrollVariant={selectBrollVariant}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
```

**Step 2: Wire into StoryboardGallery**

In `StoryboardGallery.tsx`, add a conditional render:

```typescript
// At the top, import:
import { DocumentaryTimeline } from './DocumentaryTimeline'

// In the component, get the documentary state:
const { isDocumentaryMode, documentaryChapters } = useStoryboardStore()

// In the render, before the existing grid view:
if (isDocumentaryMode && documentaryChapters.length > 0) {
    return <DocumentaryTimeline />
}
// ... existing gallery code ...
```

**Step 3: Verify the build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/features/storyboard/components/gallery/DocumentaryTimeline.tsx src/features/storyboard/components/gallery/StoryboardGallery.tsx
git commit -m "feat(storyboard): add documentary timeline gallery component"
git push origin main
```

---

## Task 12: Integration Testing with cURL

**Step 1: Test segment classification API**

Start the dev server, then test:

```bash
curl -s http://localhost:3002/api/storyboard/classify-segments \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {"sequence": 1, "text": "Snow was coming down as the rental car rolled south on I-75.", "start_index": 0, "end_index": 60},
      {"sequence": 2, "text": "Ohio sentencing grid for felony drug possession looks at two things.", "start_index": 61, "end_index": 130},
      {"sequence": 3, "text": "If you rewind further back, this situation does not exist in a vacuum.", "start_index": 131, "end_index": 200}
    ],
    "storyText": "Snow was coming down as the rental car rolled south on I-75. Ohio sentencing grid looks at two things. If you rewind further back, this situation does not exist in a vacuum.",
    "model": "openai/gpt-4.1-mini"
  }' | jq .
```

Expected: `{"success":true,"segments":[{"sequence":1,"classification":"action",...},{"sequence":2,"classification":"narration",...},{"sequence":3,"classification":"transition",...}]}`

**Step 2: Test chapter naming API**

```bash
curl -s http://localhost:3002/api/storyboard/chapter-names \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "chapters": [
      {"id":"ch1","sequence":1,"title":"Chapter 1","startIndex":0,"endIndex":500,"segmentIndices":[]},
      {"id":"ch2","sequence":2,"title":"Chapter 2","startIndex":501,"endIndex":1000,"segmentIndices":[]}
    ],
    "storyText": "Snow was coming down as the rental car rolled south on I-75, four men from California sitting on a secret... [truncated for testing]",
    "model": "openai/gpt-4.1-mini"
  }' | jq .
```

Expected: `{"names":[{"index":0,"name":"..."},{"index":1,"name":"..."}]}`

**Step 3: Test B-roll pool API**

```bash
curl -s http://localhost:3002/api/storyboard/broll-pool \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "chapterText": "Snow was coming down in that dull Midwest way... the rental car rolled south on I-75... four doors flew open... 816 OxyContin pills...",
    "chapterIndex": 0,
    "storyContext": "Documentary about a battle rapper arrested in Ohio",
    "stylePrompt": "Dark cinematic documentary style, desaturated colors, harsh lighting",
    "narrationSegments": [
      {"sequence": 5, "text": "Ohio sentencing grid for felony drug possession looks at two things."}
    ],
    "model": "openai/gpt-4.1-mini"
  }' | jq .
```

Expected: JSON with `categories` array containing themed B-roll categories with 4 prompts each.

**Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(storyboard): fixes from integration testing of documentary API routes"
git push origin main
```

---

## Task 13: End-to-End UI Testing

**Step 1: Manual E2E test**

1. Open http://localhost:3002 and navigate to the Storyboard
2. Toggle the mode to **Documentary**
3. Paste the Geechi Gotti story text
4. Click **Extract Characters & Locations**
5. Select a style guide (e.g., "Blade Runner Neon Noir")
6. Go to the Shots tab and set granularity to Level 2
7. Click **Generate Prompts** — this should trigger the documentary pipeline:
   - Segments get classified (toast shows action/narration/transition counts)
   - Chapters get detected and named (toast shows chapter names)
   - B-roll pools generate per chapter (toast shows category counts)
8. Go to the Gallery tab — should show the **DocumentaryTimeline** instead of the normal grid
9. Verify:
   - Chapter headers with cinematic names appear
   - Title card placeholders show for each chapter
   - Action segments show full-width
   - Narration segments show as B-roll at 70% width with badge
   - B-roll variant picker works (click to expand, click variant to select)
   - Chapter names are editable inline

**Step 2: Fix any issues found**

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(storyboard): complete documentary mode end-to-end integration"
git push origin main
```

---

## Summary of All Files

### New Files (7)
| File | Purpose |
|------|---------|
| `src/features/storyboard/services/segment-classification.service.ts` | Classifies segments as action/narration/transition |
| `src/features/storyboard/services/broll-pool.service.ts` | Generates themed B-roll pools with 4 variants each |
| `src/features/storyboard/services/title-card.service.ts` | Builds title card prompts for chapter images |
| `src/features/storyboard/hooks/useDocumentaryPipeline.ts` | Orchestrates the full documentary pipeline |
| `src/features/storyboard/components/gallery/DocumentaryTimeline.tsx` | Interleaved timeline gallery component |
| `src/app/api/storyboard/classify-segments/route.ts` | API route for segment classification |
| `src/app/api/storyboard/broll-pool/route.ts` | API route for B-roll pool generation |
| `src/app/api/storyboard/chapter-names/route.ts` | API route for chapter arc naming |

### Modified Files (5)
| File | Change |
|------|--------|
| `src/features/storyboard/types/storyboard.types.ts` | Add documentary types |
| `src/features/storyboard/store/storyboard.store.ts` | Add documentary state + actions |
| `src/features/storyboard/services/openrouter.service.ts` | Add `classifySegments` method |
| `src/features/storyboard/services/chapter-detection.service.ts` | Add `generateChapterArcNames` |
| `src/features/storyboard/components/story-input/StoryInput.tsx` | Add mode toggle |
| `src/features/storyboard/components/gallery/StoryboardGallery.tsx` | Conditional documentary timeline render |
