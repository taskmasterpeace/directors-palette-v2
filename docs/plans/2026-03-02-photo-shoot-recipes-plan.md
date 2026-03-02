# Photo Shoot Recipe System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform all 22 photo shoot scenes into expandable accordion groups with sub-scenes, recipe fields (select/text/prefilled), point cost display, and enhanced authentic prompts.

**Architecture:** Rewrite `photo-shoot.service.ts` with new `PhotoShootSubScene` model containing fields and prompt builders. Rewrite `PhotoShootSubTab.tsx` as an accordion UI with recipe fields. Update API route to accept direct prompt instead of sceneId lookup.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Zustand, nano-banana-2 (6 pts/image)

---

### Task 1: Update API Route to Accept Direct Prompt

The API currently takes `sceneId` and builds the prompt server-side. We need it to accept a pre-built prompt + aspectRatio directly, since sub-scene prompts with user field values are now built client-side.

**Files:**
- Modify: `src/app/api/artist-dna/generate-photo-shoot/route.ts`

**Step 1: Update the request interface and handler**

Change `PhotoShootRequest` to accept `prompt` + `aspectRatio` as an alternative to `sceneId`. When `prompt` is provided directly, skip the `buildPhotoShootPrompt` call.

```typescript
interface PhotoShootRequest {
  sceneId?: string        // Legacy: look up scene by ID
  prompt?: string         // New: pre-built prompt from client
  aspectRatio?: string    // New: comes with prompt
  dna: ArtistDNA
  characterSheetUrl?: string
}
```

In the handler, add this logic after validation:

```typescript
let finalPrompt: string
let finalAspectRatio: string

if (body.prompt && body.aspectRatio) {
  // New path: prompt built client-side with recipe field values
  finalPrompt = body.prompt
  finalAspectRatio = body.aspectRatio
} else if (body.sceneId) {
  // Legacy path: build prompt from scene ID
  const result = buildPhotoShootPrompt(body.sceneId, body.dna)
  if (!result) {
    return NextResponse.json({ error: `Unknown scene: ${body.sceneId}` }, { status: 400 })
  }
  finalPrompt = result.prompt
  finalAspectRatio = result.aspectRatio
} else {
  return NextResponse.json({ error: 'prompt+aspectRatio or sceneId required' }, { status: 400 })
}
```

Then use `finalPrompt` and `finalAspectRatio` in the Replicate input and response.

**Step 2: Commit**

```bash
git add src/app/api/artist-dna/generate-photo-shoot/route.ts
git commit -m "feat(photo-shoot): accept direct prompt in API route"
```

---

### Task 2: Create Photo Shoot Types + Common Fields

Define the new type system and shared recipe fields used across all sub-scenes.

**Files:**
- Create: `src/features/music-lab/types/photo-shoot.types.ts`

**Step 1: Write the types file**

```typescript
import type { ArtistDNA } from './artist-dna.types'

export type PhotoShootCategory = 'wardrobe' | 'location' | 'social' | 'performance' | 'everyday'

export interface PhotoShootField {
  id: string
  label: string
  type: 'select' | 'text'
  options?: string[]
  defaultValue?: string
  placeholder?: string
}

export interface PhotoShootSubScene {
  id: string
  label: string
  description: string
  aspectRatio: '16:9' | '9:16' | '1:1'
  fields: PhotoShootField[]
  buildPrompt: (dna: ArtistDNA, fieldValues: Record<string, string>) => string
}

export interface PhotoShootScene {
  id: string
  label: string
  description: string
  category: PhotoShootCategory
  subScenes: PhotoShootSubScene[]
}

export interface PhotoShootCategoryInfo {
  id: PhotoShootCategory
  label: string
  icon: string
}
```

**Step 2: Create common field definitions**

Create shared field presets in the same file:

```typescript
export const COMMON_FIELDS = {
  pov: {
    id: 'pov',
    label: 'Camera POV',
    type: 'select' as const,
    options: [
      'Professional editorial',
      'Fan photo from across the room',
      'Paparazzi long lens',
      'Candid friend\'s phone',
      'iPhone selfie (front camera)',
      'Security camera angle',
    ],
    defaultValue: 'Professional editorial',
  },
  lighting: {
    id: 'lighting',
    label: 'Lighting',
    type: 'select' as const,
    options: [
      'Natural daylight',
      'Golden hour',
      'Studio flash',
      'Dramatic single source',
      'Neon / LED accent',
      'Overhead fluorescent',
      'Candlelight / warm ambient',
    ],
    defaultValue: 'Natural daylight',
  },
  mood: {
    id: 'mood',
    label: 'Mood',
    type: 'select' as const,
    options: [
      'Confident and powerful',
      'Relaxed and candid',
      'Intense and focused',
      'Playful and energetic',
      'Moody and contemplative',
    ],
    defaultValue: 'Confident and powerful',
  },
  customDetail: {
    id: 'customDetail',
    label: 'Custom Detail',
    type: 'text' as const,
    placeholder: 'Add any specific detail...',
  },
} satisfies Record<string, PhotoShootField>
```

**Step 3: Add POV prompt mapper**

```typescript
export function povToPrompt(pov: string): string {
  switch (pov) {
    case 'Fan photo from across the room':
      return 'shot by a fan on an iPhone from 30 feet away, slightly grainy, zoomed-in crop, authentic candid moment, they don\'t know they\'re being photographed'
    case 'Paparazzi long lens':
      return '300mm telephoto lens, paparazzi-style, shot from a distance, compressed depth of field, celebrity caught in public'
    case 'Candid friend\'s phone':
      return 'taken by a friend on a smartphone, casual angle, slightly off-center framing, authentic and unposed, warm social energy'
    case 'iPhone selfie (front camera)':
      return 'iPhone 16 Pro front camera selfie, 12MP, wide angle slight distortion, arm extended, looking directly into lens'
    case 'Security camera angle':
      return 'overhead security camera angle, wide fish-eye distortion, timestamp overlay in corner, surveillance footage aesthetic'
    default:
      return 'professional photography, well-composed, sharp focus'
  }
}

export function lightingToPrompt(lighting: string): string {
  switch (lighting) {
    case 'Golden hour': return 'golden hour warm sunlight, long shadows, amber backlight'
    case 'Studio flash': return 'studio flash photography, clean even lighting, slight harsh shadows'
    case 'Dramatic single source': return 'single dramatic light source, deep shadows on one side, chiaroscuro effect'
    case 'Neon / LED accent': return 'neon LED accent lighting, colored light spill, cyberpunk-adjacent glow'
    case 'Overhead fluorescent': return 'overhead fluorescent lighting, slightly sterile, realistic indoor environment'
    case 'Candlelight / warm ambient': return 'warm candlelight and ambient lamps, soft intimate glow, low-light'
    default: return 'natural daylight, soft even lighting'
  }
}
```

**Step 4: Commit**

```bash
git add src/features/music-lab/types/photo-shoot.types.ts
git commit -m "feat(photo-shoot): add sub-scene types and common recipe fields"
```

---

### Task 3: Rewrite Photo Shoot Service — All 22 Scenes with Sub-Scenes

