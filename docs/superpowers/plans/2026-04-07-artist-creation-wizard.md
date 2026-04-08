# Artist Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overwhelming 6-tab artist editor with a three-door wizard (Inspired by an artist / Build it / Surprise me) that always produces a complete artist, landing on a new Review & Remix screen.

**Architecture:** Add a `wizardStep` state to `useArtistDnaStore` that controls which screen is shown. Three door components gather input, two API endpoints produce a DNA profile (reusing the existing `seed-from-artist` for Door 1 and adding `build-from-pins` for Doors 2 & 3), and a new `ReviewAndRemixScreen` becomes the default post-creation editor. The existing `ArtistEditor` (6 tabs) stays as "Advanced view" behind a link. All existing APIs, types, services, and the underlying DNA schema are untouched.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Zustand (persisted), Tailwind v4, OpenRouter (GPT-4.1 / gpt-4.1-mini), existing UI primitives in `@/components/ui/*` (Dialog, AlertDialog, Tabs, etc.), Lucide icons, Playwright for smoke tests.

**Spec:** `docs/superpowers/specs/2026-04-07-artist-creation-wizard-design.md`

---

## File Structure

### New files

```
src/features/music-lab/
  components/artist-dna/
    wizard/
      ArtistDoorSelector.tsx        # Three-card door selection screen
      Door1SeedFromArtist.tsx       # Door 1 input (real artist name)
      Door2BuildIt.tsx              # Door 2 chat box + pin chip row
      Door3SurpriseMe.tsx           # Door 3 genre cascade + 4 spice pins
      PinChip.tsx                   # Single pin chip with picker popover
      PinChipRow.tsx                # Row of pin chips for Door 2
      GenrePickerStandalone.tsx     # Prop-driven genre cascade (no store)
    review/
      ReviewAndRemixScreen.tsx      # New default post-creation editor
      ReviewHero.tsx                # Portrait + name + tagline + stat badges
      EditableCard.tsx              # Reusable card with inline edit + sparkle
      FieldSidePanel.tsx            # Slide-in panel for long-form fields
      RenameSuggestionPill.tsx      # Amber pill + 3 fictional name chips

src/app/api/artist-dna/
  build-from-pins/route.ts          # Door 2 & 3 backend
  suggest-rename/route.ts           # Door 1 rename helper

tests/artist-wizard/
  door-selection.spec.ts            # Playwright smoke test
  door2-build.spec.ts
  door3-surprise.spec.ts
```

### Modified files

```
src/features/music-lab/store/artist-dna.store.ts
  - Add `wizardStep` state
  - Add `setWizardStep`, `startWizard`, `applyWizardResult`, `buildFromPins`, `suggestRename` actions
  - Modify `startNewArtist` to open door selection instead of blank editor
  - Modify `loadArtistIntoDraft` to land on review screen (wizardStep='review') instead of 6-tab editor

src/features/music-lab/components/artist-dna/ArtistDnaPage.tsx
  - Route rendering by wizardStep

src/features/music-lab/components/artist-dna/ArtistList.tsx
  - "Create New Artist" button triggers wizard (not startNewArtist directly)
  - Remove the separate "Start from Real Artist" button (now Door 1 inside wizard)

src/features/music-lab/types/artist-dna.types.ts
  - Add WizardStep type
  - Add BuildFromPinsRequest type
```

### Untouched (reused as-is)

- `ArtistEditor.tsx` (becomes Advanced view)
- `ArtistList.tsx` layout, import/export, delete dialog
- All 6 tab files (`IdentityTab.tsx`, etc.)
- `/api/artist-dna/seed-from-artist/route.ts`
- `/api/artist-dna/suggest/route.ts`
- `/api/artist-dna/generate-portrait/route.ts`
- `MagicWandField.tsx`, `ConstellationWidget.tsx`, `VibeBeatPlayer.tsx`, `TagInput.tsx`
- `artist-dna.service.ts`, `createEmptyDNA()`
- `data/genre-taxonomy.data.ts` (used by new `GenrePickerStandalone`)

---

## Task 1: Add `WizardStep` type and store state

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

- [ ] **Step 1: Add the WizardStep type**

Open `src/features/music-lab/types/artist-dna.types.ts`. Find the `ArtistDnaTab` type export (around line 262). Add this export directly after it:

```ts
export type WizardStep =
  | 'doors'       // Door selection screen
  | 'door1'       // Inspired by an artist (name input)
  | 'door2'       // Build it (chat + pins)
  | 'door3'       // Surprise me (genre + spice pins)
  | 'review'      // Review & Remix screen (default post-creation editor)
  | 'advanced'    // Old 6-tab ArtistEditor (power user)
```

- [ ] **Step 2: Add wizardStep to store state**

Open `src/features/music-lab/store/artist-dna.store.ts`. Add the `WizardStep` import to the type import block at the top (around line 8-20):

```ts
import type {
  ArtistDNA,
  ArtistDnaTab,
  ArtistGalleryItem,
  ArtistVoice,
  CatalogEntry,
  CatalogSongAnalysis,
  GalleryItemType,
  SuggestionBatch,
  SunoPromptOutput,
  UserArtistProfile,
  VibeBeat,
  WizardStep,
} from '../types/artist-dna.types'
```

Then, in the `ArtistDnaState` interface, add `wizardStep` next to `activeTab` (around line 45):

```ts
  // Editor state (persisted)
  editorOpen: boolean
  activeArtistId: string | null
  draft: ArtistDNA
  isDirty: boolean
  activeTab: ArtistDnaTab
  wizardStep: WizardStep
```

And add these new action signatures in the Actions section (next to `setActiveTab`, around line 74):

```ts
  // Actions - Wizard
  setWizardStep: (step: WizardStep) => void
  startWizard: () => void
  applyWizardResult: (dna: ArtistDNA, seededFrom?: string | null) => void
```

- [ ] **Step 3: Add initial state and action implementations**

In the `create<ArtistDnaState>()` call, add `wizardStep: 'doors'` to the initial state (near `activeTab: 'identity'`, around line 141):

```ts
      activeTab: 'identity',
      wizardStep: 'doors',
```

Add the three new action implementations right after `setActiveTab` (around line 358):

