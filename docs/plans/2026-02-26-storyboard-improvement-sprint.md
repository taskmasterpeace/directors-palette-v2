# Storyboard Improvement Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix character sheet generation, add IndexedDB persistence with project management, and polish the storyboard feature.

**Architecture:** Fix two bugs in CharacterSheetGenerator (preselection logic + style guard UX), add Dexie.js IndexedDB layer for large state persistence alongside existing localStorage for settings, extract gallery handlers into hooks, stabilize video subscription.

**Tech Stack:** Next.js 15, TypeScript (strict), Zustand, Dexie.js (new), React 19

---

## Phase 1: Fix Character Sheet Generation (Tasks 1-2)

### Task 1: Fix Character Pre-Selection Logic

**Files:**
- Modify: `src/features/storyboard/components/entities/CharacterSheetGenerator.tsx` (lines 80-90)
- Modify: `src/features/storyboard/components/entities/CharacterList.tsx` (lines 516-518)

**Problem:** Two bugs prevent "Generate Sheet" from working:
1. `CharacterList.handleOpenCharacterSheetRecipe()` calls `setPreSelectedCharacterId(id)` but does NOT switch tabs — user may not see the generator
2. `CharacterSheetGenerator` useEffect (line 80-90) silently drops the pre-selection if `!char.has_reference || !char.reference_image_url` — but character sheets should work WITHOUT an existing reference image

**Step 1: Fix CharacterList to navigate to the generate tab**

In `CharacterList.tsx`, find the `handleOpenCharacterSheetRecipe` function (around line 516). It currently only sets `preSelectedCharacterId`. Update it to also switch to the entities tab and signal the CharacterSheetPanel:

```typescript
const handleOpenCharacterSheetRecipe = (characterId: string) => {
    setPreSelectedCharacterId(characterId)
    setInternalTab('entities') // ensure we're on the entities tab
}
```

Verify `setInternalTab` is already pulled from the store in this component's destructuring.

**Step 2: Fix CharacterSheetGenerator useEffect to accept all characters**

In `CharacterSheetGenerator.tsx`, the useEffect at lines 80-90 has this guard:
```typescript
if (char?.has_reference && char?.reference_image_url) {
```

Remove the reference image requirement — pre-selection should work for ANY character:
```typescript
if (char) {
    setSelectedCharacterId(preSelectedCharacterId)
    setPreSelectedCharacterId(null)
}
```

**Step 3: Improve the style guard UX**

In `CharacterSheetGenerator.tsx` `handleGenerate` (line 195-198), the error message is set to a local `error` state that may not be visible. Add a toast:

```typescript
if (!effectiveStyleGuide) {
    toast.error('Style guide required', {
        description: 'Select a style in the Style tab before generating character sheets.',
        action: {
            label: 'Go to Style',
            onClick: () => setInternalTab('style'),
        },
    })
    return
}
```

Import `toast` from `sonner` if not already imported.

**Step 4: Verify build passes**

```bash
rm -rf .next && npm run build
```

**Step 5: Commit**

```bash
git add src/features/storyboard/components/entities/CharacterSheetGenerator.tsx src/features/storyboard/components/entities/CharacterList.tsx
git commit -m "fix(storyboard): fix character sheet pre-selection and style guard UX"
```

---

### Task 2: Test Character Sheet Generation End-to-End

**Step 1: Start dev server**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

**Step 2: Manual smoke test**

1. Open http://localhost:3002
2. Go to Storyboard tab
3. Paste story text, click Extract
4. Go to Style tab, select a preset style (e.g., Comic Book)
5. Go to Entities tab
6. Click "Generate Sheet" on a character
7. Verify: toast appears if no style, generation starts if style is set
8. Verify: the CharacterSheetPanel generate tab is visible and character is pre-selected

**Step 3: Fix any issues found and commit**

---

## Phase 2: IndexedDB Persistence (Tasks 3-6)

### Task 3: Install Dexie and Create Database Schema

**Files:**
- Create: `src/features/storyboard/services/storyboard-db.service.ts`
- Modify: `package.json` (add dexie dependency)

**Step 1: Install Dexie**

```bash
npm install dexie
```

**Step 2: Create the database service**