This is the biggest task. Rewrite `photo-shoot.service.ts` to use the new sub-scene architecture. Keep all the DNA extractors (they're great), but restructure scenes into groups with sub-scenes and fields.

**Files:**
- Modify: `src/features/music-lab/services/photo-shoot.service.ts`

**Step 1: Keep DNA extractors, remove old scene array**

Keep these functions exactly as-is: `location()`, `city()`, `hood()`, `ethnicity()`, `appearance()`, `genreTag()`, `personality()`, `likes()`, `genreAesthetic()`, `genreCamera()`.

Remove: `PHOTO_SHOOT_SCENES` array, old `PhotoShootScene` interface, old `buildPhotoShootPrompt()`.

**Step 2: Import new types and add IDENTITY_LOCK**

```typescript
import type {
  PhotoShootScene,
  PhotoShootCategory,
  PhotoShootCategoryInfo,
  PhotoShootSubScene,
} from '../types/photo-shoot.types'
import { povToPrompt, lightingToPrompt, COMMON_FIELDS } from '../types/photo-shoot.types'

const IDENTITY_LOCK = 'EXACT SAME PERSON as the reference image. Maintain identical: face structure, skin tone, body type, tattoo placement, hair style, all distinguishing features. '
```

**Step 3: Build all 22 scene groups**

Each scene group contains 3-5 sub-scenes. Each sub-scene has fields and a buildPrompt that uses DNA extractors + field values. Below is the structure for each category.

**WARDROBE (4 scenes, ~16 sub-scenes):**

Scene: Streetwear Look → sub-scenes: Street Editorial, Sneaker Close-up, Full Outfit Turnaround, Against the Wall
Scene: Stage Outfit → sub-scenes: Under the Lights, Backstage Mirror, Outfit Detail, Walking to Stage
Scene: Studio Casual → sub-scenes: At the Console, Headphones On, Coffee Break, Writing Session
Scene: Press / Cover Shot → sub-scenes: Magazine Cover, Waiting Room, Signing for Fans, Wardrobe Room, Selfie with Posters

**LOCATIONS (4 scenes, ~16 sub-scenes):**

Scene: The Block → sub-scenes: Walking the Street, Corner Store Front, Stoop Sitting, Car Leaning
Scene: Rooftop at Sunset → sub-scenes: Skyline Portrait, Edge Shot, Looking Down, Golden Silhouette
Scene: Recording Studio → sub-scenes: At the Board, Through the Glass, Monitor Glow, Session Break
Scene: City at Night → sub-scenes: Neon Walk, Wet Street Reflection, Under the Sign, Taxi Shot

**SOCIAL MEDIA (4 scenes, ~16 sub-scenes):**

Scene: Mirror Selfie → sub-scenes: Bedroom Mirror, Bathroom Mirror, Dressing Room, Gym Mirror
Scene: Car Selfie → sub-scenes: Driver Seat, Passenger Lean, Parked Up, Through Windshield
Scene: Celebrating → sub-scenes: VIP Section, Toast Shot, Dance Floor, Group Outside
Scene: Food Spot → sub-scenes: Table Shot, Counter Seat, Takeout Walk, Kitchen Peek

**EVERYDAY (6 scenes, ~24 sub-scenes):**

Scene: Barbershop → sub-scenes: In the Chair, Fresh Cut Reveal, Waiting Area, Mirror Check
Scene: Corner Store → sub-scenes: Walking Out, Inside Browsing, At the Counter, Outside Leaning
Scene: Morning Coffee → sub-scenes: Window Seat, Kitchen Counter, Balcony Morning, Still Waking Up
Scene: Working Out → sub-scenes: Mid-Set, Post-Workout, Locker Room, Jump Rope
Scene: Writing Lyrics → sub-scenes: Notebook Close-up, Couch Session, Studio Floor, Late Night Desk
Scene: Hanging Out → sub-scenes: Activity from Likes, Porch/Stoop, Park Bench, Phone Scroll

**PERFORMANCE (4 scenes, ~16 sub-scenes):**

Scene: Live on Stage → sub-scenes: Crowd Shot, Close-up Mic, Side Stage, Hands Raised
Scene: In the Booth → sub-scenes: Through Glass, Eyes Closed, Headphones Adjust, Lyrics Sheet
Scene: Festival → sub-scenes: Main Stage Wide, Crowd Surf, Backstage Tent, Artist Tent
Scene: Music Video → sub-scenes: Hero Shot, Walking Scene, Car Scene, Dramatic Close-up

Every sub-scene's `buildPrompt` should:
1. Start with IDENTITY_LOCK prefix
2. Use DNA extractors for physical description, location, genre aesthetic
3. Apply field values via `povToPrompt()` and `lightingToPrompt()`
4. Append custom detail text field if provided
5. Always end with: `Realistic photograph, NOT illustration, NOT cartoon, NOT AI-looking.`

**Step 4: Export public API**

```typescript
export const PHOTO_SHOOT_SCENES: PhotoShootScene[] = [/* all scenes */]

export const PHOTO_SHOOT_CATEGORIES: PhotoShootCategoryInfo[] = [
  { id: 'wardrobe', label: 'Wardrobe', icon: '👔' },
  { id: 'location', label: 'Locations', icon: '📍' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'everyday', label: 'Everyday Life', icon: '☕' },
  { id: 'performance', label: 'Performance', icon: '🎤' },
]

export function getScenesByCategory(category: PhotoShootCategory): PhotoShootScene[] {
  return PHOTO_SHOOT_SCENES.filter(s => s.category === category)
}

// Build prompt for a sub-scene with user's field values
export function buildSubScenePrompt(
  sceneId: string,
  subSceneId: string,
  dna: ArtistDNA,
  fieldValues: Record<string, string>
): { prompt: string; aspectRatio: string } | null {
  const scene = PHOTO_SHOOT_SCENES.find(s => s.id === sceneId)
  if (!scene) return null
  const sub = scene.subScenes.find(s => s.id === subSceneId)
  if (!sub) return null
  return {
    prompt: sub.buildPrompt(dna, fieldValues),
    aspectRatio: sub.aspectRatio,
  }
}
```

**Step 5: Commit**

```bash
git add src/features/music-lab/services/photo-shoot.service.ts
git commit -m "feat(photo-shoot): rewrite service with 22 scene groups and 88 sub-scenes"
```

---

### Task 4: Rewrite PhotoShootSubTab UI — Accordion + Recipe Fields + Points

Completely rewrite the component with accordion UI, recipe fields, and point cost display.

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/tabs/look/PhotoShootSubTab.tsx`

**IMPORTANT:** Use superpowers:frontend-design skill for this task to ensure high design quality.

**Step 1: Plan the component structure**

```
PhotoShootSubTab
├── Character sheet confirmation bar (keep existing)
├── Category tabs (keep existing pill buttons)
├── Scene accordion list
│   └── SceneAccordionItem (per scene)
│       ├── Header: label + description + expand/collapse chevron
│       └── Expanded content:
│           └── SubSceneCard (per sub-scene)
│               ├── Title + description + aspect ratio badge
│               ├── Recipe fields (selects + text inputs)
│               └── Generate button with "· 6 pts"
├── Generating indicator
└── Recent shots (4-col grid, smaller thumbnails)
```

**Step 2: Key implementation details**

- State: `expandedSceneId: string | null` (only one scene expanded at a time)
- State: `fieldValues: Record<string, Record<string, string>>` keyed by `subSceneId → fieldId → value`
- State: `generatingSubSceneId: string | null`
- On generate: call `buildSubScenePrompt()` with field values, send result to API
- Points badge on generate button: hardcode "6 pts" (nano-banana-2 cost from config)
- Recent shots: change from `grid-cols-3` to `grid-cols-4` and add `aspect-[3/4]` for smaller thumbnails

**Step 3: Generate handler**

```typescript
const handleGenerate = async (scene: PhotoShootScene, subScene: PhotoShootSubScene) => {
  const subFieldValues = fieldValues[subScene.id] || {}
  const result = buildSubScenePrompt(scene.id, subScene.id, draft, subFieldValues)
  if (!result) return

  setGeneratingSubSceneId(subScene.id)
  try {
    const res = await fetch('/api/artist-dna/generate-photo-shoot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: result.prompt,
        aspectRatio: result.aspectRatio,
        dna: draft,
        characterSheetUrl: look.characterSheetUrl || undefined,
      }),
    })
    // ... handle response same as before
  } finally {
    setGeneratingSubSceneId(null)
  }
}
```

**Step 4: Build and verify**

```bash
rm -rf .next && npm run build
```

**Step 5: Commit**

```bash
git add src/features/music-lab/components/artist-dna/tabs/look/PhotoShootSubTab.tsx
git commit -m "feat(photo-shoot): accordion UI with recipe fields and point cost"
```

---

### Task 5: Clean Build + Manual Test + Push

**Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Fix any TypeScript or ESLint errors.

**Step 2: Start dev server and test**

```bash
node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Manual test checklist:
- [ ] Navigate to Music Lab → Artist DNA → Look tab → Photo Shoots
- [ ] Verify character sheet gate still works
- [ ] Click a scene — verify accordion expands with sub-scenes
- [ ] Check recipe fields appear (selects + text inputs)
- [ ] Generate a sub-scene — verify "6 pts" shows on button
- [ ] Verify image generates and appears in recent shots (4-col, smaller)
- [ ] Click another scene — verify first one collapses
- [ ] Test each category tab

**Step 3: Push**

```bash
git push origin main
```
