# Gallery Upgrades & Bugfixes Design

**Date:** 2026-03-29

**Goal:** Add gallery upscale button, fix black text bug, fix recipe aspect ratio override, add wildcard community preview.

**Scope:** 4 independent changes bundled into one release.

---

## 1. Black Text Bug Fix

### Problem

`HighlightedPromptEditor` computes syntax tokens via `useState` + `useEffect`, creating a one-frame desync. When a reference tag is removed (e.g., deleting a reference image), `hasSyntax` stays `true` for one render while the prompt text has already changed. The textarea has `color: transparent` but the backdrop shows stale tokens — text becomes invisible on the dark background.

Secondary issue: `backgroundColor: 'hsl(var(--background))'` wraps an oklch value in hsl(), producing invalid CSS. Browsers silently ignore it, making the background accidentally transparent.

### Fix

**File:** `src/features/shot-creator/components/prompt-editor/HighlightedPromptEditor.tsx`

1. Replace `useState` + `useEffect` token computation with `useMemo`:
   ```typescript
   // Before (async, one-frame desync):
   const [tokens, setTokens] = useState<SyntaxToken[]>([])
   useEffect(() => { setTokens(tokenizePrompt(value)) }, [value])

   // After (synchronous, no desync):
   const tokens = useMemo(() => tokenizePrompt(value), [value])
   ```

2. Fix backgroundColor from `'hsl(var(--background))'` to `'var(--background)'`.

**Impact:** 2 lines changed. No behavior change beyond fixing the bug.

---

## 2. Gallery Upscale Button

### Model

**`nightmareai/real-esrgan`** on Replicate.

- 87.4M runs (most popular upscaler on Replicate by 3x)
- ~$0.004/run on T4 GPU, 1-5 seconds
- Native alpha channel support (separates, upscales, recombines alpha)
- 4x upscale, optional GFPGAN face enhancement
- Replicate's official recommended upscaler

### Cost

- Cost to us: ~$0.004 per image
- Charge to user: 2 pts (~$0.02)
- Margin: ~80%

### API Route

**`POST /api/tools/upscale`** — mirrors the pattern of `/api/tools/remove-background`.

Request:
```json
{ "imageUrl": "https://...", "galleryId": "optional-gallery-uuid" }
```

Response (mirrors remove-background pattern):
```json
{ "success": true, "imageUrl": "https://supabase-storage-url/upscaled.png", "galleryId": "new-uuid", "creditsUsed": 2 }
```

Flow:
1. Validate auth + check 2 pts balance
2. Call Replicate `nightmareai/real-esrgan` with `{ image: imageUrl, scale: 4, face_enhance: false }`
3. Download result from Replicate output URL
4. Upload to Supabase Storage (same bucket as originals)
5. Create gallery DB row (new image entry, linked to original via metadata)
6. Deduct 2 pts
7. Return `{ success, imageUrl, galleryId, creditsUsed }`

### UI Placement

The upscale button appears in 3 locations, right next to "Remove Background":

1. **`ImageActionMenu.tsx`** — dropdown menu item: `ArrowUpFromLine` icon + "Upscale 4x (2 pts)"
2. **`FullScreenModal.tsx`** — outline button in the action bar, same style as Remove Background button
3. **`MobileImageActionSheet.tsx`** — action sheet item

### Behavior

- Button shows loading state: spinner + "Upscaling..."
- Disabled while upscaling is in progress
- Result is added as a NEW image in the gallery (does not replace original)
- Toast on success: "Image upscaled to 4x"
- Toast on error: "Upscale failed" with error message

### State

- `isUpscaling` boolean tracked in `UnifiedImageGallery.tsx` (same pattern as `isRemovingBackground`)
- Passed down to `ImageActionMenu`, `FullScreenModal`, `MobileImageActionSheet` as props

---

## 3. Recipe Aspect Ratio Fix

### Problem

When generating with a recipe that has `suggestedAspectRatio`, the code permanently overwrites the user's global aspect ratio setting (persisted to Supabase). If a user had `9:16` selected and runs a `16:9` recipe, their setting stays `16:9` forever — even after deactivating the recipe.

**File:** `src/features/shot-creator/hooks/usePromptGeneration.ts` (lines 608-609)

```typescript
// Current: permanently overwrites
if (activeRecipe.suggestedAspectRatio) {
    updateSettings({ aspectRatio: activeRecipe.suggestedAspectRatio })
}
```

### Fix

Use a temporary override instead of mutating global settings:

```typescript
// Fixed: use recipe aspect ratio for this generation only
const effectiveAspectRatio = activeRecipe?.suggestedAspectRatio || shotCreatorSettings.aspectRatio

// Pass effectiveAspectRatio to buildModelSettings instead of reading from settings
```

Update `buildModelSettings()` to accept an optional `aspectRatioOverride` parameter. When provided, use it instead of `shotCreatorSettings.aspectRatio`.

Remove the `updateSettings({ aspectRatio: ... })` call entirely.

**Impact:** `usePromptGeneration.ts` only. No UI changes. User's aspect ratio setting is preserved after recipe generation.

---

## 4. Wildcard Community Preview

### Problem

Community wildcard cards show a truncated 4-entry comma-separated preview with no way to see all entries. The `onItemClick` handler exists in `CommunityGrid` but isn't wired up in `CommunityPage`. Users need to see the full contents before deciding to add a wildcard.

### Data Structure

Community wildcards store entries as:
```typescript
interface WildcardContent {
    entries: string[]  // array of all wildcard values
}
```

### Fix

Add a detail modal that opens when clicking a wildcard card in the community browser.

**New component:** `src/features/community/components/WildcardDetailModal.tsx`

- Modal/dialog showing:
  - Wildcard name as title
  - Description (if any)
  - Entry count badge: "42 entries"
  - Full scrollable list of ALL entries (each on its own line, numbered)
  - "Add to My Wildcards" button at bottom (same as existing add action)
- Dark theme, consistent with existing modals

**Modified files:**

1. **`CommunityPage.tsx`** — wire up `onItemClick` handler. When item type is `wildcard`, open `WildcardDetailModal`.
2. **`CommunityCard.tsx`** — make wildcard cards clickable (cursor-pointer, hover state). Keep existing 4-entry preview as-is for the card.

### Behavior

- Click wildcard card → modal opens with full entry list
- Scroll through all entries
- Click "Add to My Wildcards" → adds and closes modal
- Click outside or X → closes modal

---

## Out of Scope

- Upscale 2x option (YAGNI — 4x only for now)
- Upscale model selection UI
- Recipe aspect ratio shown in settings panel when recipe is active
- Wildcard editing from community view
- Orphaned reference tag cleanup after image deletion (separate issue)