```ts
      setWizardStep: (step) => set({ wizardStep: step }),

      startWizard: () => set({
        editorOpen: true,
        activeArtistId: null,
        draft: createEmptyDNA(),
        isDirty: false,
        activeTab: 'identity',
        wizardStep: 'doors',
        sunoOutput: null,
        suggestionCache: {},
        seededFrom: null,
      }),

      applyWizardResult: (dna, seededFrom) => {
        const defaults = createEmptyDNA()
        const merged: ArtistDNA = {
          identity: { ...defaults.identity, ...dna.identity },
          sound: { ...defaults.sound, ...dna.sound },
          persona: { ...defaults.persona, ...dna.persona },
          lexicon: { ...defaults.lexicon, ...dna.lexicon },
          look: { ...defaults.look, ...dna.look },
          catalog: { ...defaults.catalog, ...dna.catalog },
          voices: Array.isArray(dna.voices) ? dna.voices : [],
          socialCircle: dna.socialCircle || defaults.socialCircle,
          phone: dna.phone,
          headerBackgroundUrl: '',
          lowConfidenceFields: Array.isArray(dna.lowConfidenceFields) ? dna.lowConfidenceFields : [],
          vibeBeat: dna.vibeBeat,
        }
        set({
          draft: merged,
          isDirty: true,
          wizardStep: 'review',
          seededFrom: seededFrom || null,
          suggestionCache: {},
        })
      },
```

- [ ] **Step 4: Update persisted fields**

Find the `partialize` block at the bottom of the store (around line 919). Add `wizardStep` to the persisted fields:

```ts
      partialize: (state) => ({
        editorOpen: state.editorOpen,
        draft: state.draft,
        activeArtistId: state.activeArtistId,
        activeTab: state.activeTab,
        wizardStep: state.wizardStep,
        combineVocalAndStyle: state.combineVocalAndStyle,
      }),
```

In the `merge` function right below (around line 959), after the `validTabs` line, add:

```ts
        const validWizardSteps: WizardStep[] = ['doors', 'door1', 'door2', 'door3', 'review', 'advanced']
        const wizardStep = p.wizardStep && validWizardSteps.includes(p.wizardStep) ? p.wizardStep : 'doors'
```

And include `wizardStep` in the returned merged state:

```ts
        return { ...current, ...p, draft, activeTab, wizardStep }
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(artist-dna|wizard)" | head -20`
Expected: no errors related to artist-dna.store.ts or artist-dna.types.ts

- [ ] **Step 6: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts src/features/music-lab/types/artist-dna.types.ts
git commit -m "feat(artist-wizard): add WizardStep type and store state"
```

---

## Task 2: Modify `startNewArtist` and `loadArtistIntoDraft` to route via wizardStep

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

- [ ] **Step 1: Route startNewArtist to the wizard**

In `src/features/music-lab/store/artist-dna.store.ts`, find `startNewArtist` (around line 282). Replace it so clicking "New Artist" opens the door selection instead of a blank 6-tab editor:

```ts
      startNewArtist: () => {
        set({
          editorOpen: true,
          activeArtistId: null,
          draft: createEmptyDNA(),
          isDirty: false,
          activeTab: 'identity',
          wizardStep: 'doors',
          sunoOutput: null,
          suggestionCache: {},
          seededFrom: null,
        })
      },
```

- [ ] **Step 2: Route loadArtistIntoDraft to the review screen**

Find `loadArtistIntoDraft` (around line 238). In the final `set({...})` call inside the `if (artist)` block (around line 270), add `wizardStep: 'review'`:

```ts
          set({
            editorOpen: true,
            activeArtistId: id,
            draft: merged,
            isDirty: false,
            activeTab: 'identity',
            wizardStep: 'review',
            sunoOutput: null,
            seededFrom: null,
          })
```

- [ ] **Step 3: Update closeEditor to reset wizardStep**

Find `closeEditor` (around line 906). Update it to reset wizardStep:

```ts
      closeEditor: () => {
        set({
          editorOpen: false,
          activeArtistId: null,
          activeTab: 'identity',
          wizardStep: 'doors',
          sunoOutput: null,
          suggestionCache: {},
          seededFrom: null,
        })
      },
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "artist-dna.store" | head -10`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(artist-wizard): route startNewArtist and loadArtistIntoDraft through wizardStep"
```

---

## Task 3: Build the `/api/artist-dna/build-from-pins` endpoint

**Files:**
- Create: `src/app/api/artist-dna/build-from-pins/route.ts`

- [ ] **Step 1: Create the route file with the request type and prompt**

Create `src/app/api/artist-dna/build-from-pins/route.ts`:

```ts
/**
 * Build Artist From Pins API
 *
 * Used by Door 2 (Build it) and Door 3 (Surprise me).
 * Takes a free-form description + optional structured pins and produces
 * a complete ArtistDNA profile, treating every pin as a hard constraint.
 *
 * Single-pass (no web search needed — there's no real artist to verify).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

const GENERATION_MODEL = 'openai/gpt-4.1'
const BUILD_FROM_PINS_COST_CENTS = 15

interface Pins {
  genre?: { base?: string; sub?: string; micro?: string }
  region?: { city?: string; state?: string; country?: string }
  ethnicity?: string
  gender?: string
  vocalStyle?: string
  signatureLook?: string
  vibe?: string
  era?: string
  language?: string
  stageName?: string
}

interface BuildFromPinsRequest {
  description?: string
  pins?: Pins
}

const BASE_PROMPT = `You are inventing a fictional music artist from scratch. Given a free-form description and/or a set of hard-constraint pins, create a complete artist DNA profile. Fill every field with rich, specific, coherent details that respect every pin as an absolute requirement.

ABSOLUTE RULE: Every pin the user provides is a HARD CONSTRAINT. If they pin genre="Trap", the artist must be a trap artist. If they pin region="Houston, TX", the artist must be from Houston. If they pin stageName="Lil Stardust", the stage name is Lil Stardust. Do not override, reinterpret, or ignore any pin.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):

