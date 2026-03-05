# Artist Judge — Writing Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an artist-as-judge system to the Writing Studio that scores drafts, gives line-level feedback in the artist's voice, and allows creative direction before/after generation.

**Architecture:** Post-generation LLM scoring pass where the AI becomes the artist persona to review drafts. Two new API routes (judge-drafts, revise-section). New store state for direction, judgments, and revision flow. Upgraded OptionGrid with scores and artist notes.

**Tech Stack:** Next.js API routes, OpenRouter (gpt-4.1), Zustand store, React components, TypeScript

---

### Task 1: Add Judge Types to writing-studio.types.ts

**Files:**
- Modify: `src/features/music-lab/types/writing-studio.types.ts`

**Step 1: Add the new interfaces at the end of the file**

```typescript
// ─── Artist Judge Types ──────────────────────────────────────────────────────

export interface LineNote {
  lineNumber: number
  note: string
  suggestion?: string
}

export interface ArtistJudgment {
  draftIndex: number
  vibe: string
  score: number
  rhymeScore: number
  lineNotes: LineNote[]
  wouldKeep: boolean
}

export interface JudgeResult {
  judgments: ArtistJudgment[]
  ranking: number[]
  rankingReason: string
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/writing-studio.types.ts
git commit -m "feat(music-lab): add artist judge types"
```

---

### Task 2: Create the Judge Drafts API Route

**Files:**
- Create: `src/app/api/artist-dna/judge-drafts/route.ts`

**Step 1: Create the route file**

This route takes 4 drafts + artist DNA and returns scored judgments. The prompt makes the AI become the artist and review their own work.

