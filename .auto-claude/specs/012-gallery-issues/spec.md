# Specification: Fix Gallery Load More Infinite Scroll Bug

## Overview

The gallery's "Load More Images" button behaves incorrectly - instead of appending new images to the existing list (infinite scroll pattern), it replaces all currently displayed images with the next page's images (pagination pattern). This causes users to lose visibility of previously loaded images, creating a confusing experience where they can only see one page of images at a time.

## Workflow Type

**Type**: feature (bug fix with UI/UX impact)

**Rationale**: This is a bug fix that requires modifying the state management logic to properly implement infinite scroll. It affects user experience and requires changes to the Zustand store and the gallery loader hook.

## Task Scope

### Services Involved
- **main** (primary) - Frontend Next.js application with Zustand state management

### This Task Will:
- [x] Fix the `loadMoreImages` function to properly append images without triggering a full gallery reload
- [x] Separate infinite scroll state management from pagination state management
- [x] Ensure `useGalleryLoader` doesn't replace images when `currentPage` changes during infinite scroll
- [x] Verify images accumulate correctly when clicking "Load More"

### Out of Scope:
- Backend API changes (API already supports pagination correctly)
- Changes to the `ExpandedGallery` component (uses separate pagination pattern)
- Performance optimizations for very large image counts
- Adding true infinite scroll with intersection observer (keeping button-based loading)

## Service Context

### Main (Next.js Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- State Management: Zustand
- Styling: Tailwind CSS

**Key Directories:**
- `src/features/shot-creator/store/` - Zustand stores
- `src/features/shot-creator/hooks/` - React hooks
- `src/features/shot-creator/components/unified-gallery/` - Gallery components
- `src/features/shot-creator/services/` - Service layer

**Entry Point:** `src/app/page.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

## Root Cause Analysis

The bug occurs due to conflation between two UI patterns in the state management:

### 1. Pagination Pattern (ExpandedGallery)
- User clicks page numbers
- Each page shows a discrete set of images
- Images REPLACE when navigating between pages
- Uses `setCurrentPage` → triggers `useGalleryLoader` → calls `loadImagesPaginated`

### 2. Infinite Scroll Pattern (UnifiedImageGallery)
- User clicks "Load More"
- New images APPEND to existing list
- All previously loaded images remain visible
- Uses `loadMoreImages` → should call `appendImages`

**The Bug:** When `loadMoreImages` updates `currentPage` in the store (line 512 in unified-gallery-store.ts):
```typescript
set({ currentPage: nextPage })
```

This triggers the `useGalleryLoader` effect (which has `currentPage` as a dependency), which then calls `loadImagesPaginated`:
```typescript
useEffect(() => {
  // ... loads gallery and REPLACES images
  loadImagesPaginated(images, total, totalPages)
}, [loadImagesPaginated, loadFolders, currentPage, ...]) // <-- currentPage dependency
```

The `loadImagesPaginated` function REPLACES all images instead of appending:
```typescript
loadImagesPaginated: (images, total, totalPages) => {
  set({
    images: uniqueImages,  // <-- REPLACES, doesn't append
    ...
  })
}
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/features/shot-creator/store/unified-gallery-store.ts` | main | Add infinite scroll mode flag, fix `loadMoreImages` to not trigger reload |
| `src/features/shot-creator/hooks/useGalleryLoader.ts` | main | Skip reload when in infinite scroll mode, remove `currentPage` from deps where appropriate |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/features/shot-creator/store/unified-gallery-store.ts` | Existing `appendImages` function pattern |
| `src/features/shot-creator/components/unified-gallery/UnifiedImageGallery.tsx` | How `loadMoreImages` is called |
| `src/features/shot-creator/components/unified-gallery/LoadMoreButton.tsx` | Button component interface |

## Patterns to Follow

### Zustand Store Update Pattern

From `unified-gallery-store.ts`:

```typescript
appendImages: (newImages, hasMore) => {
  set((state) => {
    // Get existing IDs for O(1) lookup
    const existingIds = new Set(state.images.map(img => img.id))
    // Only add images that don't already exist
    const uniqueNewImages = newImages.filter(img => !existingIds.has(img.id))

    return {
      images: [...state.images, ...uniqueNewImages],
      offset: state.offset + newImages.length,
      hasMore,
      isLoadingMore: false
    }
  })
}
```

**Key Points:**
- Uses functional update pattern `set((state) => ...)`
- Deduplicates images by ID
- Spreads existing images and appends new ones
- Updates offset and hasMore in the same atomic update

### Load More Pattern

The `loadMoreImages` function should:
1. NOT update `currentPage` in a way that triggers `useGalleryLoader`
2. Track the page internally for API calls
3. Call `appendImages` to accumulate results

## Requirements

### Functional Requirements

1. **Cumulative Image Loading**
   - Description: Clicking "Load More" appends new images to the existing list
   - Acceptance: After loading 3 pages, user can scroll back and see all images from pages 1, 2, and 3

2. **Consistent Button Behavior**
   - Description: "Load More" button always means "append more images"
   - Acceptance: Button never causes images to disappear or be replaced