{
  "identity": {
    "stageName": "fictional stage name (use the pinned one if provided)",
    "realName": "invented birth name",
    "ethnicity": "ethnic background (use the pinned one if provided)",
    "city": "city they grew up in (use the pinned one if provided)",
    "state": "state or region (use the pinned one if provided)",
    "neighborhood": "specific neighborhood within the city above",
    "backstory": "3-4 sentence invented origin story",
    "significantEvents": ["5-7 fictional career milestones with years"]
  },
  "sound": {
    "genres": ["2-4 primary genres, using pinned genre as the primary"],
    "subgenres": ["3-5 specific subgenres"],
    "microgenres": ["1-2 niche microgenres if applicable"],
    "genreEvolution": [],
    "vocalTextures": ["exactly 5 descriptive vocal qualities, each 2-4 words"],
    "flowStyle": "1-2 sentence description of their rap flow or singing phrasing",
    "productionPreferences": ["5-6 production elements they favor"],
    "keyCollaborators": ["4-6 fictional collaborators"],
    "artistInfluences": ["5-6 influences (can be real artists)"],
    "melodyBias": 50,
    "language": "primary language (use the pinned one if provided)",
    "secondaryLanguages": [],
    "soundDescription": "3-4 sentences painting their sonic identity"
  },
  "persona": {
    "traits": ["5-6 personality traits, 1-2 words each"],
    "likes": ["4-5 things they care about"],
    "dislikes": ["3-4 things they oppose"],
    "attitude": "6-10 word encapsulation (should reflect pinned vibe if provided)",
    "worldview": "3-4 sentences about their philosophy"
  },
  "lexicon": {
    "signaturePhrases": ["4-6 invented catchphrases"],
    "slang": ["4-6 slang terms or invented words"],
    "bannedWords": [],
    "adLibs": ["2-4 invented ad-libs, or empty array"]
  },
  "look": {
    "skinTone": "descriptive skin tone (must match pinned ethnicity)",
    "hairStyle": "signature hairstyle (use pinned look hint if provided)",
    "fashionStyle": "fashion aesthetic in 5-10 words",
    "jewelry": "signature jewelry (4-8 words or 'minimal')",
    "tattoos": "tattoo style (5-10 words or 'none')",
    "visualDescription": "3-4 sentences about their visual presence",
    "portraitUrl": "",
    "characterSheetUrl": ""
  },
  "catalog": {
    "entries": []
  },
  "lowConfidenceFields": []
}

RULES:
- Everything is invented — do not use a real artist's identity.
- Every pin is non-negotiable. If the user pins stageName, that's the stage name.
- melodyBias: 0-10=pure rapper, 30-45=rap-dominant melodic, 50-60=hybrid, 65-75=sing-rap, 80-90=primarily singer, 95-100=pure singer. Pick a value that matches the pinned genre and vocal style.
- Leave portraitUrl, characterSheetUrl, bannedWords, genreEvolution, catalog.entries, lowConfidenceFields empty/default — the user fills these later.
- vocalTextures must be EXACTLY 5 entries.
- The description field (if provided) is additional free-form guidance — weave it in alongside the pins.`

function buildUserPrompt(body: BuildFromPinsRequest): string {
  const parts: string[] = []
  if (body.description?.trim()) {
    parts.push(`User description:\n${body.description.trim()}`)
  }
  if (body.pins) {
    const pinLines: string[] = []
    const p = body.pins
    if (p.genre?.base) {
      const g = [p.genre.base, p.genre.sub, p.genre.micro].filter(Boolean).join(' → ')
      pinLines.push(`- genre: ${g}`)
    }
    if (p.region) {
      const r = [p.region.city, p.region.state, p.region.country].filter(Boolean).join(', ')
      if (r) pinLines.push(`- region: ${r}`)
    }
    if (p.ethnicity) pinLines.push(`- ethnicity: ${p.ethnicity}`)
    if (p.gender) pinLines.push(`- gender/presentation: ${p.gender}`)
    if (p.vocalStyle) pinLines.push(`- vocal style: ${p.vocalStyle}`)
    if (p.signatureLook) pinLines.push(`- signature look: ${p.signatureLook}`)
    if (p.vibe) pinLines.push(`- vibe/energy: ${p.vibe}`)
    if (p.era) pinLines.push(`- era/time period: ${p.era}`)
    if (p.language) pinLines.push(`- language: ${p.language}`)
    if (p.stageName) pinLines.push(`- stage name: ${p.stageName} (USE THIS EXACT NAME)`)
    if (pinLines.length) parts.push(`Hard-constraint pins (every one of these is non-negotiable):\n${pinLines.join('\n')}`)
  }
  if (parts.length === 0) {
    parts.push('No description or pins provided — invent a completely random, coherent artist.')
  }
  return parts.join('\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = (await request.json()) as BuildFromPinsRequest

    // Require at least one signal: description or at least one pin
    const hasDescription = !!body.description?.trim()
    const hasPin = !!(
      body.pins && Object.values(body.pins).some((v) => {
        if (v == null) return false
        if (typeof v === 'string') return v.trim().length > 0
        if (typeof v === 'object') return Object.values(v).some((sv) => typeof sv === 'string' && sv.trim().length > 0)
        return false
      })
    )
    if (!hasDescription && !hasPin) {
      return NextResponse.json(
        { error: 'At least a description or one pin is required' },
        { status: 400 }
      )
    }

    const { user } = auth

    const deductResult = await creditsService.deductCredits(user.id, 'artist-dna-build', {
      generationType: 'text',
      description: 'Artist DNA build from pins',
      overrideAmount: BUILD_FROM_PINS_COST_CENTS,
      user_email: user.email,
    })

    if (!deductResult.success) {
      return NextResponse.json(
        { error: deductResult.error || 'Insufficient credits' },
        { status: 402 }
      )
    }

    const userPrompt = buildUserPrompt(body)

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Build From Pins",
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: BASE_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 5000,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      logger.api.error('build-from-pins generation error', { error })
      return NextResponse.json({ error: 'Failed to build artist profile' }, { status: 500 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    if (!content.trim()) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 500 })
    }

    let dna: Record<string, unknown>
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      dna = JSON.parse(cleaned)
    } catch {
      logger.api.error('build-from-pins parse error', { detail: content.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse artist profile' }, { status: 500 })
    }

    // Ensure required shape
    if (!dna.identity) dna.identity = {}
    if (!dna.sound) dna.sound = {}
    if (!dna.persona) dna.persona = {}
    if (!dna.lexicon) dna.lexicon = {}
    if (!dna.look) dna.look = {}
    if (!dna.catalog) dna.catalog = { entries: [] }
    if (!dna.lowConfidenceFields) dna.lowConfidenceFields = []

    return NextResponse.json({ dna })
  } catch (error) {
    logger.api.error('build-from-pins error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the route compiles and returns 400 on empty input**

Start the dev server if not running:

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Then curl the endpoint with no body to verify the 400 path:

```bash
curl -s -X POST http://localhost:3002/api/artist-dna/build-from-pins \
  -H "Content-Type: application/json" \
  -d '{}' | head -5