```typescript
// src/features/storyboard/services/storyboard-db.service.ts
import Dexie, { type Table } from 'dexie'

export interface StoryboardProject {
  id?: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface StoredPrompts {
  id?: number
  projectId: number
  prompts: Array<{
    sequence: number
    prompt: string
    shotType: string
    originalText?: string
    characterRefs?: string[]
    locationRef?: { name: string; tag: string; reference_image_url?: string }
  }>
}

export interface StoredImages {
  id?: number
  projectId: number
  images: Record<number, {
    sequence: number
    status: string
    imageUrl?: string
    prompt: string
    config?: Record<string, unknown>
    videoStatus?: string
    videoUrl?: string
    animationPrompt?: string
    videoPredictionId?: string
  }>
}

export interface StoredChapters {
  id?: number
  projectId: number
  chapters: unknown[] // StoryChapter[]
  documentaryChapters: unknown[] // DocumentaryChapter[]
}

export interface StoredBreakdown {
  id?: number
  projectId: number
  breakdown: unknown // BreakdownResult
  level: number
}

class StoryboardDatabase extends Dexie {
  projects!: Table<StoryboardProject>
  prompts!: Table<StoredPrompts>
  images!: Table<StoredImages>
  chapters!: Table<StoredChapters>
  breakdowns!: Table<StoredBreakdown>

  constructor() {
    super('storyboard-projects')
    this.version(1).stores({
      projects: '++id, name, updatedAt',
      prompts: '++id, projectId',
      images: '++id, projectId',
      chapters: '++id, projectId',
      breakdowns: '++id, projectId',
    })
  }
}

export const storyboardDb = new StoryboardDatabase()
```

**Step 3: Verify build passes**

```bash
rm -rf .next && npm run build
```

**Step 4: Commit**

```bash
git add package.json package-lock.json src/features/storyboard/services/storyboard-db.service.ts
git commit -m "feat(storyboard): add Dexie IndexedDB schema for project persistence"
```

---

### Task 4: Add CRUD Operations to Database Service

**Files:**
- Modify: `src/features/storyboard/services/storyboard-db.service.ts`

**Step 1: Add project CRUD methods**

Add these methods to the bottom of the file (NOT as class methods — keep it as plain functions for simplicity):

```typescript
// ── Project CRUD ─────────────────────────────────────

export async function createProject(name: string): Promise<number> {
  const now = new Date()
  return storyboardDb.projects.add({ name, createdAt: now, updatedAt: now })
}

export async function getProject(id: number): Promise<StoryboardProject | undefined> {
  return storyboardDb.projects.get(id)
}

export async function listProjects(): Promise<StoryboardProject[]> {
  return storyboardDb.projects.orderBy('updatedAt').reverse().toArray()
}

export async function updateProjectTimestamp(id: number): Promise<void> {
  await storyboardDb.projects.update(id, { updatedAt: new Date() })
}

export async function deleteProject(id: number): Promise<void> {
  await storyboardDb.transaction('rw', [storyboardDb.projects, storyboardDb.prompts, storyboardDb.images, storyboardDb.chapters, storyboardDb.breakdowns], async () => {
    await storyboardDb.prompts.where('projectId').equals(id).delete()
    await storyboardDb.images.where('projectId').equals(id).delete()
    await storyboardDb.chapters.where('projectId').equals(id).delete()
    await storyboardDb.breakdowns.where('projectId').equals(id).delete()
    await storyboardDb.projects.delete(id)
  })
}

// ── Data persistence ─────────────────────────────────

export async function savePrompts(projectId: number, prompts: StoredPrompts['prompts']): Promise<void> {
  const existing = await storyboardDb.prompts.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.prompts.update(existing.id, { prompts })
  } else {
    await storyboardDb.prompts.add({ projectId, prompts })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadPrompts(projectId: number): Promise<StoredPrompts['prompts'] | null> {
  const record = await storyboardDb.prompts.where('projectId').equals(projectId).first()
  return record?.prompts ?? null
}

export async function saveImages(projectId: number, images: StoredImages['images']): Promise<void> {
  const existing = await storyboardDb.images.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.images.update(existing.id, { images })
  } else {
    await storyboardDb.images.add({ projectId, images })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadImages(projectId: number): Promise<StoredImages['images'] | null> {
  const record = await storyboardDb.images.where('projectId').equals(projectId).first()
  return record?.images ?? null
}

export async function saveChapters(projectId: number, chapters: unknown[], documentaryChapters: unknown[]): Promise<void> {
  const existing = await storyboardDb.chapters.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.chapters.update(existing.id, { chapters, documentaryChapters })
  } else {
    await storyboardDb.chapters.add({ projectId, chapters, documentaryChapters })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadChapters(projectId: number): Promise<{ chapters: unknown[]; documentaryChapters: unknown[] } | null> {
  const record = await storyboardDb.chapters.where('projectId').equals(projectId).first()
  return record ? { chapters: record.chapters, documentaryChapters: record.documentaryChapters } : null
}

export async function saveBreakdown(projectId: number, breakdown: unknown, level: number): Promise<void> {
  const existing = await storyboardDb.breakdowns.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.breakdowns.update(existing.id, { breakdown, level })
  } else {
    await storyboardDb.breakdowns.add({ projectId, breakdown, level })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadBreakdown(projectId: number): Promise<{ breakdown: unknown; level: number } | null> {
  const record = await storyboardDb.breakdowns.where('projectId').equals(projectId).first()
  return record ? { breakdown: record.breakdown, level: record.level } : null
}
```

