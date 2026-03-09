# Song Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Import Lyrics" to the Writing Studio — paste lyrics, auto-detect sections via LLM, confirm/adjust, load into studio for collaborative editing.

**Architecture:** New API route `/api/artist-dna/analyze-lyrics` sends lyrics to OpenRouter LLM which returns detected sections as JSON. New `ImportLyricsModal` component handles paste → analyze → adjust → load flow. Store gets one new action `importSections()` to bulk-load sections.

**Tech Stack:** Next.js API route, OpenRouter (gpt-4.1-mini), Zustand store action, React modal component

---

### Task 1: Add `DetectedSection` type and `importSections` store action

**Files:**
- Modify: `src/features/music-lab/types/writing-studio.types.ts`
- Modify: `src/features/music-lab/store/writing-studio.store.ts`

**Step 1: Add DetectedSection type**

In `src/features/music-lab/types/writing-studio.types.ts`, add at the end of the file (before the judge types):

```typescript
// ─── Song Import Types ──────────────────────────────────────────────────────

export interface DetectedSection {
  type: SectionType
  label: string       // e.g. "Verse 1", "Hook", "Bridge"
  lines: string[]     // Lines of lyrics in this section
}
```

**Step 2: Add `importSections` to store interface**

In `src/features/music-lab/store/writing-studio.store.ts`, add to the `WritingStudioState` interface after `resetStudio`:

```typescript
  // Import
  importSections: (detected: DetectedSection[]) => void
```

Add the import for `DetectedSection` to the type imports at the top.

**Step 3: Implement `importSections` in the store**

Add the implementation inside the `create` block, after `resetStudio`:

```typescript
importSections: (detected) => {
  const sections: SongSection[] = detected.map((d) => {
    const barDefaults = BAR_COUNT_RANGES[d.type]
    return {
      id: crypto.randomUUID(),
      type: d.type,
      tone: { ...DEFAULT_TONE, barCount: barDefaults.default },
      selectedDraft: {
        id: crypto.randomUUID(),
        content: d.lines.join('\n'),
        label: 'A',
      },
      isLocked: false,
    }
  })
  set({
    sections,
    activeSectionId: sections[0]?.id ?? null,
    draftOptions: [],
    sectionDrafts: {},
    sectionJudgments: {},
    sectionDirections: {},
  })
},
```