```

Expected: `{"error":"Unauthorized"}` (because no auth cookie). This confirms the route exists and auth middleware runs — that's enough for a route-file smoke check. (Full E2E testing happens in Task 13.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/build-from-pins/route.ts
git commit -m "feat(artist-wizard): add build-from-pins API endpoint"
```

---

## Task 4: Build the `/api/artist-dna/suggest-rename` endpoint

**Files:**
- Create: `src/app/api/artist-dna/suggest-rename/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/artist-dna/suggest-rename/route.ts`:

```ts
/**
 * Suggest Rename API
 *
 * Used by Door 1 review screen to offer 3 fictional stage name
 * alternatives in the same vibe as the seeded real artist.
 * Not charged (single cheap call).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

interface SuggestRenameRequest {
  realName: string
  genres?: string[]
  city?: string
  vibe?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = (await request.json()) as SuggestRenameRequest
    if (!body.realName?.trim()) {
      return NextResponse.json({ error: 'realName is required' }, { status: 400 })
    }

    const context = [
      `real artist: ${body.realName}`,
      body.genres?.length ? `genres: ${body.genres.join(', ')}` : null,
      body.city ? `city: ${body.city}` : null,
      body.vibe ? `vibe: ${body.vibe}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const systemPrompt = `You invent fictional stage names for music artists. Given a real artist the user is drawing inspiration from, return 3 fictional alternative stage names in the same sonic/cultural vibe. Do not reuse the real name or any part of it. Each name should feel like a real artist name — memorable, on-vibe, not corny.

Return ONLY a JSON object: {"alternatives": ["Name 1", "Name 2", "Name 3"]}`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Suggest Rename",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.9,
        max_tokens: 200,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ alternatives: [] })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      const alts = Array.isArray(parsed.alternatives)
        ? parsed.alternatives.filter((a: unknown) => typeof a === 'string').slice(0, 3)
        : []
      return NextResponse.json({ alternatives: alts })
    } catch {
      return NextResponse.json({ alternatives: [] })
    }
  } catch (error) {
    logger.api.error('suggest-rename error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ alternatives: [] })
  }
}
```

- [ ] **Step 2: Verify route compiles**

```bash
curl -s -X POST http://localhost:3002/api/artist-dna/suggest-rename \
  -H "Content-Type: application/json" \
  -d '{"realName":"Drake"}' | head -5
```

Expected: `{"error":"Unauthorized"}` — route exists, auth runs.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/suggest-rename/route.ts
git commit -m "feat(artist-wizard): add suggest-rename API endpoint"
```

---

## Task 5: Add `buildFromPins` and `suggestRename` store actions

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

- [ ] **Step 1: Add action signatures to state interface**

In `src/features/music-lab/store/artist-dna.store.ts`, find the `// Actions - Wizard` section (added in Task 1). Add these additional action signatures:

```ts
  // Actions - Wizard
  setWizardStep: (step: WizardStep) => void
  startWizard: () => void
  applyWizardResult: (dna: ArtistDNA, seededFrom?: string | null) => void
  buildFromPins: (request: { description?: string; pins?: Record<string, unknown> }) => Promise<boolean | 'insufficient_credits'>
  isBuildingFromPins: boolean
  suggestRename: (realName: string, genres?: string[], city?: string) => Promise<string[]>
```

Add `isBuildingFromPins: false` to the initial state block (next to `isSeedingFromArtist: false`, around line 145):

```ts
      isSeedingFromArtist: false,
      isBuildingFromPins: false,
```

- [ ] **Step 2: Implement buildFromPins action**

Add this implementation right after `applyWizardResult` (added in Task 1):

```ts
      buildFromPins: async (request) => {
        set({ isBuildingFromPins: true })
        try {
          const res = await fetch('/api/artist-dna/build-from-pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          })
          if (!res.ok) {
            set({ isBuildingFromPins: false })
            if (res.status === 402) return 'insufficient_credits'
            return false
          }
          const { dna } = await res.json()
          if (!dna) {
            set({ isBuildingFromPins: false })
            return false
          }
          get().applyWizardResult(dna, null)
          set({ isBuildingFromPins: false })
          return true
        } catch (error) {
          logger.musicLab.error('buildFromPins error', { error: error instanceof Error ? error.message : String(error) })
          set({ isBuildingFromPins: false })
          return false
        }
      },

      suggestRename: async (realName, genres, city) => {
        try {
          const res = await fetch('/api/artist-dna/suggest-rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ realName, genres, city }),
          })
          if (!res.ok) return []
          const { alternatives } = await res.json()
          return Array.isArray(alternatives) ? alternatives : []
        } catch {
          return []
        }
      },
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "artist-dna.store" | head -10`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(artist-wizard): add buildFromPins and suggestRename store actions"
```

---

## Task 6: Build the `ArtistDoorSelector` component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/wizard/ArtistDoorSelector.tsx`

- [ ] **Step 1: Create the door selector**