3. **Proper State Tracking**
   - Description: Store correctly tracks which images are loaded and whether more exist
   - Acceptance: `hasMore` accurately reflects if more images are available in the database

4. **No Duplicate Images**
   - Description: Loading more images should not create duplicate entries
   - Acceptance: Each image appears exactly once regardless of how many times "Load More" is clicked

### Edge Cases

1. **Rapid Load More Clicks** - Prevent concurrent loads; `isLoadingMore` flag should block additional requests
2. **End of Gallery** - When all images loaded, show "All images loaded" message and disable button
3. **Search/Filter Changes** - When search query changes, reset to initial state (page 1, fresh images)
4. **Folder Navigation** - When folder changes, reset to initial state for that folder

## Implementation Notes

### DO
- Use a separate internal counter for API pagination in `loadMoreImages`
- Keep `appendImages` function as the only method for adding images during infinite scroll
- Use `resetInfiniteScroll` when context changes (folder, search)
- Ensure `useGalleryLoader` only runs on initial mount and explicit refresh

### DON'T
- Don't modify `currentPage` in `loadMoreImages` if it triggers `useGalleryLoader`
- Don't use `loadImagesPaginated` for infinite scroll - it replaces images
- Don't remove the `currentPage` state entirely - it's needed for `ExpandedGallery`

## Proposed Solution

### Option A: Internal Page Counter (Recommended)
Add an internal `infiniteScrollPage` counter separate from `currentPage`:

```typescript
// In store
infiniteScrollPage: 1,

loadMoreImages: async () => {
  const state = get()
  if (state.isLoadingMore || !state.hasMore) return

  set({ isLoadingMore: true })

  const nextPage = state.infiniteScrollPage + 1
  const result = await GalleryService.loadUserGalleryPaginated(nextPage, state.pageSize, ...)

  if (result.images.length > 0) {
    set({ infiniteScrollPage: nextPage })  // Internal counter, not observed by useGalleryLoader
    get().appendImages(result.images, result.images.length === state.pageSize)
  } else {
    set({ hasMore: false, isLoadingMore: false })
  }
}
```

### Option B: Mode Flag
Add an `isInfiniteScrollMode` flag that `useGalleryLoader` checks:

```typescript
// In useGalleryLoader, check the mode before reloading
if (state.isInfiniteScrollMode) {
  return // Don't reload during infinite scroll
}
```

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Main App: http://localhost:3000
- Gallery Page: http://localhost:3000 (main page with gallery)
- Expanded Gallery: http://localhost:3000/gallery

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [x] Clicking "Load More" appends images to the existing list
2. [x] Previously loaded images remain visible after loading more
3. [x] User can scroll through all loaded images (from all pages)
4. [x] "All images loaded" message appears only when truly at end
5. [x] No console errors during load more operations
6. [x] Existing tests still pass
7. [x] Search/filter changes properly reset the gallery
8. [x] Folder navigation properly resets the gallery

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| appendImages deduplicates | `tests/unit/gallery-store.test.ts` | Calling appendImages with duplicate IDs doesn't create duplicates |
| loadMoreImages accumulates | `tests/unit/gallery-store.test.ts` | Multiple loadMoreImages calls increase image count |
| resetInfiniteScroll clears | `tests/unit/gallery-store.test.ts` | Reset clears images and resets page counters |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Gallery Load More | store ↔ service | Load more fetches next page and appends correctly |
| Folder Change Reset | store ↔ component | Changing folders resets gallery state |
| Search Change Reset | store ↔ component | Changing search resets gallery state |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Load More Accumulation | 1. Open gallery 2. Note image count 3. Click "Load More" 4. Scroll up | All original images still visible, plus new ones |
| Multiple Load More | 1. Click "Load More" 3 times | All 3 pages worth of images visible |
| End of Gallery | 1. Click "Load More" until no more | "All images loaded" message appears, button disabled |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| UnifiedImageGallery | `http://localhost:3000` | Load More accumulates images |
| Load More Button | `http://localhost:3000` | Shows correct remaining count |
| Gallery Stats | `http://localhost:3000` | Total count updates correctly |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] No regressions in ExpandedGallery pagination (separate component)
- [ ] Code follows established patterns
- [ ] No console errors or warnings

## Technical Notes

### Files Structure
```
src/features/shot-creator/
├── components/unified-gallery/
│   ├── UnifiedImageGallery.tsx    # Main gallery component
│   ├── LoadMoreButton.tsx         # Load more button
│   ├── ExpandedGallery.tsx        # Full-page pagination gallery
│   └── Pagination.tsx             # Pagination controls
├── hooks/
│   ├── useGalleryLoader.ts        # Initial gallery load + realtime
│   └── useGalleryLogic.ts         # Gallery actions & filters
├── store/
│   └── unified-gallery-store.ts   # Zustand store (key file)
└── services/
    └── gallery.service.ts         # API wrapper
```

### Key Store Properties
- `images`: Current loaded images array
- `currentPage`: Current page number (used for pagination & API calls)
- `offset`: Total images loaded (for infinite scroll tracking)
- `hasMore`: Whether more images exist to load
- `isLoadingMore`: Loading state for load more button
- `pageSize`: Images per page (default 50)
- `totalDatabaseCount`: Total images in database