**Step 2: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/services/storyboard-db.service.ts
git commit -m "feat(storyboard): add IndexedDB CRUD operations for project data"
```

---

### Task 5: Create Persistence Hook

**Files:**
- Create: `src/features/storyboard/hooks/useStoryboardPersistence.ts`
- Modify: `src/features/storyboard/store/storyboard.store.ts` (add `activeProjectId` to state)

**Step 1: Add activeProjectId to store**

In `storyboard.store.ts`, add to the `StoryboardStore` interface:
```typescript
activeProjectId: number | null
setActiveProjectId: (id: number | null) => void
```

Add to the `ui.slice.ts` initial state:
```typescript
activeProjectId: null as number | null,
setActiveProjectId: (id: number | null) => set({ activeProjectId: id }),
```

Add `'activeProjectId'` to `PERSISTED_FIELDS` in `storyboard.store.ts`.

**Step 2: Create the persistence hook**

```typescript
// src/features/storyboard/hooks/useStoryboardPersistence.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStoryboardStore } from '../store'
import {
  createProject,
  savePrompts,
  saveImages,
  saveChapters,
  saveBreakdown,
  loadPrompts,
  loadImages,
  loadChapters,
  loadBreakdown,
  updateProjectTimestamp,
} from '../services/storyboard-db.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('StoryboardPersist')