```tsx
'use client'

import { Sparkles, Wand2, Dices, X } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function ArtistDoorSelector() {
  const { setWizardStep, closeEditor } = useArtistDnaStore()

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create an artist</h1>
          <p className="text-muted-foreground mt-1">Pick how you want to start. You can always tweak everything after.</p>
        </div>
        <button
          onClick={closeEditor}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DoorCard
          icon={<Sparkles className="w-7 h-7 text-amber-400" />}
          title="Inspired by an artist"
          subtitle="Start from someone real. Make them yours."
          detail="We build the DNA from a real artist using web search, then help you rename them to something fictional."
          cost="25 pts"
          accent="border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5"
          onClick={() => setWizardStep('door1')}
        />
        <DoorCard
          icon={<Wand2 className="w-7 h-7 text-cyan-400" />}
          title="Build it"
          subtitle="You have an idea. Pin what matters."
          detail="Describe your artist and/or pin specific traits (genre, region, look, vibe). We fill everything else coherently."
          cost="15 pts"
          accent="border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5"
          onClick={() => setWizardStep('door2')}
        />
        <DoorCard
          icon={<Dices className="w-7 h-7 text-fuchsia-400" />}
          title="Surprise me"
          subtitle="Pick a genre. We'll do the rest."
          detail="Choose a genre (and optional spice — stage name, region, vibe word, look hint). Roll the dice."
          cost="15 pts"
          accent="border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/5"
          onClick={() => setWizardStep('door3')}
        />
      </div>
    </div>
  )
}

function DoorCard({
  icon,
  title,
  subtitle,
  detail,
  cost,
  accent,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  detail: string
  cost: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 bg-card p-6 transition-all hover-lift-sm ${accent}`}
    >
      <div className="flex items-start justify-between mb-4">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{cost}</span>
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground italic mb-3">{subtitle}</p>
      <p className="text-sm text-muted-foreground/80 leading-relaxed">{detail}</p>
    </button>
  )
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "ArtistDoorSelector" | head -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/wizard/ArtistDoorSelector.tsx
git commit -m "feat(artist-wizard): add ArtistDoorSelector component"
```

---

## Task 7: Build `Door1SeedFromArtist` component (reuses existing seed action)

**Files:**
- Create: `src/features/music-lab/components/artist-dna/wizard/Door1SeedFromArtist.tsx`

- [ ] **Step 1: Create Door 1 screen**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'

const LOADING_PHASES = [
  'Researching artist...',
  'Mapping vocal identity...',
  'Building persona...',
  'Analyzing discography...',
  'Assembling DNA profile...',
  'Fact-checking with web search...',
  'Verifying accuracy...',
]

export function Door1SeedFromArtist() {
  const { setWizardStep, startFromArtist, isSeedingFromArtist } = useArtistDnaStore()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loadingPhase, setLoadingPhase] = useState(0)

  useEffect(() => {
    if (!isSeedingFromArtist) {
      setLoadingPhase(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingPhase((p) => (p + 1) % LOADING_PHASES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isSeedingFromArtist])

  const handleSubmit = async () => {
    if (!input.trim()) return
    setError('')
    const result = await startFromArtist(input.trim())
    if (result === 'insufficient_credits') {
      useCreditsStore.getState().openPurchaseDialog()
      return
    }
    if (result !== true) {
      setError('Could not build a profile for that artist. Check the spelling or try a more well-known artist.')
      return
    }
    // On success, startFromArtist sets editorOpen=true and loads draft.
    // We need to route to the review screen.
    useArtistDnaStore.getState().setWizardStep('review')
    useCreditsStore.getState().fetchBalance(true)
  }

  if (isSeedingFromArtist) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Building DNA for {input}</p>
            <p className="text-sm text-muted-foreground animate-pulse">{LOADING_PHASES[loadingPhase]}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      <button
        onClick={() => setWizardStep('doors')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
          <Sparkles className="w-3 h-3" />
          Inspired by an artist
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Who inspires you?</h1>
        <p className="text-muted-foreground">
          Type a real artist. We&apos;ll build a full DNA profile from them, then help you rename them to something fictional on the next screen.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Kendrick Lamar, Bad Bunny, Billie Eilish..."
          autoFocus
          className="w-full rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Build Profile
          <span className="text-xs font-normal opacity-70">25 pts</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/wizard/Door1SeedFromArtist.tsx
git commit -m "feat(artist-wizard): add Door1SeedFromArtist component"
```

---

## Task 8: Build the standalone `GenrePickerStandalone` component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/wizard/GenrePickerStandalone.tsx`

The existing `GenreCascade` component reads directly from the store's draft. We need a prop-driven version for the wizard screens, so Door 2 and Door 3 can manage their own pin state without touching `draft.sound`.

- [ ] **Step 1: Create the standalone picker**

```tsx
'use client'

import { Label } from '@/components/ui/label'
import { getGenres, getSubgenres, getMicrogenres } from '../../../data/genre-taxonomy.data'

export interface GenrePickerValue {
  base?: string
  sub?: string
  micro?: string
}

interface Props {
  value: GenrePickerValue
  onChange: (v: GenrePickerValue) => void
  requireBase?: boolean
}

export function GenrePickerStandalone({ value, onChange, requireBase }: Props) {
  const allGenres = getGenres()
  const subgenres = value.base ? getSubgenres([value.base]) : []
  const microgenres = value.sub ? getMicrogenres([value.sub]) : []

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Genre{requireBase && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ base: value.base === g ? undefined : g, sub: undefined, micro: undefined })}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                value.base === g
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {value.base && subgenres.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Subgenre (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {subgenres.map((sg) => (
              <button
                key={sg}
                type="button"
                onClick={() => onChange({ ...value, sub: value.sub === sg ? undefined : sg, micro: undefined })}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  value.sub === sg
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                {sg}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.sub && microgenres.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Microgenre (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {microgenres.map((mg) => (
              <button
                key={mg}
                type="button"
                onClick={() => onChange({ ...value, micro: value.micro === mg ? undefined : mg })}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  value.micro === mg
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/wizard/GenrePickerStandalone.tsx
git commit -m "feat(artist-wizard): add GenrePickerStandalone component"
```

---

## Task 9: Build `Door3SurpriseMe` component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/wizard/Door3SurpriseMe.tsx`

- [ ] **Step 1: Create Door 3**

```tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, Dices, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'

export function Door3SurpriseMe() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [genre, setGenre] = useState<GenrePickerValue>({})
  const [stageName, setStageName] = useState('')
  const [from, setFrom] = useState('')
  const [vibe, setVibe] = useState('')
  const [lookHint, setLookHint] = useState('')
  const [error, setError] = useState('')

  const canRoll = !!genre.base

  const handleRoll = async () => {
    if (!canRoll) return
    setError('')
    const result = await buildFromPins({
      pins: {
        genre,
        region: from ? { city: from } : undefined,
        vibe: vibe || undefined,
        signatureLook: lookHint || undefined,
        stageName: stageName || undefined,
      },
    })
    if (result === 'insufficient_credits') {
      useCreditsStore.getState().openPurchaseDialog()
      return
    }
    if (result !== true) {
      setError('Something went wrong. Try again.')
      return
    }
    useCreditsStore.getState().fetchBalance(true)
  }

  if (isBuildingFromPins) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-fuchsia-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Rolling the dice...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => setWizardStep('doors')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-medium">
          <Dices className="w-3 h-3" />
          Surprise me
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Pick a genre. We&apos;ll do the rest.</h1>
        <p className="text-muted-foreground">
          Genre is required — everything else is optional spice.
        </p>
      </div>

      <div className="space-y-6">
        <GenrePickerStandalone value={genre} onChange={setGenre} requireBase />

        <div className="border-t pt-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spice it up (optional)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextPin label="🏷️ Stage name" value={stageName} onChange={setStageName} placeholder="e.g. Lil Stardust" />
            <TextPin label="📍 From" value={from} onChange={setFrom} placeholder="e.g. Houston, TX" />
            <TextPin label="⚡ Vibe word" value={vibe} onChange={setVibe} placeholder="e.g. menacing" />
            <TextPin label="👤 Look hint" value={lookHint} onChange={setLookHint} placeholder="e.g. knee-length dreads" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleRoll}
          disabled={!canRoll}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-fuchsia-500 px-5 py-4 text-base font-semibold text-white hover:bg-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Dices className="w-5 h-5" />
          ROLL
          <span className="text-xs font-normal opacity-70">15 pts</span>
        </button>
      </div>
    </div>
  )
}

function TextPin({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50"
      />
    </label>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/wizard/Door3SurpriseMe.tsx
git commit -m "feat(artist-wizard): add Door3SurpriseMe component"
```

