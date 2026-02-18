# Premade Character Sheet Import — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to attach a premade character sheet (single image file) to any character in the storyboard, either by uploading from their device or by picking from their gallery with a "Character Sheets" filter — so they don't have to generate one every time.

**Architecture:** Enhance the existing `CharacterCard` component's reference image flow. The upload path already exists (base64 via FileReader). The gallery picker (`GalleryImagePicker`) already supports source filtering. We add a new "Character Sheets" filter option to the gallery picker that filters by `metadata.type === 'character-turnaround'` (the tag already used by `CharacterSheetGenerator` batch generation). When a premade sheet is attached, it becomes the character's `reference_image_url` — the same field used during shot generation. No new database columns, no new API routes, no new components.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase (JSONB metadata filter), existing shadcn/ui components

---

### Task 1: Add metadata type filter to GalleryImagePicker

The gallery picker already filters by `source` (storyboard, shot-creator, etc.). We need to add the ability to also filter by `metadata.type` so users can narrow down to character sheets specifically.

**Files:**
- Modify: `src/features/storyboard/components/entities/GalleryImagePicker.tsx`

**Step 1: Add a "Character Sheets" toggle to the GalleryImagePicker**

Add a new prop `metadataTypeFilter` to `GalleryImagePickerProps` and a corresponding badge/toggle in the filter UI. When active, this will pass the filter down to the gallery service.

In `GalleryImagePicker.tsx`, update the interface and add state:

```tsx
interface GalleryImagePickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (url: string, galleryId?: string) => void
    defaultMetadataTypeFilter?: string  // e.g. 'character-turnaround'
}
```

Add state for the metadata type filter:

```tsx
const [metadataTypeFilter, setMetadataTypeFilter] = useState<string | null>(
    props.defaultMetadataTypeFilter ?? null
)
```

Add a toggle badge in the filter bar (after the source filter badges):

```tsx
<div className="flex gap-1 flex-wrap">
    {SOURCE_OPTIONS.map(opt => (
        <Badge
            key={opt.label}
            variant={sourceFilter === opt.value ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSourceFilter(opt.value)}
        >
            {opt.label}
        </Badge>
    ))}
    <div className="w-px bg-border mx-1" />
    <Badge
        variant={metadataTypeFilter === 'character-turnaround' ? 'default' : 'outline'}
        className="cursor-pointer text-xs"
        onClick={() => setMetadataTypeFilter(
            metadataTypeFilter === 'character-turnaround' ? null : 'character-turnaround'
        )}
    >
        Character Sheets
    </Badge>
</div>
```

Pass `metadataTypeFilter` into the `loadImages` callback alongside `searchQuery` and `sourceFilter`:

```tsx
const result = await GalleryService.loadUserGalleryPaginated(
    pageNum,
    30,
    null,
    {
        searchQuery: searchQuery || undefined,
        sourceFilter: sourceFilter || undefined,
        metadataTypeFilter: metadataTypeFilter || undefined,
    }
)
```

Add `metadataTypeFilter` to the dependency array of the `loadImages` useCallback AND the useEffect that triggers reload on filter change.

**Step 2: Run the dev server and verify the component renders**

Run: `rm -rf .next && npx next build` (type check only — no need to start server yet)
Expected: Build succeeds with no type errors (the `metadataTypeFilter` option doesn't exist on the service yet, so this step will fail — that's expected and confirms we need Task 2)

**Step 3: Commit**

```bash
git add src/features/storyboard/components/entities/GalleryImagePicker.tsx
git commit -m "feat(storyboard): add character sheet filter toggle to gallery picker"
```

---

### Task 2: Thread metadataTypeFilter through gallery service and repository

The gallery service chain is: `GalleryImagePicker` → `GalleryService.loadUserGalleryPaginated()` → `UnifiedGalleryService.loadUserGalleryPaginated()` → `GalleryRepository.findPaginated()`. We need to thread the new `metadataTypeFilter` option through all three layers.

**Files:**
- Modify: `src/features/shot-creator/services/gallery.service.ts` (feature-level wrapper)
- Modify: `src/lib/services/gallery.service.ts` (unified service)
- Modify: `src/lib/db/repositories/gallery.repository.ts` (database query)

