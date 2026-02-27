# fix: Multi-Feature Bug Fixes & Improvements

**Type:** Bug Fixes + Feature Improvements
**Created:** 2026-02-27
**Features Affected:** Reference Library, Shot Creator, Music Lab (Writing Studio, Artist DNA, Idea Bank)

---

## Overview

This plan covers 9 interconnected issues reported across the Reference Library, Shot Creator, and Music Lab features. They range from a crash bug (P0) to UX improvements (P2). Issues are ordered by priority.

---

## Issue 1 (P0 - CRASH): Artist Creation Crash — `tags.map is not a function`

### Problem

Creating a new artist crashes the app with `TypeError: tags.map is not a function` at `TagInput.tsx:66`. The `safeDna()` function in `artist-dna.service.ts` only null-guards 2 of ~20 array fields (`genreEvolution`, `keyCollaborators`). All other array fields can be `null` from JSONB, causing `.map()` to fail.

### Root Cause

```
safeDna() does:
  sound = { ...defaults.sound, ...raw.sound }

If raw.sound = { vocalTextures: null }, the spread yields { vocalTextures: null }
instead of the default []. Only genreEvolution and keyCollaborators have explicit guards.
```

### Fix

**File:** `src/features/music-lab/services/artist-dna.service.ts` (lines 17-32)

1. Add a generic `safeArrayFields()` helper that iterates an object's keys and ensures any field that should be an array (based on the empty defaults) is always an array.
2. Apply it to every section in `safeDna()`.

```typescript
/** Ensure all array fields in a section default to [] if null/undefined */
function safeArrays<T extends Record<string, unknown>>(obj: T, defaults: T): T {
  const result = { ...obj }
  for (const key of Object.keys(defaults)) {
    if (Array.isArray(defaults[key]) && !Array.isArray(result[key])) {
      (result as Record<string, unknown>)[key] = []
    }
  }
  return result
}

function safeDna(raw: ArtistDNA): ArtistDNA {
  const d = createEmptyDNA()
  return {
    identity: safeArrays({ ...d.identity, ...raw.identity }, d.identity),
    sound: safeArrays({ ...d.sound, ...raw.sound }, d.sound),
    persona: safeArrays({ ...d.persona, ...raw.persona }, d.persona),
    lexicon: safeArrays({ ...d.lexicon, ...raw.lexicon }, d.lexicon),
    look: safeArrays({ ...d.look, ...raw.look }, d.look),
    catalog: { ...d.catalog, ...raw.catalog },
    lowConfidenceFields: Array.isArray(raw.lowConfidenceFields) ? raw.lowConfidenceFields : [],
  }
}
```

**Defensive layer in TagInput:** Also add a guard at the component level as a safety net:

**File:** `src/features/music-lab/components/artist-dna/TagInput.tsx` (line 66)

```typescript
// Change:
{tags.map((tag, i) => (
// To:
{(tags ?? []).map((tag, i) => (
```

And in the callback functions (`addTag`, `removeTag`) that also reference `tags` directly.

### Acceptance Criteria

- [ ] Creating a new artist no longer crashes
- [ ] Loading an old artist profile with null array fields works
- [ ] All TagInput usages are null-safe
- [ ] `safeDna()` guards ALL array fields across all sections

---

## Issue 2 (P0 - DATA LOSS): Writing Studio Content Loss on Section Switch

### Problem

When editing a hook and switching to a verse tab, then switching back, the hook's draft options are gone. The store's `setActiveSection` clears `draftOptions: []` on every switch.

### Root Cause

**File:** `src/features/music-lab/store/writing-studio.store.ts` (line 103)

```typescript
setActiveSection: (id) => set({ activeSectionId: id, draftOptions: [] }),
```

This unconditionally wipes all draft options. Drafts are not stored per-section — they're a single flat array.

### Fix

Store draft options per-section instead of globally:

1. Add a `sectionDrafts` map to the store: `Record<string, DraftOption[]>`
2. When switching sections, save current drafts to the map and load the target section's drafts.
3. Update `partialize` to persist `sectionDrafts`.

**File:** `src/features/music-lab/store/writing-studio.store.ts`

```typescript
interface WritingStudioState {
  // ... existing fields ...
  sectionDrafts: Record<string, DraftOption[]>  // NEW: per-section draft storage
}

// Updated setActiveSection:
setActiveSection: (id) => {
  const state = get()
  const updatedSectionDrafts = { ...state.sectionDrafts }

  // Save current section's drafts
  if (state.activeSectionId) {
    updatedSectionDrafts[state.activeSectionId] = state.draftOptions
  }

  // Load target section's drafts
  const targetDrafts = id ? (updatedSectionDrafts[id] || []) : []

  set({
    activeSectionId: id,
    draftOptions: targetDrafts,
    sectionDrafts: updatedSectionDrafts,
  })
},
```

Also update `generateOptions`, `keepDraft`, `tossDraft`, `chopDraft`, `editDraft` to sync with `sectionDrafts`.

### Acceptance Criteria

- [ ] Switching between sections preserves draft options
- [ ] Generating new options for a section replaces only that section's drafts
- [ ] Edited drafts survive section switches
- [ ] Kept (locked) drafts are preserved when switching
- [ ] `sectionDrafts` is persisted to localStorage

---

## Issue 3 (P1 - BUG): Reference Library Category Mismatch

### Problem

The filter tabs at the top show: **All, People, Places, Props, Layouts**
The edit dropdown (category change) shows: **People, Places, Props, Unorganized**
These should be consistent.

### Root Cause

Two separate category definitions exist:
- `ShotReferenceLibrary.tsx` line 15-21: `categoryConfig` includes `layouts`
- `constants/index.ts` line 51-55: `categories` array has `unorganized` instead
- `CategorySelectDialog.tsx`: `Category` type = `'people' | 'places' | 'props' | 'unorganized'`
- `shot-library.store.ts` line 13: `LibraryCategory` = `'all' | 'people' | 'places' | 'props' | 'unorganized'`

"Layouts" was added to the filter UI but never to the actual data model.

### Fix

**Decision needed:** Should the 4th category be "Layouts" or "Unorganized"?

**Recommendation:** Keep **both**. Add "Layouts" as a 5th category, keep "Unorganized" as the catch-all. Update all definitions to be consistent:

**Files to update:**
- `src/features/shot-creator/constants/index.ts` — Add `layouts` to `categories` array
- `src/features/shot-creator/components/CategorySelectDialog.tsx` — Add `layouts` to `Category` type
- `src/features/shot-creator/store/shot-library.store.ts` — Add `layouts` to `LibraryCategory`
- `src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx` — Add `unorganized` filter button, add `layouts` to edit dropdown

```typescript
// constants/index.ts
export const categories = [
    { value: 'people', label: 'People', description: 'Characters, portraits, persons' },
    { value: 'places', label: 'Places', description: 'Locations, environments, settings' },
    { value: 'props', label: 'Props', description: 'Objects, items, things' },
    { value: 'layouts', label: 'Layouts', description: 'Compositions, layouts, framing references' },
    { value: 'unorganized', label: 'Unorganized', description: 'General or uncategorized' }
]

// shot-library.store.ts
export type LibraryCategory = 'all' | 'people' | 'places' | 'props' | 'layouts' | 'unorganized';
```

### Acceptance Criteria

- [ ] Filter tabs show: All, People, Places, Props, Layouts, Unorganized
- [ ] Edit dropdown shows: People, Places, Props, Layouts, Unorganized
- [ ] CategorySelectDialog includes Layouts as an option
- [ ] Existing "unorganized" items still display correctly
- [ ] `@layouts` reference tag in prompts works correctly

---

## Issue 4 (P1): Reference Library — Tag Not Cleaned Up on Delete

### Problem