---

## Task 10: Build `Door2BuildIt` component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/wizard/Door2BuildIt.tsx`

- [ ] **Step 1: Create Door 2**

```tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, Wand2, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'

interface Pins {
  genre: GenrePickerValue
  region: string
  ethnicity: string
  gender: string
  vocalStyle: string
  signatureLook: string
  vibe: string
  era: string
  language: string
}

const EMPTY_PINS: Pins = {
  genre: {},
  region: '',
  ethnicity: '',
  gender: '',
  vocalStyle: '',
  signatureLook: '',
  vibe: '',
  era: '',
  language: '',
}

export function Door2BuildIt() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [description, setDescription] = useState('')
  const [pins, setPins] = useState<Pins>(EMPTY_PINS)
  const [error, setError] = useState('')

  const hasAnyPin =
    !!pins.genre.base ||
    !!pins.region ||
    !!pins.ethnicity ||
    !!pins.gender ||
    !!pins.vocalStyle ||
    !!pins.signatureLook ||
    !!pins.vibe ||
    !!pins.era ||
    !!pins.language

  const canGenerate = description.trim().length > 0 || hasAnyPin

  const handleGenerate = async () => {
    if (!canGenerate) return
    setError('')
    const result = await buildFromPins({
      description: description.trim() || undefined,
      pins: {
        genre: pins.genre.base ? pins.genre : undefined,
        region: pins.region ? { city: pins.region } : undefined,
        ethnicity: pins.ethnicity || undefined,
        gender: pins.gender || undefined,
        vocalStyle: pins.vocalStyle || undefined,
        signatureLook: pins.signatureLook || undefined,
        vibe: pins.vibe || undefined,
        era: pins.era || undefined,
        language: pins.language || undefined,
      },
    })
    if (result === 'insufficient_credits') {
      useCreditsStore.getState().openPurchaseDialog()
      return
    }
    if (result !== true) {
      setError('Something went wrong. Try again.')
      return
    }
    useCreditsStore.getState().fetchBalance(true)
  }

  if (isBuildingFromPins) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Building your artist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => setWizardStep('doors')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">
          <Wand2 className="w-3 h-3" />
          Build it
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Describe your artist.</h1>
        <p className="text-muted-foreground">Type, pin, or both. Everything you don&apos;t specify will be invented for you.</p>
      </div>

      <div className="space-y-6">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Texas trap artist, Black guy, knee-length colorful dreads, melodic but raw, somewhere between Travis Scott and Playboi Carti but with a harder edge..."
          rows={5}
          className="w-full rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 resize-none"
        />

        <div className="border-t pt-6 space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pins (all optional)</h2>

          <GenrePickerStandalone value={pins.genre} onChange={(v) => setPins({ ...pins, genre: v })} />

          <div className="grid sm:grid-cols-2 gap-3">
            <TextPin label="📍 Region" value={pins.region} onChange={(v) => setPins({ ...pins, region: v })} placeholder="city, state, or country" />
            <TextPin label="🌍 Ethnicity / heritage" value={pins.ethnicity} onChange={(v) => setPins({ ...pins, ethnicity: v })} placeholder="e.g. Afro-Latino" />
            <TextPin label="👤 Gender / presentation" value={pins.gender} onChange={(v) => setPins({ ...pins, gender: v })} placeholder="e.g. non-binary" />
            <TextPin label="🎤 Vocal style" value={pins.vocalStyle} onChange={(v) => setPins({ ...pins, vocalStyle: v })} placeholder="e.g. raspy melodic rapper" />
            <TextPin label="👗 Signature look" value={pins.signatureLook} onChange={(v) => setPins({ ...pins, signatureLook: v })} placeholder="e.g. knee-length colorful dreads" />
            <TextPin label="⚡ Vibe / energy" value={pins.vibe} onChange={(v) => setPins({ ...pins, vibe: v })} placeholder="e.g. menacing" />
            <TextPin label="📖 Era" value={pins.era} onChange={(v) => setPins({ ...pins, era: v })} placeholder="e.g. 90s boom-bap revival" />
            <TextPin label="🌐 Language" value={pins.language} onChange={(v) => setPins({ ...pins, language: v })} placeholder="e.g. Spanish" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-4 text-base font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Wand2 className="w-5 h-5" />
          Generate
          <span className="text-xs font-normal opacity-70">15 pts</span>
        </button>
      </div>
    </div>
  )
}

function TextPin({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
      />
    </label>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/wizard/Door2BuildIt.tsx
git commit -m "feat(artist-wizard): add Door2BuildIt component"
```

---

## Task 11: Build the `ReviewAndRemixScreen` (minimal v1 that delegates to existing ArtistEditor tabs)

The full magazine-spread review screen is a big component. For v1, we ship a **simpler review screen** that wraps the existing `ArtistEditor` plus adds the rename nudge and a "Show wizard again" back button. The magazine spread can follow in a v2 once the wizard flow is validated.

This keeps Task 11 small AND ensures every door still lands on something that works end-to-end.

**Files:**
- Create: `src/features/music-lab/components/artist-dna/review/ReviewAndRemixScreen.tsx`
- Create: `src/features/music-lab/components/artist-dna/review/RenameSuggestionPill.tsx`

- [ ] **Step 1: Create the rename suggestion pill**

```tsx
// src/features/music-lab/components/artist-dna/review/RenameSuggestionPill.tsx
'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function RenameSuggestionPill() {
  const { draft, seededFrom, suggestRename, setDraftName } = useArtistDnaStore()
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const currentName = draft.identity.stageName
  const isRealName = !!seededFrom && currentName === seededFrom

  useEffect(() => {
    if (!isRealName || dismissed) return
    let cancelled = false
    setLoading(true)
    suggestRename(seededFrom!, draft.sound.genres, draft.identity.city).then((alts) => {
      if (!cancelled) {
        setAlternatives(alts)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isRealName, seededFrom, dismissed, suggestRename, draft.sound.genres, draft.identity.city])

  if (!isRealName || dismissed) return null

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-400">Rename suggested</p>
          <p className="text-muted-foreground mt-0.5">
            Saving the real name may impersonate a real artist. Pick a fictional alternative:
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Keep real name
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Thinking of alternatives...
        </div>
      ) : alternatives.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alternatives.map((name) => (
            <button
              key={name}
              onClick={() => {
                setDraftName(name)
                setDismissed(true)
              }}
              className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Use &quot;{name}&quot;
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Create the review screen wrapper**

```tsx
// src/features/music-lab/components/artist-dna/review/ReviewAndRemixScreen.tsx
'use client'

