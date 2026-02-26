# Storyboard Improvement Sprint — Design Document

**Date:** 2026-02-26
**Scope:** Fix character sheet generation, add IndexedDB persistence, general polish

---

## Part 1: Fix Character Sheet Generation

**Problem:** The "Generate Sheet" button in the entities tab doesn't produce results.

**Investigation areas:**
- `effectiveStyleGuide` may return null when no style is selected (guard at CharacterSheetGenerator line 195)
- Button in CharacterList navigates to CharacterSheetPanel but may not trigger generation
- API auth or credit check may fail silently at runtime

**Fix approach:**
- Debug the actual failure path with dev server + console
- Keep style as a required field but show a clear toast directing users to select a style first
- Add loading state feedback so users know generation is in progress
- Verify the image generation API call chain: CharacterSheetService -> ImageGenerationService -> /api/generation/image

---

## Part 2: IndexedDB Persistence with Dexie.js

**Problem:** Generated prompts, images, chapters, and breakdown results are lost on refresh. They're excluded from localStorage persistence due to the 5MB size limit.

**Solution:** Use Dexie.js (lightweight IndexedDB wrapper, ~15KB) for persistent storage of large data.

### Database Schema

```
Database: storyboard-projects (version 1)

Table: projects
  - id (auto-increment)
  - name: string
  - createdAt: Date
  - updatedAt: Date
  - storyText: string
  - settings: { model, style, director, generationSettings }

Table: prompts
  - id (auto-increment)
  - projectId -> projects.id
  - sequence: number
  - prompt: string
  - shotType: string
  - metadata: object

Table: images
  - id (auto-increment)
  - projectId -> projects.id
  - sequence: number
  - status: string
  - imageUrl: string
  - prompt: string
  - config: object

Table: chapters
  - id (auto-increment)
  - projectId -> projects.id
  - data: object (full chapter structure)

Table: breakdowns
  - id (auto-increment)
  - projectId -> projects.id
  - data: object (full breakdown result)
```

### Sync Strategy

- **Auto-save:** Debounced 1s write to IndexedDB on key state changes (prompts generated, images updated, chapters changed)
- **Auto-restore:** On page load, check IndexedDB for last active project and restore state
- **Project switching:** Simple dropdown in storyboard header to switch between saved projects
- **Keep localStorage** for small settings (model, style, director, aspect ratio, UI preferences)

### Implementation

- New file: `src/features/storyboard/services/storyboard-db.service.ts` — Dexie database definition + CRUD operations
- New hook: `src/features/storyboard/hooks/useStoryboardPersistence.ts` — auto-sync between Zustand store and IndexedDB
- New component: Project selector dropdown in Storyboard.tsx header
- Install: `npm install dexie`

---

## Part 3: General Polish

### 3a. Update LLM Model List
- Update `storyboard.types.ts` model list to include current models (Claude 4, GPT-4.1, etc.)
- Remove deprecated models

### 3b. Remove Dead Code
- Remove `StoryboardWardrobeButton.tsx` (not imported anywhere)
- Clean up any other unused components

### 3c. Split StoryboardGallery.tsx (841 LOC)
- Extract `GalleryGridView` into its own file
- Extract `GalleryListView` into its own file
- Extract `GalleryCarouselView` into its own file
- Keep `StoryboardGallery.tsx` as the orchestrator (~200 LOC)

### 3d. Harden Video/Animation Status
- Verify Supabase realtime subscription handles reconnection
- Add timeout for stuck "generating" states
- Show clear status feedback in gallery

---

## Priority Order

1. Character sheet fix (quick win, unblocks users)
2. IndexedDB persistence (biggest impact)
3. Gallery component split (maintainability)
4. Model list update + dead code cleanup (hygiene)
5. Video status hardening (reliability)