```typescript
/**
 * Judge Drafts API
 * AI becomes the artist persona and reviews/scores 4 draft options
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { DraftOption, SectionType } from '@/features/music-lab/types/writing-studio.types'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1'

interface JudgeDraftsBody {
  drafts: DraftOption[]
  sectionType: SectionType
  artistDna: ArtistDNA
  artistDirection?: string
}

function buildJudgePrompt(body: JudgeDraftsBody): string {
  const { sectionType, artistDna, artistDirection } = body
  const parts: string[] = []

  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName || 'the artist'
  const city = [artistDna.identity?.neighborhood, artistDna.identity?.city, artistDna.identity?.state].filter(Boolean).join(', ')

  parts.push(`You ARE ${artistName}${city ? ` from ${city}` : ''}.`)
  parts.push(`You are reviewing 4 draft options for a ${sectionType} section of YOUR new song.`)
  parts.push('Give your HONEST opinion as the artist. Be specific. Be yourself.')

  if (artistDna.identity?.backstory) {
    parts.push(`Your backstory: ${artistDna.identity.backstory.substring(0, 300)}`)
  }
  if (artistDna.persona?.attitude) {
    parts.push(`Your attitude: ${artistDna.persona.attitude}`)
  }
  if (artistDna.persona?.worldview) {
    parts.push(`Your worldview: ${artistDna.persona.worldview}`)
  }

  if (artistDirection) {
    parts.push(`The vibe you were going for: "${artistDirection}"`)
    parts.push('Judge each draft against this vibe. Does it capture what you wanted?')
  }

  // Rhyming DNA for scoring
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

  if (rhymeTypes?.length) {
    parts.push(`Your preferred rhyme types: ${rhymeTypes.join(', ')}`)
  }
  if (rhymePatterns?.length) {
    parts.push(`Your preferred rhyme patterns: ${rhymePatterns.join(', ')}`)
  }
  if (rhymeDensity !== undefined) {
    const label = rhymeDensity <= 25 ? 'SPARSE' : rhymeDensity <= 50 ? 'MODERATE' : rhymeDensity <= 75 ? 'DENSE' : 'EVERY LINE'
    parts.push(`Your rhyme density preference: ${label}`)
  }

  // Genome essence for voice matching
  if (artistDna.catalog?.genome?.essenceStatement) {
    parts.push(`Your writing DNA: ${artistDna.catalog.genome.essenceStatement}`)
  }

  // Lexicon for voice authenticity
  if (artistDna.lexicon?.signaturePhrases?.length) {
    parts.push(`Your signature phrases: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.slang?.length) {
    parts.push(`Your slang: ${artistDna.lexicon.slang.join(', ')}`)
  }

  parts.push('')
  parts.push('For each draft, return:')
  parts.push('- "vibe": 1-2 sentence gut reaction IN YOUR VOICE (first person, how you actually talk)')
  parts.push('- "score": 1-10 overall quality')
  parts.push('- "rhymeScore": 1-10 how well it follows YOUR rhyme style')
  parts.push('- "lineNotes": array of {lineNumber, note, suggestion} for lines that need work. lineNumber is 1-indexed. Only include lines that actually need feedback.')
  parts.push('- "wouldKeep": boolean, would YOU actually record this?')
  parts.push('')
  parts.push('Then rank all 4 from best to worst.')
  parts.push('')
  parts.push('Return ONLY valid JSON in this exact format:')
  parts.push('{')
  parts.push('  "judgments": [')
  parts.push('    {"draftIndex": 0, "vibe": "...", "score": 7, "rhymeScore": 8, "lineNotes": [{"lineNumber": 3, "note": "...", "suggestion": "..."}], "wouldKeep": true},')
  parts.push('    ...')
  parts.push('  ],')
  parts.push('  "ranking": [2, 0, 3, 1],')
  parts.push('  "rankingReason": "..."')
  parts.push('}')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as JudgeDraftsBody

    if (!body.drafts?.length || !body.sectionType || !body.artistDna) {
      return NextResponse.json({ error: 'drafts, sectionType, and artistDna are required' }, { status: 400 })
    }

    const systemPrompt = buildJudgePrompt(body)

    // Format drafts for the user message
    const draftsText = body.drafts.map((d, i) =>
      `--- DRAFT ${i} (Option ${d.label}) ---\n${d.content}`
    ).join('\n\n')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist Judge",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Review these ${body.drafts.length} drafts:\n\n${draftsText}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error (judge)', { error })
      return NextResponse.json({ error: 'Judge failed' }, { status: 500 })
    }

    const data = await response.json()
    let raw = data.choices?.[0]?.message?.content || ''

    let result
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      logger.api.error('Failed to parse judge JSON', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse judge response' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.api.error('Judge drafts error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/artist-dna/judge-drafts/route.ts
git commit -m "feat(music-lab): add judge-drafts API route"
```

---

### Task 3: Create the Revise Section API Route

**Files:**
- Create: `src/app/api/artist-dna/revise-section/route.ts`

**Step 1: Create the route file**

This route takes a selected draft + revision notes + judge feedback and rewrites the section.

```typescript
/**
 * Revise Section API
 * Rewrites a selected draft using artist revision notes and judge feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { SectionType, ArtistJudgment } from '@/features/music-lab/types/writing-studio.types'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1'

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

interface ReviseSectionBody {
  originalContent: string
  sectionType: SectionType
  revisionNotes: string
  judgment?: ArtistJudgment
  artistDna: ArtistDNA
  artistDirection?: string
}

function buildRevisionPrompt(body: ReviseSectionBody): string {
  const { sectionType, revisionNotes, judgment, artistDna, artistDirection } = body
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push(`Revise this ${sectionType} section based on the artist\'s feedback.`)
  parts.push('Return ONLY the revised lyrics as plain text. No JSON, no markdown, no explanation.')

  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName
  if (artistName) parts.push(`Writing for: ${artistName}`)

  if (artistDirection) {
    parts.push(`Original vibe direction: "${artistDirection}"`)
  }

  parts.push(`\nARTIST REVISION NOTES: "${revisionNotes}"`)

  if (judgment?.lineNotes?.length) {
    parts.push('\nLINE-LEVEL FEEDBACK FROM REVIEW:')
    judgment.lineNotes.forEach(n => {
      parts.push(`  Line ${n.lineNumber}: ${n.note}${n.suggestion ? ` → Suggestion: ${n.suggestion}` : ''}`)
    })
  }

  // Rhyming DNA
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

  if (rhymeTypes?.length || rhymePatterns?.length || rhymeDensity !== undefined) {
    parts.push('\nRHYMING STYLE:')
    if (rhymeTypes?.length) parts.push(`Preferred types: ${rhymeTypes.join(', ')}`)
    if (rhymePatterns?.length) parts.push(`Preferred patterns: ${rhymePatterns.join(', ')}`)
    if (rhymeDensity !== undefined) {
      const label = rhymeDensity <= 25 ? 'SPARSE' : rhymeDensity <= 50 ? 'MODERATE' : rhymeDensity <= 75 ? 'DENSE' : 'EVERY LINE'
      parts.push(`Density: ${label}`)
    }
  }

  if (artistDna.catalog?.genome?.essenceStatement) {
    parts.push(`\nArtist writing DNA: ${artistDna.catalog.genome.essenceStatement}`)
  }

  if (artistDna.lexicon?.signaturePhrases?.length) {
    parts.push(`Signature phrases: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.bannedWords?.length) {
    parts.push(`NEVER use: ${artistDna.lexicon.bannedWords.join(', ')}`)
  }

  parts.push(`\nNEVER use these AI words: ${BANNED_AI_PHRASES.join(', ')}`)
  parts.push('Keep the parts that work. Fix only what the feedback addresses. Maintain the overall structure and bar count.')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as ReviseSectionBody

    if (!body.originalContent || !body.sectionType || !body.revisionNotes || !body.artistDna) {
      return NextResponse.json({ error: 'originalContent, sectionType, revisionNotes, and artistDna are required' }, { status: 400 })
    }

    const systemPrompt = buildRevisionPrompt(body)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Section Revision",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the original ${body.sectionType}:\n\n${body.originalContent}\n\nRevise it based on the feedback above.` },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error (revise)', { error })
      return NextResponse.json({ error: 'Revision failed' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content: content.trim() })
  } catch (error) {
    logger.api.error('Revise section error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/artist-dna/revise-section/route.ts
git commit -m "feat(music-lab): add revise-section API route"
```

---

### Task 4: Add Artist Direction + Judge State to Zustand Store

**Files:**
- Modify: `src/features/music-lab/store/writing-studio.store.ts`

**Step 1: Add imports for new types**

Add to the import block at line 8-16:

```typescript
import type {
  SongSection,
  IdeaEntry,
  DraftOption,
  ToneSettings,
  SectionType,
  IdeaTag,
  JudgeResult,
  ArtistJudgment,
} from '../types/writing-studio.types'
```

**Step 2: Add new state fields to the WritingStudioState interface**

After the `sectionDrafts` field (line 34), add:

```typescript
  // Artist direction
  artistDirection: string
  sectionDirections: Record<string, string>

  // Artist judge
  isJudging: boolean
  judgeResult: JudgeResult | null
  sectionJudgments: Record<string, JudgeResult>

  // Revision
  isRevising: boolean
  revisionNotes: string
```

**Step 3: Add new action signatures to the interface**

After the `clearDraftOptions` action (line 52), add:

```typescript
  // Artist direction
  setArtistDirection: (direction: string) => void
  setSectionDirection: (sectionId: string, direction: string) => void

  // Judge
  judgeDrafts: (sectionId: string, drafts: DraftOption[], sectionType: SectionType, artistDna: unknown, artistDirection?: string) => Promise<void>
  clearJudgeResult: () => void

  // Revision
  reviseDraft: (sectionId: string, draft: DraftOption, revisionNotes: string, sectionType: SectionType, artistDna: unknown, judgment?: ArtistJudgment, artistDirection?: string) => Promise<void>
  setRevisionNotes: (notes: string) => void
```

**Step 4: Add initial state values**

In the create block after `sectionDrafts: {},` (line 89), add:

```typescript
      artistDirection: '',
      sectionDirections: {},
      isJudging: false,
      judgeResult: null,
      sectionJudgments: {},
      isRevising: false,
      revisionNotes: '',
```

**Step 5: Add action implementations**

After the `clearDraftOptions` implementation (line 253), add:

```typescript
      setArtistDirection: (direction) => set({ artistDirection: direction }),

      setSectionDirection: (sectionId, direction) => {
        set((state) => ({
          sectionDirections: { ...state.sectionDirections, [sectionId]: direction },
        }))
      },

      judgeDrafts: async (sectionId, drafts, sectionType, artistDna, artistDirection) => {
        set({ isJudging: true, judgeResult: null })
        try {
          const res = await fetch('/api/artist-dna/judge-drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drafts, sectionType, artistDna, artistDirection }),
          })
          if (res.ok) {
            const result = await res.json()
            set((state) => ({
              judgeResult: result,
              sectionJudgments: { ...state.sectionJudgments, [sectionId]: result },
            }))
          }
        } catch (error) {
          logger.musicLab.error('Failed to judge drafts', { error: error instanceof Error ? error.message : String(error) })
        } finally {
          set({ isJudging: false })
        }
      },

      clearJudgeResult: () => set({ judgeResult: null }),

      reviseDraft: async (sectionId, draft, revisionNotes, sectionType, artistDna, judgment, artistDirection) => {
        set({ isRevising: true })
        try {
          const res = await fetch('/api/artist-dna/revise-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalContent: draft.content,
              sectionType,
              revisionNotes,
              judgment,
              artistDna,
              artistDirection,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            // Replace the draft content with the revised version
            set((state) => ({
              draftOptions: state.draftOptions.map((d) =>
                d.id === draft.id ? { ...d, content: data.content } : d
              ),
              sectionDrafts: {
                ...state.sectionDrafts,
                [sectionId]: (state.sectionDrafts[sectionId] || []).map((d) =>
                  d.id === draft.id ? { ...d, content: data.content } : d
                ),
              },
              revisionNotes: '',
            }))
          }
        } catch (error) {
          logger.musicLab.error('Failed to revise draft', { error: error instanceof Error ? error.message : String(error) })
        } finally {
          set({ isRevising: false })
        }
      },

      setRevisionNotes: (notes) => set({ revisionNotes: notes }),
```

**Step 6: Update the resetStudio action**

Add the new state fields to the reset (around line 338):

```typescript
      resetStudio: () =>
        set({
          sections: [],
          activeSectionId: null,
          concept: '',
          draftOptions: [],
          sectionDrafts: {},
          isGenerating: false,
          isGeneratingFullSong: false,
          artistDirection: '',
          sectionDirections: {},
          isJudging: false,
          judgeResult: null,
          sectionJudgments: {},
          isRevising: false,
          revisionNotes: '',
        }),
```

**Step 7: Update the partialize function**

Add `artistDirection` and `sectionDirections` to persisted state (around line 351):

```typescript
      partialize: (state) => ({
        sections: state.sections,
        concept: state.concept,
        ideaBankByArtist: state.ideaBankByArtist,
        sectionDrafts: state.sectionDrafts,
        activeArtistId: state.activeArtistId,
        artistDirection: state.artistDirection,
        sectionDirections: state.sectionDirections,
      }),
```

**Step 8: Commit**

```bash
git add src/features/music-lab/store/writing-studio.store.ts
git commit -m "feat(music-lab): add judge + direction state to writing studio store"
```

---

### Task 5: Inject Artist Direction into Generation Prompts

**Files:**
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts`
- Modify: `src/app/api/artist-dna/generate-options/route.ts`

**Step 1: Add `artistDirection` to GenerateFullSongBody (generate-full-song/route.ts)**

Update the interface at line 26-31:

```typescript
interface GenerateFullSongBody {
  structure: StructureEntry[]
  tone: Pick<ToneSettings, 'emotion' | 'energy' | 'delivery'>
  concept: string
  artistDna: ArtistDNA
  artistDirection?: string
}
```

**Step 2: Inject direction into the prompt (generate-full-song/route.ts)**

After the concept injection (line 56), add:

```typescript
  if (body.artistDirection) {
    parts.push(`\nARTIST DIRECTION: "${body.artistDirection}"`)
    parts.push('The artist specifically wants this vibe. Let it guide the tone, imagery, and feel of every section.')
  }
```

**Step 3: Add `artistDirection` to GenerateOptionsBody (generate-options/route.ts)**

Update the interface at line 26-32:

```typescript
interface GenerateOptionsBody {
  sectionType: SectionType
  tone: ToneSettings
  concept: string
  artistDna: ArtistDNA
  previousSections: PreviousSection[]
  artistDirection?: string
}
```

**Step 4: Inject direction into the prompt (generate-options/route.ts)**

After the concept injection (line 71), add:

```typescript
  if (body.artistDirection) {
    parts.push(`\nARTIST DIRECTION: "${body.artistDirection}"`)
    parts.push('The artist specifically wants this vibe. Let it guide the tone, imagery, and feel.')
  }
```

**Step 5: Commit**

```bash
git add src/app/api/artist-dna/generate-full-song/route.ts src/app/api/artist-dna/generate-options/route.ts
git commit -m "feat(music-lab): inject artist direction into generation prompts"
```

---

### Task 6: Add Artist Direction UI to StudioTab

**Files:**
- Modify: `src/features/music-lab/components/writing-studio/StudioTab.tsx`

**Step 1: Pull new store fields**

Update the destructured store values (lines 21-33) to include:

```typescript
  const {
    sections,
    activeSectionId,
    concept,
    setConcept,
    isGenerating,
    isGeneratingFullSong,
    draftOptions,
    generateOptions,
    generateFullSong,
    resetStudio,
    setActiveArtistId,
    artistDirection,
    setArtistDirection,
    isJudging,
    judgeResult,
    judgeDrafts,
  } = useWritingStudioStore()
```

**Step 2: Add artist direction input**

After the concept suggestions div (after line 193, before the 3-column layout), add:

```tsx
        {/* Artist direction */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            What vibe are you going for?
            <span className="text-muted-foreground/50 ml-1 font-normal">(optional)</span>
          </label>
          <Input
            value={artistDirection}
            onChange={(e) => setArtistDirection(e.target.value)}
            placeholder="e.g. Late night confession, like talking to yourself at 3am..."
            className="text-sm"
          />
        </div>
```

**Step 3: Pass artistDirection to generateOptions**

Update the `doGenerate` function (line 49-52) to pass direction:

```typescript
  const doGenerate = () => {
    if (!activeSectionId) return
    generateOptions(activeSectionId, artistDna, sections)
  }
```

Note: The artistDirection will be sent to the API via the store's generateOptions — we need to update the store's generateOptions call in the next step to include it.

**Step 4: Update generateOptions in the store to pass artistDirection**

In `writing-studio.store.ts`, update the `generateOptions` method body (around line 177) to include `artistDirection`:

```typescript
      body: JSON.stringify({
        sectionType: section.type,
        tone: section.tone,
        concept: get().concept,
        artistDna,
        artistDirection: get().artistDirection,
        previousSections: previousSections
          .filter((s) => s.selectedDraft)
          .map((s) => ({
            type: s.type,
            content: s.selectedDraft!.content,
          })),
      }),
```

**Step 5: Also update generateFullSong in the store to pass artistDirection**

In `writing-studio.store.ts`, update the `generateFullSong` fetch body (around line 300):

```typescript
      body: JSON.stringify({ structure, tone, concept, artistDna, artistDirection: get().artistDirection }),
```

**Step 6: Auto-trigger judge after draft generation**

In the store's `generateOptions` method, after drafts are loaded successfully (after line 199), add the judge call:

```typescript
          if (res.ok) {
            const data = await res.json()
            const options = data.options || []
            set((state) => ({
              draftOptions: options,
              sectionDrafts: { ...state.sectionDrafts, [sectionId]: options },
            }))
            // Auto-judge the drafts
            if (options.length > 0) {
              const state = get()
              state.judgeDrafts(sectionId, options, section.type, artistDna, state.artistDirection)
            }
          }
```

**Step 7: Commit**

```bash
git add src/features/music-lab/components/writing-studio/StudioTab.tsx src/features/music-lab/store/writing-studio.store.ts
git commit -m "feat(music-lab): add artist direction UI and auto-judge trigger"
```

---

### Task 7: Upgrade OptionGrid with Judge Scores and Artist Notes

**Files:**
- Modify: `src/features/music-lab/components/writing-studio/OptionGrid.tsx`

**Step 1: Rewrite OptionGrid to include judge data**

This is the main UI upgrade. The DraftCard component gets:
- Artist vibe quote at top
- Score + rhyme score badges
- "Would Keep" stamp
- Line highlights with hover notes
- Revision notes input after selecting "Keep"

Replace the entire file content with:

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Check, Scissors, Trash2, X, Star, Loader2, RefreshCw, MessageSquareText } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { DraftOption, IdeaTag, ArtistJudgment } from '../../types/writing-studio.types'
import { IDEA_TAGS } from '../../types/writing-studio.types'

function ScoreBadge({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {label}: {score}/10
    </span>
  )
}

function DraftCard({ draft, judgment, rank }: { draft: DraftOption; judgment?: ArtistJudgment; rank?: number }) {
  const {
    activeSectionId,
    keepDraft,
    addToIdeaBank,
    tossDraft,
    editDraft,
    reviseDraft,
    isRevising,
    sections,
    artistDirection,
  } = useWritingStudioStore()
  const { draft: artistDna } = useArtistDnaStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(draft.content)
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const [showChopTags, setShowChopTags] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [revisionText, setRevisionText] = useState('')

  const lines = useMemo(() => draft.content.split('\n').filter(l => l.trim()), [draft.content])

  // Build a map of lineNumber -> LineNote for highlighting
  const lineNoteMap = useMemo(() => {
    const map = new Map<number, { note: string; suggestion?: string }>()
    if (judgment?.lineNotes) {
      judgment.lineNotes.forEach(n => map.set(n.lineNumber, { note: n.note, suggestion: n.suggestion }))
    }
    return map
  }, [judgment])

  const activeSection = sections.find(s => s.id === activeSectionId)

  const handleKeep = () => {
    if (activeSectionId) keepDraft(activeSectionId, draft)
  }

  const handleRevise = () => {
    if (!activeSectionId || !revisionText.trim() || !activeSection) return
    reviseDraft(activeSectionId, draft, revisionText, activeSection.type, artistDna, judgment, artistDirection)
    setShowRevision(false)
    setRevisionText('')
  }

  const handleSaveEdit = () => {
    editDraft(draft.id, editText)
    setIsEditing(false)
  }

  const toggleLine = (idx: number) => {
    setSelectedLines(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleChopSelected = (tags: IdeaTag[]) => {
    const text = selectedLines.size > 0
      ? [...selectedLines].sort((a, b) => a - b).map(i => lines[i]).join('\n')
      : draft.content
    addToIdeaBank(text, tags, 'chopped')
    setSelectedLines(new Set())
    setShowChopTags(false)
    setIsEditing(false)
  }

  const openEditMode = () => {
    setEditText(draft.content)
    setSelectedLines(new Set())
    setIsEditing(true)
  }

  const scoreColor = judgment
    ? judgment.score >= 7 ? 'bg-green-500/15 text-green-400'
      : judgment.score >= 4 ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400'
    : ''

  const rhymeScoreColor = judgment
    ? judgment.rhymeScore >= 7 ? 'bg-green-500/15 text-green-400'
      : judgment.rhymeScore >= 4 ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400'
    : ''

  return (
    <div className={`rounded-lg border bg-card p-3 flex flex-col gap-2 ${
      judgment?.wouldKeep ? 'border-green-500/40' : 'border-border/50'
    }`}>
      {/* Header: label + rank + scores */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">Option {draft.label}</span>
          {rank !== undefined && (
            <span className="text-[10px] text-muted-foreground">#{rank + 1}</span>
          )}
          {judgment?.wouldKeep && (
            <Star className="w-3 h-3 text-green-400 fill-green-400" />
          )}
        </div>
        {judgment && (
          <div className="flex items-center gap-1.5">
            <ScoreBadge label="Overall" score={judgment.score} color={scoreColor} />
            <ScoreBadge label="Rhyme" score={judgment.rhymeScore} color={rhymeScoreColor} />
          </div>
        )}
      </div>

      {/* Artist vibe quote */}
      {judgment?.vibe && (
        <p className="text-xs italic text-muted-foreground/80 border-l-2 border-amber-500/30 pl-2 py-0.5">
          &ldquo;{judgment.vibe}&rdquo;
        </p>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm min-h-[120px] resize-y"
          />
          <div className="border border-border/30 rounded-md p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground mb-1">Select lines for Idea Bank:</p>
            {lines.map((line, idx) => (
              <label key={idx} className="flex items-start gap-2 cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5">
                <Checkbox
                  checked={selectedLines.has(idx)}
                  onCheckedChange={() => toggleLine(idx)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span className="text-xs leading-snug">{line}</span>
              </label>
            ))}
          </div>
          {showChopTags ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                Tag {selectedLines.size > 0 ? `${selectedLines.size} line${selectedLines.size > 1 ? 's' : ''}` : 'all'} for Idea Bank:
              </p>
              <div className="flex flex-wrap gap-1">
                {IDEA_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleChopSelected([tag])}
                    className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowChopTags(false)}
              >
                <X className="w-3 h-3 inline" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={() => setShowChopTags(true)}
              >
                <Scissors className="w-3 h-3 mr-1" />
                {selectedLines.size > 0 ? `Chop ${selectedLines.size}` : 'Chop All'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Lyrics with line-level highlights */
        <TooltipProvider>
          <div className="text-sm whitespace-pre-wrap flex-1 min-h-[60px] space-y-0">
            {lines.map((line, idx) => {
              const lineNum = idx + 1
              const note = lineNoteMap.get(lineNum)
              return note ? (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className="bg-amber-500/10 border-l-2 border-amber-500/40 pl-1.5 -ml-1.5 cursor-help rounded-r">
                      {line}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[280px]">
                    <p className="text-xs font-medium">{note.note}</p>
                    {note.suggestion && (
                      <p className="text-xs text-amber-400 mt-1">Try: {note.suggestion}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={idx}>{line}</div>
              )
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Revision input */}
      {showRevision && (
        <div className="space-y-2 border-t border-border/30 pt-2">
          <label className="text-[10px] text-muted-foreground font-medium">Revision Notes</label>
          <Input
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder="e.g. Make verse 2 punchier, swap the metaphor in line 3..."
            className="text-xs h-8"
            onKeyDown={(e) => { if (e.key === 'Enter') handleRevise() }}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-amber-400 hover:text-amber-300"
              onClick={handleRevise}
              disabled={isRevising || !revisionText.trim()}
            >
              {isRevising ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Revise
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRevision(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isEditing && !showRevision && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={handleKeep}
          >
            <Check className="w-3 h-3 mr-1" /> Keep
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={() => setShowRevision(true)}
          >
            <MessageSquareText className="w-3 h-3 mr-1" /> Revise
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={openEditMode}
          >
            <Scissors className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => tossDraft(draft.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Toss
          </Button>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton({ label }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      {label && <div className="h-2 w-24 bg-muted/50 rounded mb-2" />}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
    </div>
  )
}

function JudgingSkeleton() {
  return (
    <div className="col-span-2 flex items-center justify-center gap-2 py-3">
      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      <span className="text-xs text-muted-foreground">Artist is reviewing drafts...</span>
    </div>
  )
}

export function OptionGrid() {
  const { draftOptions, isGenerating, isJudging, judgeResult } = useWritingStudioStore()

  if (isGenerating) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    )
  }

  if (draftOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
        Click Generate to create draft options
      </div>
    )
  }

  // Sort drafts by artist ranking if available
  const sortedDrafts = judgeResult?.ranking
    ? judgeResult.ranking.map(i => draftOptions[i]).filter(Boolean)
    : draftOptions

  // Build judgment map by draft index
  const judgmentMap = new Map<string, { judgment: ArtistJudgment; rank: number }>()
  if (judgeResult) {
    judgeResult.judgments.forEach(j => {
      const draft = draftOptions[j.draftIndex]
      if (draft) {
        const rank = judgeResult.ranking.indexOf(j.draftIndex)
        judgmentMap.set(draft.id, { judgment: j, rank })
      }
    })
  }

  return (
    <div className="space-y-2">
      {/* Ranking reason */}
      {judgeResult?.rankingReason && (
        <p className="text-xs text-muted-foreground/70 italic px-1">
          {judgeResult.rankingReason}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {isJudging && <JudgingSkeleton />}
        {sortedDrafts.map((draft) => {
          const entry = judgmentMap.get(draft.id)
          return (
            <DraftCard
              key={draft.id}
              draft={draft}
              judgment={entry?.judgment}
              rank={entry?.rank}
            />
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Verify Tooltip component exists**

Check if `@/components/ui/tooltip` exists. If not, it needs to be added via shadcn:

```bash
npx shadcn@latest add tooltip
```

**Step 3: Commit**

```bash
git add src/features/music-lab/components/writing-studio/OptionGrid.tsx
git commit -m "feat(music-lab): upgrade OptionGrid with judge scores, artist notes, and revision"
```

---

### Task 8: Add Per-Section Direction to FullSongBuilder

**Files:**
- Modify: `src/features/music-lab/components/writing-studio/FullSongBuilder.tsx`

**Step 1: Add per-section direction state**

In the FullSongBuilder component, after the `delivery` state (line 214), add:

```typescript
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({})
```

**Step 2: Add a note input to SortableSectionChip**

Update the `SortableSectionChip` component to accept and display a note input. Add the props:

```typescript
function SortableSectionChip({
  entry,
  onRemove,
  onBarCountChange,
  note,
  onNoteChange,
}: {
  entry: StructureEntry
  onRemove: () => void
  onBarCountChange: (count: number) => void
  note?: string
  onNoteChange?: (note: string) => void
})
```

After the bar count editor div (after line 192), add:

```tsx
      {/* Section note */}
      {onNoteChange && (
        <input
          type="text"
          value={note || ''}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Direction..."
          className="w-full mt-1 text-[10px] bg-background/30 border border-border/30 rounded px-1.5 py-0.5
                     placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/50"
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
```

**Step 3: Pass note props to SortableSectionChip**

Update the render (around line 353):

```tsx
  <SortableSectionChip
    key={entry.id}
    entry={entry}
    onRemove={() => removeSection(entry.id)}
    onBarCountChange={(count) => updateBarCount(entry.id, count)}
    note={sectionNotes[entry.id] || ''}
    onNoteChange={(note) => setSectionNotes(prev => ({ ...prev, [entry.id]: note }))}
  />
```

**Step 4: Commit**

```bash
git add src/features/music-lab/components/writing-studio/FullSongBuilder.tsx
git commit -m "feat(music-lab): add per-section direction notes to FullSongBuilder"
```

---

### Task 9: Build, Fix, and Final Commit

**Files:**
- All modified files

**Step 1: Run a clean build**

```bash
rm -rf .next && npm run build
```

**Step 2: Fix any TypeScript or ESLint errors**

Address each error. Common likely issues:
- Missing Tooltip import (need to add shadcn tooltip component)
- Type mismatches between store and components
- Unused imports from refactoring

**Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat(music-lab): artist judge writing quality system - complete"
git push origin main
```

---

### Task 10: Manual Smoke Test

**Not code — verification checklist:**

1. Open Music Lab → select an artist → go to Writing Studio
2. Type a concept and an artist direction ("late night confession vibe")
3. Add a section and click Generate
4. Verify: 4 drafts appear, then "Artist is reviewing..." indicator shows
5. Verify: Drafts reorder by ranking, scores appear, vibe quotes show
6. Hover over highlighted lines — verify tooltip shows note + suggestion
7. Click "Revise" on a draft, type notes, submit — verify revised content replaces original
8. Open Full Song Builder → verify per-section direction inputs on chips
9. Generate full song — verify artist direction is reflected in output quality