import { ArtistEditor } from '../ArtistEditor'
import { RenameSuggestionPill } from './RenameSuggestionPill'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function ReviewAndRemixScreen() {
  const { activeArtistId } = useArtistDnaStore()
  const isNew = !activeArtistId

  return (
    <div className="space-y-3">
      {isNew && (
        <div className="px-1">
          <RenameSuggestionPill />
        </div>
      )}
      <ArtistEditor />
    </div>
  )
}
```

**Why reuse ArtistEditor in v1:** The spec calls for a magazine-spread layout long-term, but that's a large design task on top of the wizard work. Shipping v1 with the wizard doors → existing editor means users get the on-ramp benefit immediately, the old editor becomes the "review & remix" surface (same idea, just lower visual polish), and the spec's magazine layout can be tackled as a follow-up without blocking the wizard release.

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/review/
git commit -m "feat(artist-wizard): add ReviewAndRemixScreen and RenameSuggestionPill"
```

---

## Task 12: Wire the wizard into `ArtistDnaPage`

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/ArtistDnaPage.tsx`

- [ ] **Step 1: Route rendering by wizardStep**

Replace the contents of `src/features/music-lab/components/artist-dna/ArtistDnaPage.tsx` with:

```tsx
'use client'

import { useEffect } from 'react'
import { Dna } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ArtistList } from './ArtistList'
import { ArtistEditor } from './ArtistEditor'
import { ArtistDoorSelector } from './wizard/ArtistDoorSelector'
import { Door1SeedFromArtist } from './wizard/Door1SeedFromArtist'
import { Door2BuildIt } from './wizard/Door2BuildIt'
import { Door3SurpriseMe } from './wizard/Door3SurpriseMe'
import { ReviewAndRemixScreen } from './review/ReviewAndRemixScreen'

interface ArtistDnaPageProps {
  userId: string
}