**Step 1: Add metadataTypeFilter to the feature-level GalleryService**

In `src/features/shot-creator/services/gallery.service.ts`, update the `loadUserGalleryPaginated` method's `options` parameter type to include `metadataTypeFilter?: string`, and pass it through:

```ts
static async loadUserGalleryPaginated(
    page: number,
    pageSize: number,
    folderId?: string | null,
    options?: { includeProcessing?: boolean; searchQuery?: string; sourceFilter?: string; metadataTypeFilter?: string }
): Promise<{ images: GeneratedImage[]; total: number; totalPages: number }> {
    // ... existing code ...
    const result = await UnifiedGalleryService.loadUserGalleryPaginated(
        'image',
        page,
        pageSize,
        folderId,
        {
            includeProcessing: options?.includeProcessing ?? true,
            searchQuery: options?.searchQuery,
            sourceFilter: options?.sourceFilter,
            metadataTypeFilter: options?.metadataTypeFilter,
        }
    )
    // ... rest unchanged ...
}
```

**Step 2: Add metadataTypeFilter to UnifiedGalleryService**

In `src/lib/services/gallery.service.ts`, update the `loadUserGalleryPaginated` method's options type and pass it to the repository:

```ts
// Add to options type
metadataTypeFilter?: string;

// Pass to repository call
metadataTypeFilter: options?.metadataTypeFilter
```

**Step 3: Add metadataTypeFilter to GalleryRepository.findPaginated**

In `src/lib/db/repositories/gallery.repository.ts`, update the `findPaginated` options type to include `metadataTypeFilter?: string`. Then add the Supabase filter right after the existing `sourceFilter` block (around line 122 and 147):

```ts
// Apply metadata type filter if provided (filter by metadata->>'type')
if (metadataTypeFilter) {
    countQuery = countQuery.eq('metadata->>type', metadataTypeFilter);
}
```

And the same for the data query:

```ts
// Apply metadata type filter if provided
if (metadataTypeFilter) {
    dataQuery = dataQuery.eq('metadata->>type', metadataTypeFilter);
}
```

**Step 4: Build and verify**

Run: `rm -rf .next && npx next build`
Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add src/features/shot-creator/services/gallery.service.ts src/lib/services/gallery.service.ts src/lib/db/repositories/gallery.repository.ts
git commit -m "feat(gallery): thread metadataTypeFilter through service and repository layers"
```

---

### Task 3: Wire up the CharacterCard to open gallery picker with character sheet filter

Currently in `CharacterCard`, when the user clicks the "Gallery" mode button, it opens `GalleryImagePicker` with no default filter. We want to pass `defaultMetadataTypeFilter="character-turnaround"` so the character sheets filter is pre-selected when opening from a character card.

**Files:**
- Modify: `src/features/storyboard/components/entities/CharacterList.tsx`

**Step 1: Pass defaultMetadataTypeFilter to GalleryImagePicker**

In the `CharacterCard` component, find where `GalleryImagePicker` is rendered (around line 264) and add the prop:

```tsx
<GalleryImagePicker
    open={galleryPickerOpen}
    onOpenChange={setGalleryPickerOpen}
    onSelect={handleGallerySelect}
    defaultMetadataTypeFilter="character-turnaround"
/>
```

**Step 2: Build and verify**

Run: `rm -rf .next && npx next build`
Expected: Build succeeds.

**Step 3: Manual test**

Run: `node node_modules/next/dist/bin/next dev --port 3002`

1. Go to `http://localhost:3002` → Storyboard
2. Paste a story, extract characters
3. Go to Entities tab
4. Expand a character card, toggle Reference on
5. Click "Gallery" mode
6. Click "Browse gallery images"
7. Verify the "Character Sheets" badge appears in the filter bar and is pre-selected
8. Click it off — should show all images
9. Click it on — should filter to only character turnaround images

**Step 4: Commit**

```bash
git add src/features/storyboard/components/entities/CharacterList.tsx
git commit -m "feat(storyboard): pre-select character sheet filter when opening gallery from character card"
```