**Step 4: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/music-lab/types/writing-studio.types.ts src/features/music-lab/store/writing-studio.store.ts
git commit -m "feat(music-lab): add DetectedSection type and importSections store action"
```

---

### Task 2: Create `/api/artist-dna/analyze-lyrics` API route

**Files:**
- Create: `src/app/api/artist-dna/analyze-lyrics/route.ts`

**Step 1: Create the API route**

Create `src/app/api/artist-dna/analyze-lyrics/route.ts`:

```typescript
/**
 * Analyze Lyrics API
 * Detects song sections (intro, verse, hook, bridge, outro) from pasted lyrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

interface AnalyzeLyricsBody {
  lyrics: string
  artistName?: string
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body: AnalyzeLyricsBody = await request.json()
    const { lyrics, artistName } = body

    if (!lyrics || lyrics.trim().length === 0) {
      return NextResponse.json({ error: 'Lyrics are required' }, { status: 400 })
    }

    const systemPrompt = `You are a music structure analyst. Analyze the following song lyrics and break them into sections.

Rules:
- Identify each section as one of: intro, verse, hook, bridge, outro
- Repeated choruses/refrains should be labeled "hook"
- Number verses sequentially (Verse 1, Verse 2, etc.)
- Number hooks if there are multiple (Hook, Hook 2, etc.) — but if the same chorus repeats, just call each one "Hook"
- Look for structural cues: short opening lines = intro, repeated lines = hook, narrative progression = verse, tonal shift = bridge, closing/fade = outro
${artistName ? `- The artist is "${artistName}" — use knowledge of their style to inform section detection` : ''}

Return ONLY a JSON array. No markdown, no code fences, no explanation.
Each element: {"type": "verse"|"hook"|"intro"|"bridge"|"outro", "label": "Verse 1", "lines": ["line 1", "line 2"]}

Analyze these lyrics:`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://directorspalette.com',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lyrics },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.api.error('OpenRouter analyze-lyrics failed', { status: response.status, error: errorText })
      return NextResponse.json({ error: 'Analysis failed' }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'No analysis returned' }, { status: 502 })
    }

    // Parse JSON — strip markdown fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const sections = JSON.parse(jsonStr)

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid analysis format' }, { status: 502 })
    }

    return NextResponse.json({ sections })
  } catch (error) {
    logger.api.error('analyze-lyrics error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds, new route appears in output

**Step 3: Commit**

```bash
git add src/app/api/artist-dna/analyze-lyrics/route.ts
git commit -m "feat(music-lab): add analyze-lyrics API route for section detection"
```

---

### Task 3: Create `ImportLyricsModal` component

**Files:**
- Create: `src/features/music-lab/components/writing-studio/ImportLyricsModal.tsx`

**Step 1: Create the modal component**

Create `src/features/music-lab/components/writing-studio/ImportLyricsModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, ArrowRight, Merge, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { DetectedSection, SectionType } from '../../types/writing-studio.types'

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'hook', label: 'Hook' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
]

interface ImportLyricsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportLyricsModal({ open, onOpenChange }: ImportLyricsModalProps) {
  const [lyrics, setLyrics] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detected, setDetected] = useState<DetectedSection[] | null>(null)

  const importSections = useWritingStudioStore((s) => s.importSections)
  const artistDna = useArtistDnaStore((s) => s.draft)

  const handleAnalyze = async () => {
    if (!lyrics.trim()) {
      toast.error('Paste some lyrics first')
      return
    }

    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/artist-dna/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: lyrics.trim(),
          artistName: artistDna?.identity?.stageName || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const data = await res.json()
      setDetected(data.sections)
      toast.success(`Detected ${data.sections.length} sections`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRelabel = (index: number, type: SectionType) => {
    if (!detected) return
    const updated = [...detected]
    updated[index] = {
      ...updated[index],
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }
    setDetected(updated)
  }

  const handleMerge = (index: number) => {
    if (!detected || index >= detected.length - 1) return
    const updated = [...detected]
    const merged: DetectedSection = {
      type: updated[index].type,
      label: updated[index].label,
      lines: [...updated[index].lines, ...updated[index + 1].lines],
    }
    updated.splice(index, 2, merged)
    setDetected(updated)
  }

  const handleSplit = (sectionIndex: number, lineIndex: number) => {
    if (!detected) return
    const section = detected[sectionIndex]
    if (lineIndex <= 0 || lineIndex >= section.lines.length) return

    const first: DetectedSection = {
      type: section.type,
      label: section.label,
      lines: section.lines.slice(0, lineIndex),
    }
    const second: DetectedSection = {
      type: section.type,
      label: section.label + ' (cont.)',
      lines: section.lines.slice(lineIndex),
    }

    const updated = [...detected]
    updated.splice(sectionIndex, 1, first, second)
    setDetected(updated)
  }

  const handleLoad = () => {
    if (!detected || detected.length === 0) return
    importSections(detected)
    toast.success(`Loaded ${detected.length} sections into studio`)
    // Reset and close
    setLyrics('')
    setDetected(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    setLyrics('')
    setDetected(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            Import Lyrics
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          {/* Left: Paste area */}
          <div className="flex-1 flex flex-col gap-3">
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste your lyrics here..."
              className="flex-1 min-h-[300px] resize-none bg-zinc-950 border-zinc-700 text-sm font-mono"
              disabled={isAnalyzing}
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !lyrics.trim()}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Analyze Sections
                </>
              )}
            </Button>
          </div>

          {/* Right: Detected sections */}
          {detected && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="text-xs font-medium text-muted-foreground">
                {detected.length} sections detected — adjust labels or merge/split as needed
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {detected.map((section, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2"
                  >
                    {/* Section header with type selector */}
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={section.type}
                        onValueChange={(val) => handleRelabel(sIdx, val as SectionType)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-zinc-900 border-zinc-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_TYPES.map((st) => (
                            <SelectItem key={st.value} value={st.value}>
                              {st.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-1">
                        {sIdx < detected.length - 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground"
                            onClick={() => handleMerge(sIdx)}
                            title="Merge with next section"
                          >
                            <Merge className="w-3 h-3 mr-1" />
                            Merge
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Lines */}
                    <div className="text-xs text-zinc-300 font-mono leading-relaxed">
                      {section.lines.map((line, lIdx) => (
                        <div key={lIdx} className="group flex items-start gap-1">
                          <span className="flex-1 py-0.5">{line || '\u00A0'}</span>
                          {lIdx > 0 && lIdx < section.lines.length && (
                            <button
                              onClick={() => handleSplit(sIdx, lIdx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-cyan-400 hover:text-cyan-300"
                              title="Split here"
                            >
                              <Scissors className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleLoad} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                Load into Studio ({detected.length} sections)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/music-lab/components/writing-studio/ImportLyricsModal.tsx
git commit -m "feat(music-lab): add ImportLyricsModal component"
```

---

### Task 4: Wire up Import button in StudioTab

**Files:**
- Modify: `src/features/music-lab/components/writing-studio/StudioTab.tsx`

**Step 1: Add import and state**

At the top of `StudioTab.tsx`, add the import:

```typescript
import { ImportLyricsModal } from './ImportLyricsModal'
import { FileInput } from 'lucide-react'
```

Add `FileInput` to the existing lucide-react import, and add state in the component:

```typescript
const [showImportModal, setShowImportModal] = useState(false)
```

**Step 2: Add the Import button next to Full Song button**

In the header `<div className="flex items-center gap-2">`, add the Import button before the Full Song button:

```typescript
<Button
  variant="outline"
  size="sm"
  className="text-xs gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
  onClick={() => setShowImportModal(true)}
>
  <FileInput className="w-3 h-3" />
  Import Lyrics
</Button>
```

**Step 3: Add the modal at the bottom of the component return**

Just before the closing `</Card>` tag, add:

```typescript
<ImportLyricsModal
  open={showImportModal}
  onOpenChange={setShowImportModal}
/>
```

**Step 4: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Manual test**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002`

1. Navigate to Music Lab → Writing Studio
2. Verify "Import Lyrics" button appears next to "Full Song"
3. Click it — modal should open with textarea
4. Paste lyrics → click Analyze → sections should appear on right
5. Relabel a section via dropdown
6. Click "Load into Studio" → sections should appear in the Writing Studio

**Step 6: Commit**

```bash
git add src/features/music-lab/components/writing-studio/StudioTab.tsx
git commit -m "feat(music-lab): wire Import Lyrics button into Writing Studio header"
```

**Step 7: Push to production**

```bash
git push origin main
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Types + store action | `writing-studio.types.ts`, `writing-studio.store.ts` |
| 2 | API route for LLM analysis | `api/artist-dna/analyze-lyrics/route.ts` |
| 3 | Import modal component | `ImportLyricsModal.tsx` |
| 4 | Wire into StudioTab | `StudioTab.tsx` |

Total: 4 tasks, 2 new files, 3 modified files.