When deleting an image from the reference library, the `deleteReference()` function only removes the `reference` row. The underlying `gallery` row and image remain. If the Unified Gallery shows images from the `gallery` table, the image persists there.

### Root Cause

**File:** `src/features/shot-creator/services/reference-library.service.ts` (line 280-298)

`deleteReference()` only deletes from the `reference` table. It doesn't:
1. Delete the `gallery` row
2. Delete the storage file
3. Clean up any cached references

### Fix

The reference library delete should give the user a choice or always clean up properly:

**Option A (Simple):** Just delete the `reference` row (current behavior is actually correct for "remove from library"). The gallery image should remain since other features might use it. But ensure the Unified Gallery correctly distinguishes between "library items" and "gallery items."

**Option B (Full cleanup):** On library delete, also delete the gallery row and storage file.

**Recommendation:** Option A is correct behavior. The real issue is that the Unified Gallery may be showing items that have a `reference` tag/category but the reference was deleted.

**Investigation needed:** Check if the Unified Gallery loads from `gallery` table directly (in which case reference deletion doesn't affect it — this is correct) or if it merges with `reference` data.

**File:** `src/features/shot-creator/store/unified-gallery-store.ts` — Check data source

If the Unified Gallery shows gallery items independently of references, then the "tag still showing" issue is actually about the Unified Gallery's own tag/filter system, not the reference library.

### Acceptance Criteria

- [ ] Deleting a reference library item removes it from the library view
- [ ] Unified Gallery either: doesn't show library-only metadata, OR refreshes after library deletion
- [ ] `@tag` references in prompts no longer match deleted library items
- [ ] User gets clear feedback about what "delete" means (remove from library vs. delete forever)

---

## Issue 5 (P1): Shot Creator — Auto-Add Reference Image to Library

### Problem

When a user adds a reference image with a `@tag` in Shot Creator, it should automatically be saved to the reference library. Currently, reference images in the Shot Creator are ephemeral — they exist only in the creator session and are lost when navigating away.

### Fix

**File:** `src/features/shot-creator/components/creator-reference-manager/InlineTagEditor.tsx`

When a tag is saved via `InlineTagEditor.onSave()`, check if the image's `gallery_id` exists in the `reference` table. If not, auto-create a reference entry.

```typescript
// In the parent component (CreatorReferenceManager) where tags are saved:
async function handleTagSave(tags: string[]) {
  // 1. Save tags to the reference image locally
  updateReferenceTags(refImage.id, tags)

  // 2. Auto-add to library if not already there
  if (refImage.galleryId) {
    const { exists } = await isInReferenceLibrary(refImage.galleryId)
    if (!exists) {
      await createReference(refImage.galleryId, 'unorganized', tags)
      toast({ title: 'Added to Library', description: 'Reference image saved to your library' })
    }
  }
}
```

### Acceptance Criteria

- [ ] Adding a `@tag` to a reference image in Shot Creator auto-saves to library
- [ ] Duplicate detection prevents adding the same image twice
- [ ] User gets a toast notification when auto-added
- [ ] The reference is created with category "unorganized" (user can recategorize later)
- [ ] If the image has no `gallery_id` (e.g., pasted/uploaded but not yet in gallery), upload to gallery first

---

## Issue 6 (P2): Writing Studio — Chop UX (Scissors = Edit, Selective Line Chopping)

### Problem

The user expects the scissors icon to mean "edit" (cut/modify the text), not "save to Idea Bank." The current mapping is:
- **Keep** (checkmark) = Lock this draft as the section content
- **Chop** (scissors) = Save entire draft to Idea Bank with a tag
- **Toss** (trash) = Discard draft
- **Edit** (pencil) = Inline text editing

The user wants:
1. Scissors should open the edit view (swap Chop and Edit icons/actions)
2. When editing, the user should be able to select specific lines to send to the Idea Bank
3. The edit textarea should be larger

### Fix

**File:** `src/features/music-lab/components/writing-studio/OptionGrid.tsx`

**Phase 1: Swap icons and make edit area bigger**
- Swap the scissors icon to trigger inline edit mode
- Swap the pencil icon to trigger chop-to-idea-bank flow
- OR: Merge the two — scissors opens an expanded edit view with line selection

**Phase 2: Line-level Idea Bank selection**
- In the edit view, render each line as a selectable row
- User can click/tap lines to select them
- A "Save to Idea Bank" button saves only selected lines
- Selected lines get tagged with Idea Bank categories (Metaphor, Punchline, etc.)

```typescript
// New component: LineSelector
function LineSelector({ content, onSaveToBank }: { content: string, onSaveToBank: (lines: string[], tags: IdeaTag[]) => void }) {
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const lines = content.split('\n').filter(l => l.trim())

  const toggleLine = (idx: number) => {
    const next = new Set(selectedLines)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedLines(next)
  }

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div
          key={i}
          onClick={() => toggleLine(i)}
          className={`px-2 py-1 rounded cursor-pointer text-sm transition-colors ${
            selectedLines.has(i)
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'hover:bg-muted/50'
          }`}
        >
          {line}
        </div>
      ))}
      {selectedLines.size > 0 && (
        <div className="flex gap-1 pt-2">
          {IDEA_TAGS.map(tag => (
            <button key={tag} onClick={() => {
              const selected = [...selectedLines].sort().map(i => lines[i]).join('\n')
              onSaveToBank([selected], [tag])
            }}>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Acceptance Criteria

- [ ] Scissors icon opens expanded edit/selection view
- [ ] User can select individual lines within a draft
- [ ] Selected lines can be sent to Idea Bank with a tag
- [ ] Edit textarea is larger (min-h-[160px] instead of min-h-[80px])
- [ ] Full draft can still be chopped as before (select all → chop)

---

## Issue 7 (P2): Idea Bank — Per-Artist Storage

### Problem

The Idea Bank is stored in localStorage under a single key `'writing-studio'`. All artists share the same Idea Bank. Drake's chopped ideas show up when writing for Kendrick.

### Fix

**File:** `src/features/music-lab/store/writing-studio.store.ts`

Change the Idea Bank to be keyed by artist ID:

```typescript
interface WritingStudioState {
  // Replace single ideaBank with per-artist map
  ideaBankByArtist: Record<string, IdeaEntry[]>
  activeArtistId: string | null  // Track which artist is active

  // Computed getter
  get ideaBank(): IdeaEntry[]  // Returns ideaBankByArtist[activeArtistId] || []
}
```

**Migration:** On first load, if `ideaBank` array exists in localStorage but `ideaBankByArtist` doesn't, migrate the old data to a "default" artist key.

### Acceptance Criteria

- [ ] Idea Bank is scoped to the active artist
- [ ] Switching artists shows that artist's Idea Bank
- [ ] Old Idea Bank data is migrated to the first/default artist
- [ ] Manual ideas added to the bank are tied to the active artist
- [ ] Chopped drafts go to the active artist's bank

---

## Issue 8 (P2): Generate Confirmation When Drafts Exist

### Problem

When the user has existing draft options (even if some were tossed) and clicks "Generate" again, the remaining drafts are silently replaced. No warning is shown.

### Fix

**File:** `src/features/music-lab/components/writing-studio/StudioTab.tsx` (or wherever the Generate button lives)

Add a confirmation dialog before generating when `draftOptions.length > 0`:

```typescript
const handleGenerate = () => {
  if (draftOptions.length > 0) {
    // Show confirmation
    setShowRegenerateConfirm(true)
  } else {
    doGenerate()
  }
}
```

Use the existing `AlertDialog` component pattern.

### Acceptance Criteria

- [ ] Clicking Generate when drafts exist shows a confirmation dialog
- [ ] Dialog message: "You have X unsaved options. Generating new ones will replace them. Continue?"
- [ ] User can cancel to keep existing drafts
- [ ] User can confirm to regenerate
- [ ] If all drafts have been kept or tossed (draftOptions empty), no confirmation needed

---

## Issue 9 (P3): Model Usage Audit — nano-banana-2 vs nano-banana-pro

### Problem

The user wants to ensure the Music Lab uses `nano-banana-2` (cheaper: 6 points) instead of `nano-banana-pro` (expensive: 25-45 points).

### Current Status

After auditing the codebase:
- **Writing Studio `generate-options`**: Uses `openai/gpt-4.1-mini` via OpenRouter — this is **text generation**, not image generation. No model change needed here.
- **Artist DNA portraits**: Already uses `google/nano-banana-2` (`generate-portrait/route.ts:55`)
- **Character sheets**: Already uses `google/nano-banana-2` (`generate-character-sheet/route.ts:106`)
- **Reference sheets**: Already uses `nano-banana-2` (`reference-sheet.service.ts:75,153,235`)

**Result: No change needed.** The Music Lab already uses `nano-banana-2` for all image generation. The text generation (lyrics) uses an LLM (GPT-4.1-mini), which is separate from the image model.

### Acceptance Criteria

- [ ] Verify all Music Lab image generation calls use `nano-banana-2`
- [ ] No `nano-banana-pro` references in Music Lab code paths
- [ ] Document the distinction: text generation (OpenRouter LLM) vs image generation (Replicate nano-banana-2)

---

## Implementation Roadmap

### Phase 1: Critical Bug Fixes (Day 1)
1. **Issue 1** — Fix `safeDna()` + `TagInput` null guard (artist crash)
2. **Issue 2** — Per-section draft storage (content loss)

### Phase 2: Data Consistency (Day 2)
3. **Issue 3** — Unify category definitions
4. **Issue 4** — Reference library delete cleanup / Unified Gallery investigation
5. **Issue 5** — Auto-add reference to library on tag

### Phase 3: UX Improvements (Day 3-4)
6. **Issue 6** — Chop UX / line selection
7. **Issue 7** — Per-artist Idea Bank
8. **Issue 8** — Generate confirmation dialog

### Phase 4: Verification (Day 4)
9. **Issue 9** — Model audit (verify already done)
10. End-to-end testing of all changes

---

## Files to Modify

| File | Issues |
|------|--------|
| `src/features/music-lab/services/artist-dna.service.ts` | #1 |
| `src/features/music-lab/components/artist-dna/TagInput.tsx` | #1 |
| `src/features/music-lab/store/writing-studio.store.ts` | #2, #7, #8 |
| `src/features/music-lab/components/writing-studio/OptionGrid.tsx` | #6 |
| `src/features/music-lab/components/writing-studio/IdeaBankDrawer.tsx` | #7 |
| `src/features/music-lab/components/writing-studio/StudioTab.tsx` | #8 |
| `src/features/shot-creator/constants/index.ts` | #3 |
| `src/features/shot-creator/components/CategorySelectDialog.tsx` | #3 |
| `src/features/shot-creator/store/shot-library.store.ts` | #3 |
| `src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx` | #3, #4 |
| `src/features/shot-creator/services/reference-library.service.ts` | #4 |
| `src/features/shot-creator/components/creator-reference-manager/` | #5 |
| `src/features/shot-creator/store/unified-gallery-store.ts` | #4 |

---

## Open Questions

1. **Issue 3:** Should "Layouts" replace "Unorganized" or coexist as a 5th category?
2. **Issue 4:** What should "delete from library" mean — remove reference only, or delete the image entirely?
3. **Issue 5:** If a reference image was pasted (no gallery_id), should we upload it to the gallery automatically?
4. **Issue 6:** Should the scissors icon behavior change to edit, or should we keep both Chop and Edit as separate actions?
5. **Issue 7:** When switching artists, should the Writing Studio state (sections, concept, drafts) also reset or persist per-artist?