export function useStoryboardPersistence() {
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const activeProjectId = useStoryboardStore(s => s.activeProjectId)
  const setActiveProjectId = useStoryboardStore(s => s.setActiveProjectId)

  // Monitored state
  const generatedPrompts = useStoryboardStore(s => s.generatedPrompts)
  const generatedImages = useStoryboardStore(s => s.generatedImages)
  const chapters = useStoryboardStore(s => s.chapters)
  const documentaryChapters = useStoryboardStore(s => s.documentaryChapters)
  const breakdownResult = useStoryboardStore(s => s.breakdownResult)
  const breakdownLevel = useStoryboardStore(s => s.breakdownLevel)
  const storyText = useStoryboardStore(s => s.storyText)

  // Auto-save to IndexedDB (debounced 1s)
  const persistToDb = useCallback(async () => {
    if (!activeProjectId) return

    try {
      if (generatedPrompts.length > 0) {
        await savePrompts(activeProjectId, generatedPrompts)
      }
      if (Object.keys(generatedImages).length > 0) {
        await saveImages(activeProjectId, generatedImages)
      }
      if (chapters.length > 0 || documentaryChapters.length > 0) {
        await saveChapters(activeProjectId, chapters, documentaryChapters)
      }
      if (breakdownResult) {
        await saveBreakdown(activeProjectId, breakdownResult, breakdownLevel)
      }
      await updateProjectTimestamp(activeProjectId)
      log.debug('Auto-saved to IndexedDB', { projectId: activeProjectId })
    } catch (err) {
      log.error('Failed to auto-save', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [activeProjectId, generatedPrompts, generatedImages, chapters, documentaryChapters, breakdownResult, breakdownLevel])

  // Debounced save on state change
  useEffect(() => {
    if (!activeProjectId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(persistToDb, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [activeProjectId, persistToDb])

  // Auto-create project when story text is first set
  useEffect(() => {
    if (!activeProjectId && storyText && storyText.length > 50) {
      const name = storyText.slice(0, 40).replace(/\n/g, ' ').trim() + '...'
      createProject(name).then(id => {
        setActiveProjectId(id)
        log.info('Auto-created project', { id, name })
      })
    }
  }, [activeProjectId, storyText, setActiveProjectId])

  // Restore from IndexedDB on mount
  const restoreProject = useCallback(async (projectId: number) => {
    const store = useStoryboardStore.getState()
    try {
      const [prompts, images, chapterData, breakdownData] = await Promise.all([
        loadPrompts(projectId),
        loadImages(projectId),
        loadChapters(projectId),
        loadBreakdown(projectId),
      ])

      if (prompts && prompts.length > 0) {
        store.addGeneratedPrompts(prompts)
      }
      if (images && Object.keys(images).length > 0) {
        for (const [seq, img] of Object.entries(images)) {
          store.setGeneratedImage(Number(seq), img as Parameters<typeof store.setGeneratedImage>[1])
        }
      }
      if (chapterData) {
        // Restore chapters via store actions
        if (chapterData.chapters.length > 0) {
          store.setChapters(chapterData.chapters as Parameters<typeof store.setChapters>[0])
        }
      }
      if (breakdownData) {
        store.setBreakdownResult(breakdownData.breakdown as Parameters<typeof store.setBreakdownResult>[0])
      }

      log.info('Restored project from IndexedDB', { projectId })
    } catch (err) {
      log.error('Failed to restore project', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  // Restore on mount if activeProjectId is set
  useEffect(() => {
    if (activeProjectId) {
      restoreProject(activeProjectId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  return { restoreProject }
}
```

**Step 3: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/hooks/useStoryboardPersistence.ts src/features/storyboard/store/storyboard.store.ts src/features/storyboard/store/slices/ui.slice.ts
git commit -m "feat(storyboard): add persistence hook with auto-save/restore via IndexedDB"
```

---

### Task 6: Add Project Selector to Storyboard UI

**Files:**
- Create: `src/features/storyboard/components/ProjectSelector.tsx`
- Modify: `src/features/storyboard/components/Storyboard.tsx`

**Step 1: Create ProjectSelector component**

A simple dropdown in the storyboard header that shows saved projects and lets users switch between them. Include rename, delete, and "New Project" actions.

Key imports: `listProjects`, `deleteProject`, `createProject` from the db service. Use `useStoryboardPersistence` hook's `restoreProject` for switching.

**Step 2: Mount in Storyboard.tsx**

Add `<ProjectSelector />` to the header area of the storyboard layout (near the "New Project" button).

Also mount the `useStoryboardPersistence()` hook in the main `Storyboard` component so auto-save is always active.

**Step 3: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/components/ProjectSelector.tsx src/features/storyboard/components/Storyboard.tsx
git commit -m "feat(storyboard): add project selector with save/load/delete"
```

---

## Phase 3: General Polish (Tasks 7-10)

### Task 7: Extract Gallery Handlers into Hook

**Files:**
- Create: `src/features/storyboard/hooks/useGalleryActions.ts`
- Modify: `src/features/storyboard/components/gallery/StoryboardGallery.tsx`

**Step 1: Identify handlers to extract**

Read `StoryboardGallery.tsx` and extract these handler groups into `useGalleryActions`:
- `handleRegenerate` / `handleRegenerateFailed` — regeneration logic
- `handleAnimate` — video generation
- `handleDownloadAll` — JSZip export
- `handleExportJSON` / `handleImportJSON` — project import/export
- `handleContactSheet` / `handleBRollSheet` — modal openers

The hook returns all handlers. The component becomes pure rendering (~300-400 lines).

**Step 2: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/hooks/useGalleryActions.ts src/features/storyboard/components/gallery/StoryboardGallery.tsx
git commit -m "refactor(gallery): extract handler logic into useGalleryActions hook"
```

---

### Task 8: Update LLM Model List

**Files:**
- Modify: `src/features/storyboard/types/storyboard.types.ts` (lines 861-958)

**Step 1: Update DEFAULT_OPENROUTER_MODELS**

Replace outdated models with current ones. Keep the `OpenRouterModel` interface. New list:

| Remove | Replace With |
|--------|-------------|
| `anthropic/claude-3.5-sonnet` | `anthropic/claude-sonnet-4` |
| `anthropic/claude-3-haiku` | `anthropic/claude-haiku-4-5` |
| `anthropic/claude-3-opus` | `anthropic/claude-opus-4` |
| `meta-llama/llama-3.1-70b-instruct` | `meta-llama/llama-4-maverick` |
| `meta-llama/llama-3.1-8b-instruct` | `meta-llama/llama-4-scout` |
| `google/gemini-1.5-pro` | `google/gemini-2.5-pro` |
| `google/gemini-1.5-flash` | `google/gemini-2.5-flash` |

Keep: `openai/gpt-4.1-mini`, `openai/gpt-4o`, `google/gemini-2.0-flash-exp`, `qwen/qwen-2.5-72b-instruct`.
Remove: `openai/gpt-4-turbo` (obsolete), `qwen/qwen-2.5-32b-instruct` (redundant with 72b).

Check OpenRouter pricing page for current costs before writing.

**Step 2: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/types/storyboard.types.ts
git commit -m "chore(storyboard): update LLM model list to current models"
```

---

### Task 9: Remove Dead Code

**Files:**
- Delete: `src/features/storyboard/components/StoryboardWardrobeButton.tsx`

**Step 1: Verify the file is not imported anywhere**

```bash
grep -rn "StoryboardWardrobeButton\|storyboard-wardrobe" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero results (only the file itself).

**Step 2: Delete and commit**

```bash
rm src/features/storyboard/components/StoryboardWardrobeButton.tsx
rm -rf .next && npm run build
git add -u src/features/storyboard/components/StoryboardWardrobeButton.tsx
git commit -m "chore(storyboard): remove unused StoryboardWardrobeButton"
```

---

### Task 10: Harden Video Subscription

**Files:**
- Modify: `src/features/storyboard/components/gallery/StoryboardGallery.tsx` (lines 73-137)

**Step 1: Fix subscription churn**

The current `useEffect` depends on `generatedImages` which changes on every image update, causing subscription re-creation during active generation. Fix by:

1. Use a `useRef` to track which prediction IDs are being monitored
2. Only re-subscribe when the set of generating prediction IDs actually changes
3. Add a 30-second timeout per prediction — if no update arrives, mark as `stale` and show retry button

```typescript
const monitoredIdsRef = useRef<Set<string>>(new Set())

useEffect(() => {
    // Collect current generating prediction IDs
    const currentIds = new Set<string>()
    Object.values(generatedImages).forEach(img => {
        if (img.videoStatus === 'generating' && img.videoPredictionId) {
            currentIds.add(img.videoPredictionId)
        }
    })

    // Only re-subscribe if the monitored set actually changed
    const currentKey = [...currentIds].sort().join(',')
    const prevKey = [...monitoredIdsRef.current].sort().join(',')
    if (currentKey === prevKey) return

    monitoredIdsRef.current = currentIds
    // ... rest of subscription setup
}, [generatedImages, user, setVideoStatus])
```

**Step 2: Add timeout for stuck generations**

```typescript
// After subscription setup, add a timeout
const timeoutId = setTimeout(() => {
    currentIds.forEach(predictionId => {
        // Check if still generating after 60s
        const img = Object.values(get().generatedImages).find(i => i.videoPredictionId === predictionId)
        if (img?.videoStatus === 'generating') {
            setVideoStatus(img.sequence, 'stale')
        }
    })
}, 60000)

return () => {
    clearTimeout(timeoutId)
    subscription?.unsubscribe()
}
```

**Step 3: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/components/gallery/StoryboardGallery.tsx
git commit -m "fix(storyboard): stabilize video subscription and add timeout for stuck generations"
```

---

## Phase 4: Final Verification (Task 11)

### Task 11: Full Build + Smoke Test

**Step 1: Clean build**

```bash
rm -rf .next && npm run build
```

**Step 2: Manual smoke test**

- Storyboard: paste story text -> entities extracted -> style selected -> character sheet generates -> prompts generated -> images generated -> gallery shows results
- Refresh page: verify IndexedDB restored prompts + images
- Switch projects: verify project selector works
- New project: verify clean state

**Step 3: Final commit + push**

```bash
git add -A && git commit -m "refactor: complete storyboard improvement sprint"
git push origin main
```

---

## Summary

| Phase | Tasks | Impact |
|-------|-------|--------|
| Char Sheet Fix | 1-2 | Unblocks character sheet generation |
| IndexedDB Persistence | 3-6 | No more lost work on refresh |
| Gallery Refactor | 7 | 841 LOC -> ~400 LOC orchestrator |
| Model Update | 8 | Current LLM models available |
| Dead Code | 9 | Cleaner codebase |
| Video Hardening | 10 | Stable video status tracking |
| Verification | 11 | Confidence |