export function ArtistDnaPage({ userId }: ArtistDnaPageProps) {
  const { initialize, editorOpen, wizardStep } = useArtistDnaStore()

  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  if (editorOpen) {
    switch (wizardStep) {
      case 'doors':
        return <ArtistDoorSelector />
      case 'door1':
        return <Door1SeedFromArtist />
      case 'door2':
        return <Door2BuildIt />
      case 'door3':
        return <Door3SurpriseMe />
      case 'review':
        return <ReviewAndRemixScreen />
      case 'advanced':
        return <ArtistEditor />
      default:
        return <ArtistDoorSelector />
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 pt-6">
        <Dna className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Artist Lab</h1>
      </div>
      <ArtistList />
    </div>
  )
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "ArtistDnaPage" | head -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/ArtistDnaPage.tsx
git commit -m "feat(artist-wizard): route ArtistDnaPage by wizardStep"
```

---

## Task 13: Remove the legacy "Start from Real Artist" card from `ArtistList` and simplify "Create New"

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/ArtistList.tsx`

The ArtistList currently has two side-by-side "Create New Artist" and "Start from Real Artist" buttons plus a dialog for the seed flow. With the wizard, both are redundant — a single "Create New Artist" button opens the wizard, which includes Door 1.

- [ ] **Step 1: Remove the "Start from Real Artist" button and its dialog**

Open `src/features/music-lab/components/artist-dna/ArtistList.tsx`. Remove:

1. The `Sparkles` and `Loader2` imports (they're only used by the removed dialog)
2. The `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription` import block
3. The `useCreditsStore` import (no longer used after removing the dialog)
4. The `LOADING_PHASES` constant
5. These state hooks: `seedInput`, `seedDialogOpen`, `seedError`, `loadingPhase`
6. The `isSeedingFromArtist` and `startFromArtist` destructures from `useArtistDnaStore` — keep `startNewArtist`, `loadArtistIntoDraft`, `deleteArtist`, `exportArtist`, `importArtist`, `artists`, `isLoading`
7. The `useEffect` that cycles loading phases
8. The `handleSeedFromArtist` and `handleOpenSeedDialog` functions
9. The entire "Start from Real Artist" button (the second dashed-border button)
10. The entire Seed-from-Artist Dialog (`<Dialog open={seedDialogOpen}...>`)

The remaining JSX should look like:

```tsx
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onClick={() => loadArtistIntoDraft(artist.id)}
            onDelete={() => setDeleteTarget(artist.id)}
            onExport={() => exportArtist(artist.id)}
          />
        ))}

        <button
          onClick={startNewArtist}
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[100px]"
        >
          <Plus className="w-8 h-8" />
          <span className="font-medium">Create New Artist</span>
        </button>

        <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-dashed border-border/50 p-3 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors text-sm text-muted-foreground hover:text-cyan-400">
          <Upload className="w-4 h-4" />
          Import Artist
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              await importArtist(text)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artist</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this artist profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
```

The full updated imports block at the top should be:

```tsx
'use client'

import { useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArtistCard } from './ArtistCard'
import { useArtistDnaStore } from '../../store/artist-dna.store'
```

And the destructure:

```tsx
  const { artists, isLoading, startNewArtist, loadArtistIntoDraft, deleteArtist, exportArtist, importArtist } =
    useArtistDnaStore()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "ArtistList" | head -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/ArtistList.tsx
git commit -m "feat(artist-wizard): remove legacy seed dialog — now inside wizard Door 1"
```

---

## Task 14: Clean build + manual smoke test

**Files:** none

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -40
```

Expected: `✓ Compiled successfully` with no errors. If ESLint or TS errors appear, fix them and rebuild.

- [ ] **Step 2: Start dev server if not running**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Verify: `curl -s http://localhost:3002 > /dev/null && echo "OK"` should print `OK`.

- [ ] **Step 3: Manual smoke checklist**

Navigate to the Music Lab artist DNA page in a browser (localhost:3002 → Music Lab → Artist Lab tab). Verify:

1. The existing artist list renders as before.
2. Clicking "Create New Artist" opens the **three-door selection screen** (not the old blank editor).
3. Clicking **Door 1** ("Inspired by an artist") shows the name input; Back returns to doors.
4. Clicking **Door 2** ("Build it") shows the description textarea + pins; Back returns to doors. Generate button is disabled until you type a description OR pin at least one thing.
5. Clicking **Door 3** ("Surprise me") shows the genre picker; ROLL button is disabled until a genre is picked.
6. Clicking **an existing artist card** opens it directly in **Review & Remix** (which visually looks like the old 6-tab editor for v1). The rename-suggestion pill should NOT appear for existing artists (it only shows for brand-new seeded ones).
7. A full Door 3 round-trip: Pick a genre → ROLL → (waits) → lands on Review & Remix with a draft populated.
8. A full Door 1 round-trip with a known real artist (Drake): Type name → Build → (waits through loading phases) → lands on Review & Remix with the rename-suggestion pill visible at the top, showing 3 alternative fictional names.
9. Clicking an alternative name chip updates the stage name field in the editor and dismisses the pill.
10. "Keep real name" on the pill dismisses it without changing the name.
11. Close button on the door selector (X in top-right) closes the wizard back to the artist list.

- [ ] **Step 4: Commit anything incidentally fixed during smoke test**

```bash
git status
# If there are fixes:
git add -A && git commit -m "fix(artist-wizard): smoke-test fixes"
```

---

## Task 15: Playwright smoke tests

**Files:**
- Create: `tests/artist-wizard/door-selection.spec.ts`

- [ ] **Step 1: Check existing Playwright config and auth helper**

```bash
ls tests/ 2>&1 | head -20
cat playwright.config.ts 2>&1 | head -30
```

Look for an existing auth setup file (e.g. `tests/auth.setup.ts` or similar) that creates a logged-in state. The existing artist DNA tests (if any) will show the pattern.

- [ ] **Step 2: Write a minimal door-selection smoke test**

Based on the existing test patterns in the repo, create `tests/artist-wizard/door-selection.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

// Assumes existing auth setup (storageState in playwright.config.ts)
// provides a logged-in user session.

test.describe('Artist Creation Wizard', () => {
  test('shows three door cards when creating a new artist', async ({ page }) => {
    await page.goto('/music-lab')

    // Navigate to the Artist Lab tab (adapt selector to the real tab structure)
    await page.getByRole('tab', { name: /artist lab/i }).click()

    // Click "Create New Artist"
    await page.getByRole('button', { name: /create new artist/i }).click()

    // All three doors should be visible
    await expect(page.getByRole('heading', { name: /inspired by an artist/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /build it/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /surprise me/i })).toBeVisible()
  })

  test('Door 2 Generate button is disabled with no input', async ({ page }) => {
    await page.goto('/music-lab')
    await page.getByRole('tab', { name: /artist lab/i }).click()
    await page.getByRole('button', { name: /create new artist/i }).click()

    // Click Door 2
    await page.getByRole('heading', { name: /build it/i }).click()

    // Generate button should be disabled
    const generate = page.getByRole('button', { name: /generate/i })
    await expect(generate).toBeDisabled()
  })

  test('Door 3 ROLL button is disabled until a genre is picked', async ({ page }) => {
    await page.goto('/music-lab')
    await page.getByRole('tab', { name: /artist lab/i }).click()
    await page.getByRole('button', { name: /create new artist/i }).click()

    await page.getByRole('heading', { name: /surprise me/i }).click()

    const roll = page.getByRole('button', { name: /^roll/i })
    await expect(roll).toBeDisabled()
  })
})
```

**Note:** The exact selectors for the Music Lab tab navigation may differ — check an existing passing test in `tests/` for the correct tab navigation pattern and adjust the `getByRole('tab'...)` line accordingly. If the Music Lab page structure uses a different component for tabs, match that.

- [ ] **Step 3: Run the new tests**

```bash
cd D:/git/directors-palette-v2 && npx playwright test tests/artist-wizard/door-selection.spec.ts --reporter=line 2>&1 | tail -30
```

Expected: all 3 tests pass. If selectors are wrong, fix them based on the actual DOM (run `npx playwright test --debug` to inspect).

- [ ] **Step 4: Commit**

```bash
git add tests/artist-wizard/
git commit -m "test(artist-wizard): add Playwright smoke tests for door selection"
```

---

## Task 16: Final clean build + push

**Files:** none

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Verify no uncommitted files**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Three doors on entry → Task 6 (selector), Tasks 7/10/9 (doors 1/2/3)
- ✅ Door 1 with rename nudge → Task 7 + Task 11 (RenameSuggestionPill) + Task 4 (suggest-rename API)
- ✅ Door 2 with description + pins → Task 10
- ✅ Door 3 with genre + 4 spice pins → Task 9
- ✅ Review & Remix screen → Task 11 (v1 wraps existing ArtistEditor + rename pill)
- ✅ Advanced view link → `wizardStep === 'advanced'` routes to `ArtistEditor` directly (Task 12)
- ✅ New APIs → Tasks 3 and 4
- ✅ Store changes → Tasks 1, 2, 5
- ✅ Existing artists open into review → Task 2 (loadArtistIntoDraft sets wizardStep='review')
- ✅ Legal nudge, not block → Task 11 RenameSuggestionPill has "Keep real name" option
- ⚠️ **Magazine-spread Review layout NOT implemented in v1** — Task 11 explicitly scopes this as a v2 follow-up. The wizard on-ramp ships first; the visual remix screen follows in a separate design cycle. This is a conscious scope cut to avoid bundling two large features.
- ⚠️ **Auto-portrait generation after doors** — spec open question. Not implemented in this plan; can be added post-ship based on user feedback.

**Placeholder scan:** None. Every step contains exact code or exact commands.

**Type consistency check:**
- `WizardStep` defined once in Task 1, used in Tasks 1, 2, 12
- `buildFromPins` signature: Task 5 defines `(request: { description?: string; pins?: Record<string, unknown> })` — Tasks 9 and 10 call it with this shape
- `GenrePickerValue` defined once in Task 8, used in Tasks 9 and 10
- `RenameSuggestionPill` uses `suggestRename` from store (defined in Task 5), `setDraftName` (existing), `seededFrom` (existing)
- `applyWizardResult` defined in Task 1, called by `buildFromPins` in Task 5
- Door 1 reuses the existing `startFromArtist` store action — no new action needed there

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-artist-creation-wizard.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