---

### Task 4: Ensure uploaded character sheets are tagged in metadata

When a user uploads a character sheet via the file upload button on a character card, the image is currently stored as a base64 data URL directly in the store — it never goes to the gallery or gets tagged. This is fine for the upload path (the user's file becomes the reference image directly).

However, we should also ensure that when the CharacterSheetGenerator generates sheets (both batch and individual), the metadata includes `type: 'character-turnaround'` so the gallery filter works. Let's verify this is already the case.

**Files:**
- Verify: `src/features/storyboard/components/entities/CharacterSheetGenerator.tsx` (line 322 — already has `type: 'character-turnaround'`)
- Verify: `src/features/storyboard/services/character-sheet.service.ts` (check individual generation metadata)

**Step 1: Read and verify character-sheet.service.ts metadata**

Read the character sheet service to check if individual generation (not batch) also tags with `type: 'character-turnaround'`. If not, add it.

Look for the metadata passed to `/api/generation/image` in the `generateCharacterSheet` method. It should include:
```ts
metadata: {
    source: 'storyboard',
    type: 'character-turnaround',
    characterName: params.characterName,
}
```

If `type: 'character-turnaround'` is missing from the individual generation path, add it.

**Step 2: Build and verify**

Run: `rm -rf .next && npx next build`
Expected: Build succeeds.

**Step 3: Commit (only if changes were needed)**

```bash
git add src/features/storyboard/services/character-sheet.service.ts
git commit -m "fix(storyboard): ensure character sheet metadata includes type tag for gallery filtering"
```

---

### Task 5: End-to-end manual verification

**Step 1: Start dev server**

Run: `node node_modules/next/dist/bin/next dev --port 3002`

**Step 2: Test upload flow**

1. Go to Storyboard → paste story → extract characters
2. Go to Entities tab
3. Expand a character, toggle Reference ON
4. Click Upload → select a premade character sheet image from disk
5. Verify the image appears as the reference image on the character card
6. Verify the green checkmark appears in the collapsed header
7. Go to the Shots tab → generate prompts → verify the character with the uploaded sheet shows in `characterRefs`

**Step 3: Test gallery picker flow**

1. On a different character, toggle Reference ON
2. Click Gallery → Browse gallery images
3. Verify "Character Sheets" filter badge is visible and pre-selected
4. If you have previously generated character sheets, verify they appear filtered
5. Toggle "Character Sheets" off → verify all images appear
6. Select any image → verify it becomes the reference image

**Step 4: Test generation flow**

1. Go to Generation tab with characters that have reference images attached
2. Generate a shot
3. Verify the character reference images are passed to the model (check network tab for `/api/generation/image` request body — `referenceImages` array should include the character sheet URL)

**Step 5: Final build check**

Run: `rm -rf .next && npx next build`
Expected: Clean build, no errors.

**Step 6: Final commit and push**

```bash
git add -A && git commit -m "feat(storyboard): premade character sheet import via upload and gallery" && git push origin main
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `GalleryImagePicker.tsx` | Add `defaultMetadataTypeFilter` prop, "Character Sheets" toggle badge, pass filter to service |
| `gallery.service.ts` (feature) | Thread `metadataTypeFilter` option through to unified service |
| `gallery.service.ts` (unified) | Thread `metadataTypeFilter` option through to repository |
| `gallery.repository.ts` | Add `metadata->>type` Supabase filter alongside existing `source` filter |
| `CharacterList.tsx` | Pass `defaultMetadataTypeFilter="character-turnaround"` to `GalleryImagePicker` |
| `character-sheet.service.ts` | (If needed) Ensure individual generation includes `type: 'character-turnaround'` in metadata |

**What's NOT changing (and why):**
- No new components — the existing upload and gallery flows are sufficient
- No new database columns — `metadata.type` JSONB field already exists
- No new API routes — the Supabase `.eq('metadata->>type', value)` filter works client-side
- No changes to the generation pipeline — `reference_image_url` is already used by `storyboardGenerationService`
- No multi-image support — single sheet per character as specified
