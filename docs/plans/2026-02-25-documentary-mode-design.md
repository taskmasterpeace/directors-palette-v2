# Documentary Mode — Storyboard Enhancement

**Date:** 2026-02-25
**Status:** Approved
**Approach:** Enhance existing storyboard with Documentary Mode toggle (Approach A)

---

## Problem

The storyboard feature handles fiction and short scenes well, but long-form investigative narratives (documentary treatments) create friction:

1. Shot breakdown produces redundant shots for expository/narration sections
2. No distinction between filmable action and narration that needs B-roll coverage
3. Chapter detection doesn't name chapters cinematically
4. No title card generation
5. Gallery doesn't distinguish primary shots from B-roll

## Solution

Add a **Documentary Mode** to the existing storyboard that changes pipeline behavior across five areas:

1. Two-pass shot classification
2. B-roll pool system
3. Enhanced chapter detection with arc naming
4. Title card generation
5. Interleaved timeline gallery

---

## 1. Two-Pass Shot Classification

### Pass 1 — Segment & Classify

After text breakdown, the LLM classifies each segment:

- **`action`** — Filmable visual action (chase, arrest, doors flying open)
- **`narration`** — Expository text needing B-roll coverage (legal analysis, sentencing grids)
- **`transition`** — Bridges between scenes (time jumps, "if you rewind further back")

### Pass 2 — Generate Prompts by Type

- `action` → Standard cinematic shot prompt (existing behavior)
- `narration` → Paired with B-roll from the pool; LLM selects best 1-2 B-roll themes
- `transition` → Atmospheric/establishing shots (wide landscapes, visual metaphors)

### Files Changed

- `shot-breakdown.service.ts` — Add `classification` field to `ShotBreakdownSegment`
- `openrouter.service.ts` — New tool-calling function for segment classification
- `shot-prompt.service.ts` — Route to different prompt strategies based on classification

---

## 2. B-Roll Pool System

### Generation

When documentary mode breakdown runs, the LLM analyzes the full chapter text and generates a **themed B-roll pool**:

- **8-12 categories per chapter** (scales with chapter density)
- **4 prompt variants per category** → 32-48 B-roll options per chapter
- Each variant is a **full cinematic prompt** ready for image generation
- Style guide and director applied on top, same as regular shots

### Example Categories (for the Geechi Gotti story)

- **Ohio Winter Atmosphere** — Highway shots, slush, overcast skies, tire tracks
- **Law Enforcement Operations** — Bodycam POV, handcuffs, patrol cruisers, surveillance
- **Evidence & Contraband** — Pill bottles, evidence bags, pharmacy labels, trunk contents
- **Courtroom & Legal System** — Empty courtroom, gavel, case files, judge's bench
- **Battle Rap Culture** — Crowd energy, stage lights, venue atmosphere
- **California Past** — Gold Cadillac, desert freeway, palm trees at night

### Assignment

- LLM auto-assigns B-roll categories to narration segments
- User can override via dropdown in gallery
- Clicking a B-roll slot shows all 4 variants; swap with one click

### Files Changed

- New service: `broll-pool.service.ts`
- `storyboard.store.ts` — New state slice for B-roll pools
- Leverages existing `broll-sheet.service.ts` for generation API calls

---

## 3. Enhanced Chapter Detection & Arc Naming

### Detection (Enhanced Existing)

Uses current `chapter-detection.service.ts` to find structural boundaries:
- `***` dividers, `## Headers`, `Chapter X`, `Part X`, blank-line sections

### Arc Naming (New)

After detecting chapter boundaries, LLM names each chapter cinematically:

- Prompt: "Give this chapter a cinematic documentary title, 2-5 words"
- Example outputs: "Four Doors in the Snow", "The Name That Rang", "Ohio's Sentencing Grid"
- Names are editable inline in chapter tabs

### Files Changed

- `chapter-detection.service.ts` — Add LLM arc-naming step after boundary detection
- `storyboard.store.ts` — Chapters get `name` and `nameEdited` fields

---

## 4. Title Card Generation

Each chapter gets an AI-generated title card:

- **Prompt template:** `"Documentary title card for chapter called '{chapterName}'. Large, legible text reading '{chapterName}' centered in the image. {styleGuidePrompt}. Cinematic, professional, clean typography."`
- Style guide applied so title cards match the story's visual tone
- Generated alongside the first batch of shots per chapter
- Appears as the **first item** in that chapter's gallery timeline
- Tagged `type: 'title-card'` in the data model

### Files Changed

- New component or extension in gallery for title card rendering
- Title card prompt generation in `broll-pool.service.ts` or new `title-card.service.ts`

---

## 5. Interleaved Timeline Gallery

### Layout

Vertical timeline organized by chapter:

```
Chapter 1: "Four Doors in the Snow"
├── 🎬 TITLE CARD (full width, distinct border)
├── 📷 SHOT 1 — Action (full width)
├── 🎞️ B-ROLL — Ohio Winter (70% width, offset, badge)
├── 📷 SHOT 2 — Action (full width)
├── 🎞️ B-ROLL — Law Enforcement (70% width, offset, badge)
├── 📷 SHOT 3 — Transition (full width, atmospheric)
│
Chapter 2: "The Name That Rang"
├── 🎬 TITLE CARD
├── ...
```

### UX Details

- **Primary shots** — Full width, story text snippet below
- **B-roll** — 70% width, offset left, colored "B-ROLL" badge, narration text it covers shown
- **Title cards** — Full width, distinct border treatment
- Each item shows classification type
- Click B-roll to see other variants from that pool category
- Existing grid view unchanged for non-documentary storyboards

### Files Changed

- New component: `DocumentaryTimeline.tsx`
- `StoryboardGallery.tsx` — Conditional render based on `isDocumentaryMode`
- `GalleryShotCard.tsx` — Add B-roll badge and variant picker

---

## Data Model

### New Types

```typescript
type SegmentClassification = 'action' | 'narration' | 'transition';

interface ClassifiedSegment extends ShotBreakdownSegment {
  classification: SegmentClassification;
  brollCategoryId?: string;
}

interface BRollCategory {
  id: string;
  theme: string;
  chapterIndex: number;
  prompts: BRollPrompt[];
  assignedSegments: number[];
}

interface BRollPrompt {
  id: string;
  prompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  selected: boolean;
}

interface TitleCard {
  chapterIndex: number;
  chapterName: string;
  prompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface DocumentaryChapter {
  index: number;
  name: string;
  nameEdited: boolean;
  startIndex: number;
  endIndex: number;
  titleCard: TitleCard;
  brollPool: BRollCategory[];
  segments: ClassifiedSegment[];
}
```

### Store Changes

New fields in `storyboard.store.ts`:

- `isDocumentaryMode: boolean`
- `documentaryChapters: DocumentaryChapter[]`
- `brollPool: BRollCategory[]` (flat access for generation queue)

---

## Mode Toggle

Simple toggle in Story Input tab:

- `○ Storyboard` / `● Documentary`
- When Documentary Mode is on: two-pass classification, B-roll pool, chapter arc naming, title cards, timeline gallery
- When off: everything works exactly as today — zero impact on existing workflows
